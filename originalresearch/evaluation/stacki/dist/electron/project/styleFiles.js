"use strict";
// The stylesheets a project holds: plain CSS files, and Astro components
// whose <style> blocks the style panel can edit.
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
exports.ASTRO_SCAN_LIMIT = exports.ASTRO_GLOBAL_STYLE = exports.CSS_ROOT_DIRECTORIES = exports.CSS_SKIP_DIRECTORIES = void 0;
exports.listCssFiles = listCssFiles;
exports.listAstroStyleFiles = listAstroStyleFiles;
const mainLimits_1 = require("../lib/mainLimits");
const assert_1 = require("../../shared/core/assert");
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const mainHelpers_1 = require("../lib/mainHelpers");
const studioDirectory_1 = require("../lib/studioDirectory");
exports.CSS_SKIP_DIRECTORIES = new Set(['node_modules', 'dist', '.git', '.astro', 'release', '.avb']);
// The top-level folders a site's stylesheets live in, matching the variables
// panel (cssVarRead.ts). The project root also holds whatever else its owner
// keeps there: a 1.7 GB backup folder beside the site made this synchronous
// walk stall the main process, dev server start included (issue #67).
exports.CSS_ROOT_DIRECTORIES = new Set(['src', 'public', 'styles']);
function listCssFiles(root) {
    const out = [];
    const checkDirectory = (0, mainLimits_1.directoryBudget)(root);
    const walk = (directory, rel, depth) => {
        let entries;
        try {
            entries = fs.readdirSync(directory, { withFileTypes: true });
        }
        catch {
            return;
        }
        checkDirectory(directory, entries.length);
        (0, assert_1.assert)(depth <= mainLimits_1.MAIN_LIMITS.directoryDepthMax, 'listCssFiles: the budget bounds depth');
        for (const entry of entries) {
            if (entry.name.startsWith('.') && entry.name !== '.') {
                continue;
            }
            const full = path.join(directory, entry.name);
            const relPath = rel ? `${rel}/${entry.name}` : entry.name;
            if (entry.isDirectory()) {
                if (exports.CSS_SKIP_DIRECTORIES.has(entry.name)) {
                    continue;
                }
                if (depth === 0) {
                    if (!exports.CSS_ROOT_DIRECTORIES.has(entry.name)) {
                        continue;
                    }
                }
                if ((0, studioDirectory_1.isStudioDirectory)(full, entry.name)) {
                    continue;
                }
                walk(full, relPath, depth + 1);
            }
            else if (/\.(css|scss|sass|less)$/i.test(entry.name)) {
                let size = 0;
                try {
                    size = fs.statSync(full).size;
                }
                catch {
                    /* unreadable — still list it, the read will report the error */
                }
                out.push({ rel: (0, mainHelpers_1.toPosix)(relPath), name: entry.name, path: full, size });
            }
        }
    };
    walk(root, '', 0);
    // Shallow paths first (src/styles/global.css before a deeply nested partial),
    // then alphabetical — the file you want is usually near the top of the tree.
    return out.sort((left, right) => {
        const da = left.rel.split('/').length;
        const db = right.rel.split('/').length;
        return da - db || left.rel.localeCompare(right.rel);
    });
}
// A component's `<style is:global>` is page CSS. Astro leaves those rules
// unhashed, so they style whatever the page renders — including elements that
// live in a different file from the one being edited, which is exactly the case
// the style panel used to be blind to. Scoped `<style>` blocks are deliberately
// left out: Astro hashes them to their own component's elements, so their rules
// can't reach a selection made from another file.
exports.ASTRO_GLOBAL_STYLE = /<style\b[^>]*\bis:global\b[^>]*>/i;
exports.ASTRO_SCAN_LIMIT = 512 * 1024; // a .astro file this big isn't a component
function listAstroStyleFiles(root) {
    const out = [];
    const checkDirectory = (0, mainLimits_1.directoryBudget)(root);
    const walk = (directory, rel, depth) => {
        let entries;
        try {
            entries = fs.readdirSync(directory, { withFileTypes: true });
        }
        catch {
            return;
        }
        checkDirectory(directory, entries.length);
        (0, assert_1.assert)(depth <= mainLimits_1.MAIN_LIMITS.directoryDepthMax, 'listAstroStyleFiles: the budget bounds depth');
        for (const entry of entries) {
            if (entry.name.startsWith('.')) {
                continue;
            }
            const full = path.join(directory, entry.name);
            const relPath = rel ? `${rel}/${entry.name}` : entry.name;
            if (entry.isDirectory()) {
                if (exports.CSS_SKIP_DIRECTORIES.has(entry.name)) {
                    continue;
                }
                if ((0, studioDirectory_1.isStudioDirectory)(full, entry.name)) {
                    continue;
                }
                walk(full, relPath, depth + 1);
                continue;
            }
            if (!/\.astro$/i.test(entry.name)) {
                continue;
            }
            try {
                const { size } = fs.statSync(full);
                if (size > exports.ASTRO_SCAN_LIMIT) {
                    continue;
                }
                if (!exports.ASTRO_GLOBAL_STYLE.test((0, mainLimits_1.readSource)(full))) {
                    continue;
                }
                out.push({ rel: (0, mainHelpers_1.toPosix)(relPath), name: entry.name, path: full, size });
            }
            catch {
                /* unreadable — nothing to offer for it */
            }
        }
    };
    // Only src/: components elsewhere aren't part of the page's CSS, and this
    // keeps the scan off node_modules and build output entirely.
    walk(path.join(root, 'src'), 'src', 0);
    return out.sort((left, right) => left.rel.localeCompare(right.rel));
}
