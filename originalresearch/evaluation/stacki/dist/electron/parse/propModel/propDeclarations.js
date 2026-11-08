"use strict";
// Where a component declares its props, read on the TypeScript syntax tree:
// the `Props` interface or alias (or the type `Astro.props as X` names, or a
// destructure's own annotation), the member blocks it is made of with local
// aliases and interfaces followed, each member's doc comment, and the unions
// of prop shapes it declares (`{ kind: 'link'; href: string } | { kind:
// 'button' }`), which the instance panel weighs one branch at a time.
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.readPropsType = readPropsType;
exports.memberDocumentation = memberDocumentation;
exports.splitFallbacks = splitFallbacks;
const typescript_1 = __importDefault(require("typescript"));
const assert_1 = require("../../../shared/core/assert");
const propModel_1 = require("../../../shared/properties/propModel");
const astroSyntax_1 = require("../astroSyntax");
const propProse_1 = require("./propProse");
const propTypes_1 = require("./propTypes");
/** The props type of a component: frontmatter first, then the imported declarations. */
function readPropsType(frontmatter, prelude, scope, patterns) {
    const declared = propsDeclaration(frontmatter) ?? propsDeclaration(prelude);
    const asserted = assertedType(frontmatter);
    const blocks = [];
    const unions = [];
    if (declared !== undefined) {
        if (typescript_1.default.isInterfaceDeclaration(declared.node)) {
            for (const clause of declared.node.heritageClauses ?? []) {
                for (const heritage of clause.types) {
                    heritageBlocks(heritage, scope, new Set(), blocks);
                }
            }
            blocks.push(declared.node.members.filter(typescript_1.default.isPropertySignature).map((member) => ({ member, file: declared.file })));
        }
        else {
            typeBlocks(declared.node.type, declared.file, scope, new Set(), blocks);
            collectUnions(declared.node.type, declared.file, scope, new Set(), unions);
        }
    }
    if (asserted !== undefined) {
        const named = scope.declarations.get(asserted);
        if (named !== undefined) {
            declarationBlocks(named, scope, new Set([asserted]), blocks);
            if (named.kind === 'alias') {
                collectUnions(named.node.type, named.file, scope, new Set([asserted]), unions);
            }
        }
    }
    // `const { a }: { a: string } = Astro.props` declares the props in the
    // annotation; it is the Props type when there is no other.
    const annotation = declared === undefined && asserted === undefined ? patterns.find((entry) => entry.annotation !== undefined)?.annotation : undefined;
    if (annotation !== undefined) {
        typeBlocks(annotation, frontmatter, scope, new Set(), blocks);
    }
    return {
        declaration: declarationKind(declared, asserted, annotation),
        blocks,
        unions: unions.slice(0, propModel_1.PROP_MODEL_LIMITS.unionsMax),
    };
}
function declarationKind(declared, asserted, annotation) {
    if (declared !== undefined) {
        return typescript_1.default.isInterfaceDeclaration(declared.node) ? 'interface' : 'type';
    }
    if (asserted !== undefined) {
        return 'assertion';
    }
    return annotation === undefined ? 'none' : 'annotation';
}
function propsDeclaration(file) {
    for (const statement of file.statements) {
        if ((typescript_1.default.isInterfaceDeclaration(statement) || typescript_1.default.isTypeAliasDeclaration(statement)) && statement.name.text === 'Props') {
            return { node: statement, file };
        }
    }
    return undefined;
}
// `Astro.props as CardProps` names the props type outright.
function assertedType(frontmatter) {
    const found = (0, astroSyntax_1.syntaxNodes)(frontmatter)
        .filter(typescript_1.default.isAsExpression)
        .filter((node) => (0, astroSyntax_1.isAstroProps)(node.expression) && typescript_1.default.isTypeReferenceNode(node.type) && typescript_1.default.isIdentifier(node.type.typeName))
        .sort((first, second) => first.pos - second.pos)[0];
    if (found === undefined || !typescript_1.default.isTypeReferenceNode(found.type) || !typescript_1.default.isIdentifier(found.type.typeName)) {
        return undefined;
    }
    return found.type.typeName.text;
}
// The object types a type is made of: its own type literals, and those of the
// local aliases and interfaces it names (in a union, an intersection or as a
// type argument: `Omit<Base, 'x'>` still describes Base's members). `seen`
// gains one name per alias followed, so its size is the depth gone.
function typeBlocks(node, file, scope, seen, out) {
    const aliasDepth = seen.size;
    if (aliasDepth > propTypes_1.PROP_TYPE_LIMITS.aliasDepthMax) {
        return;
    }
    if (typescript_1.default.isTypeLiteralNode(node)) {
        out.push(node.members.filter(typescript_1.default.isPropertySignature).map((member) => ({ member, file })));
        return;
    }
    if (typescript_1.default.isParenthesizedTypeNode(node)) {
        typeBlocks(node.type, file, scope, seen, out);
        return;
    }
    if (typescript_1.default.isUnionTypeNode(node) || typescript_1.default.isIntersectionTypeNode(node)) {
        for (const child of node.types) {
            typeBlocks(child, file, scope, seen, out);
        }
        return;
    }
    if (!typescript_1.default.isTypeReferenceNode(node)) {
        return;
    }
    if (typescript_1.default.isIdentifier(node.typeName)) {
        const name = node.typeName.text;
        const declaration = scope.declarations.get(name);
        if (declaration !== undefined && !seen.has(name)) {
            seen.add(name);
            declarationBlocks(declaration, scope, seen, out);
        }
    }
    for (const argument of node.typeArguments ?? []) {
        typeBlocks(argument, file, scope, seen, out);
    }
}
function heritageBlocks(heritage, scope, seen, out) {
    if (typescript_1.default.isIdentifier(heritage.expression)) {
        const name = heritage.expression.text;
        const declaration = scope.declarations.get(name);
        if (declaration !== undefined && !seen.has(name) && seen.size <= propTypes_1.PROP_TYPE_LIMITS.aliasDepthMax) {
            seen.add(name);
            declarationBlocks(declaration, scope, seen, out);
        }
    }
    for (const argument of heritage.typeArguments ?? []) {
        typeBlocks(argument, heritage.getSourceFile(), scope, seen, out);
    }
}
function declarationBlocks(declaration, scope, seen, out) {
    if (declaration.kind === 'alias') {
        typeBlocks(declaration.node.type, declaration.file, scope, seen, out);
        return;
    }
    for (const clause of declaration.node.heritageClauses ?? []) {
        for (const heritage of clause.types) {
            heritageBlocks(heritage, scope, seen, out);
        }
    }
    out.push(declaration.node.members.filter(typescript_1.default.isPropertySignature).map((member) => ({ member, file: declaration.file })));
}
/**
 * A member's doc comment: the comments right above it. A comment on the line
 * of the member before belongs to that member, not this one, unless this
 * member opens the line (`{ /** Tip. *\/ title: string }`).
 */
function memberDocumentation(signature) {
    const text = signature.file.text;
    const start = signature.member.getStart(signature.file);
    const ranges = (typescript_1.default.getLeadingCommentRanges(text, signature.member.pos) ?? []).filter((range) => {
        const lineStart = text.lastIndexOf('\n', range.pos - 1) + 1;
        const ownLine = text.slice(lineStart, range.pos).trim() === '';
        const trailsPrevious = !ownLine && text.slice(range.end, start).includes('\n');
        return !trailsPrevious;
    });
    return (0, propProse_1.commentDocumentation)(text, start, ranges);
}
// ---------------------------------------------------------------------------
// Unions of prop shapes
// ---------------------------------------------------------------------------
// Each top-level `A | B` of object types in the props type is one table: a
// branch per arm, saying what the arm forbids (`never`, or a member the other
// arms tell apart by a literal field and this one leaves out), what it pins
// to literal values, and the fallbacks its own doc comments state.
function collectUnions(node, file, scope, seen, out) {
    const aliasDepth = seen.size;
    if (aliasDepth > propTypes_1.PROP_TYPE_LIMITS.aliasDepthMax || out.length >= propModel_1.PROP_MODEL_LIMITS.unionsMax) {
        return;
    }
    if (typescript_1.default.isParenthesizedTypeNode(node)) {
        collectUnions(node.type, file, scope, seen, out);
        return;
    }
    if (typescript_1.default.isIntersectionTypeNode(node)) {
        for (const child of node.types) {
            collectUnions(child, file, scope, seen, out);
        }
        return;
    }
    if (typescript_1.default.isUnionTypeNode(node) && node.types.length >= 2) {
        const branches = node.types.map((arm) => {
            const blocks = [];
            typeBlocks(arm, file, scope, new Set(), blocks);
            return blocks;
        });
        if (branches.every((blocks) => blocks.length > 0)) {
            const union = unionTable(branches, scope);
            if (union !== undefined) {
                out.push(union);
            }
            return;
        }
    }
    const declaration = (0, propTypes_1.referencedDeclaration)(node, scope);
    if (declaration?.kind === 'alias' && !seen.has(declaration.node.name.text)) {
        seen.add(declaration.node.name.text);
        collectUnions(declaration.node.type, declaration.file, scope, seen, out);
    }
}
function unionTable(branchBlocks, scope) {
    if (branchBlocks.length > propModel_1.PROP_MODEL_LIMITS.propVariantsMax) {
        return undefined;
    }
    const entries = branchBlocks.map((blocks) => {
        const members = new Map();
        const docs = new Map();
        for (const signature of blocks.flat()) {
            const name = (0, propTypes_1.memberKey)(signature.member.name);
            if (name === undefined) {
                continue;
            }
            members.set(name, signature);
            const documentation = memberDocumentation(signature).slice(0, propModel_1.PROP_MODEL_LIMITS.docCharsMax);
            if (documentation !== '') {
                docs.set(name, documentation);
            }
        }
        return { members, docs };
    });
    const names = [...new Set(entries.flatMap((entry) => [...entry.members.keys()]))];
    const branches = entries.map(({ members, docs }) => {
        const forbids = [];
        const pins = {};
        for (const name of names) {
            const signature = members.get(name);
            const type = signature?.member.type;
            if (signature === undefined || type === undefined) {
                continue;
            }
            if (type.kind === typescript_1.default.SyntaxKind.NeverKeyword) {
                forbids.push(name);
                continue;
            }
            // A branch PINS a prop when it fixes it to a known set of values — one
            // (`variant: "autofit"`) or several, which is still a discriminant,
            // just a wider one. Anything with a non-literal member fixes nothing.
            const values = (0, propTypes_1.flattenParts)(type, signature.file, scope).filter((part) => !(0, propTypes_1.isNullish)(part));
            const literals = values.map(propTypes_1.literalOf);
            if (values.length > 0 &&
                values.length <= propModel_1.PROP_MODEL_LIMITS.optionsMax &&
                literals.every((literal) => literal !== undefined && literal.text.length <= propModel_1.PROP_MODEL_LIMITS.textCharsMax)) {
                pins[name] = literals.map((literal) => (literal?.form === 'string' ? literal.value : (literal?.text ?? '')));
            }
        }
        return { forbids, pins, ...branchDocs(docs) };
    });
    // In a union told apart by a literal field, a member one branch leaves out
    // is not part of that branch: TypeScript rejects `disabled` beside
    // `kind="link"`. It is forbidden there just as `disabled?: never` would say.
    const told = discriminated(branches.map((branch) => branch.pins));
    const finished = branches.map((branch, index) => {
        const members = entries[index]?.members;
        (0, assert_1.assert)(members !== undefined, 'unionTable: every branch has its members');
        const missing = told ? names.filter((name) => !members.has(name) && !branch.forbids.includes(name)) : [];
        return { ...branch, forbids: [...branch.forbids, ...missing] };
    });
    // A union that forbids nothing and pins nothing tells the panel nothing.
    const telling = finished.some((branch) => branch.forbids.length > 0 || Object.keys(branch.pins).length > 0 || Object.keys(branch.defaults).length > 0 || Object.keys(branch.rules).length > 0);
    return telling ? { names, branches: finished } : undefined;
}
// What one union branch's own doc comments say each prop falls back to. A label
// that reads Play in the play branch and Close in the close one has no single
// answer for the field, but it has one per branch.
function branchDocs(documentation) {
    const defaults = {};
    const rules = {};
    const docs = {};
    for (const [name, text] of documentation) {
        docs[name] = text;
        const said = (0, propProse_1.statedDefault)(text);
        if (said.value !== undefined) {
            defaults[name] = said.value;
        }
        if (said.when) {
            rules[name] = said.when;
        }
    }
    return { defaults, rules, docs };
}
// Whether one field tells the branches apart: pinned in every one of them
// (two or more), to values no two of them share.
function discriminated(pins) {
    const names = new Set(pins.flatMap((branch) => Object.keys(branch)));
    for (const name of names) {
        const pinned = pins.map((branch) => branch[name]).filter((values) => values !== undefined);
        const values = pinned.flat();
        if (pinned.length >= 2 && pinned.length === pins.length && new Set(values).size === values.length) {
            return true;
        }
    }
    return false;
}
/**
 * The props a union branch's doc promises a different fallback for in each
 * branch: there is no single answer for the field, so the field claims none
 * and the branch tables carry the per-branch answers.
 */
function splitFallbacks(unions) {
    const split = new Set();
    for (const union of unions) {
        for (const name of union.names) {
            const seen = new Set();
            for (const branch of union.branches) {
                const value = branch.defaults[name];
                if (value !== undefined) {
                    seen.add(value);
                }
                if (branch.rules[name] !== undefined) {
                    seen.add(`rule:${name}`);
                }
            }
            if (seen.size > 1) {
                split.add(name);
            }
        }
    }
    return split;
}
