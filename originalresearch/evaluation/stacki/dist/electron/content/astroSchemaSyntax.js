"use strict";
// The syntax under a content config's collection edits (astroSchemaEdit.ts):
// finding a collection in `export const collections = { … }`, the
// defineCollection call it names and its schema's z.object, reading keys, and
// writing span edits back in the layout the file already has. Nothing here
// runs the config: it is parsed as TypeScript text.
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CHAIN_STEPS_MAX = exports.CONFIG_CHARS_MAX = void 0;
exports.propertyList = propertyList;
exports.referenceTarget = referenceTarget;
exports.locate = locate;
exports.collectionsObject = collectionsObject;
exports.defineCall = defineCall;
exports.schemaProperty = schemaProperty;
exports.schemaObject = schemaObject;
exports.returned = returned;
exports.propertyName = propertyName;
exports.keyText = keyText;
exports.quoteOf = quoteOf;
exports.unwrap = unwrap;
exports.lineIndent = lineIndent;
exports.applyEdits = applyEdits;
const typescript_1 = __importDefault(require("typescript"));
const assert_1 = require("../../shared/core/assert");
exports.CONFIG_CHARS_MAX = 2_000_000;
exports.CHAIN_STEPS_MAX = 32;
// The object's properties written as `texts`, in the layout it already has: one
// per line when it spans lines, side by side when it is written on one.
function propertyList(object, file, texts) {
    const open = object.getStart(file);
    const close = object.getEnd();
    const inner = file.text.slice(open + 1, close - 1);
    if (texts.length === 0) {
        return { start: open, end: close, text: '{}' };
    }
    if (!inner.includes('\n')) {
        return { start: open, end: close, text: `{ ${texts.join(', ')} }` };
    }
    const first = object.properties[0];
    const indent = first === undefined ? '  ' : lineIndent(file.text, first.getStart(file));
    const closing = lineIndent(file.text, close - 1);
    const trailing = object.properties.hasTrailingComma || object.properties.length === 0 ? ',' : '';
    const body = texts.map((part) => `${indent}${part}`).join(',\n');
    return { start: open, end: close, text: `{\n${body}${trailing}\n${closing}}` };
}
/** The collection a field's reference (or list of them) points at. */
function referenceTarget(property) {
    if (!typescript_1.default.isPropertyAssignment(property)) {
        return undefined;
    }
    const pending = [property.initializer];
    for (let visited = 0; pending.length > 0 && visited < exports.CHAIN_STEPS_MAX * 4; visited += 1) {
        const node = pending.pop();
        if (node === undefined) {
            continue;
        }
        if (typescript_1.default.isCallExpression(node) && typescript_1.default.isIdentifier(node.expression) && node.expression.text === 'reference') {
            const first = node.arguments[0];
            return first !== undefined && typescript_1.default.isStringLiteralLike(first) ? first.text : undefined;
        }
        pending.push(...node.getChildren());
    }
    return undefined;
}
// Finding the collection: the `collections` export, its key, and the schema's z.object.
function locate(source, collection) {
    if (source.length > exports.CONFIG_CHARS_MAX) {
        return { ok: false, error: 'The content config is too large to edit here.' };
    }
    const file = typescript_1.default.createSourceFile('content.config.ts', source, typescript_1.default.ScriptTarget.Latest, true, typescript_1.default.ScriptKind.TS);
    const collections = collectionsObject(file);
    if (collections === undefined) {
        return {
            ok: false,
            error: 'Stacki could not find `export const collections = { … }` in the content config.',
        };
    }
    const entry = collections.properties.find((property) => propertyName(property) === collection);
    if (entry === undefined) {
        return { ok: false, error: `${collection} is not in the content config’s collections.` };
    }
    const call = defineCall(entry, file);
    return { ok: true, value: { file, entry, call, object: schemaObject(call) } };
}
function collectionsObject(file) {
    for (const statement of file.statements) {
        if (!typescript_1.default.isVariableStatement(statement)) {
            continue;
        }
        for (const declaration of statement.declarationList.declarations) {
            if (typescript_1.default.isIdentifier(declaration.name) && declaration.name.text === 'collections') {
                const value = unwrap(declaration.initializer);
                return value !== undefined && typescript_1.default.isObjectLiteralExpression(value) ? value : undefined;
            }
        }
    }
    return undefined;
}
// The defineCollection call a collection's entry names: inline, or by a const.
function defineCall(entry, file) {
    const value = typescript_1.default.isPropertyAssignment(entry) ? unwrap(entry.initializer) : typescript_1.default.isShorthandPropertyAssignment(entry) ? entry.name : undefined;
    if (value !== undefined && typescript_1.default.isCallExpression(value)) {
        return value;
    }
    if (value === undefined || !typescript_1.default.isIdentifier(value)) {
        return undefined;
    }
    for (const statement of file.statements) {
        if (typescript_1.default.isVariableStatement(statement)) {
            for (const declaration of statement.declarationList.declarations) {
                const initial = unwrap(declaration.initializer);
                if (typescript_1.default.isIdentifier(declaration.name) && declaration.name.text === value.text && initial !== undefined && typescript_1.default.isCallExpression(initial)) {
                    return initial;
                }
            }
        }
    }
    return undefined;
}
function schemaProperty(call) {
    const options = call?.arguments[0];
    if (options === undefined || !typescript_1.default.isObjectLiteralExpression(options)) {
        return undefined;
    }
    const schema = options.properties.find((property) => propertyName(property) === 'schema');
    return schema !== undefined && typescript_1.default.isPropertyAssignment(schema) ? schema : undefined;
}
function schemaObject(call) {
    const schema = schemaProperty(call);
    if (schema === undefined) {
        return undefined;
    }
    let node = unwrap(schema.initializer);
    if (node !== undefined && typescript_1.default.isArrowFunction(node)) {
        node = typescript_1.default.isBlock(node.body) ? returned(node.body) : unwrap(node.body);
    }
    // Down the chain (`z.object({…}).passthrough()`) to the z.object call itself.
    for (let step = 0; step < exports.CHAIN_STEPS_MAX && node !== undefined && typescript_1.default.isCallExpression(node); step += 1) {
        const callee = node.expression;
        if (typescript_1.default.isPropertyAccessExpression(callee) && callee.name.text === 'object' && callee.expression.getText() === 'z') {
            const shape = node.arguments[0];
            return shape !== undefined && typescript_1.default.isObjectLiteralExpression(shape) ? shape : undefined;
        }
        node = typescript_1.default.isPropertyAccessExpression(callee) ? unwrap(callee.expression) : undefined;
    }
    return undefined;
}
function returned(block) {
    const statement = block.statements.find(typescript_1.default.isReturnStatement);
    return unwrap(statement?.expression);
}
function propertyName(property) {
    const name = property.name;
    if (name === undefined) {
        return undefined;
    }
    if (typescript_1.default.isIdentifier(name) || typescript_1.default.isStringLiteral(name) || typescript_1.default.isNumericLiteral(name)) {
        return name.text;
    }
    return undefined;
}
// A key as the config writes it: bare when it can be, quoted when it must be or was.
function keyText(name, style) {
    return !style.quoted && /^[A-Za-z_$][\w$]*$/.test(name) ? name : JSON.stringify(name);
}
function quoteOf(literal, file) {
    return file.text.charAt(literal.getStart(file)) === "'" ? "'" : '"';
}
function unwrap(node) {
    let current = node;
    for (let depth = 0; depth < exports.CHAIN_STEPS_MAX && current !== undefined; depth += 1) {
        if (typescript_1.default.isParenthesizedExpression(current) || typescript_1.default.isAsExpression(current) || typescript_1.default.isSatisfiesExpression(current)) {
            current = current.expression;
        }
        else {
            return current;
        }
    }
    return current;
}
function lineIndent(text, offset) {
    const lineStart = text.lastIndexOf('\n', offset - 1) + 1;
    return /^[ \t]*/.exec(text.slice(lineStart, offset))?.[0] ?? '';
}
/** Applies span edits, the last first, so earlier offsets hold. */
function applyEdits(source, edits) {
    const ordered = [...edits].sort((left, right) => right.start - left.start);
    let text = source;
    for (const edit of ordered) {
        (0, assert_1.assert)(edit.start <= edit.end, 'An edit spans forward');
        text = text.slice(0, edit.start) + edit.text + text.slice(edit.end);
    }
    return text;
}
