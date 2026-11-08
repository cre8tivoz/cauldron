import type { SourceEdit } from './intent';
import type { Splice } from './planner';
import { type ByteSpan, type ByteString } from '../core/span';
/** Whether every splice's range holds its expected bytes (plan §5.2 step 4). */
export declare function witnessesHold(bytes: ByteString, splices: readonly Splice[]): boolean;
/** Splices sorted by start, checked disjoint. Overlapping splices would make the
 * result depend on application order — a planner bug, so it asserts. */
export declare function orderedSplices(splices: readonly Splice[]): readonly Splice[];
/** Apply splices in memory (plan §5.2 step 5). Witnesses were verified by the
 * caller; they are asserted again here, the pair on the other side.
 *
 * The plan says "descending offset": applied in place, a later splice must land
 * first so earlier offsets do not shift. This builds a new buffer instead, by
 * copying the untouched gaps between ascending, disjoint ranges of the original
 * — no offset ever shifts, so the result is the descending in-place result. */
export declare function applySplices(bytes: ByteString, splices: readonly Splice[]): ByteString;
/** Where each splice's replacement landed in the result, ascending. */
export declare function changedRanges(splices: readonly Splice[]): readonly ByteSpan[];
/** The inverse of applied splices (plan §11 step 6, Undo on the engine): in
 * the bytes they produced, each changed range goes back to the bytes it
 * replaced. Same ranges, expected and replacement swapped — submitted as a
 * `revert-splices` intent authored against the post-apply checksum, whose
 * planner reads the witness (the replacement bytes) off that snapshot. */
export declare function inverseEdits(splices: readonly Splice[]): readonly SourceEdit[];
