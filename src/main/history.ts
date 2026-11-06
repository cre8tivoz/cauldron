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
    if (disk.hash !== change.afterHash) {
      return {
        problem:
          'That change cannot be undone because the file has changed since. Nothing was overwritten.',
      };
    }
    writeFileAtomic(change.file, change.before);
    this.cursor -= 1;
    return { change, diskText: change.before };
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
    if (disk.hash !== change.beforeHash) {
      return {
        problem:
          'That change cannot be redone because the file has changed since. Nothing was overwritten.',
      };
    }
    writeFileAtomic(change.file, change.after);
    this.cursor += 1;
    return { change };
  }

  list(): Change[] {
    return this.changes.slice(0, this.cursor);
  }
}
