"use strict";
// The git runner lib/nodeTools.ts provides (over a PATH it repairs for the packaged
// app), as the git modules here take it. One home: gitSnapshot, gitBranches,
// gitHistory, previewWorktree and contentConfig all shell out through it.
Object.defineProperty(exports, "__esModule", { value: true });
exports.gitErrorDetail = gitErrorDetail;
exports.gitErrorFull = gitErrorFull;
const record_1 = require("../../shared/core/record");
const stderrOf = (error) => {
    const stderr = (0, record_1.toRecord)(error)?.['stderr'];
    return typeof stderr === 'string' ? stderr : undefined;
};
/** stderr first, then the message — git's own wording leads. */
function gitErrorDetail(error) {
    // `||`, not `??`: an empty stderr falls through to the message, as the
    // untyped code's `err.stderr || err.message` did.
    return stderrOf(error) || (error instanceof Error ? error.message : '');
}
/** Both streams, stdout first — used where git reports conflicts on stdout. */
function gitErrorFull(error) {
    const stdout = (0, record_1.toRecord)(error)?.['stdout'];
    return `${typeof stdout === 'string' ? stdout : ''}\n${gitErrorDetail(error)}`;
}
