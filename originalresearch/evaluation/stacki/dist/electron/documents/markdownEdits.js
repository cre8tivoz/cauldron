"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.markdownEditDraft = markdownEditDraft;
exports.markdownPageNodes = markdownPageNodes;
// The renderer's intent front end for Markdown and MDX pages (plan §11 step
// 10): main's half, beside editRequests.ts. An edit of a Markdown node becomes
// an intent against the snapshot it names, and nothing of the page is printed
// but the node the edit changes or adds:
//
//   - A node's new content — its text typed, an image's source picked, a
//     heading's level changed — is the node printed before and after the
//     edit, at its place (its container's prefix, the file's line breaks), and
//     the difference placed on its own bytes: a `rewrite-node`. The printer
//     reproduces an untouched node exactly (span integrity, the contract
//     suite), so the hunks land where the change is; where it cannot, they
//     are placed through a diff or refused.
//   - A new block or item is printed at the place it goes and inserted beside
//     its neighbour; the planner separates it as Markdown does
//     (shared/engine/planMarkdown.ts).
//   - The YAML frontmatter is printed from the model and written as the slot
//     that differs, or — a page without one — inserted at the top.
//
// Markup inside MDX (a component and its children) returns `undefined`: it is
// drafted by editRequests.ts as on an .astro page. So are removals, moves and
// copies, which the planner places for markup and Markdown alike.
const assert_1 = require("../../shared/core/assert");
const markdownLayout_1 = require("../../shared/engine/markdownLayout");
const pageNode_1 = require("../../shared/page/pageNode");
const planMarkdown_1 = require("../../shared/engine/planMarkdown");
const planSupport_1 = require("../../shared/engine/planSupport");
const ref_1 = require("../../shared/page/ref");
const result_1 = require("../../shared/core/result");
const span_1 = require("../../shared/core/span");
const editAnchors_1 = require("./editAnchors");
const markdownParser_1 = require("../parse/markdownParser");
/** The intent a Markdown page's edit is, or undefined when it names markup or
 * is an operation the planner places alike (editRequests.ts drafts those). */
function markdownEditDraft(edit, authored) {
    (0, assert_1.assert)(authored.format !== 'astro', 'Only a Markdown page has Markdown drafts');
    switch (edit.tag) {
        case 'set-attribute':
        case 'remove-attribute':
            return onMarkdown(authored, edit.target, (target) => rewriteDraft(authored, target, (node) => withAttribute(node, edit)));
        case 'rename-tag':
            return onMarkdown(authored, edit.target, (target) => rewriteDraft(authored, target, (node) => renamedBlock(node, edit.to)));
        case 'replace-node':
            return onMarkdown(authored, edit.target, (target) => rewriteDraft(authored, target, () => edit.node));
        case 'set-inline-style':
        case 'rename-attribute':
        case 'wrap-nodes':
        case 'unwrap-node':
            // Markdown writes no tag to style, name or wrap.
            return onMarkdown(authored, edit.target, () => (0, result_1.err)('unsupported-operation'));
        case 'insert-node':
            if (edit.content.tag === 'copy') {
                return undefined; // The node's own bytes, placed by the planner.
            }
            return insertionDraft(authored, edit.target, edit.placement, edit.content.nodes);
        case 'append-body':
            return appendDraft(authored, edit.nodes);
        case 'set-frontmatter':
            return frontmatterDraft(authored, edit.model.extraFrontmatter);
        case 'replace-page':
            return undefined; // Astro's full-model fallback does not serialize Markdown syntax.
        case 'remove-node':
        case 'move-node':
        case 'rename-binding':
        case 'revert':
        case 'code-patch':
            return undefined;
        default: {
            const exhaustive = edit;
            return exhaustive;
        }
    }
}
/** The Markdown parse of the authored text: the nodes the projection indexes. */
function markdownPageNodes(authored) {
    const mdx = authored.format === 'mdx';
    const parsed = (0, pageNode_1.parsePageResult)((0, markdownParser_1.parseMarkdownPage)(authored.text, { mdx }));
    return parsed.editable ? parsed.model.nodes : undefined;
}
// A Markdown node's draft, or undefined for markup.
function onMarkdown(authored, ref, next) {
    const resolved = (0, editAnchors_1.resolveRef)(authored, ref);
    if (!resolved.ok) {
        return resolved;
    }
    return resolved.value.node.syntax === 'markup' ? undefined : next(resolved.value);
}
function rewriteDraft(authored, target, change) {
    const located = locate(authored, target.node.path);
    if (located === undefined) {
        return (0, result_1.err)('anchor-moved');
    }
    (0, assert_1.assert)(located.node.kind === target.node.kind, 'The parse and the projection agree');
    const next = change(located.node);
    if (next === undefined) {
        return (0, result_1.err)('unsupported-operation');
    }
    const layout = layoutAt(authored, target.node);
    if (layout === undefined) {
        return (0, result_1.err)('unsupported-operation'); // Its line holds more than container syntax.
    }
    const print = (node) => target.node.list === 'items' ? (0, markdownParser_1.printMarkdownItem)(node, itemAt(located, 0), layout) : (0, markdownParser_1.printMarkdownNode)(node, layout);
    const own = (0, planSupport_1.textOf)(authored.snapshot.bytes, target.node.span);
    const hunks = (0, editAnchors_1.placedHunks)(print(located.node), print(next), own);
    if (!hunks.ok) {
        return hunks;
    }
    const moved = (0, editAnchors_1.shiftedHunks)(hunks.value, target.node.span.start);
    return (0, result_1.ok)({ anchor: target.anchor, operation: { tag: 'rewrite-node', hunks: moved } });
}
// The parsed node at a projection path, with its parent.
function locate(authored, path) {
    let list = markdownPageNodes(authored);
    let parent;
    let found;
    for (const step of path) {
        const node = list?.[step];
        if (node === undefined) {
            return undefined;
        }
        found = { node, parent, index: step };
        parent = node;
        list = 'children' in node ? (node.children ?? []) : [];
    }
    return found;
}
/** How a Markdown node is written at its place: the prefix its lines after
 * the first carry — read at its own line, or for an item and for inline text
 * at its parent's, whose lines they share — and the file's line break. */
function layoutAt(authored, node) {
    const bytes = authored.snapshot.bytes;
    let start = node.span.start;
    if (node.list === 'items' || node.list === 'inline') {
        const parent = (0, planSupport_1.nodeAtPath)(authored.projection, (0, planSupport_1.parentPath)(node.path));
        (0, assert_1.assert)(parent !== undefined, 'An item or inline text has its parent');
        start = parent.span.start;
    }
    const prefix = (0, markdownLayout_1.markdownPrefix)(bytes, start);
    return prefix === undefined ? undefined : { prefix, eol: lineBreak(authored) };
}
// The file's line break as the parser read it: CRLF anywhere makes it CRLF.
function lineBreak(authored) {
    return authored.text.includes('\r\n') ? '\r\n' : '\n';
}
/** An item's marker: its list's, and its number `offset` after its own. */
function itemAt(located, offset) {
    const list = located.parent;
    (0, assert_1.assert)(list?.kind === 'element', 'An item sits in a list');
    const ordered = list.name === 'ol';
    const first = attrText(list.props?.['start']);
    const start = first === undefined ? 1 : Number(first);
    const own = list.mdNumbers?.[located.index] ?? start + located.index;
    return {
        marker: list.mdMarker ?? (ordered ? '.' : '-'),
        number: ordered ? own + offset : undefined,
        indent: list.mdIndent ?? '',
    };
}
function attrText(attr) {
    return attr !== undefined && 'value' in attr ? attr.value : undefined;
}
// An attribute Markdown writes: an image's alt, source and title; a fence's
// language, which is its whole info string; an ordered list's first number,
// which moves every number by as much (a list written 1. 1. 1. stays so).
// Anything else it cannot write — the printer then changes nothing and the
// edit is refused.
function withAttribute(node, edit) {
    if (node.kind !== 'element') {
        return undefined;
    }
    const value = edit.tag === 'set-attribute' ? stringValue(edit.value) : '';
    if (value === undefined) {
        return undefined; // An expression or a bare name: Markdown writes text.
    }
    const kept = withoutKey(node.props ?? {}, edit.name);
    const props = edit.tag === 'set-attribute' ? { ...kept, [edit.name]: { type: 'string', value } } : kept;
    if (node.name === 'pre' && edit.name === 'lang') {
        return { ...node, props, mdInfo: value };
    }
    if (node.name === 'ol' && edit.name === 'start') {
        return renumbered(node, props, value === '' ? '1' : value);
    }
    return { ...node, props };
}
function stringValue(value) {
    return value.type === 'string' ? value.value : undefined;
}
function renumbered(node, props, value) {
    if (!/^\d{1,9}$/.test(value)) {
        return undefined;
    }
    const next = Number(value);
    const numbers = node.mdNumbers ?? [];
    const delta = next - (numbers[0] ?? 1);
    const rest = withoutKey(props, 'start');
    return {
        ...node,
        props: next === 1 ? rest : { ...rest, start: { type: 'string', value: String(next) } },
        mdNumbers: numbers.map((number) => number + delta),
    };
}
// A block of another kind with the same content: a paragraph and the heading
// levels among themselves, a bullet and a numbered list. A setext heading
// stays setext while it is level 1 or 2 (its underline says which).
function renamedBlock(node, to) {
    if (node.kind !== 'element') {
        return undefined;
    }
    if (textBlock(node.name) && textBlock(to)) {
        const { mdSetext, ...rest } = node;
        if (mdSetext !== undefined && (to === 'h1' || to === 'h2')) {
            return { ...rest, name: to, mdSetext: mdSetext.replace(/[=-]/g, to === 'h1' ? '=' : '-') };
        }
        return { ...rest, name: to };
    }
    if (listBlock(node.name) && listBlock(to)) {
        // The new kind's own marker, numbered from 1: the old one would say the
        // old kind (a `-` after a number is no ordered list).
        const ordered = to === 'ol';
        const numbers = (node.children ?? []).map((_item, index) => index + 1);
        const props = withoutKey(node.props ?? {}, 'start');
        return { ...node, name: to, props, mdMarker: ordered ? '.' : '-', mdNumbers: numbers };
    }
    return undefined;
}
function withoutKey(record, key) {
    return Object.fromEntries(Object.entries(record).filter(([name]) => name !== key));
}
function textBlock(name) {
    return name === 'p' || /^h[1-6]$/.test(name);
}
function listBlock(name) {
    return name === 'ul' || name === 'ol';
}
// --- Insertions ---------------------------------------------------------------------
// New blocks or items printed at the place they go: beside the anchor, or
// inside it next to its first or last child. Items only among items, blocks
// only among blocks; markup inside MDX goes to editRequests.ts.
function insertionDraft(authored, ref, placement, nodes) {
    const resolved = (0, editAnchors_1.resolveRef)(authored, ref);
    if (!resolved.ok) {
        return resolved;
    }
    const target = resolved.value.node;
    const inside = placement === 'first-child' || placement === 'last-child';
    if (inside ? target.syntax === 'markup' : target.list === 'markup') {
        return undefined;
    }
    const beside = (0, planMarkdown_1.markdownBeside)(authored.projection, target, placement);
    if (beside === undefined) {
        return (0, result_1.err)('unsupported-operation'); // An empty container: no line to place into.
    }
    const source = printedInsertion(authored, beside, nodes);
    if (source === undefined) {
        return (0, result_1.err)('unsupported-operation');
    }
    const operation = { tag: 'insert-node', placement, source };
    return (0, result_1.ok)({ anchor: resolved.value.anchor, operation });
}
// The new nodes as they are written beside `beside`: one after another,
// separated as their list separates.
function printedInsertion(authored, beside, nodes) {
    const eol = lineBreak(authored);
    const prefix = (0, markdownLayout_1.markdownPrefix)(authored.snapshot.bytes, beside.node.span.start);
    if (prefix === undefined) {
        return undefined;
    }
    switch (beside.node.list) {
        case 'items': {
            if (!nodes.every((node) => isItem(node))) {
                return undefined; // Only an item goes among items.
            }
            const located = locate(authored, beside.node.path);
            const layout = layoutAt(authored, beside.node);
            if (located === undefined) {
                return undefined;
            }
            if (layout === undefined) {
                return undefined;
            }
            const first = beside.side === 'after' ? 1 : 0;
            const printed = nodes.map((node, index) => (0, markdownParser_1.printMarkdownItem)(node, itemAt(located, first + index), layout));
            return printed.join(`${eol}${prefix}`);
        }
        case 'blocks': {
            if (nodes.some((node) => isItem(node))) {
                return undefined; // An item outside a list is not Markdown.
            }
            const printed = nodes.map((node) => (0, markdownParser_1.printMarkdownNode)(node, { prefix, eol }));
            return printed.join(`${eol}${(0, markdownLayout_1.blankLinePrefix)(prefix)}${eol}${prefix}`);
        }
        case 'inline':
        case 'markup':
            return undefined;
        default: {
            const exhaustive = beside.node.list;
            return exhaustive;
        }
    }
}
function isItem(node) {
    return node.kind === 'element' && node.name === 'li';
}
// The first blocks of an empty page, at its end (the planner refuses them
// once the page has a node: they must stand beside it then).
function appendDraft(authored, nodes) {
    if (nodes.some((node) => isItem(node))) {
        return (0, result_1.err)('unsupported-operation');
    }
    const eol = lineBreak(authored);
    const source = nodes.map((node) => (0, markdownParser_1.printMarkdownNode)(node, { prefix: '', eol })).join(eol + eol);
    const anchor = (0, ref_1.toAnchorRef)({
        span: (0, span_1.toByteSpan)(0, authored.snapshot.bytes.length),
        path: [],
        expectedKind: 'document',
    });
    return (0, result_1.ok)({ anchor, operation: { tag: 'append-body', source } });
}
// --- Frontmatter --------------------------------------------------------------------
// The YAML the model now holds, printed as a block: the slot where it differs
// from the block on disk, or a new block at the top of a page without one.
function frontmatterDraft(authored, yaml) {
    const eol = lineBreak(authored);
    const printed = (0, markdownParser_1.printMarkdownFrontmatter)(yaml, eol);
    const block = authored.projection.frontmatter;
    if (block === undefined) {
        if (yaml.trim() === '') {
            return (0, result_1.err)('unsupported-operation'); // Nothing to write, and no block to empty.
        }
        const anchor = (0, ref_1.toAnchorRef)({
            span: (0, span_1.toByteSpan)(0, authored.snapshot.bytes.length),
            path: [],
            expectedKind: 'document',
        });
        return (0, result_1.ok)({ anchor, operation: { tag: 'insert-frontmatter', source: `${printed}${eol}` } });
    }
    const before = (0, planSupport_1.textOf)(authored.snapshot.bytes, block);
    const after = before.endsWith('\n') ? `${printed}${eol}` : printed;
    const { slot, text } = (0, editAnchors_1.frontmatterSlot)(block, before, after);
    const anchor = (0, ref_1.toAnchorRef)({ span: block, path: [], expectedKind: 'frontmatter' });
    return (0, result_1.ok)({ anchor, operation: { tag: 'edit-frontmatter-slot', slot, text } });
}
