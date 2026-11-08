import { type Digest } from '../../shared/core/brand';
import { type ActorEffect, type ActorState } from '../../shared/engine/documentActor';
import { type Outcome, type RejectionReason, type SourceEdit } from '../../shared/engine/intent';
import { type CommitRecord } from '../../shared/engine/rebase';
import type { Snapshot } from '../../shared/page/snapshot';
import { type Result } from '../../shared/core/result';
import { type ByteString } from '../../shared/core/span';
import { type CanonicalDocument } from './documentDisk';
import { type EditBase } from './documentReports';
export declare class Entry {
    #private;
    readonly document: CanonicalDocument;
    constructor(document: CanonicalDocument, state: ActorState, used: number);
    get state(): ActorState;
    /** The host clock when the actor was last used, for least-recently-used eviction. */
    get used(): number;
    /** Snapshots the actor held before its current one, newest last, bounded by
     * LIMITS.authoredSnapshotsMax: the bytes an edit may have been authored
     * against when an outside write replaced them since (step 6). */
    get retained(): readonly Snapshot[];
    /** The actor's recent commits, oldest first, bounded by
     * LIMITS.commitLogEntriesMax: an edit authored before them rebases exactly. */
    get log(): readonly CommitRecord[];
    /** The checksum of the bytes this actor last wrote, created or committed;
     * undefined until it writes. A watcher tick asks it (plan §11.9). */
    get written(): Digest | undefined;
    setState(next: ActorState): void;
    touch(clock: number): void;
    setRetained(retained: readonly Snapshot[]): void;
    recordCreate(checksum: Digest): void;
    recordCommit(record: CommitRecord): void;
}
/** An outcome with what the host learned beside it. */
export interface Settled {
    readonly outcome: Outcome;
    readonly message: string;
    /** The applied intent's splices, from its commit. */
    readonly committed: Extract<ActorEffect, {
        tag: 'committed';
    }> | undefined;
}
/** Steps one intent can take: idle → planned → written → idle. */
export declare const STEPS_PER_INTENT = 3;
/** What a program's rewrite writes: the text the file should read, and the
 * checksum of the bytes it was computed from. */
export interface Rewrite {
    readonly text: string;
    readonly baseChecksum: Digest;
}
export declare const UNCHANGED: readonly SourceEdit[];
export declare function rewriteHunks(bytes: ByteString, text: string): Result<readonly SourceEdit[], RejectionReason>;
export declare function editHistory(authored: Snapshot, current: Snapshot, chain: readonly CommitRecord[] | undefined): EditBase['history'];
export declare function entryBytes(entry: Entry): number;
export declare function compareKeys(left: string, right: string): number;
