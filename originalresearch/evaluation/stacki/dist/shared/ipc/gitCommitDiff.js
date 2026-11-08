"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.COMMIT_DIFF_LIMITS = void 0;
exports.parseCommitDiffRequest = parseCommitDiffRequest;
exports.parseCommitDiffResult = parseCommitDiffResult;
const assert_1 = require("../core/assert");
const boundary_1 = require("../core/boundary");
exports.COMMIT_DIFF_LIMITS = { charactersMax: 500_000, linesMax: 10_000 };
function parseCommitDiffRequest(input) {
    const value = (0, boundary_1.record)(input);
    const commit = (0, boundary_1.text)(value['commit']);
    (0, assert_1.assert)(/^(?:[a-f0-9]{40}|[a-f0-9]{64})$/.test(commit), 'Commit diff: expected full commit hash');
    const projectPath = (0, boundary_1.pathText)(value['projectPath']);
    (0, assert_1.assert)(projectPath.length > 0, 'Commit diff: project path is required');
    return {
        projectPath,
        commit,
        path: parseCommitDiffPath(value['path']),
        from: (0, boundary_1.optional)(parseCommitDiffPath)(value['from']),
    };
}
function parseCommitDiffResult(input) {
    const value = (0, boundary_1.record)(input);
    if ((0, boundary_1.boolean)(value['ok'])) {
        const patch = (0, boundary_1.text)(value['value']);
        (0, assert_1.assert)(patch.length <= exports.COMMIT_DIFF_LIMITS.charactersMax, 'Commit diff: character limit exceeded');
        (0, assert_1.assert)(patch.split('\n').length <= exports.COMMIT_DIFF_LIMITS.linesMax, 'Commit diff: line limit exceeded');
        return { ok: true, value: patch };
    }
    return { ok: false, error: (0, boundary_1.text)(value['error']) };
}
function parseCommitDiffPath(input) {
    const value = (0, boundary_1.pathText)(input);
    (0, assert_1.assert)(value.length > 0, 'Commit diff: file path is required');
    (0, assert_1.assert)(!value.startsWith('/'), 'Commit diff: expected repository-relative path');
    (0, assert_1.assert)(!value.startsWith('\\'), 'Commit diff: absolute network path');
    (0, assert_1.assert)(!/^[A-Za-z]:/.test(value), 'Commit diff: drive path');
    (0, assert_1.assert)(!value.split(/[\\/]/).includes('..'), 'Commit diff: path escapes repository');
    return value;
}
