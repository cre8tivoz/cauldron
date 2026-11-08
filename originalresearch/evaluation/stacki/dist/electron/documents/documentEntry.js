"use strict";
// One file's entry in the document host: its actor's state, when it was last
// used, the snapshots it retains, and the commits it remembers; and the
// rewrite that turns a program's text into an intent (documentActors.ts).
Object.defineProperty(exports, "__esModule", { value: true });
exports.UNCHANGED = exports.STEPS_PER_INTENT = exports.Entry = void 0;
exports.rewriteHunks = rewriteHunks;
exports.editHistory = editHistory;
exports.entryBytes = entryBytes;
exports.compareKeys = compareKeys;
const assert_1 = require("../../shared/core/assert");
const limits_1 = require("../../shared/core/limits");
const result_1 = require("../../shared/core/result");
const span_1 = require("../../shared/core/span");
const codePatch_1 = require("../../shared/engine/codePatch");
// One actor and what the host keeps beside it. Its fields change only through the methods
// below, so every write to an actor's record is in one place and checks its bound there.
class Entry {
    document;
    #state;
    #used;
    #retained = [];
    #log = [];
    #written = undefined;
    constructor(document, state, used) {
        this.document = document;
        this.#state = state;
        this.#used = used;
    }
    get state() {
        return this.#state;
    }
    /** The host clock when the actor was last used, for least-recently-used eviction. */
    get used() {
        return this.#used;
    }
    /** Snapshots the actor held before its current one, newest last, bounded by
     * LIMITS.authoredSnapshotsMax: the bytes an edit may have been authored
     * against when an outside write replaced them since (step 6). */
    get retained() {
        return this.#retained;
    }
    /** The actor's recent commits, oldest first, bounded by
     * LIMITS.commitLogEntriesMax: an edit authored before them rebases exactly. */
    get log() {
        return this.#log;
    }
    /** The checksum of the bytes this actor last wrote, created or committed;
     * undefined until it writes. A watcher tick asks it (plan §11.9). */
    get written() {
        return this.#written;
    }
    setState(next) {
        this.#state = next;
    }
    touch(clock) {
        (0, assert_1.assert)(clock >= this.#used, 'The host clock only moves forward');
        this.#used = clock;
    }
    setRetained(retained) {
        (0, assert_1.assert)(retained.length <= limits_1.LIMITS.authoredSnapshotsMax, 'Retained snapshots are bounded');
        this.#retained = retained;
    }
    recordCreate(checksum) {
        this.#written = checksum;
    }
    recordCommit(record) {
        this.#log = [...this.#log, record].slice(-limits_1.LIMITS.commitLogEntriesMax);
        this.#written = record.to;
        (0, assert_1.assert)(this.#log.length <= limits_1.LIMITS.commitLogEntriesMax, 'The commit log is bounded');
    }
}
exports.Entry = Entry;
/** Steps one intent can take: idle → planned → written → idle. */
exports.STEPS_PER_INTENT = 3;
// A rewrite that changes nothing: one empty hunk at the top, so the intent
// names a site (every rewrite does) and the file is written unchanged.
exports.UNCHANGED = [{ span: (0, span_1.toByteSpan)(0, 0), text: '' }];
// The hunks from `bytes` to `text`: the code patch between them (its bounds
// and its coarsening past the diff budget are shared/engine/codePatch.ts's). The
// bytes' own text is the bytes themselves: UNCHANGED.
function rewriteHunks(bytes, text) {
    const decoded = (0, span_1.decodeUtf8)(bytes);
    if (!decoded.ok) {
        return (0, result_1.err)('write-failed'); // Not text: a writer's text cannot be diffed with it.
    }
    const patch = (0, codePatch_1.diffCodePatch)(decoded.value, text);
    if (!patch.ok) {
        return (0, result_1.err)(patch.error);
    }
    if (patch.value.length === 0) {
        return (0, result_1.ok)(exports.UNCHANGED);
    }
    return (0, result_1.ok)(patch.value.map((hunk) => ({ span: hunk.span, text: hunk.text })));
}
// What lies between an edit's authored bytes and the bytes on disk now.
function editHistory(authored, current, chain) {
    if (authored === current) {
        return 'unchanged';
    }
    return chain === undefined ? 'outside' : 'own-commits';
}
// Every byte an actor's entry keeps: its snapshot and the retained ones.
function entryBytes(entry) {
    const current = entry.state.snapshot?.bytes.length ?? 0;
    return entry.retained.reduce((total, snapshot) => total + snapshot.bytes.length, current);
}
// Canonical keys compare by UTF-16 code unit: a total order that does not
// depend on the locale, so every process takes a batch's actors in one order.
function compareKeys(left, right) {
    if (left < right) {
        return -1;
    }
    return left === right ? 0 : 1;
}
