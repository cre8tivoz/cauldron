"use strict";
// A content collection's settings, as the CMS panel edits them: its name, and
// its fields in order, each with the parts of its zod schema a form can change
// — help text (`.describe()`), required or not (`.optional()`), and a minimum
// and maximum (`.min()`, `.max()`: characters for text, the value for numbers).
// They are read from, and written to, the project's content config itself
// (astroSchemaEdit.ts). A field whose schema holds more than that — a union, a
// transform, a message beside a check — is still edited: only the methods for
// the settings that change are rewritten, and the rest stays as written. A new
// field carries its settings, so it is written in one change.
Object.defineProperty(exports, "__esModule", { value: true });
exports.SETTINGS_FIELD_KINDS = exports.COLLECTION_SETTINGS_LIMITS = void 0;
exports.pointsAtCollection = pointsAtCollection;
exports.newFieldSettings = newFieldSettings;
exports.parseSettingsFieldName = parseSettingsFieldName;
exports.parseSettingsChange = parseSettingsChange;
exports.parseFieldUpdate = parseFieldUpdate;
exports.parseFieldSettings = parseFieldSettings;
exports.parseCollectionSettings = parseCollectionSettings;
exports.parseCollectionRename = parseCollectionRename;
const boundary_1 = require("../core/boundary");
const assert_1 = require("../core/assert");
const fieldChecks_1 = require("./fieldChecks");
exports.COLLECTION_SETTINGS_LIMITS = {
    fieldsMax: 200,
    descriptionCharsMax: 500,
    fieldNameCharsMax: 64,
};
/**
 * The kinds of field a collection's settings know, as a CMS names them. Each is
 * a zod schema in the content config (astroSchemaEdit.ts): text is a string,
 * a link a `.url()` string, an option a `z.enum`, an image `image()`, a
 * reference `reference('collection')`, and their lists `z.array(…)`; a group
 * is a nested `z.object`, key–value pairs a `z.record`, a constant a
 * `z.literal`, and any value `z.unknown()`. Rich text,
 * a phone number and a file are strings too, so once written they read back as
 * plain text.
 */
exports.SETTINGS_FIELD_KINDS = [
    'text',
    'richText',
    'image',
    'multiImage',
    'videoLink',
    'link',
    'email',
    'phone',
    'number',
    'date',
    'switch',
    'color',
    'option',
    'file',
    'reference',
    'multiReference',
    'list',
    'group',
    'keyValue',
    'constant',
    'any',
    'other',
];
/** The kinds that point at another collection, and so name it when added. */
function pointsAtCollection(kind) {
    return kind === 'reference' || kind === 'multiReference';
}
const FIELD_NAME = /^[A-Za-z][A-Za-z0-9_-]{0,63}$/;
const NEW_KINDS = exports.SETTINGS_FIELD_KINDS.filter((kind) => kind !== 'other');
/** A new field's settings until the form says otherwise: optional, with nothing else set. */
function newFieldSettings(kind) {
    return {
        description: undefined,
        required: false,
        // A colour is a string held to a hex pattern (astroSchemaEdit.ts newFieldText).
        checks: kind === 'color' ? { pattern: '^#[0-9a-fA-F]{6}$' } : {},
        options: kind === 'option' ? ['Option 1', 'Option 2'] : undefined,
        defaultValue: undefined,
    };
}
/** A field's name as typed: letters, digits, `-` and `_`, starting with a letter. */
function parseSettingsFieldName(input) {
    const name = (0, boundary_1.text)(input).trim();
    if (name.length === 0) {
        throw new Error('Name the field.');
    }
    if (!FIELD_NAME.test(name)) {
        throw new Error('A field name starts with a letter and holds letters, digits, - and _.');
    }
    (0, assert_1.assert)(name.length <= exports.COLLECTION_SETTINGS_LIMITS.fieldNameCharsMax, 'A field name is short');
    return name;
}
function parseSettingsChange(input) {
    const value = (0, boundary_1.record)(input);
    switch (value['kind']) {
        case 'renameCollection':
            return { kind: 'renameCollection', to: parseCollectionRename(value['to']) };
        case 'reorder':
            return { kind: 'reorder', order: parseOrder(value['order']) };
        case 'renameField': {
            const from = parseSettingsFieldName(value['from']);
            const to = parseSettingsFieldName(value['to']);
            if (from === to) {
                throw new Error('The field already has that name.');
            }
            return { kind: 'renameField', from, to };
        }
        case 'updateField':
            return { kind: 'updateField', update: parseFieldUpdate(value['update']) };
        case 'addField': {
            const fieldKind = parseNewKind(value['fieldKind']);
            const target = value['target'] === undefined ? undefined : (0, boundary_1.text)(value['target']);
            if (pointsAtCollection(fieldKind) && target === undefined) {
                throw new Error('Choose the collection the field refers to.');
            }
            if (target !== undefined && !/^[A-Za-z_][\w.-]{0,127}$/.test(target)) {
                throw new Error('Invalid collection name.');
            }
            return {
                kind: 'addField',
                name: parseSettingsFieldName(value['name']),
                fieldKind,
                target: pointsAtCollection(fieldKind) ? target : undefined,
                settings: parseFieldSettings(value['settings']),
            };
        }
        case 'removeField':
            return { kind: 'removeField', name: parseSettingsFieldName(value['name']) };
        case 'deleteCollection':
            return { kind: 'deleteCollection' };
        default:
            throw new Error('Unknown collection settings change.');
    }
}
function parseFieldUpdate(input) {
    const value = (0, boundary_1.record)(input);
    return { name: parseSettingsFieldName(value['name']), ...parseFieldSettings(input) };
}
function parseFieldSettings(input) {
    const value = (0, boundary_1.record)(input);
    const required = value['required'];
    if (typeof required !== 'boolean') {
        throw new Error('Say whether the field is required.');
    }
    const description = value['description'] === undefined ? undefined : (0, boundary_1.text)(value['description']);
    if (description !== undefined && description.length > exports.COLLECTION_SETTINGS_LIMITS.descriptionCharsMax) {
        throw new Error('Help text is at most 500 characters.');
    }
    return {
        description: description === undefined || description.trim() === '' ? undefined : description,
        required,
        checks: (0, fieldChecks_1.parseFieldChecks)(value['checks']),
        options: (0, fieldChecks_1.parseFieldOptions)(value['options']),
        defaultValue: (0, fieldChecks_1.parseFieldDefault)(value['defaultValue']),
    };
}
function parseCollectionSettings(input) {
    const value = (0, boundary_1.record)(input);
    const fields = value['fields'];
    if (!Array.isArray(fields) || fields.length > exports.COLLECTION_SETTINGS_LIMITS.fieldsMax) {
        throw new Error('Expected the collection’s fields.');
    }
    const items = fields;
    const parsed = items.map(parseSettingsField);
    (0, assert_1.assert)(parsed.length <= exports.COLLECTION_SETTINGS_LIMITS.fieldsMax, 'A collection has bounded fields');
    return {
        name: parseAstroCollectionNameOrStored(value['name']),
        source: value['source'] === undefined ? undefined : (0, boundary_1.text)(value['source']).slice(0, 1024),
        fields: parsed,
    };
}
function parseSettingsField(input) {
    const value = (0, boundary_1.record)(input);
    const kind = exports.SETTINGS_FIELD_KINDS.find((candidate) => candidate === value['kind']);
    if (kind === undefined) {
        throw new Error('Unknown field kind.');
    }
    const required = value['required'];
    const editable = value['editable'];
    if (typeof required !== 'boolean' || typeof editable !== 'boolean') {
        throw new Error('Expected a field’s settings.');
    }
    const description = value['description'] === undefined ? undefined : (0, boundary_1.text)(value['description']);
    return {
        name: parseSettingsFieldName(value['name']),
        kind,
        description: description?.slice(0, exports.COLLECTION_SETTINGS_LIMITS.descriptionCharsMax),
        required,
        checks: (0, fieldChecks_1.parseFieldChecks)(value['checks']),
        options: (0, fieldChecks_1.parseFieldOptions)(value['options']),
        defaultValue: (0, fieldChecks_1.parseFieldDefault)(value['defaultValue']),
        editable,
        target: optionalCollection(value['target']),
    };
}
// A collection's stored name: a name the panel already lists (`dream-team-areas`), which a
// typed name is turned into an identifier for, but a stored one is taken as it is.
function parseAstroCollectionNameOrStored(input) {
    const name = (0, boundary_1.text)(input);
    if (!/^[A-Za-z_][\w.-]{0,127}$/.test(name)) {
        throw new Error('Invalid collection name.');
    }
    return name;
}
/**
 * A collection's new name as typed: kept as written when it is already a name
 * (`team`, `staffMembers`, `staff-members`); otherwise its words joined with
 * dashes in lowercase, as the content folders and data files are named.
 */
function parseCollectionRename(input) {
    const typed = (0, boundary_1.text)(input).trim();
    const name = /^[A-Za-z][A-Za-z0-9_-]{0,63}$/.test(typed)
        ? typed
        : typed
            .toLowerCase()
            .split(/[^a-z0-9]+/)
            .filter((word) => word.length > 0)
            .join('-');
    if (!/^[A-Za-z][A-Za-z0-9_-]{0,63}$/.test(name)) {
        throw new Error('A collection name starts with a letter and holds letters, digits, - and _.');
    }
    (0, assert_1.assert)(name.length <= 64, 'A collection name is short');
    return name;
}
function parseOrder(input) {
    if (!Array.isArray(input) || input.length > exports.COLLECTION_SETTINGS_LIMITS.fieldsMax) {
        throw new Error('Expected the fields in their new order.');
    }
    const items = input;
    const order = items.map(parseSettingsFieldName);
    if (new Set(order).size !== order.length) {
        throw new Error('A field is named twice.');
    }
    (0, assert_1.assert)(order.length <= exports.COLLECTION_SETTINGS_LIMITS.fieldsMax, 'An order is bounded');
    return order;
}
function parseNewKind(input) {
    const kind = NEW_KINDS.find((candidate) => candidate === input);
    if (kind === undefined) {
        throw new Error('Choose what kind of field to add.');
    }
    return kind;
}
function optionalCollection(input) {
    if (input === undefined) {
        return undefined;
    }
    const name = (0, boundary_1.text)(input);
    if (!/^[A-Za-z_][\w.-]{0,127}$/.test(name)) {
        throw new Error('Invalid collection name.');
    }
    return name;
}
