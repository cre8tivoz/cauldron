"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PROP_FIELD_USAGES = exports.CODE_KINDS = void 0;
exports.parseField = parseField;
exports.parsePropSchema = parsePropSchema;
// Component schemas travel as arrays over IPC and as Maps in local symbol reads.
// Parse the metadata the props panel consumes, including branch-specific defaults,
// rather than carrying unknown shapes into control and visibility decisions.
const assert_1 = require("../core/assert");
const limits_1 = require("../core/limits");
const record_1 = require("../core/record");
const boundary_1 = require("../core/boundary");
// What a value only code can give is (see propModelSchema.ts schemaTypeOf): an object,
// a function (an action) or a type no field can fill in (`any`, a promise).
exports.CODE_KINDS = ['object', 'function', 'opaque'];
/** Whether a component reads a prop, as the prop model states it (propModel.ts PROP_USAGES). */
exports.PROP_FIELD_USAGES = ['read', 'unread', 'unknown'];
function parseField(input, where) {
    const value = schemaRecord(input, where);
    const name = schemaText(value['name'], `${where}.name`);
    if (!name.length) {
        fail(where, 'name: expected non-empty string');
    }
    const field = {
        name,
        type: schemaText(value['type'], `${where}.type`),
        optional: schemaBoolean(value['optional'], `${where}.optional`),
        ...schemaOptionalMetadata(value, where),
        ...(0, boundary_1.definedFields)({
            options: schemaOptional(value, 'options', where, (input, at) => schemaStrings(input, at, limits_1.LIMITS.propOptionsMax)),
            expressionOptions: schemaOptional(value, 'expressionOptions', where, (input, at) => schemaStrings(input, at, limits_1.LIMITS.propOptionsMax)),
            codeKind: schemaOptional(value, 'codeKind', where, schemaCodeKind),
            usage: schemaOptional(value, 'usage', where, schemaUsage),
            shape: schemaOptional(value, 'shape', where, schemaShape),
            unions: schemaOptional(value, 'unions', where, (input, at) => schemaArray(input, at, limits_1.LIMITS.propOptionsMax).map((union) => schemaUnion(union, at))),
        }),
    };
    // An explicit undefined default is part of the existing in-process protocol.
    return 'default' in value
        ? {
            ...field,
            default: value['default'] === undefined ? undefined : schemaDefault(value['default'], `${where}.default`),
        }
        : field;
}
function parsePropSchema(input) {
    if (!(input instanceof Map)) {
        fail('root', 'expected Map');
    }
    if (input.size > limits_1.LIMITS.propSchemaFieldsMax) {
        fail('root', `exceeds ${limits_1.LIMITS.propSchemaFieldsMax} fields`);
    }
    const entries = input;
    const out = new Map();
    for (const [key, value] of entries) {
        if (typeof key !== 'string') {
            fail('root', 'expected string keys');
        }
        const field = parseField(value, key);
        if (field.name !== key) {
            fail(key, `field name ${JSON.stringify(field.name)} does not match its key`);
        }
        out.set(key, field);
    }
    (0, assert_1.assert)(out.size === entries.size, 'parsePropSchema: every key becomes one field');
    return out;
}
function fail(where, what) {
    throw new Error(`PropSchema.${where}: ${what}`);
}
function schemaRecord(input, where) {
    const value = (0, record_1.toRecord)(input);
    if (!value) {
        fail(where, 'expected object');
    }
    if (Object.keys(value).length > limits_1.LIMITS.propSchemaFieldsMax) {
        fail(where, 'too many fields');
    }
    return value;
}
function schemaText(input, where) {
    if (typeof input !== 'string') {
        if (where.endsWith('.name')) {
            fail(where, 'expected non-empty string');
        }
        fail(where, 'expected string');
    }
    if (input.length > limits_1.LIMITS.attrCharsMax) {
        fail(where, 'string exceeds limit');
    }
    return input;
}
function schemaBoolean(input, where) {
    if (typeof input !== 'boolean') {
        fail(where, 'expected boolean');
    }
    return input;
}
function schemaNumber(input, where) {
    if (typeof input !== 'number') {
        fail(where, 'expected number');
    }
    if (!Number.isFinite(input)) {
        fail(where, 'expected finite number');
    }
    return input;
}
function schemaDefault(input, where) {
    if (typeof input === 'string') {
        return schemaText(input, where);
    }
    if (typeof input === 'boolean') {
        return input;
    }
    return schemaNumber(input, where);
}
function schemaArray(input, where, maximum) {
    const value = (0, record_1.toArray)(input);
    if (!value) {
        fail(where, 'expected array');
    }
    if (value.length > maximum) {
        if (where.endsWith('.options')) {
            fail(where, `options exceed ${maximum}`);
        }
        fail(where, `array exceeds ${maximum}`);
    }
    return value;
}
function schemaStrings(input, where, maximum) {
    const values = schemaArray(input, where, maximum);
    if (values.some((value) => typeof value !== 'string')) {
        fail(where, 'expected string array');
    }
    const strings = values.map((value) => schemaText(value, where));
    (0, assert_1.assert)(strings.length === values.length, 'schemaStrings: every value is kept');
    return strings;
}
// Undefined metadata is omitted because absence has meaning to the field renderer.
function schemaOptional(record, key, where, parse) {
    return record[key] === undefined ? undefined : parse(record[key], `${where}.${key}`);
}
function schemaOptionalMetadata(value, where) {
    return (0, boundary_1.definedFields)({
        numeric: schemaOptional(value, 'numeric', where, schemaBoolean),
        defaultExpr: schemaOptional(value, 'defaultExpr', where, schemaBoolean),
        shapeIsList: schemaOptional(value, 'shapeIsList', where, schemaBoolean),
        minExclusive: schemaOptional(value, 'minExclusive', where, schemaBoolean),
        maxExclusive: schemaOptional(value, 'maxExclusive', where, schemaBoolean),
        min: schemaOptional(value, 'min', where, schemaNumber),
        max: schemaOptional(value, 'max', where, schemaNumber),
        step: schemaOptional(value, 'step', where, schemaNumber),
        doc: schemaOptional(value, 'doc', where, schemaText),
        defaultAsset: schemaOptional(value, 'defaultAsset', where, schemaText),
        hint: schemaOptional(value, 'hint', where, schemaText),
        typeText: schemaOptional(value, 'typeText', where, schemaText),
        deprecated: schemaOptional(value, 'deprecated', where, schemaText),
    });
}
function schemaCodeKind(input, where) {
    const kind = exports.CODE_KINDS.find((candidate) => candidate === input);
    if (kind === undefined) {
        fail(where, `expected one of ${exports.CODE_KINDS.join(', ')}`);
    }
    return kind;
}
function schemaUsage(input, where) {
    const usage = exports.PROP_FIELD_USAGES.find((candidate) => candidate === input);
    if (usage === undefined) {
        fail(where, `expected one of ${exports.PROP_FIELD_USAGES.join(', ')}`);
    }
    return usage;
}
function schemaShape(input, where) {
    return schemaArray(input, where, limits_1.LIMITS.propSchemaFieldsMax).map((item) => {
        const value = schemaRecord(item, where);
        return {
            name: schemaText(value['name'], `${where}.name`),
            type: schemaText(value['type'], `${where}.type`),
        };
    });
}
function schemaDictionary(input, where, parse) {
    const record = schemaRecord(input === undefined ? {} : input, where);
    return Object.fromEntries(Object.entries(record).map(([key, value]) => [schemaText(key, where), parse(value, `${where}.${key}`)]));
}
function schemaUnion(input, where) {
    const value = schemaRecord(input, where);
    return {
        names: schemaStrings(value['names'], `${where}.names`, limits_1.LIMITS.propSchemaFieldsMax),
        branches: schemaArray(value['branches'], `${where}.branches`, limits_1.LIMITS.propOptionsMax).map((branch) => schemaBranch(branch, where)),
    };
}
function schemaBranch(input, where) {
    const value = schemaRecord(input, where);
    return {
        forbids: schemaStrings(value['forbids'], `${where}.forbids`, limits_1.LIMITS.propSchemaFieldsMax),
        pins: schemaDictionary(value['pins'], `${where}.pins`, (input, at) => schemaStrings(input, at, limits_1.LIMITS.propOptionsMax)),
        defaults: schemaDictionary(value['defaults'], `${where}.defaults`, (input, at) => typeof input === 'string' ? schemaText(input, at) : schemaNumber(input, at)),
        rules: schemaDictionary(value['rules'], `${where}.rules`, schemaRule),
        docs: schemaDictionary(value['docs'], `${where}.docs`, schemaText),
    };
}
function schemaRule(input, where) {
    const value = schemaRecord(input, where);
    return {
        prop: schemaText(value['prop'], `${where}.prop`),
        is: schemaText(value['is'], `${where}.is`),
        then: schemaText(value['then'], `${where}.then`),
        otherwise: schemaText(value['otherwise'], `${where}.otherwise`),
    };
}
