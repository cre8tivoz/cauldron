"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DIFF_BUDGET = void 0;
exports.diffBytes = diffBytes;
exports.diffHunks = diffHunks;
// A byte diff between the bytes an intent was authored against and the bytes on
// disk now (plan §4, §11 step 2). It is Myers' O(ND) algorithm, run once over the
// bytes and once over the reversed bytes. The forward frontiers give, for any
// point (x, y) of the edit graph, the edit distance between the first x source
// bytes and the first y target bytes; the backward frontiers give the same for
// the suffixes. A point lies on some minimum edit script exactly when the two
// add up to the total distance — which is what lets the span mapper prove that
// *every* minimum script maps a span the same way, instead of trusting the one
// script a diff happens to print (mapSpan.ts).
//
// Why not the line diff in electron/git/conflicts.ts (plan §11 step 2): it fills an
// n·m table and, past 250 000 cells, silently returns the whole region as one
// change. Here the cost grows with the edit, not the file, and exhaustion is a
// typed outcome, never a silent loss of fidelity (plan §14).
//
// Bounds (AGENTS.md §10): LIMITS.diffWorkMax counts byte comparisons and
// frontier cells; LIMITS.diffDistanceMax caps the frontier memory. Both are
// checked while the work is done, so a hopeless diff stops near its cause. No
// recursion; every loop is bounded by the file length or the distance.
const assert_1 = require("../core/assert");
const limits_1 = require("../core/limits");
const span_1 = require("../core/span");
/** The production budget. Tests pass smaller ones to reach exhaustion cheaply. */
exports.DIFF_BUDGET = {
    workMax: limits_1.LIMITS.diffWorkMax,
    distanceMax: limits_1.LIMITS.diffDistanceMax,
};
function diffBytes(source, target, budget) {
    (0, assert_1.assert)(budget.workMax <= limits_1.LIMITS.diffWorkMax, 'The diff budget stays inside the work bound');
    (0, assert_1.assert)(budget.distanceMax <= limits_1.LIMITS.diffDistanceMax, 'The diff budget stays inside the distance');
    (0, assert_1.assert)(source.length <= limits_1.LIMITS.sourceBytesMax, 'Diffed source bytes are inside the file bound');
    (0, assert_1.assert)(target.length <= limits_1.LIMITS.sourceBytesMax, 'Diffed target bytes are inside the file bound');
    if (Math.abs(source.length - target.length) > budget.distanceMax) {
        // Every script deletes or inserts at least the size change: no search can
        // come in under the bound, so none is started.
        return { tag: 'too-costly' };
    }
    const forward = runFrontiers(source, target, budget, 0);
    if (forward === undefined) {
        return { tag: 'too-costly' };
    }
    const backward = runFrontiers(reversed(source), reversed(target), budget, forward.workSpent);
    if (backward === undefined) {
        return { tag: 'too-costly' };
    }
    const distance = forward.distance;
    (0, assert_1.assert)(backward.distance === distance, 'Both directions find the same minimum distance');
    const sizeChange = Math.abs(source.length - target.length);
    (0, assert_1.assert)(distance >= sizeChange, 'The distance covers the size change');
    (0, assert_1.assert)((distance - sizeChange) % 2 === 0, 'The distance has the parity of N + M');
    const diff = {
        source,
        target,
        distance,
        budget,
        workSpent: backward.workSpent,
        distanceBefore: (x, y) => {
            checkPoint(source, target, x, y);
            return frontierDistance(forward.rows, distance, x, y);
        },
        distanceAfter: (x, y) => {
            checkPoint(source, target, x, y);
            return frontierDistance(backward.rows, distance, source.length - x, target.length - y);
        },
    };
    const endDistance = diff.distanceBefore(source.length, target.length);
    (0, assert_1.assert)(endDistance === distance, 'The end costs the distance');
    (0, assert_1.assert)(diff.distanceAfter(0, 0) === distance, 'The start costs the distance, read backward');
    return { tag: 'computed', diff };
}
/** One minimum edit script as hunks, ascending — the forward traceback. Where
 * several scripts tie, this is one of them; the mapper never relies on which. */
function diffHunks(diff) {
    const { source, target } = diff;
    const hunks = [];
    let x = source.length;
    let y = target.length;
    let distance = diff.distance;
    let hunkEnd;
    const stepsMax = source.length + target.length;
    for (let step = 0; step < stepsMax; step++) {
        if (x + y === 0) {
            break;
        }
        if (matchesBehind(source, target, x, y)) {
            // A match never costs anything, so stepping back along it stays optimal.
            if (hunkEnd !== undefined) {
                hunks.push({ source: (0, span_1.toByteSpan)(x, hunkEnd.x), target: (0, span_1.toByteSpan)(y, hunkEnd.y) });
                hunkEnd = undefined;
            }
            x -= 1;
            y -= 1;
            continue;
        }
        hunkEnd ??= { x, y };
        if (deletionBehind(diff, x, y, distance)) {
            x -= 1;
        }
        else {
            (0, assert_1.assert)(y > 0, 'Without a deletion behind, an insertion is');
            (0, assert_1.assert)(diff.distanceBefore(x, y - 1) === distance - 1, 'The insertion lies on the script');
            y -= 1;
        }
        distance -= 1;
    }
    (0, assert_1.assert)(x + y === 0, 'The traceback reaches the start of both files');
    (0, assert_1.assert)(distance === 0, 'The traceback spent exactly the distance');
    if (hunkEnd !== undefined) {
        hunks.push({ source: (0, span_1.toByteSpan)(0, hunkEnd.x), target: (0, span_1.toByteSpan)(0, hunkEnd.y) });
    }
    return hunks.reverse();
}
// --- Internal ----------------------------------------------------------------
function matchesBehind(source, target, x, y) {
    if (x > 0) {
        if (y > 0) {
            return source[x - 1] === target[y - 1];
        }
    }
    return false;
}
function deletionBehind(diff, x, y, distance) {
    if (x > 0) {
        return diff.distanceBefore(x - 1, y) === distance - 1;
    }
    return false;
}
function checkPoint(source, target, x, y) {
    (0, assert_1.assert)(Number.isSafeInteger(x), 'A diff point has an integer x');
    (0, assert_1.assert)(Number.isSafeInteger(y), 'A diff point has an integer y');
    (0, assert_1.assert)(x >= 0, 'A diff point lies right of the grid start');
    (0, assert_1.assert)(y >= 0, 'A diff point lies below the grid start');
    (0, assert_1.assert)(x <= source.length, 'A diff point lies inside the source');
    (0, assert_1.assert)(y <= target.length, 'A diff point lies inside the target');
}
// Myers' greedy loop, keeping every row for the distance lookups. Row d is
// complete when the loop stops, so a lookup at the final distance is exact on
// every diagonal, not only on the one that reached the end.
function runFrontiers(source, target, budget, workStart) {
    const rows = [];
    let work = workStart;
    const endDiagonal = source.length - target.length;
    for (let distance = 0; distance <= budget.distanceMax; distance++) {
        work += 2 * distance + 1;
        if (work > budget.workMax) {
            return undefined;
        }
        const row = new Int32Array(2 * distance + 1).fill(-1);
        for (let diagonal = -distance; diagonal <= distance; diagonal += 2) {
            const start = frontierStart(rows, distance, diagonal, source.length, target.length);
            if (start < 0) {
                continue;
            }
            const end = snake(source, target, start, start - diagonal, budget.workMax - work);
            if (end === undefined) {
                return undefined;
            }
            work += end - start;
            row[diagonal + distance] = end;
        }
        rows.push(row);
        (0, assert_1.assert)(rows.length === distance + 1, 'One frontier row per distance');
        if (row[endDiagonal + distance] === source.length) {
            (0, assert_1.assert)(Math.abs(endDiagonal) <= distance, 'The end diagonal is inside the final row');
            return { rows, distance, workSpent: work };
        }
    }
    return undefined;
}
// The furthest x on diagonal k reachable with distance at most d, before the
// snake: an insertion from diagonal k + 1, a deletion from diagonal k − 1, or
// the same diagonal at d − 2. Every point on a diagonal at or before its
// frontier costs at most that row's distance (the distance never decreases
// along a diagonal), so a move may start from the last point that still has
// room for it, not only from the frontier itself.
function frontierStart(rows, distance, diagonal, sourceLength, targetLength) {
    if (distance === 0) {
        return 0;
    }
    if (diagonal > sourceLength) {
        return -1; // The diagonal starts right of the grid.
    }
    if (diagonal < -targetLength) {
        return -1; // The diagonal starts below the grid.
    }
    let best = frontierAt(rows, distance - 2, diagonal);
    const above = frontierAt(rows, distance - 1, diagonal + 1);
    if (above >= 0) {
        // Insert target[y]: the point needs y < targetLength before the move.
        const from = Math.min(above, targetLength + diagonal);
        best = from >= Math.max(0, diagonal + 1) ? Math.max(best, from) : best;
    }
    const left = frontierAt(rows, distance - 1, diagonal - 1);
    if (left >= 0) {
        // Delete source[x]: the point needs x < sourceLength before the move.
        const from = Math.min(left, sourceLength - 1);
        best = from >= Math.max(0, diagonal - 1) ? Math.max(best, from + 1) : best;
    }
    (0, assert_1.assert)(best <= sourceLength, 'A frontier start lies inside the source');
    if (best >= 0) {
        (0, assert_1.assert)(best - diagonal <= targetLength, 'A frontier start lies inside the target');
    }
    return best;
}
function frontierAt(rows, distance, diagonal) {
    if (distance < 0) {
        return -1;
    }
    if (Math.abs(diagonal) > distance) {
        return -1;
    }
    const row = rows[distance];
    (0, assert_1.assert)(row !== undefined, 'Earlier frontier rows are kept');
    const x = row[diagonal + distance];
    (0, assert_1.assert)(x !== undefined, 'The diagonal lies inside its row');
    return x;
}
/** Follow matching bytes from (x, y); undefined when the work budget ends first.
 * Each match costs one unit; the comparison that ends the snake is paid for by
 * the diagonal's frontier cell. */
function snake(source, target, x, y, workLeft) {
    const stepsMax = Math.min(source.length - x, target.length - y);
    (0, assert_1.assert)(stepsMax >= 0, 'A snake starts inside the grid');
    (0, assert_1.assert)(workLeft >= 0, 'A snake starts inside the work budget');
    for (let step = 0; step < stepsMax; step++) {
        if (source[x + step] !== target[y + step]) {
            return x + step;
        }
        if (step + 1 > workLeft) {
            return undefined;
        }
    }
    return x + stepsMax;
}
// The distance of (x, y) is the first row whose frontier on its diagonal reaches
// x. Rows on one diagonal share its parity and their frontiers never move back,
// so a binary search over them finds it in log(D) probes.
function frontierDistance(rows, distance, x, y) {
    const diagonal = x - y;
    const first = Math.abs(diagonal);
    if (first > distance) {
        return undefined;
    }
    const candidates = Math.floor((distance - first) / 2) + 1;
    let low = 0;
    let high = candidates;
    const probesMax = 64; // log2 of any row count, with room to spare.
    for (let probe = 0; probe < probesMax; probe++) {
        if (low < high) {
            const middle = Math.floor((low + high) / 2);
            if (frontierAt(rows, first + 2 * middle, diagonal) >= x) {
                high = middle;
            }
            else {
                low = middle + 1;
            }
        }
        else {
            break;
        }
    }
    (0, assert_1.assert)(low === high, 'The binary search converged inside its probe bound');
    if (low < candidates) {
        const found = first + 2 * low;
        // The postcondition, both sides: this row reaches x and the one before does not.
        (0, assert_1.assert)(frontierAt(rows, found, diagonal) >= x, 'The found row reaches the point');
        (0, assert_1.assert)(frontierAt(rows, found - 2, diagonal) < x, 'No cheaper row reaches the point');
        return found;
    }
    return undefined;
}
// `new Uint8Array` always copies; `slice` on a Node Buffer is a view, and
// reversing that reverses the caller's snapshot in place (step-3 spike).
function reversed(bytes) {
    const copy = new Uint8Array(bytes).reverse();
    (0, assert_1.assert)(copy.length === bytes.length, 'Reversing keeps the length');
    (0, assert_1.assert)(copy.buffer !== bytes.buffer, 'The reversed copy shares no memory with its input');
    return copy;
}
