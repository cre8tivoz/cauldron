"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.planRenameBinding = planRenameBinding;
exports.planRewriteNode = planRewriteNode;
exports.planFrontmatterSlot = planFrontmatterSlot;
exports.planInsertFrontmatter = planInsertFrontmatter;
exports.planCodePatch = planCodePatch;
exports.planRevertSplices = planRevertSplices;
exports.planRewriteText = planRewriteText;
// Planning the operations that name byte ranges directly (plan §3.3): a loop
// rename's sites, a frontmatter slot, a code patch's hunks, a revert's hunks,
// a node rewrite's hunks (step 9), a new frontmatter block and a program's
// text rewrite (step 10). The ranges were authored
// against the intent's own snapshot; stale ones are mapped through the diff
// with the region they sit in, and only exactly.
const assert_1 = require("../core/assert");
const limits_1 = require("../core/limits");
const planSupport_1 = require("./planSupport");
const result_1 = require("../core/result");
const span_1 = require("../core/span");
/** Bytes of context each side of a hunk when it is mapped through the diff.
 * A hunk of a few bytes (`Old`, a closing brace) repeats everywhere, and the
 * mapper refuses repeated bytes; with its neighbourhood it is usually unique.
 * The trade is the patch tool's: more context resolves more hunks and rejects
 * more of those whose neighbourhood someone else edited. */
const HUNK_CONTEXT_BYTES = 64;
/** A loop rename (multi-span): every site holds the old name, as a whole
 * identifier, inside the loop the anchor resolves to. */
function planRenameBinding(context, anchor, operation) {
    const resolved = (0, planSupport_1.resolveTarget)(context, anchor);
    if (!resolved.ok) {
        return resolved;
    }
    const target = resolved.value;
    if (!(0, planSupport_1.nodeEditable)(target.current)) {
        return (0, result_1.err)('unsupported-operation'); // Code the engine keeps verbatim.
    }
    const from = (0, span_1.encodeUtf8)(operation.from);
    const splices = [];
    for (const site of operation.sites) {
        // The whole loop is the identity region, so every site in it moved whole.
        const moved = (0, span_1.toByteSpan)(site.start + target.shift, site.end + target.shift);
        const held = (0, planSupport_1.slice)(context.current.bytes, moved);
        if (!(0, span_1.byteStringsEqual)(held, from)) {
            return (0, result_1.err)('anchor-moved'); // The client named a site that is not the name.
        }
        if (!wholeIdentifier(context.current.bytes, moved)) {
            return (0, result_1.err)('anchor-moved');
        }
        splices.push({ range: moved, expectedBytes: held, replacementBytes: (0, span_1.encodeUtf8)(operation.to) });
    }
    const postKinds = [{ path: target.current.path, kind: target.current.kind }];
    return (0, result_1.ok)({ splices, postKinds, candidate: 'must-parse' });
}
/** A node rewrite (step 9): hunks inside one node, stated against its authored
 * bytes. The node is found again through its identity region and must hold
 * exactly the bytes it was authored with — the hunks were computed from the
 * whole node's text, so any change inside it is someone else's edit, refused
 * rather than merged — and then every hunk moved with it. */
function planRewriteNode(context, anchor, operation) {
    const resolved = (0, planSupport_1.resolveTarget)(context, anchor);
    if (!resolved.ok) {
        return resolved;
    }
    const target = resolved.value;
    if (!(0, planSupport_1.nodeRewriteable)(target.current)) {
        return (0, result_1.err)('unsupported-operation');
    }
    if (!(0, planSupport_1.nodeUnchanged)(context, target)) {
        return (0, result_1.err)('region-externally-modified');
    }
    const shift = target.current.span.start - target.authored.span.start;
    (0, assert_1.assert)(shift === target.shift, 'An unchanged node moved with its identity region');
    const splices = operation.hunks.map((hunk) => {
        const moved = (0, span_1.toByteSpan)(hunk.span.start + shift, hunk.span.end + shift);
        const splice = spliceAt(context.current.bytes, moved, hunk.text);
        (0, assert_1.assert)((0, span_1.byteStringsEqual)(splice.expectedBytes, (0, planSupport_1.slice)(context.authored.bytes, hunk.span)), 'A rewritten range holds its authored bytes');
        return splice;
    });
    (0, assert_1.assert)((0, span_1.spansAscending)(splices.map((splice) => splice.range)), 'Moved hunks keep their order');
    return (0, result_1.ok)({ splices, postKinds: [], candidate: 'must-parse' });
}
/** A frontmatter slot: the fenced block must be the one authored, found again
 * whole, and the slot inside it holds the authored bytes. */
function planFrontmatterSlot(context, anchor, operation) {
    const projections = (0, planSupport_1.validProjections)(context);
    if (!projections.ok) {
        return projections;
    }
    const authored = projections.value.authored.frontmatter;
    if (authored === undefined) {
        return (0, result_1.err)('anchor-moved');
    }
    if (!(0, planSupport_1.sameSpan)(authored, anchor.span)) {
        return (0, result_1.err)('anchor-moved');
    }
    const mapped = context.mapSpan(authored);
    switch (mapped.tag) {
        case 'resolved': {
            const current = projections.value.current.frontmatter;
            if (current === undefined) {
                return (0, result_1.err)('anchor-moved');
            }
            if (!(0, planSupport_1.sameSpan)(current, mapped.span)) {
                return (0, result_1.err)('anchor-moved');
            }
            const shift = mapped.span.start - authored.start;
            const slot = (0, span_1.toByteSpan)(operation.slot.start + shift, operation.slot.end + shift);
            const splice = spliceAt(context.current.bytes, slot, operation.text);
            return (0, result_1.ok)({ splices: [splice], postKinds: [], candidate: 'must-parse' });
        }
        case 'ambiguous':
            return (0, result_1.err)('anchor-ambiguous');
        case 'gone':
            return (0, result_1.err)('region-externally-modified');
        case 'too-costly':
            return (0, result_1.err)('resource-limit');
        default: {
            const exhaustive = mapped;
            return exhaustive;
        }
    }
}
/** `insert-frontmatter` (step 10): the block of a page that has none, at its
 * top — after a byte-order mark, which opens the file, not the block. A block
 * in either version means the edit that stated a new one is not about this
 * file any more: refused. */
function planInsertFrontmatter(context, anchor, operation) {
    (0, assert_1.assert)(anchor.expectedKind === 'document', 'A new frontmatter block anchors the document');
    const projections = (0, planSupport_1.validProjections)(context);
    if (!projections.ok) {
        return projections;
    }
    if (projections.value.authored.frontmatter !== undefined) {
        return (0, result_1.err)('anchor-moved');
    }
    if (projections.value.current.frontmatter !== undefined) {
        return (0, result_1.err)('anchor-moved');
    }
    const bytes = context.current.bytes;
    const at = hasByteOrderMark(bytes) ? 3 : 0;
    const splice = spliceAt(bytes, (0, span_1.toByteSpan)(at, at), operation.source);
    (0, assert_1.assert)(splice.expectedBytes.length === 0, 'A new block replaces nothing');
    return (0, result_1.ok)({ splices: [splice], postKinds: [], candidate: 'must-parse' });
}
function hasByteOrderMark(bytes) {
    if (bytes[0] === 0xef) {
        if (bytes[1] === 0xbb) {
            return bytes[2] === 0xbf;
        }
    }
    return false;
}
/** A code patch (the code editor from step 8; a stylesheet rule at step 6):
 * text may leave the file invalid (plan §3.6); a stale hunk that cannot be
 * found whole is a merge conflict. */
function planCodePatch(context, anchor, operation) {
    return planHunks(context, anchor, operation.hunks, {
        stale: 'merge-conflict',
        candidate: 'may-be-invalid',
    });
}
/** Undo's inverse (plan §11 step 6): the hunks restore bytes an applied intent
 * replaced. They were authored against the bytes that intent left, so an
 * outside edit since maps through the diff or rejects — it is never reverted.
 * A file that parsed when the intent applied must still parse after. */
function planRevertSplices(context, anchor, operation) {
    const parsed = context.authored.projection.tag === 'valid';
    return planHunks(context, anchor, operation.hunks, {
        stale: 'region-externally-modified',
        candidate: parsed ? 'must-parse' : 'may-be-invalid',
    });
}
/** `rewrite-text` (step 10, replacing the whole-file `replace-source`): a
 * program's change to a file's text as hunks of the bytes it read — a
 * stylesheet rule, a CMS entry, a property batch. It never maps: its witness
 * is the authored checksum itself, so any change since it was read is a
 * rejection, and every hunk is written at its own range with its authored
 * bytes as the witness. The result may not parse — a raw page, a stylesheet —
 * so the candidate is not required to. Agrees exactly with the step-1
 * reference (test/simulator/referencePlanner.ts). */
function planRewriteText(context, anchor, operation) {
    (0, assert_1.assert)(anchor.expectedKind === 'document', 'A rewrite anchors the whole document');
    (0, assert_1.assert)(anchor.span.start === 0, 'A document anchor starts at byte 0');
    if (context.current.checksum !== context.authored.checksum) {
        return (0, result_1.err)('region-externally-modified');
    }
    if (anchor.span.end !== context.current.bytes.length) {
        return (0, result_1.err)('anchor-moved'); // The anchor names bytes of another length.
    }
    const bytes = context.current.bytes;
    const splices = operation.hunks.map((hunk) => spliceAt(bytes, hunk.span, hunk.text));
    (0, assert_1.assert)(splices.length <= limits_1.LIMITS.splicesPerIntentMax, 'A rewrite fits one intent');
    return (0, result_1.ok)({ splices, postKinds: [], candidate: 'may-be-invalid' });
}
function planHunks(context, anchor, hunks, policy) {
    (0, assert_1.assert)(anchor.expectedKind === 'document', 'Hunks anchor the whole document');
    const authored = context.authored.bytes;
    if (anchor.span.end !== authored.length) {
        return (0, result_1.err)('anchor-moved'); // The anchor names bytes of another length.
    }
    const fresh = context.authored.checksum === context.current.checksum;
    const splices = [];
    for (const hunk of hunks) {
        const mapped = fresh ? (0, result_1.ok)(hunk.span) : mapHunk(context, hunk.span, policy.stale);
        if (!mapped.ok) {
            return mapped;
        }
        const splice = spliceAt(context.current.bytes, mapped.value, hunk.text);
        // The witness: what the hunk replaces is what it replaced when authored.
        (0, assert_1.assert)((0, span_1.byteStringsEqual)(splice.expectedBytes, (0, planSupport_1.slice)(authored, hunk.span)), 'A mapped hunk holds its authored bytes');
        splices.push(splice);
    }
    if (!(0, span_1.spansAscending)(splices.map((splice) => splice.range))) {
        return (0, result_1.err)(policy.stale); // Mapped hunks crossed: not the patch that was written.
    }
    return (0, result_1.ok)({ splices, postKinds: [], candidate: policy.candidate });
}
// A hunk with up to HUNK_CONTEXT_BYTES of neighbourhood each side, mapped as
// one region; the hunk sits at the same offset inside it.
function mapHunk(context, span, stale) {
    const length = context.authored.bytes.length;
    const region = (0, span_1.toByteSpan)(Math.max(0, span.start - HUNK_CONTEXT_BYTES), Math.min(length, span.end + HUNK_CONTEXT_BYTES));
    if (region.start === region.end) {
        return (0, result_1.err)(stale); // An empty file has no neighbourhood to find.
    }
    const mapped = context.mapSpan(region);
    switch (mapped.tag) {
        case 'resolved': {
            const shift = mapped.span.start - region.start;
            return (0, result_1.ok)((0, span_1.toByteSpan)(span.start + shift, span.end + shift));
        }
        case 'ambiguous':
        case 'gone':
            return (0, result_1.err)(stale);
        case 'too-costly':
            return (0, result_1.err)('resource-limit');
        default: {
            const exhaustive = mapped;
            return exhaustive;
        }
    }
}
function wholeIdentifier(bytes, span) {
    const before = bytes[span.start - 1];
    const after = bytes[span.end];
    if (before !== undefined) {
        if (identifierByte(before) || before === 0x2e) {
            return false; // `x.item` is a property, not the loop's item.
        }
    }
    if (after !== undefined) {
        return !identifierByte(after);
    }
    return true;
}
function identifierByte(byte) {
    if (byte >= 0x30 && byte <= 0x39) {
        return true;
    }
    if (byte >= 0x41 && byte <= 0x5a) {
        return true;
    }
    if (byte >= 0x61 && byte <= 0x7a) {
        return true;
    }
    return byte === 0x5f || byte === 0x24 || byte >= 0x80;
}
function spliceAt(bytes, range, replacement) {
    return {
        range,
        expectedBytes: (0, planSupport_1.slice)(bytes, range),
        replacementBytes: (0, span_1.encodeUtf8)(replacement),
    };
}
