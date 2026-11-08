import type { Digest, FilePath } from '../core/brand';
import type { Intent, Outcome, RejectionReason, SubmissionResult } from './intent';
import type { Plan, PlanningBase } from './planner';
import { type Result } from '../core/result';
import type { Snapshot } from '../page/snapshot';
import type { ByteString } from '../core/span';
/** Why a disk call failed. `message` is for the user's notice only: it may name
 * paths, so telemetry never logs it (plan §9a). */
export interface DiskError {
    readonly code: 'missing' | 'failed';
    readonly message: string;
}
export interface DiskRead {
    readonly bytes: ByteString;
    /** An observation stamp, monotonic per disk: a later read of a file never
     * carries a smaller one. The simulator's fake disk stamps each write; the
     * real disk counts its own reads. Invariant 7 is checked against it. */
    readonly generation: number;
}
/** A held advisory lock, returned only by `lock` and consumed by `unlock`. */
export interface DiskLock {
    readonly path: FilePath;
    readonly token: string;
}
export type LockError = {
    readonly code: 'held';
    readonly message: string;
} | {
    readonly code: 'failed';
    readonly message: string;
};
/** A replace either left the target untouched (`failed`) or replaced it and
 * cannot promise the replacement survives a power loss (`not-durable`: the
 * directory could not be flushed). The second is the crash window of plan
 * §3.5 made visible, so it reaches the caller as `uncertain`. */
export type ReplaceError = {
    readonly code: 'failed';
    readonly message: string;
} | {
    readonly code: 'not-durable';
    readonly message: string;
};
export interface DocumentDisk {
    read(path: FilePath): Result<DiskRead, DiskError>;
    /** Advisory, and only against cooperating writers (the honest limit above). */
    lock(path: FilePath): Result<DiskLock, LockError>;
    unlock(lock: DiskLock): Result<void, DiskError>;
    /** Atomic replace: readers see the old bytes or the new ones, never a mix. */
    replace(path: FilePath, bytes: ByteString): Result<void, ReplaceError>;
}
export type Planner = (base: PlanningBase, intent: Intent) => Result<Plan, RejectionReason>;
/** Bytes → snapshots, through the real parser. Injected because the parser
 * lives in electron/ and SHA-256 in `node:crypto`, neither of which shared/ may
 * import (the renderer loads shared/ too). */
export interface Projector {
    hash(bytes: ByteString): Digest;
    snapshot(path: FilePath, bytes: ByteString): Snapshot;
    /** The candidate after `plan` applied to `base` gives `bytes`. May derive the
     * projection from the base (shared/engine/projectionPatch.ts) instead of parsing. */
    candidate(path: FilePath, base: Snapshot, plan: Plan, bytes: ByteString): Snapshot;
}
export interface ActorDependencies {
    readonly disk: DocumentDisk;
    readonly planner: Planner;
    readonly projector: Projector;
}
/** A queued intent, and the snapshot it was authored against when the client
 * holds one. The renderer holds only a checksum; the simulator (and, from step
 * 6, visual gestures) may send the bytes so a stale intent can be mapped. When
 * absent, the actor's current snapshot serves if its checksum is the authored
 * one; otherwise the authored bytes are gone and the intent rejects (the
 * `lastKnownBytes` decision, tracker open questions). */
export interface Submission {
    readonly intent: Intent;
    readonly authored: Snapshot | undefined;
}
/** An intent between planning and commit, with everything the next step needs. */
export interface InFlight {
    readonly intent: Intent;
    readonly base: Snapshot;
    readonly plan: Plan;
    readonly candidate: Snapshot;
}
export type ActorPhase = {
    readonly tag: 'idle';
} | ({
    readonly tag: 'planned';
} & InFlight) | ({
    readonly tag: 'written';
    readonly lock: DiskLock;
} & InFlight);
/** The watcher is a hint (plan §2): it only says "read again before trusting". */
export type WatcherHint = 'clean' | 'dirty';
export interface ActorState {
    readonly path: FilePath;
    readonly snapshot: Snapshot | undefined;
    /** Disk observation stamp the snapshot was read at. */
    readonly generation: number;
    readonly queue: readonly Submission[];
    readonly phase: ActorPhase;
    readonly hint: WatcherHint;
}
export type ActorEffect = {
    readonly tag: 'outcome';
    readonly outcome: Outcome;
} | ({
    readonly tag: 'committed';
    readonly previousGeneration: number;
    readonly generation: number;
} & InFlight) | {
    readonly tag: 'refreshed';
    readonly previousGeneration: number;
    readonly generation: number;
}
/** Why a disk call failed, for the rejection notice; never logged. */
 | {
    readonly tag: 'disk-error';
    readonly intentId: Intent['id'];
    readonly message: string;
}
/** The lock could not be released. The real disk breaks a lock whose owner is
 * gone, so this costs cooperating writers a `write-race`, never a deadlock. */
 | {
    readonly tag: 'lock-leaked';
    readonly path: FilePath;
};
export interface ActorStep {
    readonly state: ActorState;
    readonly effects: readonly ActorEffect[];
    /** Parses this step ran — bounded by LIMITS.parseTasksInFlightMax. */
    readonly parses: number;
}
export declare function createActor(path: FilePath): ActorState;
/** Accept the intent or push back: a full queue is backpressure, not rejection,
 * and never a silent drop — the caller still holds the draft (plan §3.5). */
export declare function submitIntent(state: ActorState, submission: Submission): {
    readonly state: ActorState;
    readonly result: SubmissionResult;
};
/** Whether a step would do anything: in-flight work, queued work, or a hint. */
export declare function actorHasWork(state: ActorState): boolean;
/** Whether the actor holds no intent at all: nothing queued, nothing in flight. */
export declare function actorQuiescent(state: ActorState): boolean;
export declare function markDirty(state: ActorState): ActorState;
export declare function stepActor(state: ActorState, dependencies: ActorDependencies): ActorStep;
/** Re-read the file now (§5.2 step 1, and the watcher tick of §7: one read and
 * at most one parse). Only an idle actor refreshes; a failed read changes
 * nothing and is returned, so the caller can tell a missing file apart. */
export declare function refreshActor(state: ActorState, dependencies: ActorDependencies): Result<ActorStep, DiskError>;
/** A crash (plan §3.5): the in-flight intent becomes `uncertain` with its
 * candidate checksum; queued intents were never planned and become `uncertain`
 * without one. The restarted actor knows nothing and re-reads from disk. A
 * lock held by the crashed actor is not released here — the disk recovers a
 * lock whose owner is gone. */
export declare function crashActor(state: ActorState): ActorStep;
export type Reconciliation = 'applied' | 'not-applied' | 'changed-again';
/** Resolve an `uncertain` outcome by comparison, not by guess (plan §3.5): the
 * file now holds the candidate (applied), still holds the base the intent was
 * planned against — for an unmapped intent, its authored bytes — (not applied),
 * or holds something else, a missing file included, and a person must review
 * it. No intent journal is needed; the candidate checksum is the token that
 * names the crash window. */
export declare function reconcileUncertain(input: {
    readonly baseChecksum: Digest;
    readonly candidateChecksum: Digest | undefined;
    readonly currentChecksum: Digest | undefined;
}): Reconciliation;
/** The bytes `plan` leaves on `base`, checked as a write would check them
 * (§5.2 steps 4–6): within the splice and size bounds, every witness still on
 * `base`, and, where the plan says so, a candidate that parses with its targets'
 * kinds intact. The actor's step and a batch planned in memory
 * (electron/documents/editPreview.ts) share it, so a batch is held to exactly
 * what each of its edits would be held to alone. `parses` counts the parse a
 * refusal cost. */
export declare function candidateOf(path: FilePath, base: Snapshot, plan: Plan, projector: Pick<ActorDependencies['projector'], 'candidate'>): Result<Snapshot, {
    readonly reason: RejectionReason;
    readonly parses: 0 | 1;
}>;
