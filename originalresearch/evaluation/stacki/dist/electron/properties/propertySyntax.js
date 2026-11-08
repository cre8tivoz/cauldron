"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.syntaxNodes = exports.isAstroProps = void 0;
exports.readPropertySyntax = readPropertySyntax;
exports.replaceFrontmatter = replaceFrontmatter;
exports.applySourceEdits = applySourceEdits;
exports.syntaxError = syntaxError;
exports.validatePropertyCode = validatePropertyCode;
exports.propertyKey = propertyKey;
exports.defaultExpression = defaultExpression;
// TypeScript owns syntax; source-range edits retain code outside the edited declaration.
const typescript_1 = __importDefault(require("typescript"));
const assert_1 = require("../../shared/core/assert");
const propertyEditing_1 = require("../../shared/properties/propertyEditing");
const result_1 = require("../../shared/core/result");
const astroSyntax_1 = require("../parse/astroSyntax");
Object.defineProperty(exports, "isAstroProps", { enumerable: true, get: function () { return astroSyntax_1.isAstroProps; } });
Object.defineProperty(exports, "syntaxNodes", { enumerable: true, get: function () { return astroSyntax_1.syntaxNodes; } });
function readPropertySyntax(source) {
    (0, assert_1.assert)(source.length <= propertyEditing_1.PROPERTY_LIMITS.sourceCharsMax, 'Component source is bounded');
    const match = /^(?:\uFEFF)?---[^\S\r\n]*\r?\n([\s\S]*?)^---[^\S\r\n]*(?:\r?\n|$)/m.exec(source);
    const found = match?.index === 0 ? match : undefined;
    const frontmatter = found?.[1] ?? '';
    const start = found ? found[0].indexOf('\n') + 1 : 0;
    (0, assert_1.assert)(start >= 0, 'Frontmatter starts inside source');
    return {
        source,
        start,
        end: start + frontmatter.length,
        frontmatter,
        syntax: typescript_1.default.createSourceFile('component.ts', frontmatter, typescript_1.default.ScriptTarget.Latest, true, typescript_1.default.ScriptKind.TS),
    };
}
function replaceFrontmatter(document, frontmatter) {
    (0, assert_1.assert)(document.end <= document.source.length, 'Frontmatter ends inside source');
    (0, assert_1.assert)(frontmatter.length <= propertyEditing_1.PROPERTY_LIMITS.sourceCharsMax, 'New frontmatter is bounded');
    if (document.start === 0) {
        return `---\n${frontmatter}\n---\n${document.source}`;
    }
    return document.source.slice(0, document.start) + frontmatter + document.source.slice(document.end);
}
function applySourceEdits(source, edits) {
    (0, assert_1.assert)(edits.length <= propertyEditing_1.PROPERTY_LIMITS.nodesMax, 'Source edits are bounded');
    // The owning edit pass mutates only its local output; callers retain their original source.
    let output = source;
    let boundary = source.length;
    for (const edit of [...edits].sort((first, second) => second.start - first.start)) {
        (0, assert_1.assert)(edit.start >= 0, 'Source edit starts inside source');
        (0, assert_1.assert)(edit.end >= edit.start, 'Source edit has a positive range');
        (0, assert_1.assert)(edit.end <= boundary, 'Source edits never overlap');
        output = output.slice(0, edit.start) + edit.text + output.slice(edit.end);
        boundary = edit.start;
    }
    return output;
}
function syntaxError(source) {
    const result = typescript_1.default.transpileModule(source, {
        reportDiagnostics: true,
        compilerOptions: {
            target: typescript_1.default.ScriptTarget.ESNext,
            module: typescript_1.default.ModuleKind.ESNext,
            isolatedModules: true,
            jsx: typescript_1.default.JsxEmit.Preserve,
        },
    });
    const diagnostic = result.diagnostics?.find((item) => item.category === typescript_1.default.DiagnosticCategory.Error);
    return diagnostic ? typescript_1.default.flattenDiagnosticMessageText(diagnostic.messageText, '\n') : undefined;
}
function validatePropertyCode(type, expression) {
    if (!type.trim()) {
        return (0, result_1.err)({ code: 'type', message: 'Enter a TypeScript type.' });
    }
    const typeSource = `type PropertyType = ${type};`;
    const typeFile = typescript_1.default.createSourceFile('type.ts', typeSource, typescript_1.default.ScriptTarget.Latest, true);
    const declaration = typeFile.statements[0];
    if (typeFile.statements.length !== 1 || !declaration || !typescript_1.default.isTypeAliasDeclaration(declaration)) {
        return (0, result_1.err)({ code: 'type', message: 'Enter one TypeScript type, without declarations.' });
    }
    const typeError = syntaxError(typeSource);
    if (typeError) {
        return (0, result_1.err)({ code: 'type', message: typeError });
    }
    if (expression.trim()) {
        const expressionSource = `const value = (${expression});`;
        const expressionFile = typescript_1.default.createSourceFile('default.ts', expressionSource, typescript_1.default.ScriptTarget.Latest, true, typescript_1.default.ScriptKind.TS);
        if (expressionFile.statements.length !== 1) {
            return (0, result_1.err)({
                code: 'default',
                message: 'Enter one default expression, without declarations.',
            });
        }
        const expressionError = syntaxError(expressionSource);
        if (expressionError) {
            return (0, result_1.err)({ code: 'default', message: expressionError });
        }
    }
    return (0, result_1.ok)(undefined);
}
function propertyKey(node) {
    if (!node) {
        return undefined;
    }
    if (typescript_1.default.isIdentifier(node) || typescript_1.default.isStringLiteral(node)) {
        return node.text;
    }
    return undefined;
}
function defaultExpression(source) {
    const syntax = typescript_1.default.createSourceFile('default.ts', `const value = (${source});`, typescript_1.default.ScriptTarget.Latest, true, typescript_1.default.ScriptKind.TS);
    const comma = (0, astroSyntax_1.syntaxNodes)(syntax).some((node) => typescript_1.default.isBinaryExpression(node) && node.operatorToken.kind === typescript_1.default.SyntaxKind.CommaToken);
    return comma ? `(${source})` : source;
}
