import fs from 'node:fs';
import path from 'node:path';
import { spawn, type ChildProcess } from 'node:child_process';

export type PackageManager = 'npm' | 'pnpm' | 'yarn';

export type Site = {
  root: string;
  name: string;
  astroVersion: string;
  packageManager: PackageManager;
  hasDependencies: boolean;
};

export type Problem = { problem: string; detail: string };

function detectPackageManager(root: string): PackageManager {
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

const LOCAL_URL = /https?:\/\/(?:localhost|127\.0\.0\.1|\[::1\]):(\d+)\/?/;

/**
 * Starts the site's own Astro dev server. Returns as soon as it prints its address.
 * Anything it needs installed first is reported, never installed silently.
 */
export function startDevServer(
  site: Site,
  onOutput: (line: string) => void,
): Promise<DevServer | Problem> {
  if (!site.hasDependencies) {
    return Promise.resolve({
      problem:
        'This site has not had its packages installed yet, so its preview cannot start.',
      detail: `Run "${site.packageManager} install" in ${site.root}, then open it again.`,
    });
  }

  const astroBin = path.join(site.root, 'node_modules/.bin/astro');
  if (!fs.existsSync(astroBin)) {
    return Promise.resolve({
      problem: 'The site has no Astro command available.',
      detail: `Expected ${astroBin}. Run "${site.packageManager} install" and try again.`,
    });
  }

  return new Promise((resolve) => {
    const child = spawn(astroBin, ['dev', '--host', '127.0.0.1'], {
      cwd: site.root,
      env: { ...process.env, FORCE_COLOR: '0', NO_COLOR: '1' },
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let settled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const finish = (result: DevServer | Problem) => {
      if (settled) return;
      settled = true;
      if (timer) clearTimeout(timer);
      resolve(result);
    };

    const onLine = (raw: string) => {
      // oxlint-disable-next-line no-control-regex -- Astro may emit ANSI colour codes.
      const line = raw.replace(/\u001b\[[0-9;]*m/g, '').trimEnd();
      if (!line) return;
      onOutput(line);
      const match = LOCAL_URL.exec(line);
      if (match && !settled) {
        const port = Number(match[1]);
        finish({
          url: `http://127.0.0.1:${port}/`,
          port,
          process: child,
          stop: () => {
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
      finish({
        problem: 'The Astro dev server could not start.',
        detail: error.message,
      });
    });

    child.on('exit', (code) => {
      finish({
        problem: 'The Astro dev server stopped before it was ready.',
        detail: `It exited with code ${code ?? 'unknown'}.`,
      });
    });

    timer = setTimeout(() => {
      if (settled) return;
      child.kill('SIGTERM');
      finish({
        problem: 'The Astro dev server took too long to start.',
        detail: 'Nothing was ready after 60 seconds.',
      });
    }, 60000).unref();
  });
}
