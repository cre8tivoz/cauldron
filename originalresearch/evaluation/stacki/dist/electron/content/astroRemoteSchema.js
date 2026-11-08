"use strict";
// An Astro collection's schema as the CMS panel's field editors read it: the
// JSON Schema zod renders the project's content config into (contentConfig.ts,
// workers/introspect.mjs), mapped onto the remote field types the Sanity views
// already draw (cmsRemoteSchema.ts). Only what can be edited faithfully is
// mapped:
//
//   string, enum         a text field, or a choice of its values
//   email, url           those fields, with their check
//   number, integer      a number, an integer checked as one
//   boolean              a switch
//   z.date()             a date, written as YYYY-MM-DD, which Astro coerces
//   image()              its path, chosen from the project's assets with a preview
//   reference('x')       a choice of collection x's entry ids, the value Astro stores
//   object, array        their members, mapped the same way
//
// A union or a record has no remote editor that writes its shape back as it
// was, so it is left out of the form, and its value stays in the file untouched:
// a write sets one top-level field and never the whole entry.
Object.defineProperty(exports, "__esModule", { value: true });
exports.astroSchemaFields = astroSchemaFields;
exports.referencedCollections = referencedCollections;
exports.labelize = labelize;
const assert_1 = require("../../shared/core/assert");
const record_1 = require("../../shared/core/record");
const cmsRemoteSchema_1 = require("../../shared/properties/cmsRemoteSchema");
/** A collection schema's top-level fields, in their declared order. */
function astroSchemaFields(schema, targets) {
    const root = (0, record_1.toRecord)(schema);
    if (root === undefined) {
        return [];
    }
    const fields = objectFields(root, { root, targets, depth: 0 });
    (0, assert_1.assert)(fields.length <= cmsRemoteSchema_1.REMOTE_SCHEMA_LIMITS.fieldsMax, 'A collection maps to bounded fields');
    (0, assert_1.assert)(new Set(fields.map((field) => field.name)).size === fields.length, 'Names are unique');
    return fields;
}
/** The collections a schema's references point at, so their entries can be offered. */
function referencedCollections(schema) {
    const found = new Set();
    const pending = [schema];
    // Every node is visited once; the schema is bounded data from the config reader.
    for (let visited = 0; pending.length > 0 && visited < cmsRemoteSchema_1.REMOTE_SCHEMA_LIMITS.valueNodesMax;) {
        const node = pending.pop();
        visited += 1;
        const value = (0, record_1.toRecord)(node);
        const items = (0, record_1.toArray)(node);
        if (items !== undefined) {
            pending.push(...items);
        }
        else if (value !== undefined) {
            const target = value['astroReference'];
            if (typeof target === 'string') {
                found.add(target);
            }
            pending.push(...Object.values(value));
        }
    }
    (0, assert_1.assert)(found.size <= cmsRemoteSchema_1.REMOTE_SCHEMA_LIMITS.valueNodesMax, 'Targets are bounded by the nodes read');
    return [...found];
}
function objectFields(node, context) {
    const properties = (0, record_1.toRecord)(node['properties']) ?? {};
    const required = new Set(((0, record_1.toArray)(node['required']) ?? []).filter(isString));
    const fields = [];
    for (const [name, property] of Object.entries(properties)) {
        if (fields.length >= cmsRemoteSchema_1.REMOTE_SCHEMA_LIMITS.fieldsMax) {
            break;
        }
        const field = fieldOf(name, (0, record_1.toRecord)(property), { listed: required.has(name) }, context);
        if (field !== undefined) {
            fields.push(field);
        }
    }
    return fields;
}
function fieldOf(name, property, placement, context) {
    if (property === undefined || !/^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/.test(name)) {
        return undefined;
    }
    const { node, nullable } = unwrapNullable(property);
    const type = typeOf(name, node, context);
    if (type === undefined) {
        return undefined;
    }
    // A default fills the key in when it is absent, so leaving it out is allowed.
    const required = placement.listed && !nullable && node['default'] === undefined;
    const description = typeof node['description'] === 'string' ? node['description'] : '';
    return {
        name,
        title: labelize(name),
        description: description.slice(0, cmsRemoteSchema_1.REMOTE_SCHEMA_LIMITS.descriptionCharsMax),
        required,
        rules: rulesOf(node, type, { required }),
        type,
    };
}
// The control for one schema node, or undefined when none writes it faithfully.
function typeOf(name, input, context) {
    if (context.depth >= cmsRemoteSchema_1.REMOTE_SCHEMA_LIMITS.typeDepthMax) {
        return undefined;
    }
    const node = dereferenced(input, context.root);
    if (node === undefined) {
        return undefined;
    }
    const reference = node['astroReference'];
    if (typeof reference === 'string') {
        return { kind: 'string', options: context.targets.get(reference) ?? [] };
    }
    if (node['astroImage'] === true) {
        return { kind: 'string', options: [], asset: 'image' };
    }
    if (node['astroDate'] === true) {
        return { kind: 'date', options: [] };
    }
    const choices = (0, record_1.toArray)(node['enum']);
    if (choices !== undefined) {
        return enumType(choices);
    }
    switch (node['type']) {
        case 'string':
            return stringType(name, node);
        case 'number':
        case 'integer':
            return { kind: 'number', options: [] };
        case 'boolean':
            return { kind: 'boolean', options: [] };
        case 'array':
            return arrayType(name, node, context);
        case 'object':
            return objectType(name, node, context);
        default:
            return undefined;
    }
}
function stringType(name, node) {
    switch (node['format']) {
        case 'email':
            return { kind: 'email', options: [] };
        case 'uri':
            return { kind: 'url', options: [] };
        case 'date':
            return { kind: 'date', options: [] };
        case 'date-time':
            return { kind: 'datetime', options: [] };
        default:
            return { kind: LONG_KEYS.test(name) ? 'text' : 'string', options: [] };
    }
}
// Keys whose values are paragraphs rather than a line: a box sized for them.
const LONG_KEYS = /^(description|summary|bio|excerpt|abstract|intro|body|content|answer)$/i;
function enumType(choices) {
    const values = choices.filter(isString);
    // An enum of numbers or mixed values has no string choice that writes it back.
    if (values.length !== choices.length || values.length > cmsRemoteSchema_1.REMOTE_SCHEMA_LIMITS.optionsMax) {
        return undefined;
    }
    return { kind: 'string', options: values.map((value) => ({ title: labelize(value), value })) };
}
function arrayType(name, node, context) {
    const items = (0, record_1.toRecord)(node['items']);
    if (items === undefined) {
        return undefined;
    }
    const member = typeOf(name, unwrapNullable(items).node, { ...context, depth: context.depth + 1 });
    return member === undefined ? undefined : { kind: 'array', of: [member] };
}
function objectType(name, node, context) {
    // A record (`additionalProperties` with no named keys) has no fixed fields to draw.
    if ((0, record_1.toRecord)(node['properties']) === undefined) {
        return undefined;
    }
    const fields = objectFields(node, { ...context, depth: context.depth + 1 });
    return fields.length === 0 ? undefined : { kind: 'object', name, fields };
}
function rulesOf(node, type, presence) {
    const rules = presence.required ? [{ level: 'error', kind: 'required' }] : [];
    const limit = (kind, value) => {
        if (typeof value === 'number' && Number.isFinite(value)) {
            rules.push({ level: 'error', kind, limit: value });
        }
    };
    if (type.kind === 'number') {
        limit('min', node['minimum']);
        limit('max', node['maximum']);
        if (node['type'] === 'integer') {
            rules.push({ level: 'error', kind: 'integer' });
        }
    }
    else if (type.kind === 'array') {
        limit('min', node['minItems']);
        limit('max', node['maxItems']);
    }
    else {
        limit('min', node['minLength']);
        limit('max', node['maxLength']);
    }
    if (type.kind === 'email') {
        rules.push({ level: 'error', kind: 'email' });
    }
    (0, assert_1.assert)(rules.length <= cmsRemoteSchema_1.REMOTE_SCHEMA_LIMITS.rulesMax, 'A field states few rules');
    return rules;
}
// `anyOf [X, null]` is how zod renders `.nullable()`: the field is X, and may be empty.
// zod 4 renders a nullable scalar as `type: ["string", "null"]` instead.
function unwrapNullable(node) {
    const types = (0, record_1.toArray)(node['type']);
    if (types !== undefined) {
        const rest = types.filter((type) => type !== 'null');
        const only = rest[0];
        if (rest.length === 1 && types.length === 2 && typeof only === 'string') {
            return { node: { ...node, type: only }, nullable: true };
        }
        return { node, nullable: false };
    }
    const branches = (0, record_1.toArray)(node['anyOf']) ?? (0, record_1.toArray)(node['oneOf']);
    if (branches === undefined || branches.length !== 2) {
        return { node, nullable: false };
    }
    const records = branches.map(record_1.toRecord);
    const rest = records.filter((branch) => branch !== undefined && branch['type'] !== 'null');
    const only = rest[0];
    if (rest.length !== 1 || only === undefined) {
        return { node, nullable: false };
    }
    return { node: { ...only, default: node['default'] ?? only['default'] }, nullable: true };
}
// A `$ref` into the root's `$defs`, followed once; a recursive type stops at the depth bound.
function dereferenced(node, root) {
    const reference = node['$ref'];
    if (typeof reference !== 'string') {
        return node;
    }
    const name = reference.split('/').pop() ?? '';
    return (0, record_1.toRecord)((0, record_1.toRecord)(root['$defs'])?.[name]);
}
function isString(value) {
    return typeof value === 'string';
}
/** A key as a label: `publishDate` → "Publish date". */
function labelize(key) {
    const words = key
        .replace(/[_-]+/g, ' ')
        .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
        .replace(/\s+/g, ' ')
        .trim()
        .toLowerCase();
    return (words.charAt(0).toUpperCase() + words.slice(1)).slice(0, cmsRemoteSchema_1.REMOTE_SCHEMA_LIMITS.titleCharsMax);
}
