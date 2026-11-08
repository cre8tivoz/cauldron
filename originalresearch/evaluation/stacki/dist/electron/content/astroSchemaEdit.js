"use strict";
// A content collection's schema, read from and written back to the project's
// content config as text. The config is parsed with TypeScript (no code runs),
// the collection found by its key in `export const collections = { … }`
// (written inline, by name, or as shorthand), and its `z.object({ … })` read
// field by field. A change rewrites only the spans it touches — a key, one
// field's chain, the object's property list — so the rest of the file comes
// back as it was written.
//
// A field's chain is understood as a base type (`z.string()`, `image()`,
// `reference('team')`, `z.array(…)`) followed by methods. The settings own
// the checks, `.describe()` and optionality (`.optional()`, `.nullish()`,
// `.default()`); writing them changes only the methods for the settings that
// changed (astroSchemaChecks.ts), so other validators (`.email()`), a
// transform or refinement, and a base kept in a constant stay as written.
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.readCollectionSchema = readCollectionSchema;
exports.editCollectionSchema = editCollectionSchema;
exports.settledFieldText = settledFieldText;
exports.newFieldText = newFieldText;
const typescript_1 = __importDefault(require("typescript"));
const assert_1 = require("../../shared/core/assert");
const astroSchemaChecks_1 = require("./astroSchemaChecks");
const astroSchemaSyntax_1 = require("./astroSchemaSyntax");
const collectionSettings_1 = require("../../shared/properties/collectionSettings");
function readCollectionSchema(source, collection) {
    const located = (0, astroSchemaSyntax_1.locate)(source, collection);
    if (!located.ok) {
        return located;
    }
    const { object, call, file } = located.value;
    const fields = object === undefined ? [] : object.properties.flatMap((property) => fieldOf(property, file));
    return { ok: true, value: { fields, source: loaderSource(call, file) } };
}
/** The config with `change` made to `collection`'s schema, or why it cannot be. */
function editCollectionSchema(source, collection, change) {
    const located = (0, astroSchemaSyntax_1.locate)(source, collection);
    if (!located.ok) {
        return located;
    }
    if (change.kind === 'renameCollection') {
        return renameCollection(source, located.value, { from: collection, to: change.to });
    }
    if (change.kind === 'deleteCollection') {
        return deleteCollection(source, collection);
    }
    const { object } = located.value;
    if (object === undefined) {
        return {
            ok: false,
            error: `${collection} has no z.object({ … }) schema in the config to edit.`,
        };
    }
    const edits = fieldEdits(located.value, object, change);
    if (!edits.ok) {
        return edits;
    }
    return { ok: true, value: { text: (0, astroSchemaSyntax_1.applyEdits)(source, edits.value), move: undefined } };
}
function fieldEdits(located, object, change) {
    const { file } = located;
    const named = (name) => object.properties.find((property) => (0, astroSchemaSyntax_1.propertyName)(property) === name);
    switch (change.kind) {
        case 'reorder':
            return reorderFields(object, file, change.order);
        case 'renameField': {
            const property = named(change.from);
            if (property === undefined || property.name === undefined) {
                return { ok: false, error: `There is no field ${change.from}.` };
            }
            if (named(change.to) !== undefined) {
                return { ok: false, error: `A field named ${change.to} already exists.` };
            }
            const key = (0, astroSchemaSyntax_1.keyText)(change.to, { quoted: typescript_1.default.isStringLiteral(property.name) });
            // A shorthand field names its schema's constant: that name stays as its value.
            const text = typescript_1.default.isShorthandPropertyAssignment(property) ? `${key}: ${property.name.text}` : key;
            return {
                ok: true,
                value: [{ start: property.name.getStart(file), end: property.name.getEnd(), text }],
            };
        }
        case 'updateField':
            return updateField(named(change.update.name), file, change.update);
        case 'addField':
            return addField(located, object, change, named(change.name));
        case 'removeField': {
            const kept = object.properties.filter((property) => (0, astroSchemaSyntax_1.propertyName)(property) !== change.name);
            if (kept.length === object.properties.length) {
                return { ok: false, error: `There is no field ${change.name}.` };
            }
            return {
                ok: true,
                value: [
                    (0, astroSchemaSyntax_1.propertyList)(object, file, kept.map((property) => property.getText(file))),
                ],
            };
        }
        default: {
            const exhaustive = change;
            return exhaustive;
        }
    }
}
function reorderFields(object, file, order) {
    const byName = new Map(object.properties.map((property) => [(0, astroSchemaSyntax_1.propertyName)(property), property]));
    const known = order.every((name) => byName.has(name));
    if (!known || order.length !== object.properties.length) {
        return { ok: false, error: 'The fields changed since they were listed. Reopen the settings.' };
    }
    const texts = order.map((name) => byName.get(name)?.getText(file) ?? '');
    (0, assert_1.assert)(texts.every((part) => part.length > 0), 'Every reordered field has its text');
    return { ok: true, value: [(0, astroSchemaSyntax_1.propertyList)(object, file, texts)] };
}
function updateField(property, file, update) {
    if (property === undefined) {
        return { ok: false, error: `There is no field ${update.name}.` };
    }
    const schema = schemaOf(property);
    const chain = schema === undefined ? undefined : chainOf(schema, file);
    if (schema === undefined || chain === undefined) {
        return {
            ok: false,
            error: `${update.name} is written as a method or a very long chain; edit it in the config.`,
        };
    }
    const text = (0, astroSchemaChecks_1.writeChain)(chain, update);
    (0, assert_1.assert)(text.length > 0, 'A field is written with a schema');
    // A shorthand field becomes `name: constant…` once its chain holds more than the name.
    if (typescript_1.default.isShorthandPropertyAssignment(property)) {
        const written = text === chain.base ? text : `${property.name.text}: ${text}`;
        const span = { start: property.getStart(file), end: property.getEnd() };
        return { ok: true, value: [{ ...span, text: written }] };
    }
    return { ok: true, value: [{ start: schema.getStart(file), end: schema.getEnd(), text }] };
}
// A field's schema as written: `name: schema`, or `name` alone naming a constant.
function schemaOf(property) {
    if (typescript_1.default.isPropertyAssignment(property)) {
        return property.initializer;
    }
    return typescript_1.default.isShorthandPropertyAssignment(property) ? property.name : undefined;
}
// A new field, optional until its settings say otherwise, with what its schema
// needs: `image` from the schema's function, `reference` from astro:content.
function addField(located, object, field, existing) {
    const { file } = located;
    if (existing !== undefined) {
        return { ok: false, error: `A field named ${field.name} already exists.` };
    }
    const target = field.target ?? '';
    const pointing = field.fieldKind === 'reference' || field.fieldKind === 'multiReference';
    if (pointing && !(0, astroSchemaSyntax_1.collectionsObject)(file)?.properties.some((property) => (0, astroSchemaSyntax_1.propertyName)(property) === target)) {
        return { ok: false, error: `${target} is not a collection in the content config.` };
    }
    const key = (0, astroSchemaSyntax_1.keyText)(field.name, { quoted: false });
    const added = `${key}: ${settledFieldText(field.fieldKind, target, field.settings)}`;
    const texts = [...object.properties.map((property) => property.getText(file)), added];
    const imaging = field.fieldKind === 'image' || field.fieldKind === 'multiImage';
    const scope = imaging ? imageScope(located) : { ok: true, value: [] };
    if (!scope.ok) {
        return scope;
    }
    const imported = pointing ? referenceImport(file) : [];
    return { ok: true, value: [(0, astroSchemaSyntax_1.propertyList)(object, file, texts), ...scope.value, ...imported] };
}
/** A new field's schema with its settings written in, as an existing field's would be. */
function settledFieldText(kind, target, settings) {
    const plain = newFieldText(kind, target);
    const file = typescript_1.default.createSourceFile('field.ts', `(${plain})`, typescript_1.default.ScriptTarget.Latest, true);
    const statement = file.statements[0];
    (0, assert_1.assert)(statement !== undefined, 'A new field’s schema parses');
    (0, assert_1.assert)(typescript_1.default.isExpressionStatement(statement), 'A new field’s schema is an expression');
    const schema = (0, astroSchemaSyntax_1.unwrap)(statement.expression);
    const chain = schema === undefined ? undefined : chainOf(schema, file);
    (0, assert_1.assert)(chain !== undefined, 'A new field’s schema reads as a chain');
    // The form starts from newFieldSettings: it must be what the plain schema states.
    (0, assert_1.assert)(JSON.stringify((0, astroSchemaChecks_1.readChain)(chain)) === JSON.stringify((0, collectionSettings_1.newFieldSettings)(kind)), `A new ${kind} field reads back as its starting settings`);
    return (0, astroSchemaChecks_1.writeChain)(chain, settings);
}
/** The schema a new field of `kind` is written as. */
function newFieldText(kind, target) {
    const pointed = `reference(${JSON.stringify(target)})`;
    const schemas = {
        text: 'z.string()',
        richText: 'z.string()',
        image: 'image()',
        multiImage: 'z.array(image())',
        videoLink: 'z.string().url()',
        link: 'z.string().url()',
        email: 'z.string().email()',
        phone: 'z.string()',
        number: 'z.number()',
        date: 'z.coerce.date()',
        switch: 'z.boolean()',
        color: 'z.string().regex(/^#[0-9a-fA-F]{6}$/)',
        option: "z.enum(['Option 1', 'Option 2'])",
        file: 'z.string()',
        reference: pointed,
        multiReference: `z.array(${pointed})`,
        list: 'z.array(z.string())',
        group: 'z.object({ title: z.string().optional() })',
        keyValue: 'z.record(z.string(), z.string())',
        constant: "z.literal('value')",
        any: 'z.unknown()',
    };
    return `${schemas[kind]}.optional()`;
}
// `image()` comes from the schema's function: a schema written as an object becomes
// one, and a function that does not take `image` takes it too.
function imageScope(located) {
    const { file } = located;
    const schema = (0, astroSchemaSyntax_1.schemaProperty)(located.call);
    if (schema === undefined) {
        return { ok: false, error: 'This collection has no schema to add an image field to.' };
    }
    const value = schema.initializer;
    if (!typescript_1.default.isArrowFunction(value)) {
        return {
            ok: true,
            value: [{ start: value.getStart(file), end: value.getStart(file), text: '({ image }) => ' }],
        };
    }
    const parameter = value.parameters[0];
    if (parameter === undefined) {
        const open = value.getStart(file);
        return {
            ok: true,
            value: [{ start: open, end: value.equalsGreaterThanToken.getStart(file), text: '({ image }) ' }],
        };
    }
    if (!typescript_1.default.isObjectBindingPattern(parameter.name)) {
        return {
            ok: false,
            error: 'Add `image` to the schema’s function by hand, then add the field.',
        };
    }
    const names = parameter.name.elements.map((element) => element.name.getText(file));
    if (names.includes('image')) {
        return { ok: true, value: [] };
    }
    const first = parameter.name.elements[0];
    const at = first === undefined ? parameter.name.getStart(file) + 1 : first.getStart(file);
    return {
        ok: true,
        value: [{ start: at, end: at, text: first === undefined ? ' image ' : 'image, ' }],
    };
}
// `reference` imported from astro:content, beside what the config imports from it already.
function referenceImport(file) {
    for (const statement of file.statements) {
        if (!typescript_1.default.isImportDeclaration(statement) || !typescript_1.default.isStringLiteral(statement.moduleSpecifier)) {
            continue;
        }
        if (statement.moduleSpecifier.text !== 'astro:content') {
            continue;
        }
        const bindings = statement.importClause?.namedBindings;
        if (bindings === undefined || !typescript_1.default.isNamedImports(bindings)) {
            continue;
        }
        if (bindings.elements.some((element) => element.name.text === 'reference')) {
            return [];
        }
        const last = bindings.elements.at(-1);
        if (last !== undefined) {
            return [{ start: last.getEnd(), end: last.getEnd(), text: ', reference' }];
        }
    }
    return [{ start: 0, end: 0, text: "import { reference } from 'astro:content';\n" }];
}
function renameCollection(source, located, rename) {
    const { entry, file, call } = located;
    const collections = entry.parent;
    (0, assert_1.assert)(typescript_1.default.isObjectLiteralExpression(collections), 'A collection is listed in an object');
    if (collections.properties.some((property) => (0, astroSchemaSyntax_1.propertyName)(property) === rename.to)) {
        return { ok: false, error: `A collection named ${rename.to} already exists.` };
    }
    const edits = [];
    if (typescript_1.default.isShorthandPropertyAssignment(entry)) {
        edits.push({
            start: entry.getStart(file),
            end: entry.getEnd(),
            text: `${(0, astroSchemaSyntax_1.keyText)(rename.to, { quoted: false })}: ${entry.name.text}`,
        });
    }
    else if (entry.name !== undefined) {
        edits.push({
            start: entry.name.getStart(file),
            end: entry.name.getEnd(),
            text: (0, astroSchemaSyntax_1.keyText)(rename.to, { quoted: typescript_1.default.isStringLiteral(entry.name) }),
        });
    }
    // A glob collection kept in a folder named for it moves with its name.
    const base = globBase(call);
    const folder = base === undefined ? undefined : base.text.replace(/^\.\//, '').replace(/\/$/, '');
    const named = folder !== undefined && folder.split('/').at(-1) === rename.from;
    const moved = named && folder !== undefined ? `${folder.split('/').slice(0, -1).join('/')}/${rename.to}` : undefined;
    if (base !== undefined && moved !== undefined) {
        const prefix = base.text.startsWith('./') ? './' : '';
        edits.push({
            start: base.getStart(file),
            end: base.getEnd(),
            text: JSON.stringify(`${prefix}${moved}`).replace(/"/g, (0, astroSchemaSyntax_1.quoteOf)(base, file)),
        });
    }
    return {
        ok: true,
        value: {
            text: (0, astroSchemaSyntax_1.applyEdits)(source, edits),
            move: moved !== undefined && folder !== undefined ? { from: folder, to: moved } : undefined,
        },
    };
}
/**
 * The config without collection `name`: first every field of another
 * collection that points at it (so nothing is left referring to it), then its
 * entry in `collections`, and the const that declared it when nothing else uses it.
 */
function deleteCollection(source, name) {
    const first = typescript_1.default.createSourceFile('content.config.ts', source, typescript_1.default.ScriptTarget.Latest, true, typescript_1.default.ScriptKind.TS);
    const collections = (0, astroSchemaSyntax_1.collectionsObject)(first);
    if (collections === undefined) {
        return {
            ok: false,
            error: 'Stacki could not find `export const collections = { … }` in the content config.',
        };
    }
    const unlinked = [];
    for (const entry of collections.properties) {
        const object = (0, astroSchemaSyntax_1.schemaObject)((0, astroSchemaSyntax_1.defineCall)(entry, first));
        if ((0, astroSchemaSyntax_1.propertyName)(entry) === name || object === undefined) {
            continue;
        }
        const kept = object.properties.filter((property) => (0, astroSchemaSyntax_1.referenceTarget)(property) !== name);
        if (kept.length < object.properties.length) {
            unlinked.push((0, astroSchemaSyntax_1.propertyList)(object, first, kept.map((property) => property.getText(first))));
        }
    }
    const text = (0, astroSchemaSyntax_1.applyEdits)(source, unlinked);
    const located = (0, astroSchemaSyntax_1.locate)(text, name);
    if (!located.ok) {
        return located;
    }
    const { entry, file } = located.value;
    const listed = entry.parent;
    (0, assert_1.assert)(typescript_1.default.isObjectLiteralExpression(listed), 'A collection is listed in an object');
    const others = listed.properties.filter((property) => property !== entry);
    const edits = [
        (0, astroSchemaSyntax_1.propertyList)(listed, file, others.map((property) => property.getText(file))),
    ];
    const declared = declarationOf(entry, file);
    if (declared !== undefined) {
        edits.push(declared);
    }
    return { ok: true, value: { text: (0, astroSchemaSyntax_1.applyEdits)(text, edits), move: undefined } };
}
// The `const x = defineCollection(…)` an entry names, as a span to remove, when
// nothing else in the file uses `x`.
function declarationOf(entry, file) {
    const named = typescript_1.default.isShorthandPropertyAssignment(entry)
        ? entry.name.text
        : typescript_1.default.isPropertyAssignment(entry) && typescript_1.default.isIdentifier(entry.initializer)
            ? entry.initializer.text
            : undefined;
    if (named === undefined) {
        return undefined;
    }
    const statement = file.statements.find((each) => typescript_1.default.isVariableStatement(each) &&
        each.declarationList.declarations.length === 1 &&
        each.declarationList.declarations.some((declaration) => typescript_1.default.isIdentifier(declaration.name) && declaration.name.text === named));
    if (statement === undefined) {
        return undefined;
    }
    // Declared once and listed once: nothing else would miss it. Only names in
    // code count; the same word in a string (a loader's `./src/content/team`) or
    // as a property key (`team: teamCollection`) is no use of the const.
    const uses = identifierUses(file, named);
    (0, assert_1.assert)(uses >= 2, 'A listed collection const is declared and listed');
    if (uses > 2) {
        return undefined;
    }
    const end = file.text.charAt(statement.getEnd()) === '\n' ? statement.getEnd() + 1 : statement.getEnd();
    return { start: statement.getStart(file), end, text: '' };
}
// How often `name` appears in the file as an identifier that names a value:
// a declaration or a reference, never a property key or a member name.
function identifierUses(file, name) {
    let uses = 0;
    const pending = [file];
    // Every node is visited once; a config file is bounded by the read limit.
    for (let visited = 0; visited < IDENTIFIER_NODES_MAX; visited++) {
        const node = pending.pop();
        if (node === undefined) {
            return uses;
        }
        if (typescript_1.default.isIdentifier(node) && node.text === name && namesValue(node)) {
            uses++;
        }
        pending.push(...node.getChildren(file));
    }
    throw new Error('The content config is too large to edit.');
}
const IDENTIFIER_NODES_MAX = 1_000_000;
function namesValue(identifier) {
    const parent = identifier.parent;
    if (typescript_1.default.isPropertyAssignment(parent) || typescript_1.default.isPropertyDeclaration(parent) || typescript_1.default.isMethodDeclaration(parent)) {
        return parent.name !== identifier;
    }
    if (typescript_1.default.isPropertyAccessExpression(parent)) {
        return parent.expression === identifier;
    }
    return true;
}
function loaderSource(call, file) {
    const base = globBase(call);
    if (base !== undefined) {
        return base.text.replace(/^\.\//, '');
    }
    const loader = loaderCall(call);
    const first = loader?.arguments[0];
    return first !== undefined && typescript_1.default.isStringLiteralLike(first) ? first.text.replace(/^\.\//, '') : loader?.getText(file);
}
function globBase(call) {
    const loader = loaderCall(call);
    if (loader === undefined || !typescript_1.default.isIdentifier(loader.expression) || loader.expression.text !== 'glob') {
        return undefined;
    }
    const options = loader.arguments[0];
    if (options === undefined || !typescript_1.default.isObjectLiteralExpression(options)) {
        return undefined;
    }
    const base = options.properties.find((property) => (0, astroSchemaSyntax_1.propertyName)(property) === 'base');
    const value = base !== undefined && typescript_1.default.isPropertyAssignment(base) ? base.initializer : undefined;
    return value !== undefined && typescript_1.default.isStringLiteralLike(value) ? value : undefined;
}
function loaderCall(call) {
    const options = call?.arguments[0];
    if (options === undefined || !typescript_1.default.isObjectLiteralExpression(options)) {
        return undefined;
    }
    const loader = options.properties.find((property) => (0, astroSchemaSyntax_1.propertyName)(property) === 'loader');
    const value = loader !== undefined && typescript_1.default.isPropertyAssignment(loader) ? (0, astroSchemaSyntax_1.unwrap)(loader.initializer) : undefined;
    return value !== undefined && typescript_1.default.isCallExpression(value) ? value : undefined;
}
// One field: its name, its kind, and the settings its chain states.
function fieldOf(property, file) {
    const name = (0, astroSchemaSyntax_1.propertyName)(property);
    if (name === undefined || !/^[A-Za-z][A-Za-z0-9_-]{0,63}$/.test(name)) {
        return [];
    }
    const schema = schemaOf(property);
    const chain = schema === undefined ? undefined : chainOf(schema, file);
    if (chain === undefined) {
        return [
            {
                name,
                kind: 'other',
                description: undefined,
                required: false,
                checks: {},
                options: undefined,
                defaultValue: undefined,
                editable: false,
            },
        ];
    }
    return [
        {
            name,
            kind: chain.kind,
            ...(0, astroSchemaChecks_1.readChain)(chain),
            editable: true,
            target: (0, astroSchemaSyntax_1.referenceTarget)(property),
        },
    ];
}
// `z.string().min(1).optional()` → base `z.string()`, steps min and optional.
// Anything else at the root — a schema kept in a constant (`titleSchema`), a
// helper's call (`slugField()`) — is a base of its own, kept as written.
function chainOf(expression, file) {
    const steps = [];
    let node = expression;
    for (let depth = 0; depth < astroSchemaSyntax_1.CHAIN_STEPS_MAX; depth += 1) {
        const callee = typescript_1.default.isCallExpression(node) ? node.expression : undefined;
        const kind = callee === undefined ? undefined : baseKind(callee);
        if (kind !== undefined && typescript_1.default.isCallExpression(node)) {
            const ordered = steps.reverse();
            return {
                base: node.getText(file),
                baseNode: node,
                kind: refinedKind(kind, node, ordered),
                steps: ordered,
            };
        }
        if (callee === undefined || !typescript_1.default.isCallExpression(node) || !typescript_1.default.isPropertyAccessExpression(callee)) {
            return { base: node.getText(file), baseNode: node, kind: 'other', steps: steps.reverse() };
        }
        const inner = callee.expression;
        steps.push({
            name: callee.name.text,
            text: file.text.slice(inner.getEnd(), node.getEnd()),
            args: [...node.arguments],
        });
        node = inner;
    }
    return undefined;
}
// A string read by its validators, a list by what it lists.
function refinedKind(kind, base, steps) {
    const has = (name) => steps.some((step) => step.name === name);
    if (kind === 'text') {
        return has('email') ? 'email' : has('url') ? 'link' : has('regex') ? 'color' : 'text';
    }
    if (kind !== 'list') {
        return kind;
    }
    const item = base.arguments[0];
    const callee = item !== undefined && typescript_1.default.isCallExpression(item) ? item.expression : undefined;
    if (callee !== undefined && typescript_1.default.isIdentifier(callee)) {
        return callee.text === 'image' ? 'multiImage' : callee.text === 'reference' ? 'multiReference' : 'list';
    }
    return 'list';
}
// The kind a base call makes, or undefined when `callee` is not a base.
function baseKind(callee) {
    if (typescript_1.default.isIdentifier(callee)) {
        return callee.text === 'image' ? 'image' : callee.text === 'reference' ? 'reference' : undefined;
    }
    if (!typescript_1.default.isPropertyAccessExpression(callee)) {
        return undefined;
    }
    const root = callee.expression.getText();
    if (root !== 'z' && root !== 'z.coerce') {
        return undefined;
    }
    switch (callee.name.text) {
        case 'string':
            return 'text';
        case 'literal':
            return 'constant';
        case 'object':
            return 'group';
        case 'record':
            return 'keyValue';
        case 'unknown':
        case 'any':
            return 'any';
        case 'enum':
            return 'option';
        case 'number':
            return 'number';
        case 'boolean':
            return 'switch';
        case 'date':
            return 'date';
        case 'array':
            return 'list';
        default:
            return 'other';
    }
}
