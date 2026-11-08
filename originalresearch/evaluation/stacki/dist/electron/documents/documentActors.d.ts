import { type Digest } from '../../shared/core/brand';
import { type RejectionReason } from '../../shared/engine/intent';
import { type Result } from '../../shared/core/result';
import { type CreateError } from './documentDisk';
import { type WriteReport, type EditReport, type EditBase, type EditStatement, type BuiltEdit, type DocumentActorsOptions, type DiskState, type CurrentError } from './documentReports';
export { type WriteReport, type EditReport, type IntentDraft, type EditBase, type EditStatement, type BuiltEdit, type HostDisk, type DocumentActorsOptions, type DiskState, type CurrentError, } from './documentReports';
/** The app's host: the real disk, the shipping planner, the real parser, and
 * one structured telemetry line per outcome on `log`. */
export declare function createNodeDocumentActors(input: {
    readonly log: (line: string) => void;
    readonly schedule: (task: () => void) => void;
}): DocumentActors;
export declare class DocumentActors {
    #private;
    constructor(options: DocumentActorsOptions);
    /** A program's change to a file's text (plan §3.4; step 10): `text` is what
     * the file should read, computed from the bytes of `baseChecksum`. Written
     * as the hunks where the two differ — a `rewrite-text`, never a whole-file
     * replacement — and only while the file holds exactly those bytes; anything
     * else is refused, never merged. Text that equals the file's is written
     * again unchanged. */
    writeText(file: string, text: string, baseChecksum: Digest): WriteReport;
    /** A visual edit (step 6): `build` states it as an intent against the
     * snapshot the renderer authored it against — the current one, or one the
     * host retained. An edit authored before the actor's own recent commits is
     * rebased through them exactly; one authored before an outside write is
     * submitted with its authored snapshot and mapped through the diff by the
     * planner. Without the authored bytes, it is refused: never guessed. */
    submitEdit(file: string, stated: EditStatement, build: (base: EditBase) => Result<BuiltEdit, RejectionReason>): EditReport;
    /** The bytes on disk now and their checksum, through the file's actor
     * (§5.2 step 1). The bytes are the actor's snapshot: read-only. */
    current(file: string): Result<DiskState, CurrentError>;
    /** Writers that never named a base (the style panel's stylesheet save, a
     * code window, a CMS or asset edit into a page): the base is the file as it
     * is now, so the diff is of those bytes and the actor still refuses to write
     * over bytes that change under it; a missing file is created, never
     * overwritten. */
    writeCurrent(file: string, text: string): WriteReport;
    /** A new document: never overwrites anything (documentDisk.ts). */
    create(file: string, text: string): Result<Digest, CreateError>;
    /** Lease the actors of `items`' files in sorted canonical order and run
     * `run` with the items in that order; every write inside goes through those
     * actors, and no other intent reaches them until `run` returns. */
    withLeases<Item extends {
        readonly file: string;
    }, T>(items: readonly Item[], run: (ordered: readonly Item[]) => T): Result<T, string>;
    /** Whether a watcher tick for `file` is this host hearing its own write
     * (plan §11.9): the file holds exactly the bytes its actor last wrote. One
     * read per tick, no clock — an outside write a millisecond later holds other
     * bytes, and a file gone since holds none. A file whose actor was dropped
     * (LIMITS.documentActorsMax) is answered `false`: the tick is then treated
     * as an outside change, whose one read finds the bytes the app already has. */
    echoes(file: string): boolean;
    /** The watcher saw an outside change (plan §7): a hint, not an authority.
     * The actor re-reads on the next tick, off the next intent's path. */
    noteExternalChange(file: string): void;
    /** Step every queued intent to its outcome (the deferred mode's drain). */
    drain(): void;
    /** Whether no actor holds an intent: nothing queued, nothing in flight. */
    quiescent(): boolean;
    /** Forget every actor (the project closed). Only snapshots are dropped. */
    clear(): void;
    actorCount(): number;
    /** Submit an intent without stepping it: the deferred mode's entry point. */
    submitDeferred(file: string, text: string, baseChecksum: Digest): 'accepted' | 'backpressured';
}
