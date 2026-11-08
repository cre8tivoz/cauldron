"use strict";
// A project's Astro content collections, shown in the CMS panel the way a
// connected CMS is: a collection list, a table of entries and an item editor
// (RemoteCmsBrowser.tsx, RemoteCmsView.tsx). They are presented as one more
// source beside the saved connections, under a fixed id no saved connection
// can have, so the panel's views and caches need no second path. Its calls go
// to the content handlers (contentHandlers.ts) rather than to a CMS: entries
// are the project's own files, read and written in place, with no key.
//
// What a file cannot do, the panel does not offer: there is no draft to
// publish or discard and no history but git's.
Object.defineProperty(exports, "__esModule", { value: true });
exports.ASTRO_CONTENT_SOURCE = exports.ASTRO_CONTENT_LIMITS = exports.ASTRO_CONTENT_ID = void 0;
exports.parseAstroRemoteRead = parseAstroRemoteRead;
exports.parseAstroRemoteEdit = parseAstroRemoteEdit;
exports.parseAstroCollectionName = parseAstroCollectionName;
exports.isAstroContent = isAstroContent;
const boundary_1 = require("../core/boundary");
const assert_1 = require("../core/assert");
const collectionSettings_1 = require("./collectionSettings");
const entrySlug_1 = require("./entrySlug");
const cmsRemote_1 = require("./cmsRemote");
/** The Astro source's id: a UUID, as every connection id is, that none is ever given. */
exports.ASTRO_CONTENT_ID = '00000000-0000-4000-8000-00000a57c0de';
exports.ASTRO_CONTENT_LIMITS = {
    collectionNameCharsMax: 64,
    collectionLabelCharsMax: 80,
};
exports.ASTRO_CONTENT_SOURCE = {
    kind: 'astro',
    id: exports.ASTRO_CONTENT_ID,
    label: 'Content Collections',
};
function parseAstroRemoteRead(input) {
    const value = (0, boundary_1.record)(input);
    switch (value['operation']) {
        case 'collections':
            return { operation: 'collections' };
        case 'documents': {
            const collection = (0, cmsRemote_1.parseRemoteCollectionName)(value['collection']);
            (0, assert_1.assert)(collection.length > 0, 'A read names its collection');
            const columns = value['columns'] === undefined ? [] : (0, cmsRemote_1.parseRemoteColumns)(value['columns']);
            return { operation: 'documents', collection, columns };
        }
        case 'settings':
            return { operation: 'settings', collection: (0, cmsRemote_1.parseRemoteCollectionName)(value['collection']) };
        case 'template':
            return { operation: 'template', collection: (0, cmsRemote_1.parseRemoteCollectionName)(value['collection']) };
        case 'document': {
            const id = (0, cmsRemote_1.parseRemoteDocumentId)(value['id']);
            // Every entry id holds its collection before a dot (astroRemoteService.ts);
            // one without is refused there, with a reason, rather than here.
            (0, assert_1.assert)(id.length <= 128, 'An entry id fits the remote id bound');
            return { operation: 'document', id };
        }
        default:
            throw new Error('Unknown content collection read.');
    }
}
function parseAstroRemoteEdit(input) {
    const value = (0, boundary_1.record)(input);
    switch (value['operation']) {
        case 'write': {
            const write = (0, cmsRemote_1.parseRemoteWrite)(value['write']);
            (0, assert_1.assert)(!write.field.startsWith('_'), 'A write names a content field, not a system key');
            return { operation: 'write', write };
        }
        case 'rename': {
            const slug = (0, entrySlug_1.parseEntrySlugText)(value['slug']);
            (0, assert_1.assert)(slug.length > 0, 'A rename names its new slug');
            return { operation: 'rename', id: (0, cmsRemote_1.parseRemoteDocumentId)(value['id']), slug };
        }
        case 'create':
            return { operation: 'create', collection: (0, cmsRemote_1.parseRemoteCollectionName)(value['collection']) };
        case 'delete': {
            const ids = (0, cmsRemote_1.parseRemoteIds)(value['ids']);
            (0, assert_1.assert)(ids.length > 0, 'A delete names at least one entry');
            return { operation: 'delete', ids };
        }
        case 'settings':
            return {
                operation: 'settings',
                collection: (0, cmsRemote_1.parseRemoteCollectionName)(value['collection']),
                change: (0, collectionSettings_1.parseSettingsChange)(value['change']),
            };
        case 'createCollection':
            return { operation: 'createCollection', name: parseAstroCollectionName(value['name']) };
        default:
            throw new Error('Unknown content collection edit.');
    }
}
// Words a collection's `const` may not be named: JavaScript's reserved words,
// and the names the generated config itself declares or imports.
const RESERVED = new Set([
    'await',
    'break',
    'case',
    'catch',
    'class',
    'const',
    'continue',
    'debugger',
    'default',
    'delete',
    'do',
    'else',
    'enum',
    'export',
    'extends',
    'false',
    'finally',
    'for',
    'function',
    'if',
    'implements',
    'import',
    'in',
    'instanceof',
    'interface',
    'let',
    'new',
    'null',
    'package',
    'private',
    'protected',
    'public',
    'return',
    'static',
    'super',
    'switch',
    'this',
    'throw',
    'true',
    'try',
    'typeof',
    'var',
    'void',
    'while',
    'with',
    'yield',
    'collections',
    'defineCollection',
    'glob',
    'file',
    'z',
    'reference',
]);
/**
 * A collection name as typed ("Blog posts") made into the identifier Astro
 * names it by (`blogPosts`): words joined in camel case, letters and digits
 * only, starting with a letter. A name that leaves nothing, starts with a
 * digit, or is a reserved word is refused rather than silently altered further.
 */
function parseAstroCollectionName(input) {
    const label = (0, boundary_1.text)(input).trim();
    if (label.length === 0) {
        throw new Error('Name the collection.');
    }
    if (label.length > exports.ASTRO_CONTENT_LIMITS.collectionLabelCharsMax) {
        throw new Error('A collection name is at most 80 characters.');
    }
    const words = label.split(/[^A-Za-z0-9]+/).filter((word) => word.length > 0);
    const name = words.map((word, index) => (index === 0 ? word.charAt(0).toLowerCase() + word.slice(1) : word.charAt(0).toUpperCase() + word.slice(1))).join('');
    if (!/^[a-z][A-Za-z0-9]*$/.test(name)) {
        throw new Error('A collection name starts with a letter.');
    }
    if (name.length > exports.ASTRO_CONTENT_LIMITS.collectionNameCharsMax) {
        throw new Error('A collection name is at most 64 letters.');
    }
    if (RESERVED.has(name)) {
        throw new Error(`“${name}” is reserved in a content config. Choose another name.`);
    }
    (0, assert_1.assert)(/^[a-z]/.test(name), 'A collection identifier starts with a lowercase letter');
    (0, assert_1.assert)((0, cmsRemote_1.parseRemoteCollectionName)(name) === name, 'A collection identifier is a valid name');
    return name;
}
/** Whether `source` is the project's own content collections rather than a saved connection. */
function isAstroContent(source) {
    if (source.kind === 'astro') {
        (0, assert_1.assert)(source.id === exports.ASTRO_CONTENT_ID, 'The content source has its fixed id');
        return true;
    }
    (0, assert_1.assert)(source.id !== exports.ASTRO_CONTENT_ID, 'No saved connection takes the content source’s id');
    return false;
}
