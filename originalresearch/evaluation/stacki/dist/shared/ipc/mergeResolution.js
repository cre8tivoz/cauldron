"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseMergePick = parseMergePick;
exports.parseMergeResolution = parseMergeResolution;
exports.mergeConflictSnapshot = mergeConflictSnapshot;
const boundary_1 = require("../core/boundary");
function parseMergePick(input) {
    if (input === 'ours' || input === 'theirs' || input === 'both' || input === 'merged') {
        return input;
    }
    throw new Error('Merge resolution: unknown choice');
}
function parseMergeResolution(input) {
    if (input === 'ours' || input === 'theirs') {
        return input;
    }
    if (Array.isArray(input)) {
        return (0, boundary_1.list)(parseMergePick)(input);
    }
    const value = (0, boundary_1.record)(input);
    if (value['kind'] !== 'text') {
        throw new Error('Merge resolution: expected text result');
    }
    return {
        kind: 'text',
        text: (0, boundary_1.text)(value['text']),
        expected: (0, boundary_1.text)(value['expected']),
        expectedBranch: (0, boundary_1.optional)(boundary_1.text)(value['expectedBranch']),
    };
}
// Canonical tuples avoid object-property order differences across IPC. Comparing
// the complete parts also protects unchanged context from a stale result editor.
function mergeConflictSnapshot(parts) {
    return (0, boundary_1.text)(JSON.stringify(parts.map((part) => part.kind === 'same'
        ? ['same', part.text]
        : ['clash', part.ours, part.theirs, part.changedBy, part.merged === undefined ? 'uncombined' : 'combined', part.merged ?? ''])));
}
