import fs from 'node:fs';
import path from 'node:path';
import { app } from 'electron';
import { hashOf } from './files';

/**
 * An agent job, kept reviewable: which files it changed, and the ability to put
 * all of them back in one step (plan 2.2).
 */

export type RunFile = {
  file: string;
  before: string | null;
  after: string | null;
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
  note: string;
  highlighted: Array<{ loc: string; text: string }>;
};

const TEXT_FILE = /\.(astro|md|mdx|html|css|js|mjs|ts|json|svg|yml|yaml)$/i;
const SKIP = new Set(['node_modules', 'dist', '.git', '.astro', '.vercel']);

function snapshot(root: string): Map<string, string> {
  const files = new Map<string, string>();
  const walk = (dir: string) => {
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (SKIP.has(entry.name)) continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
        continue;
      }
      if (!TEXT_FILE.test(entry.name)) continue;
      try {
        const stat = fs.statSync(full);
        if (stat.size > 1024 * 1024) continue;
        files.set(path.relative(root, full), fs.readFileSync(full, 'utf8'));
      } catch {
        // A file that vanished mid-scan is simply not part of the snapshot.
      }
    }
  };
  walk(root);
  return files;
}

export class Runs {
  private runs: Run[] = [];
  private before = new Map<string, Map<string, string>>();

  start(root: string, tool: string, prompt: string): Run {
    const run: Run = {
      id: `run-${Date.now()}`,
      tool,
      prompt,
      startedAt: Date.now(),
      finishedAt: null,
      status: 'running',
      files: [],
      note: '',
      highlighted: [],
    };
    this.before.set(run.id, snapshot(root));
    this.runs.push(run);
    return run;
  }

  finish(root: string, id: string): Run | null {
    const run = this.runs.find((item) => item.id === id);
    const before = this.before.get(id);
    if (!run || !before) return null;

    const after = snapshot(root);
    const changed: RunFile[] = [];
    const names = new Set([...before.keys(), ...after.keys()]);
    for (const name of names) {
      const was = before.get(name) ?? null;
      const now = after.get(name) ?? null;
      if (was === now) continue;
      changed.push({
        file: name,
        before: was,
        after: now,
        beforeHash: was === null ? null : hashOf(was),
        afterHash: now === null ? null : hashOf(now),
      });
    }

    run.files = changed.sort((a, b) => a.file.localeCompare(b.file));
    run.finishedAt = Date.now();
    run.status = 'finished';
    run.note =
      changed.length === 0
        ? 'No files changed.'
        : `${changed.length} file${changed.length === 1 ? '' : 's'} changed.`;
    this.persist(root, run);
    return run;
  }

  fail(id: string, note: string): void {
    const run = this.runs.find((item) => item.id === id);
    if (!run) return;
    run.status = 'failed';
    run.finishedAt = Date.now();
    run.note = note;
  }

  setHighlighted(id: string, highlighted: Array<{ loc: string; text: string }>): void {
    const run = this.runs.find((item) => item.id === id);
    if (run) run.highlighted = highlighted;
  }

  get(id: string): Run | null {
    return this.runs.find((item) => item.id === id) ?? null;
  }

  list(): Run[] {
    return [...this.runs].reverse();
  }

  /** Puts every changed file back, but only if nothing else has touched them since. */
  undo(
    root: string,
    id: string,
  ): { ok: true } | { ok: false; problem: string; clashes: string[] } {
    const run = this.runs.find((item) => item.id === id);
    if (!run) return { ok: false, problem: 'That run is not known.', clashes: [] };
    if (run.status === 'running') {
      return { ok: false, problem: 'That run has not finished yet.', clashes: [] };
    }

    const clashes: string[] = [];
    for (const change of run.files) {
      const full = path.join(root, change.file);
      let current: string | null = null;
      try {
        current = fs.readFileSync(full, 'utf8');
      } catch {
        current = null;
      }
      const currentHash = current === null ? null : hashOf(current);
      if (currentHash !== change.afterHash) clashes.push(change.file);
    }

    if (clashes.length > 0) {
      return {
        ok: false,
        problem: 'These files changed after the run, so nothing was touched:',
        clashes,
      };
    }

    for (const change of run.files) {
      const full = path.join(root, change.file);
      if (change.before === null) fs.rmSync(full, { force: true });
      else {
        fs.mkdirSync(path.dirname(full), { recursive: true });
        fs.writeFileSync(full, change.before, 'utf8');
      }
    }

    run.note = `${run.note} Undone.`;
    this.persist(root, run);
    return { ok: true };
  }

  private persist(root: string, run: Run): void {
    const dir = path.join(app.getPath('userData'), 'runs', hashOf(root).slice(0, 12));
    fs.mkdirSync(dir, { recursive: true });
    const { files, ...rest } = run;
    fs.writeFileSync(
      path.join(dir, `${run.id}.json`),
      JSON.stringify({ ...rest, files: files.map((file) => file.file) }, null, 2),
      'utf8',
    );
  }
}
