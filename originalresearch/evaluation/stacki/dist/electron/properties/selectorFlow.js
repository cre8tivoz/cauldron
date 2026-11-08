"use strict";
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
exports.FLOW_LIMITS = void 0;
exports.linkedSites = linkedSites;
// Whether outside data can reach code that inserts HTML or sets classes. Data
// moves between files only through imports, so the two sites are linked when
// some project file's imports lead to both — the same file, a component that
// imports the fetching module and the inserting one, or a chain of those. Two
// components' inline scripts that import nothing in common share no data.
//
// Imports are resolved the way Astro resolves them: relative paths, and the
// `@/` and `~/` aliases for src/. An import that cannot be resolved to a
// project file and is not a package is assumed to reach every file, which can
// only link more sites, never fewer.
const path = __importStar(require("node:path"));
const assert_1 = require("../../shared/core/assert");
exports.FLOW_LIMITS = {
    /** Runnable files traced; one walk per file keeps this quadratic, so it is modest. */
    filesMax: 3_000,
};
const IMPORT = /^\s*import\b[^;'"]*?\bfrom\s*['"]([^'"]+)['"]|^\s*import\s*['"]([^'"]+)['"]|\bimport\s*\(\s*['"]([^'"]+)['"]/gm;
const CODE_EXTENSIONS = new Set(['js', 'mjs', 'cjs', 'ts', 'mts', 'cts', 'tsx', 'jsx', 'astro', 'vue', 'svelte', 'mdx']);
const EXTENSIONS = ['', '.ts', '.js', '.mjs', '.cjs', '.tsx', '.jsx', '.mts', '.cts', '.astro', '.vue', '.svelte', '.mdx', '/index.ts', '/index.js'];
/** A site of `from` and a site of `to` that some file's imports both lead to, if any. */
function linkedSites(texts, from, to) {
    if (from.length === 0 || to.length === 0) {
        return undefined;
    }
    // Past the bound the walk would be quadratic; assume the sites are linked.
    if (texts.length > exports.FLOW_LIMITS.filesMax) {
        return { from: from[0] ?? '', to: to[0] ?? '' };
    }
    const graph = importGraph(texts);
    const fromSet = new Set(from);
    const toSet = new Set(to);
    for (const text of texts) {
        const reached = reach(text.rel, graph);
        const source = reached === 'everything' ? from[0] : [...reached].find((rel) => fromSet.has(rel));
        const target = reached === 'everything' ? to[0] : [...reached].find((rel) => toSet.has(rel));
        if (source !== undefined) {
            if (target !== undefined) {
                return { from: source, to: target };
            }
        }
    }
    return undefined;
}
function importGraph(texts) {
    const files = new Set(texts.map((text) => text.rel));
    const graph = new Map();
    for (const text of texts) {
        const targets = [];
        let unresolved = false;
        IMPORT.lastIndex = 0;
        for (let match = IMPORT.exec(text.text); match !== null; match = IMPORT.exec(text.text)) {
            const specifier = match[1] ?? match[2] ?? match[3] ?? '';
            const resolved = resolveImport(text.rel, specifier, files);
            if (resolved === 'package') {
                continue;
            }
            if (resolved === undefined) {
                unresolved = true;
            }
            else {
                targets.push(resolved);
            }
        }
        graph.set(text.rel, unresolved ? 'everything' : targets);
    }
    return graph;
}
function resolveImport(from, specifier, files) {
    let base;
    if (specifier.startsWith('./') || specifier.startsWith('../')) {
        base = path.posix.join(path.posix.dirname(from), specifier);
    }
    else if (specifier.startsWith('@/') || specifier.startsWith('~/')) {
        base = `src/${specifier.slice(2)}`;
    }
    else if (specifier.startsWith('/')) {
        base = specifier.slice(1);
    }
    else {
        // A bare name is a package or an Astro module (`astro:content`); packages
        // are searched separately, and they cannot import the site's files.
        return 'package';
    }
    // `?url`, `?raw` and `?inline` imports are a URL or text, never code.
    if (/\?(?:url|raw|inline)\b/.test(base)) {
        return 'package';
    }
    const clean = base.replace(/\?.*$/, '');
    for (const extension of EXTENSIONS) {
        if (files.has(clean + extension)) {
            return clean + extension;
        }
    }
    // A file with an extension that is not code (an image, video, font, style
    // or data file) carries no code to follow.
    const extension = /\.([A-Za-z0-9]+)$/.exec(path.posix.basename(clean))?.[1]?.toLowerCase();
    if (extension !== undefined && !CODE_EXTENSIONS.has(extension)) {
        return 'package';
    }
    return undefined;
}
function reach(start, graph) {
    const seen = new Set([start]);
    const queue = [start];
    while (queue.length > 0) {
        const next = queue.pop();
        (0, assert_1.assert)(next !== undefined, 'reach: the queue was not empty');
        (0, assert_1.assert)(seen.size <= exports.FLOW_LIMITS.filesMax, 'reach: a walk visits each file once');
        const targets = graph.get(next) ?? [];
        if (targets === 'everything') {
            return 'everything';
        }
        for (const target of targets) {
            if (!seen.has(target)) {
                seen.add(target);
                queue.push(target);
            }
        }
    }
    return seen;
}
