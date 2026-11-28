import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

/**
 * GUI-launch executable resolution. A packaged or dock-launched app does not
 * inherit a development terminal's PATH, so bare `node`, `claude`, `codex`,
 * `hermes` and shebang scripts fail with ENOENT or exit 127. Everything here
 * resolves real installed locations and builds a child environment that keeps
 * sibling agent calls working; nothing is installed and no shell config is
 * written.
 */

export type ToolLocation = { name: string; path: string };

const RESOLUTION_TTL_MS = 30_000;
const resolutionCache = new Map<
  string,
  { value: ResolvedRuntime; expires: number }
>();
/** Tests and post-install flows can force a clean lookup. */
export function resetRuntimeResolutionCache(): void {
  resolutionCache.clear();
  loginShellCache = null;
}

export type ResolvedRuntime = {
  /** The Node executable to run dependency tools with, if one was found. */
  nodePath: string | null;
  /** Directories searched, most useful first; these become the child PATH. */
  executableDirs: string[];
  /** Tools found by name, plus a readable miss for each one not found. */
  tools: ToolLocation[];
  missing: string[];
  /** Anything worth showing the person, never swallowed. */
  problems: string[];
  /** A child environment whose PATH puts the resolved dirs first. */
  env: NodeJS.ProcessEnv;
};

const MIN_NODE_MAJOR = 20; // Astro's current major requires a modern Node.

/** Major version of an nvm-style directory name (`v22.4.1` -> 22). */
function majorFromVersionDir(dirName: string): number | null {
  const match = /^v(\d+)/.exec(dirName);
  return match ? Number(match[1]) : null;
}

/** Numeric version sort, not lexical: v26 must come before v9. */
const numericVersionDescending = (a: string, b: string): number => {
  const pa = a.replace(/^v/, '').split('.').map(Number);
  const pb = b.replace(/^v/, '').split('.').map(Number);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const diff = (pb[i] ?? 0) - (pa[i] ?? 0);
    if (diff !== 0) return diff;
  }
  return 0;
};

/**
 * Node candidates, most preferred first. Version-managed installs whose major
 * version satisfies Astro come before any system Node, so an old /usr/local
 * node never silently wins over a modern one. `process.execPath` is
 * deliberately absent — in a packaged app that is Electron, never Node.
 */
function collectVersionedNodeCandidates(
  versionsDir: string,
  suffix: string,
): string[] {
  const compatible: string[] = [];
  const fallback: string[] = [];
  try {
    const versions = fs
      .readdirSync(versionsDir)
      .filter((entry) => /^v?\d+/.test(entry))
      .sort(numericVersionDescending);
    for (const version of versions) {
      const normalized = version.startsWith('v') ? version : `v${version}`;
      const major = majorFromVersionDir(normalized);
      if (major === null) continue;
      const bin = path.join(versionsDir, version, suffix);
      if (major >= MIN_NODE_MAJOR) compatible.push(bin);
      else fallback.push(bin);
    }
  } catch {
    // Version manager not installed; skip.
  }
  return [...compatible, ...fallback];
}

const CANDIDATE_NODE_PATHS = (home: string): string[] => {
  const candidates: string[] = [
    ...collectVersionedNodeCandidates(`${home}/.nvm/versions/node`, 'bin/node'),
    ...collectVersionedNodeCandidates(
      `${home}/.local/share/fnm/node-versions`,
      'installation/bin/node',
    ),
    ...collectVersionedNodeCandidates(
      `${home}/Library/Application Support/fnm/node-versions`,
      'installation/bin/node',
    ),
    ...collectVersionedNodeCandidates(
      `${home}/.local/share/mise/installs/node`,
      'bin/node',
    ),
    `${home}/.volta/bin/node`,
    `${home}/.asdf/shims/node`,
    '/opt/homebrew/bin/node',
    '/usr/local/bin/node',
    `${home}/.local/bin/node`,
    `${home}/.hermes/node/bin/node`,
  ];
  return candidates;
};

export function firstExisting(paths: string[]): string | null {
  for (const candidate of paths) {
    try {
      if (!fs.statSync(candidate).isFile()) continue;
      fs.accessSync(candidate, fs.constants.X_OK);
      return candidate;
    } catch {
      // Try the next one.
    }
  }
  return null;
}

/**
 * The PATH a login shell would produce, so tools installed through shell
 * profiles (claude, codex, hermes in ~/.local/bin and elsewhere) are found
 * without hard-coding every location. Read-only: nothing is sourced into this
 * process and no config is changed. The (potentially slow) shell probe is
 * cached so one action never pays for it twice.
 */
const PATH_SENTINEL_START = '__CAULDRON_PATH_START__';
const PATH_SENTINEL_END = '__CAULDRON_PATH_END__';

/** Extracts colon-delimited PATH directories between sentinel markers, ignoring login banners. */
export function parseLoginShellPathOutput(stdout: string): string[] {
  const start = stdout.indexOf(PATH_SENTINEL_START);
  const end =
    start !== -1
      ? stdout.indexOf(PATH_SENTINEL_END, start + PATH_SENTINEL_START.length)
      : -1;
  const payload =
    start !== -1 && end !== -1
      ? stdout.slice(start + PATH_SENTINEL_START.length, end)
      : stdout;
  return payload
    .trim()
    .split(':')
    .filter((dir) => {
      if (!dir) return false;
      try {
        return fs.statSync(dir).isDirectory();
      } catch {
        return false;
      }
    });
}

let loginShellCache: { dirs: string[]; problem: string | null } | null = null;
function loginShellDirs(): { dirs: string[]; problem: string | null } {
  if (loginShellCache) return loginShellCache;
  const shell = process.env.SHELL || '/bin/zsh';
  const isFish = path.basename(shell) === 'fish';
  const command = isFish
    ? `printf '${PATH_SENTINEL_START}%s${PATH_SENTINEL_END}' (string join ':' $PATH)`
    : `printf '${PATH_SENTINEL_START}%s${PATH_SENTINEL_END}' "$PATH"`;
  try {
    const result = spawnSync(shell, ['-l', '-c', command], {
      encoding: 'utf8',
      timeout: 5000,
      env: {
        PATH: '/usr/bin:/bin:/usr/sbin:/sbin',
        HOME: os.homedir(),
      },
    });
    if (result.status !== 0 || typeof result.stdout !== 'string') {
      // Cached like a success: an unanswering shell must not cost up to five
      // seconds on every lookup. resetRuntimeResolutionCache() clears it.
      loginShellCache = {
        dirs: [],
        problem: `A login shell (${shell}) did not report its PATH${
          result.stderr?.trim() ? `: ${result.stderr.trim()}` : ''
        }.`,
      };
      return loginShellCache;
    }
    const dirs = parseLoginShellPathOutput(result.stdout);
    loginShellCache = { dirs, problem: null };
    return loginShellCache;
  } catch (error) {
    loginShellCache = {
      dirs: [],
      problem: `A login shell could not be run: ${error}`,
    };
    return loginShellCache;
  }
}

/** Existing directories from a PATH string, in order, duplicates removed. */
function parsePathDirs(value: string | undefined): string[] {
  const seen = new Set<string>();
  const dirs: string[] = [];
  for (const dir of (value ?? '').split(':')) {
    if (!dir || seen.has(dir)) continue;
    seen.add(dir);
    if (fs.existsSync(dir)) dirs.push(dir);
  }
  return dirs;
}

export function resolveInstalledExecutables(options?: {
  /** Tool names to locate (bare command names, e.g. `claude`). */
  names?: string[];
  /** Extra directories to search ahead of the discovered ones. */
  extraDirs?: string[];
  /** Skip the short-lived cache (for tests or after an install). */
  noCache?: boolean;
}): ResolvedRuntime {
  const names = options?.names ?? [
    'node',
    'npm',
    'pnpm',
    'claude',
    'codex',
    'hermes',
  ];
  // Resolution includes a login-shell probe (up to 5 s); one action must not
  // pay for it repeatedly. A short TTL keeps installs recognised quickly.
  // The key covers every option that changes the result (names, extra
  // directories, cache bypass), so an override can never reuse another
  // call's cached answer.
  const cacheKey = JSON.stringify([
    names,
    options?.extraDirs ?? [],
    Boolean(options?.noCache),
    process.env.PATH ?? '',
  ]);
  const cached = options?.noCache ? undefined : resolutionCache.get(cacheKey);
  if (cached && Date.now() < cached.expires) return cached.value;
  const home = os.homedir();
  const problems: string[] = [];

  const envPathDirs = parsePathDirs(process.env.PATH);
  const login = loginShellDirs();
  if (login.problem) problems.push(login.problem);

  const nodePath = firstExisting([
    ...(options?.extraDirs ?? []).map((dir) => path.join(dir, 'node')),
    ...CANDIDATE_NODE_PATHS(home),
    ...envPathDirs.map((dir) => path.join(dir, 'node')),
    ...login.dirs.map((dir) => path.join(dir, 'node')),
  ]);

  // Node's directory first (its own tools such as npm live beside it), then
  // caller-supplied extras, then the caller's PATH, then the common
  // installed-tool locations, then whatever a login shell would supply.
  // PATH comes before the hard-coded fallbacks so a caller (a test shim, a
  // user's own PATH preference) can override an installed binary the way a
  // bare spawn would. The hard-coded and login-shell directories stay behind
  // as the GUI fallback for a PATH that does not carry the tools.
  const dirOrder: string[] = [];
  const addDir = (dir: string) => {
    if (!dir || dirOrder.includes(dir) || !fs.existsSync(dir)) return;
    dirOrder.push(dir);
  };
  if (nodePath) addDir(path.dirname(nodePath));
  for (const dir of options?.extraDirs ?? []) addDir(dir);
  for (const dir of envPathDirs) addDir(dir);
  addDir(`${home}/.local/bin`);
  addDir('/usr/local/bin');
  addDir('/opt/homebrew/bin');
  for (const dir of login.dirs) addDir(dir);

  const tools: ToolLocation[] = [];
  const missing: string[] = [];
  for (const name of names) {
    // A bare candidate (nvm's node is not in dirOrder's head when /usr/local's
    // older node comes first) is checked explicitly before the PATH scan.
    const explicit =
      name === 'node' && nodePath
        ? nodePath
        : firstExisting(dirOrder.map((dir) => path.join(dir, name)));
    if (explicit) tools.push({ name, path: explicit });
    else missing.push(name);
  }

  if (!nodePath)
    problems.push(
      'No Node.js installation was found. Install Node (nodejs.org, or through nvm) so site dependencies can be prepared.',
    );

  const env: NodeJS.ProcessEnv = {
    ...process.env,
    PATH: [...dirOrder, ...parsePathDirs(process.env.PATH)].join(':'),
  };

  const value: ResolvedRuntime = {
    nodePath,
    executableDirs: dirOrder,
    tools,
    missing,
    problems,
    env,
  };
  resolutionCache.set(cacheKey, {
    value,
    expires: Date.now() + RESOLUTION_TTL_MS,
  });
  return value;
}

/**
 * A child environment for spawning shebang scripts (astro, pnpm) and named
 * agents in a GUI launch. Falls back to the current environment unchanged when
 * resolution fails, so terminal runs keep working exactly as before.
 */
export function childEnvForTools(
  base: NodeJS.ProcessEnv = process.env,
): NodeJS.ProcessEnv {
  try {
    const runtime = resolveInstalledExecutables({ names: [] });
    if (runtime.executableDirs.length === 0) return { ...base };
    return {
      ...base,
      PATH: [...runtime.executableDirs, ...parsePathDirs(base.PATH)].join(':'),
    };
  } catch {
    return { ...base };
  }
}

/** Resolve a bare command name to an absolute path, or null when missing. */
export function resolveToolPath(name: string): string | null {
  const found = resolveInstalledExecutables({ names: [name] }).tools[0];
  return found?.path ?? null;
}
