"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseSerializeNodes = parseSerializeNodes;
exports.parseSerializePage = parseSerializePage;
// The serializer also receives legacy renderer and Markdown objects. Validate
// their wire shape once here; keep original nodes so source spelling survives.
const record_1 = require("../../shared/core/record");
const limits_1 = require("../../shared/core/limits");
const pageNode_1 = require("../../shared/page/pageNode");
const frontmatter_1 = require("../../shared/page/frontmatter");
const NODE_VARIANT_FIELDS = {
    component: ['name', 'children', 'shorthand', 'tightClose', 'closeSource', 'dynamicTag', 'astroAsset', 'chunkFile', 'chunkAggregate'],
    element: ['name', 'children', 'shorthand', 'tightClose', 'closeSource', 'dynamicTag', 'astroAsset', 'chunkFile', 'chunkAggregate'],
    text: ['value'],
    expr: ['value'],
    'raw-line': ['value'],
    comment: ['value', 'jsx'],
    raw: ['name', 'inner'],
    map: ['head', 'children', 'headSource', 'body', 'bodyParts', 'bare'],
    cond: ['op', 'test', 'children'],
    branch: ['name', 'children'],
    'chunk-group': ['name', 'chunkFile', 'children'],
};
function parseSerializeNodes(input) {
    const nodes = (0, record_1.toArray)(input);
    if (!nodes) {
        throw new Error('SerializeNodes: expected array');
    }
    if (nodes.length > limits_1.LIMITS.treeNodesMax) {
        throw new Error('SerializeNodes: node limit');
    }
    if (!nodes.every(isParserNode)) {
        throw new Error('SerializeNodes: invalid node');
    }
    const pending = nodes.map((node) => ({
        node,
        depth: 0,
    }));
    let visited = 0;
    for (let index = 0; index < pending.length; index++) {
        const current = pending[index];
        if (!current) {
            throw new Error('SerializeNodes: missing traversal entry');
        }
        if (++visited > limits_1.LIMITS.treeNodesMax) {
            throw new Error('SerializeNodes: node limit');
        }
        if (current.depth > limits_1.LIMITS.treeDepthMax) {
            throw new Error('SerializeNodes: depth limit');
        }
        const record = parseSerializeNode(current.node);
        const children = (0, record_1.toArray)(record['children']);
        if (children) {
            if (pending.length + children.length > limits_1.LIMITS.treeNodesMax) {
                throw new Error('SerializeNodes: node limit');
            }
            for (const node of children) {
                pending.push({ node, depth: current.depth + 1 });
            }
        }
    }
    return nodes;
}
function parseSerializePage(input) {
    const record = parseRecord(input, 'SerializePage');
    const imports = (0, record_1.toArray)(record['imports'] ?? []);
    if (!imports) {
        throw new Error('SerializePage.imports: expected array');
    }
    if (imports.length > limits_1.LIMITS.importsMax) {
        throw new Error('SerializePage.imports: limit');
    }
    const layout = record['frontmatterLayout'] === undefined ? undefined : parseRecord(record['frontmatterLayout'], 'SerializePage.frontmatterLayout');
    return {
        imports: imports.map(parseSerializeImport),
        frontmatterLead: parseText(record['frontmatterLead'] ?? '', 'frontmatterLead'),
        extraFrontmatter: parseText(record['extraFrontmatter'] ?? '', 'extraFrontmatter'),
        extraFrontmatterSpaced: parseBoolean(record['extraFrontmatterSpaced'] ?? true),
        hadFrontmatter: parseBoolean(record['hadFrontmatter'] ?? true),
        trailingBlank: parseCount(record['trailingBlank'] ?? 0, 'trailingBlank'),
        eol: parsePageEol(record['eol']),
        nodes: parseSerializeNodes(record['nodes']),
        ...(layout === undefined
            ? {}
            : {
                frontmatterLayout: {
                    extra: parseText(layout['extra'], 'frontmatterLayout.extra'),
                    slots: (0, frontmatter_1.parseImportSlots)(layout['slots']),
                },
            }),
    };
}
function parsePageEol(input) {
    if (input === undefined || input === '\n') {
        return '\n';
    }
    if (input === '\r\n') {
        return '\r\n';
    }
    throw new Error('SerializePage.eol: expected LF or CRLF');
}
function parseSerializeImport(input) {
    const record = parseRecord(input, 'SerializeImport');
    const member = (0, frontmatter_1.parseImportMember)({
        ...record,
        quote: record['quote'] ?? "'",
        at: record['at'] ?? 0,
    });
    // New imports have no original source slot. A sentinel cannot match an
    // existing slot, whose offsets are all nonnegative.
    return record['at'] === undefined ? { ...member, at: -1 } : member;
}
function parseSerializeNode(input) {
    const record = parseRecord(input, 'SerializeNode');
    parseSerializeMetadata(record);
    parseSerializeVariant(record);
    switch (record['kind']) {
        case 'text':
        case 'expr':
        case 'raw-line':
        case 'comment':
            parseText(record['value'], 'node.value');
            break;
        case 'raw':
            parseText(record['name'], 'node.name');
            parseText(record['inner'], 'node.inner');
            break;
        case 'component':
        case 'element':
        case 'branch':
        case 'chunk-group':
            parseText(record['name'], 'node.name');
            if (record['kind'] === 'branch') {
                if (record['name'] !== 'then' && record['name'] !== 'else') {
                    throw new Error('SerializeNode: invalid branch name');
                }
            }
            if (record['kind'] === 'chunk-group') {
                parseText(record['chunkFile'], 'node.chunkFile');
            }
            parseSerializeChildren(record);
            break;
        case 'map':
            parseText(record['head'], 'node.head');
            if (record['bodyParts'] !== undefined) {
                (0, pageNode_1.parseMapBodyParts)(record['bodyParts'], record['children']);
            }
            if (record['body'] !== undefined) {
                parseStrings(record['body'], limits_1.LIMITS.treeNodesMax);
            }
            parseSerializeChildren(record);
            break;
        case 'cond':
            parseText(record['test'], 'node.test');
            if (record['op'] !== '?' && record['op'] !== '&&') {
                throw new Error('SerializeNode: invalid conditional operator');
            }
            parseSerializeChildren(record);
            break;
        default:
            throw new Error('SerializeNode: unknown kind');
    }
    return record;
}
function isParserNode(input) {
    parseSerializeNode(input);
    return true;
}
// Variant-only fields cannot leak into another kind: the constructor below
// promises the same negative space that ParserNode enforces at compile time.
function parseSerializeVariant(record) {
    const kind = record['kind'];
    if (typeof kind !== 'string') {
        throw new Error('SerializeNode: unknown kind');
    }
    const allowed = Object.hasOwn(NODE_VARIANT_FIELDS, kind) ? NODE_VARIANT_FIELDS[kind] : undefined;
    if (!allowed) {
        throw new Error('SerializeNode: unknown kind');
    }
    for (const field of [
        'name',
        'children',
        'shorthand',
        'tightClose',
        'closeSource',
        'dynamicTag',
        'astroAsset',
        'chunkFile',
        'chunkAggregate',
        'value',
        'jsx',
        'inner',
        'head',
        'headSource',
        'body',
        'bodyParts',
        'bare',
        'op',
        'test',
    ]) {
        if (record[field] !== undefined && !allowed.includes(field)) {
            throw new Error(`SerializeNode: ${field} is not valid on ${kind}`);
        }
    }
}
function parseSerializeChildren(record) {
    // A self-closing tag says so with a present `children: undefined`; a missing
    // key is still a malformed node.
    if (Object.hasOwn(record, 'children')) {
        if (record['children'] === undefined) {
            if (record['kind'] === 'component' || record['kind'] === 'element') {
                return;
            }
        }
    }
    const children = (0, record_1.toArray)(record['children']);
    if (!children) {
        throw new Error('SerializeNode.children: expected array');
    }
    if (children.length > limits_1.LIMITS.treeNodesMax) {
        throw new Error('SerializeNodes: node limit');
    }
    if (record['kind'] === 'cond') {
        for (const child of children) {
            if ((0, record_1.toRecord)(child)?.['kind'] !== 'branch') {
                throw new Error('SerializeNode: conditional children must be branches');
            }
        }
    }
}
function parseSerializeMetadata(record) {
    for (const field of ['id', 'source', 'attrSource', 'closeSource', 'headSource', 'chunkFile', 'mdSource']) {
        if (record[field] !== undefined) {
            parseText(record[field], `node.${field}`);
        }
    }
    for (const field of ['blankBefore', 'blankAfter', 'start', 'end']) {
        if (record[field] !== undefined) {
            parseCount(record[field], `node.${field}`);
        }
    }
    for (const field of ['jsx', 'shorthand', 'tightClose', 'dynamicTag', 'astroAsset', 'chunkAggregate', 'bare']) {
        if (record[field] !== undefined) {
            parseBoolean(record[field]);
        }
    }
    if (record['attrOrder'] !== undefined) {
        parseStrings(record['attrOrder'], limits_1.LIMITS.attrsPerNodeMax);
    }
    if (record['props'] !== undefined) {
        parseSerializeProps(record['props']);
    }
}
function parseSerializeProps(input) {
    const record = parseRecord(input, 'SerializeProps');
    const entries = Object.entries(record);
    if (entries.length > limits_1.LIMITS.attrsPerNodeMax) {
        throw new Error('SerializeProps: attr limit');
    }
    for (const [name, input] of entries) {
        parseText(name, 'attribute name', limits_1.LIMITS.attrCharsMax);
        const prop = parseRecord(input, 'SerializeProp');
        switch (prop['type']) {
            case 'bare':
                break;
            case 'expr':
            case 'spread':
            case 'string':
                parseText(prop['value'], 'attribute value', limits_1.LIMITS.attrCharsMax);
                break;
            default:
                throw new Error('SerializeProp: unknown type');
        }
    }
}
function parseRecord(input, field) {
    const record = (0, record_1.toRecord)(input);
    if (!record) {
        throw new Error(`${field}: expected object`);
    }
    return record;
}
function parseText(input, field, limit = limits_1.LIMITS.nodeValueCharsMax) {
    if (typeof input !== 'string') {
        throw new Error(`${field}: expected string`);
    }
    if (input.length > limit) {
        throw new Error(`${field}: exceeds limit`);
    }
    return input;
}
function parseStrings(input, limit) {
    const list = (0, record_1.toArray)(input);
    if (!list) {
        throw new Error('SerializeNode: expected string array');
    }
    if (list.length > limit) {
        throw new Error('SerializeNode: string array limit');
    }
    for (const value of list) {
        parseText(value, 'array value');
    }
}
function parseCount(input, field) {
    if (typeof input !== 'number') {
        throw new Error(`${field}: expected integer`);
    }
    if (!Number.isSafeInteger(input)) {
        throw new Error(`${field}: expected integer`);
    }
    if (input < 0 || input > limits_1.LIMITS.ipcFieldCharsMax) {
        throw new Error(`${field}: outside source bounds`);
    }
    return input;
}
function parseBoolean(input) {
    if (typeof input !== 'boolean') {
        throw new Error('SerializeNode: expected boolean');
    }
    return input;
}
