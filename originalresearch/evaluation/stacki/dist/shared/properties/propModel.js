"use strict";
// One cross-process description of a component's props
// (docs/plans/prop-controls.md §2). The main process builds it once from the
// component's source with the TypeScript compiler (electron/properties/propModel/),
// and every panel derives what it shows from it through an adapter
// (propModelSchema.ts), so the instance Settings panel, the Properties panel
// and the bind-dot reader cannot disagree about what a prop is.
//
// A prop's control is a discriminated union (AGENTS.md §1): data exists only
// on the kinds that have it. Phase 1 builds the kinds the panels already draw;
// later phases add kinds to the union, and the compiler then names every
// switch that has to handle them.
//
// parsePropModel is the boundary parser: the producer runs its own output
// through it before handing it on (the pair of a producer-side and a
// consumer-side check, AGENTS.md §9), and anything that receives a model from
// elsewhere parses it the same way.
Object.defineProperty(exports, "__esModule", { value: true });
exports.PROPS_DECLARATIONS = exports.PROP_USAGES = exports.PROP_CONTROL_KINDS = exports.CODE_REASONS = exports.PROP_MODEL_LIMITS = void 0;
exports.parsePropModel = parsePropModel;
const assert_1 = require("../core/assert");
const limits_1 = require("../core/limits");
const record_1 = require("../core/record");
const propTags_1 = require("./propTags");
const propSchema_1 = require("./propSchema");
// Bounds of a prop model. They live here, next to the parser that enforces
// them (AGENTS.md §5); `propNestingDepthMax` and `propVariantsMax` were
// requested for shared/core/limits.ts (plan D14) and may move there once a
// human approves the change to that gate file.
exports.PROP_MODEL_LIMITS = {
    // How deep groups and lists of groups nest: `items: { cta: { link: {…} } }[]` is three.
    propNestingDepthMax: 4,
    // Branches of one union of prop shapes; past this the union is not modelled.
    propVariantsMax: 32,
    propsMax: limits_1.LIMITS.propSchemaFieldsMax,
    optionsMax: limits_1.LIMITS.propOptionsMax,
    // Union tables one component declares (each `A | B` of shapes is one).
    unionsMax: 64,
    // Type text as written; longer types are cut by the producer.
    typeTextCharsMax: limits_1.LIMITS.attrCharsMax,
    textCharsMax: limits_1.LIMITS.attrCharsMax,
    docCharsMax: propTags_1.PROP_TAG_LIMITS.docCharsMax,
};
/** Why a prop's value can only be given in code. */
exports.CODE_REASONS = ['untyped', 'unrecognized', 'opaque', 'tuple', 'nestingDepth'];
exports.PROP_CONTROL_KINDS = [
    'text',
    'number',
    'switch',
    'choice',
    'attributes',
    'list',
    'group',
    'callback',
    'code',
];
/** Whether the component reads the prop: `unknown` when the props object escapes whole. */
exports.PROP_USAGES = propSchema_1.PROP_FIELD_USAGES;
/** How a component types its props. */
exports.PROPS_DECLARATIONS = ['interface', 'type', 'annotation', 'assertion', 'none'];
/** A component's prop model, parsed: every bound and every variant checked. */
function parsePropModel(input) {
    const value = modelRecord(input, 'root');
    const props = modelArray(value['props'], 'props', exports.PROP_MODEL_LIMITS.propsMax).map((prop, index) => parseProp(prop, `props[${index}]`));
    const names = new Set(props.map((prop) => prop.name));
    if (names.size !== props.length) {
        fail('props', 'prop names must be unique');
    }
    const unions = modelArray(value['unions'], 'unions', exports.PROP_MODEL_LIMITS.unionsMax).map((union, index) => parseUnion(union, `unions[${index}]`));
    const model = { declaration: oneOf(value['declaration'], 'declaration', exports.PROPS_DECLARATIONS), props, unions };
    (0, assert_1.assert)(model.props.length <= exports.PROP_MODEL_LIMITS.propsMax, 'parsePropModel: props are bounded');
    return model;
}
function parseProp(input, where) {
    const value = modelRecord(input, where);
    const member = parseMember(value, where, 0);
    return {
        ...member,
        declared: modelBoolean(value['declared'], `${where}.declared`),
        nullable: modelBoolean(value['nullable'], `${where}.nullable`),
        fallback: parseFallback(value['fallback'], `${where}.fallback`),
        documentation: modelText(value['documentation'], `${where}.documentation`, exports.PROP_MODEL_LIMITS.docCharsMax),
        tooltip: modelText(value['tooltip'], `${where}.tooltip`, exports.PROP_MODEL_LIMITS.docCharsMax),
        group: optionalText(value['group'], `${where}.group`),
        deprecated: optionalText(value['deprecated'], `${where}.deprecated`),
        format: optionalText(value['format'], `${where}.format`),
        recognition: parseRecognition(value['recognition'], `${where}.recognition`),
        usage: oneOf(value['usage'], `${where}.usage`, exports.PROP_USAGES),
    };
}
function parseMember(value, where, depth) {
    const name = modelText(value['name'], `${where}.name`, exports.PROP_MODEL_LIMITS.textCharsMax);
    if (name.length === 0) {
        fail(`${where}.name`, 'expected non-empty string');
    }
    return {
        name,
        typeText: modelText(value['typeText'], `${where}.typeText`, exports.PROP_MODEL_LIMITS.typeTextCharsMax),
        control: parseControl(value['control'], `${where}.control`, depth),
        presence: oneOf(value['presence'], `${where}.presence`, ['required', 'optional']),
    };
}
// Groups and lists nest; `depth` counts the groups above this control, and a
// model nested deeper than the bound is refused rather than walked.
function parseControl(input, where, depth) {
    if (depth > exports.PROP_MODEL_LIMITS.propNestingDepthMax) {
        fail(where, `nesting exceeds ${exports.PROP_MODEL_LIMITS.propNestingDepthMax}`);
    }
    const value = modelRecord(input, where);
    const kind = oneOf(value['kind'], `${where}.kind`, exports.PROP_CONTROL_KINDS);
    switch (kind) {
        case 'text':
            return { kind };
        case 'number':
            return parseNumberControl(value, where);
        case 'switch':
            return { kind, onLabel: optionalText(value['onLabel'], `${where}.onLabel`), offLabel: optionalText(value['offLabel'], `${where}.offLabel`) };
        case 'choice': {
            const options = modelArray(value['options'], `${where}.options`, exports.PROP_MODEL_LIMITS.optionsMax).map((option, index) => parseOption(option, `${where}.options[${index}]`));
            if (options.length < 2) {
                fail(`${where}.options`, 'a choice has at least two options');
            }
            if (new Set(options.map((option) => option.value)).size !== options.length) {
                fail(`${where}.options`, 'options must be unique');
            }
            return { kind, options, numeric: modelBoolean(value['numeric'], `${where}.numeric`) };
        }
        case 'attributes':
            return { kind, tag: optionalText(value['tag'], `${where}.tag`) };
        case 'list':
            return { kind, item: parseControl(value['item'], `${where}.item`, depth + 1) };
        case 'group': {
            const fields = modelArray(value['fields'], `${where}.fields`, exports.PROP_MODEL_LIMITS.propsMax).map((field, index) => parseMember(modelRecord(field, `${where}.fields[${index}]`), `${where}.fields[${index}]`, depth + 1));
            if (new Set(fields.map((field) => field.name)).size !== fields.length) {
                fail(`${where}.fields`, 'field names must be unique');
            }
            return { kind, fields };
        }
        case 'callback':
            return { kind, signature: modelText(value['signature'], `${where}.signature`, exports.PROP_MODEL_LIMITS.typeTextCharsMax) };
        case 'code':
            return { kind, reason: oneOf(value['reason'], `${where}.reason`, exports.CODE_REASONS) };
        default: {
            const exhaustive = kind;
            return exhaustive;
        }
    }
}
function parseNumberControl(value, where) {
    const min = optionalNumber(value['min'], `${where}.min`);
    const max = optionalNumber(value['max'], `${where}.max`);
    if (min !== undefined && max !== undefined && max < min) {
        fail(where, 'max is below min');
    }
    const step = optionalNumber(value['step'], `${where}.step`);
    if (step !== undefined && step <= 0) {
        fail(`${where}.step`, 'expected a positive step');
    }
    const decimals = optionalNumber(value['decimals'], `${where}.decimals`);
    if (decimals !== undefined && (!Number.isSafeInteger(decimals) || decimals < 0 || decimals > propTags_1.PROP_TAG_LIMITS.decimalsMax)) {
        fail(`${where}.decimals`, `expected a whole number from 0 to ${propTags_1.PROP_TAG_LIMITS.decimalsMax}`);
    }
    return {
        kind: 'number',
        min,
        max,
        minExclusive: modelBoolean(value['minExclusive'], `${where}.minExclusive`),
        maxExclusive: modelBoolean(value['maxExclusive'], `${where}.maxExclusive`),
        step,
        decimals,
    };
}
function parseOption(input, where) {
    const value = modelRecord(input, where);
    return {
        value: modelText(value['value'], `${where}.value`, exports.PROP_MODEL_LIMITS.textCharsMax),
        written: oneOf(value['written'], `${where}.written`, ['string', 'expression']),
    };
}
function parseFallback(input, where) {
    const value = modelRecord(input, where);
    const kind = oneOf(value['kind'], `${where}.kind`, ['none', 'literal', 'expression', 'hint']);
    switch (kind) {
        case 'none':
            return { kind };
        case 'literal':
            return {
                kind,
                value: parseDefault(value['value'], `${where}.value`),
                source: oneOf(value['source'], `${where}.source`, ['destructure', 'nullish', 'doc']),
            };
        case 'expression': {
            const code = modelText(value['code'], `${where}.code`, exports.PROP_MODEL_LIMITS.textCharsMax);
            if (code.trim() === '') {
                fail(`${where}.code`, 'expected an expression');
            }
            return { kind, code };
        }
        case 'hint': {
            const hint = modelText(value['hint'], `${where}.hint`, exports.PROP_MODEL_LIMITS.textCharsMax);
            if (hint.trim() === '') {
                fail(`${where}.hint`, 'expected a hint');
            }
            return { kind, hint };
        }
        default: {
            const exhaustive = kind;
            return exhaustive;
        }
    }
}
function parseRecognition(input, where) {
    const value = modelRecord(input, where);
    const source = oneOf(value['source'], `${where}.source`, ['type', 'usage', 'name', 'tag', 'fallback']);
    switch (source) {
        case 'type':
        case 'fallback':
            return { source };
        case 'usage':
        case 'name':
            return { source, evidence: modelText(value['evidence'], `${where}.evidence`, exports.PROP_MODEL_LIMITS.textCharsMax) };
        case 'tag':
            return { source, tag: modelText(value['tag'], `${where}.tag`, exports.PROP_MODEL_LIMITS.textCharsMax) };
        default: {
            const exhaustive = source;
            return exhaustive;
        }
    }
}
function parseUnion(input, where) {
    const value = modelRecord(input, where);
    const branches = modelArray(value['branches'], `${where}.branches`, exports.PROP_MODEL_LIMITS.propVariantsMax).map((branch, index) => parseBranch(branch, `${where}.branches[${index}]`));
    if (branches.length < 2) {
        fail(`${where}.branches`, 'a union has at least two branches');
    }
    return { names: modelStrings(value['names'], `${where}.names`, exports.PROP_MODEL_LIMITS.propsMax), branches };
}
function parseBranch(input, where) {
    const value = modelRecord(input, where);
    return {
        forbids: modelStrings(value['forbids'], `${where}.forbids`, exports.PROP_MODEL_LIMITS.propsMax),
        pins: modelDictionary(value['pins'], `${where}.pins`, (item, at) => modelStrings(item, at, exports.PROP_MODEL_LIMITS.optionsMax)),
        defaults: modelDictionary(value['defaults'], `${where}.defaults`, (item, at) => {
            if (typeof item === 'number') {
                return finite(item, at);
            }
            return modelText(item, at, exports.PROP_MODEL_LIMITS.textCharsMax);
        }),
        rules: modelDictionary(value['rules'], `${where}.rules`, parseRule),
        docs: modelDictionary(value['docs'], `${where}.docs`, (item, at) => modelText(item, at, exports.PROP_MODEL_LIMITS.docCharsMax)),
    };
}
function parseRule(input, where) {
    const value = modelRecord(input, where);
    return {
        prop: modelText(value['prop'], `${where}.prop`, exports.PROP_MODEL_LIMITS.textCharsMax),
        is: modelText(value['is'], `${where}.is`, exports.PROP_MODEL_LIMITS.textCharsMax),
        then: modelText(value['then'], `${where}.then`, exports.PROP_MODEL_LIMITS.textCharsMax),
        otherwise: modelText(value['otherwise'], `${where}.otherwise`, exports.PROP_MODEL_LIMITS.textCharsMax),
    };
}
function parseDefault(input, where) {
    if (typeof input === 'string') {
        return modelText(input, where, exports.PROP_MODEL_LIMITS.textCharsMax);
    }
    if (typeof input === 'boolean') {
        return input;
    }
    if (typeof input === 'number') {
        return finite(input, where);
    }
    fail(where, 'expected string, number or boolean');
}
function fail(where, what) {
    throw new Error(`PropModel.${where}: ${what}`);
}
function modelRecord(input, where) {
    const value = (0, record_1.toRecord)(input);
    if (value === undefined) {
        fail(where, 'expected object');
    }
    return value;
}
function modelArray(input, where, maximum) {
    const value = (0, record_1.toArray)(input);
    if (value === undefined) {
        fail(where, 'expected array');
    }
    if (value.length > maximum) {
        fail(where, `exceeds ${maximum} entries`);
    }
    return value;
}
function modelStrings(input, where, maximum) {
    return modelArray(input, where, maximum).map((item, index) => modelText(item, `${where}[${index}]`, exports.PROP_MODEL_LIMITS.textCharsMax));
}
function modelText(input, where, maximum) {
    if (typeof input !== 'string') {
        fail(where, 'expected string');
    }
    if (input.length > maximum) {
        fail(where, `exceeds ${maximum} characters`);
    }
    return input;
}
function optionalText(input, where) {
    return input === undefined ? undefined : modelText(input, where, exports.PROP_MODEL_LIMITS.textCharsMax);
}
function modelBoolean(input, where) {
    if (typeof input !== 'boolean') {
        fail(where, 'expected boolean');
    }
    return input;
}
function finite(input, where) {
    if (!Number.isFinite(input)) {
        fail(where, 'expected finite number');
    }
    return input;
}
function optionalNumber(input, where) {
    if (input === undefined) {
        return undefined;
    }
    if (typeof input !== 'number') {
        fail(where, 'expected number');
    }
    return finite(input, where);
}
function oneOf(input, where, values) {
    const found = values.find((value) => value === input);
    if (found === undefined) {
        fail(where, `expected one of ${values.join(', ')}`);
    }
    return found;
}
function modelDictionary(input, where, parse) {
    const record = modelRecord(input, where);
    const entries = Object.entries(record);
    if (entries.length > exports.PROP_MODEL_LIMITS.propsMax) {
        fail(where, `exceeds ${exports.PROP_MODEL_LIMITS.propsMax} entries`);
    }
    return Object.fromEntries(entries.map(([key, item]) => [key, parse(item, `${where}.${key}`)]));
}
