"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.readPropertyOrigins = readPropertyOrigins;
const typescript_1 = __importDefault(require("typescript"));
const assert_1 = require("../../shared/core/assert");
const propertyEditing_1 = require("../../shared/properties/propertyEditing");
const propertySyntax_1 = require("./propertySyntax");
// Trace only the prop contract graph: similarly named fields in unrelated objects are not sources.
// Props is authoritative; a widened Astro.props assertion supplies missing fields only.
function readPropertyOrigins(document) {
    const declarations = new Map();
    for (const statement of document.syntax.statements) {
        if (typescript_1.default.isInterfaceDeclaration(statement) || typescript_1.default.isTypeAliasDeclaration(statement)) {
            declarations.set(statement.name.text, statement);
        }
    }
    const roots = [
        'Props',
        ...(0, propertySyntax_1.syntaxNodes)(document.syntax)
            .filter(typescript_1.default.isAsExpression)
            .filter((node) => node.expression.getText() === 'Astro.props')
            .map((node) => node.type.getText()),
    ];
    const members = new Map();
    const sources = new Map();
    (0, assert_1.assert)(roots.length <= propertyEditing_1.PROPERTY_LIMITS.nodesMax, 'Property origin roots are bounded');
    for (const root of new Set(roots)) {
        const found = readOriginMembers(declarations.get(root), declarations);
        for (const [name, entries] of found) {
            if (!members.has(name)) {
                members.set(name, entries.map((entry) => entry.member));
                sources.set(name, entries.map((entry) => originSource(document, entry.member, `${entry.owner}.${name}`, entry.member.type?.getText() ?? 'unknown')));
            }
        }
    }
    (0, assert_1.assert)(members.size <= propertyEditing_1.PROPERTY_LIMITS.fieldsMax, 'Property origin fields are bounded');
    return {
        members,
        origin: (name, binding) => ({
            declarations: sources.get(name) ?? [],
            ...(binding?.initializer
                ? {
                    defaultValue: originSource(document, binding, `Astro.props.${name}`, binding.initializer.getText()),
                }
                : {}),
        }),
    };
}
function readOriginMembers(root, declarations) {
    const work = root ? [{ node: root, owner: root.name.text }] : [];
    const seen = new Set();
    const members = new Map();
    for (let count = 0; count < propertyEditing_1.PROPERTY_LIMITS.nodesMax && work.length > 0; count++) {
        const item = work.pop();
        (0, assert_1.assert)(item !== undefined, 'A property origin work item exists');
        if (seen.has(item.node)) {
            continue;
        }
        seen.add(item.node);
        if (typescript_1.default.isPropertySignature(item.node)) {
            const name = (0, propertySyntax_1.propertyKey)(item.node.name);
            if (name) {
                const previous = members.get(name) ?? [];
                (0, assert_1.assert)(previous.length < propertyEditing_1.PROPERTY_LIMITS.fieldsMax, 'Property source count is bounded');
                members.set(name, [...previous, { member: item.node, owner: item.owner }]);
            }
        }
        else {
            work.push(...originChildren(item, declarations).reverse());
            (0, assert_1.assert)(work.length <= propertyEditing_1.PROPERTY_LIMITS.nodesMax, 'Property origin queue is bounded');
        }
    }
    (0, assert_1.assert)(work.length === 0, 'Property origin traversal completes within bounds');
    return members;
}
function originChildren(item, declarations) {
    const { node, owner } = item;
    if (typescript_1.default.isTypeAliasDeclaration(node)) {
        return [{ node: node.type, owner: node.name.text }];
    }
    if (typescript_1.default.isInterfaceDeclaration(node)) {
        return [
            ...node.members.map((member) => ({ node: member, owner: node.name.text })),
            ...(node.heritageClauses ?? []).flatMap((clause) => clause.types).flatMap((type) => originReference(type.expression.getText(), declarations)),
        ];
    }
    if (typescript_1.default.isTypeLiteralNode(node)) {
        return node.members.map((member) => ({ node: member, owner }));
    }
    if (typescript_1.default.isUnionTypeNode(node) || typescript_1.default.isIntersectionTypeNode(node)) {
        return node.types.map((type) => ({ node: type, owner }));
    }
    if (typescript_1.default.isParenthesizedTypeNode(node)) {
        return [{ node: node.type, owner }];
    }
    if (typescript_1.default.isTypeReferenceNode(node)) {
        // Generic transformations can rename or omit fields; do not invent per-field provenance.
        return node.typeArguments ? [] : originReference(node.typeName.getText(), declarations);
    }
    return [];
}
function originReference(name, declarations) {
    const declaration = declarations.get(name);
    return declaration ? [{ node: declaration, owner: name }] : [];
}
function originSource(document, node, label, expression) {
    const offset = node.getStart(document.syntax);
    (0, assert_1.assert)(offset >= 0, 'Property source offset is nonnegative');
    (0, assert_1.assert)(offset <= document.frontmatter.length, 'Property source offset is inside frontmatter');
    return {
        label,
        expression,
        line: document.syntax.getLineAndCharacterOfPosition(offset).line + document.source.slice(0, document.start).split('\n').length,
    };
}
