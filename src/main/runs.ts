import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import electron from 'electron';
import { writeFileAtomic } from './files';
import type { ChangedPage, CssRuleChange, HighlightedPart } from './compare';

/**
 * An agent job, kept reviewable: which files it changed, and the ability to put
 * all of them back in one step (plan 2.2).
 *
 * Snapshots stream-hash files instead of holding whole sites in memory, and
 * keep content-addressed pre-run backups only for files that actually changed
 * until those runs are undone or pruned.
 */

export type RunFile = {
  file: string;
  status: 'added' | 'changed' | 'removed';
  /** `run` means the agent's; `uncertain` means undo must refuse it. */
  ownership: 'run' | 'outside' | 'uncertain';
  beforeHash: string | null;
  afterHash: string | null;
};

export type Run = {
  id: string;
  tool: string;
  prompt: string;
  startedAt: number;
  finishedAt: number | null;
  status: 'running' | 'finished' | 'failed';
  files: RunFile[];
  /** Changed by something other than the run (Cauldron's editor), so left alone. */
  outside: string[];
  /** Paths the scan could not read, so ownership cannot be established. */
  problems: string[];
  note: string;
  /** The parts of the page the run changed, ready for the Before/After toggle. */
  highlighted: HighlightedPart[];
  /** CSS rule additions/changes/removals across stylesheets and Astro `<style>` blocks. */
  cssChanges?: CssRuleChange[];
  /** Changed non-deleted pages other than the page currently open in the preview. */
  otherPages?: ChangedPage[];
};

export type UndoResult =
  | { ok: true }
  | {
      ok: false;
      problem: string;
      clashes: string[];
      uncertain: string[];
    };

const SKIP = new Set([
  'node_modules',
  'dist',
  '.git',
  '.astro',
  '.vercel',
  '.netlify',
  '.output',
  '.nuxt',
  '.next',
  '.svelte-kit',
  '.cache',
  'build',
  'out',
  '.turbo',
  'coverage',
  '.pnpm-store',
  '.tmp',
]);

const MAX_UNDOABLE_RUNS = 30;
let tempCounter = 0;

const hashBytes = (value: Buffer): string =>
  crypto.createHash('sha256').update(value).digest('hex');

function hashFileSync(fullPath: string): string {
  const hash = crypto.createHash('sha256');
  const chunk = Buffer.allocUnsafe(65536);
  const fd = fs.openSync(fullPath, 'r');
  try {
    let bytesRead = 0;
    while ((bytesRead = fs.readSync(fd, chunk, 0, chunk.length, null)) > 0) {
      hash.update(
        bytesRead === chunk.length ? chunk : chunk.subarray(0, bytesRead),
      );
    }
  } finally {
    fs.closeSync(fd);
  }
  return hash.digest('hex');
}

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

function siteRunsDir(root: string): string | null {
  const base = userDataDir();
  if (!base) return null;
  return path.join(base, 'runs', hashBytes(Buffer.from(root)).slice(0, 12));
}

function copyFileAtomic(source: string, destination: string): void {
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  tempCounter += 1;
  const staging = `${destination}.staging-${process.pid}-${tempCounter}`;
  try {
    fs.copyFileSync(source, staging);
    fs.renameSync(staging, destination);
  } catch (error) {
    fs.rmSync(staging, { force: true });
    throw error;
  }
}

export type Snapshot = { files: Map<string, string>; problems: string[] };

/** Every file except the skipped folders, as sha256 digests, plus unreadable paths. */
export function snapshot(root: string): Snapshot {
  const files = new Map<string, string>();
  const problems: string[] = [];
  const walk = (dir: string) => {
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      problems.push(path.relative(root, dir) || '.');
      return;
    }
    for (const entry of entries) {
      if (SKIP.has(entry.name)) continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
        continue;
      }
      if (!entry.isFile()) continue;
      try {
        files.set(path.relative(root, full), hashFileSync(full));
      } catch {
        problems.push(path.relative(root, full));
      }
    }
  };
  walk(root);
  return { files, problems };
}

type PersistedRun = Run & {
  unreadable?: string[];
};

export class Runs {
  private runs: Run[] = [];
  private before = new Map<string, Snapshot>();
  /** Fallback pre-run byte storage only when Electron userData is unavailable. */
  private volatileBlobs = new Map<string, Map<string, Buffer>>();
  /** Where each run's site lives, so later edits/highlights save cleanly. */
  private roots = new Map<string, string>();
  /** Unreadable paths recorded during snapshot diffing, distinct from build diagnostics. */
  private unreadable = new Map<string, string[]>();
  private idCounter = 0;

  start(root: string, tool: string, prompt: string): Run {
    this.idCounter += 1;
    const run: Run = {
      id: `run-${Date.now()}-${this.idCounter}`,
      tool,
      prompt,
      startedAt: Date.now(),
      finishedAt: null,
      status: 'running',
      files: [],
      outside: [],
      problems: [],
      note: '',
      highlighted: [],
      cssChanges: [],
      otherPages: [],
    };
    const taken = snapshot(root);
    const dir = siteRunsDir(root);
    const blobsDir = dir ? path.join(dir, 'blobs') : null;
    if (blobsDir) {
      fs.mkdirSync(blobsDir, { recursive: true });
      for (const [rel, hash] of taken.files.entries()) {
        const dest = path.join(blobsDir, hash);
        if (fs.existsSync(dest)) continue;
        try {
          copyFileAtomic(path.join(root, rel), dest);
        } catch {
          taken.files.delete(rel);
          taken.problems.push(rel);
        }
      }
    } else {
      const staged = new Map<string, Buffer>();
      for (const [rel, hash] of taken.files.entries()) {
        if (staged.has(hash)) continue;
        try {
          staged.set(hash, fs.readFileSync(path.join(root, rel)));
        } catch {
          taken.files.delete(rel);
          taken.problems.push(rel);
        }
      }
      this.volatileBlobs.set(run.id, staged);
    }

    this.before.set(run.id, taken);
    this.roots.set(run.id, root);
    this.runs.push(run);
    return run;
  }

  /**
   * Reloads persisted runs for a site after app launch. Any run that was
   * interrupted mid-flight is surfaced honestly as failed rather than left running.
   */
  load(root: string): Run[] {
    const dir = siteRunsDir(root);
    if (!dir || !fs.existsSync(dir)) return this.list();
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch (error) {
      console.error('Saved run records could not be read:', error);
      return this.list();
    }

    const loaded: Run[] = [];
    for (const entry of entries) {
      if (!entry.isFile() || !entry.name.endsWith('.json')) continue;
      const full = path.join(dir, entry.name);
      try {
        const parsed = JSON.parse(
          fs.readFileSync(full, 'utf8'),
        ) as Partial<PersistedRun>;
        if (!parsed || typeof parsed.id !== 'string') continue;
        const wasInterrupted = parsed.status === 'running';
        const files: RunFile[] = Array.isArray(parsed.files)
          ? parsed.files.map((item) => ({
              file: String(item.file ?? ''),
              status: item.status ?? 'changed',
              ownership: item.ownership ?? 'uncertain',
              beforeHash: item.beforeHash ?? null,
              afterHash: item.afterHash ?? null,
            }))
          : [];
        const run: Run = {
          id: parsed.id,
          tool: String(parsed.tool ?? 'agent'),
          prompt: String(parsed.prompt ?? ''),
          startedAt: Number(parsed.startedAt ?? 0),
          finishedAt: wasInterrupted
            ? Number(parsed.finishedAt ?? Date.now())
            : (parsed.finishedAt ?? null),
          status: wasInterrupted ? 'failed' : (parsed.status ?? 'finished'),
          files,
          outside: Array.isArray(parsed.outside) ? parsed.outside : [],
          problems: Array.isArray(parsed.problems) ? parsed.problems : [],
          note: wasInterrupted
            ? parsed.note || 'Interrupted before finishing.'
            : String(parsed.note ?? ''),
          highlighted: Array.isArray(parsed.highlighted)
            ? parsed.highlighted
            : [],
          cssChanges: Array.isArray(parsed.cssChanges) ? parsed.cssChanges : [],
          otherPages: Array.isArray(parsed.otherPages) ? parsed.otherPages : [],
        };
        const unreadable = Array.isArray(parsed.unreadable)
          ? parsed.unreadable
          : [];
        loaded.push(run);
        this.roots.set(run.id, root);
        this.unreadable.set(run.id, unreadable);
        if (wasInterrupted) this.persist(root, run);
      } catch (error) {
        console.error(`Run record ${entry.name} could not be parsed:`, error);
      }
    }

    loaded.sort((a, b) => a.startedAt - b.startedAt);
    const activeIds = new Set(
      this.runs
        .filter((item) => item.status === 'running')
        .map((item) => item.id),
    );
    const merged = [
      ...loaded.filter((item) => !activeIds.has(item.id)),
      ...this.runs.filter((item) => activeIds.has(item.id)),
    ];
    this.runs = merged;
    this.pruneUnusedBlobs(root);
    return this.list();
  }

  /**
   * Diffs the site against the start of the run. `outside` lists files that
   * Cauldron's own editor wrote during the run: those are not the agent's work,
   * so undo leaves them alone.
   */
  finish(
    root: string,
    id: string,
    options: {
      outside?: Array<{ file: string; beforeHash?: string; afterHash: string }>;
      /**
       * For runs Cauldron started itself: the files the agent said it wrote.
       * Any other change could be someone else's, so undo refuses it.
       */
      claimed?: string[];
    } = {},
  ): Run | null {
    const run = this.runs.find((item) => item.id === id);
    const before = this.before.get(id);
    if (!run || !before) return null;
    this.before.delete(id);

    const after = snapshot(root);
    const relative = (file: string) =>
      path.isAbsolute(file) ? path.relative(root, file) : file;
    const claimed = options.claimed
      ? new Set(options.claimed.map(relative))
      : null;
    const outside = new Map<string, { firstBefore: string; last: string }>();
    for (const item of options.outside ?? []) {
      const name = path.isAbsolute(item.file)
        ? path.relative(root, item.file)
        : item.file;
      const seen = outside.get(name);
      outside.set(name, {
        firstBefore: seen?.firstBefore ?? item.beforeHash ?? '',
        last: item.afterHash,
      });
    }

    const changed: RunFile[] = [];
    const names = new Set([
      ...before.files.keys(),
      ...after.files.keys(),
      ...before.problems,
      ...after.problems,
    ]);
    const neededVolatileHashes = new Set<string>();
    for (const name of names) {
      const wasHash = before.files.get(name) ?? null;
      const nowHash = after.files.get(name) ?? null;
      if (wasHash === nowHash && nowHash !== null) continue;
      const unreadable =
        before.problems.includes(name) || after.problems.includes(name);
      const other = outside.get(name);
      const ownership: RunFile['ownership'] =
        unreadable ||
        (other !== undefined &&
          (other.last !== nowHash || other.firstBefore !== wasHash))
          ? 'uncertain'
          : other !== undefined
            ? 'outside'
            : claimed && !claimed.has(name)
              ? 'uncertain'
              : 'run';
      if (ownership !== 'outside' && wasHash !== null) {
        neededVolatileHashes.add(wasHash);
      }
      changed.push({
        file: name,
        status:
          wasHash === null ? 'added' : nowHash === null ? 'removed' : 'changed',
        ownership,
        beforeHash: wasHash,
        afterHash: nowHash,
      });
    }

    const staged = this.volatileBlobs.get(id);
    if (staged) {
      for (const hash of staged.keys()) {
        if (!neededVolatileHashes.has(hash)) staged.delete(hash);
      }
      if (staged.size === 0) this.volatileBlobs.delete(id);
    }

    const sorted = changed.sort((a, b) => a.file.localeCompare(b.file));
    run.files = sorted.filter((file) => file.ownership !== 'outside');
    run.outside = sorted
      .filter((file) => file.ownership === 'outside')
      .map((file) => file.file);
    const unreadable = [
      ...new Set([...before.problems, ...after.problems]),
    ].sort();
    this.unreadable.set(id, unreadable);
    run.problems = [...unreadable];
    run.finishedAt = Date.now();
    run.status = 'finished';
    run.note =
      run.files.length === 0
        ? 'No files changed.'
        : `${run.files.length} file${run.files.length === 1 ? '' : 's'} changed.`;
    if (run.outside.length > 0) {
      run.note += ` ${run.outside.length} other file${run.outside.length === 1 ? ' was' : 's were'} changed by hand and left alone.`;
    }
    if (run.problems.length > 0) {
      run.note += ` ${run.problems.length} file${run.problems.length === 1 ? '' : 's'} could not be read.`;
    }
    this.persist(root, run);
    this.pruneUnusedBlobs(root);
    return run;
  }

  fail(id: string, note: string): void {
    const run = this.runs.find((item) => item.id === id);
    if (!run) return;
    run.status = 'failed';
    run.finishedAt = Date.now();
    run.note = note;
    const root = this.roots.get(id);
    this.before.delete(id);
    this.volatileBlobs.delete(id);
    if (root) {
      this.persist(root, run);
      this.pruneUnusedBlobs(root);
    }
  }

  recordBuildFailure(id: string, problems: string[], note: string): Run | null {
    const run = this.runs.find((entry) => entry.id === id);
    if (!run) return null;
    run.status = 'failed';
    for (const problem of problems) {
      if (problem && !run.problems.includes(problem)) {
        run.problems.push(problem);
      }
    }
    run.note = note;
    const root = this.roots.get(id);
    if (root) this.persist(root, run);
    return run;
  }

  setHighlighted(id: string, highlighted: HighlightedPart[]): void {
    const run = this.runs.find((item) => item.id === id);
    if (!run) return;
    run.highlighted = highlighted;
    const root = this.roots.get(id);
    if (root && run.status !== 'running') this.persist(root, run);
  }

  setComparison(
    id: string,
    comparison: {
      highlighted: HighlightedPart[];
      cssChanges: CssRuleChange[];
      otherPages: ChangedPage[];
    },
  ): void {
    const run = this.runs.find((item) => item.id === id);
    if (!run) return;
    run.highlighted = comparison.highlighted;
    run.cssChanges = comparison.cssChanges;
    run.otherPages = comparison.otherPages;
    const root = this.roots.get(id);
    if (root && run.status !== 'running') this.persist(root, run);
  }

  get(id: string): Run | null {
    return this.runs.find((item) => item.id === id) ?? null;
  }

  list(): Run[] {
    return [...this.runs].reverse();
  }

  /** Reads before/after UTF-8 text of a changed non-binary file without retaining buffers in RAM. */
  readChangeText(
    root: string,
    runId: string,
    change: RunFile,
  ): { before: string | null; after: string | null } {
    const beforeBytes = this.readBeforeBlob(root, runId, change.beforeHash);
    let afterText: string | null = null;
    if (change.afterHash !== null && root) {
      const full = path.join(root, change.file);
      try {
        if (hashFileSync(full) === change.afterHash) {
          afterText = fs.readFileSync(full, 'utf8');
        }
      } catch {
        afterText = null;
      }
    }
    return {
      before: beforeBytes ? beforeBytes.toString('utf8') : null,
      after: afterText,
    };
  }

  /** True when the run has finished/failed with files, wasn't already undone, and backups exist. */
  canUndo(root: string, id: string): boolean {
    const run = this.runs.find((item) => item.id === id);
    if (!run) return false;
    if (run.status !== 'finished' && run.status !== 'failed') return false;
    if (run.files.length === 0 || run.note.includes('Undone.')) return false;
    for (const file of run.files) {
      if (file.beforeHash === null) continue;
      if (!this.hasBeforeBlob(root, id, file.beforeHash)) return false;
    }
    return true;
  }

  /**
   * Puts every change back, but only if all of them are still exactly as the run
   * left them and each one is known to be the run's own work. Every file and
   * backup is checked before any file is written, so a refusal never leaves a partial undo.
   */
  undo(root: string, id: string): UndoResult {
    const run = this.runs.find((item) => item.id === id);
    if (!run) {
      return {
        ok: false,
        problem: 'That run is not known.',
        clashes: [],
        uncertain: [],
      };
    }
    if (run.status === 'running') {
      return {
        ok: false,
        problem: 'That run has not finished yet.',
        clashes: [],
        uncertain: [],
      };
    }

    const unreadablePaths = this.unreadable.get(id) ?? [];
    const uncertain = [
      ...new Set([
        ...run.files
          .filter((file) => file.ownership === 'uncertain')
          .map((file) => file.file),
        ...unreadablePaths,
      ]),
    ].sort();
    const clashes: string[] = [];
    for (const change of run.files) {
      const full = path.join(root, change.file);
      let hash: string | null = null;
      try {
        hash = hashFileSync(full);
      } catch {
        hash = null;
      }
      if (hash !== change.afterHash) clashes.push(change.file);
    }

    if (uncertain.length > 0) {
      return {
        ok: false,
        problem: `Who wrote these files cannot be established, so nothing was touched: ${uncertain.join(', ')}`,
        clashes,
        uncertain,
      };
    }
    if (clashes.length > 0) {
      return {
        ok: false,
        problem: `These files changed after the run, so nothing was touched: ${clashes.join(', ')}`,
        clashes,
        uncertain,
      };
    }

    const backups = new Map<string, Buffer | null>();
    for (const change of run.files) {
      if (change.beforeHash === null) {
        backups.set(change.file, null);
        continue;
      }
      const bytes = this.readBeforeBlob(root, id, change.beforeHash);
      if (!bytes || hashBytes(bytes) !== change.beforeHash) {
        return {
          ok: false,
          problem:
            'The saved pre-run backup for this run is missing or damaged, so nothing was touched.',
          clashes: [],
          uncertain: [],
        };
      }
      backups.set(change.file, bytes);
    }

    for (const change of run.files) {
      const full = path.join(root, change.file);
      const before = backups.get(change.file) ?? null;
      if (before === null) fs.rmSync(full, { force: true });
      else {
        fs.mkdirSync(path.dirname(full), { recursive: true });
        writeFileAtomic(full, before);
      }
    }

    run.note = `${run.note} Undone.`;
    this.volatileBlobs.delete(id);
    this.persist(root, run);
    this.pruneUnusedBlobs(root);
    return { ok: true };
  }

  private hasBeforeBlob(
    root: string,
    runId: string,
    hash: string | null,
  ): boolean {
    if (!hash) return true;
    const volatile = this.volatileBlobs.get(runId)?.get(hash);
    if (volatile) return true;
    const dir = siteRunsDir(root);
    if (!dir) return false;
    return fs.existsSync(path.join(dir, 'blobs', hash));
  }

  private readBeforeBlob(
    root: string,
    runId: string,
    hash: string | null,
  ): Buffer | null {
    if (!hash) return null;
    const volatile = this.volatileBlobs.get(runId)?.get(hash);
    if (volatile) return volatile;
    const dir = siteRunsDir(root);
    if (!dir) return null;
    const blob = path.join(dir, 'blobs', hash);
    try {
      return fs.readFileSync(blob);
    } catch {
      return null;
    }
  }

  private persist(root: string, run: Run): void {
    const dir = siteRunsDir(root);
    if (!dir) return;
    fs.mkdirSync(dir, { recursive: true });
    const record: PersistedRun = {
      ...run,
      files: run.files.map((file) => ({
        file: file.file,
        status: file.status,
        ownership: file.ownership,
        beforeHash: file.beforeHash,
        afterHash: file.afterHash,
      })),
      unreadable: this.unreadable.get(run.id) ?? [],
    };
    writeFileAtomic(
      path.join(dir, `${run.id}.json`),
      JSON.stringify(record, null, 2),
    );
  }

  private pruneUnusedBlobs(root: string): void {
    const dir = siteRunsDir(root);
    if (!dir) return;
    const blobsDir = path.join(dir, 'blobs');
    if (!fs.existsSync(blobsDir)) return;

    const referenced = new Set<string>();
    for (const snap of this.before.values()) {
      for (const hash of snap.files.values()) referenced.add(hash);
    }

    const undoableRuns = this.runs
      .filter(
        (run) =>
          (run.status === 'finished' || run.status === 'failed') &&
          !run.note.includes('Undone.') &&
          run.files.length > 0,
      )
      .slice(-MAX_UNDOABLE_RUNS);
    for (const run of undoableRuns) {
      for (const file of run.files) {
        if (file.beforeHash) referenced.add(file.beforeHash);
      }
    }

    try {
      for (const entry of fs.readdirSync(blobsDir, { withFileTypes: true })) {
        if (!entry.isFile()) continue;
        if (!referenced.has(entry.name)) {
          fs.rmSync(path.join(blobsDir, entry.name), { force: true });
        }
      }
    } catch (error) {
      console.error('Run backup cleanup failed:', error);
    }
  }
}
