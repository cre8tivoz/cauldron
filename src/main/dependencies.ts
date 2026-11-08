import { spawn, spawnSync } from 'node:child_process';
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
