import { type Intent, type RejectionReason } from './intent';
import type { ByteRelocation, Splice } from './planner';
import { type Result } from '../core/result';
import type { Snapshot } from '../page/snapshot';
import { type ByteSpan } from '../core/span';
/** One commit an actor made: the bytes it started from, the bytes it left,
 * and the splices between them. */
export interface CommitRecord {
    readonly from: Snapshot['checksum'];
    readonly to: Snapshot['checksum'];
    readonly splices: readonly Splice[];
    readonly relocation?: ByteRelocation | undefined;
}
/** The commits leading from `authored` to `current`, oldest first, when the
 * log holds an unbroken chain; undefined otherwise. */
export declare function commitChain(log: readonly CommitRecord[], authored: Snapshot['checksum'], current: Snapshot['checksum']): readonly CommitRecord[] | undefined;
/** The same edit as the fewest bytes: each splice without the prefix and
 * suffix its witness and replacement share, so a commit that rewrote a region
 * with much of it unchanged is the region it really changed, and an edit
 * authored before it still rebases through it. The result writes the same
 * bytes. */
export declare function minimalSplices(splices: readonly Splice[]): readonly Splice[];
/** The image of `span` after `splices`, or undefined when one cuts through it. */
export declare function rebaseSpan(span: ByteSpan, splices: readonly Splice[]): ByteSpan | undefined;
/** `intent`, authored against the first commit's `from`, restated against
 * `current`, the last commit's `to`. */
export declare function rebaseIntent(intent: Intent, chain: readonly CommitRecord[], current: Snapshot): Result<Intent, RejectionReason>;
/** The image of `span` after `splices` that changed none of its bytes and
 * none at its edges; undefined when one did. A code patch's hunk replaces the
 * bytes it was authored against: a commit inside it changed those bytes, and
 * one at its edge cannot be ordered against it (shared/engine/codePatch.ts). */
export declare function shiftUntouched(span: ByteSpan, splices: readonly Splice[]): ByteSpan | undefined;
