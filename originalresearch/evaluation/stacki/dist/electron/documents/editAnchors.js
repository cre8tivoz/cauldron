"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.pageFormat = pageFormat;
exports.resolveRef = resolveRef;
exports.byteSpanOf = byteSpanOf;
exports.splitsPair = splitsPair;
exports.placedHunks = placedHunks;
exports.shiftedHunks = shiftedHunks;
exports.frontmatterSlot = frontmatterSlot;
// What both of main's intent front ends share (editRequests.ts for .astro and
// markup, markdownEdits.ts for Markdown; plan §2 layer 3): the snapshot an
// edit names, the check that a renderer's node reference is a node of those
// bytes, and the placement of a printer's change on a node's own bytes.
//
// The renderer names a node by the path, kind and UTF-16 range of the parse it
// shows. Main's projection of the same bytes must agree on all three before
// the reference becomes an anchor; a mismatch means the renderer's parse is
// not of these bytes, and the edit is refused as moved — never guessed.
const assert_1 = require("../../shared/core/assert");
const brand_1 = require("../../shared/core/brand");
const codePatch_1 = require("../../shared/engine/codePatch");
const diff_1 = require("../../shared/engine/diff");
const mapSpan_1 = require("../../shared/engine/mapSpan");
const planSupport_1 = require("../../shared/engine/planSupport");
const ref_1 = require("../../shared/page/ref");
const result_1 = require("../../shared/core/result");
const span_1 = require("../../shared/core/span");
function pageFormat(file) {
    if (/\.mdx$/i.test(file)) {
        return 'mdx';
    }
    return /\.md$/i.test(file) ? 'md' : 'astro';
}
/** The renderer's node reference, checked against the projection of the same
 * bytes: the node at that path must have that kind and that range. */
function resolveRef(authored, ref) {
    const node = (0, planSupport_1.nodeAtPath)(authored.projection, ref.path.map(ref_1.toChildIndex));
    if (node === undefined) {
        return (0, result_1.err)('anchor-moved');
    }
    if (node.kind !== ref.kind) {
        return (0, result_1.err)('anchor-moved');
    }
    const span = byteSpanOf(authored.text, ref.span.start, ref.span.end);
    if (span === undefined) {
        return (0, result_1.err)('anchor-moved');
    }
    if (span.start !== node.span.start || span.end !== node.span.end) {
        return (0, result_1.err)('anchor-moved');
    }
    const anchor = (0, ref_1.toAnchorRef)({ span, path: node.path, expectedKind: node.kind });
    return (0, result_1.ok)({ anchor, node });
}
/** UTF-16 offsets from the wire: inside the text and on code-point
 * boundaries, or no span at all. */
function byteSpanOf(text, start, end) {
    if (end > text.length) {
        return undefined;
    }
    if (splitsPair(text, start) || splitsPair(text, end)) {
        return undefined;
    }
    const [first, last] = (0, span_1.utf16ToByteOffsets)(text, [(0, brand_1.toUtf16Offset)(start), (0, brand_1.toUtf16Offset)(end)]);
    (0, assert_1.assert)(first !== undefined, 'The start was converted');
    (0, assert_1.assert)(last !== undefined, 'The end was converted');
    return (0, span_1.toByteSpan)(first, last);
}
/** Whether a UTF-16 offset falls between the halves of a surrogate pair. */
function splitsPair(text, offset) {
    if (offset === 0 || offset >= text.length) {
        return false;
    }
    const before = text.charCodeAt(offset - 1);
    const at = text.charCodeAt(offset);
    return before >= 0xd800 && before <= 0xdbff && at >= 0xdc00 && at <= 0xdfff;
}
/** The printer's change from `before` to `after`, as hunks of `own` — the
 * node's bytes. Equal renderings mean the printer and the bytes agree, and
 * the change applies as it is; otherwise each hunk is placed on `own` through
 * the diff from `before`, and a hunk the formatting itself changed has no
 * place: refused, never reprinted. */
function placedHunks(before, after, own) {
    const change = (0, codePatch_1.diffCodePatch)(before, after);
    if (!change.ok) {
        return change;
    }
    if (change.value.length === 0) {
        return (0, result_1.err)('unsupported-operation'); // The gesture changed nothing the printer writes.
    }
    if (before === own) {
        return (0, result_1.ok)(change.value.map((hunk) => ({ span: hunk.span, text: hunk.text })));
    }
    const diff = (0, diff_1.diffBytes)((0, span_1.encodeUtf8)(before), (0, span_1.encodeUtf8)(own), diff_1.DIFF_BUDGET);
    if (diff.tag === 'too-costly') {
        return (0, result_1.err)('resource-limit');
    }
    const placed = [];
    for (const hunk of change.value) {
        const span = placedSpan(diff.diff, hunk.span);
        if (span === undefined) {
            return (0, result_1.err)('unsupported-operation');
        }
        placed.push({ span, text: hunk.text });
    }
    if (!(0, span_1.spansAscending)(placed.map((hunk) => hunk.span))) {
        return (0, result_1.err)('unsupported-operation');
    }
    return (0, result_1.ok)(placed);
}
// A range of the rendering on the node's bytes: its own bytes kept whole, or,
// for an insertion, a neighbouring byte kept whole beside it.
function placedSpan(diff, span) {
    if (span.start < span.end) {
        const mapped = (0, mapSpan_1.mapSpanThroughDiff)(diff, span);
        return mapped.tag === 'resolved' ? mapped.span : undefined;
    }
    if (span.start > 0) {
        const before = (0, mapSpan_1.mapSpanThroughDiff)(diff, (0, span_1.toByteSpan)(span.start - 1, span.start));
        if (before.tag === 'resolved') {
            return (0, span_1.toByteSpan)(before.span.end, before.span.end);
        }
    }
    if (span.start < diff.source.length) {
        const after = (0, mapSpan_1.mapSpanThroughDiff)(diff, (0, span_1.toByteSpan)(span.start, span.start + 1));
        if (after.tag === 'resolved') {
            return (0, span_1.toByteSpan)(after.span.start, after.span.start);
        }
    }
    return undefined;
}
/** Hunks of a node's own text moved to the file: shifted by where the node
 * starts. */
function shiftedHunks(hunks, start) {
    return hunks.map((hunk) => ({
        span: (0, span_1.toByteSpan)(hunk.span.start + start, hunk.span.end + start),
        text: hunk.text,
    }));
}
/** A frontmatter block's new text as the slot where it differs from the block
 * on disk: the common start and end are kept, whole code points only. */
function frontmatterSlot(block, before, printed) {
    let prefix = 0;
    const shorter = Math.min(before.length, printed.length);
    while (prefix < shorter && before.charCodeAt(prefix) === printed.charCodeAt(prefix)) {
        prefix++;
    }
    let suffix = 0;
    while (suffix < shorter - prefix && before.charCodeAt(before.length - 1 - suffix) === printed.charCodeAt(printed.length - 1 - suffix)) {
        suffix++;
    }
    // Whole code points only: a boundary inside a pair moves out of it.
    if (splitsPair(before, prefix) || splitsPair(printed, prefix)) {
        prefix--;
    }
    if (splitsPair(before, before.length - suffix) || splitsPair(printed, printed.length - suffix)) {
        suffix--;
    }
    const slot = byteSpanOf(before, prefix, before.length - suffix);
    (0, assert_1.assert)(slot !== undefined, 'The slot lies inside the block on code-point boundaries');
    const shifted = (0, span_1.toByteSpan)(block.start + slot.start, block.start + slot.end);
    return { slot: shifted, text: printed.slice(prefix, printed.length - suffix) };
}
