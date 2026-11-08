"use strict";
// Where an import specifier in a project points: relative paths, the
// project's tsconfig aliases and the usual extension guessing, and the line a
// name is declared on, so the editor opens on it.
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.SOURCE_EXTENSIONS = void 0;
exports.projectAliases = projectAliases;
exports.firstExisting = firstExisting;
exports.resolveImportPath = resolveImportPath;
exports.declarationLine = declarationLine;
exports.parseAliases = parseAliases;
const mainLimits_1 = require("../lib/mainLimits");
const record_1 = require("../../shared/core/record");
const boundary_1 = require("../../shared/core/boundary");
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const componentSources_1 = require("../lib/componentSources");
const componentSources_2 = require("../../shared/properties/componentSources");
// ---------------------------------------------------------------------------
// Source files behind a symbol
// ---------------------------------------------------------------------------
// tsconfig/jsconfig `paths` for the open project, as [prefix, [targets]] with
// the trailing /* stripped. Astro's own config is extended, not read: only the
// project's aliases matter here, and those live in its own file.
function projectAliases(projectPath) {
    for (const name of ['tsconfig.json', 'jsconfig.json']) {
        const file = path.join(projectPath, name);
        if (!fs.existsSync(file)) {
            continue;
        }
        try {
            // Config files allow comments and trailing commas; strip both rather
            // than pulling in a JSON5 parser for one field.
            const raw = (0, mainLimits_1.readSource)(file)
                .replace(/\/\*[\s\S]*?\*\//g, '')
                .replace(/(^|[^:])\/\/.*$/gm, '$1')
                .replace(/,(\s*[}\]])/g, '$1');
            const input = JSON.parse(raw);
            const aliases = (0, record_1.toRecord)((0, record_1.toRecord)(input)?.['compilerOptions'])?.['paths'];
            if (aliases) {
                return parseAliases(input);
            }
        }
        catch {
            // A malformed config just means no aliases.
        }
    }
    return [];
}
exports.SOURCE_EXTENSIONS = ['', '.ts', '.js', '.mjs', '.mts', '.tsx', '.jsx', '.json', '.astro'];
function firstExisting(base) {
    for (const ext of exports.SOURCE_EXTENSIONS) {
        const candidate = base + ext;
        if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
            return candidate;
        }
    }
    for (const ext of exports.SOURCE_EXTENSIONS.slice(1)) {
        const candidate = path.join(base, 'index' + ext);
        if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
            return candidate;
        }
    }
    return undefined;
}
// The file an import specifier points at: relative paths, project aliases
// (`@/consts.ts`), and the usual extension guessing. Bare package names
// resolve to nothing — node_modules isn't the user's code to edit.
function resolveImportPath(projectPath, fromFile, spec) {
    const specifier = String(spec || '');
    if (!specifier) {
        return undefined;
    }
    for (const source of (0, componentSources_1.readComponentSources)(projectPath)) {
        if (specifier.startsWith(source.importPrefix)) {
            const relative = (0, componentSources_2.componentSourceRoot)(source) + '/' + specifier.slice(source.importPrefix.length);
            (0, componentSources_1.packageSourcePath)(projectPath, relative);
            return path.resolve(projectPath, relative);
        }
    }
    if (specifier.startsWith('.')) {
        return firstExisting(path.resolve(path.dirname(fromFile), specifier));
    }
    for (const [prefix, targets] of projectAliases(projectPath)) {
        if (!prefix || !specifier.startsWith(prefix)) {
            continue;
        }
        const rest = specifier.slice(prefix.length);
        for (const target of targets) {
            const found = firstExisting(path.resolve(projectPath, target, rest));
            if (found) {
                return found;
            }
        }
    }
    if (specifier.startsWith('/')) {
        return firstExisting(path.join(projectPath, specifier.slice(1)));
    }
    return undefined;
}
// 1-based line of `name`'s top-level declaration, so the editor can open on it.
function declarationLine(text, name) {
    if (!name) {
        return 0;
    }
    const re = new RegExp(
    // `[ \t]*`, not `\s*`: with the m flag `\s` eats the newlines before the
    // declaration, and the match would start on a blank line above it.
    `^[ \\t]*(?:export\\s+)?(?:const|let|var|function|class)\\s+` + `${String(name).replace(/[^\w$]/g, '')}\\b`, 'm');
    const match = re.exec(text);
    if (!match) {
        return 0;
    }
    return text.slice(0, match.index).split('\n').length;
}
// The `paths` of a tsconfig, as [prefix, [targets]] with the trailing `*` gone.
function parseAliases(input) {
    const paths = (0, record_1.toRecord)((0, record_1.toRecord)((0, record_1.toRecord)(input)?.['compilerOptions'])?.['paths']);
    if (!paths) {
        return [];
    }
    return Object.entries((0, boundary_1.dictionary)((value) => (0, boundary_1.list)(boundary_1.text)(typeof value === 'string' ? [value] : value))(paths)).map(([key, values]) => [key.replace(/\*$/, ''), values.map((value) => value.replace(/\*$/, ''))]);
}
