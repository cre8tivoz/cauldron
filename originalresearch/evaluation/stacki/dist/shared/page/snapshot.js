"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createSnapshot = createSnapshot;
exports.createLazySnapshot = createLazySnapshot;
// A snapshot: the only source-derived state the engine keeps per file (plan
// §3.1). The exact bytes last read, their checksum, and a disposable projection
// of them. There is no version field — the checksum already answers "which
// file is this?" — and a snapshot is never edited; a new one replaces it.
const assert_1 = require("../core/assert");
const limits_1 = require("../core/limits");
/** The only constructor. The checksum is computed from the bytes by `hash`
 * (SHA-256 in the actor, `node:crypto` in tests), so a snapshot cannot carry a
 * checksum of other bytes; the projection must describe bytes of this length.
 * The hash is a parameter because shared/ runs in the renderer as well, where
 * `node:crypto` does not exist. */
function createSnapshot(input, hash) {
    (0, assert_1.assert)(input.bytes.length <= limits_1.LIMITS.sourceBytesMax, 'Snapshot bytes are inside the file bound');
    (0, assert_1.assert)(input.projection.byteLength === input.bytes.length, 'The projection was derived from bytes of this length');
    return {
        path: input.path,
        checksum: hash(input.bytes),
        bytes: input.bytes,
        projection: input.projection,
    };
}
/** A snapshot whose projection is derived when first read (plan §3.1: the
 * projection is disposable and derived). The write protocol never reads the
 * projection of a `rewrite-text` candidate — it has no target kind to check
 * and may be invalid (§3.6) — so a program's write of a stylesheet or a CMS
 * entry never pays for a parse it does not use; a visual intent's planner
 * reads it, and pays exactly what an eager snapshot costs.
 * The derivation is pure over bytes the snapshot owns, so deriving later can
 * never see newer bytes than the snapshot names. */
function createLazySnapshot(input, project, hash) {
    (0, assert_1.assert)(input.bytes.length <= limits_1.LIMITS.sourceBytesMax, 'Snapshot bytes are inside the file bound');
    let derived; // Memo, owned by this snapshot alone.
    return {
        path: input.path,
        checksum: hash(input.bytes),
        bytes: input.bytes,
        get projection() {
            if (derived === undefined) {
                const projection = project(input.bytes);
                (0, assert_1.assert)(projection.byteLength === input.bytes.length, 'The projection was derived from bytes of this length');
                derived = projection;
            }
            return derived;
        },
    };
}
