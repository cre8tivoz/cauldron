"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.previewEdit = previewEdit;
exports.previewEdits = previewEdits;
// A visual edit planned, not written (plan §7, §11.9): the page's unsaved
// gestures shown as text when the user reviews a conflicted page in code. The
// preview is the engine's own plan applied to bytes the renderer supplies — the
// bytes its gestures were stated against — so the text under review is exactly
// what the edits would have written: splices of the origin, never a reprint of
// the file (the no-whole-file-regeneration rule, eslint.config.mjs). Kept, that
// text is saved as a code patch of whatever the disk holds now (plan §3.6).
//
// Pure: no actor, no disk. The bytes stand for the file at `authoredChecksum`,
// and planning with nothing between authored and current is the planner's
// exact path.
const assert_1 = require("../../shared/core/assert");
const brand_1 = require("../../shared/core/brand");
const intent_1 = require("../../shared/engine/intent");
const planner_1 = require("../../shared/engine/planner");
const result_1 = require("../../shared/core/result");
const splice_1 = require("../../shared/engine/splice");
const documentActor_1 = require("../../shared/engine/documentActor");
const rebase_1 = require("../../shared/engine/rebase");
const documentDisk_1 = require("./documentDisk");
const editRequests_1 = require("./editRequests");
/** The bytes `edit` would leave, planned against `bytes` as the file at
 * `authoredChecksum`. A rejection is the planner's own, as `page:edit` would
 * have answered it over unchanged bytes. */
function previewEdit(file, bytes, authoredChecksum, edit) {
    const path = (0, brand_1.toFilePath)(file);
    const snapshot = documentDisk_1.NODE_PROJECTOR.snapshot(path, bytes);
    // The renderer states each request against the reply before it, whose bytes
    // it sends: a mismatch is a broken caller, not an operating failure.
    (0, assert_1.assert)(snapshot.checksum === authoredChecksum, 'A preview names the bytes it is sent');
    const draft = (0, editRequests_1.buildEditIntent)(edit, snapshot);
    if (!draft.ok) {
        return (0, result_1.err)(draft.error);
    }
    const id = (0, brand_1.toIntentId)('preview');
    const intent = (0, intent_1.toIntent)({ id, file: path, authoredChecksum, ...draft.value });
    const planned = (0, planner_1.planIntent)({ authored: snapshot, current: snapshot }, intent);
    if (!planned.ok) {
        return (0, result_1.err)(planned.error);
    }
    const splices = planned.value.splices;
    const after = (0, splice_1.applySplices)(snapshot.bytes, splices);
    const checksum = documentDisk_1.NODE_PROJECTOR.hash(after);
    const unchanged = checksum === authoredChecksum;
    (0, assert_1.assert)(splices.length > 0 || unchanged, 'No splices leave the bytes as they were');
    return (0, result_1.ok)({ bytes: after, checksum, inverse: (0, splice_1.inverseEdits)(splices) });
}
/** The bytes a batch of edits leaves, planned one after another in memory
 * against `bytes` as the file at `authoredChecksum`, so the batch can be
 * written once (page:editBatch). Two writes of one gesture let the dev server
 * render the page between them: a loop that reads `teamEntries` before the
 * declaration of `teamEntries` lands. Each edit is built and rebased exactly
 * as the actor would build and rebase it after the ones before it had been
 * committed, and its candidate is checked as a write would check it, so a
 * batch accepts nothing its edits would be refused alone. The first refusal
 * refuses the batch; nothing is written. */
function previewEdits(file, bytes, authoredChecksum, edits) {
    (0, assert_1.assert)(edits.length > 0, 'A batch holds at least one edit');
    const path = (0, brand_1.toFilePath)(file);
    const authored = documentDisk_1.NODE_PROJECTOR.snapshot(path, bytes);
    // The handler reads these bytes from the actor at that checksum.
    (0, assert_1.assert)(authored.checksum === authoredChecksum, 'A batch names the bytes it is planned on');
    let current = authored;
    const chain = [];
    for (let index = 0; index < edits.length; index++) {
        const edit = edits[index];
        (0, assert_1.assert)(edit !== undefined, 'Batch index is in bounds');
        const built = (0, editRequests_1.buildEdit)(edit, { authored, current, history: chain.length === 0 ? 'unchanged' : 'own-commits' });
        if (!built.ok) {
            return built;
        }
        const basis = built.value.basis === 'current' ? current : authored;
        const stated = (0, intent_1.toIntent)({ id: (0, brand_1.toIntentId)(`batch-${index}`), file: path, authoredChecksum: basis.checksum, ...built.value.draft });
        const intent = basis === current ? (0, result_1.ok)(stated) : (0, rebase_1.rebaseIntent)(stated, chain, current);
        if (!intent.ok) {
            return intent;
        }
        const planned = (0, planner_1.planIntent)({ authored: current, current }, intent.value);
        if (!planned.ok) {
            return planned;
        }
        const candidate = (0, documentActor_1.candidateOf)(path, current, planned.value, documentDisk_1.NODE_PROJECTOR);
        if (!candidate.ok) {
            return (0, result_1.err)(candidate.error.reason);
        }
        chain.push({ from: current.checksum, to: candidate.value.checksum, splices: planned.value.splices, relocation: planned.value.relocation });
        current = candidate.value;
    }
    (0, assert_1.assert)(chain.length === edits.length, 'Every edit of a batch was planned');
    return (0, result_1.ok)({ bytes: current.bytes, checksum: current.checksum });
}
