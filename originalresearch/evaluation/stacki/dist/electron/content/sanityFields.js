"use strict";
// One Sanity document's fields for the panel: the schema's fields in its order,
// each with the document's value, then any field the document holds that the
// schema does not name. A field's type comes from the schema where the code
// settles it (sanitySchema.ts) and from its value where it does not.
Object.defineProperty(exports, "__esModule", { value: true });
exports.documentFields = documentFields;
exports.inferType = inferType;
exports.assetRefs = assetRefs;
const assert_1 = require("../../shared/core/assert");
const cmsRemoteSchema_1 = require("../../shared/properties/cmsRemoteSchema");
const ORDER_RANK = 'orderRank';
const FIELD_NAME = /^[A-Za-z][A-Za-z0-9_]{0,63}$/;
// Kinds a list's members are told apart by when inferred from its items.
const MEMBERS_INFERRED_MAX = 4;
function documentFields(document, schema) {
    // `orderRank` is the orderable plugin's sort key, written by dragging rows;
    // the Studio never shows it, whatever a schema says or does not say.
    const values = new Map(Object.entries(document).filter(([key]) => key !== ORDER_RANK));
    const named = new Set(schema?.fields.map((field) => field.name) ?? []);
    const declared = (schema?.fields ?? [])
        .filter((field) => field.name !== ORDER_RANK)
        .map(({ groups, ...field }) => {
        const value = (0, cmsRemoteSchema_1.parseRemoteValue)(values.get(field.name));
        return { ...field, type: field.type ?? inferType(value), value, ...(groups.length === 0 ? {} : { groups }) };
    });
    const extra = [...values.keys()]
        .filter((key) => FIELD_NAME.test(key) && !named.has(key) && !schema?.hidden.has(key))
        .map((name) => {
        const value = (0, cmsRemoteSchema_1.parseRemoteValue)(values.get(name));
        return {
            name,
            title: '',
            description: '',
            required: false,
            rules: [],
            type: inferType(value),
            value,
        };
    });
    const fields = [...declared, ...extra].slice(0, cmsRemoteSchema_1.REMOTE_SCHEMA_LIMITS.fieldsMax);
    (0, assert_1.assert)(fields.every((field) => !field.name.startsWith('_')), 'System keys are not fields');
    return fields;
}
/** A type for a value no schema describes, read from the value's own shape. */
function inferType(value, depth = 0) {
    (0, assert_1.assert)(depth <= cmsRemoteSchema_1.REMOTE_SCHEMA_LIMITS.valueDepthMax, 'Inference follows the value depth bound');
    if (typeof value === 'boolean') {
        return { kind: 'boolean', options: [] };
    }
    if (typeof value === 'number') {
        return { kind: 'number', options: [] };
    }
    if (typeof value === 'string' || value === undefined) {
        return { kind: textKind(value ?? ''), options: [] };
    }
    const list = (0, cmsRemoteSchema_1.remoteList)(value);
    if (list !== undefined) {
        return listType(list, depth);
    }
    return objectType((0, cmsRemoteSchema_1.remoteObject)(value) ?? {}, depth);
}
function listType(items, depth) {
    if (items.length > 0 && items.every((item) => typeOfItem(item) === 'block')) {
        return { kind: 'richText' };
    }
    const of = [];
    for (const item of items) {
        const type = inferType(item, depth + 1);
        if (!of.some((known) => sameShape(known, type)) && of.length < MEMBERS_INFERRED_MAX) {
            of.push(type);
        }
    }
    return { kind: 'array', of: of.length > 0 ? of : [{ kind: 'string', options: [] }] };
}
function objectType(value, depth) {
    const typeName = value['_type'];
    switch (typeof typeName === 'string' ? typeName : '') {
        case 'slug':
            return { kind: 'slug', options: [] };
        case 'reference':
            return { kind: 'reference', to: [] };
        case 'geopoint':
            return { kind: 'geopoint' };
        case 'file':
            return { kind: 'file' };
        case 'image':
            return { kind: 'image', fields: fieldsInferred(value, depth, ['asset', 'crop', 'hotspot']) };
        default: {
            const name = typeof typeName === 'string' ? typeName : 'object';
            return { kind: 'object', name, fields: fieldsInferred(value, depth, []) };
        }
    }
}
function fieldsInferred(value, depth, skipped) {
    return Object.entries(value)
        .filter(([key]) => FIELD_NAME.test(key) && !skipped.includes(key))
        .slice(0, cmsRemoteSchema_1.REMOTE_SCHEMA_LIMITS.fieldsMax)
        .map(([name, entry]) => ({
        name,
        title: '',
        description: '',
        required: false,
        rules: [],
        type: inferType(entry, depth + 1),
    }));
}
function textKind(value) {
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        return 'date';
    }
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(value)) {
        return 'datetime';
    }
    if (/^https?:\/\/\S+$/.test(value)) {
        return 'url';
    }
    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
        return 'email';
    }
    return value.includes('\n') || value.length > 120 ? 'text' : 'string';
}
function typeOfItem(item) {
    const type = (0, cmsRemoteSchema_1.remoteObject)(item)?.['_type'];
    return typeof type === 'string' ? type : undefined;
}
function sameShape(left, right) {
    if (left.kind === 'object' && right.kind === 'object') {
        return left.name === right.name;
    }
    return left.kind === right.kind;
}
/** Every asset a value points at (`image-…`, `file-…` refs), for their addresses. */
function assetRefs(value) {
    const out = new Set();
    const queue = value === undefined ? [] : [value];
    for (let at = 0; at < queue.length && at < cmsRemoteSchema_1.REMOTE_SCHEMA_LIMITS.valueNodesMax; at++) {
        const next = queue[at];
        const object = (0, cmsRemoteSchema_1.remoteObject)(next);
        if (object !== undefined || (0, cmsRemoteSchema_1.remoteList)(next) !== undefined) {
            queue.push(...((0, cmsRemoteSchema_1.remoteList)(next) ?? Object.values(object ?? {})));
            const reference = object?.['_ref'];
            if (typeof reference === 'string' && /^(image|file)-[\w-]{1,200}$/.test(reference)) {
                out.add(reference);
            }
        }
    }
    return [...out];
}
