"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runPublishGit = runPublishGit;
exports.readPublishHead = readPublishHead;
exports.parsePublishObject = parsePublishObject;
exports.publishFilesystemFailure = publishFilesystemFailure;
const result_1 = require("../../shared/core/result");
const nodeTools_1 = require("../lib/nodeTools");
/** Convert only child-process failures; invariant checks execute outside this boundary. */
async function runPublishGit(root, argumentsList, options = {}) {
    (0, nodeTools_1.ensureToolPath)();
    return (0, nodeTools_1.git)(root, argumentsList, options).then((output) => (0, result_1.ok)(output.stdout), (error) => {
        const exitCode = error instanceof Error && 'code' in error && typeof error.code === 'number' ? error.code : undefined;
        // Git errors may embed credential-helper output; only the operation name reaches the UI.
        return (0, result_1.err)({
            code: 'git',
            message: `Git ${argumentsList[0] ?? 'command'} failed. Check access and try again.`,
            exitCode,
        });
    });
}
async function readPublishHead(root) {
    const result = await runPublishGit(root, ['rev-parse', '--verify', '--quiet', 'HEAD']);
    if (!result.ok) {
        return result.error.exitCode === 1 ? (0, result_1.ok)(undefined) : result;
    }
    return parsePublishObject(result.value.trim());
}
function parsePublishObject(value) {
    return /^(?:[a-f0-9]{40}|[a-f0-9]{64})$/.test(value) ? (0, result_1.ok)(value) : (0, result_1.err)({ code: 'git-output', message: 'Git returned an invalid object identifier.' });
}
function publishFilesystemFailure(error) {
    return (0, result_1.err)({
        code: 'filesystem',
        message: error instanceof Error ? error.message : 'Could not access the publishing files.',
    });
}
