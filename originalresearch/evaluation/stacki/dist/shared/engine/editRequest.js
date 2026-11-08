"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EDIT_BATCH_EDITS_MAX = void 0;
exports.parseEditRequest = parseEditRequest;
exports.parseEditBatchRequest = parseEditBatchRequest;
exports.parseEdit = parseEdit;
exports.parseNodeRef = parseNodeRef;
// Edit requests (plan §2 layer 3, the compat adapter; §11 step 6): a gesture
// as the renderer can state it — in terms of the page it shows. The renderer
// holds a parse of the bytes it last read or was sent back, with UTF-16 source
// ranges on every node, and the checksum of those bytes; it does not hold the
// bytes, the byte offsets, or the printer that writes a new node. Main does:
// it turns a request into an Intent against the snapshot of the named
// checksum (electron/documents/editRequests.ts), and the actor plans it like any other.
//
// A node is referred to by the facts of that parse — its path, its kind and
// its source range — and main checks them against its own projection of the
// same bytes before it trusts them. The request never carries an identity of
// its own (plan §4): a session id means nothing to main.
//
// The adapter half in main dies at step 9, when the renderer holds
// projections and authors intents directly.
const assert_1 = require("../core/assert");
const boundary_1 = require("../core/boundary");
const intent_1 = require("./intent");
const limits_1 = require("../core/limits");
const pageNode_1 = require("../page/pageNode");
const record_1 = require("../core/record");
const ref_1 = require("../page/ref");
const span_1 = require("../core/span");
/** A gesture composes a handful of edits (a loop, its query, its imports);
 * sixteen leaves room for every composition the editor makes, and a batch is
 * planned in memory edit by edit, so its length bounds that work. */
exports.EDIT_BATCH_EDITS_MAX = 16;
const ATTRIBUTE_NAME_RE = /^[\w@:.-]+$/;
const IDENTIFIER_RE = /^[A-Za-z_$][\w$]*$/;
const STYLE_PROPERTY_RE = /^(?:--[\w-]+|-?[a-z][a-z-]*)$/;
function parseEditRequest(input) {
    const record = (0, record_1.toRecord)(input);
    if (record === undefined) {
        throw new Error('Expected an edit request object');
    }
    return {
        pagePath: (0, boundary_1.pathText)(record['pagePath']),
        authoredChecksum: (0, boundary_1.digest)(record['authoredChecksum']),
        edit: parseEdit(record['edit']),
    };
}
function parseEditBatchRequest(input) {
    const record = (0, record_1.toRecord)(input);
    if (record === undefined) {
        throw new Error('Expected an edit batch request object');
    }
    const edits = (0, record_1.toArray)(record['edits']);
    if (edits === undefined) {
        throw new Error('EditBatch.edits: expected array');
    }
    // One edit is page:edit's; a batch exists to write several at once.
    if (edits.length < 2) {
        throw new Error('EditBatch.edits: expected at least two edits');
    }
    if (edits.length > exports.EDIT_BATCH_EDITS_MAX) {
        throw new Error('EditBatch.edits: exceeds limit');
    }
    const parsed = edits.map(parseEdit);
    // Paired with the bound above: what crosses the wire is what was counted.
    (0, assert_1.assert)(parsed.length === edits.length, 'Every batched edit is parsed');
    (0, assert_1.assert)(parsed.length <= exports.EDIT_BATCH_EDITS_MAX, 'A parsed batch stays inside its bound');
    return {
        pagePath: (0, boundary_1.pathText)(record['pagePath']),
        authoredChecksum: (0, boundary_1.digest)(record['authoredChecksum']),
        edits: parsed,
    };
}
function parseEdit(input) {
    const record = requireRecord(input, 'Edit');
    const tag = record['tag'];
    switch (tag) {
        case 'set-attribute':
        case 'remove-attribute':
        case 'set-inline-style':
            return parseAttributeEdit(record, tag);
        case 'insert-node':
        case 'remove-node':
        case 'move-node':
        case 'wrap-nodes':
        case 'unwrap-node':
        case 'replace-node':
            return parseStructureEdit(record, tag);
        case 'rename-binding':
            return parseRename(record);
        case 'rename-tag':
            return {
                tag,
                target: parseNodeRef(record['target'], 'Edit.target'),
                to: tagName(record['to'], 'Edit.to'),
            };
        case 'rename-attribute':
            return parseAttributeRename(record);
        case 'append-body': {
            const content = parseContent({ tag: 'nodes', nodes: record['nodes'] });
            (0, assert_1.assert)(content.tag === 'nodes', 'Parsed as nodes');
            return { tag, nodes: content.nodes };
        }
        case 'set-frontmatter':
        case 'replace-page':
            return { tag, model: (0, pageNode_1.parsePageModel)(record['model']) };
        case 'revert':
            return { tag, hunks: parseHunks(record['hunks']) };
        case 'code-patch':
            return { tag, hunks: parseCodeHunks(record['hunks']) };
        default:
            throw new Error(`Edit.tag: unknown edit ${JSON.stringify(tag)}`);
    }
}
// The edits that change one attribute or declaration of the target tag.
function parseAttributeEdit(record, tag) {
    // Paired with parseEdit's dispatch: the record is the edit it was routed as.
    (0, assert_1.assert)(record['tag'] === tag, 'parseAttributeEdit: record tag matches its dispatch');
    const target = parseNodeRef(record['target'], 'Edit.target');
    switch (tag) {
        case 'set-attribute':
            return {
                tag,
                target,
                name: attributeName(record['name'], 'Edit.name'),
                value: parseAttributeValue(record['value']),
            };
        case 'remove-attribute':
            return { tag, target, name: attributeName(record['name'], 'Edit.name') };
        case 'set-inline-style':
            return {
                tag,
                target,
                property: styleProperty(record['property']),
                declaration: parseDeclaration(record['declaration']),
            };
        default: {
            const exhaustive = tag;
            return exhaustive;
        }
    }
}
// The edits that add, remove, move or replace whole nodes around the target.
function parseStructureEdit(record, tag) {
    // Paired with parseEdit's dispatch: the record is the edit it was routed as.
    (0, assert_1.assert)(record['tag'] === tag, 'parseStructureEdit: record tag matches its dispatch');
    const target = parseNodeRef(record['target'], 'Edit.target');
    switch (tag) {
        case 'insert-node':
            return {
                tag,
                target,
                placement: parsePlacement(record['placement']),
                content: parseContent(record['content']),
            };
        case 'remove-node':
        case 'unwrap-node':
            return { tag, target };
        case 'move-node':
            return {
                tag,
                target,
                destination: parseNodeRef(record['destination'], 'Edit.destination'),
                placement: parsePlacement(record['placement']),
            };
        case 'wrap-nodes':
            return {
                tag,
                target,
                last: parseNodeRef(record['last'], 'Edit.last'),
                name: tagName(record['name'], 'Edit.name'),
            };
        case 'replace-node':
            // One counter bounds the node like one page tree.
            return { tag, target, node: (0, pageNode_1.parsePageNode)(record['node'], 'Edit.node', 0, { nodes: 0 }) };
        default: {
            const exhaustive = tag;
            return exhaustive;
        }
    }
}
function parseNodeRef(input, where) {
    const record = requireRecord(input, where);
    const steps = (0, record_1.toArray)(record['path']);
    if (steps === undefined) {
        throw new Error(`${where}.path: expected array`);
    }
    if (steps.length === 0) {
        throw new Error(`${where}.path: a node has at least one step`);
    }
    if (steps.length > ref_1.STRUCTURAL_PATH_STEPS_MAX) {
        throw new Error(`${where}.path: exceeds ${ref_1.STRUCTURAL_PATH_STEPS_MAX} steps`);
    }
    const path = steps.map((step, index) => {
        if (typeof step !== 'number' || !Number.isSafeInteger(step) || step < 0) {
            throw new Error(`${where}.path[${index}]: expected a child index`);
        }
        if (step >= limits_1.LIMITS.treeNodesMax) {
            throw new Error(`${where}.path[${index}]: exceeds ${limits_1.LIMITS.treeNodesMax} siblings`);
        }
        return step;
    });
    return {
        path,
        kind: nodeKind(record['kind'], `${where}.kind`),
        span: (0, span_1.parseUtf16Span)(record['span'], `${where}.span`),
    };
}
function nodeKind(input, where) {
    for (const kind of ref_1.NODE_KINDS) {
        if (kind === input) {
            return kind;
        }
    }
    throw new Error(`${where}: unknown node kind ${JSON.stringify(input)}`);
}
function parseContent(input) {
    const record = requireRecord(input, 'Edit.content');
    const tag = record['tag'];
    if (tag === 'copy') {
        return { tag, source: parseNodeRef(record['source'], 'Edit.content.source') };
    }
    if (tag === 'nodes') {
        const nodes = (0, record_1.toArray)(record['nodes']);
        if (nodes === undefined) {
            throw new Error('Edit.content.nodes: expected array');
        }
        if (nodes.length === 0) {
            throw new Error('Edit.content.nodes: expected at least one node');
        }
        // One shared counter bounds the whole insertion like one page tree.
        const context = { nodes: 0 };
        return {
            tag,
            nodes: nodes.map((node, index) => (0, pageNode_1.parsePageNode)(node, `Edit.content.nodes[${index}]`, 0, context)),
        };
    }
    throw new Error(`Edit.content.tag: unknown value ${JSON.stringify(tag)}`);
}
function parseRename(record) {
    const from = identifier(record['from'], 'Edit.from');
    const to = identifier(record['to'], 'Edit.to');
    if (from === to) {
        throw new Error('Edit.to: a rename must change the name');
    }
    return { tag: 'rename-binding', target: parseNodeRef(record['target'], 'Edit.target'), from, to };
}
function parseAttributeRename(record) {
    const from = attributeName(record['from'], 'Edit.from');
    const to = attributeName(record['to'], 'Edit.to');
    if (from === to) {
        throw new Error('Edit.to: a rename must change the name');
    }
    const target = parseNodeRef(record['target'], 'Edit.target');
    return { tag: 'rename-attribute', target, from, to };
}
function parseHunks(input) {
    const hunks = (0, record_1.toArray)(input);
    if (hunks === undefined) {
        throw new Error('Edit.hunks: expected array');
    }
    if (hunks.length > limits_1.LIMITS.splicesPerIntentMax) {
        throw new Error(`Edit.hunks: exceeds ${limits_1.LIMITS.splicesPerIntentMax} items`);
    }
    return hunks.map((hunk, index) => {
        const record = requireRecord(hunk, `Edit.hunks[${index}]`);
        return {
            span: (0, span_1.parseByteSpan)(record['span'], `Edit.hunks[${index}].span`),
            text: boundedText(record['text'], `Edit.hunks[${index}].text`, limits_1.LIMITS.intentPayloadBytesMax),
        };
    });
}
// The shape only: at least one hunk, ascending and disjoint, each text inside
// the payload bound. Whether the witnesses hold, whether the hunks sit on code
// points, and whether the summed payload fits are main's to check against the
// bytes (electron/documents/editRequests.ts, the host) — a typed refusal, not a throw.
function parseCodeHunks(input) {
    const hunks = (0, record_1.toArray)(input);
    if (hunks === undefined) {
        throw new Error('Edit.hunks: expected array');
    }
    if (hunks.length === 0) {
        throw new Error('Edit.hunks: a code patch has at least one hunk');
    }
    if (hunks.length > limits_1.LIMITS.splicesPerIntentMax) {
        throw new Error(`Edit.hunks: exceeds ${limits_1.LIMITS.splicesPerIntentMax} items`);
    }
    const parsed = hunks.map((hunk, index) => {
        const where = `Edit.hunks[${index}]`;
        const record = requireRecord(hunk, where);
        return {
            span: (0, span_1.parseByteSpan)(record['span'], `${where}.span`),
            expected: boundedText(record['expected'], `${where}.expected`, limits_1.LIMITS.intentPayloadBytesMax),
            text: boundedText(record['text'], `${where}.text`, limits_1.LIMITS.intentPayloadBytesMax),
        };
    });
    if (!(0, span_1.spansAscending)(parsed.map((hunk) => hunk.span))) {
        throw new Error('Edit.hunks: expected ascending disjoint spans');
    }
    return parsed;
}
function parseAttributeValue(input) {
    const record = requireRecord(input, 'Edit.value');
    const type = record['type'];
    if (type === 'bare') {
        return { type };
    }
    if (type === 'string' || type === 'expr') {
        return { type, value: boundedText(record['value'], 'Edit.value.value', limits_1.LIMITS.attrCharsMax) };
    }
    throw new Error(`Edit.value.type: unknown value ${JSON.stringify(type)}`);
}
function parseDeclaration(input) {
    const record = requireRecord(input, 'Edit.declaration');
    const tag = record['tag'];
    if (tag === 'remove') {
        return { tag };
    }
    if (tag === 'set') {
        return {
            tag,
            value: boundedText(record['value'], 'Edit.declaration.value', limits_1.LIMITS.attrCharsMax),
        };
    }
    throw new Error(`Edit.declaration.tag: unknown value ${JSON.stringify(tag)}`);
}
function parsePlacement(input) {
    for (const placement of intent_1.PLACEMENTS) {
        if (placement === input) {
            return placement;
        }
    }
    throw new Error(`Edit.placement: unknown value ${JSON.stringify(input)}`);
}
function attributeName(input, where) {
    const name = boundedText(input, where, limits_1.LIMITS.attrCharsMax);
    if (!ATTRIBUTE_NAME_RE.test(name)) {
        throw new Error(`${where}: expected an attribute name`);
    }
    return name;
}
function tagName(input, where) {
    const name = boundedText(input, where, limits_1.LIMITS.tagNameCharsMax);
    if (!intent_1.TAG_NAME_RE.test(name)) {
        throw new Error(`${where}: expected a tag name`);
    }
    return name;
}
function styleProperty(input) {
    const property = boundedText(input, 'Edit.property', limits_1.LIMITS.attrCharsMax);
    if (!STYLE_PROPERTY_RE.test(property)) {
        throw new Error('Edit.property: expected a CSS property name');
    }
    return property;
}
function identifier(input, where) {
    const name = boundedText(input, where, limits_1.LIMITS.tagNameCharsMax);
    if (!IDENTIFIER_RE.test(name)) {
        throw new Error(`${where}: expected an identifier`);
    }
    return name;
}
function boundedText(input, where, charsMax) {
    if (typeof input !== 'string') {
        throw new Error(`${where}: expected string`);
    }
    if (input.length > charsMax) {
        throw new Error(`${where}: exceeds ${charsMax} chars`);
    }
    return input;
}
function requireRecord(input, where) {
    const record = (0, record_1.toRecord)(input);
    if (record === undefined) {
        throw new Error(`${where}: expected object`);
    }
    return record;
}
