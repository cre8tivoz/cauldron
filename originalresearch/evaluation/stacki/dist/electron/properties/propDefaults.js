"use strict";
// A component's prop schema with its defaults resolved: the prop types it
// imports, followed to their own files, and identifier defaults followed to the
// literal they name, so the panel shows the real default.
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.importedTypes = importedTypes;
exports.safeSchema = safeSchema;
exports.literalValue = literalValue;
exports.constLiteralIn = constLiteralIn;
exports.findNamedImport = findNamedImport;
exports.resolveModuleFile = resolveModuleFile;
exports.resolveIdentifierDefaults = resolveIdentifierDefaults;
exports.constMemberLiteralIn = constMemberLiteralIn;
exports.defaultAssetIn = defaultAssetIn;
const mainLimits_1 = require("../lib/mainLimits");
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const astroParser_1 = require("../parse/astroParser");
const mainHelpers_1 = require("../lib/mainHelpers");
const importPaths_1 = require("./importPaths");
const typescript_1 = __importDefault(require("typescript"));
const propTypes_1 = require("../parse/propModel/propTypes");
const propertyEditing_1 = require("../../shared/properties/propertyEditing");
// Declarations followed from one imported file, the imported ones and those they use.
const IMPORTED_DECLARATIONS_MAX = 64;
// The declaration text for every type this file imports, so `type Props =
// SeoProps` can be read when SeoProps lives in types.ts. One file deep and
// only within the project, with the types those declarations use from that
// same file — enough for the shape components actually use, without turning
// this into a type checker. Both files are read on the TypeScript syntax
// tree, the way the prop model reads the component itself; an import renamed
// with `as` is declared under the name the component uses.
function importedTypes(source, filePath, projectPath) {
    const fm = source.match(/^---\r?\n([\s\S]*?)\r?\n---/);
    if (!fm) {
        return '';
    }
    const frontmatter = typescript_1.default.createSourceFile('component.ts', (0, mainHelpers_1.capture)(fm, 1), typescript_1.default.ScriptTarget.Latest, true, typescript_1.default.ScriptKind.TS);
    const out = [];
    const seen = new Set();
    for (const statement of frontmatter.statements) {
        if (!typescript_1.default.isImportDeclaration(statement) || !typescript_1.default.isStringLiteral(statement.moduleSpecifier)) {
            continue;
        }
        const bindings = statement.importClause?.namedBindings;
        // `import type { A, B } from '…'`, `import { type A } from '…'`: a
        // type-only import is the common way to write this, but a plain
        // `import { X }` of a type is legal too.
        const names = bindings !== undefined && typescript_1.default.isNamedImports(bindings)
            ? bindings.elements.map((item) => ({ original: (item.propertyName ?? item.name).text, local: item.name.text }))
            : [];
        if (names.length === 0) {
            continue;
        }
        const target = (0, importPaths_1.resolveImportPath)(projectPath, filePath, statement.moduleSpecifier.text);
        if (!target || seen.has(target) || target.endsWith('.astro')) {
            continue;
        }
        seen.add(target);
        let text;
        try {
            text = (0, mainLimits_1.readSource)(target);
        }
        catch {
            continue;
        }
        out.push(...importedDeclarations(typescript_1.default.createSourceFile(target, text, typescript_1.default.ScriptTarget.Latest, true, typescript_1.default.ScriptKind.TS), names));
    }
    return out.join('\n');
}
// Only the declarations that were actually imported, so an unrelated type in
// the same file can't shadow one the component declares itself — and the ones
// those use from the same file (`tone?: Tone` in CardProps, with Tone beside
// it), or `Tone` would reach the panel as a bare name.
function importedDeclarations(file, names) {
    const declarations = new Map();
    for (const statement of file.statements) {
        if ((typescript_1.default.isInterfaceDeclaration(statement) || typescript_1.default.isTypeAliasDeclaration(statement)) && !declarations.has(statement.name.text)) {
            declarations.set(statement.name.text, statement);
        }
    }
    const pending = names.map((name) => ({ ...name }));
    const out = [];
    for (let index = 0; index < pending.length && index < IMPORTED_DECLARATIONS_MAX; index++) {
        const name = pending[index];
        const declaration = name === undefined ? undefined : declarations.get(name.original);
        if (name === undefined || declaration === undefined) {
            continue;
        }
        const text = declaration.getText(file);
        const nameStart = declaration.name.getStart(file) - declaration.getStart(file);
        out.push(name.local === name.original ? text : text.slice(0, nameStart) + name.local + text.slice(nameStart + name.original.length));
        for (const used of usedTypeNames(declaration)) {
            if (declarations.has(used) && !pending.some((entry) => entry.original === used)) {
                pending.push({ original: used, local: used });
            }
        }
    }
    return out;
}
// The type names a declaration refers to: its references and `extends` clauses,
// each once.
function usedTypeNames(declaration) {
    const used = new Set();
    const pending = [declaration];
    for (let index = 0; index < pending.length && index < propertyEditing_1.PROPERTY_LIMITS.nodesMax; index++) {
        const node = pending[index];
        if (node === undefined) {
            continue;
        }
        if (typescript_1.default.isTypeReferenceNode(node) && typescript_1.default.isIdentifier(node.typeName)) {
            used.add(node.typeName.text);
        }
        else if (typescript_1.default.isExpressionWithTypeArguments(node) && typescript_1.default.isIdentifier(node.expression)) {
            used.add(node.expression.text);
        }
        node.forEachChild((child) => {
            pending.push(child);
        });
    }
    return used;
}
function safeSchema(filePath, projectPath) {
    try {
        const source = (0, mainLimits_1.readSource)(filePath);
        const fields = (0, astroParser_1.parsePropSchema)(source, importedTypes(source, filePath, projectPath));
        const schema = resolveIdentifierDefaults(fields, source, filePath, projectPath);
        return {
            schema,
            extendsTag: (0, astroParser_1.parseExtendsTag)(source) ?? undefined,
            slots: (0, astroParser_1.parseSlots)(source),
            // Where that default slot sits decides whether a fresh instance
            // arrives holding a word or empty — see defaultSlotInline.
            slotText: (0, astroParser_1.defaultSlotInline)(source),
            // The HTML tag it renders as, so nesting rules apply through a
            // component the same way they do through a plain element.
            renderTag: (0, astroParser_1.rootTag)(source) ?? undefined,
            // A `...rest` spread on Astro.props means the component forwards
            // arbitrary attributes — the UI offers a free-form Attributes section.
            // Anchored to the end of the destructure rather than scanning forward
            // from its `{`: a rest element is always last, and looking forward
            // tripped over any `}` in front of it (`containerAttrs = {}, ...rest`).
            // The optional `: Type` covers an annotated destructure.
            hasRest: /\.\.\.\s*\w+\s*\}\s*(?::[^=]+)?=\s*Astro\.props/.test(source),
        };
    }
    catch {
        return {
            schema: [],
            extendsTag: undefined,
            slots: [],
            slotText: false,
            renderTag: undefined,
            hasRest: false,
        };
    }
}
// ---------------------------------------------------------------------------
// Prop-default resolution: a default like `SITE_TITLE` is often an identifier
// imported from another module (or a local const in the frontmatter). Follow
// it to its literal value so the UI shows the real default.
// ---------------------------------------------------------------------------
function literalValue(raw) {
    if (raw === undefined) {
        return undefined;
    }
    const trimmed = raw.trim();
    if (/^(true|false)$/.test(trimmed)) {
        return trimmed === 'true';
    }
    if (/^-?\d+(\.\d+)?$/.test(trimmed)) {
        return Number(trimmed);
    }
    // Strings, including template literals without interpolation.
    if (/^("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`[^`$]*`)$/s.test(trimmed)) {
        return trimmed.slice(1, -1).replace(/\\(['"`\\])/g, '$1');
    }
    return undefined;
}
// Finds `export const NAME = <literal>` (or let/var, optional type note).
function constLiteralIn(code, name) {
    const re = new RegExp(`(?:^|\\n)\\s*(?:export\\s+)?(?:const|let|var)\\s+${name}\\s*(?::[^=\\n]+)?=\\s*` +
        '("(?:[^"\\\\]|\\\\.)*"|\'(?:[^\'\\\\]|\\\\.)*\'|`[^`$]*`|-?\\d+(?:\\.\\d+)?|true|false)');
    const match = code.match(re);
    return match ? literalValue((0, mainHelpers_1.capture)(match, 1)) : undefined;
}
// Finds which module a named import binds `name` from: {orig, spec}.
function findNamedImport(code, name) {
    const re = /import\s+(?:[\w$]+\s*,\s*)?\{([^}]*)\}\s*from\s*['"]([^'"]+)['"]/g;
    let match;
    while ((match = re.exec(code)) !== null) {
        for (const part of (0, mainHelpers_1.capture)(match, 1).split(',')) {
            const seg = part.trim().replace(/^type\s+/, '');
            if (!seg) {
                continue;
            }
            const asMatch = seg.match(/^([\w$]+)\s+as\s+([\w$]+)$/);
            const orig = asMatch ? (0, mainHelpers_1.capture)(asMatch, 1) : seg;
            const local = asMatch ? (0, mainHelpers_1.capture)(asMatch, 2) : seg;
            if (local === name) {
                return { orig, spec: (0, mainHelpers_1.capture)(match, 2) };
            }
        }
    }
    return undefined;
}
function resolveModuleFile(spec, fromFile, projectPath) {
    let base;
    if (spec.startsWith('.')) {
        base = path.resolve(path.dirname(fromFile), spec);
    }
    else if (spec.startsWith('@/') || spec.startsWith('~/')) {
        base = path.join(projectPath, 'src', spec.slice(2));
    }
    else if (spec.startsWith('src/')) {
        base = path.join(projectPath, spec);
    }
    else {
        return undefined;
    }
    const candidates = [base, `${base}.ts`, `${base}.js`, `${base}.mjs`, `${base}.mts`, path.join(base, 'index.ts'), path.join(base, 'index.js')];
    for (const candidate of candidates) {
        try {
            if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
                return candidate;
            }
        }
        catch {
            /* keep looking */
        }
    }
    return undefined;
}
function resolveIdentifierDefaults(schema, source, filePath, projectPath) {
    return schema.map((field) => {
        if (!field.defaultExpr) {
            return field;
        }
        const defaultAsset = defaultAssetIn(source, String(field.default), filePath, projectPath);
        if (defaultAsset !== undefined) {
            return { ...field, defaultAsset };
        }
        const ident = String(field.default).trim();
        // `Tone.Info`: a member of a const object the component declares itself.
        const member = ident.match(/^([A-Za-z_$][\w$]*)\.([A-Za-z_$][\w$]*)$/);
        if (member) {
            return resolvedDefault(field, { value: constMemberLiteralIn(source, (0, mainHelpers_1.capture)(member, 1), (0, mainHelpers_1.capture)(member, 2)) });
        }
        if (!/^[A-Za-z_$][\w$]*$/.test(ident)) {
            return field;
        }
        // Local const in the component's own frontmatter first.
        let value = constLiteralIn(source, ident);
        if (value === undefined) {
            const imp = findNamedImport(source, ident);
            if (imp) {
                const file = resolveModuleFile(imp.spec, filePath, projectPath);
                if (file) {
                    try {
                        value = constLiteralIn((0, mainLimits_1.readSource)(file), imp.orig);
                    }
                    catch {
                        /* unreadable module — leave the identifier as-is */
                    }
                }
            }
        }
        return resolvedDefault(field, { value });
    });
}
// The field with its expression default replaced by the literal it names, or unchanged.
function resolvedDefault(field, literal) {
    const { value } = literal;
    if (value === undefined) {
        return field;
    }
    // Build a resolved field without mutating the parser's original schema.
    const resolved = { ...field, default: value };
    delete resolved.defaultExpr;
    if (resolved.type === 'other' && resolved.codeKind === undefined) {
        resolved.type = typeof value === 'number' ? 'number' : typeof value === 'boolean' ? 'boolean' : 'string';
    }
    return resolved;
}
// `NAME.key` of a `const NAME = { key: <literal> }` in the component's frontmatter,
// read on the same syntax tree the prop model reads its `as const` lists from.
function constMemberLiteralIn(source, name, key) {
    const frontmatter = source.match(/^---\r?\n([\s\S]*?)\r?\n---/);
    if (!frontmatter) {
        return undefined;
    }
    const file = typescript_1.default.createSourceFile('component.ts', (0, mainHelpers_1.capture)(frontmatter, 1), typescript_1.default.ScriptTarget.Latest, true, typescript_1.default.ScriptKind.TS);
    const list = (0, propTypes_1.typeScope)([file]).constLists.get(name);
    if (list === undefined || list.kind !== 'object') {
        return undefined;
    }
    const literal = list.entries.find(([entry]) => entry === key)?.[1];
    return literal === undefined ? undefined : (0, propTypes_1.literalPartValue)(literal);
}
// Media a default may import; the same set the props panel previews.
const MEDIA_FILE_RE = /\.(png|jpe?g|gif|webp|avif|svg|ico|bmp|mp4|webm|mov|m4v|ogg|mp3|wav)$/i;
const IDENTIFIER_SOURCE = '[A-Za-z_$][\\w$]*';
// One alias step: `const IMAGE = photo.src` names the import `photo`.
const ALIAS_STEPS_MAX = 1;
// The project file an image default imports, as a project-relative rel
// ("src/assets/hero.webp"), so the panel can show its thumbnail. It travels
// beside the expression, never in place of it: the default stays
// `heroImage.src`, which a page may not spell as a path. Follows
// `= heroImage`, `= heroImage.src`, and one local const naming either.
function defaultAssetIn(source, expression, filePath, projectPath) {
    const frontmatter = source.match(/^---\r?\n([\s\S]*?)\r?\n---/);
    if (!frontmatter) {
        return undefined;
    }
    const code = (0, mainHelpers_1.capture)(frontmatter, 1);
    let name = importedNameOf(expression);
    for (let step = 0; name !== undefined && step <= ALIAS_STEPS_MAX; step++) {
        const spec = defaultImportSpec(code, name);
        if (spec !== undefined) {
            return assetRelFor(spec, filePath, projectPath);
        }
        const alias = code.match(new RegExp(`(?:^|\\n)\\s*(?:export\\s+)?const\\s+${escapeIdentifier(name)}\\s*(?::[^=\\n]+)?=\\s*([^;\\n]+)`));
        name = alias ? importedNameOf((0, mainHelpers_1.capture)(alias, 1)) : undefined;
    }
    return undefined;
}
// `photo` or `photo.src`, the two ways an expression names an imported image.
function importedNameOf(expression) {
    const match = expression.trim().match(new RegExp(`^(${IDENTIFIER_SOURCE})(?:\\.src)?$`));
    return match ? (0, mainHelpers_1.capture)(match, 1) : undefined;
}
function defaultImportSpec(code, name) {
    const match = code.match(new RegExp(`import\\s+${escapeIdentifier(name)}\\s+from\\s*['"]([^'"]+)['"]`));
    return match ? (0, mainHelpers_1.capture)(match, 1) : undefined;
}
function assetRelFor(spec, filePath, projectPath) {
    const bare = spec.split('?')[0] ?? '';
    if (!MEDIA_FILE_RE.test(bare)) {
        return undefined;
    }
    const absolute = (0, importPaths_1.resolveImportPath)(projectPath, filePath, bare);
    if (absolute === undefined) {
        return undefined;
    }
    const rel = path.relative(projectPath, absolute).split(path.sep).join('/');
    return /^(src|public)\//.test(rel) ? rel : undefined;
}
// `$` is legal in an identifier and special in a pattern.
function escapeIdentifier(name) {
    return name.replace(/\$/g, '\\$');
}
