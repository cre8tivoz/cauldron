"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.projectionAcceptsVisualIntents = projectionAcceptsVisualIntents;
exports.projectPage = projectPage;
exports.projectOpaqueDocument = projectOpaqueDocument;
exports.classifyNode = classifyNode;
// The projection: a disposable, byte-addressed view of one version of a file
// (plan §3.6, §2 Layer 1). It is derived from the bytes, never edited, and
// replaced whole when the bytes change. Named so that nothing in it can be
// mistaken for the page tree in pageNode.ts, which stays the wire model until
// step 9: a ProjectedNode has a byte span, a structural path and a capability,
// and no id — identity is resolved at use time (plan §4).
//
// Invalid source is a first-class state, not an exception: the code editor and
// external writers may leave a file that does not parse, and visual intents
// then reject with `source-invalid` while the bytes stay in the snapshot.
const assert_1 = require("../core/assert");
const brand_1 = require("../core/brand");
const limits_1 = require("../core/limits");
const ref_1 = require("./ref");
const span_1 = require("../core/span");
/** Whether visual intents can be planned against this projection at all. */
function projectionAcceptsVisualIntents(projection) {
    switch (projection.tag) {
        case 'valid':
            return true;
        case 'parse-error':
            return false;
        default: {
            const exhaustive = projection;
            return exhaustive;
        }
    }
}
/** Project one page. `result` is the validated output of the parser run on
 * exactly `text` with source offsets on: `parsePage(text, { locs })` for an
 * `.astro` page, `parseMarkdownPage(text)` for Markdown and MDX (step 10). */
function projectPage(text, result) {
    if (limits_1.LIMITS.ipcFieldCharsMax < text.length) {
        (0, assert_1.assert)(!result.editable, 'The parser refuses a page past its UTF-16 bound');
        return overlong(text);
    }
    const byteLength = (0, span_1.utf8ByteLength)(text);
    (0, assert_1.assert)(byteLength <= limits_1.LIMITS.sourceBytesMax, 'Projected source is inside the file bound');
    if (!result.editable) {
        const near = result.bail === undefined ? undefined : clip(result.bail.near);
        return {
            tag: 'parse-error',
            byteLength,
            diagnostics: [{ message: clip(result.reason), near }],
        };
    }
    const model = result.model;
    (0, assert_1.assert)(model.bodyStart !== undefined, 'The projected parse recorded source offsets');
    const pending = collectNodes(model.nodes, model.format === undefined ? undefined : text);
    const frontmatter = frontmatterSpan(text, model);
    const converter = spanConverter(text, pending, frontmatter);
    const nodes = pending.map((entry) => projectNode(entry, converter));
    (0, assert_1.assert)(nodes.length === pending.length, 'Every collected node is projected');
    return {
        tag: 'valid',
        byteLength,
        utf16Length: text.length,
        frontmatter: frontmatter === undefined ? undefined : converter(frontmatter),
        nodes,
    };
}
/** Project a file the engine addresses only as a whole document — a stylesheet
 * written through its own actor (plan §3.3). Valid, with no nodes: document
 * anchors and code patches may target it, visual node intents may not. */
function projectOpaqueDocument(text) {
    if (limits_1.LIMITS.ipcFieldCharsMax < text.length) {
        return overlong(text);
    }
    const byteLength = (0, span_1.utf8ByteLength)(text);
    (0, assert_1.assert)(byteLength <= limits_1.LIMITS.sourceBytesMax, 'Projected source is inside the file bound');
    (0, assert_1.assert)(byteLength >= text.length, 'UTF-8 never takes fewer bytes than UTF-16 units');
    return { tag: 'valid', byteLength, utf16Length: text.length, frontmatter: undefined, nodes: [] };
}
// --- Internal ----------------------------------------------------------------
// A file inside the byte bound can still exceed the UTF-16 bound the parser and
// the offset converter keep: 10 MB of ASCII is 10 485 760 units, over
// ipcFieldCharsMax. That is user input, so it projects as a parse error; before
// this check it reached the converter's assertion and crashed (found at step 4).
function overlong(text) {
    const byteLength = (0, span_1.encodeUtf8)(text).length;
    (0, assert_1.assert)(byteLength >= text.length, 'UTF-8 never takes fewer bytes than UTF-16 units');
    const message = `Source exceeds ${limits_1.LIMITS.ipcFieldCharsMax} UTF-16 units.`;
    return { tag: 'parse-error', byteLength, diagnostics: [{ message, near: undefined }] };
}
// Iterative preorder walk: the depth bound is the tree's, not the call stack's.
// `markdown` is the page's text when it is a Markdown page: its root nodes are
// blocks, and what a node's children are depends on how the node is written.
function collectNodes(roots, markdown) {
    const out = [];
    const stack = [];
    const pushChildren = (children, parent, list) => {
        for (let index = children.length - 1; index >= 0; index--) {
            const child = children[index];
            (0, assert_1.assert)(child !== undefined, 'Child index lies inside its list');
            const path = [...parent.path, (0, ref_1.toChildIndex)(index)];
            const syntax = syntaxIn(list, child, markdown);
            stack.push({ node: child, path, repeated: parent.repeated, syntax, list });
        }
    };
    pushChildren(roots, { path: [], repeated: false }, markdown === undefined ? 'markup' : 'blocks');
    while (stack.length > 0) {
        (0, assert_1.assert)(out.length < limits_1.LIMITS.treeNodesMax, 'Projection stays inside the tree node bound');
        const entry = stack.pop();
        (0, assert_1.assert)(entry !== undefined, 'The stack is non-empty inside the loop');
        (0, assert_1.assert)(entry.path.length <= limits_1.LIMITS.treeDepthMax + 1, 'Projection stays inside the depth bound');
        const span = nodeSpan(entry.node);
        out.push({ ...entry, span });
        const children = childrenOf(entry.node);
        if (children.length > 0) {
            checkChildSpans(span, children);
            const repeated = entry.repeated || entry.node.kind === 'map';
            pushChildren(children, { path: entry.path, repeated }, childList(entry));
        }
    }
    return out;
}
// A node in a list of Markdown blocks is written in Markdown unless it is
// markup standing as a block: JSX or HTML opens with `<`, and no Markdown
// block does (a line opening with one is always a markup block).
function syntaxIn(list, node, markdown) {
    switch (list) {
        case 'markup':
            return 'markup';
        case 'items':
        case 'inline':
            return 'markdown';
        case 'blocks': {
            (0, assert_1.assert)(markdown !== undefined, 'Only a Markdown page has blocks');
            if (node.kind === 'raw-line') {
                return 'markdown';
            }
            if (node.kind !== 'element') {
                return 'markup';
            }
            const start = nodeSpan(node).start;
            return markdown.charCodeAt(start) === 0x3c ? 'markup' : 'markdown';
        }
        default: {
            const exhaustive = list;
            return exhaustive;
        }
    }
}
// The list a node's children sit in: markup inside markup; a Markdown list
// holds items, an item or a quote holds blocks, and every other Markdown block
// holds its inline text.
function childList(parent) {
    if (parent.syntax === 'markup') {
        return 'markup';
    }
    const name = 'name' in parent.node ? parent.node.name : '';
    switch (name) {
        case 'ul':
        case 'ol':
            return 'items';
        case 'li':
        case 'blockquote':
            return 'blocks';
        default:
            return 'inline';
    }
}
function childrenOf(node) {
    if ('children' in node) {
        return node.children ?? [];
    }
    return [];
}
function nodeSpan(node) {
    (0, assert_1.assert)(node.start !== undefined, `A projected ${node.kind} node has a start offset`);
    (0, assert_1.assert)(node.end !== undefined, `A projected ${node.kind} node has an end offset`);
    return { start: node.start, end: node.end };
}
// Children sit inside their parent, in order, without overlapping: the property
// the anchor resolver's structural path relies on (paired with the span-integrity
// contract test, which checks the same on every corpus file).
function checkChildSpans(parent, children) {
    const spans = children.map(nodeSpan);
    for (const span of spans) {
        (0, assert_1.assert)((0, span_1.spanContains)(parent, span), 'A child span lies inside its parent');
    }
    (0, assert_1.assert)((0, span_1.spansAscending)(spans), 'Sibling spans ascend without overlapping');
}
function frontmatterSpan(text, model) {
    if (!model.hadFrontmatter) {
        return undefined;
    }
    const bodyStart = model.bodyStart;
    (0, assert_1.assert)(bodyStart !== undefined, 'A located parse records where the body starts');
    const start = text.startsWith('﻿') ? 1 : 0;
    (0, assert_1.assert)(start < bodyStart, 'The frontmatter block is not empty');
    return { start: (0, brand_1.toUtf16Offset)(start), end: (0, brand_1.toUtf16Offset)(bodyStart) };
}
// Every offset the projection needs is converted in one sorted pass, so the
// cost is linear in the file however many spans it has. The offsets are
// collected in a typed array and sorted natively: a Set, a spread and a
// comparator sort over a few hundred thousand offsets cost more than the
// conversion itself. Lookups are a binary search over the unique offsets.
function spanConverter(text, pending, frontmatter) {
    const collected = [];
    const add = (span) => {
        collected.push(span.start, span.end);
    };
    if (frontmatter !== undefined) {
        add(frontmatter);
    }
    for (const entry of pending) {
        add(entry.span);
        for (const attribute of attrSpansOf(entry.node)) {
            forEachAttrSpan(attribute, add);
        }
    }
    const unique = sortedUniqueOffsets(collected, text.length);
    const converted = (0, span_1.utf16ToByteOffsets)(text, Array.from(unique, (offset) => (0, brand_1.toUtf16Offset)(offset)));
    (0, assert_1.assert)(converted.length === unique.length, 'Conversion returns one offset per input');
    const lookup = (offset) => {
        const index = offsetIndex(unique, offset);
        (0, assert_1.assert)(index !== undefined, 'Span offset was collected for conversion');
        const bytes = converted[index];
        (0, assert_1.assert)(bytes !== undefined, 'Every collected offset was converted');
        return bytes;
    };
    return (span) => (0, span_1.toByteSpan)(lookup(span.start), lookup(span.end));
}
// Ascending, without duplicates. Offsets index the text, so they fit 32 bits
// (the text is bounded by the source limit, far below 2³²).
function sortedUniqueOffsets(offsets, textLength) {
    (0, assert_1.assert)(textLength < 2 ** 32, 'Text offsets fit an unsigned 32-bit integer');
    const sorted = Uint32Array.from(offsets).sort();
    let count = 0;
    for (let index = 0; index < sorted.length; index++) {
        const offset = sorted[index];
        (0, assert_1.assert)(offset !== undefined, 'The index lies inside the sorted offsets');
        (0, assert_1.assert)(offset <= textLength, 'A collected offset lies inside the text');
        const previous = count === 0 ? undefined : sorted[count - 1];
        if (previous !== offset) {
            sorted[count] = offset;
            count++;
        }
    }
    return sorted.subarray(0, count);
}
function offsetIndex(unique, offset) {
    let low = 0;
    let high = unique.length;
    // Binary search: the range halves every pass, so it ends within 33 of them.
    for (let pass = 0; pass <= 33; pass++) {
        if (low < high) {
            const middle = low + Math.floor((high - low) / 2);
            const found = unique[middle];
            (0, assert_1.assert)(found !== undefined, 'The middle lies inside the range');
            if (found < offset) {
                low = middle + 1;
            }
            else {
                high = middle;
            }
        }
        else {
            return unique[low] === offset ? low : undefined;
        }
    }
    throw new Error('Assertion failed: binary search ends within 33 passes');
}
function attrSpansOf(node) {
    return node.attrSpans ?? [];
}
function forEachAttrSpan(attribute, visit) {
    visit(attribute.span);
    switch (attribute.type) {
        case 'string':
        case 'expr':
            visit(attribute.nameSpan);
            visit(attribute.valueSpan);
            return;
        case 'bare':
            visit(attribute.nameSpan);
            return;
        case 'spread':
        case 'markdown':
            visit(attribute.valueSpan);
            return;
        default: {
            const exhaustive = attribute;
            throw new Error(`Unknown attribute span ${JSON.stringify(exhaustive)}`);
        }
    }
}
function projectNode(entry, convert) {
    const capability = classifyNode(entry.node, { repeated: entry.repeated });
    const attributes = attrSpansOf(entry.node).map((attribute) => ({
        name: attribute.name,
        type: attribute.type,
        span: convert(attribute.span),
        nameSpan: 'nameSpan' in attribute ? convert(attribute.nameSpan) : undefined,
        valueSpan: 'valueSpan' in attribute ? convert(attribute.valueSpan) : undefined,
        capability: classifyAttribute(attribute, capability),
    }));
    return {
        kind: entry.node.kind,
        path: entry.path,
        span: convert(entry.span),
        attributes,
        capability,
        syntax: entry.syntax,
        list: entry.list,
        ...(entry.node.kind === 'map' && entry.node.bodyParts !== undefined ? { callback: true } : {}),
    };
}
/** Plan §6: native elements, component invocations, text, comments, a page's
 * own `<style>` and the structural nodes are visually editable; opaque code is
 * not; anything inside a loop body is one source node rendered many times. */
function classifyNode(node, placement) {
    if (placement.repeated) {
        return 'repeated-source-node';
    }
    switch (node.kind) {
        case 'component':
        case 'element':
            // Astro's built-in Fragment is authored markup even when `set:html`
            // supplies its transparent contents. Its directive belongs in the
            // Attributes editor; classifying the whole wrapper as code hides it.
            if (node.name === 'Fragment') {
                return 'editable';
            }
            return writesChildrenAtRuntime(node.props) ? 'read-only-opaque' : 'editable';
        case 'raw':
            // A page's own <style> is same-file styles (plan §6: visually editable):
            // the style panel restates its rules. A <script> is code the editor does
            // not read, kept verbatim.
            return node.name === 'style' ? 'editable' : 'read-only-opaque';
        case 'expr':
        case 'raw-line':
            return 'read-only-opaque';
        case 'chunk-group':
            return 'runtime-aggregate';
        case 'text':
        case 'comment':
        case 'map':
        case 'cond':
        case 'branch':
            return 'editable';
        default: {
            const exhaustive = node;
            return exhaustive;
        }
    }
}
// `set:html` and `set:text` replace the children at render time, so the source
// children are not what the page shows.
function writesChildrenAtRuntime(props) {
    if (props === undefined) {
        return false;
    }
    return Object.hasOwn(props, 'set:html') || Object.hasOwn(props, 'set:text');
}
function classifyAttribute(attribute, node) {
    if (node !== 'editable') {
        return node;
    }
    return attribute.type === 'spread' ? 'read-only-opaque' : 'editable';
}
function clip(message) {
    return message.length <= limits_1.LIMITS.diagnosticCharsMax ? message : message.slice(0, limits_1.LIMITS.diagnosticCharsMax);
}
