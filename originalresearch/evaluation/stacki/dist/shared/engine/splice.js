"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.witnessesHold = witnessesHold;
exports.orderedSplices = orderedSplices;
exports.applySplices = applySplices;
exports.changedRanges = changedRanges;
exports.inverseEdits = inverseEdits;
// Applying splices, the only write primitive (plan §3.4). The expected bytes are
// the witness: a splice applies only where its range still holds exactly the
// bytes the plan saw. Promoted from the simulator at step 5, so the document
// actor and the simulator apply splices through one implementation.
//
// Pure: bytes in, bytes out. Nothing here touches a disk or a clock.
const assert_1 = require("../core/assert");
const limits_1 = require("../core/limits");
const span_1 = require("../core/span");
/** Whether every splice's range holds its expected bytes (plan §5.2 step 4). */
function witnessesHold(bytes, splices) {
    (0, assert_1.assert)(splices.length <= limits_1.LIMITS.splicesPerIntentMax, 'Splice count is inside its bound');
    return splices.every((splice) => {
        if (splice.range.end <= bytes.length) {
            const found = (0, span_1.toByteString)(bytes.subarray(splice.range.start, splice.range.end));
            return (0, span_1.byteStringsEqual)(found, splice.expectedBytes);
        }
        return false;
    });
}
/** Splices sorted by start, checked disjoint. Overlapping splices would make the
 * result depend on application order — a planner bug, so it asserts. */
function orderedSplices(splices) {
    (0, assert_1.assert)(splices.length <= limits_1.LIMITS.splicesPerIntentMax, 'Splice count is inside its bound');
    const ordered = [...splices].sort((left, right) => left.range.start - right.range.start);
    for (let index = 1; index < ordered.length; index++) {
        const previous = ordered[index - 1];
        const current = ordered[index];
        (0, assert_1.assert)(previous !== undefined, 'Previous splice exists');
        (0, assert_1.assert)(current !== undefined, 'Current splice exists');
        (0, assert_1.assert)(previous.range.end <= current.range.start, 'Splices do not overlap');
    }
    return ordered;
}
/** Apply splices in memory (plan §5.2 step 5). Witnesses were verified by the
 * caller; they are asserted again here, the pair on the other side.
 *
 * The plan says "descending offset": applied in place, a later splice must land
 * first so earlier offsets do not shift. This builds a new buffer instead, by
 * copying the untouched gaps between ascending, disjoint ranges of the original
 * — no offset ever shifts, so the result is the descending in-place result. */
function applySplices(bytes, splices) {
    (0, assert_1.assert)(witnessesHold(bytes, splices), 'Every witness holds at apply time');
    const ordered = orderedSplices(splices);
    const size = bytes.length + sizeDelta(ordered);
    (0, assert_1.assert)(size >= 0, 'A result has a nonnegative size');
    const result = new Uint8Array(size);
    let cursorSource = 0;
    let cursorTarget = 0;
    for (const splice of ordered) {
        const gap = bytes.subarray(cursorSource, splice.range.start);
        result.set(gap, cursorTarget);
        cursorTarget += gap.length;
        result.set(splice.replacementBytes, cursorTarget);
        cursorTarget += splice.replacementBytes.length;
        cursorSource = splice.range.end;
    }
    result.set(bytes.subarray(cursorSource), cursorTarget);
    (0, assert_1.assert)(cursorTarget + bytes.length - cursorSource === size, 'The result is exactly filled');
    return (0, span_1.toByteString)(result);
}
/** Where each splice's replacement landed in the result, ascending. */
function changedRanges(splices) {
    let delta = 0;
    return orderedSplices(splices).map((splice) => {
        const start = splice.range.start + delta;
        delta += splice.replacementBytes.length - splice.expectedBytes.length;
        return (0, span_1.toByteSpan)(start, start + splice.replacementBytes.length);
    });
}
/** The inverse of applied splices (plan §11 step 6, Undo on the engine): in
 * the bytes they produced, each changed range goes back to the bytes it
 * replaced. Same ranges, expected and replacement swapped — submitted as a
 * `revert-splices` intent authored against the post-apply checksum, whose
 * planner reads the witness (the replacement bytes) off that snapshot. */
function inverseEdits(splices) {
    const ordered = orderedSplices(splices);
    const ranges = changedRanges(ordered);
    return ordered.map((splice, index) => {
        const span = ranges[index];
        (0, assert_1.assert)(span !== undefined, 'Every splice has a changed range');
        const text = (0, span_1.decodeUtf8)(splice.expectedBytes);
        // Splices cut at code-point boundaries (spans come from the parser), so
        // the bytes they replaced are text.
        (0, assert_1.assert)(text.ok, 'Replaced bytes decode');
        return { span, text: text.value };
    });
}
function sizeDelta(splices) {
    return splices.reduce((total, splice) => total + splice.replacementBytes.length - splice.expectedBytes.length, 0);
}
