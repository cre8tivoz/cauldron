"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildEdit = buildEdit;
exports.buildEditIntent = buildEditIntent;
// The renderer's intent front end, main's half (plan §2 layer 3; step 6): an
// edit request, stated in the renderer's terms, becomes an intent against the
// snapshot it was authored against. Here the renderer's node references are
// checked against main's own projection of the same bytes, UTF-16 ranges
// become byte spans, new nodes and frontmatter are printed by the legacy
// printer, a node's new text is turned into hunks placed on its own bytes
// (step 9, `replace-node`), a visual fallback maps model-diff hunks onto the
// authored file (`replace-page`), and a loop rename's sites are found. Everything else is the
// planner's. A Markdown or MDX page's own nodes are drafted by
// markdownEdits.ts (step 10); its markup, and the operations the planner
// places alike in both — removals, moves, copies — are drafted here.
//
// On the .astro printer boundary (eslint.config.mjs) because it prints new
// nodes, frontmatter, and the before/after witnesses used to place fallback
// hunks on existing bytes. It
// outlived the compat adapter at step 9 (tracker, Step 9): the renderer names
// nodes by the path, kind and UTF-16 range of the parse it shows, and only main
// holds the bytes those become, so the translation stays here.
const assert_1 = require("../../shared/core/assert");
const intent_1 = require("../../shared/engine/intent");
const loopScope_1 = require("../../shared/engine/loopScope");
const planSupport_1 = require("../../shared/engine/planSupport");
const codePatch_1 = require("../../shared/engine/codePatch");
const htmlText_1 = require("../../shared/page/htmlText");
const pageNode_1 = require("../../shared/page/pageNode");
const ref_1 = require("../../shared/page/ref");
const result_1 = require("../../shared/core/result");
const span_1 = require("../../shared/core/span");
const astroParser_1 = require("../parse/astroParser");
const editAnchors_1 = require("./editAnchors");
const markdownEdits_1 = require("./markdownEdits");
/** The intent an edit is. Every edit is built against the snapshot it names,
 * except a frontmatter request after the app's own commits: it states the
 * whole block the model now describes, and that model already holds what
 * those commits did, so it is compared with the block on disk now — against
 * the authored block it would do their part a second time. */
function buildEdit(edit, base) {
    if (edit.tag === 'set-frontmatter') {
        if (base.history === 'own-commits') {
            const built = buildEditIntent(edit, base.current);
            return built.ok ? (0, result_1.ok)({ draft: built.value, basis: 'current' }) : built;
        }
    }
    const built = buildEditIntent(edit, base.authored);
    return built.ok ? (0, result_1.ok)({ draft: built.value, basis: 'authored' }) : built;
}
/** The intent an edit is, against the snapshot it names. */
function buildEditIntent(edit, snapshot) {
    const decoded = (0, span_1.decodeUtf8)(snapshot.bytes);
    (0, assert_1.assert)(decoded.ok, 'A page the renderer read decodes');
    if (edit.tag === 'revert') {
        return revertDraft(snapshot, edit.hunks);
    }
    if (edit.tag === 'code-patch') {
        return codePatchDraft(snapshot, edit.hunks); // Text, not nodes: a broken file takes it too.
    }
    const projection = snapshot.projection;
    if (projection.tag === 'parse-error') {
        return (0, result_1.err)('source-invalid');
    }
    const format = (0, editAnchors_1.pageFormat)(snapshot.path);
    const authored = { snapshot, text: decoded.value, projection, format };
    if (edit.tag === 'replace-page') {
        return format === 'astro' ? replacePageDraft(authored, edit.model) : (0, result_1.err)('unsupported-operation');
    }
    if (format !== 'astro') {
        // Markdown's own drafts first (markdownEdits.ts); what it leaves — markup
        // inside MDX, and the operations the planner places alike — is stated
        // below as it is for an .astro page.
        const drafted = (0, markdownEdits_1.markdownEditDraft)(edit, authored);
        if (drafted !== undefined) {
            return drafted;
        }
    }
    return nodeEditDraft(edit, authored);
}
// A gesture's edit of the page's nodes, stated against their parse.
function nodeEditDraft(edit, authored) {
    switch (edit.tag) {
        case 'set-attribute':
        case 'remove-attribute':
        case 'set-inline-style':
        case 'remove-node': {
            const { target, ...rest } = edit;
            return withAnchor(authored, target, (anchor) => (0, result_1.ok)({ anchor, operation: rest }));
        }
        case 'insert-node':
            return withAnchor(authored, edit.target, (anchor) => insertDraft(authored, anchor, edit));
        case 'move-node':
            return withAnchor(authored, edit.target, (anchor) => withAnchor(authored, edit.destination, (destination) => (0, result_1.ok)({ anchor, operation: { tag: 'move-node', destination, placement: edit.placement } })));
        case 'rename-binding':
            return withAnchor(authored, edit.target, (anchor) => renameDraft(authored, anchor, edit));
        case 'rename-tag':
            return withAnchor(authored, edit.target, (anchor) => tagRenameDraft(authored, anchor, edit.to));
        case 'rename-attribute':
            return withAnchor(authored, edit.target, (anchor) => tagAnchor(anchor) ? (0, result_1.ok)({ anchor, operation: { tag: 'rename-attribute', from: edit.from, to: edit.to } }) : (0, result_1.err)('unsupported-operation'));
        case 'replace-node':
            return withAnchor(authored, edit.target, (anchor) => replaceDraft(authored, anchor, edit.node));
        case 'wrap-nodes':
            return withAnchor(authored, edit.target, (anchor) => withAnchor(authored, edit.last, (last) => wrapDraft(authored, anchor, last, edit.name)));
        case 'unwrap-node':
            return withAnchor(authored, edit.target, (anchor) => unwrapDraft(authored, anchor));
        case 'append-body':
            return (0, result_1.ok)(appendDraft(authored, edit.nodes));
        case 'set-frontmatter':
            return frontmatterDraft(authored, edit.model);
        case 'replace-page':
            return replacePageDraft(authored, edit.model);
        default: {
            const exhaustive = edit;
            return exhaustive;
        }
    }
}
// The last-resort visual edit is still a bounded hunk edit, not a regenerated
// file. The old printed model identifies semantic changes; placedHunks maps
// only those ranges onto the authored formatting and refuses ambiguous ones.
function replacePageDraft(authored, next) {
    const parsed = (0, pageNode_1.parsePageResult)((0, astroParser_1.parsePage)(authored.text, { locs: true }));
    if (!parsed.editable) {
        return (0, result_1.err)('source-invalid');
    }
    const before = (0, astroParser_1.serializePage)(parsed.model);
    const after = (0, astroParser_1.serializePage)(next);
    const hunks = (0, editAnchors_1.placedHunks)(before, after, authored.text);
    if (!hunks.ok) {
        return hunks;
    }
    const anchor = (0, ref_1.toAnchorRef)({
        span: (0, span_1.toByteSpan)(0, authored.snapshot.bytes.length),
        path: [],
        expectedKind: 'document',
    });
    return (0, result_1.ok)({ anchor, operation: { tag: 'rewrite-text', hunks: hunks.value } });
}
// The body's first nodes, printed as a new node is; the planner refuses them
// once the body has any node (they must stand beside it then).
function appendDraft(authored, nodes) {
    const source = (0, astroParser_1.serializeNodes)(nodes).replace(/\r?\n$/, '');
    const eol = authored.text.includes('\r\n') ? '\r\n' : '\n';
    const anchor = (0, ref_1.toAnchorRef)({
        span: (0, span_1.toByteSpan)(0, authored.snapshot.bytes.length),
        path: [],
        expectedKind: 'document',
    });
    const lines = source.split(/\r?\n/).join(eol);
    return { anchor, operation: { tag: 'append-body', source: lines } };
}
// The renderer's node reference, checked against the projection of the same
// bytes (editAnchors.ts): a mismatch means the renderer's parse is not of
// these bytes.
function withAnchor(authored, ref, next) {
    const resolved = (0, editAnchors_1.resolveRef)(authored, ref);
    return resolved.ok ? next(resolved.value.anchor) : resolved;
}
// New nodes print with the legacy printer, their continuation lines indented
// to where they land; a copy is the source node's own bytes.
function insertDraft(authored, anchor, edit) {
    const eol = authored.text.includes('\r\n') ? '\r\n' : '\n';
    const indent = (0, planSupport_1.lineIndent)(authored.snapshot.bytes, anchor.span.start) + (inside(edit.placement) ? '  ' : '');
    const content = edit.content;
    if (content.tag === 'copy') {
        return withAnchor(authored, content.source, (source) => {
            const bytes = authored.snapshot.bytes.subarray(source.span.start, source.span.end);
            const text = Buffer.from(bytes).toString('utf8');
            return (0, result_1.ok)({
                anchor,
                operation: { tag: 'insert-node', placement: edit.placement, source: text },
            });
        });
    }
    const printed = (0, astroParser_1.serializeNodes)(content.nodes).replace(/\r?\n$/, '');
    const text = printed.split(/\r?\n/).join(`${eol}${indent}`);
    const operation = { tag: 'insert-node', placement: edit.placement, source: text };
    return (0, result_1.ok)({ anchor, operation });
}
function renameDraft(authored, anchor, edit) {
    const loop = (0, planSupport_1.nodeAtPath)(authored.projection, anchor.path);
    (0, assert_1.assert)(loop !== undefined, 'A checked anchor names a projected node');
    if (loop.kind !== 'map') {
        return (0, result_1.err)('unsupported-operation');
    }
    const sites = (0, loopScope_1.renameSites)(authored.projection, authored.snapshot.bytes, loop, edit.from);
    if (sites === undefined) {
        return (0, result_1.err)('unsupported-operation'); // A head or a test the rename cannot read.
    }
    return (0, result_1.ok)({ anchor, operation: { tag: 'rename-binding', from: edit.from, to: edit.to, sites } });
}
// A tag's new name: the old one is read off the authored bytes, where the
// planner will find it again (its witness). A `<style>` or `<script>` is raw
// text by its name, and `<>` has none: neither is renamed visually.
function tagRenameDraft(authored, anchor, to) {
    const node = (0, planSupport_1.nodeAtPath)(authored.projection, anchor.path);
    (0, assert_1.assert)(node !== undefined, 'A checked anchor names a projected node');
    if (node.kind !== 'element' && node.kind !== 'component') {
        return (0, result_1.err)('unsupported-operation');
    }
    const bytes = authored.snapshot.bytes;
    const from = (0, planSupport_1.textOf)(bytes, (0, span_1.toByteSpan)(node.span.start + 1, (0, planSupport_1.tagNameEnd)(bytes, node)));
    if (!intent_1.TAG_NAME_RE.test(from)) {
        return (0, result_1.err)('unsupported-operation');
    }
    if (from === to) {
        return (0, result_1.err)('unsupported-operation'); // Nothing to write; the gesture had no change.
    }
    return (0, result_1.ok)({ anchor, operation: { tag: 'rename-tag', from, to } });
}
// A node as it should now read (step 9). The printer renders the node as it is
// and as it should be; the difference is the edit. The node's own bytes may be
// written differently from the printer's rendering — spacing, line breaks,
// entities the parser kept — so each changed range of the rendering is placed
// on the bytes through a diff between the two (the span mapper, which refuses
// rather than guesses). A range the formatting itself changed has no place:
// the edit is refused, and the node is never reprinted.
function replaceDraft(authored, anchor, next) {
    const projected = (0, planSupport_1.nodeAtPath)(authored.projection, anchor.path);
    (0, assert_1.assert)(projected !== undefined, 'A checked anchor names a projected node');
    const previous = pageNodeAt(authored, anchor.path);
    if (previous === undefined) {
        return (0, result_1.err)('anchor-moved');
    }
    if (previous.kind === 'raw' && next.kind === 'raw') {
        const contents = rawContentsDraft(authored, anchor, { previous, next });
        if (contents !== undefined) {
            return contents;
        }
    }
    if (previous.kind === 'text' && next.kind === 'text') {
        const words = textDraft(authored, anchor, { previous, next });
        if (words !== undefined) {
            return words;
        }
    }
    const bytes = authored.snapshot.bytes;
    const eol = authored.text.includes('\r\n') ? '\r\n' : '\n';
    const indent = (0, planSupport_1.lineIndent)(bytes, projected.span.start);
    const print = (node) => (0, astroParser_1.serializeNodes)([node])
        .replace(/\r?\n$/, '')
        .split(/\r?\n/)
        .join(`${eol}${indent}`);
    const own = (0, planSupport_1.textOf)(bytes, projected.span);
    const hunks = (0, editAnchors_1.placedHunks)(print(previous), print(next), own);
    if (!hunks.ok) {
        return hunks;
    }
    const moved = (0, editAnchors_1.shiftedHunks)(hunks.value, projected.span.start);
    return (0, result_1.ok)({ anchor, operation: { tag: 'rewrite-node', hunks: moved } });
}
/**
 * A `<style>` or `<script>` whose contents alone changed: the contents are
 * kept byte for byte, so the change is the diff of the old contents and the
 * new, written where the contents sit between the tags. Printing the element
 * instead re-indents its contents by the element's own indentation, and a
 * change the diff could not place on the file through that re-indented text
 * was refused as an editor error (typing a comment into a page's `<style>`,
 * a style panel edit): or, placed, wrote new lines at the doubled indent.
 * Undefined when the tag itself changed or the contents on disk are not the
 * ones the node holds; the printed path decides those.
 */
function rawContentsDraft(authored, anchor, nodes) {
    const { previous, next } = nodes;
    if (previous.name !== next.name || JSON.stringify([previous.props, previous.attrOrder]) !== JSON.stringify([next.props, next.attrOrder])) {
        return undefined;
    }
    const projected = (0, planSupport_1.nodeAtPath)(authored.projection, anchor.path);
    (0, assert_1.assert)(projected?.kind === 'raw', 'A raw page node is a projected raw node');
    const bytes = authored.snapshot.bytes;
    const open = (0, planSupport_1.openTagEnd)(bytes, projected);
    const close = open.selfClosing ? undefined : (0, planSupport_1.closeTagStart)(bytes, projected, open.end);
    if (close === undefined || (0, planSupport_1.textOf)(bytes, (0, span_1.toByteSpan)(open.end, close)) !== previous.inner) {
        return undefined;
    }
    const change = (0, codePatch_1.diffCodePatch)(previous.inner, next.inner);
    if (!change.ok) {
        return change;
    }
    if (change.value.length === 0) {
        return (0, result_1.err)('unsupported-operation'); // Nothing to write; the gesture had no change.
    }
    const hunks = (0, editAnchors_1.shiftedHunks)(change.value.map((hunk) => ({ span: hunk.span, text: hunk.text })), open.end);
    (0, assert_1.assert)(hunks.every((hunk) => hunk.span.start >= open.end && hunk.span.end <= close), 'A contents edit stays between the tags');
    return (0, result_1.ok)({ anchor, operation: { tag: 'rewrite-node', hunks } });
}
/**
 * A run of text whose words changed: written as the diff of its old text and
 * its new, where the run sits. The printer writes a run without the space at
 * either end (on a line of its own that space is the layout's), so a change to
 * that space alone printed the same before and after and was refused as an
 * editor error: deleting the space in `Send your first pigeon <span>`.
 * Undefined unless the file holds the run exactly as its text spells it; the
 * printed path decides the rest (text wrapped across lines, say).
 */
function textDraft(authored, anchor, nodes) {
    const { previous, next } = nodes;
    const projected = (0, planSupport_1.nodeAtPath)(authored.projection, anchor.path);
    (0, assert_1.assert)(projected?.kind === 'text', 'A text page node is a projected text node');
    const own = (0, planSupport_1.textOf)(authored.snapshot.bytes, projected.span);
    const before = (0, htmlText_1.encodeText)(previous.value);
    if (own !== before || own.includes('\n')) {
        return undefined;
    }
    const after = (0, htmlText_1.encodeText)(next.value);
    const change = (0, codePatch_1.diffCodePatch)(before, after);
    if (!change.ok) {
        return change;
    }
    if (change.value.length === 0) {
        return (0, result_1.err)('unsupported-operation'); // Nothing to write; the gesture had no change.
    }
    const hunks = (0, editAnchors_1.shiftedHunks)(change.value.map((hunk) => ({ span: hunk.span, text: hunk.text })), projected.span.start);
    (0, assert_1.assert)(hunks.every((hunk) => hunk.span.start >= projected.span.start && hunk.span.end <= projected.span.end), 'A text edit stays inside its run');
    return (0, result_1.ok)({ anchor, operation: { tag: 'rewrite-node', hunks } });
}
// Attributes live on tags: elements, component invocations, `<style>`/`<script>`.
function tagAnchor(anchor) {
    const kind = anchor.expectedKind;
    return kind === 'element' || kind === 'component' || kind === 'raw';
}
// A run of siblings inside a new tag: the opening tag on its own line before
// the first, the closing tag on its own line after the last, at the first
// one's indentation. The run's own bytes are not re-indented.
function wrapDraft(authored, anchor, last, name) {
    const eol = authored.text.includes('\r\n') ? '\r\n' : '\n';
    const indent = (0, planSupport_1.lineIndent)(authored.snapshot.bytes, anchor.span.start);
    const operation = {
        tag: 'wrap-nodes',
        last,
        open: `<${name}>${eol}${indent}`,
        close: `${eol}${indent}</${name}>`,
    };
    return (0, result_1.ok)({ anchor, operation });
}
// A paired tag taken away, its children kept as they are written: the opening
// tag, with the rest of its line when that is only whitespace, and the closing
// tag, with the line break and indentation before it when it stands on its own
// line. A rewrite of the node, so it applies only while the node is unchanged.
function unwrapDraft(authored, anchor) {
    const node = (0, planSupport_1.nodeAtPath)(authored.projection, anchor.path);
    (0, assert_1.assert)(node !== undefined, 'A checked anchor names a projected node');
    if (node.kind !== 'element' && node.kind !== 'component') {
        return (0, result_1.err)('unsupported-operation');
    }
    const bytes = authored.snapshot.bytes;
    const open = (0, planSupport_1.openTagEnd)(bytes, node);
    const close = (0, planSupport_1.closeTagStart)(bytes, node, open.end);
    if (open.selfClosing || close === undefined) {
        return (0, result_1.err)('unsupported-operation'); // Nothing inside to keep.
    }
    const openEnd = lineEndAfter(bytes, open.end, close) ?? open.end;
    const closeStart = lineStartBefore(bytes, close, openEnd) ?? close;
    const hunks = [
        { span: (0, span_1.toByteSpan)(node.span.start, openEnd), text: '' },
        { span: (0, span_1.toByteSpan)(closeStart, node.span.end), text: '' },
    ];
    return (0, result_1.ok)({ anchor, operation: { tag: 'rewrite-node', hunks } });
}
// One past the line break ending the line at `from`, when only spaces and tabs
// stand between them; undefined when anything else does.
function lineEndAfter(bytes, from, ceiling) {
    for (let at = from; at < ceiling; at++) {
        const byte = bytes[at];
        if (byte === 0x0a) {
            return at + 1;
        }
        if (byte !== 0x20 && byte !== 0x09 && byte !== 0x0d) {
            return undefined;
        }
    }
    return undefined;
}
// The line break (its `\r\n` whole) that starts the line holding `to`, when
// only spaces and tabs stand between them; undefined when anything else does.
function lineStartBefore(bytes, to, floor) {
    for (let at = to - 1; at >= floor; at--) {
        const byte = bytes[at];
        if (byte === 0x0a) {
            return at > floor && bytes[at - 1] === 0x0d ? at - 1 : at;
        }
        if (byte !== 0x20 && byte !== 0x09) {
            return undefined;
        }
    }
    return undefined;
}
// The parsed node at a projection path: projections index the same tree. A
// Markdown page's markup is found in the Markdown parse, which holds it.
function pageNodeAt(authored, path) {
    const roots = authored.format === 'astro' ? astroPageNodes(authored.text) : (0, markdownEdits_1.markdownPageNodes)(authored);
    if (roots === undefined) {
        return undefined;
    }
    let list = roots;
    let node;
    for (const step of path) {
        node = list[step];
        if (node === undefined) {
            return undefined;
        }
        list = 'children' in node && Array.isArray(node.children) ? node.children : [];
    }
    return node;
}
// The frontmatter the model describes, printed by the legacy printer, against
// the block on disk: only the differing middle becomes the slot, so a new
// import touches its line and nothing else.
function astroPageNodes(text) {
    const parsed = (0, pageNode_1.parsePageResult)((0, astroParser_1.parsePage)(text, { locs: true }));
    return parsed.editable ? parsed.model.nodes : undefined;
}
function frontmatterDraft(authored, model) {
    const block = authored.projection.frontmatter;
    const page = (0, astroParser_1.serializePage)({ ...model, nodes: [] });
    if (block === undefined) {
        // A page without a block gains one at its top (step 10).
        const printed = printedBlock(page, '\n');
        if (printed === undefined) {
            return (0, result_1.err)('unsupported-operation'); // The model describes no block either.
        }
        const anchor = (0, ref_1.toAnchorRef)({
            span: (0, span_1.toByteSpan)(0, authored.snapshot.bytes.length),
            path: [],
            expectedKind: 'document',
        });
        return (0, result_1.ok)({ anchor, operation: { tag: 'insert-frontmatter', source: printed } });
    }
    const before = Buffer.from(authored.snapshot.bytes.subarray(block.start, block.end)).toString('utf8');
    const printed = printedBlock(page, before);
    if (printed === undefined) {
        return (0, result_1.err)('unsupported-operation');
    }
    const { slot, text } = (0, editAnchors_1.frontmatterSlot)(block, before, printed);
    const anchor = (0, ref_1.toAnchorRef)({ span: block, path: [], expectedKind: 'frontmatter' });
    return (0, result_1.ok)({ anchor, operation: { tag: 'edit-frontmatter-slot', slot, text } });
}
// The fenced block of a printed page without nodes, ending as the block on
// disk ends (with or without the line break after the closing fence).
function printedBlock(page, before) {
    const eol = page.includes('\r\n') ? '\r\n' : '\n';
    const lines = page.split(eol);
    const close = lines.indexOf('---', 1);
    if (lines[0] !== '---' || close === -1) {
        return undefined;
    }
    const block = lines.slice(0, close + 1).join(eol);
    return before.endsWith('\n') ? `${block}${eol}` : block;
}
function revertDraft(snapshot, hunks) {
    const inside = hunks.every((hunk) => hunk.span.end <= snapshot.bytes.length);
    if (!inside || !(0, span_1.spansAscending)(hunks.map((hunk) => hunk.span)) || hunks.length === 0) {
        return (0, result_1.err)('anchor-moved'); // Not hunks of these bytes.
    }
    const anchor = (0, ref_1.toAnchorRef)({
        span: (0, span_1.toByteSpan)(0, snapshot.bytes.length),
        path: [],
        expectedKind: 'document',
    });
    return (0, result_1.ok)({ anchor, operation: { tag: 'revert-splices', hunks } });
}
// The code editor's patch (step 8), checked against the bytes it names: every
// hunk inside them, on code-point boundaries, holding the text it says it
// replaces. A hunk that does not is not a diff of these bytes — the editor's
// text descends from some other version — and it cannot be merged.
function codePatchDraft(snapshot, hunks) {
    (0, assert_1.assert)(hunks.length > 0, 'The wire parser requires a hunk');
    (0, assert_1.assert)((0, span_1.spansAscending)(hunks.map((hunk) => hunk.span)), 'The wire parser orders the hunks');
    const bytes = snapshot.bytes;
    for (const hunk of hunks) {
        if (bytes.length < hunk.span.end) {
            return (0, result_1.err)('merge-conflict');
        }
        if (continuesCodePoint(bytes, hunk.span.start) || continuesCodePoint(bytes, hunk.span.end)) {
            return (0, result_1.err)('merge-conflict');
        }
        const held = bytes.subarray(hunk.span.start, hunk.span.end);
        if (!(0, span_1.byteStringsEqual)((0, span_1.toByteString)(held), (0, span_1.encodeUtf8)(hunk.expected))) {
            return (0, result_1.err)('merge-conflict');
        }
    }
    const anchor = (0, ref_1.toAnchorRef)({
        span: (0, span_1.toByteSpan)(0, bytes.length),
        path: [],
        expectedKind: 'document',
    });
    const edits = hunks.map((hunk) => ({ span: hunk.span, text: hunk.text }));
    return (0, result_1.ok)({ anchor, operation: { tag: 'apply-code-patch', hunks: edits } });
}
// A UTF-8 continuation byte at `offset`: a span edge there splits a character.
function continuesCodePoint(bytes, offset) {
    const byte = bytes[offset];
    if (byte === undefined) {
        return false; // The end of the file is a boundary.
    }
    return byte >= 0x80 && byte < 0xc0;
}
function inside(placement) {
    return placement === 'first-child' || placement === 'last-child';
}
