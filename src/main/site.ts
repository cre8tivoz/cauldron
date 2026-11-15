import fs from 'node:fs';
import path from 'node:path';
import net from 'node:net';
import { execFileSync, spawn, type ChildProcess } from 'node:child_process';
import electron from 'electron';
import { writeFileAtomic } from './files';
import { childEnvForTools } from './runtime';

export type PackageManager = 'npm' | 'pnpm' | 'yarn';

export type Site = {
  root: string;
  name: string;
  astroVersion: string;
  packageManager: PackageManager;
  hasDependencies: boolean;
  missingPackages?: string[];
  buildError?: string | null;
};

export type SiteSummary = Site;

export type Problem = { problem: string; detail: string };

function detectPackageManager(root: string): PackageManager {
  // A project's own packageManager declaration is honoured (new Cauldron
  // projects declare pnpm); lockfiles decide when there is no declaration.
  try {
    const pkg = JSON.parse(
      fs.readFileSync(path.join(root, 'package.json'), 'utf8'),
    ) as { packageManager?: string };
    const declared = pkg.packageManager?.split('@')[0];
    if (declared === 'pnpm' || declared === 'yarn' || declared === 'npm')
      return declared;
  } catch {
    // Unreadable manifest: fall back to lockfiles.
  }
  if (fs.existsSync(path.join(root, 'pnpm-lock.yaml'))) return 'pnpm';
  if (fs.existsSync(path.join(root, 'yarn.lock'))) return 'yarn';
  return 'npm';
}

function astroVersionOf(root: string): string | null {
  // The installed version is the truth; package.json can ask for anything.
  try {
    const pkg = JSON.parse(
      fs.readFileSync(
        path.join(root, 'node_modules/astro/package.json'),
        'utf8',
      ),
    ) as { version?: string };
    if (pkg.version) return pkg.version;
  } catch {
    // Not installed: fall back to what package.json asks for.
  }
  try {
    const pkg = JSON.parse(
      fs.readFileSync(path.join(root, 'package.json'), 'utf8'),
    ) as {
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };
    const asked = pkg.dependencies?.astro ?? pkg.devDependencies?.astro;
    return asked ?? null;
  } catch {
    return null;
  }
}

export function detectSite(root: string): Site | Problem {
  if (!fs.existsSync(root)) {
    return {
      problem: 'That folder does not exist. Check the path and try again.',
      detail: root,
    };
  }
  if (!fs.statSync(root).isDirectory()) {
    return {
      problem: 'That path is a file, not a folder.',
      detail: root,
    };
  }
  if (!fs.existsSync(path.join(root, 'package.json'))) {
    return {
      problem: 'This folder has no package.json, so it is not an Astro site.',
      detail: root,
    };
  }

  const astroVersion = astroVersionOf(root);
  const hasConfig = ['mjs', 'js', 'mts', 'ts', 'cjs'].some((ext) =>
    fs.existsSync(path.join(root, `astro.config.${ext}`)),
  );
  const hasPages = fs.existsSync(path.join(root, 'src/pages'));

  if (!astroVersion && !hasConfig) {
    return {
      problem:
        'This folder is not an Astro site. It has no astro dependency or config.',
      detail: root,
    };
  }

  if (!hasPages) {
    return {
      problem:
        'This looks like Astro, but there is no src/pages folder to preview.',
      detail: root,
    };
  }

  return {
    root,
    name: path.basename(root),
    astroVersion: astroVersion ?? 'unknown',
    packageManager: detectPackageManager(root),
    hasDependencies: fs.existsSync(path.join(root, 'node_modules/astro')),
  };
}

export type DevServer = {
  url: string;
  port: number;
  process: ChildProcess;
  stop: () => void;
};

type TrackedDevServer = {
  pid: number;
  root: string;
  startedAt: number;
};

const LOCAL_URL = /https?:\/\/(?:localhost|127\.0\.0\.1|\[::1\]):(\d+)\/?/;
const activeServerPids = new Set<number>();

function userDataDir(): string | null {
  const override = (globalThis as { __cauldronUserData?: string })
    .__cauldronUserData;
  if (override) return override;
  const api = electron as unknown as {
    app?: { getPath(name: string): string };
    default?: { app?: { getPath(name: string): string } };
  };
  const app = api.app ?? api.default?.app;
  try {
    return app ? app.getPath('userData') : null;
  } catch {
    return null;
  }
}

function previewServersFile(): string | null {
  const base = userDataDir();
  return base ? path.join(base, 'preview-servers.json') : null;
}

function readTrackedServers(file: string): TrackedDevServer[] {
  if (!fs.existsSync(file)) return [];
  try {
    const parsed = JSON.parse(fs.readFileSync(file, 'utf8')) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (entry): entry is TrackedDevServer =>
        Boolean(entry) &&
        typeof entry === 'object' &&
        typeof (entry as TrackedDevServer).pid === 'number' &&
        Number.isInteger((entry as TrackedDevServer).pid) &&
        (entry as TrackedDevServer).pid > 0 &&
        typeof (entry as TrackedDevServer).root === 'string',
    );
  } catch (error) {
    console.error('Tracked preview server list could not be read:', error);
    return [];
  }
}

function writeTrackedServers(file: string, entries: TrackedDevServer[]): void {
  try {
    writeFileAtomic(file, JSON.stringify(entries, null, 2));
  } catch (error) {
    console.error('Tracked preview server list could not be saved:', error);
  }
}

/** Persist a spawned preview PID so a hard crash (SIGKILL) leaves it cleanable on next launch. */
export function recordDevServerPid(pid: number, root: string): void {
  if (!Number.isInteger(pid) || pid <= 0) return;
  const file = previewServersFile();
  if (!file) return;
  const existing = readTrackedServers(file).filter(
    (entry) => entry.pid !== pid,
  );
  existing.push({ pid, root, startedAt: Date.now() });
  writeTrackedServers(file, existing);
}

/** Forget a tracked preview PID after clean exit or explicit stop. */
export function removeDevServerPid(pid: number): void {
  activeServerPids.delete(pid);
  const file = previewServersFile();
  if (!file || !fs.existsSync(file)) return;
  const existing = readTrackedServers(file);
  const next = existing.filter((entry) => entry.pid !== pid);
  if (next.length !== existing.length) writeTrackedServers(file, next);
}

function processCommandLine(pid: number): string | null {
  if (!Number.isInteger(pid) || pid <= 0 || pid === process.pid) return null;
  if (process.platform === 'win32') return null;
  try {
    const out = execFileSync('ps', ['-p', String(pid), '-o', 'args='], {
      encoding: 'utf8',
      timeout: 2000,
    }).trim();
    return out || null;
  } catch {
    return null;
  }
}

function isProcessAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return (error as NodeJS.ErrnoException)?.code === 'EPERM';
  }
}

function isOwnedAstroProcess(args: string, root: string): boolean {
  return /\bastro\b/i.test(args) || (Boolean(root) && args.includes(root));
}

async function waitForExit(pid: number, timeoutMs: number): Promise<boolean> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (!isProcessAlive(pid)) return true;
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  return !isProcessAlive(pid);
}

/** Stop any orphaned Astro preview servers left behind by an earlier Cauldron crash. */
export async function cleanupOrphanedDevServers(): Promise<number> {
  const file = previewServersFile();
  if (!file || !fs.existsSync(file)) return 0;
  const entries = readTrackedServers(file);
  if (entries.length === 0) return 0;

  const remaining: TrackedDevServer[] = [];
  let cleaned = 0;

  for (const entry of entries) {
    if (activeServerPids.has(entry.pid)) {
      remaining.push(entry);
      continue;
    }
    const args = processCommandLine(entry.pid);
    if (!args || !isOwnedAstroProcess(args, entry.root)) {
      // Dead PID or PID reused by an unrelated program: prune without killing.
      continue;
    }
    try {
      process.kill(entry.pid, 'SIGTERM');
      const exited = await waitForExit(entry.pid, 600);
      if (!exited) {
        process.kill(entry.pid, 'SIGKILL');
        await waitForExit(entry.pid, 200);
      }
      cleaned += 1;
    } catch (error) {
      if ((error as NodeJS.ErrnoException)?.code !== 'ESRCH') {
        console.error(
          `Could not clean up orphaned preview server (pid ${entry.pid}):`,
          error,
        );
        remaining.push(entry);
      }
    }
  }

  writeTrackedServers(file, remaining);
  return cleaned;
}

function tryBindPort(port: number): Promise<number | null> {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.unref();
    server.once('error', () => {
      resolve(null);
    });
    server.listen(port, '127.0.0.1', () => {
      const address = server.address();
      const resolved =
        address && typeof address === 'object' ? address.port : null;
      server.close(() => resolve(resolved));
    });
  });
}

/** Prefer port 4321 when free, otherwise allocate an available ephemeral port. */
export async function findFreePort(preferred = 4321): Promise<number> {
  if (preferred > 0) {
    const first = await tryBindPort(preferred);
    if (first !== null) return first;
  }
  const ephemeral = await tryBindPort(0);
  return ephemeral ?? preferred;
}

/**
 * Starts the site's own Astro dev server. Returns as soon as it prints its address.
 * Anything it needs installed first is reported, never installed silently.
 */
export async function startDevServer(
  site: Site,
  onOutput: (line: string) => void,
): Promise<DevServer | Problem> {
  if (!site.hasDependencies) {
    return {
      problem:
        'This site has not had its packages installed yet, so its preview cannot start.',
      detail: `Run "${site.packageManager} install" in ${site.root}, then open it again.`,
    };
  }

  const astroBin = path.join(site.root, 'node_modules/.bin/astro');
  if (!fs.existsSync(astroBin)) {
    return {
      problem: 'The site has no Astro command available.',
      detail: `Expected ${astroBin}. Run "${site.packageManager} install" and try again.`,
    };
  }

  await cleanupOrphanedDevServers();
  const chosenPort = await findFreePort(4321);

  return new Promise((resolve) => {
    // A GUI launch has no terminal PATH; the astro shebang needs a real Node.
    // Astro 7+ detects agent environments and attempts to auto-daemonize with a
    // detached process unless ASTRO_DEV_BACKGROUND is set.
    const env = childEnvForTools({
      ...process.env,
      FORCE_COLOR: '0',
      NO_COLOR: '1',
      ASTRO_DEV_BACKGROUND: '1',
      ASTRO_PREVIEW_BACKGROUND: '1',
    });
    const child = spawn(
      astroBin,
      ['dev', '--host', '127.0.0.1', '--port', String(chosenPort)],
      {
        cwd: site.root,
        env,
        stdio: ['ignore', 'pipe', 'pipe'],
      },
    );
    const pid = child.pid;
    if (pid) {
      activeServerPids.add(pid);
      recordDevServerPid(pid, site.root);
    }

    let settled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const untrack = () => {
      if (pid) removeDevServerPid(pid);
    };
    const finish = (result: DevServer | Problem) => {
      if (settled) return;
      settled = true;
      if (timer) clearTimeout(timer);
      if ('problem' in result) untrack();
      resolve(result);
    };

    const onLine = (raw: string) => {
      // oxlint-disable-next-line no-control-regex -- Astro may emit ANSI colour codes.
      const line = raw.replace(/\u001b\[[0-9;]*m/g, '').trimEnd();
      if (!line) return;
      onOutput(line);
      if (/already running|already in use/i.test(line)) {
        child.kill('SIGTERM');
        finish({
          problem:
            'Another dev server is already running on that port. Close any other Astro dev server running for this site and try starting the preview again.',
          detail: line,
        });
        return;
      }
      const match = LOCAL_URL.exec(line);
      if (match && !settled) {
        const port = Number(match[1]);
        finish({
          url: `http://127.0.0.1:${port}/`,
          port,
          process: child,
          stop: () => {
            untrack();
            child.kill('SIGTERM');
            setTimeout(() => child.kill('SIGKILL'), 2000).unref();
          },
        });
      }
    };

    const pump = (stream: NodeJS.ReadableStream | null) => {
      if (!stream) return;
      let buffer = '';
      stream.setEncoding('utf8');
      stream.on('data', (chunk: string) => {
        buffer += chunk;
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';
        for (const line of lines) onLine(line);
      });
    };
    pump(child.stdout);
    pump(child.stderr);

    child.on('error', (error) => {
      untrack();
      finish({
        problem: 'The Astro dev server could not start.',
        detail: error.message,
      });
    });

    child.on('exit', (code) => {
      untrack();
      finish({
        problem: 'The Astro dev server stopped before it was ready.',
        detail: `It exited with code ${code ?? 'unknown'}.`,
      });
    });

    timer = setTimeout(() => {
      if (settled) return;
      untrack();
      child.kill('SIGTERM');
      finish({
        problem: 'The Astro dev server took too long to start.',
        detail: 'Nothing was ready after 60 seconds.',
      });
    }, 60000).unref();
  });
}
