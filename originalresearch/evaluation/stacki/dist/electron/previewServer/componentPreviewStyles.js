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
exports.componentPreviewStylesModule = componentPreviewStylesModule;
exports.componentPreviewStylePaths = componentPreviewStylePaths;
// Import stylesheet entry points so layered imports keep their authored cascade.
const fs = __importStar(require("node:fs"));
const path = __importStar(require("node:path"));
const assert_1 = require("../../shared/core/assert");
function componentPreviewStylesModule(projectDirectory) {
    const sources = componentPreviewStyleSources(projectDirectory);
    const entries = componentPreviewStylePaths(sources);
    (0, assert_1.assert)(entries.length <= Object.keys(sources).length, 'Preview styles must belong to the project');
    (0, assert_1.assert)(new Set(entries).size === entries.length, 'Preview style entries must be unique');
    return entries.map((file) => `import ${JSON.stringify(file)};`).join('\n');
}
function componentPreviewStylePaths(sources) {
    const paths = Object.keys(sources);
    if (paths.length > 1024) {
        throw new Error('Preview stylesheet count exceeds limit');
    }
    const imported = new Set();
    let sourceChars = 0;
    for (const file of paths) {
        const source = sources[file];
        if (typeof source !== 'string') {
            throw new Error('Preview stylesheet: expected source text');
        }
        sourceChars += source.length;
        if (sourceChars > 10 * 1024 * 1024) {
            throw new Error('Preview stylesheets exceed source limit');
        }
        // Consume comments and strings as whole tokens so examples inside them cannot
        // remove a real entry point. Import tokens capture their own quoted paths.
        const imports = new RegExp(String.raw `\/\*[\s\S]*?\*\/|"[^"\\]*(?:\\.[^"\\]*)*"|'[^'\\]*(?:\\.[^'\\]*)*'|` +
            String.raw `@(?:import|use|forward)\s*(?:["']([^"']+)["']|` +
            String.raw `url\(\s*(?:["']([^"']+)["']|([^)\s]+))\s*\))`, 'gi');
        for (const match of source.matchAll(imports)) {
            const specifier = match[1] ?? match[2] ?? match[3];
            if (specifier === undefined) {
                continue;
            }
            const target = new URL(specifier.replace(/^[@~]\//, '/src/'), new URL(file, 'https://preview'));
            if (target.origin !== 'https://preview') {
                continue;
            }
            const pathname = target.pathname;
            const extension = /\.(css|scss)$/.test(pathname) ? '' : '.scss';
            const candidates = [pathname, pathname + extension, pathname.replace(/([^/]+)$/, '_$1') + extension];
            for (const candidate of candidates) {
                if (Object.hasOwn(sources, candidate)) {
                    imported.add(candidate);
                }
            }
        }
    }
    const entries = paths.filter((file) => !imported.has(file));
    if (paths.length > 0 && entries.length === 0) {
        throw new Error('Preview stylesheets have no entry point');
    }
    return entries;
}
function componentPreviewStyleSources(projectDirectory) {
    const root = path.join(projectDirectory, 'src/styles');
    if (!fs.existsSync(root)) {
        return {};
    }
    // Bound the directory queue and total bytes before allocating stylesheet contents.
    const directories = [root];
    const sources = {};
    let entriesCount = 0;
    let sourceBytes = 0;
    for (let index = 0; index < directories.length; index++) {
        const directory = directories[index];
        (0, assert_1.assert)(directory !== undefined, 'Preview style directory must exist in the queue');
        const entries = fs.readdirSync(directory, { withFileTypes: true });
        entriesCount += entries.length;
        (0, assert_1.assert)(entriesCount <= 4096, 'Preview stylesheet directory entries exceed limit');
        for (const entry of entries) {
            const file = path.join(directory, entry.name);
            if (entry.isDirectory()) {
                (0, assert_1.assert)(directories.length < 128, 'Preview stylesheet directories exceed limit');
                directories.push(file);
            }
            else if (entry.isFile() && /\.(css|scss)$/.test(entry.name)) {
                sourceBytes += fs.statSync(file).size;
                (0, assert_1.assert)(sourceBytes <= 10 * 1024 * 1024, 'Preview stylesheets exceed source limit');
                (0, assert_1.assert)(Object.keys(sources).length < 1024, 'Preview stylesheet count exceeds limit');
                const key = '/' + path.relative(projectDirectory, file).split(path.sep).join('/');
                sources[key] = fs.readFileSync(file, 'utf8');
            }
        }
    }
    return sources;
}
