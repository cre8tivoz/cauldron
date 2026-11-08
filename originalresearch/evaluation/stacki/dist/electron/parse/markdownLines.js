"use strict";
// A Markdown page as lines: the node and line shapes the parser builds, the
// patterns each block starts with, the frontmatter split, and moving source
// offsets onto the page (markdownParser.ts).
Object.defineProperty(exports, "__esModule", { value: true });
exports.CONTAINER_DEPTH_MAX = exports.MDX_IMPORT_RE = exports.ESM_RE = exports.IMAGE_ONLY_RE = exports.LAZY_BREAK_RE = exports.MARKUP_RE = exports.SETEXT_RE = exports.QUOTE_RE = exports.ORDERED_RE = exports.BULLET_RE = exports.RULE_RE = exports.FENCE_CLOSE_RE = exports.FENCE_RE = exports.ATX_RE = exports.PENDING_ID = void 0;
exports.splitFrontmatter = splitFrontmatter;
exports.layoutFromFrontmatter = layoutFromFrontmatter;
exports.splitLines = splitLines;
exports.lineAt = lineAt;
exports.isBlank = isBlank;
exports.lineEnd = lineEnd;
exports.nonBlankEnd = nonBlankEnd;
exports.placed = placed;
exports.joinedLines = joinedLines;
exports.relocate = relocate;
exports.relocatedAttr = relocatedAttr;
exports.markdownAttr = markdownAttr;
const assert_1 = require("../../shared/core/assert");
const limits_1 = require("../../shared/core/limits");
const span_1 = require("../../shared/core/span");
// Nodes are built with this placeholder id; the final pass writes each node's
// structural path (`n0`, `n0.2`, `n0.2.1`), as the .astro parser does, so a
// parse is a pure function of its text (plan §4, §11.9).
exports.PENDING_ID = 'n0';
exports.ATX_RE = /^(\s{0,3})(#{1,6})(\s+)(.*?)(\s*#*\s*)$/;
exports.FENCE_RE = /^(\s{0,3})(`{3,}|~{3,})\s*(.*)$/;
exports.FENCE_CLOSE_RE = /^(\s{0,3})(`{3,}|~{3,})\s*$/;
exports.RULE_RE = /^(\s{0,3})((?:\*\s*){3,}|(?:-\s*){3,}|(?:_\s*){3,})$/;
exports.BULLET_RE = /^(\s*)([-*+])(\s+)(.*)$/;
exports.ORDERED_RE = /^(\s*)(\d{1,9})([.)])(\s+)(.*)$/;
exports.QUOTE_RE = /^(\s{0,3})>(\s?)(.*)$/;
exports.SETEXT_RE = /^(\s{0,3})(=+|-+)\s*$/;
exports.MARKUP_RE = /^\s{0,3}</;
// A line that ends a quote's lazy continuation: the start of another block.
exports.LAZY_BREAK_RE = /^\s{0,3}(#|>|```|~~~|[-*+]\s|\d+[.)]\s)/;
// A line that is nothing but an image — the one inline construct promoted to a
// node of its own, so the asset picker can edit it like any other <img>.
exports.IMAGE_ONLY_RE = /^!\[([^\]]*)\]\(([^)\s]+)(?:\s+"([^"]*)")?\)$/;
exports.ESM_RE = /^(import|export)\s/;
exports.MDX_IMPORT_RE = /^import\s+(\w+)\s+from\s+['"]([^'"]+)['"]/;
// A quote or list nested deeper than this is kept as one raw block: its
// blocks would need more tree depth than the wire model allows, and reading it
// would recurse once per level (AGENTS.md §10). Three levels are left for the
// deepest container's own children: an item, its paragraph, and the text.
exports.CONTAINER_DEPTH_MAX = limits_1.LIMITS.treeDepthMax - 3;
// ---------------------------------------------------------------------------
// Frontmatter
// ---------------------------------------------------------------------------
// Markdown frontmatter is YAML, not JS, so it is kept as text and handed to the
// same frontmatter editor .astro pages use. `layout:` is read back out by name
// because the layout picker needs it — see layoutFromFrontmatter.
function splitFrontmatter(source) {
    const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---[ \t]*(\r?\n|$)/);
    if (!match) {
        return { frontmatter: undefined, body: source, offset: 0 };
    }
    const offset = match[0]?.length ?? 0;
    return { frontmatter: match[1], body: source.slice(offset), offset };
}
// The `layout:` value from YAML frontmatter, unquoted. Markdown pages pick
// their layout here rather than by importing it, so the app's layout picker
// reads and writes this field.
function layoutFromFrontmatter(frontmatter) {
    if (!frontmatter) {
        return undefined;
    }
    const match = frontmatter.match(/^[ \t]*layout[ \t]*:[ \t]*(.+?)[ \t]*$/m);
    if (!match) {
        return undefined;
    }
    return (match[1] ?? '').replace(/^['"]|['"]$/g, '') || undefined;
}
// ---------------------------------------------------------------------------
// Lines and offsets
// ---------------------------------------------------------------------------
// The body's lines, each with the file offset of its first character. A line
// break is `\n` or `\r\n` (the break itself belongs to no line), as
// `body.split(/\r?\n/)` splits it.
function splitLines(body, base) {
    const lines = [];
    let from = 0;
    // Each pass consumes one line break, so the loop ends within the body.
    for (let at = body.indexOf('\n'); at !== -1; at = body.indexOf('\n', from)) {
        const end = at > from && body.charCodeAt(at - 1) === 0x0d ? at - 1 : at;
        lines.push({ text: body.slice(from, end), start: base + from });
        from = at + 1;
    }
    lines.push({ text: body.slice(from), start: base + from });
    (0, assert_1.assert)(lines.length >= 1, 'A body has at least one line');
    return lines;
}
function lineAt(lines, index) {
    const line = lines[index];
    (0, assert_1.assert)(line !== undefined, 'A line index lies inside its container');
    return line;
}
function isBlank(line) {
    return line.text.trim() === '';
}
function lineEnd(line) {
    return line.start + line.text.length;
}
// Where the run of non-blank lines starting at `from` ends.
function nonBlankEnd(lines, from) {
    let at = from;
    while (at < lines.length) {
        if (isBlank(lineAt(lines, at))) {
            break;
        }
        at++;
    }
    return at;
}
// A new node's id and the range of lines `first` up to (not including) `next`.
function placed(lines, first, next) {
    (0, assert_1.assert)(first < next, 'A node covers at least one line');
    const start = lineAt(lines, first).start;
    return { id: exports.PENDING_ID, start, end: lineEnd(lineAt(lines, next - 1)) };
}
function joinedLines(lines) {
    (0, assert_1.assert)(lines.length > 0, 'A block joins at least one line');
    const starts = [];
    let length = 0;
    for (const line of lines) {
        starts.push(length);
        length += line.text.length + 1;
    }
    const text = lines.map((line) => line.text).join('\n');
    const at = (offset) => {
        (0, assert_1.assert)(offset >= 0, 'A joined offset is not negative');
        (0, assert_1.assert)(offset <= text.length, 'A joined offset lies inside the text');
        // The last line starting at or before the offset: binary search.
        let low = 0;
        let high = starts.length - 1;
        for (let pass = 0; pass <= 32; pass++) {
            if (low < high) {
                const middle = low + Math.ceil((high - low) / 2);
                if ((starts[middle] ?? 0) <= offset) {
                    low = middle;
                }
                else {
                    high = middle - 1;
                }
            }
            else {
                return lineAt(lines, low).start + (offset - (starts[low] ?? 0));
            }
        }
        throw new Error('Assertion failed: the line search ends within 32 passes');
    };
    return { text, at };
}
// Markup nodes parsed from a joined block carry offsets into that block; move
// them, and their attributes', to the file. Iterative: the depth bound is the
// template parser's, not the call stack's.
function relocate(roots, at) {
    const pending = [...roots];
    for (let visited = 0; visited < pending.length; visited++) {
        (0, assert_1.assert)(visited < limits_1.LIMITS.treeNodesMax, 'Relocation stays inside the tree bound');
        const node = pending[visited];
        (0, assert_1.assert)(node !== undefined, 'The visit index lies inside the pending list');
        (0, assert_1.assert)(node.start !== undefined, 'A located template node has a start');
        (0, assert_1.assert)(node.end !== undefined, 'A located template node has an end');
        node.start = at(node.start);
        node.end = at(node.end);
        if (node.attrSpans !== undefined) {
            node.attrSpans = node.attrSpans.map((entry) => relocatedAttr(entry, at));
        }
        pending.push(...(node.children ?? []));
    }
}
function relocatedAttr(entry, at) {
    const moved = (span) => (0, span_1.toUtf16Span)(at(span.start), at(span.end));
    switch (entry.type) {
        case 'string':
        case 'expr':
            return {
                ...entry,
                span: moved(entry.span),
                nameSpan: moved(entry.nameSpan),
                valueSpan: moved(entry.valueSpan),
            };
        case 'bare':
            return { ...entry, span: moved(entry.span), nameSpan: moved(entry.nameSpan) };
        case 'spread':
        case 'markdown':
            return { ...entry, span: moved(entry.span), valueSpan: moved(entry.valueSpan) };
        default: {
            const exhaustive = entry;
            return exhaustive;
        }
    }
}
// An attribute Markdown writes in its own syntax: `span` includes its
// delimiters (the brackets around alt text, the quotes around a title), the
// value span is the value alone.
function markdownAttr(name, span, value) {
    return {
        type: 'markdown',
        name,
        span: (0, span_1.toUtf16Span)(span[0], span[1]),
        valueSpan: (0, span_1.toUtf16Span)(value[0], value[1]),
    };
}
