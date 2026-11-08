"use strict";
// How a component reads its props, on the TypeScript syntax tree of its
// frontmatter (and, for the template, its `Astro.props.x` reads): every
// destructure of `Astro.props` (or of a name that holds it, `const props =
// Astro.props`) with each entry's default, the names it reads directly, the
// `const x = xProp ?? "literal"` fallbacks, and whether the props object
// escapes whole (`{...Astro.props}`), which makes "unread" unknowable.
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.readProps = readProps;
exports.entryFallback = entryFallback;
exports.literalValue = literalValue;
exports.nullishFallbacks = nullishFallbacks;
const typescript_1 = __importDefault(require("typescript"));
const assert_1 = require("../../../shared/core/assert");
const limits_1 = require("../../../shared/core/limits");
const astroSyntax_1 = require("../astroSyntax");
const propTypes_1 = require("./propTypes");
// A component reads its props in a handful of places; past this many reads the rest are not listed.
const READS_MAX = 512;
function readProps(frontmatter, template) {
    const nodes = [...(0, astroSyntax_1.syntaxNodes)(frontmatter)].sort((first, second) => first.pos - second.pos || second.end - first.end);
    const holders = new Set();
    for (const node of nodes) {
        if (typescript_1.default.isVariableDeclaration(node) && typescript_1.default.isIdentifier(node.name) && (0, astroSyntax_1.isAstroProps)(node.initializer)) {
            holders.add(node.name.text);
        }
    }
    const patterns = [];
    const direct = [];
    let escapes = false;
    for (const node of nodes) {
        const use = propsUse(node, holders);
        if (use === undefined) {
            continue;
        }
        const outer = unwrapped(node);
        const parent = outer.parent;
        if (typescript_1.default.isPropertyAccessExpression(parent) && parent.expression === outer) {
            pushBounded(direct, parent.name.text);
        }
        else if (typescript_1.default.isElementAccessExpression(parent) && parent.expression === outer && typescript_1.default.isStringLiteralLike(parent.argumentExpression)) {
            pushBounded(direct, parent.argumentExpression.text);
        }
        else if (typescript_1.default.isVariableDeclaration(parent) && parent.initializer === outer && typescript_1.default.isObjectBindingPattern(parent.name)) {
            patterns.push({ pattern: parent.name, annotation: parent.type });
            escapes ||= parent.name.elements.some((element) => element.dotDotDotToken !== undefined);
        }
        else if (typescript_1.default.isVariableDeclaration(parent) && parent.initializer === outer && typescript_1.default.isIdentifier(parent.name) && use === 'astro') {
            // `const props = Astro.props`: the holder's own reads are found above.
        }
        else {
            escapes = true;
        }
    }
    const templateUse = templateReads(template, holders);
    const entries = destructureEntries(patterns, frontmatter);
    (0, assert_1.assert)(entries.length <= limits_1.LIMITS.propSchemaFieldsMax, 'readProps: entries are bounded');
    return { patterns, entries, direct: [...direct, ...templateUse.direct].slice(0, READS_MAX), escapes: escapes || templateUse.escapes };
}
function pushBounded(out, name) {
    if (out.length < READS_MAX && name !== '') {
        out.push(name);
    }
}
// Whether a node is `Astro.props` itself, or a name that holds it.
function propsUse(node, holders) {
    if (typescript_1.default.isPropertyAccessExpression(node) && typescript_1.default.isIdentifier(node.expression) && node.expression.text === 'Astro' && node.name.text === 'props') {
        return 'astro';
    }
    if (!typescript_1.default.isIdentifier(node) || !holders.has(node.text)) {
        return undefined;
    }
    const parent = node.parent;
    // The holder's own declaration, and a member name that happens to match, are not uses.
    if (typescript_1.default.isVariableDeclaration(parent) && parent.name === node) {
        return undefined;
    }
    if (typescript_1.default.isPropertyAccessExpression(parent) && parent.name === node) {
        return undefined;
    }
    if (typescript_1.default.isBindingElement(parent) || typescript_1.default.isPropertyAssignment(parent) || typescript_1.default.isPropertySignature(parent)) {
        return undefined;
    }
    return 'holder';
}
// `(Astro.props as Props)` reads as Astro.props: wrappers are looked through, a bounded few.
const WRAPPERS_MAX = 16;
function unwrapped(node) {
    let current = node;
    for (let step = 0; step < WRAPPERS_MAX; step++) {
        const parent = current.parent;
        if (typescript_1.default.isParenthesizedExpression(parent) || typescript_1.default.isAsExpression(parent) || typescript_1.default.isSatisfiesExpression(parent) || typescript_1.default.isNonNullExpression(parent)) {
            current = parent;
        }
        else {
            break;
        }
    }
    return current;
}
function destructureEntries(patterns, file) {
    const entries = new Map();
    for (const { pattern } of patterns) {
        for (const element of pattern.elements) {
            if (element.dotDotDotToken !== undefined || entries.size >= limits_1.LIMITS.propSchemaFieldsMax) {
                continue;
            }
            const name = (0, propTypes_1.memberKey)(element.propertyName ?? element.name);
            if (name === undefined || entries.has(name)) {
                continue;
            }
            entries.set(name, { name, fallback: element.initializer === undefined ? { kind: 'none' } : entryFallback(element.initializer, file) });
        }
    }
    return [...entries.values()];
}
/** What a default's code says: a literal is its value, anything else stays code. */
function entryFallback(initializer, file) {
    const literal = literalValue(initializer);
    if (literal !== undefined) {
        return { kind: 'literal', value: literal };
    }
    const code = initializer.getText(file);
    const inner = typescript_1.default.isParenthesizedExpression(initializer) ? initializer.expression : initializer;
    if (typescript_1.default.isArrayLiteralExpression(inner)) {
        return { kind: 'expression', code, shape: 'array' };
    }
    if (typescript_1.default.isObjectLiteralExpression(inner)) {
        return { kind: 'expression', code, shape: 'object' };
    }
    if (typescript_1.default.isArrowFunction(inner) || typescript_1.default.isFunctionExpression(inner)) {
        return { kind: 'expression', code, shape: 'function' };
    }
    return { kind: 'expression', code, shape: 'other' };
}
/**
 * A literal expression's value: a whole string (a template only when it has no
 * `${}`: `` `${SITE}:` `` is an expression), `true`/`false`, or a number in any
 * of the ways JS writes one (`-2`, `0.5`, `1e3`, `0x10`, `1_000`).
 */
function literalValue(node) {
    if (typescript_1.default.isStringLiteral(node) || typescript_1.default.isNoSubstitutionTemplateLiteral(node)) {
        return node.text;
    }
    if (node.kind === typescript_1.default.SyntaxKind.TrueKeyword) {
        return true;
    }
    if (node.kind === typescript_1.default.SyntaxKind.FalseKeyword) {
        return false;
    }
    if (typescript_1.default.isNumericLiteral(node)) {
        const value = Number(node.text);
        return Number.isFinite(value) ? value : undefined;
    }
    if (typescript_1.default.isPrefixUnaryExpression(node) && node.operator === typescript_1.default.SyntaxKind.MinusToken && typescript_1.default.isNumericLiteral(node.operand)) {
        const value = -Number(node.operand.text);
        return Number.isFinite(value) ? value : undefined;
    }
    return undefined;
}
// The template's reads: `Astro.props.label`, `Astro.props["label"]`, and a
// holder's `props.label`. The template is markup, not TypeScript, so it is
// read as text; any other mention of the props object (`{...Astro.props}`)
// is an escape. A name read as a member (`item.props`) is not a mention.
function templateReads(template, holders) {
    const direct = [];
    let escapes = false;
    const owners = ['Astro\\.props', ...[...holders].map((name) => name.replace(/\$/g, '\\$'))];
    const mention = new RegExp(String.raw `(?<![\w$])(?<![^.]\.)(?:${owners.join('|')})(?![\w$])(\s*\.\s*([A-Za-z_$][\w$]*)|\s*\[\s*(?:"([^"\n]+)"|'([^'\n]+)')\s*\])?`, 'g');
    let reads = 0;
    for (const match of template.matchAll(mention)) {
        reads++;
        if (reads > READS_MAX) {
            break;
        }
        const name = match[2] ?? match[3] ?? match[4];
        if (name === undefined) {
            escapes = true;
        }
        else {
            pushBounded(direct, name);
        }
    }
    return { direct, escapes };
}
/**
 * The literals renamed props fall back to, by the name declared:
 * `const alt = altProp ?? ""`, `const year = Astro.props.year ?? 2026`. The
 * first such declaration of each name in the frontmatter; read once per file.
 */
function nullishFallbacks(frontmatter) {
    const out = new Map();
    const declarations = (0, astroSyntax_1.syntaxNodes)(frontmatter)
        .filter(typescript_1.default.isVariableDeclaration)
        .sort((first, second) => first.pos - second.pos);
    for (const declaration of declarations) {
        const initializer = declaration.initializer;
        if (!typescript_1.default.isIdentifier(declaration.name) || (declaration.parent.flags & (typescript_1.default.NodeFlags.Const | typescript_1.default.NodeFlags.Let)) === 0 || out.has(declaration.name.text)) {
            continue;
        }
        if (initializer === undefined || !typescript_1.default.isBinaryExpression(initializer) || initializer.operatorToken.kind !== typescript_1.default.SyntaxKind.QuestionQuestionToken) {
            continue;
        }
        const value = isNameChain(initializer.left) ? literalValue(initializer.right) : undefined;
        if (value !== undefined) {
            out.set(declaration.name.text, value);
        }
    }
    (0, assert_1.assert)(out.size <= declarations.length, 'nullishFallbacks: one fallback per declaration at most');
    return out;
}
// `altProp`, `props.alt`, `Astro.props.alt`: a name or a chain of member reads.
const CHAIN_DEPTH_MAX = 8;
function isNameChain(node) {
    let current = node;
    for (let depth = 0; depth < CHAIN_DEPTH_MAX; depth++) {
        if (typescript_1.default.isIdentifier(current)) {
            return true;
        }
        if (!typescript_1.default.isPropertyAccessExpression(current)) {
            return false;
        }
        current = current.expression;
    }
    return false;
}
