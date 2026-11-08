import type { AttributeValue, Intent, RejectionReason } from './intent';
import type { NodeKind, StructuralPath } from '../page/ref';
import { type Result } from '../core/result';
import type { Snapshot } from '../page/snapshot';
import { type ByteSpan, type ByteString } from '../core/span';
/** The only write primitive (plan §3.4): replace `range` with
 * `replacementBytes`, but only while it still holds `expectedBytes`. An
 * insertion is a zero-width range: its identity was proven by resolving the
 * node it sits beside, and the actor re-verifies the whole file under its lock.
 * Keeping insertions zero-width keeps every other span outside them, so the
 * inverse is exact and later rebases never have to cut through a neighbour. */
export interface Splice {
    readonly range: ByteSpan;
    readonly expectedBytes: ByteString;
    readonly replacementBytes: ByteString;
}
export interface PostKind {
    readonly path: StructuralPath;
    readonly kind: NodeKind;
}
/** What the candidate must satisfy after the splices apply (plan §5.2 step 6).
 * Visual intents need a parsing candidate; the code editor and the legacy save
 * may write invalid bytes (plan §3.6). */
export type CandidatePolicy = 'must-parse' | 'may-be-invalid';
export interface Plan {
    readonly splices: readonly Splice[];
    /** An unchanged subtree explicitly moved by this plan, in before/after coordinates.
     * Keeping its provenance lets queued edits follow it without matching lookalikes. */
    readonly relocation?: ByteRelocation | undefined;
    /** Nodes that must keep their kind in the candidate, in its own paths. */
    readonly postKinds: readonly PostKind[];
    readonly candidate: CandidatePolicy;
}
export interface ByteRelocation {
    readonly source: ByteSpan;
    readonly target: ByteSpan;
}
export interface PlanningBase {
    /** The snapshot the intent was authored against: its checksum is the
     * intent's `authoredChecksum`. */
    readonly authored: Snapshot;
    /** The snapshot of the bytes on disk now (plan §5.2 step 1). */
    readonly current: Snapshot;
}
/** Plan an intent. When nothing changed since it was authored, the mapping is
 * the identity and no diff runs — the fast path; `planIntentThroughDiff` is its
 * brute-force reference and must agree with it (plan §10). */
export declare function planIntent(base: PlanningBase, intent: Intent): Result<Plan, RejectionReason>;
/** The same planner with every span mapped through a computed diff, even an
 * empty one. The actor calls `planIntent`; tests call this to hold the
 * identity fast path to it. */
export declare function planIntentThroughDiff(base: PlanningBase, intent: Intent): Result<Plan, RejectionReason>;
/** How an attribute is written: the legacy serializer's form (astroParser.ts,
 * serializeAttrs), except that a value holding a double quote but no single
 * one is single-quoted — the parser reads it back exactly, where `&quot;`
 * reads back as those six characters. */
export declare function attributeText(name: string, value: AttributeValue): string;
export declare function spliceAt(bytes: ByteString, range: ByteSpan, replacement: string): Splice;
