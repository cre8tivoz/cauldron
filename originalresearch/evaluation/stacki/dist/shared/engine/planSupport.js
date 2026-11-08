"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validProjections = validProjections;
exports.resolveTarget = resolveTarget;
exports.writtenAsTag = writtenAsTag;
exports.identityRegion = identityRegion;
exports.isTagKind = isTagKind;
exports.tagNameEnd = tagNameEnd;
exports.openTagEnd = openTagEnd;
exports.closeTagStart = closeTagStart;
exports.nodeAtPath = nodeAtPath;
exports.parentPath = parentPath;
exports.blankText = blankText;
exports.siblingsOf = siblingsOf;
exports.subtreeOf = subtreeOf;
exports.ancestorsOf = ancestorsOf;
exports.startsWith = startsWith;
exports.samePath = samePath;
exports.sameSpan = sameSpan;
exports.slice = slice;
exports.nodeUnchanged = nodeUnchanged;
exports.textOf = textOf;
exports.byteOffsetsIn = byteOffsetsIn;
exports.isWhitespace = isWhitespace;
exports.whitespaceBefore = whitespaceBefore;
exports.whitespaceAfter = whitespaceAfter;
exports.containsNewline = containsNewline;
exports.lineIndent = lineIndent;
exports.nodePlaceable = nodePlaceable;
exports.nodeEditable = nodeEditable;
exports.nodeRewriteable = nodeRewriteable;
// What every operation's planner needs (plan §5.2 steps 2–4): resolving an
// anchor in the bytes it was authored against, mapping it to the bytes on disk
// now, and reading the source around the node it names. Pure, like the planner
// that calls it — bytes and projections in, values out.
//
// Resolution generalizes the step-2 rule for `set-attribute` (planner.ts, its
// header says why): a node is identified by its identity region — for a tag,
// the name through the last attribute; for anything else, the whole node —
// mapped through the diff. The mapper never guesses, and a region whose bytes
// repeat in the file is ambiguous (planner.ts, uniqueOrAmbiguous), so a
// resolved node is the node the intent was authored against, moved whole.
const assert_1 = require("../core/assert");
const capability_1 = require("../page/capability");
const limits_1 = require("../core/limits");
const result_1 = require("../core/result");
const span_1 = require("../core/span");
const brand_1 = require("../core/brand");
const TAG_OPEN = 0x3c; // `<`
const TAG_CLOSE = 0x3e; // `>`
const SLASH = 0x2f; // `/`
const NEWLINE = 0x0a;
/** Both projections, when both parse; a visual intent needs both. */
function validProjections(context) {
    const authored = context.authored.projection;
    const current = context.current.projection;
    if (current.tag === 'parse-error') {
        return (0, result_1.err)('source-invalid'); // Fix it in code first, stale or not.
    }
    if (authored.tag === 'parse-error') {
        return (0, result_1.err)('source-invalid'); // No node was ever there to anchor.
    }
    return (0, result_1.ok)({ authored, current });
}
/** Resolve a node anchor in the authored bytes, then find the same node in the
 * current bytes through its identity region. Every rejection of resolution is
 * decided here, so each operation starts from a node known to be the one the
 * intent named. Capabilities are the operation's to check. */
function resolveTarget(context, anchor) {
    const projections = validProjections(context);
    if (!projections.ok) {
        return projections;
    }
    const authored = nodeAtPath(projections.value.authored, anchor.path);
    if (authored === undefined) {
        return (0, result_1.err)('anchor-moved');
    }
    if (authored.kind !== anchor.expectedKind) {
        return (0, result_1.err)('anchor-moved');
    }
    if (!sameSpan(authored.span, anchor.span)) {
        return (0, result_1.err)('anchor-moved');
    }
    const region = identityRegion(context.authored.bytes, authored);
    const mapped = context.mapSpan(region);
    switch (mapped.tag) {
        case 'resolved': {
            // The consumer side of the mapper's postcondition: a region moves whole.
            (0, assert_1.assert)(mapped.span.end - mapped.span.start === region.end - region.start, 'A resolved region keeps its length');
            const shift = mapped.span.start - region.start;
            return currentTarget(context, projections.value.current, authored, mapped.span, shift);
        }
        case 'ambiguous':
            return (0, result_1.err)('anchor-ambiguous');
        case 'gone':
            return (0, result_1.err)('anchor-moved');
        case 'too-costly':
            return (0, result_1.err)('resource-limit');
        default: {
            const exhaustive = mapped;
            return exhaustive;
        }
    }
}
// The mapped bytes are the authored identity region; the node found there must
// still parse as it — the context can change around unchanged bytes (a comment
// opened above turns an element into comment text).
function currentTarget(context, current, authored, mappedRegion, shift) {
    const start = authored.span.start + shift;
    const found = current.nodes.filter((node) => node.span.start === start && node.kind === authored.kind);
    const [node, ...others] = found.length > 1 ? atDepthOf(found, authored) : found;
    if (node === undefined) {
        return (0, result_1.err)(found.length > 1 ? 'anchor-ambiguous' : 'anchor-moved');
    }
    if (others.length > 0) {
        return (0, result_1.err)('anchor-ambiguous');
    }
    if (!sameSpan(identityRegion(context.current.bytes, node), mappedRegion)) {
        return (0, result_1.err)('anchor-moved');
    }
    // The same bytes can mean a different node once the file around them changed:
    // an element someone wrapped in a loop outside Stacki is now one source node
    // rendered many times, and an edit authored against one element would change
    // every copy. What the user saw is the authored capability; a different one
    // now is a change they have not seen (step 7).
    if (node.capability !== authored.capability) {
        return (0, result_1.err)('region-externally-modified');
    }
    return (0, result_1.ok)({ authored, current: node, shift });
}
// A tag opens one element: two same-kind nodes cannot start on one byte,
// except a node and its own first descendant of the same kind. A text-only
// span could share one; a Markdown list always shares its first line with its
// first item (step 10). One holds the other, so they differ in depth: the node
// at the anchor's depth is the one it named, and anything else is refused
// rather than chosen.
function atDepthOf(found, authored) {
    (0, assert_1.assert)(found.length > 1, 'Only several candidates need their depth compared');
    return found.filter((node) => node.path.length === authored.path.length);
}
/** Whether a node is written as a tag: an element, component or raw block of
 * markup. A Markdown block has no tag — a paragraph, a heading, a list — and
 * the attributes Markdown writes (an image's alt) are its own syntax. */
function writtenAsTag(node) {
    if (node.syntax === 'markup') {
        return isTagKind(node.kind);
    }
    return false;
}
/** For a tag with attributes, the name through the end of the last one; for
 * anything else — a bare tag included — the whole node. A bare tag's name is
 * shared by every tag of that name (`p`), so alone it identifies nothing; its
 * bytes with its content usually do, at the price of refusing a stale intent
 * whose node someone edited inside. The first byte of a tag is its `<`. A
 * Markdown block is its whole node: it has no name to start from. */
function identityRegion(bytes, node) {
    if (writtenAsTag(node)) {
        (0, assert_1.assert)(bytes[node.span.start] === TAG_OPEN, 'A tag opens with `<`');
        const nameEnd = tagNameEnd(bytes, node);
        const end = node.attributes.reduce((last, attribute) => Math.max(last, attribute.span.end), nameEnd);
        (0, assert_1.assert)(end <= node.span.end, 'Attributes lie inside their node');
        if (end > nameEnd) {
            return (0, span_1.toByteSpan)(node.span.start + 1, end);
        }
    }
    (0, assert_1.assert)(node.span.start < node.span.end, 'A projected node covers at least one byte');
    return node.span;
}
function isTagKind(kind) {
    switch (kind) {
        case 'element':
        case 'component':
        case 'raw':
            return true;
        case 'text':
        case 'expr':
        case 'raw-line':
        case 'comment':
        case 'map':
        case 'cond':
        case 'branch':
        case 'chunk-group':
            return false;
        default: {
            const exhaustive = kind;
            return exhaustive;
        }
    }
}
/** One past the tag name: the name runs to the first whitespace, `/` or `>`.
 * A shorthand fragment `<>` has none: its name ends where it starts. */
function tagNameEnd(bytes, node) {
    let index = node.span.start + 1;
    while (index < node.span.end) {
        const byte = bytes[index];
        (0, assert_1.assert)(byte !== undefined, 'The tag lies inside the bytes');
        if (isWhitespace(byte) || byte === SLASH || byte === TAG_CLOSE) {
            break;
        }
        index++;
    }
    // `<>` is a shorthand fragment: a tag without a name.
    return index;
}
/** One past the `>` that ends a tag's opening, and whether it closes itself. */
function openTagEnd(bytes, node) {
    (0, assert_1.assert)(isTagKind(node.kind), 'Only a tag has an opening tag');
    // Past the name and every attribute: a `>` inside a quoted value is not it.
    let index = node.attributes.reduce((last, attribute) => Math.max(last, attribute.span.end), tagNameEnd(bytes, node));
    while (index < node.span.end) {
        const byte = bytes[index];
        (0, assert_1.assert)(byte !== undefined, 'The tag lies inside the bytes');
        if (byte === TAG_CLOSE) {
            return { end: index + 1, selfClosing: bytes[index - 1] === SLASH };
        }
        index++;
    }
    throw new Error('Assertion failed: an opening tag ends with `>` inside its node');
}
/** Where a paired tag's closing tag starts: the last `</` inside the node. */
function closeTagStart(bytes, node, from) {
    for (let index = node.span.end - 2; index >= from; index--) {
        if (bytes[index] === TAG_OPEN) {
            if (bytes[index + 1] === SLASH) {
                return index;
            }
        }
    }
    return undefined;
}
function nodeAtPath(projection, path) {
    (0, assert_1.assert)(projection.nodes.length <= limits_1.LIMITS.treeNodesMax, 'The projection is inside its bound');
    return projection.nodes.find((candidate) => samePath(candidate.path, path));
}
/** A node's parent path; the root list's is empty. */
function parentPath(path) {
    (0, assert_1.assert)(path.length > 0, 'A tree node has a path');
    return path.slice(0, -1);
}
/** Whether a node is a text node of whitespace alone: the parser keeps the
 * line breaks between root nodes as text, and they separate, not content. */
function blankText(bytes, node) {
    if (node.kind !== 'text') {
        return false;
    }
    for (let index = node.span.start; index < node.span.end; index++) {
        const byte = bytes[index];
        (0, assert_1.assert)(byte !== undefined, 'A text node lies inside the bytes');
        if (!isWhitespace(byte)) {
            return false;
        }
    }
    return true;
}
/** The node's siblings in document order, itself included. */
function siblingsOf(projection, node) {
    const parent = parentPath(node.path);
    return projection.nodes.filter((candidate) => candidate.path.length === node.path.length && startsWith(candidate.path, parent));
}
/** The nodes of the subtree rooted at `node`, itself first, in document order. */
function subtreeOf(projection, node) {
    return projection.nodes.filter((candidate) => startsWith(candidate.path, node.path));
}
/** Proper ancestors, outermost first. */
function ancestorsOf(projection, path) {
    const found = [];
    for (let depth = 1; depth < path.length; depth++) {
        const ancestor = nodeAtPath(projection, path.slice(0, depth));
        (0, assert_1.assert)(ancestor !== undefined, 'Every ancestor of a projected node is projected');
        found.push(ancestor);
    }
    return found;
}
function startsWith(path, prefix) {
    if (prefix.length <= path.length) {
        return prefix.every((step, index) => step === path[index]);
    }
    return false;
}
function samePath(left, right) {
    if (left.length === right.length) {
        return startsWith(left, right);
    }
    return false;
}
function sameSpan(left, right) {
    if (left.start === right.start) {
        return left.end === right.end;
    }
    return false;
}
function slice(bytes, span) {
    (0, assert_1.assert)(span.end <= bytes.length, 'A sliced span lies inside the bytes');
    return (0, span_1.toByteString)(bytes.subarray(span.start, span.end));
}
/** The node's bytes are the ones it was authored with: a remove or a move
 * takes the whole node, so a change anywhere inside it is someone else's. */
function nodeUnchanged(context, target) {
    const authored = slice(context.authored.bytes, target.authored.span);
    return (0, span_1.byteStringsEqual)(authored, slice(context.current.bytes, target.current.span));
}
/** The text of a span. Spans come from the parser's code-point boundaries, so
 * the slice is valid UTF-8 whenever the file is. */
function textOf(bytes, span) {
    const decoded = (0, span_1.decodeUtf8)(slice(bytes, span));
    (0, assert_1.assert)(decoded.ok, 'A projected span decodes');
    return decoded.value;
}
/** Byte offsets, relative to the text's start, of ascending UTF-16 offsets. */
function byteOffsetsIn(text, offsets) {
    return (0, span_1.utf16ToByteOffsets)(text, offsets.map((offset) => (0, brand_1.toUtf16Offset)(offset)));
}
function isWhitespace(byte) {
    switch (byte) {
        case 0x20:
        case 0x09:
        case 0x0a:
        case 0x0d:
            return true;
        default:
            return false;
    }
}
/** Where the run of whitespace ending at `end` starts, no earlier than `floor`. */
function whitespaceBefore(bytes, end, floor) {
    let index = end;
    while (index > floor) {
        const byte = bytes[index - 1];
        (0, assert_1.assert)(byte !== undefined, 'The scan lies inside the bytes');
        if (!isWhitespace(byte)) {
            break;
        }
        index--;
    }
    return index;
}
/** Where the run of whitespace starting at `start` ends, no later than `ceiling`. */
function whitespaceAfter(bytes, start, ceiling) {
    let index = start;
    while (index < ceiling) {
        const byte = bytes[index];
        (0, assert_1.assert)(byte !== undefined, 'The scan lies inside the bytes');
        if (!isWhitespace(byte)) {
            break;
        }
        index++;
    }
    return index;
}
function containsNewline(bytes, span) {
    return bytes.subarray(span.start, span.end).includes(NEWLINE);
}
/** The indentation of the line holding `offset`: its leading spaces and tabs. */
function lineIndent(bytes, offset) {
    let lineStart = offset;
    while (lineStart > 0) {
        if (bytes[lineStart - 1] === NEWLINE) {
            break;
        }
        lineStart--;
    }
    let index = lineStart;
    while (index < offset) {
        const byte = bytes[index];
        if (byte === 0x20 || byte === 0x09) {
            index++;
        }
        else {
            break;
        }
    }
    return textOf(bytes, (0, span_1.toByteSpan)(lineStart, index));
}
/** Whether a node may be taken out, put back or stood beside whole. Its own
 * content may be code the editor does not read (an expression, a `<style>`,
 * `set:html`); the list it sits in is still plain markup. A node a loop
 * repeats, or one assembled from another file, is not. */
function nodePlaceable(node) {
    switch (node.capability) {
        case 'editable':
        case 'read-only-opaque':
            return true;
        case 'repeated-source-node':
        case 'runtime-aggregate':
        case 'unsupported':
            return false;
        default: {
            const exhaustive = node.capability;
            return exhaustive;
        }
    }
}
/** Whether visual intents may edit this node. A node repeated by a loop is
 * one source node shown many times (plan §6): since step 7 the canvas addresses
 * that source node, and an edit of it changes every copy. Only a move may take
 * one out of its loop (planTree.ts); nothing is placed beside it. */
function nodeEditable(node) {
    return (0, capability_1.capabilityAcceptsVisualIntent)(node.capability);
}
/** A replacement changes only hunks proven to belong to one source node, so
 * it can safely carry visual edits through syntax whose contents stay opaque. */
function nodeRewriteable(node) {
    return (0, capability_1.capabilityAcceptsNodeRewrite)(node.capability);
}
