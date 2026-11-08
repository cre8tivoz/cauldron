"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.STRUCTURAL_PATH_STEPS_MAX = exports.ANCHOR_KINDS = exports.NODE_KINDS = void 0;
exports.toChildIndex = toChildIndex;
exports.isNodeKind = isNodeKind;
exports.toAnchorRef = toAnchorRef;
exports.parseAnchorKind = parseAnchorKind;
exports.parseAnchorRef = parseAnchorRef;
// A node reference: where a thing was in the bytes an edit was authored against
// (plan §4). The span says where, the structural path says which child of which
// parent, and the expected kind says what must be found there. Resolution
// happens at use time against current bytes; nothing here is an identity that
// survives between snapshots, and an ambiguous resolution is a rejection.
const assert_1 = require("../core/assert");
const limits_1 = require("../core/limits");
const record_1 = require("../core/record");
const span_1 = require("../core/span");
exports.NODE_KINDS = ['component', 'element', 'raw', 'text', 'expr', 'raw-line', 'comment', 'map', 'cond', 'branch', 'chunk-group'];
const nodeKindsMatchPageTree = true;
(0, assert_1.assert)(nodeKindsMatchPageTree, 'NODE_KINDS names every page-tree kind');
/** Regions an anchor may name besides a node: the frontmatter body, and the
 * whole file (code patches, program rewrites, reverts, a new frontmatter
 * block). */
exports.ANCHOR_KINDS = [...exports.NODE_KINDS, 'frontmatter', 'document'];
/** One step deeper than the deepest tree: the root list is step one. */
exports.STRUCTURAL_PATH_STEPS_MAX = limits_1.LIMITS.treeDepthMax + 1;
function toChildIndex(value) {
    if (!Number.isSafeInteger(value)) {
        throw new Error('ChildIndex: expected safe integer');
    }
    if (value < 0) {
        throw new Error('ChildIndex: expected nonnegative integer');
    }
    if (value >= limits_1.LIMITS.treeNodesMax) {
        throw new Error(`ChildIndex: exceeds ${limits_1.LIMITS.treeNodesMax} siblings`);
    }
    return value;
}
function isNodeKind(kind) {
    switch (kind) {
        case 'frontmatter':
        case 'document':
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
        case 'branch':
        case 'chunk-group':
            return true;
        default: {
            const exhaustive = kind;
            return exhaustive;
        }
    }
}
/** The validated constructor: the path length and the kind must agree, and a
 * document anchor starts at the first byte. */
function toAnchorRef(input) {
    if (input.path.length > exports.STRUCTURAL_PATH_STEPS_MAX) {
        throw new Error(`AnchorRef.path: exceeds ${exports.STRUCTURAL_PATH_STEPS_MAX} steps`);
    }
    if (isNodeKind(input.expectedKind)) {
        if (input.path.length === 0) {
            throw new Error('AnchorRef.path: a node anchor needs at least one step');
        }
    }
    else if (input.path.length > 0) {
        throw new Error(`AnchorRef.path: a ${input.expectedKind} anchor has no path`);
    }
    if (input.expectedKind === 'document') {
        if (input.span.start !== 0) {
            throw new Error('AnchorRef.span: a document anchor starts at byte 0');
        }
    }
    return { span: input.span, path: [...input.path], expectedKind: input.expectedKind };
}
function parseAnchorKind(input, where) {
    for (const kind of exports.ANCHOR_KINDS) {
        if (kind === input) {
            return kind;
        }
    }
    throw new Error(`${where}: unknown anchor kind ${JSON.stringify(input)}`);
}
function parseAnchorRef(input, where) {
    const record = (0, record_1.toRecord)(input);
    if (record === undefined) {
        throw new Error(`${where}: expected anchor object`);
    }
    const steps = (0, record_1.toArray)(record['path']);
    if (steps === undefined) {
        throw new Error(`${where}.path: expected array`);
    }
    if (steps.length > exports.STRUCTURAL_PATH_STEPS_MAX) {
        throw new Error(`${where}.path: exceeds ${exports.STRUCTURAL_PATH_STEPS_MAX} steps`);
    }
    const path = steps.map((step, index) => {
        if (typeof step !== 'number') {
            throw new Error(`${where}.path[${index}]: expected number`);
        }
        return toChildIndex(step);
    });
    return toAnchorRef({
        span: (0, span_1.parseByteSpan)(record['span'], `${where}.span`),
        path,
        expectedKind: parseAnchorKind(record['expectedKind'], `${where}.expectedKind`),
    });
}
