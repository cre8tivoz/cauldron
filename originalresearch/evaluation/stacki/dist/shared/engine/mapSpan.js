"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mapSpan = mapSpan;
exports.mapSpanThroughDiff = mapSpanThroughDiff;
// Maps a span of the bytes an intent was authored against into the bytes on
// disk now (plan §4): `(lastKnownBytes, currentBytes, span) → resolved |
// ambiguous | gone`. The mapper never guesses. A diff prints one minimum edit
// script, but where content repeats several scripts tie — delete the first of
// two identical cards, or the second? — and picking one is exactly "the third
// matching node". So the outcome is defined over all of them at once:
//
//   resolved   every minimum edit script keeps every byte of the span, in one
//              piece, at the same place in the current bytes;
//   gone       no minimum edit script keeps the span whole: it was edited or
//              deleted;
//   ambiguous  some script keeps it and another does not, or they disagree
//              on where.
//
// How, without enumerating scripts: every script crosses each source byte
// exactly once, either matching it to one target byte or deleting it, and a
// crossing is on some minimum script exactly when the distance before it plus
// its cost plus the distance after it equals the total (diff.ts). If the only
// crossing of the span's first byte is a match at j, and the only crossing of
// its last byte is the match at j + length − 1, and the bytes between agree,
// then every minimum script runs through both and takes the free diagonal in
// between: any detour costs at least two. Two columns decide the whole span.
// The brute-force reference checks every column of a full table instead, and
// the tests assert the two agree (plan §10).
const assert_1 = require("../core/assert");
const diff_1 = require("./diff");
const span_1 = require("../core/span");
/** Diff, then map. For several spans through one pair of files, diff once with
 * `diffBytes` and call `mapSpanThroughDiff` per span. */
function mapSpan(source, target, span, budget) {
    const outcome = (0, diff_1.diffBytes)(source, target, budget);
    switch (outcome.tag) {
        case 'computed':
            return mapSpanThroughDiff(outcome.diff, span);
        case 'too-costly':
            return { tag: 'too-costly' };
        default: {
            const exhaustive = outcome;
            return exhaustive;
        }
    }
}
/** Map a non-empty span. Zero-width insertion points are not mapped here: an
 * insertion between two runs has no byte of its own to anchor, and step 6
 * (insert-node) brings its own rule for them. */
function mapSpanThroughDiff(diff, span) {
    (0, assert_1.assert)(span.start < span.end, 'Only non-empty spans are mapped');
    (0, assert_1.assert)(span.end <= diff.source.length, 'The mapped span lies inside the authored bytes');
    if (diff.distance === 0) {
        // Identical bytes: the one minimum script is the main diagonal.
        (0, assert_1.assert)(diff.source.length === diff.target.length, 'Identical bytes have one length');
        return { tag: 'resolved', span };
    }
    const workLeft = diff.budget.workMax - diff.workSpent;
    const length = span.end - span.start;
    const first = crossings(diff, span.start);
    const target = soleMatch(first);
    if (target !== undefined) {
        const last = soleMatch(crossings(diff, span.end - 1));
        if (last === target + length - 1) {
            if (length > workLeft) {
                return { tag: 'too-costly' };
            }
            if (runsAgree(diff, span.start, target, length)) {
                const mapped = (0, span_1.toByteSpan)(target, target + length);
                (0, assert_1.assert)(mapped.end <= diff.target.length, 'A resolved span lies inside the current bytes');
                return { tag: 'resolved', span: mapped };
            }
        }
    }
    return keptBySomeScript(diff, span, first, workLeft);
}
// A script with distance D stays within D diagonals of the start, so only
// targets in [x − D, x + D] can be crossed at column x: 2D + 1 candidates,
// each a few O(log D) lookups — bounded by LIMITS.diffDistanceMax.
function crossings(diff, x) {
    (0, assert_1.assert)(x < diff.source.length, 'A crossed column is a source byte');
    const total = diff.distance;
    const matches = [];
    let deleted = false;
    const yMin = Math.max(0, x - total);
    const yMax = Math.min(diff.target.length, x + total);
    (0, assert_1.assert)(yMax - yMin <= 2 * total, 'At most 2D + 1 targets are candidates');
    for (let y = yMin; y <= yMax; y++) {
        const before = diff.distanceBefore(x, y);
        if (before === undefined) {
            continue; // No minimum script reaches (x, y).
        }
        // Delete source[x]: the horizontal edge (x, y) → (x + 1, y) costs one.
        const afterDeletion = diff.distanceAfter(x + 1, y);
        if (afterDeletion !== undefined) {
            if (before + 1 + afterDeletion === total) {
                deleted = true;
            }
        }
        if (matchCrossesAt(diff, x, y, before)) {
            matches.push(y);
        }
    }
    const crossingCount = matches.length + (deleted ? 1 : 0);
    (0, assert_1.assert)(crossingCount > 0, 'Some minimum script crosses every source byte');
    return { matches, deleted };
}
// Match source[x] with target[y]: the diagonal edge costs nothing.
function matchCrossesAt(diff, x, y, before) {
    if (y < diff.target.length) {
        if (diff.source[x] === diff.target[y]) {
            const after = diff.distanceAfter(x + 1, y + 1);
            if (after !== undefined) {
                return before + after === diff.distance;
            }
        }
    }
    return false;
}
function soleMatch(crossing) {
    (0, assert_1.assert)(strictlyAscending(crossing.matches), 'Matched targets ascend without repeats');
    if (crossing.deleted) {
        return undefined;
    }
    if (crossing.matches.length === 1) {
        return crossing.matches[0];
    }
    return undefined;
}
function runsAgree(diff, source, target, length) {
    (0, assert_1.assert)(source + length <= diff.source.length, 'The compared run lies inside the source');
    (0, assert_1.assert)(target + length <= diff.target.length, 'The compared run lies inside the target');
    for (let offset = 0; offset < length; offset++) {
        if (diff.source[source + offset] !== diff.target[target + offset]) {
            return false;
        }
    }
    return true;
}
// Not resolved: `gone` when no minimum script keeps the span whole, else
// `ambiguous`. A script keeps it at j exactly when it matches the first byte at
// j and the bytes agree from there: the free diagonal is then optimal to the
// end of the span, because the distance after never grows along a match.
function keptBySomeScript(diff, span, first, workLeft) {
    const length = span.end - span.start;
    (0, assert_1.assert)(length > 0, 'A mapped span is non-empty');
    (0, assert_1.assert)(first.matches.length <= 2 * diff.distance + 1, 'Matches come from the candidate band');
    let work = 0;
    for (const target of first.matches) {
        if (target + length <= diff.target.length) {
            work += length;
            if (work > workLeft) {
                return { tag: 'too-costly' };
            }
            if (runsAgree(diff, span.start, target, length)) {
                return { tag: 'ambiguous' };
            }
        }
    }
    (0, assert_1.assert)(work <= workLeft, 'The search stayed inside the work budget');
    return { tag: 'gone' };
}
function strictlyAscending(targets) {
    for (let index = 1; index < targets.length; index++) {
        const previous = targets[index - 1];
        const current = targets[index];
        (0, assert_1.assert)(previous !== undefined, 'Previous target exists inside the bounds');
        (0, assert_1.assert)(current !== undefined, 'Current target exists inside the bounds');
        if (previous < current) {
            continue;
        }
        return false;
    }
    return true;
}
