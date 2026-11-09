import { spawn, spawnSync } from 'node:child_process';
import { builtinModules } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { childEnvForTools, resolveToolPath } from './runtime';

/**
 * Dependency preparation through each project's own package manager. Nothing
 * is migrated, upgraded or installed silently: an existing project's manager
 * and node_modules are detected and reported (a package.json packageManager
 * field is honoured, and a lockfile that disagrees with it is reported, never
 * quietly converted), and installs only happen when the caller asks for them.
 * The pnpm content-addressable store location is supplied by the caller, so
 * new projects share real files without a single mutable shared node_modules
 * folder and without touching global settings.
 */

export type ManagerSetup = {
  manager: 'npm' | 'pnpm' | 'yarn';
  lockfile: string | null;
  hasNodeModules: boolean;
  hasAstroBin: boolean;
  /** A packageManager field that disagrees with the lockfile, if any. */
  conflict: string | null;
};

/** The manager named by a package.json `packageManager` field, if parseable. */
function declaredManager(root: string): ManagerSetup['manager'] | null {
  try {
    const pkg = JSON.parse(
      fs.readFileSync(path.join(root, 'package.json'), 'utf8'),
    ) as { packageManager?: string };
    const declared = pkg.packageManager?.split('@')[0];
    if (declared === 'pnpm' || declared === 'yarn' || declared === 'npm')
      return declared;
  } catch {
    // No readable package.json: lockfiles decide.
  }
  return null;
}

export function detectDependencySetup(root: string): ManagerSetup {
  const lockfiles: Array<[string, ManagerSetup['manager']]> = [
    ['pnpm-lock.yaml', 'pnpm'],
    ['yarn.lock', 'yarn'],
    ['package-lock.json', 'npm'],
  ];
  // The manager: the project's own packageManager field when declared, else
  // the lockfile that is present, else npm. A conflict is reported only when
  // an actual lockfile disagrees with the declaration — a fresh pnpm project
  // with no lockfile yet is normal, not a conflict.
  const declared = declaredManager(root);
  let lockfileManager: ManagerSetup['manager'] | null = null;
  let lockfile: string | null = null;
  for (const [file, found] of lockfiles) {
    if (fs.existsSync(path.join(root, file))) {
      lockfileManager = found;
      lockfile = file;
      break;
    }
  }
  const manager: ManagerSetup['manager'] = declared ?? lockfileManager ?? 'npm';
  let conflict: string | null = null;
  if (declared && lockfileManager && declared !== lockfileManager) {
    // Honour the project's own declaration; the disagreement is shown, and a
    // wrong-looking lockfile is for the person to resolve, not to migrate.
    conflict = `package.json says ${declared}, but ${lockfile} is present. Using ${declared}; check which lockfile is right before relying on reproducible installs.`;
  }
  return {
    manager,
    lockfile,
    hasNodeModules: fs.existsSync(path.join(root, 'node_modules')),
    hasAstroBin: fs.existsSync(path.join(root, 'node_modules/.bin/astro')),
    conflict,
  };
}

export type PrepareUpdate =
  | { type: 'progress'; text: string }
  | { type: 'done'; ok: true; detail: string }
  | { type: 'done'; ok: false; problem: string; detail: string };

export type PrepareHandle = { cancel: () => void };

/**
 * Installs a project's dependencies with its own package manager.
 * - New pnpm projects (the ones Cauldron creates) use the caller-supplied
 *   store directory (`--store-dir`), so identical package versions reuse the
 *   same content-addressed files while each project keeps its own resolution
 *   and node_modules.
 * - npm/yarn projects are prepared with their own manager; no migration, no
 *   deletion of an existing node_modules.
 * Nothing global is written: the store path is per-invocation.
 */
export function prepareDependencies(options: {
  root: string;
  /** Caller-supplied cache directory for the pnpm store (isolated/global-safe). */
  storeDir?: string;
  /** Test-only: override tool resolution to exercise the not-found path. */
  resolveToolOverride?: (manager: string) => string | null;
  onUpdate: (update: PrepareUpdate) => void;
}): PrepareHandle {
  const { root, onUpdate } = options;
  const setup = detectDependencySetup(root);
  const done = (ok: boolean, text: string, detail: string): PrepareUpdate =>
    ok
      ? { type: 'done', ok: true, detail }
      : { type: 'done', ok: false, problem: text, detail };

  const manager = setup.manager;
  const resolved = options.resolveToolOverride
    ? options.resolveToolOverride(manager)
    : manager === 'pnpm'
      ? resolveToolPath('pnpm') // Cauldron-created projects use pnpm.
      : resolveToolPath(manager);
  if (!resolved) {
    onUpdate(
      done(
        false,
        `${manager} could not be found.`,
        `No ${manager} executable was found in the usual installed locations or PATH. Install Node.js${
          manager === 'pnpm' ? ' (and pnpm: npm install -g pnpm)' : ''
        }, then try again.`,
      ),
    );
    return { cancel: () => {} };
  }

  const args =
    manager === 'pnpm'
      ? [
          'install',
          ...(options.storeDir ? ['--store-dir', options.storeDir] : []),
        ]
      : manager === 'yarn'
        ? ['install']
        : ['install', '--no-audit', '--no-fund'];

  onUpdate({ type: 'progress', text: `Running ${manager} install…` });
  const env = childEnvForTools({
    ...process.env,
    FORCE_COLOR: '0',
    NO_COLOR: '1',
  });
  const child = spawn(resolved, args, {
    cwd: root,
    env,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  // Exactly one terminal `done` is ever emitted: a spawn error and the close
  // event that follows it must not both report, and a cancelled install is
  // quiet after cancellation. Trailing output is flushed before the verdict.
  let finished = false;
  let cancelled = false;
  let trailing = { stdout: '', stderr: '' };
  const pump = (
    stream: NodeJS.ReadableStream | null,
    which: 'stdout' | 'stderr',
  ) => {
    if (!stream) return;
    stream.setEncoding('utf8');
    let buffer = '';
    stream.on('data', (chunk: string) => {
      buffer += chunk;
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';
      trailing[which] = buffer;
      for (const line of lines)
        if (line.trim()) onUpdate({ type: 'progress', text: line.trim() });
    });
  };
  const settle = (update: PrepareUpdate) => {
    if (finished) return;
    finished = true;
    onUpdate(update);
  };
  pump(child.stdout, 'stdout');
  pump(child.stderr, 'stderr');

  child.on('error', (error) => {
    settle(done(false, `${manager} could not start.`, error.message));
  });
  child.on('close', (code) => {
    for (const line of [trailing.stdout, trailing.stderr])
      if (line.trim()) onUpdate({ type: 'progress', text: line.trim() });
    if (cancelled) return; // Cancellation already owns the outcome.
    settle(
      code === 0
        ? done(true, '', `${manager} install finished in ${root}.`)
        : done(
            false,
            `${manager} install failed with exit code ${code ?? 'unknown'}.`,
            `Check the output above for the cause; nothing in ${root} was deleted.`,
          ),
    );
  });

  return {
    cancel: () => {
      if (finished) return;
      cancelled = true;
      finished = true;
      child.kill('SIGTERM');
      setTimeout(() => child.kill('SIGKILL'), 2000).unref();
      onUpdate({ type: 'progress', text: 'Install cancelled.' });
      // Cancellation is itself the outcome: the caller gets exactly one
      // terminal event, so progress UI can restore its controls and offer a
      // retry instead of waiting forever for a close that reports nothing.
      onUpdate(done(false, 'The install was cancelled.', root));
    },
  };
}

/**
 * A promise-based convenience for tests/scripts: runs the same install and
 * returns every progress line, never swallowing stderr.
 */
export function prepareDependenciesCollect(options: {
  root: string;
  storeDir?: string;
  timeoutMs?: number;
}): Promise<
  | { ok: true; lines: string[] }
  | { ok: false; problem: string; detail: string; lines: string[] }
> {
  return new Promise((resolve) => {
    const lines: string[] = [];
    let settled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const handle = prepareDependencies({
      root: options.root,
      storeDir: options.storeDir,
      onUpdate: (update) => {
        if (update.type === 'progress') lines.push(update.text);
        else if (update.type === 'done') {
          if (settled) return;
          settled = true;
          if (timer) clearTimeout(timer);
          resolve(
            update.ok
              ? { ok: true, lines }
              : {
                  ok: false,
                  problem: update.problem,
                  detail: update.detail,
                  lines,
                },
          );
        }
      },
    });
    timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      handle.cancel();
      resolve({
        ok: false,
        problem: 'The install did not finish in time.',
        detail: `${options.root}`,
        lines,
      });
    }, options.timeoutMs ?? 600000);
  });
}

/** The store location a given pnpm would use by default (for display only). */
export function defaultStoreDir(pnpmPath?: string): string | null {
  const pnpm = pnpmPath ?? resolveToolPath('pnpm');
  if (!pnpm) return null;
  const result = spawnSync(pnpm, ['store', 'path'], {
    encoding: 'utf8',
    timeout: 15000,
    env: childEnvForTools({ ...process.env, NO_COLOR: '1' }),
  });
  const out = result.stdout?.trim();
  return result.status === 0 && out ? out : null;
}

/**
 * Scans a site's source files for bare package imports that are neither
 * declared in package.json nor installed in node_modules.
 */
export function findMissingPackages(root: string): string[] {
  let pkgJson: {
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
    peerDependencies?: Record<string, string>;
    optionalDependencies?: Record<string, string>;
  } = {};
  try {
    pkgJson = JSON.parse(
      fs.readFileSync(path.join(root, 'package.json'), 'utf8'),
    );
  } catch {
    // Unreadable or missing package.json
  }

  const declared = new Set([
    ...Object.keys(pkgJson.dependencies ?? {}),
    ...Object.keys(pkgJson.devDependencies ?? {}),
    ...Object.keys(pkgJson.peerDependencies ?? {}),
    ...Object.keys(pkgJson.optionalDependencies ?? {}),
  ]);

  const files: string[] = [];
  const walk = (dir: string): void => {
    if (!fs.existsSync(dir)) return;
    let entries: fs.Dirent[] = [];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const ent of entries) {
      if (['node_modules', '.git', 'dist', '.astro'].includes(ent.name))
        continue;
      const full = path.join(dir, ent.name);
      if (ent.isDirectory()) {
        walk(full);
      } else if (/\.(astro|css|ts|tsx|js|jsx|mjs|cjs)$/.test(ent.name)) {
        files.push(full);
      }
    }
  };
  walk(path.join(root, 'src'));

  for (const ext of ['mjs', 'ts', 'js', 'cjs', 'mts']) {
    const configPath = path.join(root, `astro.config.${ext}`);
    if (fs.existsSync(configPath)) files.push(configPath);
  }

  const specifiers = new Set<string>();
  const pkgNameRe = /^(?:@[a-z0-9-~][a-z0-9-._~]*\/)?[a-z0-9-~][a-z0-9-._~]*$/;
  const nodeBuiltins = new Set(builtinModules);

  for (const file of files) {
    let content = '';
    try {
      content = fs.readFileSync(file, 'utf8');
    } catch {
      continue;
    }
    let textToScan = '';
    if (file.endsWith('.astro')) {
      const fmMatch = content.match(/^\s*---[\s\S]*?---/);
      if (fmMatch) textToScan += `${fmMatch[0]}\n`;
      const scriptMatches = content.matchAll(
        /<script(?:\s+[^>]*)?>([\s\S]*?)<\/script>/gi,
      );
      for (const m of scriptMatches) textToScan += `${m[1]}\n`;
      const styleMatches = content.matchAll(
        /<style(?:\s+[^>]*)?>([\s\S]*?)<\/style>/gi,
      );
      for (const m of styleMatches) textToScan += `${m[1]}\n`;
    } else {
      textToScan = content;
    }

    textToScan = textToScan.replace(/\/\*[\s\S]*?\*\//g, '');
    textToScan = textToScan.replace(/(?<!:)\/\/.*$/gm, '');

    const importPatterns = [
      /import\s+.*?from\s+['"]([^'"]+)['"]/g,
      /import\s+['"]([^'"]+)['"]/g,
      /export\s+.*?from\s+['"]([^'"]+)['"]/g,
      /import\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
      /@import\s+(?:url\(\s*)?['"]([^'"]+)['"]/g,
    ];

    for (const pat of importPatterns) {
      for (const match of textToScan.matchAll(pat)) {
        if (match[1]) specifiers.add(match[1]);
      }
    }
  }

  const missing = new Set<string>();
  for (const spec of specifiers) {
    if (!spec || /^[./]/.test(spec)) continue;
    if (/^(https?:|data:|file:|mailto:)/.test(spec)) continue;
    if (/^[~@#]\//.test(spec) || spec === '~' || spec === '@') continue;
    if (/^(astro:|virtual:)/.test(spec)) continue;
    if (spec.startsWith('node:') || nodeBuiltins.has(spec)) continue;

    let pkgName = '';
    if (spec.startsWith('@')) {
      const parts = spec.split('/');
      if (parts.length >= 2) pkgName = `${parts[0]}/${parts[1]}`;
    } else {
      pkgName = spec.split('/')[0];
    }

    if (!pkgName || !pkgNameRe.test(pkgName)) continue;

    const onDisk = fs.existsSync(
      path.join(root, 'node_modules', ...pkgName.split('/')),
    );
    if (!declared.has(pkgName) || !onDisk) {
      missing.add(pkgName);
    }
  }

  return [...missing].sort();
}

export type InstallMissingPackagesResult = {
  ok: boolean;
  manager: string;
  storeDir?: string;
  log: string;
  problem?: string;
};

/**
 * Installs specified missing packages using the project's own package manager.
 * For pnpm projects, uses the supplied shared store directory.
 */
export function installMissingPackages(
  root: string,
  packages: string[],
  storeDirOrUserData?: string,
): Promise<InstallMissingPackagesResult> {
  const pkgNameRe = /^(?:@[a-z0-9-~][a-z0-9-._~]*\/)?[a-z0-9-~][a-z0-9-._~]*$/;
  const valid = [...new Set(packages.filter((p) => pkgNameRe.test(p)))];
  if (valid.length === 0) {
    return Promise.resolve({
      ok: true,
      manager: 'none',
      log: 'No valid packages to install.',
    });
  }

  const setup = detectDependencySetup(root);
  const manager = setup.manager;
  const resolved =
    resolveToolPath(manager) ??
    (manager === 'pnpm' ? resolveToolPath('npm') : null);
  if (!resolved) {
    return Promise.resolve({
      ok: false,
      manager,
      storeDir: storeDirOrUserData,
      log: '',
      problem: `No ${manager} executable was found in PATH or standard locations.`,
    });
  }

  let effectiveStoreDir: string | undefined = undefined;
  if (storeDirOrUserData) {
    effectiveStoreDir = storeDirOrUserData.endsWith('pnpm-store')
      ? storeDirOrUserData
      : path.join(storeDirOrUserData, 'pnpm-store');
  } else if (process.env.CAULDRON_PNPM_STORE) {
    effectiveStoreDir = process.env.CAULDRON_PNPM_STORE;
  } else if (process.env.HOME) {
    effectiveStoreDir = path.join(
      process.env.HOME,
      'Library/Application Support/Cauldron/pnpm-store',
    );
  }

  let cmd = resolved;
  let args: string[] = [];

  if (manager === 'pnpm') {
    if (effectiveStoreDir) {
      try {
        fs.mkdirSync(effectiveStoreDir, { recursive: true });
      } catch {
        // ignore
      }
    }
    args = [
      'add',
      ...valid,
      ...(effectiveStoreDir ? ['--store-dir', effectiveStoreDir] : []),
      '--reporter=append-only',
    ];
  } else if (manager === 'yarn') {
    args = ['add', ...valid];
  } else {
    const npmPath = resolveToolPath('npm') ?? 'npm';
    cmd = npmPath;
    args = ['install', '--save', '--no-audit', '--no-fund', ...valid];
  }

  const env = childEnvForTools({
    ...process.env,
    FORCE_COLOR: '0',
    NO_COLOR: '1',
  });

  return new Promise((resolve) => {
    const child = spawn(cmd, args, {
      cwd: root,
      env,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let output = '';
    child.stdout.on('data', (d: Buffer) => {
      output += d.toString('utf8');
    });
    child.stderr.on('data', (d: Buffer) => {
      output += d.toString('utf8');
    });

    child.on('error', (err) => {
      resolve({
        ok: false,
        manager,
        storeDir: effectiveStoreDir,
        log: output,
        problem: err.message,
      });
    });

    child.on('close', (code) => {
      resolve({
        ok: code === 0,
        manager,
        storeDir: effectiveStoreDir,
        log: output,
        problem:
          code === 0
            ? undefined
            : `${manager} add failed with exit code ${code ?? 'unknown'}.`,
      });
    });
  });
}
