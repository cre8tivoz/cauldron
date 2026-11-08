import type { ComponentProperties, PropertyChange } from '../../shared/properties/propertyEditing';
import { type Result } from '../../shared/core/result';
import type { DocumentActors } from '../documents/documentActors';
interface PropertyLocation {
    readonly projectPath: string;
    readonly file: string;
}
interface PropertyEditRequest extends PropertyLocation {
    readonly source: string;
    readonly change: PropertyChange;
}
export interface FileChange {
    readonly file: string;
    readonly before: string;
    readonly after: string;
}
/** Where a batch writes: the document actors, and the note that the app
 * wrote a file (the canvas may need to hear of it). The watcher tells the
 * app's own writes from outside ones by the actors' committed bytes (plan
 * §11.9). `onCommitted` hears every batch that applied, with what it changed
 * (step 6: its inverse batch is Undo). */
export interface PropertyWriter {
    readonly documents: DocumentActors;
    readonly noteWrite: (file: string) => void;
    readonly onCommitted?: (changes: readonly FileChange[]) => void;
}
/** A batch's inverse (plan §3.3, §11 step 6): each file back from what the
 * batch wrote to what it replaced. Applied as a batch of its own — every file
 * checked against the bytes the batch left before any is written, the checked
 * rollback on a failure — so a file changed since refuses the whole undo,
 * naming it, and a half-undone rename cannot happen. */
export declare function inverseBatch(changes: readonly FileChange[]): readonly FileChange[];
/** Inverse batches waiting for Undo, kept in main so the renderer holds a
 * token, never a writable batch: the channel that applies one can write only
 * what a property edit wrote. Bounded by LIMITS.undoEntriesMax, oldest first
 * out; an expired token is refused. */
export declare class PropertyUndoStore {
    #private;
    record(changes: readonly FileChange[]): string;
    take(token: string): readonly FileChange[] | undefined;
}
/** Apply a recorded inverse batch; the batch undoing it is recorded in turn
 * (Redo), and its token returned. */
export declare function revertComponentProperties(token: string, store: PropertyUndoStore, writer: PropertyWriter): Result<{
    readonly undo: string;
}>;
export declare function loadComponentProperties(location: PropertyLocation): Result<ComponentProperties>;
export declare function updateComponentProperties(request: PropertyEditRequest, writer: PropertyWriter): Result<ComponentProperties>;
export {};
