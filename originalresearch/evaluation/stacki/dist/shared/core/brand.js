"use strict";
// Branded primitives (AGENTS.md §4): lookalike strings made distinct at compile
// time so a node id can never be passed where a file path belongs. Assertions
// exist only inside these validators, immediately after the check.
Object.defineProperty(exports, "__esModule", { value: true });
exports.toNodeId = toNodeId;
exports.toDigest = toDigest;
exports.toFilePath = toFilePath;
exports.toProjectPath = toProjectPath;
exports.toByteOffset = toByteOffset;
exports.toUtf16Offset = toUtf16Offset;
exports.toIntentId = toIntentId;
/** Node ids name nodes within one tree (plan §4: nothing keys on them across
 * snapshots). `n<path>` is the Astro parser's structural path (`n0.2.1`);
 * `m<N>` the Markdown parser's, until step 10; `layout` the layout wrapper.
 * The renderer carries its own handles across parses (src/editor/nodeHandles.ts):
 * `s<16 hex>.<path>` names a node by the snapshot it first appeared in, and
 * `g<32 hex>` a node a gesture created, before any parse has seen it. */
const NODE_ID_RE = /^(?:n\d+(?:\.\d+)*|m\d+|layout|s[0-9a-f]{16}\.\d+(?:\.\d+)*(?:~\d+)?|g[0-9a-f]{32})$/;
function toNodeId(value) {
    if (!NODE_ID_RE.test(value)) {
        throw new Error(`NodeId: expected 'n<path>', 'm<N>', 'layout', 's<snapshot>.<path>' or 'g<gesture>', ` + `got ${JSON.stringify(value)}`);
    }
    return value;
}
const DIGEST_RE = /^[0-9a-f]{64}$/;
function toDigest(value) {
    if (!DIGEST_RE.test(value)) {
        throw new Error('Digest: expected 64 lowercase hex characters');
    }
    return value;
}
function toFilePath(value) {
    if (value.length === 0) {
        throw new Error('FilePath: expected non-empty string');
    }
    return value;
}
function toProjectPath(value) {
    if (value.length === 0) {
        throw new Error('ProjectPath: expected non-empty string');
    }
    return value;
}
const INTENT_ID_RE = /^[A-Za-z0-9_-]{1,64}$/;
function toByteOffset(value) {
    if (!Number.isSafeInteger(value)) {
        throw new Error('ByteOffset: expected safe integer');
    }
    if (value < 0) {
        throw new Error('ByteOffset: expected nonnegative integer');
    }
    return value;
}
function toUtf16Offset(value) {
    if (!Number.isSafeInteger(value)) {
        throw new Error('Utf16Offset: expected safe integer');
    }
    if (value < 0) {
        throw new Error('Utf16Offset: expected nonnegative integer');
    }
    return value;
}
function toIntentId(value) {
    if (!INTENT_ID_RE.test(value)) {
        throw new Error('IntentId: expected 1 to 64 characters from [A-Za-z0-9_-]');
    }
    return value;
}
