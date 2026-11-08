"use strict";
// A prop's declared type, read on the TypeScript syntax tree into the control
// a designer gets (shared/properties/propModel.ts). This is the syntactic tier
// of docs/plans/prop-controls.md §2.2: local aliases and interfaces are
// followed, `as const` lists stand for the unions they hold, and nothing is
// type-checked. A type the syntax cannot settle (a named type from a library,
// a generic) is honest code, never a guess.
//
// The rules mirror what the panels have always shown (the regex reader this
// replaced, retired in Phase 1): a union of literals is a Choice, a union led
// by `string`/`number`/`boolean` takes that primitive, arrays and tuples are
// lists, an object type is a group, functions are callbacks, and the types no
// field can fill (`any`, a promise) are code.
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TOP_WALK = exports.PROP_TYPE_LIMITS = void 0;
exports.typeScope = typeScope;
exports.referencedDeclaration = referencedDeclaration;
exports.flattenParts = flattenParts;
exports.partText = partText;
exports.literalOf = literalOf;
exports.isNullish = isNullish;
exports.isNull = isNull;
exports.isNever = isNever;
exports.controlOfParts = controlOfParts;
exports.controlOfType = controlOfType;
exports.declarationControl = declarationControl;
exports.interfaceMembers = interfaceMembers;
exports.memberKey = memberKey;
exports.boundedText = boundedText;
exports.constListOf = constListOf;
exports.literalPartValue = literalPartValue;
exports.expressionLiteral = expressionLiteral;
const typescript_1 = __importDefault(require("typescript"));
const assert_1 = require("../../../shared/core/assert");
const limits_1 = require("../../../shared/core/limits");
const propModel_1 = require("../../../shared/properties/propModel");
// Props types are written by hand: a chain of aliases a dozen deep, each naming
// the next, is already past anything a component declares.
exports.PROP_TYPE_LIMITS = {
    aliasDepthMax: 12,
    partsMax: limits_1.LIMITS.propOptionsMax * 2,
    constListsMax: 64,
};
/** The scope of the component's frontmatter, with the declarations a prelude (imported types) adds beneath it. */
function typeScope(files) {
    const declarations = new Map();
    const constLists = new Map();
    // Later files are read first so the component's own declarations, read last, win.
    for (const file of [...files].reverse()) {
        for (const statement of file.statements) {
            if (typescript_1.default.isTypeAliasDeclaration(statement)) {
                declarations.set(statement.name.text, { kind: 'alias', node: statement, file });
            }
            else if (typescript_1.default.isInterfaceDeclaration(statement)) {
                declarations.set(statement.name.text, { kind: 'interface', node: statement, file });
            }
            else if (typescript_1.default.isVariableStatement(statement) && constLists.size < exports.PROP_TYPE_LIMITS.constListsMax) {
                for (const declaration of statement.declarationList.declarations) {
                    const list = constListOf(declaration);
                    if (list !== undefined && typescript_1.default.isIdentifier(declaration.name)) {
                        constLists.set(declaration.name.text, list);
                    }
                }
            }
        }
    }
    (0, assert_1.assert)(constLists.size <= exports.PROP_TYPE_LIMITS.constListsMax, 'typeScope: const lists are bounded');
    return { declarations, constLists };
}
/** The local alias or interface a reference names, when it names one without type arguments. */
function referencedDeclaration(node, scope) {
    if (!typescript_1.default.isTypeReferenceNode(node) || !typescript_1.default.isIdentifier(node.typeName) || node.typeArguments !== undefined) {
        return undefined;
    }
    const declaration = scope.declarations.get(node.typeName.text);
    if (declaration === undefined || declaration.node.typeParameters !== undefined) {
        return undefined;
    }
    return declaration;
}
/**
 * A type's union members, flattened: parentheses and nested unions opened,
 * aliases that stand for a union of values (no object braces) followed, and
 * `(typeof X)[number]`, `(typeof X)[keyof typeof X]` and `keyof typeof X` over
 * an `as const` list replaced by its literals.
 */
function flattenParts(node, file, scope, followed = []) {
    const out = [];
    const pending = [{ node, file, aliases: followed }];
    for (let step = 0; pending.length > 0 && step < exports.PROP_TYPE_LIMITS.partsMax; step++) {
        const item = pending.shift();
        (0, assert_1.assert)(item !== undefined, 'flattenParts: a pending part exists');
        const current = item.node;
        if (typescript_1.default.isParenthesizedTypeNode(current)) {
            pending.unshift({ ...item, node: current.type });
            continue;
        }
        if (typescript_1.default.isUnionTypeNode(current)) {
            pending.unshift(...current.types.map((child) => ({ ...item, node: child })));
            continue;
        }
        const listed = constListParts(current, scope);
        if (listed !== undefined) {
            out.push(...listed);
            continue;
        }
        const declaration = referencedDeclaration(current, scope);
        if (declaration?.kind === 'alias' &&
            !item.aliases.includes(declaration.node.name.text) &&
            item.aliases.length < exports.PROP_TYPE_LIMITS.aliasDepthMax &&
            !/[{}]/.test(declaration.node.type.getText(declaration.file))) {
            pending.unshift({ node: declaration.node.type, file: declaration.file, aliases: [...item.aliases, declaration.node.name.text] });
            continue;
        }
        out.push({ kind: 'type', node: current, file: item.file, aliases: item.aliases });
    }
    (0, assert_1.assert)(out.length <= exports.PROP_TYPE_LIMITS.partsMax, 'flattenParts: parts are bounded');
    return out;
}
/** A part's text as written. */
function partText(part) {
    return part.kind === 'literal' ? part.literal.text : part.node.getText(part.file);
}
/** The literal a part is, when it is one: `'sm'`, `3`, `-1`, `true`. */
function literalOf(part) {
    if (part.kind === 'literal') {
        return part.literal;
    }
    const node = part.node;
    if (!typescript_1.default.isLiteralTypeNode(node)) {
        return undefined;
    }
    const literal = node.literal;
    if (typescript_1.default.isStringLiteral(literal) || typescript_1.default.isNoSubstitutionTemplateLiteral(literal)) {
        return { form: 'string', value: literal.text, text: literal.getText(part.file) };
    }
    if (literal.kind === typescript_1.default.SyntaxKind.TrueKeyword) {
        return { form: 'boolean', text: 'true' };
    }
    if (literal.kind === typescript_1.default.SyntaxKind.FalseKeyword) {
        return { form: 'boolean', text: 'false' };
    }
    const text = literal.getText(part.file);
    return NUMBER_LITERAL_RE.test(text) ? { form: 'number', text } : undefined;
}
// Only plain decimals are choices: `1e3` and `0x10` read as their own words nowhere a designer looks.
const NUMBER_LITERAL_RE = /^-?\d+(?:\.\d+)?$/;
/** Whether a part is `undefined` or `null`, which say a prop may be absent, not what it holds. */
function isNullish(part) {
    if (part.kind === 'literal') {
        return false;
    }
    return part.node.kind === typescript_1.default.SyntaxKind.UndefinedKeyword || (typescript_1.default.isLiteralTypeNode(part.node) && part.node.literal.kind === typescript_1.default.SyntaxKind.NullKeyword);
}
/** Whether a part is `null` itself. */
function isNull(part) {
    return part.kind === 'type' && typescript_1.default.isLiteralTypeNode(part.node) && part.node.literal.kind === typescript_1.default.SyntaxKind.NullKeyword;
}
function isNever(part) {
    return part.kind === 'type' && part.node.kind === typescript_1.default.SyntaxKind.NeverKeyword;
}
exports.TOP_WALK = { depth: 0, aliases: [] };
/** The control for a type made of these union parts. */
function controlOfParts(parts, scope, walk) {
    (0, assert_1.assert)(walk.depth >= 0, 'controlOfParts: depth is a count');
    (0, assert_1.assert)(parts.length <= exports.PROP_TYPE_LIMITS.partsMax, 'controlOfParts: parts are bounded');
    const values = parts.filter((part) => !isNullish(part) && !isNever(part));
    const choice = literalChoice(values);
    if (choice !== undefined) {
        return choice;
    }
    if (values.length === 0) {
        return { kind: 'code', reason: 'unrecognized' };
    }
    if (values.every((part) => part.kind === 'type' && isFunctionType(part.node, scope))) {
        return { kind: 'callback', signature: boundedText(values.map(partText).join(' | ')) };
    }
    const first = values[0];
    (0, assert_1.assert)(first !== undefined, 'controlOfParts: a part exists');
    if (values.length === 1) {
        const aliases = first.kind === 'type' ? [...new Set([...walk.aliases, ...first.aliases])] : walk.aliases;
        return controlOfPart(first, scope, { depth: walk.depth, aliases });
    }
    // A union of different things takes the primitive it leads with, as it
    // always has: `string | number` edits as text (plan D9 revisits this).
    if (first.kind === 'type') {
        const primitive = primitiveControl(first.node);
        if (primitive !== undefined) {
            return primitive;
        }
    }
    return { kind: 'code', reason: 'unrecognized' };
}
/** The control for one type node, with its own unions flattened. */
function controlOfType(node, file, scope, walk) {
    return controlOfParts(flattenParts(node, file, scope, walk.aliases), scope, walk);
}
function controlOfPart(part, scope, walk) {
    if (part.kind === 'literal') {
        return part.literal.form === 'string' ? { kind: 'text' } : { kind: 'code', reason: 'unrecognized' };
    }
    const node = part.node;
    const file = part.file;
    const primitive = primitiveControl(node);
    if (primitive !== undefined) {
        return primitive;
    }
    if (typescript_1.default.isTypeOperatorNode(node) && node.operator === typescript_1.default.SyntaxKind.ReadonlyKeyword) {
        return controlOfType(node.type, file, scope, walk);
    }
    if (typescript_1.default.isLiteralTypeNode(node) || typescript_1.default.isTemplateLiteralTypeNode(node)) {
        return typescript_1.default.isTemplateLiteralTypeNode(node) || typescript_1.default.isStringLiteral(node.literal) || typescript_1.default.isNoSubstitutionTemplateLiteral(node.literal)
            ? { kind: 'text' }
            : { kind: 'code', reason: 'unrecognized' };
    }
    if (typescript_1.default.isArrayTypeNode(node)) {
        return { kind: 'list', item: itemControl(node.elementType, file, scope, walk) };
    }
    if (typescript_1.default.isTupleTypeNode(node)) {
        return { kind: 'list', item: { kind: 'code', reason: 'tuple' } };
    }
    if (typescript_1.default.isTypeLiteralNode(node)) {
        return node.members.length === 0 ? { kind: 'code', reason: 'opaque' } : groupOf(node.members, file, scope, walk);
    }
    if (typescript_1.default.isIntersectionTypeNode(node)) {
        return intersectionControl(node, file, scope, walk);
    }
    if (typescript_1.default.isTypeReferenceNode(node)) {
        return referenceControl(node, file, scope, walk);
    }
    if (isOpaque(node)) {
        return { kind: 'code', reason: 'opaque' };
    }
    return { kind: 'code', reason: 'unrecognized' };
}
function primitiveControl(node) {
    if (node.kind === typescript_1.default.SyntaxKind.StringKeyword) {
        return { kind: 'text' };
    }
    if (node.kind === typescript_1.default.SyntaxKind.NumberKeyword) {
        return { kind: 'number', min: undefined, max: undefined, minExclusive: false, maxExclusive: false, step: undefined, decimals: undefined };
    }
    if (node.kind === typescript_1.default.SyntaxKind.BooleanKeyword) {
        return { kind: 'switch', onLabel: undefined, offLabel: undefined };
    }
    return undefined;
}
function nested(walk) {
    return { depth: walk.depth + 1, aliases: walk.aliases };
}
function itemControl(node, file, scope, walk) {
    if (walk.depth + 1 > propModel_1.PROP_MODEL_LIMITS.propNestingDepthMax) {
        return { kind: 'code', reason: 'nestingDepth' };
    }
    return controlOfType(node, file, scope, nested(walk));
}
// Element attributes the attribute rows can edit: Astro's HTMLAttributes, its
// astroHTML namespace and a plain Record of names to values.
function attributesTag(node, file) {
    const name = node.typeName;
    if (typescript_1.default.isQualifiedName(name)) {
        return typescript_1.default.isIdentifier(name.left) && name.left.text === 'astroHTML' ? { kind: 'attributes', tag: undefined } : undefined;
    }
    if (name.text === 'Record') {
        return { kind: 'attributes', tag: undefined };
    }
    if (name.text !== 'HTMLAttributes') {
        return undefined;
    }
    const argument = node.typeArguments?.[0];
    const tag = argument !== undefined && typescript_1.default.isLiteralTypeNode(argument) && typescript_1.default.isStringLiteral(argument.literal) ? argument.literal.text : undefined;
    (0, assert_1.assert)(tag === undefined || node.getText(file).includes(tag), 'attributesTag: the tag is written in the type');
    return { kind: 'attributes', tag };
}
function referenceControl(node, file, scope, walk) {
    const attributes = attributesTag(node, file);
    if (attributes !== undefined) {
        return attributes;
    }
    const name = typescript_1.default.isIdentifier(node.typeName) ? node.typeName.text : undefined;
    const argument = node.typeArguments?.[0];
    if ((name === 'Array' || name === 'ReadonlyArray') && argument !== undefined) {
        return { kind: 'list', item: itemControl(argument, file, scope, walk) };
    }
    if (name === 'Function') {
        return { kind: 'callback', signature: node.getText(file) };
    }
    if (name !== undefined && OPAQUE_REFERENCES.has(name) && (node.typeArguments !== undefined || name === 'Object')) {
        return { kind: 'code', reason: 'opaque' };
    }
    const declaration = referencedDeclaration(node, scope);
    if (declaration === undefined) {
        return { kind: 'code', reason: 'unrecognized' };
    }
    const followed = declaration.node.name.text;
    if (walk.aliases.includes(followed) || walk.aliases.length >= exports.PROP_TYPE_LIMITS.aliasDepthMax) {
        return { kind: 'code', reason: 'unrecognized' };
    }
    return declarationControl(declaration, scope, { depth: walk.depth, aliases: [...walk.aliases, followed] });
}
/** The control a local alias or interface stands for. */
function declarationControl(declaration, scope, walk) {
    (0, assert_1.assert)(walk.aliases.length <= exports.PROP_TYPE_LIMITS.aliasDepthMax, 'declarationControl: alias chains are bounded');
    if (declaration.kind === 'interface') {
        const members = interfaceMembers(declaration, scope, walk.aliases);
        return members.length === 0 ? { kind: 'code', reason: 'opaque' } : groupOfSignatures(members, scope, walk);
    }
    return controlOfType(declaration.node.type, declaration.file, scope, walk);
}
/** An interface's members with those of the local interfaces and aliases it extends, extended ones first. */
function interfaceMembers(declaration, scope, seen) {
    const aliasDepth = seen.length;
    (0, assert_1.assert)(aliasDepth <= exports.PROP_TYPE_LIMITS.aliasDepthMax, 'interfaceMembers: extends chains are bounded');
    const out = [];
    for (const clause of declaration.node.heritageClauses ?? []) {
        for (const heritage of clause.types) {
            const name = typescript_1.default.isIdentifier(heritage.expression) ? heritage.expression.text : undefined;
            const base = name === undefined || heritage.typeArguments !== undefined ? undefined : scope.declarations.get(name);
            if (base === undefined || name === undefined || seen.includes(name) || aliasDepth >= exports.PROP_TYPE_LIMITS.aliasDepthMax) {
                continue;
            }
            if (base.kind === 'interface') {
                out.push(...interfaceMembers(base, scope, [...seen, name]));
            }
            else if (typescript_1.default.isTypeLiteralNode(base.node.type)) {
                out.push(...base.node.type.members.filter(typescript_1.default.isPropertySignature).map((member) => ({ member, file: base.file })));
            }
        }
    }
    out.push(...declaration.node.members.filter(typescript_1.default.isPropertySignature).map((member) => ({ member, file: declaration.file })));
    return out;
}
// `{ a: string } & { b: number }` is one group of both; `HTMLAttributes<"a"> & {…}` edits as attributes.
function intersectionControl(node, file, scope, walk) {
    const first = node.types[0];
    if (first !== undefined && typescript_1.default.isTypeReferenceNode(first)) {
        const attributes = attributesTag(first, file);
        if (attributes !== undefined) {
            return attributes;
        }
    }
    const members = [];
    for (const type of node.types) {
        const inner = typescript_1.default.isParenthesizedTypeNode(type) ? type.type : type;
        if (typescript_1.default.isTypeLiteralNode(inner)) {
            members.push(...inner.members.filter(typescript_1.default.isPropertySignature).map((member) => ({ member, file })));
            continue;
        }
        const declaration = referencedDeclaration(inner, scope);
        if (declaration?.kind === 'interface' && !walk.aliases.includes(declaration.node.name.text) && walk.aliases.length < exports.PROP_TYPE_LIMITS.aliasDepthMax) {
            members.push(...interfaceMembers(declaration, scope, [...walk.aliases, declaration.node.name.text]));
            continue;
        }
        if (declaration?.kind === 'alias' && typescript_1.default.isTypeLiteralNode(declaration.node.type)) {
            const literal = declaration.node.type;
            members.push(...literal.members.filter(typescript_1.default.isPropertySignature).map((member) => ({ member, file: declaration.file })));
            continue;
        }
        return { kind: 'code', reason: 'unrecognized' };
    }
    return members.length === 0 ? { kind: 'code', reason: 'opaque' } : groupOfSignatures(members, scope, walk);
}
function groupOf(members, file, scope, walk) {
    return groupOfSignatures(members.filter(typescript_1.default.isPropertySignature).map((member) => ({ member, file })), scope, walk);
}
function groupOfSignatures(members, scope, walk) {
    if (walk.depth + 1 > propModel_1.PROP_MODEL_LIMITS.propNestingDepthMax) {
        return { kind: 'code', reason: 'nestingDepth' };
    }
    const fields = new Map();
    for (const { member, file } of members.slice(0, propModel_1.PROP_MODEL_LIMITS.propsMax)) {
        const name = memberKey(member.name);
        if (name === undefined) {
            continue;
        }
        fields.set(name, {
            name,
            typeText: member.type === undefined ? '' : boundedText(member.type.getText(file)),
            control: member.type === undefined ? { kind: 'code', reason: 'untyped' } : controlOfType(member.type, file, scope, nested(walk)),
            presence: member.questionToken === undefined ? 'required' : 'optional',
        });
    }
    (0, assert_1.assert)(fields.size <= propModel_1.PROP_MODEL_LIMITS.propsMax, 'groupOfSignatures: fields are bounded');
    return { kind: 'group', fields: [...fields.values()] };
}
/** A member's name as a prop is called: an identifier, or a quoted name such as `'data-id'`. */
function memberKey(name) {
    if (typescript_1.default.isIdentifier(name) || typescript_1.default.isStringLiteral(name) || typescript_1.default.isNumericLiteral(name) || typescript_1.default.isNoSubstitutionTemplateLiteral(name)) {
        return name.text === '' ? undefined : name.text;
    }
    return undefined;
}
/** A type text cut to the model's bound. */
function boundedText(text) {
    return text.length <= propModel_1.PROP_MODEL_LIMITS.typeTextCharsMax ? text : `${text.slice(0, propModel_1.PROP_MODEL_LIMITS.typeTextCharsMax - 1)}…`;
}
// A union of literals is a fixed set of choices: `'sm' | 'lg'`, `1 | 2 | 3`,
// and mixed ones — `boolean | 'auto'` is true, false or auto, and
// `'sm' | 'lg' | number` offers its two words (a number stays possible in
// code). The options that are not strings are written as expressions, so
// `flag={true}` stays a boolean. Undefined when the parts are not such a union.
function literalChoice(parts) {
    if (parts.length < 2) {
        return undefined;
    }
    const options = [];
    let strings = 0;
    let widenedToNumber = false;
    for (const part of parts) {
        const literal = literalOf(part);
        if (literal !== undefined && (literal.form === 'string' ? literal.value : literal.text).length > propModel_1.PROP_MODEL_LIMITS.textCharsMax) {
            // An option no field could show is not a choice; the type stays code.
            return undefined;
        }
        if (literal?.form === 'string') {
            options.push({ value: literal.value, written: 'string' });
            strings++;
        }
        else if (literal !== undefined) {
            options.push({ value: literal.text, written: 'expression' });
        }
        else if (part.kind === 'type' && part.node.kind === typescript_1.default.SyntaxKind.BooleanKeyword) {
            options.push({ value: 'true', written: 'expression' }, { value: 'false', written: 'expression' });
        }
        else if (part.kind === 'type' && part.node.kind === typescript_1.default.SyntaxKind.NumberKeyword) {
            widenedToNumber = true;
        }
        else {
            return undefined;
        }
    }
    const unique = new Map();
    for (const option of options) {
        if (!unique.has(option.value)) {
            unique.set(option.value, option);
        }
    }
    if (unique.size < 2 || unique.size > propModel_1.PROP_MODEL_LIMITS.optionsMax) {
        return undefined;
    }
    // `number | 1 | 2` is any number; only words beside `number` make a choice.
    if (widenedToNumber && strings < 2) {
        return undefined;
    }
    const choices = [...unique.values()];
    if (strings === 0) {
        // `true | false` is just a boolean.
        if (choices.every((option) => option.value === 'true' || option.value === 'false')) {
            return { kind: 'switch', onLabel: undefined, offLabel: undefined };
        }
        if (choices.every((option) => NUMBER_LITERAL_RE.test(option.value))) {
            return { kind: 'choice', options: choices, numeric: true };
        }
    }
    (0, assert_1.assert)(choices.length <= options.length, 'literalChoice: options never grow when made unique');
    return { kind: 'choice', options: choices, numeric: false };
}
// `(item: T) => string`, `new () => Thing`, `Function`, and a local alias of one.
function isFunctionType(node, scope) {
    const inner = typescript_1.default.isParenthesizedTypeNode(node) ? node.type : node;
    if (typescript_1.default.isFunctionTypeNode(inner) || typescript_1.default.isConstructorTypeNode(inner)) {
        return true;
    }
    if (typescript_1.default.isTypeReferenceNode(inner) && typescript_1.default.isIdentifier(inner.typeName) && inner.typeName.text === 'Function') {
        return true;
    }
    const declaration = referencedDeclaration(inner, scope);
    if (declaration?.kind === 'alias') {
        const target = typescript_1.default.isParenthesizedTypeNode(declaration.node.type) ? declaration.node.type.type : declaration.node.type;
        return typescript_1.default.isFunctionTypeNode(target) || typescript_1.default.isConstructorTypeNode(target);
    }
    return false;
}
// Types that say nothing a field could fill in.
const OPAQUE_KEYWORDS = new Set([
    typescript_1.default.SyntaxKind.AnyKeyword,
    typescript_1.default.SyntaxKind.UnknownKeyword,
    typescript_1.default.SyntaxKind.ObjectKeyword,
    typescript_1.default.SyntaxKind.SymbolKeyword,
    typescript_1.default.SyntaxKind.BigIntKeyword,
    typescript_1.default.SyntaxKind.NeverKeyword,
    typescript_1.default.SyntaxKind.VoidKeyword,
]);
const OPAQUE_REFERENCES = new Set(['Promise', 'PromiseLike', 'Map', 'Set', 'WeakMap', 'WeakSet', 'Object']);
function isOpaque(node) {
    if (OPAQUE_KEYWORDS.has(node.kind)) {
        return true;
    }
    return typescript_1.default.isTypeOperatorNode(node) && node.operator === typescript_1.default.SyntaxKind.UniqueKeyword;
}
// `(typeof X)[number]`, `(typeof X)[keyof typeof X]` and `keyof typeof X` over an `as const` list.
function constListParts(node, scope) {
    if (typescript_1.default.isTypeOperatorNode(node) && node.operator === typescript_1.default.SyntaxKind.KeyOfKeyword) {
        const list = queriedList(node.type, scope);
        if (list?.kind !== 'object') {
            return undefined;
        }
        return list.entries.map(([key]) => ({ kind: 'literal', literal: { form: 'string', value: key, text: JSON.stringify(key) } }));
    }
    if (!typescript_1.default.isIndexedAccessTypeNode(node)) {
        return undefined;
    }
    const list = queriedList(node.objectType, scope);
    if (list === undefined) {
        return undefined;
    }
    const index = typescript_1.default.isParenthesizedTypeNode(node.indexType) ? node.indexType.type : node.indexType;
    if (list.kind === 'array' && index.kind === typescript_1.default.SyntaxKind.NumberKeyword) {
        return list.entries.map(([, literal]) => ({ kind: 'literal', literal }));
    }
    if (list.kind === 'object' && typescript_1.default.isTypeOperatorNode(index) && index.operator === typescript_1.default.SyntaxKind.KeyOfKeyword && sameQuery(index.type, node.objectType)) {
        return list.entries.map(([, literal]) => ({ kind: 'literal', literal }));
    }
    return undefined;
}
function queriedList(node, scope) {
    const inner = typescript_1.default.isParenthesizedTypeNode(node) ? node.type : node;
    if (!typescript_1.default.isTypeQueryNode(inner) || !typescript_1.default.isIdentifier(inner.exprName)) {
        return undefined;
    }
    const list = scope.constLists.get(inner.exprName.text);
    return list?.asConst === true ? list : undefined;
}
function sameQuery(first, second) {
    const left = typescript_1.default.isParenthesizedTypeNode(first) ? first.type : first;
    const right = typescript_1.default.isParenthesizedTypeNode(second) ? second.type : second;
    return (typescript_1.default.isTypeQueryNode(left) &&
        typescript_1.default.isTypeQueryNode(right) &&
        typescript_1.default.isIdentifier(left.exprName) &&
        typescript_1.default.isIdentifier(right.exprName) &&
        left.exprName.text === right.exprName.text);
}
// `const SIZES = ['sm', 'md'] as const` and `const Tone = { Info: 'info' } as const`;
// without `as const` the list is still read, for the defaults that name its members.
function constListOf(declaration) {
    const initializer = declaration.initializer;
    if (initializer === undefined || !(declaration.parent.flags & typescript_1.default.NodeFlags.Const)) {
        return undefined;
    }
    const asserted = typescript_1.default.isAsExpression(initializer) ? initializer : undefined;
    const asConst = asserted !== undefined && typescript_1.default.isTypeReferenceNode(asserted.type) && typescript_1.default.isIdentifier(asserted.type.typeName) && asserted.type.typeName.text === 'const';
    if (asserted !== undefined && !asConst) {
        return undefined;
    }
    const value = asserted?.expression ?? initializer;
    if (typescript_1.default.isArrayLiteralExpression(value)) {
        const entries = [];
        for (const [index, element] of value.elements.entries()) {
            const literal = expressionLiteral(element);
            if (literal === undefined || index >= propModel_1.PROP_MODEL_LIMITS.optionsMax) {
                return undefined;
            }
            entries.push([String(index), literal]);
        }
        return { kind: 'array', asConst, entries };
    }
    if (typescript_1.default.isObjectLiteralExpression(value)) {
        const entries = [];
        for (const property of value.properties) {
            if (!typescript_1.default.isPropertyAssignment(property) || entries.length >= propModel_1.PROP_MODEL_LIMITS.optionsMax) {
                return undefined;
            }
            const key = memberKey(property.name);
            const literal = expressionLiteral(property.initializer);
            if (key === undefined || literal === undefined) {
                return undefined;
            }
            entries.push([key, literal]);
        }
        return { kind: 'object', asConst, entries };
    }
    return undefined;
}
/** The value a literal stands for: `'info'` is info, `3` is 3, `true` is true. */
function literalPartValue(literal) {
    switch (literal.form) {
        case 'string':
            return literal.value;
        case 'number':
            return Number(literal.text);
        case 'boolean':
            return literal.text === 'true';
        default: {
            const exhaustive = literal;
            return exhaustive;
        }
    }
}
/** A literal expression (`'sm'`, `3`, `-1`, `true`) as the type literal it stands for. */
function expressionLiteral(node) {
    if (typescript_1.default.isStringLiteral(node)) {
        return { form: 'string', value: node.text, text: node.getText() };
    }
    if (node.kind === typescript_1.default.SyntaxKind.TrueKeyword) {
        return { form: 'boolean', text: 'true' };
    }
    if (node.kind === typescript_1.default.SyntaxKind.FalseKeyword) {
        return { form: 'boolean', text: 'false' };
    }
    const text = node.getText();
    return (typescript_1.default.isNumericLiteral(node) || typescript_1.default.isPrefixUnaryExpression(node)) && NUMBER_LITERAL_RE.test(text) ? { form: 'number', text } : undefined;
}
