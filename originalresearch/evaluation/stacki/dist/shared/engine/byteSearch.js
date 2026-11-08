"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.countOccurrences = countOccurrences;
// Counting occurrences of a byte string inside another (plan §4): the planner
// asks whether an element's identity bytes appear more than once in a file,
// because a remap onto one of several identical copies is exactly the guess the
// mapper exists to refuse. Knuth–Morris–Pratt, so the work is linear in both
// lengths whatever the bytes are — a file of one repeated byte cannot make a
// naive search quadratic — and the count stops at `countMax`, since the caller
// only needs to know "one" from "more than one".
const assert_1 = require("../core/assert");
const limits_1 = require("../core/limits");
/** How many times `needle` occurs in `haystack`, overlapping occurrences
 * included, counted up to `countMax` and no further. */
function countOccurrences(haystack, needle, countMax) {
    (0, assert_1.assert)(needle.length > 0, 'Only a non-empty needle is searched for');
    (0, assert_1.assert)(haystack.length <= limits_1.LIMITS.sourceBytesMax, 'The haystack is inside the source bound');
    (0, assert_1.assert)(Number.isSafeInteger(countMax), 'The count bound is an integer');
    (0, assert_1.assert)(countMax > 0, 'The count bound is positive');
    const failure = failureTable(needle);
    let count = 0;
    let matched = 0; // Length of the needle prefix matched so far.
    for (let index = 0; index < haystack.length; index++) {
        const byte = haystack[index];
        matched = extendMatch(needle, failure, matched, byte);
        if (matched === needle.length) {
            count += 1;
            if (count === countMax) {
                return count;
            }
            matched = failure[matched - 1] ?? 0;
        }
    }
    (0, assert_1.assert)(count < countMax, 'A search that reached the bound returned inside the loop');
    return count;
}
// --- Internal ----------------------------------------------------------------
// failure[i] is the length of the longest proper prefix of needle[0..i] that is
// also its suffix. Each step either extends the previous border or falls back
// along the table, so the whole table costs at most 2 × needle.length steps.
function failureTable(needle) {
    const failure = new Uint32Array(needle.length);
    let border = 0;
    for (let index = 1; index < needle.length; index++) {
        border = extendMatch(needle, failure, border, needle[index]);
        failure[index] = border;
    }
    (0, assert_1.assert)(failure[0] === 0, 'The one-byte prefix has no proper border');
    return failure;
}
/** The matched prefix length after reading `byte`, falling back along the
 * failure table until the byte extends a prefix or none is left. */
function extendMatch(needle, failure, matched, byte) {
    (0, assert_1.assert)(byte !== undefined, 'The byte read lies inside its array');
    (0, assert_1.assert)(matched < needle.length, 'A full match was reset before the next byte');
    let length = matched;
    while (length > 0) {
        if (needle[length] === byte) {
            return length + 1;
        }
        length = failure[length - 1] ?? 0; // Strictly shorter: the fallback terminates.
    }
    return needle[0] === byte ? 1 : 0;
}
