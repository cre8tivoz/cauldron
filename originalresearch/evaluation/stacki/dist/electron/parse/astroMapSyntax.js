"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.readMapSyntax = readMapSyntax;
// JavaScript owns callback syntax. Keep its statements verbatim and expose only
// JSX roots, so early returns and nested scopes never need to be rewritten.
//
// Astro is not JSX: a callback may return sibling elements with no wrapper,
// `(<Img /> <img />)`, and the serializer writes exactly that for a loop with
// several children. TypeScript reads such a run as elements chained by a
// zero-width comma and reports "JSX expressions must have one parent element".
// Every reader here accepts that run as markup; refusing it turned a loop the
// editor itself had written into an opaque code block.
const typescript_1 = __importDefault(require("typescript"));
const assert_1 = require("../../shared/core/assert");
const limits_1 = require("../../shared/core/limits");
function readMapSyntax(source) {
    if (!source.includes('map')) {
        if (!source.includes('flatMap')) {
            return undefined;
        }
    }
    (0, assert_1.assert)(source.length <= limits_1.LIMITS.ipcFieldCharsMax, 'Map source is bounded by its template');
    const syntax = mapSourceFile(source);
    if (syntax === undefined) {
        return undefined;
    }
    const statement = syntax.statements[0];
    if (!statement || !typescript_1.default.isExpressionStatement(statement)) {
        return undefined;
    }
    const call = unwrapExpression(statement.expression);
    if (!typescript_1.default.isCallExpression(call)) {
        return undefined;
    }
    const method = mapAccessName(call.expression);
    if (method !== 'map') {
        if (method !== 'flatMap') {
            return undefined;
        }
    }
    const argument = call.arguments[0];
    if (!argument) {
        return undefined;
    }
    const callback = unwrapExpression(argument);
    const body = typescript_1.default.isArrowFunction(callback) || typescript_1.default.isFunctionExpression(callback) ? callback.body : callback;
    const markup = mapMarkup(body, syntax);
    if (markup === undefined) {
        return undefined;
    }
    if (!mapDiagnosticsAccepted(syntax, markup, siblingRunSpans(body, syntax))) {
        return undefined;
    }
    const bodyStart = body.getStart(syntax) - 1;
    (0, assert_1.assert)(bodyStart >= 0, 'Callback body follows the synthetic opening parenthesis');
    if (bodyStart + 1 > limits_1.LIMITS.attrCharsMax) {
        return undefined;
    }
    const parts = [];
    let position = bodyStart;
    for (const span of markup) {
        (0, assert_1.assert)(span.start >= position, 'Callback markup roots are ordered and disjoint');
        parts.push(source.slice(position, span.start));
        position = span.end;
    }
    parts.push(source.slice(position) + '}');
    return {
        // Compact readers own map syntax only. Preserve flatMap's callback scopes
        // verbatim, including nested map calls that must not become the outer head.
        form: method === 'map' ? mapForm(callback, markup.length) : 'general',
        head: source.slice(0, bodyStart) + '(',
        parts,
        markup,
    };
}
function mapSourceFile(source) {
    // Parser recursion is a resource failure caused by external source. Only
    // that library call is caught; our own assertions must remain loud.
    try {
        return typescript_1.default.createSourceFile('callback.tsx', `(${source})`, typescript_1.default.ScriptTarget.Latest, true, typescript_1.default.ScriptKind.TSX);
    }
    catch (error) {
        if (error instanceof RangeError) {
            return undefined;
        }
        throw error;
    }
}
function mapForm(callback, markupCount) {
    if (!typescript_1.default.isArrowFunction(callback)) {
        return 'general';
    }
    if (typescript_1.default.isBlock(callback.body)) {
        return 'block';
    }
    const body = unwrapExpression(callback.body);
    if (isMarkup(body)) {
        return 'markup';
    }
    if (markupCount > 0 && conditionalMarkupCount(body, 0) === markupCount) {
        return 'conditional';
    }
    return 'general';
}
function conditionalMarkupCount(expression, depth) {
    if (depth >= limits_1.LIMITS.treeDepthMax) {
        return 0;
    }
    const node = unwrapExpression(expression);
    if (isJsxRoot(node)) {
        return 1;
    }
    const run = siblingRun(node);
    if (run !== undefined) {
        return run.length;
    }
    if (typescript_1.default.isConditionalExpression(node)) {
        return conditionalMarkupCount(node.whenTrue, depth + 1) + conditionalMarkupCount(node.whenFalse, depth + 1);
    }
    if (typescript_1.default.isBinaryExpression(node)) {
        if (node.operatorToken.kind === typescript_1.default.SyntaxKind.AmpersandAmpersandToken) {
            return conditionalMarkupCount(node.right, depth + 1);
        }
    }
    return 0;
}
function mapDiagnosticsAccepted(syntax, markup, runs) {
    // Astro allows HTML comments, raw scripts and sibling roots inside JSX.
    // TypeScript only owns the surrounding JavaScript; parseTemplate validates
    // every markup hole, so a diagnostic inside one root or one sibling run is
    // Astro syntax TypeScript does not know.
    const holes = [...markup, ...runs];
    const diagnostics = Reflect.get(syntax, 'parseDiagnostics');
    if (!Array.isArray(diagnostics) || diagnostics.length > limits_1.LIMITS.treeNodesMax) {
        return false;
    }
    return diagnostics.every((diagnostic) => {
        if (typeof diagnostic !== 'object' || diagnostic === null) {
            return false;
        }
        const start = Reflect.get(diagnostic, 'start');
        const length = Reflect.get(diagnostic, 'length');
        if (typeof start !== 'number' || typeof length !== 'number') {
            return false;
        }
        return holes.some((span) => start - 1 >= span.start && start + length - 1 <= span.end);
    });
}
function unwrapExpression(expression) {
    let current = expression;
    for (let depth = 0; depth <= limits_1.LIMITS.treeDepthMax; depth++) {
        if (!typescript_1.default.isParenthesizedExpression(current)) {
            return current;
        }
        current = current.expression;
    }
    return current;
}
function mapAccessName(expression) {
    if (typescript_1.default.isPropertyAccessExpression(expression)) {
        return expression.name.text;
    }
    if (typescript_1.default.isElementAccessExpression(expression)) {
        const name = expression.argumentExpression;
        if (typescript_1.default.isStringLiteral(name)) {
            return name.text;
        }
    }
    return undefined;
}
function mapMarkup(body, syntax) {
    const pending = [{ node: body, depth: 0 }];
    const roots = [];
    for (let index = 0; index < pending.length; index++) {
        const entry = pending[index];
        (0, assert_1.assert)(entry !== undefined, 'Syntax traversal index is in bounds');
        if (entry.depth > limits_1.LIMITS.treeDepthMax) {
            return undefined;
        }
        const node = entry.node;
        if (isJsxRoot(node)) {
            roots.push({ start: node.getStart(syntax) - 1, end: node.end - 1 });
        }
        else if (typescript_1.default.isExpression(node) && siblingRun(node) !== undefined) {
            // Each sibling is its own root; the whitespace between them becomes a
            // code part, so a general callback writes back exactly as it was read.
            for (const sibling of required(siblingRun(node))) {
                roots.push({ start: sibling.getStart(syntax) - 1, end: sibling.end - 1 });
            }
        }
        else {
            const overflow = node.forEachChild((child) => {
                if (pending.length === limits_1.LIMITS.treeNodesMax) {
                    return true;
                }
                pending.push({ node: child, depth: entry.depth + 1 });
                return undefined;
            });
            if (overflow) {
                return undefined;
            }
        }
    }
    (0, assert_1.assert)(roots.length <= limits_1.LIMITS.treeNodesMax, 'Markup roots are bounded by syntax nodes');
    return roots.sort((left, right) => left.start - right.start);
}
function isJsxRoot(node) {
    return typescript_1.default.isJsxElement(node) || typescript_1.default.isJsxSelfClosingElement(node) || typescript_1.default.isJsxFragment(node);
}
function isMarkup(expression) {
    if (isJsxRoot(expression)) {
        return true;
    }
    return siblingRun(expression) !== undefined;
}
// The elements of `<a /> <b /> <c />` as TypeScript recovers it: a right-leaning
// chain of comma expressions whose comma token has zero width, because no comma
// was written. A written comma, `(<a />, <b />)`, is a JavaScript sequence and
// is not a run.
function siblingRun(expression) {
    const siblings = [];
    let current = expression;
    for (let index = 0; index < limits_1.LIMITS.treeNodesMax; index++) {
        if (!typescript_1.default.isBinaryExpression(current)) {
            break;
        }
        if (current.operatorToken.kind !== typescript_1.default.SyntaxKind.CommaToken) {
            return undefined;
        }
        if (current.operatorToken.pos !== current.operatorToken.end) {
            return undefined;
        }
        if (!isJsxRoot(current.left)) {
            return undefined;
        }
        siblings.push(current.left);
        current = current.right;
    }
    if (siblings.length === 0) {
        return undefined;
    }
    if (!isJsxRoot(current)) {
        return undefined;
    }
    siblings.push(current);
    (0, assert_1.assert)(siblings.length >= 2, 'A sibling run has at least two roots');
    return siblings;
}
function siblingRunSpans(body, syntax) {
    const spans = [];
    const pending = [{ node: body, depth: 0 }];
    for (let index = 0; index < pending.length; index++) {
        const entry = pending[index];
        (0, assert_1.assert)(entry !== undefined, 'Sibling-run traversal index is in bounds');
        if (entry.depth > limits_1.LIMITS.treeDepthMax) {
            continue;
        }
        const run = typescript_1.default.isExpression(entry.node) ? siblingRun(entry.node) : undefined;
        if (run !== undefined) {
            const first = required(run[0]);
            const last = required(run[run.length - 1]);
            spans.push({ start: first.getStart(syntax) - 1, end: last.end - 1 });
        }
        else {
            entry.node.forEachChild((child) => {
                if (pending.length < limits_1.LIMITS.treeNodesMax) {
                    pending.push({ node: child, depth: entry.depth + 1 });
                }
            });
        }
    }
    return spans;
}
function required(value) {
    (0, assert_1.assert)(value !== undefined, 'A sibling run index is in bounds');
    return value;
}
