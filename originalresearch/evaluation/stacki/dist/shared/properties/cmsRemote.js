"use strict";
// Reading and writing a connected CMS from the CMS panel: its collections (in
// Sanity, document types), the documents in one, and one document's fields.
// Every write is a draft; nothing here publishes. The connection's key stays in
// the main process (or Studio's server): requests name the connection by id.
//
// Every field is editable, by its type (cmsRemoteSchema.ts); a write sets one
// top-level field's whole value, or removes it. Images and files are uploaded
// to the CMS first and written as references to the stored asset.
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseRemoteConnection = exports.REMOTE_TEMPLATE_ID = exports.CMS_REMOTE_LIMITS = void 0;
exports.parseRemoteCollectionName = parseRemoteCollectionName;
exports.parseRemoteDocumentId = parseRemoteDocumentId;
exports.parseRemoteFieldName = parseRemoteFieldName;
exports.parseRemoteWrite = parseRemoteWrite;
exports.parseRemoteResult = parseRemoteResult;
exports.parseRemoteCollections = parseRemoteCollections;
exports.parseRemoteDocuments = parseRemoteDocuments;
exports.parseRemoteColumns = parseRemoteColumns;
exports.remoteCell = remoteCell;
exports.parseRemoteDocument = parseRemoteDocument;
exports.parseRemoteFieldGroups = parseRemoteFieldGroups;
exports.parseRemoteAsset = parseRemoteAsset;
exports.parseRemoteAssets = parseRemoteAssets;
exports.parseRemoteReferenceOptions = parseRemoteReferenceOptions;
exports.parseRemoteTypes = parseRemoteTypes;
exports.parseRemoteDocumentAction = parseRemoteDocumentAction;
exports.parseRemoteRevisionId = parseRemoteRevisionId;
exports.parseRemoteRevisions = parseRemoteRevisions;
exports.parseRemoteActedDocument = parseRemoteActedDocument;
exports.parseRemoteAssetKind = parseRemoteAssetKind;
exports.parseRemoteDocumentList = parseRemoteDocumentList;
exports.parseRemoteIds = parseRemoteIds;
exports.parseRemoteMove = parseRemoteMove;
const boundary_1 = require("../core/boundary");
const assert_1 = require("../core/assert");
const cmsConnections_1 = require("./cmsConnections");
const entrySlug_1 = require("./entrySlug");
const cmsRemoteSchema_1 = require("./cmsRemoteSchema");
exports.CMS_REMOTE_LIMITS = {
    collectionsMax: 200,
    documentsMax: 500,
    /** Fields a list shows as columns beside each item's name. */
    columnsMax: 12,
    /** How far into a value a column looks for its line: a list of named things. */
    cellDepthMax: 2,
    fieldsMax: 200,
    assetsMax: 500,
    revisionsMax: 100,
    referenceTypesMax: 24,
    previewCharsMax: 200,
    /** Tabs a document's fields are split into (Sanity's `groups`). */
    fieldGroupsMax: 24,
};
// Letters, digits, `_` and `-`: Astro content keys are often kebab case
// (`campus-description`), and exported ones may start with a digit (`1-logo-svg`).
/**
 * The id of a collection's template: its fields with no values, edited before
 * an item is created. No stored document has it; creating gives the real one.
 */
exports.REMOTE_TEMPLATE_ID = 'new-item';
const IDENTIFIER = /^[A-Za-z0-9_][A-Za-z0-9_-]{0,63}$/;
function parseRemoteCollectionName(input) {
    const name = (0, boundary_1.text)(input);
    if (!/^[A-Za-z_][\w.-]{0,127}$/.test(name)) {
        throw new Error('Invalid CMS collection name.');
    }
    (0, assert_1.assert)(name.length <= 128, 'A collection name is short');
    return name;
}
/** A published document id: never a draft or version id, which the server derives. */
function parseRemoteDocumentId(input) {
    const id = (0, boundary_1.text)(input);
    if (!/^[\w][\w.-]{0,127}$/.test(id) || id.startsWith('drafts.') || id.startsWith('versions.')) {
        throw new Error('Invalid CMS document id.');
    }
    (0, assert_1.assert)(!id.startsWith('drafts.'), 'A document is named by its published id');
    return id;
}
function parseRemoteFieldName(input) {
    const name = (0, boundary_1.text)(input);
    if (!IDENTIFIER.test(name) || name.startsWith('_')) {
        throw new Error('Invalid field name.');
    }
    (0, assert_1.assert)(name.length <= 64, 'A field name is short');
    return name;
}
function parseRemoteWrite(input) {
    const value = (0, boundary_1.record)(input);
    return {
        id: parseRemoteDocumentId(value['id']),
        field: parseRemoteFieldName(value['field']),
        value: (0, cmsRemoteSchema_1.parseRemoteValue)(value['value']),
    };
}
exports.parseRemoteConnection = cmsConnections_1.parseConnectionId;
function parseRemoteResult(input, parseValue) {
    const value = (0, boundary_1.record)(input);
    if (value['ok'] === true) {
        return { ok: true, value: parseValue(value['value']) };
    }
    const message = (0, boundary_1.text)(value['message']);
    (0, assert_1.assert)(message.length > 0, 'A CMS failure says what went wrong');
    (0, assert_1.assert)(message.length <= 1000, 'A CMS failure message is short');
    return { ok: false, message };
}
function parseRemoteCollections(input) {
    return boundedList(input, exports.CMS_REMOTE_LIMITS.collectionsMax).map((entry) => {
        const value = (0, boundary_1.record)(entry);
        const count = value['count'];
        if (typeof count !== 'number' || !Number.isSafeInteger(count) || count < 0) {
            throw new Error('Invalid collection count.');
        }
        const icon = value['icon'];
        if (icon !== undefined && (typeof icon !== 'string' || !/^[a-z][a-z0-9-]{0,40}$/.test(icon))) {
            throw new Error('Invalid collection icon.');
        }
        return { name: parseRemoteCollectionName(value['name']), count, icon };
    });
}
function parseRemoteDocuments(input) {
    return boundedList(input, exports.CMS_REMOTE_LIMITS.documentsMax).map((entry) => {
        const value = (0, boundary_1.record)(entry);
        return {
            id: parseRemoteDocumentId(value['id']),
            title: preview(value['title']),
            subtitle: value['subtitle'] === undefined ? undefined : preview(value['subtitle']),
            imageURL: value['imageURL'] === undefined ? undefined : parseHTTPS(value['imageURL']),
            ...(value['imageFile'] === undefined ? {} : { imageFile: (0, cmsRemoteSchema_1.parseProjectFile)(value['imageFile']) }),
            status: parseStatus(value['status']),
            updatedAt: preview(value['updatedAt']),
            ...(value['cells'] === undefined ? {} : { cells: parseCells(value['cells']) }),
        };
    });
}
/** The fields a list asks to show as columns: field names, a few, no repeats. */
function parseRemoteColumns(input) {
    const columns = boundedList(input, exports.CMS_REMOTE_LIMITS.columnsMax).map(parseRemoteFieldName);
    if (new Set(columns).size !== columns.length) {
        throw new Error('A column is named twice.');
    }
    (0, assert_1.assert)(columns.length <= exports.CMS_REMOTE_LIMITS.columnsMax, 'A list shows few columns');
    return columns;
}
function parseCells(input) {
    const value = (0, boundary_1.record)(input);
    const entries = Object.entries(value);
    if (entries.length > exports.CMS_REMOTE_LIMITS.columnsMax) {
        throw new Error('Too many columns.');
    }
    const cells = {};
    for (const [name, cell] of entries) {
        if (typeof cell === 'number' && Number.isFinite(cell)) {
            cells[parseRemoteFieldName(name)] = cell;
        }
        else if (typeof cell === 'boolean') {
            cells[parseRemoteFieldName(name)] = cell;
        }
        else {
            cells[parseRemoteFieldName(name)] = preview(cell);
        }
    }
    (0, assert_1.assert)(Object.keys(cells).length === entries.length, 'Every cell parses');
    return cells;
}
/**
 * A stored value as a column shows it: text and numbers as they are, a switch
 * as one, a slug or a referenced document by its name, a list by its items'
 * names. Anything else — an image, a nested group — has no line to show.
 */
function remoteCell(value, depth = 0) {
    (0, assert_1.assert)(depth <= exports.CMS_REMOTE_LIMITS.cellDepthMax, 'A cell looks into a value boundedly');
    if (typeof value === 'string') {
        return value.length > exports.CMS_REMOTE_LIMITS.previewCharsMax ? value.slice(0, exports.CMS_REMOTE_LIMITS.previewCharsMax) : value;
    }
    if (typeof value === 'number') {
        return Number.isFinite(value) ? value : undefined;
    }
    if (typeof value === 'boolean') {
        return value;
    }
    if (Array.isArray(value)) {
        const items = value;
        if (depth >= exports.CMS_REMOTE_LIMITS.cellDepthMax) {
            return undefined;
        }
        const names = items
            .slice(0, exports.CMS_REMOTE_LIMITS.columnsMax)
            .map((item) => remoteCell(item, depth + 1))
            .filter((cell) => cell !== undefined);
        return names.length === 0 ? undefined : remoteCell(names.join(', '), depth + 1);
    }
    if (typeof value === 'object' && value !== null && depth < exports.CMS_REMOTE_LIMITS.cellDepthMax) {
        const named = ['current', 'title', 'name', 'label'].map((key) => Reflect.get(value, key));
        const first = named.find((part) => typeof part === 'string');
        return first === undefined ? undefined : remoteCell(first, depth + 1);
    }
    return undefined;
}
function parseRemoteDocument(input) {
    const value = (0, boundary_1.record)(input);
    const editURL = value['editURL'];
    return {
        id: parseRemoteDocumentId(value['id']),
        type: parseRemoteCollectionName(value['type']),
        status: parseStatus(value['status']),
        fields: boundedList(value['fields'], exports.CMS_REMOTE_LIMITS.fieldsMax).map(parseField),
        assets: parseRemoteAssets(value['assets']),
        editedAt: optionalTime(value['editedAt']),
        publishedAt: optionalTime(value['publishedAt']),
        editURL: editURL === undefined ? undefined : parseHTTPS(editURL),
        ...(value['fieldGroups'] === undefined ? {} : { fieldGroups: parseRemoteFieldGroups(value['fieldGroups']) }),
        ...(value['file'] === undefined ? {} : { file: (0, cmsRemoteSchema_1.parseProjectFile)(value['file']) }),
        ...(value['slug'] === undefined ? {} : { slug: (0, entrySlug_1.parseEntrySlug)(value['slug']) }),
    };
}
function parseField(input) {
    const value = (0, boundary_1.record)(input);
    const field = (0, cmsRemoteSchema_1.parseRemoteSchemaField)(value);
    (0, assert_1.assert)(!field.name.startsWith('_'), 'System keys are not fields');
    const groups = value['groups'];
    return {
        ...field,
        value: (0, cmsRemoteSchema_1.parseRemoteValue)(value['value']),
        ...(groups === undefined ? {} : { groups: boundedList(groups, exports.CMS_REMOTE_LIMITS.fieldGroupsMax).map(parseGroupName) }),
    };
}
function parseRemoteFieldGroups(input) {
    const groups = boundedList(input, exports.CMS_REMOTE_LIMITS.fieldGroupsMax).map((entry) => {
        const group = (0, boundary_1.record)(entry);
        const title = (0, boundary_1.text)(group['title']);
        if (title.length === 0 || title.length > exports.CMS_REMOTE_LIMITS.previewCharsMax) {
            throw new Error('Invalid field group title.');
        }
        return { name: parseGroupName(group['name']), title };
    });
    const names = groups.map((group) => group.name);
    if (new Set(names).size !== names.length) {
        throw new Error('A field group is named twice.');
    }
    (0, assert_1.assert)(groups.length <= exports.CMS_REMOTE_LIMITS.fieldGroupsMax, 'A document has few field groups');
    (0, assert_1.assert)(new Set(names).size === groups.length, 'Each tab is named once');
    return groups;
}
// A group's name as a schema writes it: `pastor`, `seo`, `main-details`.
function parseGroupName(input) {
    const name = (0, boundary_1.text)(input);
    if (!/^[A-Za-z_][\w-]{0,63}$/.test(name)) {
        throw new Error('Invalid field group name.');
    }
    (0, assert_1.assert)(name.length <= 64, 'A group name is short');
    return name;
}
function parseRemoteAsset(input) {
    const value = (0, boundary_1.record)(input);
    const id = (0, boundary_1.text)(value['id']);
    if (!/^(image|file)-[\w-]{1,200}$/.test(id)) {
        throw new Error('Invalid asset id.');
    }
    const filename = (0, boundary_1.text)(value['filename']);
    (0, assert_1.assert)(filename.length <= 1000, 'An asset file name is bounded');
    return { id, url: parseHTTPS(value['url']), filename };
}
function parseRemoteAssets(input) {
    return boundedList(input, exports.CMS_REMOTE_LIMITS.assetsMax).map(parseRemoteAsset);
}
function parseRemoteReferenceOptions(input) {
    return boundedList(input, exports.CMS_REMOTE_LIMITS.documentsMax).map((entry) => {
        const value = (0, boundary_1.record)(entry);
        return {
            id: parseRemoteDocumentId(value['id']),
            type: parseRemoteCollectionName(value['type']),
            title: preview(value['title']),
            imageURL: value['imageURL'] === undefined ? undefined : parseHTTPS(value['imageURL']),
        };
    });
}
/** The document types a reference may point at: a few names, at least one. */
function parseRemoteTypes(input) {
    const types = boundedList(input, exports.CMS_REMOTE_LIMITS.referenceTypesMax).map(parseRemoteCollectionName);
    (0, assert_1.assert)(types.length <= exports.CMS_REMOTE_LIMITS.referenceTypesMax, 'Reference types are bounded');
    return types;
}
function parseRemoteDocumentAction(input) {
    if (input === 'publish' || input === 'discard' || input === 'unpublish') {
        return input;
    }
    throw new Error('Unknown document action.');
}
/** A history transaction id: Sanity's are short, letters, digits and dashes. */
function parseRemoteRevisionId(input) {
    const id = (0, boundary_1.text)(input);
    if (!/^[A-Za-z0-9-]{1,64}$/.test(id)) {
        throw new Error('Invalid revision id.');
    }
    (0, assert_1.assert)(id.length <= 64, 'A revision id is short');
    return id;
}
function parseRemoteRevisions(input) {
    return boundedList(input, exports.CMS_REMOTE_LIMITS.revisionsMax).map((entry) => {
        const value = (0, boundary_1.record)(entry);
        return {
            id: parseRemoteRevisionId(value['id']),
            timestamp: preview(value['timestamp']),
            author: preview(value['author']),
        };
    });
}
/** An action's result: the document as it now stands, or none when the action removed it. */
function parseRemoteActedDocument(input) {
    return input === undefined ? undefined : parseRemoteDocument(input);
}
function parseRemoteAssetKind(input) {
    if (input === 'image' || input === 'file') {
        return input;
    }
    throw new Error('Expected an image or a file.');
}
// An ISO time, or absent; anything else is refused rather than shown as a date.
function optionalTime(input) {
    if (input === undefined) {
        return undefined;
    }
    const value = (0, boundary_1.text)(input);
    if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(value) || value.length > 40) {
        throw new Error('Invalid CMS time.');
    }
    (0, assert_1.assert)(!Number.isNaN(Date.parse(value)), 'A CMS time is a real date');
    return value;
}
function parseStatus(input) {
    if (input === 'draft' || input === 'published' || input === 'changed') {
        return input;
    }
    throw new Error('Invalid document status.');
}
function parseHTTPS(input) {
    const url = new URL((0, boundary_1.text)(input));
    if (url.protocol !== 'https:' || url.username || url.password) {
        throw new Error('Invalid CMS editor address.');
    }
    (0, assert_1.assert)(url.protocol === 'https:', 'A CMS editor opens over https');
    return url.toString();
}
function preview(input) {
    const value = (0, boundary_1.text)(input);
    const shown = value.length > exports.CMS_REMOTE_LIMITS.previewCharsMax ? value.slice(0, exports.CMS_REMOTE_LIMITS.previewCharsMax) : value;
    (0, assert_1.assert)(shown.length <= exports.CMS_REMOTE_LIMITS.previewCharsMax, 'A preview is cut to its bound');
    return shown;
}
function boundedList(input, max) {
    (0, assert_1.assert)(Number.isSafeInteger(max), 'A list bound is a whole number');
    (0, assert_1.assert)(max > 0, 'A list bound allows at least one item');
    if (!Array.isArray(input)) {
        throw new Error('Expected a list.');
    }
    if (input.length > max) {
        throw new Error('Too many items.');
    }
    return input;
}
function parseRemoteDocumentList(input) {
    const value = (0, boundary_1.record)(input);
    const orderable = value['orderable'];
    if (typeof orderable !== 'boolean') {
        throw new Error('Expected whether the collection is ordered.');
    }
    const documents = parseRemoteDocuments(value['documents']);
    (0, assert_1.assert)(documents.length <= exports.CMS_REMOTE_LIMITS.documentsMax, 'A document list stays bounded');
    return { documents, orderable };
}
/** The documents a delete names: published ids, at most a page of them, no repeats. */
function parseRemoteIds(input) {
    const ids = boundedList(input, exports.CMS_REMOTE_LIMITS.documentsMax).map(parseRemoteDocumentId);
    if (ids.length === 0) {
        throw new Error('Choose at least one document.');
    }
    if (new Set(ids).size !== ids.length) {
        throw new Error('A document is named twice.');
    }
    (0, assert_1.assert)(ids.length <= exports.CMS_REMOTE_LIMITS.documentsMax, 'A delete names at most a page');
    (0, assert_1.assert)(!ids.some((id) => id.startsWith('drafts.')), 'A delete names published ids');
    return ids;
}
function parseRemoteMove(input) {
    const value = (0, boundary_1.record)(input);
    const id = parseRemoteDocumentId(value['id']);
    const after = value['after'] === undefined ? undefined : parseRemoteDocumentId(value['after']);
    const before = value['before'] === undefined ? undefined : parseRemoteDocumentId(value['before']);
    if (after === id || before === id) {
        throw new Error('A document cannot move next to itself.');
    }
    if (after !== undefined && after === before) {
        throw new Error('A move needs two different neighbours.');
    }
    (0, assert_1.assert)(id !== after, 'A move names a neighbour other than itself');
    (0, assert_1.assert)(id !== before, 'A move names a neighbour other than itself');
    return { collection: parseRemoteCollectionName(value['collection']), id, after, before };
}
