"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createPropertyTypeReader = createPropertyTypeReader;
const typescript_1 = __importDefault(require("typescript"));
const assert_1 = require("../../shared/core/assert");
const propertyEditing_1 = require("../../shared/properties/propertyEditing");
const ALIAS_DEPTH_MAX = 64;
// Resolve local option aliases for visual controls without rewriting their declarations.
// Imported, generic, and recursive types retain their authored expression.
function createPropertyTypeReader(document) {
    const aliases = new Map();
    const duplicates = new Set();
    (0, assert_1.assert)(document.statements.length <= propertyEditing_1.PROPERTY_LIMITS.nodesMax, 'Type declarations are bounded');
    for (const statement of document.statements) {
        if (typescript_1.default.isTypeAliasDeclaration(statement)) {
            if (aliases.has(statement.name.text)) {
                duplicates.add(statement.name.text);
            }
            aliases.set(statement.name.text, statement);
        }
    }
    return (type) => readPropertyType(type, aliases, duplicates);
}
function readPropertyType(type, aliases, duplicates) {
    const work = [{ node: type, aliases: [] }];
    const values = [];
    for (let count = 0; count < propertyEditing_1.PROPERTY_LIMITS.nodesMax && work.length > 0; count++) {
        const item = work.pop();
        (0, assert_1.assert)(item !== undefined, 'A pending type node exists');
        const children = expandPropertyType(item, aliases, duplicates);
        if (children === undefined) {
            return type.getText();
        }
        if (children.length === 0) {
            values.push(item.node.getText());
        }
        else {
            work.push(...[...children].reverse());
        }
        if (work.length + values.length > propertyEditing_1.PROPERTY_LIMITS.fieldsMax) {
            return type.getText();
        }
    }
    if (work.length > 0) {
        return type.getText();
    }
    const resolved = values.join(' | ');
    return resolved.length <= propertyEditing_1.PROPERTY_LIMITS.textCharsMax ? resolved : type.getText();
}
function expandPropertyType(item, aliases, duplicates) {
    const node = item.node;
    if (typescript_1.default.isParenthesizedTypeNode(node)) {
        return [{ ...item, node: node.type }];
    }
    if (typescript_1.default.isUnionTypeNode(node)) {
        return node.types.map((child) => ({ ...item, node: child }));
    }
    if (typescript_1.default.isTypeReferenceNode(node) && typescript_1.default.isIdentifier(node.typeName)) {
        const name = node.typeName.text;
        const alias = aliases.get(name);
        if (!alias || alias.typeParameters || node.typeArguments || duplicates.has(name)) {
            return undefined;
        }
        if (item.aliases.includes(name) || item.aliases.length >= ALIAS_DEPTH_MAX) {
            return undefined;
        }
        return [{ node: alias.type, aliases: [...item.aliases, name] }];
    }
    if (typescript_1.default.isLiteralTypeNode(node)) {
        return [];
    }
    const primitives = [typescript_1.default.SyntaxKind.StringKeyword, typescript_1.default.SyntaxKind.NumberKeyword, typescript_1.default.SyntaxKind.BooleanKeyword];
    return primitives.includes(node.kind) ? [] : undefined;
}
