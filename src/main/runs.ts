import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import electron from 'electron';

/**
 * An agent job, kept reviewable: which files it changed, and the ability to put
 * all of them back in one step (plan 2.2).
 *
 * Every file is read as raw bytes so images, fonts and other binary assets are
 * part of the run too. A file that cannot be read is recorded, never treated as
 * unchanged: undo refuses rather than guessing.
 */

export type RunFile = {
  file: string;
  status: 'added' | 'changed' | 'removed';
  /** `run` means the agent's; `uncertain` means undo must refuse it. */
  ownership: 'run' | 'outside' | 'uncertain';
  before: Buffer | null;
  after: Buffer | null;
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
  highlighted: Array<{
    file: string;
    loc: string;
    text: string;
    label: string;
    removed?: boolean;
  }>;
};

export type UndoResult =
  | { ok: true }
  | {
      ok: false;
      problem: string;
      clashes: string[];
      uncertain: string[];
    };

const SKIP = new Set(['node_modules', 'dist', '.git', '.astro', '.vercel']);

const hashBytes = (value: Buffer): string =>
  crypto.createHash('sha256').update(value).digest('hex');

type Snapshot = { files: Map<string, Buffer>; problems: string[] };

/** Every file except the skipped folders, as bytes, plus the ones we could not read. */
export function snapshot(root: string): Snapshot {
  const files = new Map<string, Buffer>();
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
        files.set(path.relative(root, full), fs.readFileSync(full));
      } catch {
        problems.push(path.relative(root, full));
      }
    }
  };
  walk(root);
  return { files, problems };
}

export class Runs {
  private runs: Run[] = [];
  private before = new Map<
    string,
    { files: Map<string, Buffer>; problems: string[] }
  >();
  /** Where each run's site lives, so a later status change can be saved too. */
  private roots = new Map<string, string>();
  /** Unreadable paths recorded during snapshot diffing, kept distinct from build diagnostics. */
  private unreadable = new Map<string, string[]>();

  start(root: string, tool: string, prompt: string): Run {
    const run: Run = {
      id: `run-${Date.now()}`,
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
    };
    this.before.set(run.id, snapshot(root));
    this.roots.set(run.id, root);
    this.runs.push(run);
    return run;
  }

  /**
   * Diffs the site against the start of the run. `outside` lists files that
   * Cauldron's own editor wrote during the run: those are not the agent's work,
   * so undo leaves them alone. A file an outside writer touched and then someone
   * else changed again cannot be attributed and becomes `uncertain`.
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

    const after = snapshot(root);
    const relative = (file: string) =>
      path.isAbsolute(file) ? path.relative(root, file) : file;
    const claimed = options.claimed
      ? new Set(options.claimed.map(relative))
      : null;
    // For each file: the version the editor first started from, and its last write.
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
    for (const name of names) {
      const was = before.files.get(name) ?? null;
      const now = after.files.get(name) ?? null;
      const wasHash = was === null ? null : hashBytes(was);
      const nowHash = now === null ? null : hashBytes(now);
      if (wasHash === nowHash && now !== null) continue;
      const unreadable =
        before.problems.includes(name) || after.problems.includes(name);
      const other = outside.get(name);
      // The editor's write is only the person's own when it started from the
      // file as the run found it and nothing changed it afterwards; otherwise
      // the run and the person both wrote it, and undo must refuse.
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
      changed.push({
        file: name,
        status:
          wasHash === null ? 'added' : nowHash === null ? 'removed' : 'changed',
        ownership,
        before: was,
        after: now,
        beforeHash: wasHash,
        afterHash: nowHash,
      });
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
    return run;
  }

  fail(id: string, note: string): void {
    const run = this.runs.find((item) => item.id === id);
    if (!run) return;
    run.status = 'failed';
    run.finishedAt = Date.now();
    run.note = note;
    // A run is diffed and saved as finished before its final event is known
    // (finishAgentRun). Saving again here is what keeps the record the person
    // reads — and the history on disk — from reporting a failed job as success.
    const root = this.roots.get(id);
    if (root) this.persist(root, run);
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

  setHighlighted(
    id: string,
    highlighted: Array<{
      file: string;
      loc: string;
      text: string;
      label: string;
      removed?: boolean;
    }>,
  ): void {
    const run = this.runs.find((item) => item.id === id);
    if (run) run.highlighted = highlighted;
  }

  get(id: string): Run | null {
    return this.runs.find((item) => item.id === id) ?? null;
  }

  list(): Run[] {
    return [...this.runs].reverse();
  }

  /**
   * Puts every change back, but only if all of them are still exactly as the run
   * left them and each one is known to be the run's own work. Every file is
   * checked before any is written, so a refusal never leaves a partial undo.
   */
  undo(root: string, id: string): UndoResult {
    const run = this.runs.find((item) => item.id === id);
    if (!run)
      return {
        ok: false,
        problem: 'That run is not known.',
        clashes: [],
        uncertain: [],
      };
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
    const current = new Map<string, Buffer | null>();
    for (const change of run.files) {
      const full = path.join(root, change.file);
      let bytes: Buffer | null = null;
      try {
        bytes = fs.readFileSync(full);
      } catch {
        bytes = null;
      }
      current.set(change.file, bytes);
      const hash = bytes === null ? null : hashBytes(bytes);
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

    for (const change of run.files) {
      const full = path.join(root, change.file);
      if (change.before === null) fs.rmSync(full, { force: true });
      else {
        fs.mkdirSync(path.dirname(full), { recursive: true });
        fs.writeFileSync(full, change.before);
      }
    }

    run.note = `${run.note} Undone.`;
    this.persist(root, run);
    return { ok: true };
  }

  private persist(root: string, run: Run): void {
    // Outside Electron (the deterministic test harness) there is nowhere to keep
    // the record; undo inside a session does not need it.
    const api = electron as unknown as {
      app?: { getPath(name: string): string };
      default?: { app?: { getPath(name: string): string } };
    };
    const app = api.app ?? api.default?.app;
    if (!app) return;
    const dir = path.join(
      app.getPath('userData'),
      'runs',
      hashBytes(Buffer.from(root)).slice(0, 12),
    );
    fs.mkdirSync(dir, { recursive: true });
    const { files, ...rest } = run;
    fs.writeFileSync(
      path.join(dir, `${run.id}.json`),
      JSON.stringify(
        {
          ...rest,
          files: files.map((file) => ({
            file: file.file,
            status: file.status,
            ownership: file.ownership,
            beforeHash: file.beforeHash,
            afterHash: file.afterHash,
          })),
        },
        null,
        2,
      ),
      'utf8',
    );
  }
}
