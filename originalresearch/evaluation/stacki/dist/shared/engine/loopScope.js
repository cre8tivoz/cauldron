"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UNBOUND_TEXT = void 0;
exports.loopHead = loopHead;
exports.scopeAt = scopeAt;
exports.renameSites = renameSites;
exports.stripEdits = stripEdits;
// Loop variables in the source bytes (plan §3.3): the two gestures that care
// which names a loop declares. A loop rename touches every reference below the
// loop — a multi-span intent — and a move out of a loop leaves references to
// the loop's item behind, which the move replaces with placeholder text, so an
// expression node becomes text (a kind-changing intent). The renderer's model
// version of both rules is src/editor/loopBindings.ts (renamedLoopVar,
// strippedBindings); this module reads the same things off the bytes, so the
// byte edit and the model edit agree, and the gesture parity suite holds them
// to each other on the corpus.
//
// Pure: projections and bytes in, spans out. Anything this cannot read with
// certainty — a loop head that is not `data.map((item, index) => …`, a
// condition whose test it cannot delimit — is `undefined`, and the caller
// refuses rather than guesses.
const assert_1 = require("../core/assert");
const limits_1 = require("../core/limits");
const planSupport_1 = require("./planSupport");
const span_1 = require("../core/span");
/** What a dropped binding becomes (src/editor/loopBindings.ts, UNBOUND_TEXT). */
exports.UNBOUND_TEXT = 'content';
// The renderer's form (src/editor/loopBindings.ts, MAP_HEAD_RE): parenthesized
// parameters, then an arrow to markup `(` or to a statement body `{`.
const IDENTIFIER = '[A-Za-z_$][\\w$]*';
const HEAD_RE = new RegExp([
    '^\\{(\\s*)([\\s\\S]+?)', // `{` and the data expression
    `\\.map\\(\\s*\\(\\s*(${IDENTIFIER})`, // `.map((item`
    `\\s*(?:,\\s*(${IDENTIFIER})\\s*)?`, // `, index`
    '\\)\\s*=>\\s*([({])', // `) => (` or `) => {`
].join(''));
const TEST_RE = /^(\s*)([\s\S]*?)(\s*(?:&&|\?)\s*\(?\s*)$/;
const BRACES_RE = /\{([^{}]*)\}/g;
/** The head of a `map` node, or undefined when it is not the form above. */
function loopHead(projection, bytes, node) {
    (0, assert_1.assert)(node.kind === 'map', 'Only a loop has a head');
    const text = (0, planSupport_1.textOf)(bytes, node.span);
    const match = HEAD_RE.exec(text);
    if (match === null) {
        return undefined;
    }
    const lead = (match[1] ?? '').length;
    const data = match[2] ?? '';
    const dataStart = 1 + lead;
    const dataEnd = dataStart + data.trimEnd().length;
    const names = [match[3], match[4]].filter((name) => name !== undefined);
    const positions = names.flatMap((name) => {
        const start = parameterAt(text, match[0], name);
        return [start, start + name.length];
    });
    const offsets = (0, planSupport_1.byteOffsetsIn)(text, [dataStart, dataEnd, ...positions, match[0].length]);
    const at = (index) => {
        const offset = offsets[index];
        (0, assert_1.assert)(offset !== undefined, 'Every head offset was converted');
        return node.span.start + offset;
    };
    const parameters = names.map((name, index) => ({
        name,
        span: (0, span_1.toByteSpan)(at(2 + index * 2), at(3 + index * 2)),
    }));
    const headEnd = at(offsets.length - 1);
    const body = match[5] === '{' ? bodyRegion(projection, node, headEnd) : undefined;
    if (match[5] === '{') {
        if (body === undefined) {
            return undefined;
        }
    }
    return { data: (0, span_1.toByteSpan)(at(0), at(1)), parameters, body };
}
// The parameter's own position: after the `.map(` of the matched head, so a
// name that also occurs in the data expression is not taken for it.
function parameterAt(text, head, name) {
    const mapAt = head.lastIndexOf('.map(');
    (0, assert_1.assert)(mapAt >= 0, 'A matched head calls .map(');
    const found = new RegExp(`(?<![\\w$])${escape(name)}(?![\\w$])`).exec(text.slice(mapAt));
    (0, assert_1.assert)(found !== null, 'A matched parameter occurs after .map(');
    return mapAt + found.index;
}
function bodyRegion(projection, node, headEnd) {
    const [first] = childrenOf(projection, node);
    if (first === undefined) {
        return undefined;
    }
    return (0, span_1.toByteSpan)(headEnd, first.span.start);
}
/** The loop variables in scope at a node: every enclosing loop's parameters.
 * Undefined when an enclosing loop's head cannot be read. */
function scopeAt(projection, bytes, path) {
    const names = [];
    for (const ancestor of (0, planSupport_1.ancestorsOf)(projection, path)) {
        if (ancestor.kind === 'map') {
            const head = loopHead(projection, bytes, ancestor);
            if (head === undefined) {
                return undefined;
            }
            names.push(...head.parameters.map((parameter) => parameter.name));
        }
    }
    return [...new Set(names)];
}
/** Every place a rename of the loop's parameter `from` must touch: the
 * declaration, then each reference below the loop, skipping loops that
 * declare the name again (they shadow it). The model rule is renamedLoopVar. */
function renameSites(projection, bytes, loop, from) {
    const head = loopHead(projection, bytes, loop);
    if (head === undefined) {
        return undefined;
    }
    const declared = head.parameters.filter((parameter) => parameter.name === from);
    if (declared.length !== 1) {
        return undefined;
    }
    const sites = declared.map((parameter) => parameter.span);
    const shadowed = [];
    for (const node of (0, planSupport_1.subtreeOf)(projection, loop).slice(1)) {
        if (shadowed.some((path) => (0, planSupport_1.startsWith)(node.path, path))) {
            continue;
        }
        const found = referencesIn(projection, bytes, node, from);
        if (found === undefined) {
            return undefined;
        }
        sites.push(...found.sites);
        if (found.shadows) {
            shadowed.push(node.path);
        }
    }
    const sorted = sites.sort((left, right) => left.start - right.start);
    (0, assert_1.assert)(sorted.length <= limits_1.LIMITS.treeNodesMax * 4, 'Rename sites are bounded by the tree');
    return sorted;
}
function referencesIn(projection, bytes, node, name) {
    const sites = [];
    for (const attribute of node.attributes) {
        if (attribute.type === 'expr') {
            (0, assert_1.assert)(attribute.valueSpan !== undefined, 'An expression attribute has a value span');
            sites.push(...identifierSpans(bytes, attribute.valueSpan, name));
        }
    }
    switch (node.kind) {
        case 'expr':
            sites.push(...identifierSpans(bytes, innerOf(node.span), name));
            return { sites, shadows: false };
        case 'text':
            sites.push(...braceSpans(bytes, node.span).flatMap((inner) => identifierSpans(bytes, inner, name)));
            return { sites, shadows: false };
        case 'cond': {
            const test = testRegion(projection, bytes, node);
            if (test === undefined) {
                return undefined;
            }
            sites.push(...identifierSpans(bytes, test, name));
            return { sites, shadows: false };
        }
        case 'map': {
            const head = loopHead(projection, bytes, node);
            if (head === undefined) {
                return undefined;
            }
            sites.push(...identifierSpans(bytes, head.data, name));
            const shadows = head.parameters.some((parameter) => parameter.name === name);
            if (!shadows) {
                if (head.body !== undefined) {
                    sites.push(...identifierSpans(bytes, head.body, name));
                }
            }
            return { sites, shadows };
        }
        case 'component':
        case 'element':
        case 'raw':
        case 'raw-line':
        case 'comment':
        case 'branch':
        case 'chunk-group':
            return { sites, shadows: false };
        default: {
            const exhaustive = node.kind;
            return exhaustive;
        }
    }
}
/** The edits that keep a subtree valid once it leaves the loops declaring
 * `lost`: the byte form of strippedBindings. Undefined when a reading of a
 * lost name sits somewhere this cannot rewrite (a statement body, a head or a
 * test it cannot delimit). */
function stripEdits(projection, bytes, root, lost) {
    const edits = [];
    // Loops below the root narrow the active names for their own subtrees.
    const narrowed = [];
    for (const node of (0, planSupport_1.subtreeOf)(projection, root)) {
        const scope = narrowed.filter((entry) => (0, planSupport_1.startsWith)(node.path, entry.path) && node.path.length > entry.path.length);
        const innermost = scope[scope.length - 1];
        const active = innermost === undefined ? lost : innermost.active;
        if (active.length === 0) {
            continue;
        }
        const found = stripNode(projection, bytes, node, active);
        if (found === undefined) {
            return undefined;
        }
        edits.push(...found.edits);
        if (found.remaining !== undefined) {
            narrowed.push({ path: node.path, active: found.remaining });
        }
    }
    return edits.sort((left, right) => left.span.start - right.span.start);
}
function stripNode(projection, bytes, node, active) {
    const edits = [];
    for (const attribute of node.attributes) {
        if (attribute.type === 'expr') {
            (0, assert_1.assert)(attribute.valueSpan !== undefined, 'An expression attribute has a value span');
            if (readsAny((0, planSupport_1.textOf)(bytes, attribute.valueSpan), active)) {
                const start = (0, planSupport_1.whitespaceBefore)(bytes, attribute.span.start, (0, planSupport_1.tagNameEnd)(bytes, node));
                edits.push({ span: (0, span_1.toByteSpan)(start, attribute.span.end), text: '' });
            }
        }
    }
    switch (node.kind) {
        case 'expr':
            if (readsAny((0, planSupport_1.textOf)(bytes, innerOf(node.span)), active)) {
                edits.push({ span: node.span, text: exports.UNBOUND_TEXT });
            }
            return { edits, remaining: undefined };
        case 'text':
            for (const inner of braceSpans(bytes, node.span)) {
                if (readsAny((0, planSupport_1.textOf)(bytes, inner), active)) {
                    edits.push({ span: (0, span_1.toByteSpan)(inner.start - 1, inner.end + 1), text: exports.UNBOUND_TEXT });
                }
            }
            return { edits, remaining: undefined };
        case 'map':
            return stripLoop(projection, bytes, node, active, edits);
        case 'cond': {
            const test = testRegion(projection, bytes, node);
            if (test === undefined) {
                return undefined;
            }
            if (readsAny((0, planSupport_1.textOf)(bytes, test), active)) {
                edits.push({ span: test, text: 'false' });
            }
            return { edits, remaining: undefined };
        }
        case 'component':
        case 'element':
        case 'raw':
        case 'raw-line':
        case 'comment':
        case 'branch':
        case 'chunk-group':
            return { edits, remaining: undefined };
        default: {
            const exhaustive = node.kind;
            return exhaustive;
        }
    }
}
// A loop reading a lost name is pointed at an empty list: still valid code,
// renders nothing, keeps its markup. Its own parameters shadow lost names below.
function stripLoop(projection, bytes, node, active, edits) {
    const head = loopHead(projection, bytes, node);
    if (head === undefined) {
        return undefined;
    }
    if (readsAny((0, planSupport_1.textOf)(bytes, head.data), active)) {
        edits.push({ span: head.data, text: '[]' });
    }
    const own = new Set(head.parameters.map((parameter) => parameter.name));
    const remaining = active.filter((name) => !own.has(name));
    if (head.body !== undefined) {
        if (readsAny((0, planSupport_1.textOf)(bytes, head.body), remaining)) {
            return undefined; // Declarations reading a lost name: the model rule rewrites them.
        }
    }
    return { edits, remaining };
}
// The test of `{test && (` or `{test ? (`: from after the brace to the first
// branch, without the operator.
function testRegion(projection, bytes, node) {
    const [first] = childrenOf(projection, node);
    if (first === undefined) {
        return undefined;
    }
    const region = (0, span_1.toByteSpan)(node.span.start + 1, first.span.start);
    const text = (0, planSupport_1.textOf)(bytes, region);
    const match = TEST_RE.exec(text);
    if (match === null) {
        return undefined;
    }
    const lead = (match[1] ?? '').length;
    const test = match[2] ?? '';
    if (test.trim() === '') {
        return undefined;
    }
    const [start, end] = (0, planSupport_1.byteOffsetsIn)(text, [lead, lead + test.length]);
    (0, assert_1.assert)(start !== undefined, 'The test start was converted');
    (0, assert_1.assert)(end !== undefined, 'The test end was converted');
    return (0, span_1.toByteSpan)(region.start + start, region.start + end);
}
function childrenOf(projection, node) {
    return projection.nodes.filter((candidate) => candidate.path.length === node.path.length + 1 && (0, planSupport_1.startsWith)(candidate.path, node.path));
}
// `{…}` without its braces.
function innerOf(span) {
    (0, assert_1.assert)(span.end - span.start >= 2, 'An expression has its braces');
    return (0, span_1.toByteSpan)(span.start + 1, span.end - 1);
}
function braceSpans(bytes, span) {
    const text = (0, planSupport_1.textOf)(bytes, span);
    const found = [];
    for (const match of text.matchAll(BRACES_RE)) {
        const inner = match[1] ?? '';
        found.push(match.index + 1, match.index + 1 + inner.length);
    }
    const offsets = (0, planSupport_1.byteOffsetsIn)(text, found);
    const spans = [];
    for (let index = 0; index < offsets.length; index += 2) {
        const start = offsets[index];
        const end = offsets[index + 1];
        (0, assert_1.assert)(start !== undefined, 'A brace start was converted');
        (0, assert_1.assert)(end !== undefined, 'A brace end was converted');
        spans.push((0, span_1.toByteSpan)(span.start + start, span.start + end));
    }
    return spans;
}
/** Whole-identifier occurrences of `name` in a code span: `service`, never the
 * `service` of `x.service` or of `services` (src/editor/loopBindings.ts). */
function identifierSpans(bytes, span, name) {
    const text = (0, planSupport_1.textOf)(bytes, span);
    const found = [];
    for (const match of text.matchAll(identifierPattern(name, 'g'))) {
        found.push(match.index, match.index + name.length);
    }
    const offsets = (0, planSupport_1.byteOffsetsIn)(text, found);
    const spans = [];
    for (let index = 0; index < offsets.length; index += 2) {
        const start = offsets[index];
        const end = offsets[index + 1];
        (0, assert_1.assert)(start !== undefined, 'An identifier start was converted');
        (0, assert_1.assert)(end !== undefined, 'An identifier end was converted');
        spans.push((0, span_1.toByteSpan)(span.start + start, span.start + end));
    }
    return spans;
}
function readsAny(code, names) {
    return names.some((name) => identifierPattern(name, '').test(code));
}
function identifierPattern(name, flags) {
    return new RegExp(`(?<![.\\w$])${escape(name)}(?![\\w$])`, flags);
}
function escape(name) {
    return name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
