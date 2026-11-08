"use strict";
// Reading a conflicted file, and putting it back together.
//
// When a merge clashes, git writes the file with both versions in it, marked:
//
//     unchanged text
//     <<<<<<< HEAD
//     this branch's version
//     =======
//     the incoming version
//     >>>>>>> other-branch
//     more unchanged text
//
// Everything outside the markers is text both sides agree on. Everything
// inside is one disagreement — and a file can have several, which is the whole
// reason this exists: a page where the heading should come from one branch and
// the footer from the other is completely ordinary, and "keep the whole file
// from one side or the other" cannot express it.
//
// Git decides where the disagreements are, not this code. Two edits closer
// than a few lines come back as a single one, because git could not tell them
// apart either; that is a limit of the merge, not something to work around
// here.
//
// Parsing markers rather than diffing the two versions ourselves means the
// three-way merge is git's — with the common ancestor it alone has — and this
// only has to read the result.
Object.defineProperty(exports, "__esModule", { value: true });
exports.clashCount = void 0;
exports.parseConflict = parseConflict;
exports.renderResolved = renderResolved;
exports.threeWay = threeWay;
exports.lineDiff = lineDiff;
exports.mergeInline = mergeInline;
const assert_1 = require("../../shared/core/assert");
// Longest-common-subsequence line diff, used to break one of git's conflicts
// into the separate decisions it really contains.
//
// Git groups edits that are close together into a single conflict, because its
// merge works in regions rather than in lines. So a page where the heading was
// changed on one branch and the paragraph on the other arrives as ONE choice
// covering both — and no answer to it is right: either side loses an edit, and
// "both" duplicates the heading AND the paragraph.
//
// Comparing the two sides line by line separates them again. The lines they
// agree on stop being part of the choice, and each run they disagree on
// becomes a decision of its own.
function lineDiff(left, right) {
    // A conflict big enough to make this expensive is one nobody is going to
    // resolve line by line anyway; left whole, it still works as one choice.
    if (left.length * right.length > 250000) {
        return [{ ours: [...left], theirs: [...right] }];
    }
    const leftCount = left.length;
    const rightCount = right.length;
    const dp = Array.from({ length: leftCount + 1 }, () => new Uint32Array(rightCount + 1));
    for (let i = leftCount - 1; i >= 0; i--) {
        const row = dp[i];
        if (!row) {
            continue;
        }
        for (let j = rightCount - 1; j >= 0; j--) {
            row[j] = left[i] === right[j] ? (dp[i + 1]?.[j + 1] ?? 0) + 1 : Math.max(dp[i + 1]?.[j] ?? 0, row[j + 1] ?? 0);
        }
    }
    const runs = [];
    let i = 0;
    let j = 0;
    const push = (run) => {
        const last = runs[runs.length - 1];
        // Adjacent runs of the same sort are one run: two changed lines next to
        // each other are one edit, not two decisions.
        if (last && 'ours' in last === 'ours' in run) {
            if ('ours' in last && 'ours' in run) {
                last.ours.push(...run.ours);
                last.theirs.push(...run.theirs);
            }
            else if (!('ours' in last) && !('ours' in run)) {
                last.common.push(...run.common);
            }
            return;
        }
        runs.push(run);
    };
    while (i < leftCount && j < rightCount) {
        if (left[i] === right[j]) {
            push({ common: [left[i] ?? ''] });
            i++;
            j++;
        }
        else if ((dp[i + 1]?.[j] ?? 0) >= (dp[i]?.[j + 1] ?? 0)) {
            push({ ours: [left[i] ?? ''], theirs: [] });
            i++;
        }
        else {
            push({ ours: [], theirs: [right[j] ?? ''] });
            j++;
        }
    }
    if (i < leftCount || j < rightCount) {
        push({ ours: left.slice(i), theirs: right.slice(j) });
    }
    return runs;
}
// Where one side rewrote the ancestor: a list of `{start, end, lines}` over
// base line numbers, `lines` being what that side put there instead.
function changeIntervals(base, side) {
    const out = [];
    let baseLine = 0;
    for (const run of lineDiff(base, side)) {
        if ('ours' in run) {
            out.push({ start: baseLine, end: baseLine + run.ours.length, lines: run.theirs });
            baseLine += run.ours.length;
            continue;
        }
        baseLine += run.common.length;
    }
    return out;
}
/**
 * One of git's conflicts, split into the decisions it really contains.
 *
 * Comparing the two sides to each OTHER is not enough: when a heading was
 * edited on one branch and the paragraph beneath it on the other, every line
 * differs between the two sides and there is nothing common to split on. What
 * separates them is the ancestor — the version both started from. Against it,
 * the heading was changed only by one branch and the paragraph only by the
 * other, so they are two independent decisions and neither needs asking about.
 *
 * Returns runs: `{ common }` for text nothing touched, or
 * `{ ours, theirs, base, changedBy }` where `changedBy` is which side actually
 * moved — 'ours', 'theirs', or 'both' when they really do disagree.
 */
function threeWay(base, ours, theirs) {
    const oursChanges = changeIntervals(base, ours);
    const theirsChanges = changeIntervals(base, theirs);
    const runs = [];
    let i = 0;
    let oursIndex = 0;
    let theirsIndex = 0;
    while (oursIndex < oursChanges.length || theirsIndex < theirsChanges.length) {
        const start = Math.min(oursChanges[oursIndex]?.start ?? Infinity, theirsChanges[theirsIndex]?.start ?? Infinity);
        if (i < start) {
            runs.push({ common: base.slice(i, start) });
            i = start;
        }
        const group = overlappingChanges(oursChanges, theirsChanges, oursIndex, theirsIndex, start);
        // The group always takes the edit that starts here, so the loop ends.
        (0, assert_1.assert)(group.oursNext + group.theirsNext > oursIndex + theirsIndex, 'threeWay: no progress');
        oursIndex = group.oursNext;
        theirsIndex = group.theirsNext;
        const { mine, yours, end } = group;
        runs.push({
            ours: sideAcross(base, start, end, mine),
            theirs: sideAcross(base, start, end, yours),
            base: base.slice(start, end),
            changedBy: mine.length && yours.length ? 'both' : mine.length ? 'ours' : 'theirs',
        });
        i = end;
    }
    if (i < base.length) {
        runs.push({ common: base.slice(i) });
    }
    return runs;
}
// Edits that OVERLAP are one decision — two rewrites of the same lines
// cannot be answered separately. Edits that merely sit next to each other
// are two, which is the whole point: a heading changed on one branch and
// the paragraph under it changed on the other are adjacent, not the same
// question, and joining them would put the user back to choosing a whole
// block they only wanted half of.
function overlappingChanges(oursChanges, theirsChanges, oursIndex, theirsIndex, start) {
    const mine = [];
    const yours = [];
    let end = start;
    let oursNext = oursIndex;
    let theirsNext = theirsIndex;
    // Take whichever starts here, then anything genuinely overlapping it. A
    // zero-width edit (a pure insertion) sitting exactly at the boundary joins
    // too: both sides inserting at one point really is one disagreement.
    const overlaps = (interval) => interval.start < end || (interval.start === end && interval.start === interval.end);
    const takeOurs = (interval) => {
        end = Math.max(end, interval.end);
        mine.push(interval);
        oursNext++;
    };
    const takeTheirs = (interval) => {
        end = Math.max(end, interval.end);
        yours.push(interval);
        theirsNext++;
    };
    const firstOurs = oursChanges[oursNext];
    if (firstOurs !== undefined && firstOurs.start === start) {
        takeOurs(firstOurs);
    }
    const firstTheirs = theirsChanges[theirsNext];
    if (firstTheirs !== undefined && firstTheirs.start === start) {
        takeTheirs(firstTheirs);
    }
    // Every pass that moves takes at least one interval, so the passes are bounded by the count.
    for (let moved = true; moved;) {
        moved = false;
        while (oursNext < oursChanges.length) {
            const interval = oursChanges[oursNext];
            if (interval === undefined || !overlaps(interval)) {
                break;
            }
            takeOurs(interval);
            moved = true;
        }
        while (theirsNext < theirsChanges.length) {
            const interval = theirsChanges[theirsNext];
            if (interval === undefined || !overlaps(interval)) {
                break;
            }
            takeTheirs(interval);
            moved = true;
        }
    }
    (0, assert_1.assert)(end >= start, 'overlappingChanges: a group ends before it starts');
    return { mine, yours, end, oursNext, theirsNext };
}
// What one side says across `start..end`: the ancestor's lines with that side's rewrites put
// back in.
function sideAcross(base, start, end, intervals) {
    const out = [];
    let baseLine = start;
    for (const interval of intervals) {
        out.push(...base.slice(baseLine, interval.start));
        out.push(...interval.lines);
        baseLine = interval.end;
    }
    out.push(...base.slice(baseLine, end));
    return out;
}
// Words, punctuation and the gaps between them, kept separately so joining
// them back together reproduces the text exactly. Splitting on whitespace
// alone would lose the whitespace, and a merge that quietly reformats a line
// is a merge nobody can trust.
const tokenize = (text) => String(text ?? '').match(/\s+|[A-Za-z0-9_]+|[^\s A-Za-z0-9_]/g) ?? [];
/**
 * Two edits to the same lines that do not actually touch each other.
 *
 * A heading where one branch added a class and the other rewrote the words is
 * a single conflicted line, and answering it either way throws away one of the
 * two edits. But inside the line the changes are nowhere near each other — one
 * is in the attributes, one is in the text — so the same three-way split, run
 * over words instead of lines, separates them and both can be kept.
 *
 * Returns the combined text, or undefined when the edits really do overlap and
 * there is a genuine choice to make.
 */
function mergeInline(base, ours, theirs) {
    if (base === undefined) {
        return undefined;
    }
    const runs = threeWay(tokenize(base), tokenize(ours), tokenize(theirs));
    // Any region both sides rewrote is a real disagreement; combining it would
    // be inventing a version neither branch wrote.
    if (runs.some((run) => 'ours' in run && run.changedBy === 'both')) {
        return undefined;
    }
    if (!runs.some((run) => 'ours' in run)) {
        return undefined; // nothing to combine
    }
    return runs.map((run) => ('ours' in run ? (run.changedBy === 'theirs' ? run.theirs : run.ours) : run.common).join('')).join('');
}
// Which side actually made the change, judged against what both started from.
// When one side still says what the ancestor said, it did not change — so the
// other side's edit is the only edit, and defaulting to it loses nothing.
// Only when both moved is there a real disagreement to put to the user.
function whoChanged(ours, theirs, base) {
    if (base === undefined) {
        return 'both';
    }
    const inBase = (text) => text.trim() === '' || base.includes(text.trim());
    const oursUnchanged = inBase(ours);
    const theirsUnchanged = inBase(theirs);
    if (oursUnchanged && !theirsUnchanged) {
        return 'theirs';
    }
    if (theirsUnchanged && !oursUnchanged) {
        return 'ours';
    }
    return 'both';
}
// Lines retain their carriage returns so resolving a Windows file preserves its
// bytes. Match CRLF marker endings without normalizing the surrounding content.
const START = /^<<<<<<< ?(.*)\r?$/;
const MIDDLE = /^=======\s*$/;
const BASE = /^\|\|\|\|\|\|\| ?(.*)\r?$/; // Only present under diff3 conflict style.
const END = /^>>>>>>> ?(.*)\r?$/;
/**
 * A conflicted file as a list of parts.
 *
 * Each part is either `{ kind: 'same', text }` — agreed text — or
 * `{ kind: 'clash', ours, theirs }`, one disagreement. Joining the `same`
 * parts with a chosen side of each `clash` rebuilds the file.
 *
 * A file with no markers comes back as a single `same` part, which is the
 * honest answer: there is nothing to choose.
 */
function parseConflict(text) {
    const lines = String(text ?? '').split('\n');
    const parts = [];
    let same = [];
    let i = 0;
    const flushSame = () => {
        if (same.length) {
            parts.push({ kind: 'same', text: same.join('\n') });
        }
        same = [];
    };
    while (i < lines.length) {
        const startLine = lines[i];
        if (startLine === undefined || !START.test(startLine)) {
            same.push(startLine ?? '');
            i++;
            continue;
        }
        // A marker that never closes is a file somebody edited by hand and left
        // broken. Treating the rest as ordinary text keeps every line, which
        // matters more here than being clever: nothing is silently dropped.
        const block = readConflictBlock(lines, i);
        if (block.kind === 'unclosed') {
            same.push(startLine);
            i++;
            continue;
        }
        flushSame();
        parts.push(...clashParts(block));
        (0, assert_1.assert)(block.endLine > i, 'parseConflict: a conflict block ends after it starts');
        i = block.endLine + 1;
    }
    flushSame();
    return parts;
}
function readConflictBlock(lines, startLine) {
    (0, assert_1.assert)(START.test(lines[startLine] ?? ''), 'readConflictBlock: starts at a start marker');
    const ours = [];
    const theirs = [];
    const base = [];
    let sawMiddle = false;
    let sawBase = false;
    for (let j = startLine + 1; j < lines.length; j++) {
        const line = lines[j] ?? '';
        if (END.test(line)) {
            return { kind: 'closed', ours, theirs, base, sawBase, endLine: j };
        }
        if (MIDDLE.test(line)) {
            sawMiddle = true;
            continue;
        }
        // Under diff3 the common ancestor sits between the two sides. It is not
        // a third choice — it is what both started FROM — but it is what says
        // which side actually changed, so it is kept and never offered.
        if (BASE.test(line)) {
            sawBase = true;
            continue;
        }
        (sawMiddle ? theirs : sawBase ? base : ours).push(line);
    }
    return { kind: 'unclosed' };
}
function clashParts(block) {
    const { ours, theirs, base, sawBase } = block;
    // One of git's conflicts is often several decisions wearing one coat.
    // Comparing the two sides line by line separates them, so the lines they
    // agree on stop being part of the choice and each run they disagree on
    // becomes its own.
    // With the ancestor, the split is exact — each side's edits are known
    // rather than guessed at. Without it (a repo not set to record it) the two
    // sides are compared to each other, which still separates edits that share
    // untouched lines between them.
    const split = sawBase
        ? threeWay(base, ours, theirs)
        : lineDiff(ours, theirs).map((run) => 'ours' in run
            ? {
                ...run,
                changedBy: whoChanged(run.ours.join('\n'), run.theirs.join('\n'), undefined),
            }
            : run);
    const parts = [];
    for (const run of split) {
        if (!('ours' in run)) {
            parts.push({ kind: 'same', text: run.common.join('\n') });
            continue;
        }
        const clash = {
            kind: 'clash',
            ours: run.ours.join('\n'),
            theirs: run.theirs.join('\n'),
            changedBy: run.changedBy ?? 'both',
        };
        // Both sides touched these lines — but perhaps not the same part of
        // them. Splitting again by word finds out, and where the two edits do
        // not overlap, keeping both is the answer nobody has to think about.
        if (clash.kind === 'clash' && clash.changedBy === 'both' && run.base) {
            const merged = mergeInline(run.base.join('\n'), clash.ours, clash.theirs);
            if (merged !== undefined) {
                clash.merged = merged;
            }
        }
        parts.push(clash);
    }
    return parts;
}
/** How many disagreements are in a parsed file. */
const clashCount = (parts) => (parts ?? []).filter((part) => part.kind === 'clash').length;
exports.clashCount = clashCount;
/**
 * Put the file back together, given one answer per disagreement.
 *
 * `picks` is an array in the order the clashes appear: `'ours'`, `'theirs'`,
 * or `'both'`. Missing or unrecognised answers keep `ours` — between silently
 * dropping the user's own work and silently dropping work they asked to merge
 * in, the first is worse, because the incoming version is still on its branch
 * and theirs may exist nowhere else.
 */
function renderResolved(parts, picks = []) {
    let clashIndex = -1;
    return (parts ?? [])
        .map((part) => {
        if (part.kind === 'same') {
            return part.text;
        }
        clashIndex++;
        const pick = picks[clashIndex];
        // Both edits, combined — only offered where they were found not to
        // overlap, so this is the two changes and not a duplication.
        if (pick === 'merged' && part.merged !== undefined) {
            return part.merged;
        }
        if (pick === 'theirs') {
            return part.theirs;
        }
        // Both sides, in the order they appear in the file. A heading changed on
        // two branches is usually one or the other; a list that gained an item on
        // each is usually both.
        if (pick === 'both') {
            return [part.ours, part.theirs].filter((side) => side !== '').join('\n');
        }
        return part.ours;
    })
        .join('\n');
}
