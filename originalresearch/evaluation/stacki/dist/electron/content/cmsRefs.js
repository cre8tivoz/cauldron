"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.importersOf = importersOf;
exports.boundNames = boundNames;
exports.resolveSpec = resolveSpec;
exports.resolveImport = resolveImport;
exports.aliasMap = aliasMap;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const componentSources_1 = require("../lib/componentSources");
const componentSources_2 = require("../../shared/properties/componentSources");
const record_1 = require("../../shared/core/record");
const mainLimits_1 = require("../lib/mainLimits");
// Finds the files that import a JSON collection, and rewrites them to stop:
// `import clients from '../data/clients.json'` becomes `const clients = []`,
// so a page that loops over the deleted data still renders — empty — instead
// of failing to build.
const CODE_EXT = /\.(astro|[cm]?[jt]sx?)$/i;
// `import <clause> from '<spec>'` — the only form that binds a name to JSON.
// The clause can't hold a quote or a semicolon, so a side-effect import above
// it (`import './styles.css';`) can't be swallowed into this one's clause.
const IMPORT_RE = /^([ \t]*)import\s+([^;'"]*?)\s+from\s*['"]([^'"]+)['"]\s*;?[ \t]*\r?\n?/gm;
// tsconfig/jsconfig allow comments and trailing commas, which JSON.parse won't.
function readJsonc(file) {
    try {
        const raw = fs_1.default
            .readFileSync(file, 'utf8')
            .replace(/\\"|"(?:\\"|[^"])*"|(\/\/.*$|\/\*[\s\S]*?\*\/)/gm, (match, comment) => (comment ? '' : match))
            .replace(/,(\s*[}\]])/g, '$1');
        return JSON.parse(raw);
    }
    catch {
        return undefined;
    }
}
// Path aliases from tsconfig ("@/*": ["src/*"]), so an aliased import of a
// collection is recognised as the same file a relative one points at.
function aliasMap(projectPath) {
    const packages = (0, componentSources_1.readComponentSources)(projectPath).map((source) => ({
        prefix: source.importPrefix,
        wildcard: true,
        targets: [path_1.default.resolve(projectPath, (0, componentSources_2.componentSourceRoot)(source))],
    }));
    const config = readJsonc(path_1.default.join(projectPath, 'tsconfig.json')) ?? readJsonc(path_1.default.join(projectPath, 'jsconfig.json'));
    const compilerOptions = (0, record_1.toRecord)((0, record_1.toRecord)(config)?.['compilerOptions']);
    const paths = (0, record_1.toRecord)(compilerOptions?.['paths']);
    if (!compilerOptions || !paths) {
        return packages;
    }
    const base = path_1.default.resolve(projectPath, String(compilerOptions['baseUrl'] ?? '.'));
    return [
        ...packages,
        ...Object.entries(paths).map(([pattern, targets]) => ({
            prefix: pattern.replace(/\*$/, ''),
            wildcard: pattern.endsWith('*'),
            targets: ((0, record_1.toArray)(targets) ?? []).map((target) => path_1.default.resolve(base, String(target).replace(/\*$/, ''))),
        })),
    ];
}
function resolveSpec(spec, fromFile, aliases) {
    if (spec.startsWith('.')) {
        return [path_1.default.resolve(path_1.default.dirname(fromFile), spec)];
    }
    for (const alias of aliases) {
        if (alias.wildcard ? spec.startsWith(alias.prefix) : spec === alias.prefix) {
            const rest = spec.slice(alias.prefix.length);
            return alias.targets.map((target) => path_1.default.resolve(target, rest));
        }
    }
    return []; // a bare package specifier — not a project file
}
// The names an import clause binds: default, namespace and named alike. All
// of them stand in for part of the deleted file, so all of them become [].
function boundNames(clause) {
    const names = [];
    const body = clause.replace(/^type\s+/, ''); // `import type { X } from` binds nothing at runtime
    const braces = body.match(/\{([\s\S]*)\}/);
    const outside = body.replace(/\{[\s\S]*\}/, '');
    const add = (raw) => {
        const name = raw
            .trim()
            .replace(/^type\s+/, '')
            .replace(/^\*\s+as\s+/, '')
            .split(/\s+as\s+/)
            .pop()
            ?.trim();
        if (name && /^[A-Za-z_$][\w$]*$/.test(name)) {
            names.push(name);
        }
    };
    for (const part of outside.split(',')) {
        add(part);
    }
    const braced = braces?.[1];
    if (braced !== undefined) {
        for (const part of braced.split(',')) {
            add(part);
        }
    }
    return names;
}
function walkCodeFiles(directory, out = [], depth = 0) {
    // A project's folders are not ours to trust: a tree deeper than any real one stops the walk
    // there, before it can exhaust the stack.
    if (depth > mainLimits_1.MAIN_LIMITS.directoryDepthMax) {
        return out;
    }
    let entries = [];
    try {
        entries = fs_1.default.readdirSync(directory, { withFileTypes: true });
    }
    catch {
        return out;
    }
    for (const entry of entries) {
        if (entry.name.startsWith('.') || entry.name === 'node_modules') {
            continue;
        }
        const full = path_1.default.join(directory, entry.name);
        if (entry.isDirectory()) {
            walkCodeFiles(full, out, depth + 1);
        }
        else if (CODE_EXT.test(entry.name)) {
            out.push(full);
        }
    }
    return out;
}
// Every file that imports `targetAbs`, with the rewritten source that drops
// the import in favour of empty arrays.
function importersOf(projectPath, targetAbs) {
    const aliases = aliasMap(projectPath);
    const target = path_1.default.resolve(targetAbs);
    const hits = [];
    for (const file of walkCodeFiles(path_1.default.join(projectPath, 'src'))) {
        let text;
        try {
            text = fs_1.default.readFileSync(file, 'utf8');
        }
        catch {
            continue;
        }
        if (!text.includes('import')) {
            continue;
        }
        const names = [];
        const next = text.replace(IMPORT_RE, (match, indent, clause, spec) => {
            const resolved = resolveSpec(spec, file, aliases);
            if (!resolved.some((candidate) => candidate === target)) {
                return match;
            }
            const bound = boundNames(clause);
            names.push(...bound);
            if (!bound.length) {
                return ''; // side-effect import — just drop it
            }
            return bound.map((name) => `${indent}const ${name} = [];\n`).join('');
        });
        if (names.length || next !== text) {
            hits.push({
                file,
                rel: path_1.default.relative(path_1.default.join(projectPath, 'src'), file).split(path_1.default.sep).join('/'),
                names,
                next,
            });
        }
    }
    return hits;
}
// The file an import specifier points at, or undefined. Extensionless specifiers
// get the usual candidates tried, the way a bundler would.
const IMPORT_EXTS = ['', '.astro', '.jsx', '.tsx', '.js', '.ts', '.vue', '.svelte', '.md', '.mdx'];
function resolveImport(projectPath, fromFile, spec) {
    for (const base of resolveSpec(spec, fromFile, aliasMap(projectPath))) {
        for (const ext of IMPORT_EXTS) {
            const candidate = base + ext;
            try {
                if (fs_1.default.statSync(candidate).isFile()) {
                    return candidate;
                }
            }
            catch {
                /* keep looking */
            }
        }
        for (const ext of IMPORT_EXTS.slice(1)) {
            const candidate = path_1.default.join(base, `index${ext}`);
            try {
                if (fs_1.default.statSync(candidate).isFile()) {
                    return candidate;
                }
            }
            catch {
                /* keep looking */
            }
        }
    }
    return undefined;
}
