"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.planRemoveNode = planRemoveNode;
exports.planInsertNode = planInsertNode;
exports.planWrapNodes = planWrapNodes;
exports.planAppendBody = planAppendBody;
exports.planMoveNode = planMoveNode;
exports.removalRange = removalRange;
// Planning the tree operations (plan §3.3, §3.4): `insert-node`, `remove-node`,
// `move-node` and step 9's `wrap-nodes`. A removal takes the node's bytes and the whitespace that
// set it apart; an insertion is a zero-width splice beside or inside a
// resolved node, separated the way that node is separated from what precedes
// it; a move is the two at once, and relocates the node's original bytes —
// it never prints the node again. Leaving a loop, the moved bytes lose their
// references to the loop's item (loopScope.ts, stripEdits): an expression
// becomes text, the one kind change a move makes.
//
// Every rejection is decided in the three plan functions; the helpers compute.
const assert_1 = require("../core/assert");
const htmlTags_1 = require("../page/htmlTags");
const loopScope_1 = require("./loopScope");
const planSupport_1 = require("./planSupport");
const ref_1 = require("../page/ref");
const result_1 = require("../core/result");
const markdownLayout_1 = require("./markdownLayout");
const planMarkdown_1 = require("./planMarkdown");
const span_1 = require("../core/span");
const NEWLINE = 0x0a;
function planRemoveNode(context, anchor) {
    const resolved = (0, planSupport_1.resolveTarget)(context, anchor);
    if (!resolved.ok) {
        return resolved;
    }
    const target = resolved.value;
    if (!movable(target.current.kind)) {
        return (0, result_1.err)('unsupported-operation'); // A branch or a chunk group is structure.
    }
    if (!(0, planSupport_1.nodePlaceable)(target.current)) {
        return (0, result_1.err)('unsupported-operation');
    }
    if (!(0, planSupport_1.nodeUnchanged)(context, target)) {
        return (0, result_1.err)('region-externally-modified');
    }
    const current = currentProjection(context);
    const node = target.current;
    switch (node.list) {
        case 'markup': {
            if (leavesCodeEmpty(context.current.bytes, current, node)) {
                return (0, result_1.err)('unsupported-operation');
            }
            return (0, result_1.ok)(removalPlan(context.current.bytes, current, node, removalRange));
        }
        case 'blocks':
        case 'items': {
            const removed = (0, planMarkdown_1.markdownRemoved)(current, node);
            if (!(0, planSupport_1.nodePlaceable)(removed)) {
                return (0, result_1.err)('unsupported-operation'); // The list an only item takes is not placeable.
            }
            const removal = (0, planMarkdown_1.markdownRemoval)(context.current.bytes, current, removed);
            if (removal === undefined) {
                return (0, result_1.err)('unsupported-operation'); // No prefix to write the blank line with.
            }
            const splice = spliceAt(context.current.bytes, removal.range, removal.text);
            const postKinds = parentKind(current, removed);
            return (0, result_1.ok)({ splices: [splice], postKinds, candidate: 'must-parse' });
        }
        case 'inline':
            return (0, result_1.err)('unsupported-operation'); // A block's own text: edited, never removed.
        default: {
            const exhaustive = node.list;
            return exhaustive;
        }
    }
}
function removalPlan(bytes, projection, node, range) {
    const splice = spliceAt(bytes, range(bytes, projection, node), '');
    return { splices: [splice], postKinds: parentKind(projection, node), candidate: 'must-parse' };
}
function planInsertNode(context, anchor, operation) {
    const resolved = (0, planSupport_1.resolveTarget)(context, anchor);
    if (!resolved.ok) {
        return resolved;
    }
    const target = resolved.value;
    if (!placeWritable(context.current.bytes, currentProjection(context), target.current, operation.placement)) {
        return (0, result_1.err)('unsupported-operation');
    }
    const current = currentProjection(context);
    const insertion = insertionAt(context.current.bytes, current, target.current, operation.placement, operation.source);
    if (!insertion.ok) {
        return insertion;
    }
    const splice = spliceAt(context.current.bytes, insertion.value.range, insertion.value.text);
    const postKinds = [{ path: insertion.value.anchorPath.map(ref_1.toChildIndex), kind: target.current.kind }];
    return (0, result_1.ok)({ splices: [splice], postKinds, candidate: 'must-parse' });
}
/** `wrap-nodes` (step 9): a run of siblings, the anchor through `last`, put
 * inside a new tag — its opening before the first, its closing after the
 * last. Both ends are resolved like any anchor; what lies between them is
 * kept whole, whoever wrote it, and nothing is re-indented. Siblings of one
 * list only, in order, and never code a loop or a condition owns. */
function planWrapNodes(context, anchor, operation) {
    const first = (0, planSupport_1.resolveTarget)(context, anchor);
    if (!first.ok) {
        return first;
    }
    const last = (0, planSupport_1.resolveTarget)(context, operation.last);
    if (!last.ok) {
        return last;
    }
    const start = first.value.current;
    const end = last.value.current;
    if (!movable(start.kind) || !movable(end.kind)) {
        return (0, result_1.err)('unsupported-operation');
    }
    if (!(0, planSupport_1.nodePlaceable)(start) || !(0, planSupport_1.nodePlaceable)(end)) {
        return (0, result_1.err)('unsupported-operation');
    }
    if (!(0, planSupport_1.samePath)((0, planSupport_1.parentPath)(start.path), (0, planSupport_1.parentPath)(end.path))) {
        return (0, result_1.err)('unsupported-operation'); // Not one run of siblings.
    }
    if (start.list !== 'markup') {
        return (0, result_1.err)('unsupported-operation'); // A tag around Markdown blocks is not Markdown.
    }
    if (end.span.start < start.span.start) {
        return (0, result_1.err)('unsupported-operation');
    }
    const bytes = context.current.bytes;
    const splices = [
        spliceAt(bytes, (0, span_1.toByteSpan)(start.span.start, start.span.start), operation.open),
        spliceAt(bytes, (0, span_1.toByteSpan)(end.span.end, end.span.end), operation.close),
    ];
    (0, assert_1.assert)(start.span.start < end.span.end, 'A run of nodes covers at least one byte');
    return (0, result_1.ok)({ splices, postKinds: [], candidate: 'must-parse' });
}
/** `append-body` (step 9): the first node of a page whose body is empty — no
 * node to stand beside, so the anchor is the document. It goes at the end of
 * the file, on a line of its own. A body that gained a node since was written
 * by someone else; the insertion is refused, to be stated beside a node. */
function planAppendBody(context, anchor, operation) {
    (0, assert_1.assert)(anchor.expectedKind === 'document', 'An append anchors the whole document');
    const projections = (0, planSupport_1.validProjections)(context);
    if (!projections.ok) {
        return projections;
    }
    if (projections.value.current.nodes.length > 0) {
        return (0, result_1.err)('anchor-moved');
    }
    const bytes = context.current.bytes;
    const end = bytes.length;
    const crlf = end > 1 && bytes[end - 2] === 0x0d && bytes[end - 1] === NEWLINE;
    const eol = crlf || bytesHaveCrlf(bytes) ? '\r\n' : '\n';
    const lead = end === 0 || bytes[end - 1] === NEWLINE ? '' : eol;
    const splice = spliceAt(bytes, (0, span_1.toByteSpan)(end, end), `${lead}${operation.source}${eol}`);
    return (0, result_1.ok)({ splices: [splice], postKinds: [], candidate: 'must-parse' });
}
function bytesHaveCrlf(bytes) {
    for (let index = 1; index < bytes.length; index++) {
        if (bytes[index] === NEWLINE) {
            return bytes[index - 1] === 0x0d; // The file's first line break decides.
        }
    }
    return false;
}
// A node inside a loop is one source node the loop repeats (plan §6). A move
// within its markup container preserves those bytes and bindings. Leaving a
// loop rewrites only references the destination cannot satisfy (§3.3). The
// loop's direct return roots remain code-owned, not a markup sibling list.
function planMoveNode(context, anchor, operation) {
    const source = (0, planSupport_1.resolveTarget)(context, anchor);
    if (!source.ok) {
        return source;
    }
    const destination = (0, planSupport_1.resolveTarget)(context, operation.destination);
    if (!destination.ok) {
        return destination;
    }
    const moved = source.value.current;
    if (!movable(moved.kind)) {
        return (0, result_1.err)('unsupported-operation');
    }
    if (!(0, planSupport_1.nodePlaceable)(moved)) {
        if (moved.capability !== 'repeated-source-node') {
            return (0, result_1.err)('unsupported-operation');
        }
    }
    if (!placeWritable(context.current.bytes, currentProjection(context), destination.value.current, operation.placement)) {
        return (0, result_1.err)('unsupported-operation');
    }
    if ((0, planSupport_1.startsWith)(destination.value.current.path, moved.path)) {
        return (0, result_1.err)('unsupported-operation'); // Into itself or its own subtree.
    }
    if (!(0, planSupport_1.nodeUnchanged)(context, source.value)) {
        return (0, result_1.err)('region-externally-modified');
    }
    const current = currentProjection(context);
    const list = listAt(current, destination.value.current, operation.placement);
    if (list !== moved.list) {
        return (0, result_1.err)('unsupported-operation'); // A block among items, markup among blocks: not a move.
    }
    switch (list) {
        case 'markup':
            if (leavesCodeEmpty(context.current.bytes, current, moved)) {
                return (0, result_1.err)('unsupported-operation');
            }
            return planRelocation(context, source.value, destination.value, operation.placement);
        case 'blocks':
        case 'items':
            return planMarkdownRelocation(context, moved, destination.value.current, operation.placement);
        case 'inline':
            return (0, result_1.err)('unsupported-operation');
        default: {
            const exhaustive = list;
            return exhaustive;
        }
    }
}
// A Markdown block or item moved: its bytes, their continuation lines carrying
// the destination's prefix, separated there as its neighbours are; its old
// place removed as a removal would. An item keeps its marker, so it moves only
// among items written with the same one — another starts a new list.
function planMarkdownRelocation(context, moved, destination, placement) {
    const bytes = context.current.bytes;
    const current = currentProjection(context);
    const beside = (0, planMarkdown_1.markdownBeside)(current, destination, placement);
    if (beside === undefined) {
        return (0, result_1.err)('unsupported-operation');
    }
    if (moved.list === 'items') {
        if ((0, planMarkdown_1.itemMarker)(bytes, moved) !== (0, planMarkdown_1.itemMarker)(bytes, beside.node)) {
            return (0, result_1.err)('unsupported-operation');
        }
    }
    const prefix = (0, markdownLayout_1.markdownPrefix)(bytes, beside.node.span.start);
    const text = prefix === undefined ? undefined : (0, planMarkdown_1.reprefixed)(bytes, moved, prefix);
    if (text === undefined) {
        return (0, result_1.err)('unsupported-operation'); // A line whose container is not written out.
    }
    const anchorPath = placement === 'before' ? shifted(destination.path) : destination.path;
    const insertion = (0, planMarkdown_1.markdownInsertion)(bytes, current, beside, anchorPath, text);
    if (insertion === undefined) {
        return (0, result_1.err)('unsupported-operation');
    }
    const removal = (0, planMarkdown_1.markdownRemoval)(bytes, current, (0, planMarkdown_1.markdownRemoved)(current, moved));
    if (removal === undefined) {
        return (0, result_1.err)('unsupported-operation');
    }
    return relocationSplices(bytes, insertion, removal, { span: moved.span, text });
}
function planRelocation(context, source, destination, placement) {
    const bytes = context.current.bytes;
    const current = currentProjection(context);
    const text = relocatedText(bytes, current, source.current, destination.current, placement);
    if (!text.ok) {
        return text;
    }
    const insertion = insertionAt(bytes, current, destination.current, placement, text.value);
    if (!insertion.ok) {
        return insertion;
    }
    const removal = { range: removalRange(bytes, current, source.current), text: '' };
    return relocationSplices(bytes, insertion.value, removal, {
        span: source.current.span,
        text: text.value,
    });
}
// The insertion and the removal of one move, refused when the new place lies
// inside the old one (or, in Markdown, rewrites a gap the removal takes).
function relocationSplices(bytes, insertion, removal, moved) {
    const into = insertion.range;
    const out = removal.range;
    if (overlaps(into, out)) {
        return (0, result_1.err)('unsupported-operation'); // Beside itself: a move that goes nowhere.
    }
    // Ascending, the insertion first when both start at one byte (orderedSplices
    // keeps that order, and the zero-width splice ends where the removal starts).
    const insert = spliceAt(bytes, into, insertion.text);
    const remove = spliceAt(bytes, out, removal.text);
    const splices = into.end <= out.start ? [insert, remove] : [remove, insert];
    const relocation = relocationOf(bytes, insertion, remove, moved);
    return (0, result_1.ok)({ splices, relocation, postKinds: [], candidate: 'must-parse' });
}
// Only the move planner may supply this provenance. Searching its insertion
// locates the original subtree within formatting added at the destination;
// it never searches the document for a substitute. Rewritten loop bindings or
// Markdown prefixes have no unchanged byte image and keep the existing refusal.
function relocationOf(bytes, insertion, removal, moved) {
    const source = moved.span;
    (0, assert_1.assert)(removal.range.start <= source.start, 'The move removes its source start');
    (0, assert_1.assert)(source.end <= removal.range.end, 'The move removes its source end');
    const original = (0, planSupport_1.textOf)(bytes, source);
    (0, assert_1.assert)(original.length > 0, 'A moved subtree has source text');
    if (original !== moved.text) {
        return undefined;
    }
    const offset = insertion.text.indexOf(original);
    if (offset < 0) {
        return undefined;
    }
    if (insertion.text.indexOf(original, offset + 1) !== -1) {
        return undefined;
    }
    const shift = removal.range.end <= insertion.range.start ? removal.replacementBytes.length - removal.expectedBytes.length : 0;
    const start = insertion.range.start + shift + (0, span_1.encodeUtf8)(insertion.text.slice(0, offset)).length;
    const target = (0, span_1.toByteSpan)(start, start + source.end - source.start);
    return { source, target };
}
// Whether an insertion lands inside a removal: a point strictly inside it, or
// a rewritten gap sharing any byte with it. Touching at an edge is not.
function overlaps(into, out) {
    if (into.start === into.end) {
        if (out.start < into.start) {
            return into.start < out.end;
        }
        return false;
    }
    if (out.start < into.end) {
        return into.start < out.end;
    }
    return false;
}
function point(at) {
    return (0, span_1.toByteSpan)(at, at);
}
// The moved bytes, minus the loop references the destination cannot satisfy.
function relocatedText(bytes, projection, moved, destination, placement) {
    const before = (0, loopScope_1.scopeAt)(projection, bytes, moved.path);
    const destinationPath = inside(placement) ? [...destination.path, (0, ref_1.toChildIndex)(0)] : destination.path;
    const after = (0, loopScope_1.scopeAt)(projection, bytes, destinationPath);
    if (before === undefined) {
        return (0, result_1.err)('unsupported-operation'); // A loop head this cannot read.
    }
    if (after === undefined) {
        return (0, result_1.err)('unsupported-operation');
    }
    const lost = before.filter((name) => !after.includes(name));
    const edits = lost.length === 0 ? [] : (0, loopScope_1.stripEdits)(projection, bytes, moved, lost);
    if (edits === undefined) {
        return (0, result_1.err)('unsupported-operation');
    }
    const relocated = withReplacements(bytes, moved.span, edits);
    return (0, result_1.ok)((0, planSupport_1.textOf)(relocated, (0, span_1.toByteSpan)(0, relocated.length)));
}
// The bytes of `span` with each edit (absolute, ascending, inside it) applied.
function withReplacements(bytes, span, edits) {
    const parts = [];
    let cursor = span.start;
    for (const edit of edits) {
        (0, assert_1.assert)(cursor <= edit.span.start, 'Replacements ascend without overlapping');
        (0, assert_1.assert)(edit.span.end <= span.end, 'Replacements lie inside the moved node');
        parts.push(bytes.subarray(cursor, edit.span.start), (0, span_1.encodeUtf8)(edit.text));
        cursor = edit.span.end;
    }
    parts.push(bytes.subarray(cursor, span.end));
    const size = parts.reduce((total, part) => total + part.length, 0);
    const joined = new Uint8Array(size);
    let offset = 0;
    for (const part of parts) {
        joined.set(part, offset);
        offset += part.length;
    }
    return (0, span_1.toByteString)(joined);
}
function inCode(projection, node) {
    if (node.path.length === 1) {
        return false;
    }
    const parent = (0, planSupport_1.nodeAtPath)(projection, (0, planSupport_1.parentPath)(node.path));
    (0, assert_1.assert)(parent !== undefined, 'A nested node has a parent');
    return parent.kind === 'branch' || parent.kind === 'map';
}
// A condition's branch and a loop's body are JavaScript around markup: taking
// out the only node leaves `cond && ( )`, which the parser reads but no
// JavaScript engine will run. The legacy printer writes `null` there; until a
// planner rule does, such a removal is refused and the page saved whole.
function leavesCodeEmpty(bytes, projection, node) {
    if (node.path.length === 1) {
        return false;
    }
    if (!inCode(projection, node)) {
        return false;
    }
    const others = (0, planSupport_1.siblingsOf)(projection, node).filter((sibling) => sibling !== node && !(0, planSupport_1.blankText)(bytes, sibling));
    return others.length === 0;
}
/** What a removal takes: the node and its preceding whitespace-only separator;
 * otherwise the whitespace after
 * it through the first line break, so no blank line is left; otherwise the
 * node alone (it sat inline). The runs never cross a sibling or the parent. */
function removalRange(bytes, projection, node) {
    const bounds = siblingBounds(bytes, projection, node);
    const before = (0, planSupport_1.whitespaceBefore)(bytes, node.span.start, bounds.floor);
    if (before < node.span.start) {
        return (0, span_1.toByteSpan)(before, node.span.end);
    }
    const after = (0, planSupport_1.whitespaceAfter)(bytes, node.span.end, bounds.ceiling);
    const newline = bytes.subarray(node.span.end, after).indexOf(0x0a);
    if (newline >= 0) {
        return (0, span_1.toByteSpan)(node.span.start, node.span.end + newline + 1);
    }
    return node.span;
}
function insertionAt(bytes, projection, anchor, placement, text) {
    if (listAt(projection, anchor, placement) !== 'markup') {
        return markdownInsertionAt(bytes, projection, anchor, placement, text);
    }
    if (inside(placement)) {
        return insertionInside(bytes, projection, anchor, placement, text);
    }
    if (!movable(anchor.kind)) {
        return (0, result_1.err)('unsupported-operation'); // Beside a branch is inside its condition.
    }
    if (inCode(projection, anchor)) {
        // A condition's branch or a loop's body is JavaScript around markup: a
        // second node beside the first can land outside the parentheses (a bare
        // `: other ? …` branch) and break the expression. The legacy printer
        // rewraps it; until a planner rule does, the page is saved whole. Between
        // two roots of a loop written as markup, the node joins the run of
        // siblings the parentheses already hold.
        if (!betweenLoopRoots(bytes, projection, anchor, placement)) {
            return (0, result_1.err)('unsupported-operation');
        }
    }
    const separator = separatorBefore(bytes, projection, anchor);
    if (placement === 'after') {
        const at = (0, span_1.toByteSpan)(anchor.span.end, anchor.span.end);
        return (0, result_1.ok)({ range: at, text: `${separator}${text}`, anchorPath: anchor.path });
    }
    return (0, result_1.ok)({
        range: (0, span_1.toByteSpan)(anchor.span.start, anchor.span.start),
        text: `${text}${separator}`,
        anchorPath: shifted(anchor.path),
    });
}
// Beside a Markdown block or item, or inside a quote, an item or a list next
// to its first or last child (planMarkdown.ts). A block's inline text has no
// siblings, and an empty container no line to take a prefix from.
function markdownInsertionAt(bytes, projection, anchor, placement, text) {
    const beside = (0, planMarkdown_1.markdownBeside)(projection, anchor, placement);
    if (beside === undefined) {
        return (0, result_1.err)('unsupported-operation');
    }
    if (beside.node.list === 'inline') {
        return (0, result_1.err)('unsupported-operation');
    }
    if (beside.node.list === 'markup') {
        return (0, result_1.err)('unsupported-operation'); // Markup inside a Markdown container: its own rules.
    }
    const anchorPath = placement === 'before' ? shifted(anchor.path) : anchor.path;
    const insertion = (0, planMarkdown_1.markdownInsertion)(bytes, projection, beside, anchorPath, text);
    return insertion === undefined ? (0, result_1.err)('unsupported-operation') : (0, result_1.ok)(insertion);
}
/** The list a node placed at `placement` of `anchor` joins: the anchor's own
 * beside it; inside it, the list its children sit in — markup inside markup,
 * and inside a Markdown node whatever its first child says (an empty one says
 * nothing Markdown can place into: `inline`). */
function listAt(projection, anchor, placement) {
    if (!inside(placement)) {
        return anchor.list;
    }
    if (anchor.syntax === 'markup') {
        return 'markup';
    }
    const [first] = childrenOf(projection, anchor);
    return first === undefined ? 'inline' : first.list;
}
// Inside a tag, loop, or condition branch: beside its first or last child. An
// empty tag writes after its opening tag; an empty branch replaces its `null`
// placeholder. A self-closing non-void tag gains a closing tag with its first child.
function insertionInside(bytes, projection, parent, placement, text) {
    const tag = parent.kind === 'element' || parent.kind === 'component';
    const structure = parent.kind === 'map' || parent.kind === 'branch';
    if (!tag && !structure) {
        return (0, result_1.err)('unsupported-operation');
    }
    const children = childrenOf(projection, parent);
    const first = children[0];
    const last = children[children.length - 1];
    if (first !== undefined) {
        if (last !== undefined) {
            const beside = placement === 'first-child' ? first : last;
            const separator = separatorBefore(bytes, projection, beside);
            const anchorPath = parent.path;
            const preserved = branchChildAsMarkup(bytes, parent, beside);
            if (preserved !== undefined) {
                if (placement !== 'first-child') {
                    return (0, result_1.err)('unsupported-operation');
                }
                return (0, result_1.ok)({ range: beside.span, text: `${text}${separator}${preserved}`, anchorPath });
            }
            if (placement === 'first-child') {
                return (0, result_1.ok)({ range: point(first.span.start), text: `${text}${separator}`, anchorPath });
            }
            return (0, result_1.ok)({ range: point(last.span.end), text: `${separator}${text}`, anchorPath });
        }
    }
    if (parent.kind === 'branch') {
        return (0, result_1.ok)({ range: parent.span, text, anchorPath: parent.path });
    }
    if (parent.kind === 'map') {
        // A loop with nothing in it yet returns `(null)`: the serializer writes
        // that, because `() => ()` does not parse. Its first item takes the
        // placeholder's place, which leaves `=> (<item />)`, the loop's markup form.
        const placeholder = emptyLoopPlaceholder(bytes, parent);
        if (placeholder === undefined) {
            return (0, result_1.err)('unsupported-operation'); // An empty callback this cannot read.
        }
        return (0, result_1.ok)({ range: placeholder, text, anchorPath: parent.path });
    }
    if (!tag) {
        return (0, result_1.err)('unsupported-operation');
    }
    const open = (0, planSupport_1.openTagEnd)(bytes, parent);
    if (open.selfClosing) {
        const name = (0, planSupport_1.textOf)(bytes, (0, span_1.toByteSpan)(parent.span.start + 1, (0, planSupport_1.tagNameEnd)(bytes, parent)));
        if (parent.kind === 'element' && htmlTags_1.HTML_VOID_TAGS.has(name.toLowerCase())) {
            return (0, result_1.err)('unsupported-operation');
        }
        return (0, result_1.ok)(insertionIntoSelfClosingTag(bytes, parent, open.end, text));
    }
    const close = (0, planSupport_1.closeTagStart)(bytes, parent, open.end);
    if (close === undefined) {
        return (0, result_1.err)('unsupported-operation');
    }
    const lined = (0, planSupport_1.containsNewline)(bytes, (0, span_1.toByteSpan)(open.end, close));
    const lead = lined ? `\n${(0, planSupport_1.lineIndent)(bytes, parent.span.start)}  ` : '';
    return (0, result_1.ok)({ range: point(open.end), text: `${lead}${text}`, anchorPath: parent.path });
}
function insertionIntoSelfClosingTag(bytes, parent, openEnd, text) {
    (0, assert_1.assert)(parent.kind === 'component' || parent.kind === 'element', 'A paired conversion starts from a tag');
    const slash = openEnd - 2;
    (0, assert_1.assert)(bytes[slash] === 0x2f, 'A self-closing component ends in a slash');
    const nameSpan = (0, span_1.toByteSpan)(parent.span.start + 1, (0, planSupport_1.tagNameEnd)(bytes, parent));
    const name = (0, planSupport_1.textOf)(bytes, nameSpan);
    (0, assert_1.assert)(name.length > 0, 'A component has a written tag name');
    const range = (0, span_1.toByteSpan)(selfClosingTailStart(bytes, slash), openEnd);
    return {
        range,
        text: `>${text}</${name}>`,
        anchorPath: parent.path,
    };
}
// On one line, remove the cosmetic space before `/>`; on a line of its own,
// preserve indentation so the closing bracket stays aligned with the tag.
function selfClosingTailStart(bytes, slash) {
    let start = slash;
    while (start > 0) {
        const previous = bytes[start - 1];
        (0, assert_1.assert)(previous !== undefined, 'The self-closing tail lies inside the bytes');
        if (previous !== 0x20 && previous !== 0x09) {
            break;
        }
        start--;
    }
    return bytes[start - 1] === NEWLINE ? slash : start;
}
// A value or nested condition is code while it is the branch's only child.
// Once markup stands beside it, braces are what keep that code an Astro
// expression instead of turning its tokens into text nodes.
function branchChildAsMarkup(bytes, parent, child) {
    if (parent.kind !== 'branch') {
        return undefined;
    }
    if (child.kind !== 'cond' && child.kind !== 'expr') {
        return undefined;
    }
    (0, assert_1.assert)(parent.span.start <= child.span.start, 'A branch child starts inside its branch');
    (0, assert_1.assert)(child.span.end <= parent.span.end, 'A branch child ends inside its branch');
    const source = (0, planSupport_1.textOf)(bytes, child.span);
    return source.startsWith('{') ? source : `{${source}}`;
}
// The `null` of an empty loop's `=> (null))}`, as the parser reads that form
// (astroTemplate.ts, parseMapEmpty). Anything else returning nothing is
// callback code, which the projection marks and placeWritable has refused.
const EMPTY_LOOP_TAIL = /=>[ \t\r\n]*\([ \t\r\n]*null[ \t\r\n]*\)[ \t\r\n]*\)[ \t\r\n]*\}?[ \t\r\n]*$/;
function emptyLoopPlaceholder(bytes, loop) {
    (0, assert_1.assert)(loop.kind === 'map', 'Only a loop holds an empty-loop placeholder');
    (0, assert_1.assert)(loop.callback !== true, 'A callback loop is refused before its placeholder is read');
    const source = (0, planSupport_1.textOf)(bytes, loop.span);
    const match = EMPTY_LOOP_TAIL.exec(source);
    if (match === null) {
        return undefined;
    }
    const keyword = source.lastIndexOf('null');
    (0, assert_1.assert)(keyword > match.index, 'The placeholder lies inside the matched tail');
    // The tail after the keyword is ASCII whitespace and brackets, so its UTF-16
    // length is its length in bytes.
    const tailBytes = source.length - keyword;
    const start = loop.span.end - tailBytes;
    (0, assert_1.assert)(start >= loop.span.start, 'The placeholder starts inside the loop');
    return (0, span_1.toByteSpan)(start, start + 'null'.length);
}
// How the node is set apart from what precedes it: the whitespace run between
// them. A root node with nothing before it on its line gets a line break.
function separatorBefore(bytes, projection, node) {
    const bounds = siblingBounds(bytes, projection, node);
    const start = (0, planSupport_1.whitespaceBefore)(bytes, node.span.start, bounds.floor);
    const separator = (0, planSupport_1.textOf)(bytes, (0, span_1.toByteSpan)(start, node.span.start));
    if (separator === '') {
        if (node.path.length === 1) {
            return '\n';
        }
    }
    return separator;
}
// A node's whitespace neighbourhood ends at its siblings, else at its parent's
// content (inside a tag's opening and closing), else at the file's body.
function siblingBounds(bytes, projection, node) {
    // Blank text between siblings is the separator itself, never a neighbour.
    const siblings = (0, planSupport_1.siblingsOf)(projection, node).filter((sibling) => sibling === node || !(0, planSupport_1.blankText)(bytes, sibling));
    const index = siblings.indexOf(node);
    (0, assert_1.assert)(index >= 0, 'A node is among its siblings');
    const previous = siblings[index - 1];
    const next = siblings[index + 1];
    const outer = contentOf(bytes, projection, node);
    return {
        floor: previous === undefined ? outer.start : previous.span.end,
        ceiling: next === undefined ? outer.end : next.span.start,
    };
}
// The bytes a node's parent holds its children in.
function contentOf(bytes, projection, node) {
    if (node.path.length === 1) {
        const body = projection.frontmatter === undefined ? bomLength(bytes) : projection.frontmatter.end;
        return (0, span_1.toByteSpan)(body, bytes.length);
    }
    const parent = (0, planSupport_1.nodeAtPath)(projection, (0, planSupport_1.parentPath)(node.path));
    (0, assert_1.assert)(parent !== undefined, 'A nested node has a parent');
    if (parent.kind === 'element' || parent.kind === 'component') {
        const open = (0, planSupport_1.openTagEnd)(bytes, parent);
        const close = (0, planSupport_1.closeTagStart)(bytes, parent, open.end);
        (0, assert_1.assert)(close !== undefined, 'A tag with children has a closing tag');
        return (0, span_1.toByteSpan)(open.end, close);
    }
    return parent.span;
}
function bomLength(bytes) {
    if (bytes[0] === 0xef) {
        if (bytes[1] === 0xbb) {
            return bytes[2] === 0xbf ? 3 : 0;
        }
    }
    return 0;
}
function childrenOf(projection, node) {
    return projection.nodes.filter((candidate) => candidate.path.length === node.path.length + 1 && (0, planSupport_1.startsWith)(candidate.path, node.path));
}
function parentKind(projection, node) {
    if (node.path.length === 1) {
        return [];
    }
    const parent = (0, planSupport_1.nodeAtPath)(projection, (0, planSupport_1.parentPath)(node.path));
    (0, assert_1.assert)(parent !== undefined, 'A nested node has a parent');
    return [{ path: parent.path, kind: parent.kind }];
}
function currentProjection(context) {
    const projection = context.current.projection;
    (0, assert_1.assert)(projection.tag === 'valid', 'A resolved target lies in a parsing file');
    return projection;
}
function shifted(path) {
    const last = path[path.length - 1];
    (0, assert_1.assert)(last !== undefined, 'A tree node has a path');
    return [...path.slice(0, -1), last + 1];
}
// Beside a node, the list it sits in is written; inside it, its own content.
function placeWritable(bytes, projection, node, placement) {
    if (inside(placement)) {
        if (node.callback === true) {
            return false; // Separate return sites cannot receive one shared sibling insertion.
        }
        return (0, planSupport_1.nodeEditable)(node);
    }
    if (node.capability === 'repeated-source-node') {
        // Repetition is inherited by every descendant. Only the immediate owner
        // decides whether siblings are markup or separate JavaScript return sites.
        const parent = (0, planSupport_1.nodeAtPath)(projection, (0, planSupport_1.parentPath)(node.path));
        (0, assert_1.assert)(parent !== undefined, 'A repeated source node has an enclosing owner');
        (0, assert_1.assert)(node.list === 'markup', 'Repeated source nodes belong to markup syntax');
        if (parent.kind === 'element' || parent.kind === 'component') {
            return true;
        }
        return betweenLoopRoots(bytes, projection, node, placement);
    }
    return (0, planSupport_1.nodePlaceable)(node);
}
// Beside a root of a loop written as markup, `=> (<a /> <b />)`, with another
// root on that side: the insertion lands inside the run of siblings the
// parentheses hold, which the parser reads back as the loop's markup. At
// either edge it is addressed inside the loop instead (first-child or
// last-child, insertionInside), so it can never stand outside the run; and a
// callback's roots are separate JavaScript return sites, never one run.
function betweenLoopRoots(bytes, projection, node, placement) {
    (0, assert_1.assert)(!inside(placement), 'Only a placement beside a root stands between roots');
    (0, assert_1.assert)(node.path.length > 1, 'A loop root has a parent');
    const parent = (0, planSupport_1.nodeAtPath)(projection, (0, planSupport_1.parentPath)(node.path));
    (0, assert_1.assert)(parent !== undefined, 'A nested node has a parent');
    if (parent.kind !== 'map') {
        return false;
    }
    if (parent.callback === true) {
        return false;
    }
    const roots = (0, planSupport_1.siblingsOf)(projection, node).filter((sibling) => !(0, planSupport_1.blankText)(bytes, sibling));
    const index = roots.indexOf(node);
    (0, assert_1.assert)(index >= 0, 'A loop root is among its siblings');
    if (placement === 'before') {
        return 0 < index;
    }
    return index + 1 < roots.length;
}
function inside(placement) {
    switch (placement) {
        case 'first-child':
        case 'last-child':
            return true;
        case 'before':
        case 'after':
            return false;
        default: {
            const exhaustive = placement;
            return exhaustive;
        }
    }
}
// A branch belongs to its condition and a chunk group to its chunk file; the
// rest of the tree can be taken out, put back, or stood beside.
function movable(kind) {
    switch (kind) {
        case 'branch':
        case 'chunk-group':
            return false;
        case 'component':
        case 'element':
        case 'raw':
        case 'text':
        case 'expr':
        case 'raw-line':
        case 'comment':
        case 'map':
        case 'cond':
            return true;
        default: {
            const exhaustive = kind;
            return exhaustive;
        }
    }
}
function spliceAt(bytes, range, replacement) {
    return {
        range,
        expectedBytes: (0, planSupport_1.slice)(bytes, range),
        replacementBytes: (0, span_1.encodeUtf8)(replacement),
    };
}
