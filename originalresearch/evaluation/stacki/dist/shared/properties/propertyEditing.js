"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PROPERTY_LIMITS = void 0;
exports.propertyText = propertyText;
exports.propertySource = propertySource;
exports.propertyName = propertyName;
exports.parseComponentProperty = parseComponentProperty;
exports.propertyList = propertyList;
exports.parsePropertyChange = parsePropertyChange;
exports.parseComponentProperties = parseComponentProperties;
exports.parsePropertiesResult = parsePropertiesResult;
// Source text is the revision token: edits cannot overwrite a newer disk revision.
const boundary_1 = require("../core/boundary");
const limits_1 = require("../core/limits");
const record_1 = require("../core/record");
exports.PROPERTY_LIMITS = {
    fieldsMax: limits_1.LIMITS.propSchemaFieldsMax,
    sourceCharsMax: 2 * 1024 * 1024,
    textCharsMax: 32768,
    nameCharsMax: 128,
    filesMax: 10000,
    totalCharsMax: 32 * 1024 * 1024,
    nodesMax: 200000,
};
function propertyText(input) {
    const value = (0, boundary_1.text)(input);
    if (value.length > exports.PROPERTY_LIMITS.textCharsMax) {
        throw new Error('Property text exceeds limit');
    }
    return value;
}
function propertySource(input) {
    const value = (0, boundary_1.text)(input);
    if (value.length > exports.PROPERTY_LIMITS.sourceCharsMax) {
        throw new Error('Component source exceeds limit');
    }
    return value;
}
function propertyName(input) {
    const value = propertyText(input);
    if (value.length > exports.PROPERTY_LIMITS.nameCharsMax) {
        throw new Error('Property name exceeds limit');
    }
    if (!/^[A-Za-z_$][\w$]*$/.test(value)) {
        throw new Error('Use a TypeScript identifier for the property name');
    }
    return value;
}
function parseComponentProperty(input) {
    return (0, boundary_1.object)({
        name: propertyLabel,
        type: propertyText,
        required: boundary_1.boolean,
        readonly: boundary_1.boolean,
        defaultValue: propertyText,
        description: propertyText,
        origin: (0, boundary_1.optional)(parsePropertyOrigin),
        editing: (0, boundary_1.optional)(parsePropertyEditing),
        conditions: (0, boundary_1.optional)((value) => propertyList(value, propertyText)),
    })(input);
}
function parsePropertyEditing(input) {
    const value = (0, record_1.toRecord)(input);
    if (value?.['kind'] === 'editable') {
        return { kind: 'editable' };
    }
    if (value?.['kind'] === 'override' || value?.['kind'] === 'restricted') {
        const reason = propertyText(value['reason']);
        if (reason.trim()) {
            return { kind: value['kind'], reason };
        }
    }
    throw new Error('Invalid property editing permission');
}
function parsePropertyOrigin(input) {
    return (0, boundary_1.object)({
        declarations: (value) => propertyList(value, parsePropertySource),
        defaultValue: (0, boundary_1.optional)(parsePropertySource),
    })(input);
}
function parsePropertySource(input) {
    const source = (0, boundary_1.object)({
        label: propertyText,
        expression: propertyText,
        line: boundary_1.count,
    })(input);
    if (!source.label.trim()) {
        throw new Error('Property source label must be nonempty');
    }
    if (source.line < 1 || source.line > exports.PROPERTY_LIMITS.sourceCharsMax) {
        throw new Error('Property source line is out of bounds');
    }
    return source;
}
function propertyList(input, parse) {
    const values = (0, boundary_1.list)(parse)(input);
    if (values.length > exports.PROPERTY_LIMITS.fieldsMax) {
        throw new Error('Too many component properties');
    }
    return values;
}
function parsePropertyChange(input) {
    const value = (0, record_1.toRecord)(input);
    switch (value?.['kind']) {
        case 'save': {
            const saved = {
                kind: 'save',
                ...(0, boundary_1.object)({
                    originalName: propertyText,
                    property: parseEditableProperty,
                })(input),
            };
            const optionRenames = (0, boundary_1.optional)((item) => propertyList(item, parsePropertyOptionRename))(value['optionRenames']);
            return optionRenames === undefined ? saved : { ...saved, optionRenames };
        }
        case 'remove':
            return { kind: 'remove', name: propertyName(value['name']) };
        case 'order':
            return {
                kind: 'order',
                names: propertyList(value['names'], propertyName),
            };
        case 'options':
            return {
                kind: 'options',
                name: propertyName(value['name']),
                type: propertyText(value['type']),
            };
        case 'source':
            return {
                kind: 'source',
                frontmatter: propertySource(value['frontmatter']),
            };
        default:
            throw new Error('Unknown component property change');
    }
}
function parsePropertyOptionRename(input) {
    const rename = (0, boundary_1.object)({ from: propertyText, to: propertyText })(input);
    if (!rename.from.trim() || !rename.to.trim()) {
        throw new Error('Property option rename values must be nonempty');
    }
    if (rename.from === rename.to) {
        throw new Error('Property option rename must change the value');
    }
    return rename;
}
function parseComponentProperties(input) {
    return (0, boundary_1.object)({
        source: propertySource,
        frontmatter: propertySource,
        advanced: boundary_1.boolean,
        properties: (value) => propertyList(value, parseComponentProperty),
    })(input);
}
function parsePropertiesResult(input, parse) {
    const value = (0, record_1.toRecord)(input);
    if (value?.['ok'] === true) {
        return { ok: true, value: parse(value['value']) };
    }
    if (value?.['ok'] === false) {
        return {
            ok: false,
            error: (0, boundary_1.object)({ code: propertyText, message: propertyText })(value['error']),
        };
    }
    throw new Error('Invalid component properties result');
}
function propertyLabel(input) {
    const value = propertyText(input);
    if (value.length === 0 || value.length > exports.PROPERTY_LIMITS.nameCharsMax) {
        throw new Error('Property name must be nonempty and within the name limit');
    }
    return value;
}
function parseEditableProperty(input) {
    const property = parseComponentProperty(input);
    return { ...property, name: propertyName(property.name) };
}
