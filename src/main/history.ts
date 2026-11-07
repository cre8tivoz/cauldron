import { readFile, writeFileAtomic } from './files';
import type { EditOperation, Location } from './edit';

export type Change = {
  id: number;
  file: string;
  location: Location;
  operation: EditOperation;
  before: string;
  after: string;
  beforeHash: string;
  afterHash: string;
  label: string;
  at: number;
  runId?: string;
};

export type HistoryState = { canUndo: boolean; canRedo: boolean };

/**
 * One history for everything that writes a file, so Undo means the same thing
 * whether the change came from the inspector, a page action or (later) an agent run.
 */
/** Reapply a single surgical change only when its original context is unambiguous. */
function mergeRegion(
  base: string,
  wanted: string,
  disk: string,
): string | null {
  if (disk === base) return wanted;
  let start = 0;
  while (
    start < base.length &&
    start < wanted.length &&
    base[start] === wanted[start]
  )
    start++;
  let end = base.length;
  let wantedEnd = wanted.length;
  while (
    end > start &&
    wantedEnd > start &&
    base[end - 1] === wanted[wantedEnd - 1]
  ) {
    end--;
    wantedEnd--;
  }
  const left = base.slice(Math.max(0, start - 80), start);
  const right = base.slice(end, end + 80);
  const region = left + base.slice(start, end) + right;
  if (!region) return null;
  const at = disk.indexOf(region);
  if (at < 0 || disk.indexOf(region, at + 1) >= 0) return null;
  return (
    disk.slice(0, at + left.length) +
    wanted.slice(start, wantedEnd) +
    disk.slice(at + left.length + end - start)
  );
}

export class History {
  private changes: Change[] = [];
  private cursor = 0;
  private nextId = 1;

  record(change: Omit<Change, 'id' | 'at'>): Change {
    const entry: Change = { ...change, id: this.nextId, at: Date.now() };
    this.nextId += 1;
    this.changes = this.changes.slice(0, this.cursor);
    this.changes.push(entry);
    this.cursor = this.changes.length;
    return entry;
  }

  state(): HistoryState {
    return {
      canUndo: this.cursor > 0,
      canRedo: this.cursor < this.changes.length,
    };
  }

  /** Returns the change to invert, or a conflict when the file moved on since. */
  undo(): { change: Change; diskText: string } | { problem: string } {
    const change = this.changes[this.cursor - 1];
    if (!change) return { problem: 'There is nothing to undo.' };
    let disk;
    try {
      disk = readFile(change.file);
    } catch {
      return { problem: 'The file being undone no longer exists.' };
    }
    const restored = mergeRegion(change.after, change.before, disk.text);
    if (restored === null) {
      return {
        problem:
          'That change cannot be undone because the file has changed since. Nothing was overwritten.',
      };
    }
    writeFileAtomic(change.file, restored);
    this.cursor -= 1;
    return { change, diskText: restored };
  }

  redo(): { change: Change } | { problem: string } {
    const change = this.changes[this.cursor];
    if (!change) return { problem: 'There is nothing to redo.' };
    let disk;
    try {
      disk = readFile(change.file);
    } catch {
      return { problem: 'The file being redone no longer exists.' };
    }
    const restored = mergeRegion(change.before, change.after, disk.text);
    if (restored === null) {
      return {
        problem:
          'That change cannot be redone because the file has changed since. Nothing was overwritten.',
      };
    }
    writeFileAtomic(change.file, restored);
    this.cursor += 1;
    return { change };
  }

  list(): Change[] {
    return this.changes.slice(0, this.cursor);
  }

  /** Writes this history made since a moment, excluding work a run did itself. */
  writtenSince(
    at: number,
  ): Array<{ file: string; beforeHash: string; afterHash: string }> {
    return this.changes
      .filter((change) => change.at >= at && !change.runId)
      .map((change) => ({
        file: change.file,
        beforeHash: change.beforeHash,
        afterHash: change.afterHash,
      }));
  }
}
