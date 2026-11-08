"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.renameComponentReferences = renameComponentReferences;
exports.renameComponentOptionValues = renameComponentOptionValues;
exports.bindComponentDefault = bindComponentDefault;
// Rename only parsed component attributes and Astro.props accesses. Text, CSS,
// unrelated components, and lexical aliases retain their original spelling.
const sync_1 = require("@astrojs/compiler/sync");
const typescript_1 = __importDefault(require("typescript"));
const propertyContracts_1 = require("./propertyContracts");
const assert_1 = require("../../shared/core/assert");
const propertyEditing_1 = require("../../shared/properties/propertyEditing");
const result_1 = require("../../shared/core/result");
const propertySyntax_1 = require("./propertySyntax");
function renameComponentReferences(source, names, rename, owner) {
    const typeNames = owner === 'definition' ? (0, propertyContracts_1.readPropertyContracts)((0, propertySyntax_1.readPropertySyntax)(source)).names : new Set();
    return editComponentReferences(source, names, { kind: 'rename', ...rename, typeNames: new Set(['Props', ...typeNames]) }, owner);
}
function renameComponentOptionValues(source, names, propertyName, renames) {
    const parsed = parseOptionRenames(renames);
    if (!parsed.ok) {
        return parsed;
    }
    const root = parseAstroRenameSource(source);
    if (!root.ok) {
        return root;
    }
    const edits = [];
    const pending = [root.value];
    for (let index = 0; index < pending.length; index += 1) {
        (0, assert_1.assert)(pending.length <= propertyEditing_1.PROPERTY_LIMITS.nodesMax, 'Astro option rename node budget');
        const node = pending[index];
        (0, assert_1.assert)(node !== undefined, 'Queued Astro option node exists');
        const result = renameNodeOptions(source, node, names, propertyName, parsed.value);
        if (!result.ok) {
            return result;
        }
        edits.push(...result.value);
        if ('children' in node) {
            if (node.type === 'element' && ['script', 'style'].includes(node.name)) {
                continue;
            }
            pending.push(...node.children);
        }
    }
    return (0, result_1.ok)((0, propertySyntax_1.applySourceEdits)(source, edits));
}
function parseAstroRenameSource(source) {
    try {
        const result = (0, sync_1.parse)(source, { position: true });
        const diagnostic = result.diagnostics.find((entry) => entry.severity === 1);
        return diagnostic ? (0, result_1.err)({ code: 'syntax', message: diagnostic.text }) : (0, result_1.ok)(result.ast);
    }
    catch (error) {
        return (0, result_1.err)({ code: 'syntax', message: String(error) });
    }
}
function parseOptionRenames(renames) {
    (0, assert_1.assert)(renames.length <= propertyEditing_1.PROPERTY_LIMITS.fieldsMax, 'Option rename count is bounded');
    const parsed = [];
    const sources = new Set();
    for (const rename of renames) {
        const from = optionScalar(rename.from);
        const to = optionScalar(rename.to);
        if (!from || !to) {
            return (0, result_1.err)({
                code: 'option',
                message: 'Option renames require literal values.',
            });
        }
        const key = optionScalarKey(from);
        if (sources.has(key)) {
            return (0, result_1.err)({
                code: 'option',
                message: 'An option value is renamed more than once.',
            });
        }
        sources.add(key);
        parsed.push({ from, to, replacement: rename.to });
    }
    return (0, result_1.ok)(parsed);
}
function renameNodeOptions(source, node, names, propertyName, renames) {
    if (!('attributes' in node) || node.type !== 'component' || !names.has(node.name)) {
        return (0, result_1.ok)([]);
    }
    const edits = [];
    for (const attribute of node.attributes) {
        const result = renameOptionAttribute(source, attribute, propertyName, renames);
        if (!result.ok) {
            return result;
        }
        edits.push(...result.value);
    }
    return (0, result_1.ok)(edits);
}
function renameOptionAttribute(source, attribute, propertyName, renames) {
    const start = offset(source, attribute);
    if (attribute.kind === 'spread') {
        return renameOptionSpread(source, attribute, propertyName, renames, start);
    }
    if (attribute.name !== propertyName) {
        return (0, result_1.ok)([]);
    }
    if (attribute.kind === 'quoted') {
        return renameQuotedOption(source, attribute, renames, start);
    }
    if (attribute.kind !== 'expression' && attribute.kind !== 'template-literal') {
        return (0, result_1.ok)([]);
    }
    const position = source.indexOf(attribute.value, start + attribute.name.length);
    if (position < 0) {
        return positionError();
    }
    return (0, result_1.ok)(renameOptionExpression(attribute.value, position, renames));
}
function renameQuotedOption(source, attribute, renames, start) {
    const rename = renames.find((entry) => entry.from.kind === 'string' && entry.from.value === attribute.value);
    if (!rename) {
        return (0, result_1.ok)([]);
    }
    const raw = attribute.raw;
    if (raw === undefined) {
        return positionError();
    }
    const position = source.indexOf(raw, start + attribute.name.length);
    if (position < 0) {
        return positionError();
    }
    const text = rename.to.kind === 'string' ? JSON.stringify(rename.to.value) : `{${rename.replacement}}`;
    return (0, result_1.ok)([{ start: position, end: position + raw.length, text }]);
}
function renameOptionSpread(source, attribute, propertyName, renames, position) {
    const prefix = 'const spread = (';
    const syntax = typescript_1.default.createSourceFile('spread.ts', prefix + attribute.name + ');', typescript_1.default.ScriptTarget.Latest, true, typescript_1.default.ScriptKind.TS);
    const object = (0, propertySyntax_1.syntaxNodes)(syntax).find(typescript_1.default.isObjectLiteralExpression);
    if (!object || optionSpreadIsDynamic(object)) {
        return (0, result_1.err)({
            code: 'spread',
            message: 'An instance uses a dynamic prop spread. ' + 'Make its props explicit before renaming this option.',
        });
    }
    const start = source.indexOf(attribute.name, Math.max(0, position - attribute.name.length - 4));
    if (start < 0 || start > position + attribute.name.length + 4) {
        return positionError();
    }
    const edits = [];
    for (const property of object.properties) {
        if (!typescript_1.default.isPropertyAssignment(property) || (0, propertySyntax_1.propertyKey)(property.name) !== propertyName) {
            continue;
        }
        edits.push(...renameOptionExpressionNode(property.initializer, start - prefix.length, renames));
    }
    return (0, result_1.ok)(edits);
}
function optionSpreadIsDynamic(object) {
    return object.properties.some((property) => typescript_1.default.isSpreadAssignment(property) || (property.name !== undefined && typescript_1.default.isComputedPropertyName(property.name)));
}
function renameOptionExpression(expression, start, renames) {
    const prefix = 'const value = (';
    const syntax = typescript_1.default.createSourceFile('option.ts', prefix + expression + ');', typescript_1.default.ScriptTarget.Latest, true, typescript_1.default.ScriptKind.TSX);
    const declaration = (0, propertySyntax_1.syntaxNodes)(syntax).find(typescript_1.default.isVariableDeclaration);
    const initializer = declaration?.initializer;
    (0, assert_1.assert)(initializer !== undefined, 'Option expression has an initializer');
    const value = typescript_1.default.isParenthesizedExpression(initializer) ? initializer.expression : initializer;
    return renameOptionExpressionNode(value, start - prefix.length, renames);
}
function renameOptionExpressionNode(expression, start, renames) {
    const edits = [];
    for (const node of (0, propertySyntax_1.syntaxNodes)(expression)) {
        if (typescript_1.default.isNumericLiteral(node) && typescript_1.default.isPrefixUnaryExpression(node.parent)) {
            continue;
        }
        const scalar = optionScalarNode(node);
        const rename = scalar ? renames.find((entry) => optionScalarKey(entry.from) === optionScalarKey(scalar)) : undefined;
        if (rename) {
            edits.push({
                start: start + node.getStart(),
                end: start + node.end,
                text: rename.replacement,
            });
        }
    }
    return edits;
}
function optionScalar(expression) {
    const prefix = 'const value = (';
    const syntax = typescript_1.default.createSourceFile('literal.ts', prefix + expression + ');', typescript_1.default.ScriptTarget.Latest, true, typescript_1.default.ScriptKind.TS);
    const declaration = (0, propertySyntax_1.syntaxNodes)(syntax).find(typescript_1.default.isVariableDeclaration);
    const initializer = declaration?.initializer;
    if (!initializer || !typescript_1.default.isParenthesizedExpression(initializer)) {
        return undefined;
    }
    return optionScalarNode(initializer.expression);
}
function optionScalarNode(node) {
    if (typescript_1.default.isStringLiteral(node) || typescript_1.default.isNoSubstitutionTemplateLiteral(node)) {
        return { kind: 'string', value: node.text };
    }
    if (typescript_1.default.isNumericLiteral(node)) {
        const value = Number(node.text);
        return Number.isFinite(value) ? { kind: 'number', value } : undefined;
    }
    if (typescript_1.default.isPrefixUnaryExpression(node) && node.operator === typescript_1.default.SyntaxKind.MinusToken) {
        const value = typescript_1.default.isNumericLiteral(node.operand) ? -Number(node.operand.text) : Number.NaN;
        return Number.isFinite(value) ? { kind: 'number', value } : undefined;
    }
    if (node.kind === typescript_1.default.SyntaxKind.TrueKeyword || node.kind === typescript_1.default.SyntaxKind.FalseKeyword) {
        return { kind: 'boolean', value: node.kind === typescript_1.default.SyntaxKind.TrueKeyword };
    }
    return undefined;
}
function optionScalarKey(value) {
    return `${value.kind}:${String(value.value)}`;
}
function bindComponentDefault(source, name, binding) {
    const document = (0, propertySyntax_1.readPropertySyntax)(source);
    const declaration = (0, propertySyntax_1.syntaxNodes)(document.syntax).find((node) => typescript_1.default.isVariableStatement(node) &&
        node.declarationList.declarations.some((item) => typescript_1.default.isObjectBindingPattern(item.name) && item.name.elements.some((element) => typescript_1.default.isIdentifier(element.name) && element.name.text === binding)));
    (0, assert_1.assert)(declaration !== undefined, 'A default has an Astro.props binding');
    const alias = defaultBindingName(source);
    return editComponentReferences(source, new Set(), {
        kind: 'default',
        from: name,
        binding: alias,
        local: binding,
        declarationEnd: document.start + declaration.end,
    }, 'definition');
}
function editComponentReferences(source, names, rename, owner) {
    let root;
    try {
        const result = (0, sync_1.parse)(source, { position: true });
        const diagnostic = result.diagnostics.find((entry) => entry.severity === 1);
        if (diagnostic) {
            return (0, result_1.err)({ code: 'syntax', message: diagnostic.text });
        }
        root = result.ast;
    }
    catch (error) {
        return (0, result_1.err)({ code: 'syntax', message: String(error) });
    }
    const edits = [];
    if (owner === 'definition') {
        const document = (0, propertySyntax_1.readPropertySyntax)(source);
        const result = renameAstroAccess(document.frontmatter, document.start, rename);
        if (!result.ok) {
            return result;
        }
        edits.push(...result.value);
    }
    const nodes = editAstroNodes(source, root, names, rename, owner);
    if (!nodes.ok) {
        return nodes;
    }
    edits.push(...nodes.value);
    if (rename.kind === 'default' && edits.length > 0) {
        if (edits.some((edit) => edit.start < rename.declarationEnd)) {
            return (0, result_1.err)({
                code: 'default-order',
                message: 'A prop read precedes its default. ' + 'Move the Astro.props binding before that read in source.',
            });
        }
        // A unique alias prevents a template loop variable from shadowing the defaulted prop.
        edits.push({
            start: rename.declarationEnd,
            end: rename.declarationEnd,
            text: `\nconst ${rename.binding} = ${rename.local};`,
        });
    }
    return (0, result_1.ok)((0, propertySyntax_1.applySourceEdits)(source, edits));
}
function editAstroNodes(source, root, names, rename, owner) {
    const edits = [];
    const pending = [{ node: root, expression: false }];
    for (let index = 0; index < pending.length; index += 1) {
        (0, assert_1.assert)(pending.length <= propertyEditing_1.PROPERTY_LIMITS.nodesMax, 'Astro rename node budget');
        const entry = pending[index];
        (0, assert_1.assert)(entry !== undefined, 'Queued Astro node exists');
        const result = renameNode(source, entry.node, names, rename, {
            owner,
            expression: entry.expression,
        });
        if (!result.ok) {
            return result;
        }
        edits.push(...result.value);
        if ('children' in entry.node) {
            if (entry.node.type === 'element' && ['script', 'style'].includes(entry.node.name)) {
                continue;
            }
            for (const child of entry.node.children) {
                pending.push({
                    node: child,
                    expression: entry.node.type === 'expression',
                });
            }
        }
    }
    return (0, result_1.ok)(edits);
}
function renameNode(source, node, names, rename, { owner, expression }) {
    const edits = [];
    if ('attributes' in node) {
        const target = rename.kind === 'rename' && node.type === 'component' && names.has(node.name);
        if (target && rename.kind === 'rename' && node.attributes.some((attribute) => attribute.name === rename.to)) {
            return (0, result_1.err)({
                code: 'collision',
                message: `An instance already passes ${rename.to}.`,
            });
        }
        for (const attribute of node.attributes) {
            if (target && rename.kind === 'rename') {
                const result = renameAttribute(source, attribute, rename);
                if (!result.ok) {
                    return result;
                }
                edits.push(...result.value);
            }
            if (owner === 'definition') {
                if (attribute.kind === 'expression' || attribute.kind === 'template-literal') {
                    const position = source.indexOf(attribute.value, offset(source, attribute));
                    if (position < 0) {
                        return positionError();
                    }
                    const result = renameAstroAccess(attribute.value, position, rename);
                    if (!result.ok) {
                        return result;
                    }
                    edits.push(...result.value);
                }
            }
        }
    }
    if (owner === 'definition' && expression && node.type === 'text') {
        const position = offset(source, node);
        if (source.slice(position, position + node.value.length) !== node.value) {
            return positionError();
        }
        return renameAstroAccess(node.value, position, rename);
    }
    return (0, result_1.ok)(edits);
}
function offset(source, node) {
    const position = node.position?.start.offset;
    (0, assert_1.assert)(position !== undefined, 'Astro parser supplies requested source positions');
    // Astro uses UTF-8 byte offsets; TypeScript and String.slice use UTF-16 offsets.
    (0, assert_1.assert)(position <= Buffer.byteLength(source), 'Astro source position is in bounds');
    return Buffer.from(source).subarray(0, position).toString('utf8').length;
}
function positionError() {
    return (0, result_1.err)({
        code: 'position',
        message: 'Could not locate a source range safely; no files changed.',
    });
}
function renameAttribute(source, attribute, rename) {
    const start = offset(source, attribute);
    if (attribute.kind === 'spread') {
        return renameSpread(source, attribute, rename, start);
    }
    if (attribute.name !== rename.from) {
        return (0, result_1.ok)([]);
    }
    if (source.slice(start, start + attribute.name.length) !== attribute.name) {
        return positionError();
    }
    if (attribute.kind === 'shorthand') {
        if (source[start - 1] !== '{' || source[start + attribute.name.length] !== '}') {
            return positionError();
        }
        return (0, result_1.ok)([
            {
                start: start - 1,
                end: start + attribute.name.length + 1,
                text: `${rename.to}={${rename.from}}`,
            },
        ]);
    }
    return (0, result_1.ok)([{ start, end: start + attribute.name.length, text: rename.to }]);
}
function renameSpread(source, attribute, rename, position) {
    const prefix = 'const spread = (';
    const object = literalSpreadObject(attribute.name, prefix);
    if (!object) {
        return (0, result_1.err)({
            code: 'spread',
            message: 'An instance uses a dynamic prop spread. ' + 'Make its props explicit before editing this property.',
        });
    }
    const start = source.indexOf(attribute.name, Math.max(0, position - attribute.name.length - 4));
    if (start < 0 || start > position + attribute.name.length + 4) {
        return positionError();
    }
    if (object.properties.some((property) => (0, propertySyntax_1.propertyKey)(property.name) === rename.to)) {
        return (0, result_1.err)({
            code: 'collision',
            message: `A spread already contains ${rename.to}.`,
        });
    }
    const edits = [];
    for (const property of object.properties) {
        if ((0, propertySyntax_1.propertyKey)(property.name) !== rename.from || !property.name) {
            continue;
        }
        const text = typescript_1.default.isShorthandPropertyAssignment(property)
            ? `${rename.to}: ${rename.from}`
            : typescript_1.default.isStringLiteral(property.name)
                ? JSON.stringify(rename.to)
                : rename.to;
        edits.push({
            start: start + property.name.getStart() - prefix.length,
            end: start + property.name.end - prefix.length,
            text,
        });
    }
    return (0, result_1.ok)(edits);
}
function literalSpreadObject(expression, prefix) {
    const syntax = typescript_1.default.createSourceFile('spread.ts', prefix + expression + ');', typescript_1.default.ScriptTarget.Latest, true, typescript_1.default.ScriptKind.TS);
    const nodes = (0, propertySyntax_1.syntaxNodes)(syntax);
    const object = nodes.find(typescript_1.default.isObjectLiteralExpression);
    const initializer = nodes.find(typescript_1.default.isVariableDeclaration)?.initializer;
    if (!object || !initializer || !typescript_1.default.isParenthesizedExpression(initializer)) {
        return undefined;
    }
    if (initializer.expression !== object || optionSpreadIsDynamic(object)) {
        return undefined;
    }
    return object;
}
function renameAstroAccess(source, start, rename) {
    const syntax = typescript_1.default.createSourceFile('expression.ts', source, typescript_1.default.ScriptTarget.Latest, true, typescript_1.default.ScriptKind.TSX);
    const edits = [];
    for (const node of (0, propertySyntax_1.syntaxNodes)(syntax)) {
        if (rename.kind === 'rename') {
            const typeEdit = renameIndexedPropType(node, start, rename, rename.typeNames);
            if (typeEdit) {
                edits.push(typeEdit);
            }
        }
        if (!(0, propertySyntax_1.isAstroProps)(node)) {
            continue;
        }
        // Wrappers are visited separately; only the outermost expression owns its consumer.
        if (typescript_1.default.isAsExpression(node.parent) || typescript_1.default.isParenthesizedExpression(node.parent)) {
            continue;
        }
        const parent = node.parent;
        if (typescript_1.default.isPropertyAccessExpression(parent)) {
            if (parent.name.text === rename.from) {
                edits.push(astroReferenceEdit(parent, parent.name, start, rename));
            }
        }
        else if (typescript_1.default.isElementAccessExpression(parent)) {
            if (!typescript_1.default.isStringLiteral(parent.argumentExpression)) {
                return (0, result_1.err)({
                    code: 'computed',
                    message: 'Astro.props has a computed key. ' + 'Make that access explicit before editing this property.',
                });
            }
            if (parent.argumentExpression.text === rename.from) {
                edits.push(astroReferenceEdit(parent, parent.argumentExpression, start, rename));
            }
        }
        else if (typescript_1.default.isVariableDeclaration(parent) && typescript_1.default.isObjectBindingPattern(parent.name)) {
            // The declaration editor already renamed keys and retained local aliases.
            continue;
        }
        else {
            return (0, result_1.err)({
                code: 'alias',
                message: 'Astro.props is forwarded or aliased. ' + 'Update that code explicitly before editing this property.',
            });
        }
    }
    return (0, result_1.ok)(edits);
}
function astroReferenceEdit(access, key, start, change) {
    if (change.kind === 'default') {
        return {
            start: start + access.getStart(),
            end: start + access.end,
            text: change.binding,
        };
    }
    return {
        start: start + key.getStart(),
        end: start + key.end,
        text: typescript_1.default.isStringLiteral(key) ? JSON.stringify(change.to) : change.to,
    };
}
function defaultBindingName(source) {
    for (let index = 0; index <= propertyEditing_1.PROPERTY_LIMITS.fieldsMax; index += 1) {
        const name = `_stackiDefault${index}`;
        if (!source.includes(name)) {
            return name;
        }
    }
    (0, assert_1.assert)(false, 'Default alias generation is bounded');
}
function renameIndexedPropType(node, start, rename, typeNames) {
    if (!typescript_1.default.isLiteralTypeNode(node) || !typescript_1.default.isStringLiteral(node.literal) || node.literal.text !== rename.from) {
        return undefined;
    }
    let parent = node.parent;
    if (typescript_1.default.isUnionTypeNode(parent)) {
        parent = parent.parent;
    }
    const indexed = typescript_1.default.isIndexedAccessTypeNode(parent) && typescript_1.default.isTypeReferenceNode(parent.objectType) && typeNames.has(parent.objectType.typeName.getText());
    const picked = typescript_1.default.isTypeReferenceNode(parent) && ['Pick', 'Omit'].includes(parent.typeName.getText()) && typeNames.has(parent.typeArguments?.[0]?.getText() ?? '');
    if (!indexed && !picked) {
        return undefined;
    }
    return {
        start: start + node.literal.getStart(),
        end: start + node.literal.end,
        text: JSON.stringify(rename.to),
    };
}
