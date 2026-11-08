"use strict";
// The template parser's shared state: the bail that stops a parse the
// editor cannot represent, the bounds every parse runs within, the shapes a
// tag parse returns, and the branch nodes of conditional markup.
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseState = exports.branchIsMarkup = void 0;
exports.makeBranch = makeBranch;
exports.exprBranch = exprBranch;
exports.bail = bail;
exports.resetParseBail = resetParseBail;
exports.parseTemplateAt = parseTemplateAt;
exports.parseTemplateWithinBounds = parseTemplateWithinBounds;
const limits_1 = require("../../shared/core/limits");
const astroAttrs_1 = require("./astroAttrs");
const astroScan_1 = require("./astroScan");
// A branch spans its side of the conditional as written, whitespace trimmed:
// `( <p/> )` after the `?`, or the markup after the `&&`.
function makeBranch(name, children, raw, base) {
    const branch = { id: (0, astroAttrs_1.makeId)(), kind: 'branch', name, children };
    if (base !== undefined) {
        const start = base + (raw.length - raw.trimStart().length);
        branch.start = start;
        branch.end = Math.max(start, base + raw.trimEnd().length);
    }
    return branch;
}
// Whether a branch renders markup, as opposed to a value.
const branchIsMarkup = (kids) => (kids || []).some((kid) => kid.kind !== 'expr' && kid.kind !== 'text');
exports.branchIsMarkup = branchIsMarkup;
// The other side of a conditional whose one side is markup: a plain value, as
// an expression child.
//
// `{href ? (<a …>{heading}</a>) : (heading)}` — the LinkCard pattern — used to
// be code in the navigator, whole, because one of its branches was a bare name
// rather than a tag. Which meant a conditional around an anchor read as a wall
// of JSX, and neither the anchor nor the fallback could be selected.
//
// Written with braces, like every other expression node: it lands in JSX
// context on the canvas (inside the branch's Fragment). The writer takes them
// off again for the file, where a branch's parens are JS.
function exprBranch(raw, base = undefined) {
    const text = String(raw);
    let expression = text.trimStart();
    let at = base === undefined ? undefined : base + (text.length - expression.length);
    expression = expression.trimEnd();
    while (expression.startsWith('(') && (0, astroScan_1.findMatchingParen)(expression, 0) === expression.length - 1) {
        const inner = expression.slice(1, -1);
        const trimmed = inner.trimStart();
        if (at !== undefined) {
            at += 1 + (inner.length - trimmed.length);
        }
        expression = trimmed.trimEnd();
    }
    // Markup that failed to parse is not a value — sending it back as an opaque
    // expression would hide a real bail behind a node that looks fine.
    if (!expression || expression.startsWith('<')) {
        return undefined;
    }
    const node = { id: (0, astroAttrs_1.makeId)(), kind: 'expr', value: `{${expression}}` };
    if (at !== undefined) {
        node.start = at;
        node.end = at + expression.length;
    }
    return [node];
}
// What made the last parse give up, so the code-view banner can name the
// construct and point at it instead of listing everything it might have been.
// parseTemplate recurses into children, and the innermost frame is the one that
// actually found the problem — so only the first bail of a run is kept, and
// parsePage clears it before starting.
exports.parseState = {
    lastBail: undefined,
    depth: 0,
    nodes: 0,
    conditions: 0,
};
function bail(nodes, template, at, what) {
    if (!exports.parseState.lastBail) {
        exports.parseState.lastBail = { what, near: template.slice(at, at + 60) };
    }
    return { nodes, clean: false };
}
function resetParseBail() {
    exports.parseState.lastBail = undefined;
}
function parseTemplateAt(node, base, from, to) {
    if (base === undefined) {
        return node;
    }
    return { ...node, start: base + from, end: base + to };
}
// Conditional branch wrappers and inserted inline spaces count as real nodes,
// even though they do not advance the source scanner's emission counter.
function parseTemplateWithinBounds(nodes) {
    if (nodes.length > limits_1.LIMITS.treeNodesMax) {
        return false;
    }
    const pending = nodes.map((node) => ({ node, depth: 0 }));
    for (let index = 0; index < pending.length; index++) {
        const entry = (0, astroAttrs_1.required)(pending[index], 'Template traversal index is in bounds');
        if (entry.depth > limits_1.LIMITS.treeDepthMax) {
            return false;
        }
        if (entry.node.children) {
            if (pending.length + entry.node.children.length > limits_1.LIMITS.treeNodesMax) {
                return false;
            }
            for (const node of entry.node.children) {
                pending.push({ node, depth: entry.depth + 1 });
            }
        }
    }
    return true;
}
