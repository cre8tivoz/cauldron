"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SCOPE_CAPTURE_LIMITS = void 0;
exports.frontmatterBindings = frontmatterBindings;
exports.scopeCaptureStatement = scopeCaptureStatement;
exports.withScopeCapture = withScopeCapture;
// What each file's frontmatter computed on its last render, kept for the
// binding picker (preview/markerConfig.ts, SCOPE_SOURCE, reads it back).
//
// A loop's list can come from anywhere: `await fetch(url).then((r) => r.json())`,
// a JSON import, `Astro.glob`, a CMS client's query, a literal. Running any of
// those again to see what it holds would repeat the page's network reads with
// arguments the editor would have to guess. The render has already run them,
// with the right arguments, for the canvas. So the marked copy of each file
// (previewMarkers.ts) ends its frontmatter with one statement that files the
// file's own top-level bindings under its path: an object of getters, so the
// statement reads nothing and calls nothing while the page renders. A value is
// only read, and then sampled, when the editor asks for it.
//
// The record lives in the dev server's memory, bounded by a file count, and
// one render's record replaces the last. Nothing is written anywhere, nothing
// is fetched, and the project's own build never sees the statement: only the
// in-memory marked module carries it.
//
// It runs inside the project's dev server, a plain Node process, so like the
// marker module it requires only what is unpacked beside the archive.
const typescript_1 = __importDefault(require("typescript"));
const assert_1 = require("../../shared/core/assert");
const previewScope_1 = require("../../shared/page/previewScope");
exports.SCOPE_CAPTURE_LIMITS = {
    // The record's own bound on names (shared/page/previewScope.ts).
    bindingsMax: previewScope_1.PREVIEW_SCOPE_LIMITS.namesMax,
    // A frontmatter longer than this is not parsed for its bindings.
    frontmatterCharsMax: 200_000,
    // Destructuring patterns nest; deeper than this is not a page's frontmatter.
    patternDepthMax: 16,
};
const IDENTIFIER = /^[A-Za-z_$][\w$]*$/;
// Modules whose imports are markup or styles, never data a loop goes through.
const NON_DATA_MODULE = /\.(?:astro|css|scss|sass|less|styl|stylus|pcss|postcss)(?:\?.*)?$/i;
// The local the capture statement holds the record in: one no page names.
const STORE_LOCAL = '__stackiScope';
/**
 * The names `frontmatter` binds at its top level and that hold values: its
 * `const`/`let`/`var` declarations (destructured names included) and its value
 * imports. Type-only names, ambient declarations, functions and classes are
 * left out: a type has no value to read, and code is not data.
 */
function frontmatterBindings(frontmatter) {
    if (exports.SCOPE_CAPTURE_LIMITS.frontmatterCharsMax < frontmatter.length) {
        return [];
    }
    const file = parseFrontmatter(frontmatter);
    if (file === undefined) {
        return [];
    }
    const names = new Set();
    for (const statement of file.statements) {
        if (exports.SCOPE_CAPTURE_LIMITS.bindingsMax <= names.size) {
            break;
        }
        if (typescript_1.default.isImportDeclaration(statement)) {
            importBindings(statement, names);
        }
        else if (typescript_1.default.isVariableStatement(statement)) {
            variableBindings(statement, names);
        }
    }
    const bindings = [...names].filter((name) => IDENTIFIER.test(name) && name !== STORE_LOCAL).slice(0, exports.SCOPE_CAPTURE_LIMITS.bindingsMax);
    (0, assert_1.assert)(bindings.length <= exports.SCOPE_CAPTURE_LIMITS.bindingsMax, 'Captured bindings are bounded');
    return bindings;
}
/**
 * The statement that files `names` under `file` when the frontmatter reaches
 * its end. One line, opened with `;` so a last statement written without one
 * cannot run into it, and wrapped in a block so its one local stays its own.
 */
function scopeCaptureStatement(file, names) {
    (0, assert_1.assert)(names.length > 0, 'A capture names at least one binding');
    (0, assert_1.assert)(names.length <= exports.SCOPE_CAPTURE_LIMITS.bindingsMax, 'A capture names a bounded number of bindings');
    for (const name of names) {
        (0, assert_1.assert)(IDENTIFIER.test(name), 'A captured binding is an identifier');
        (0, assert_1.assert)(name !== STORE_LOCAL, 'A captured binding is not the capture’s own local');
    }
    const key = JSON.stringify(previewScope_1.SCOPE_STORE_KEY);
    const target = JSON.stringify(file);
    const getters = names.map((name) => `get ${name}(){return ${name}}`).join(',');
    // Delete before set: a Map iterates in insertion order, so the file rendered
    // longest ago is the first key, and that is the one dropped past the bound.
    return (`;{const ${STORE_LOCAL}=globalThis[Symbol.for(${key})]||(globalThis[Symbol.for(${key})]=new Map());` +
        `${STORE_LOCAL}.delete(${target});${STORE_LOCAL}.set(${target},{at:Date.now(),values:{${getters}}});` +
        `if(${STORE_LOCAL}.size>${previewScope_1.PREVIEW_SCOPE_LIMITS.filesMax}){${STORE_LOCAL}.delete(${STORE_LOCAL}.keys().next().value)}}`);
}
/**
 * `marked` (a marked .astro module, which always opens with its frontmatter
 * fence) with the capture statement as the frontmatter's last line, or
 * `marked` unchanged when its frontmatter binds nothing.
 */
function withScopeCapture(marked, file) {
    const fence = /\r?\n---\r?\n/.exec(marked.slice(3));
    if (!marked.startsWith('---') || fence === null) {
        return marked;
    }
    const close = 3 + fence.index;
    const names = frontmatterBindings(marked.slice(3, close));
    if (names.length === 0) {
        return marked;
    }
    const statement = scopeCaptureStatement(file, names);
    const captured = `${marked.slice(0, close)}\n${statement}${marked.slice(close)}`;
    (0, assert_1.assert)(captured.startsWith('---'), 'The capture leaves the frontmatter fence first');
    (0, assert_1.assert)(captured.length === marked.length + statement.length + 1, 'The capture only adds its own line');
    return captured;
}
function parseFrontmatter(frontmatter) {
    // Parser recursion is a resource failure caused by project source. Only
    // that library call is caught; our own assertions must remain loud.
    try {
        return typescript_1.default.createSourceFile('frontmatter.ts', frontmatter, typescript_1.default.ScriptTarget.Latest, false, typescript_1.default.ScriptKind.TS);
    }
    catch (error) {
        if (error instanceof RangeError) {
            return undefined;
        }
        throw error;
    }
}
function importBindings(statement, names) {
    const clause = statement.importClause;
    const from = typescript_1.default.isStringLiteral(statement.moduleSpecifier) ? statement.moduleSpecifier.text : '';
    if (clause === undefined || clause.isTypeOnly || NON_DATA_MODULE.test(from)) {
        return;
    }
    if (clause.name !== undefined) {
        names.add(clause.name.text);
    }
    const named = clause.namedBindings;
    if (named === undefined) {
        return;
    }
    if (typescript_1.default.isNamespaceImport(named)) {
        names.add(named.name.text);
        return;
    }
    for (const element of named.elements) {
        if (!element.isTypeOnly) {
            names.add(element.name.text);
        }
    }
}
function variableBindings(statement, names) {
    const ambient = (typescript_1.default.getModifiers(statement) ?? []).some((modifier) => modifier.kind === typescript_1.default.SyntaxKind.DeclareKeyword);
    if (ambient) {
        return;
    }
    for (const declaration of statement.declarationList.declarations) {
        bindingNames(declaration.name, names, 0);
    }
}
// Every name a binding pattern introduces: `{ data: { items }, ...rest }`
// binds `items` and `rest`.
function bindingNames(name, names, depth) {
    (0, assert_1.assert)(depth <= exports.SCOPE_CAPTURE_LIMITS.patternDepthMax, 'Binding patterns nest within their bound');
    if (typescript_1.default.isIdentifier(name)) {
        names.add(name.text);
        return;
    }
    for (const element of name.elements) {
        if (typescript_1.default.isBindingElement(element)) {
            if (depth < exports.SCOPE_CAPTURE_LIMITS.patternDepthMax) {
                bindingNames(element.name, names, depth + 1);
            }
        }
    }
}
