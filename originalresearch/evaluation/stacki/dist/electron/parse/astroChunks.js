"use strict";
// HTML chunks: pages built as <Fragment set:html={x} /> where x imports
// "chunks/foo.html?raw". Their markup is parsed into the page tree, written
// back to the chunk files, and marked for the preview.
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveChunks = resolveChunks;
exports.chunkImportMarks = chunkImportMarks;
exports.markChunkHtml = markChunkHtml;
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
const assert_1 = require("../../shared/core/assert");
const limits_1 = require("../../shared/core/limits");
const astroAttrs_1 = require("./astroAttrs");
const astroTemplate_1 = require("./astroTemplate");
const astroSerializeMarked_1 = require("./astroSerializeMarked");
// ---------------------------------------------------------------------------
// HTML chunks
// ---------------------------------------------------------------------------
// Pages built as <Fragment set:html={x} /> where x is an import of
// "chunks/foo.html?raw" (or a joined array of them). The chunk files' markup
// is parsed into the Fragment's children so it's editable in the navigator;
// edits are written back to the chunk file, never the page.
function resolveChunks(model, pagePath, options = {}) {
    // Identifier to absolute chunk file path.
    const rawImports = new Map();
    for (const imp of model.imports) {
        if (/\.html\?raw$/i.test(imp.path) && imp.path.startsWith('.')) {
            rawImports.set(imp.name, node_path_1.default.resolve(node_path_1.default.dirname(pagePath), imp.path.replace(/\?raw$/i, '')));
        }
    }
    if (!rawImports.size) {
        return;
    }
    // The `const main = [a, b, c].join("")` aggregations in the frontmatter.
    const aggregates = resolveChunksAggregates(model.extraFrontmatter);
    // The walk covers the parsed page, which is within the depth bound; the chunk trees it
    // attaches are not walked.
    const walk = (list, depth) => {
        (0, assert_1.assert)(depth <= limits_1.LIMITS.treeDepthMax, 'resolveChunks: depth limit');
        for (const node of list) {
            if (node.kind === 'component' && node.props?.['set:html']?.type === 'expr' && node.children === undefined) {
                const ref = node.props['set:html'].value.trim();
                if (rawImports.has(ref)) {
                    const file = (0, astroAttrs_1.required)(rawImports.get(ref), 'Chunk import exists');
                    const children = resolveChunksParseFile(file, options);
                    if (children) {
                        node.chunkFile = file;
                        node.children = children;
                    }
                    continue;
                }
                if (aggregates.has(ref)) {
                    const groups = [];
                    for (const ident of (0, astroAttrs_1.required)(aggregates.get(ref), 'Chunk aggregate exists')) {
                        if (!rawImports.has(ident)) {
                            continue;
                        }
                        const file = (0, astroAttrs_1.required)(rawImports.get(ident), 'Aggregate chunk import exists');
                        const children = resolveChunksParseFile(file, options);
                        if (children) {
                            groups.push({
                                id: (0, astroAttrs_1.makeId)(),
                                kind: 'chunk-group',
                                name: ident,
                                chunkFile: file,
                                children,
                            });
                        }
                    }
                    if (groups.length) {
                        node.children = groups;
                        node.chunkAggregate = true;
                    }
                    continue;
                }
            }
            if (Array.isArray(node.children)) {
                walk(node.children, depth + 1);
            }
        }
    };
    walk(model.nodes, 0);
    (0, astroAttrs_1.assignPathIds)(model.nodes, '', 0); // The chunks' nodes joined the tree.
}
// Marker path each chunk import's content occupies in the tree, keyed by the
// import's identifier: the Fragment's own path for a lone chunk, the
// chunk-group's path for each member of a joined aggregate. Requires a model
// that's been through resolveChunks.
function chunkImportMarks(model) {
    const marks = new Map();
    // The model has been through resolveChunks, whose path ids bound the joined tree's depth.
    const walk = (list, prefix, depth) => {
        (0, assert_1.assert)(depth <= limits_1.LIMITS.treeDepthMax, 'chunkImportMarks: depth limit');
        list.forEach((node, i) => {
            const childPath = prefix ? `${prefix}.${i}` : String(i);
            if (node.chunkFile) {
                const group = node.kind === 'chunk-group';
                const html = node.props?.['set:html'];
                const ident = group ? node.name : html && html.type !== 'bare' ? html.value.trim() : undefined;
                if (ident) {
                    marks.set(ident, { path: childPath, group });
                }
            }
            if (Array.isArray(node.children)) {
                walk(node.children, childPath, depth + 1);
            }
        });
    };
    walk(model.nodes, '', 0);
    return marks;
}
// Dev-preview only: the chunk's markup with the same boundary markers the
// page serializer emits, numbered from the Fragment's (or group's) key so
// chunk nodes address identically to the app's tree. `prefix` is a full
// "<file>#<path>" key — the file half rides along untouched. A group also gets
// a marker pair of its own — nothing in the page wraps it. Returns undefined when
// the chunk isn't representable, so the caller can serve it unmarked.
function markChunkHtml(source, prefix, { group }) {
    const { nodes, clean } = (0, astroTemplate_1.parseTemplate)(source);
    if (!clean) {
        return undefined;
    }
    const lines = [];
    if (group) {
        lines.push(`<!--avb-s:${prefix}-->`);
    }
    nodes.forEach((node, i) => (0, astroSerializeMarked_1.serializeNodeMarked)(node, '', lines, {
        path: `${prefix}.${i}`,
        inSlot: false,
        atRoot: false,
        depth: 0,
        stamp: undefined,
    }));
    if (group) {
        lines.push(`<!--avb-e:${prefix}-->`);
    }
    return lines.join('\n') + '\n';
}
function resolveChunksParseFile(filePath, options) {
    let source;
    try {
        source = node_fs_1.default.readFileSync(filePath, 'utf8');
    }
    catch {
        return undefined;
    }
    // Only disk failures are caught. Broken parser invariants must stay loud.
    const { nodes, clean } = (0, astroTemplate_1.parseTemplate)(source, options.locs ? 0 : undefined);
    return clean ? nodes : undefined;
}
function resolveChunksAggregates(extraFrontmatter) {
    const aggregates = new Map();
    const aggRe = /(?:const|let)\s+(\w+)\s*=\s*\[([^\]]*)\]\s*\.join\(/g;
    let am;
    while ((am = aggRe.exec(extraFrontmatter)) !== null) {
        const idents = (0, astroAttrs_1.required)(am[2], 'Chunk aggregate members capture')
            .split(',')
            .map((part) => part.trim())
            .filter(Boolean);
        if (idents.length && idents.every((i) => /^\w+$/.test(i))) {
            aggregates.set((0, astroAttrs_1.required)(am[1], 'Chunk aggregate name capture'), idents);
        }
    }
    return aggregates;
}
