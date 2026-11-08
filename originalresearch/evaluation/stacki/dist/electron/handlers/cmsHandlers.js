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
exports.registerCmsHandlers = registerCmsHandlers;
const contentPaths_1 = require("../lib/contentPaths");
// The CMS panel's IPC: the collections and entries a project keeps as files,
// read and written as data, with their asset references and field metadata.
const mainLimits_1 = require("../lib/mainLimits");
const documentWrites_1 = require("../documents/documentWrites");
const assert_1 = require("../../shared/core/assert");
const mainValidation_1 = require("../app/mainValidation");
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const jsCollections_1 = require("../content/jsCollections");
const assetRefs_1 = require("../project/assetRefs");
const cmsRefs_1 = require("../content/cmsRefs");
const mainHelpers_1 = require("../lib/mainHelpers");
const importPaths_1 = require("../properties/importPaths");
const cmsFiles_1 = require("./cmsFiles");
function registerCmsHandlers(host) {
    registerCmsListHandler(host);
    registerCmsReadHandler(host);
    registerCmsAssetRefHandler(host);
    registerCmsWriteHandler(host);
    registerCmsCreateHandlers(host);
}
function registerCmsListHandler({ ipcMain }) {
    // Data modules and root constants files may hold one record of site settings.
    // Other source files retain the stricter collection rule, so internal utility
    // constants do not become CMS entries.
    ipcMain.handle('cms:list', async (_event, projectPath) => {
        const root = path.join(projectPath, 'src');
        const files = [];
        if (!fs.existsSync(root)) {
            return { files };
        }
        const checkDirectory = (0, mainLimits_1.directoryBudget)(root);
        const walk = (directory, rel, depth) => {
            let entries = [];
            try {
                entries = fs.readdirSync(directory, { withFileTypes: true });
            }
            catch {
                return;
            }
            checkDirectory(directory, entries.length);
            (0, assert_1.assert)(depth <= mainLimits_1.MAIN_LIMITS.directoryDepthMax, 'cms:list: the budget bounds depth');
            for (const entry of entries) {
                if (entry.name.startsWith('.') || entry.name === 'node_modules') {
                    continue;
                }
                const full = path.join(directory, entry.name);
                const entryRel = rel ? `${rel}/${entry.name}` : entry.name;
                if (entry.isDirectory()) {
                    // src/assets holds files the site imports (images, Lottie JSON), not content.
                    if (entryRel !== 'assets') {
                        walk(full, entryRel, depth + 1);
                    }
                }
                else if (/\.(cjs|cts|js|jsx|mjs|mts|ts|tsx)$/i.test(entry.name)) {
                    if (!/\.d\.[cm]?ts$/i.test(entry.name)) {
                        files.push(...(0, cmsFiles_1.readCmsSource)(full, entryRel, {
                            page: false,
                            includeGeneralOnly: (0, contentPaths_1.cmsIncludesGeneral)(entryRel),
                        }));
                    }
                }
                else if (/\.astro$/i.test(entry.name)) {
                    files.push(...(0, cmsFiles_1.readCmsSource)(full, entryRel, { page: true }));
                }
                else if (/\.json$/i.test(entry.name) && !cmsFiles_1.CMS_SKIP.test(entry.name)) {
                    files.push((0, cmsFiles_1.readCmsJson)(full, entryRel, rel, entry.name));
                }
            }
        };
        walk(root, '', 0);
        files.sort((left, right) => left.rel.localeCompare(right.rel));
        return { files };
    });
}
function registerCmsReadHandler({ ipcMain }) {
    ipcMain.handle('cms:read', async (_event, { projectPath, rel }) => {
        const { fileRel, exportName } = (0, cmsFiles_1.splitCmsRel)(rel);
        const abs = (0, cmsFiles_1.cmsAbs)(projectPath, fileRel);
        if (!exportName) {
            return { data: (0, mainValidation_1.parseData)((0, mainHelpers_1.readJson)(abs)) };
        }
        const file = (0, mainLimits_1.readSource)(abs);
        // A page's data lives in its frontmatter; everything below it is markup the
        // scanners must never see.
        const page = (0, cmsFiles_1.isAstroRel)(fileRel);
        const source = page ? (0, cmsFiles_1.frontmatterOf)(file) : file;
        if (source === undefined) {
            throw new Error(`src/${fileRel} has no frontmatter.`);
        }
        const scan = page ? cmsFiles_1.PAGE_SCAN : undefined;
        if (exportName === jsCollections_1.GENERAL) {
            const general = (0, jsCollections_1.readGeneral)(source, scan);
            if (!general) {
                throw new Error(`src/${fileRel} has no single values left to edit.`);
            }
            return { data: general };
        }
        const col = (0, jsCollections_1.findCollections)(source, scan).find((candidate) => candidate.name === exportName);
        if (!col) {
            throw new Error(page ? `${exportName} is no longer declared in src/${fileRel}.` : `${exportName} is no longer exported from src/${fileRel}.`);
        }
        if (!col.data) {
            throw new Error(`${exportName} isn't plain data — ${col.reason}.`);
        }
        return { data: (0, assetRefs_1.withAssets)(col.data, (0, cmsFiles_1.assetOfImport)(projectPath, abs, source)) };
    });
}
function registerCmsAssetRefHandler({ ipcMain }) {
    // Points a data file's field at a picture. A file under public/ is served as it
    // is and needs nothing written; one under src/ is imported, so the import is
    // made — or the file's existing one for that image reused, since importing the
    // same picture twice under two names is noise — and the name handed back for
    // the value.
    ipcMain.handle('cms:assetRef', async (_event, { projectPath, rel, assetRel }) => {
        const { fileRel } = (0, cmsFiles_1.splitCmsRel)(rel);
        const abs = (0, cmsFiles_1.cmsAbs)(projectPath, fileRel);
        const clean = String(assetRel || '').replace(/^\/+/, '');
        const root = clean.split('/')[0];
        if (root === 'public') {
            return { value: '/' + clean.split('/').slice(1).join('/') };
        }
        if (root !== 'src') {
            throw new Error('Invalid asset path');
        }
        const target = path.resolve(projectPath, clean);
        if (!fs.existsSync(target)) {
            throw new Error(`${clean} no longer exists.`);
        }
        const file = (0, mainLimits_1.readSource)(abs);
        const page = (0, cmsFiles_1.isAstroRel)(fileRel);
        const span = page ? (0, cmsFiles_1.frontmatterSpan)(file) : undefined;
        if (page && !span) {
            throw new Error(`src/${fileRel} has no frontmatter.`);
        }
        const source = span ? file.slice(span.start, span.end) : file;
        const imports = (0, assetRefs_1.defaultImports)(source);
        const already = imports.find((i) => (0, importPaths_1.resolveImportPath)(projectPath, abs, i.spec) === target);
        if (already) {
            return { name: already.name, asset: clean };
        }
        const fromHere = (0, mainHelpers_1.toPosix)(path.relative(path.dirname(abs), target));
        const spec = (0, assetRefs_1.importSpecFor)({
            imports,
            srcRelative: (0, mainHelpers_1.toPosix)(path.relative(path.join(projectPath, 'src'), target)),
            relative: fromHere.startsWith('.') ? fromHere : './' + fromHere,
        });
        const name = (0, assetRefs_1.importName)(clean, imports.map((i) => i.name));
        const next = (0, assetRefs_1.addImport)(source, name, spec);
        const written = span ? file.slice(0, span.start) + next + file.slice(span.end) : next;
        (0, documentWrites_1.writeProjectText)(abs, written);
        return { name, asset: clean };
    });
}
function registerCmsWriteHandler({ ipcMain, send }) {
    // Writes the collection back, matching the file's existing indentation so
    // the diff stays limited to what the user actually changed.
    ipcMain.handle('cms:write', async (_event, { projectPath, rel, data }) => {
        const { fileRel, exportName } = (0, cmsFiles_1.splitCmsRel)(rel);
        if (exportName) {
            const abs = (0, cmsFiles_1.cmsAbs)(projectPath, fileRel);
            if (!fs.existsSync(abs)) {
                throw new Error(`src/${fileRel} no longer exists.`);
            }
            // Only the edited span is rewritten — imports, comments and the file's
            // other exports are left exactly as they were.
            const file = (0, mainLimits_1.readSource)(abs);
            // Only the frontmatter is handed to the writer for a page, and only its
            // span is spliced back — the markup below is never re-serialized.
            const page = (0, cmsFiles_1.isAstroRel)(fileRel);
            const span = page ? (0, cmsFiles_1.frontmatterSpan)(file) : undefined;
            if (page && !span) {
                throw new Error(`src/${fileRel} has no frontmatter.`);
            }
            const source = span ? file.slice(span.start, span.end) : file;
            const scan = page ? cmsFiles_1.PAGE_SCAN : undefined;
            const written = exportName === jsCollections_1.GENERAL
                ? (0, jsCollections_1.writeGeneral)(source, data && typeof data === 'object' && !Array.isArray(data) ? data : {}, scan)
                : (0, jsCollections_1.replaceCollection)(source, exportName, (0, mainHelpers_1.parseDataList)(data), scan);
            if (written === undefined) {
                throw new Error(`Couldn't write ${exportName} back into src/${fileRel}.`);
            }
            const next = span ? file.slice(0, span.start) + written + file.slice(span.end) : written;
            (0, documentWrites_1.writeProjectText)(abs, next);
            // Editing a page's own frontmatter changes a file the editor may have
            // open. Our writes are invisible to the watcher, so say so directly —
            // otherwise the model would keep the old data and write it back over this.
            if (page) {
                send('fs:changed', { files: [abs] });
            }
            return { ok: true };
        }
        const abs = (0, cmsFiles_1.cmsAbs)(projectPath, rel);
        // A save still in flight when the collection is deleted must not recreate
        // the file — the editor closes a moment after the delete lands.
        if (!fs.existsSync(abs)) {
            throw new Error(`src/${rel} no longer exists.`);
        }
        let indent = 2;
        let trailingNewline = true;
        const before = (0, mainLimits_1.readSource)(abs);
        const match = before.match(/\n([ \t]+)\S/);
        if (match) {
            indent = (0, mainHelpers_1.capture)(match, 1) === '\t' ? '\t' : (0, mainHelpers_1.capture)(match, 1).length;
        }
        trailingNewline = /\n$/.test(before);
        const json = JSON.stringify(data, null, indent) + (trailingNewline ? '\n' : '');
        (0, documentWrites_1.writeProjectText)(abs, json);
        return { ok: true };
    });
}
function registerCmsCreateHandlers({ ipcMain, send, shell }) {
    // New collections land in src/data/, the conventional home for Astro content
    // that isn't a content collection.
    ipcMain.handle('cms:create', async (_event, { projectPath, name }) => {
        const slug = String(name)
            .trim()
            .toLowerCase()
            .replace(/\.json$/i, '')
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-|-$/g, '');
        if (!slug) {
            throw new Error('Give the collection a name.');
        }
        const rel = `data/${slug}.json`;
        const abs = (0, cmsFiles_1.cmsAbs)(projectPath, rel);
        if (fs.existsSync(abs)) {
            throw new Error(`src/${rel} already exists.`);
        }
        fs.mkdirSync(path.dirname(abs), { recursive: true });
        (0, documentWrites_1.createProjectText)(abs, '[]\n');
        send('cms:changed', {});
        return { rel };
    });
    ipcMain.handle('cms:meta', async (_event, projectPath) => ({ meta: (0, cmsFiles_1.readCmsMeta)(projectPath) }));
    ipcMain.handle('cms:setMeta', async (_event, { projectPath, rel, fields }) => {
        const meta = (0, cmsFiles_1.readCmsMeta)(projectPath);
        if (fields && Object.keys(fields).length) {
            meta[rel] = fields;
        }
        else {
            delete meta[rel];
        }
        const file = (0, cmsFiles_1.cmsMetaPath)(projectPath);
        fs.mkdirSync(path.dirname(file), { recursive: true });
        fs.writeFileSync(file, JSON.stringify(meta, null, 2) + '\n', 'utf8');
        return { ok: true };
    });
    // Deleting a collection rewrites the pages that imported it (see cmsRefs.js):
    // the import becomes `const clients = []`, which leaves every
    // `clients.map(...)` on the page working and rendering nothing.
    ipcMain.handle('cms:usage', async (_event, { projectPath, rel }) => {
        const abs = (0, cmsFiles_1.cmsAbs)(projectPath, (0, cmsFiles_1.splitCmsRel)(rel).fileRel);
        return { files: (0, cmsRefs_1.importersOf)(projectPath, abs).map((hit) => hit.rel) };
    });
    ipcMain.handle('cms:delete', async (_event, { projectPath, rel }) => {
        // An export shares its file with other code, so there's no file to trash and
        // removing the statement is a code edit, not a content one.
        if ((0, cmsFiles_1.splitCmsRel)(rel).exportName) {
            throw new Error('This collection is an export inside a source file — remove it in code.');
        }
        const abs = (0, cmsFiles_1.cmsAbs)(projectPath, rel);
        const hits = (0, cmsRefs_1.importersOf)(projectPath, abs);
        for (const hit of hits) {
            (0, documentWrites_1.writeProjectText)(hit.file, hit.next);
        }
        await shell.trashItem(abs);
        const meta = (0, cmsFiles_1.readCmsMeta)(projectPath);
        if (meta[rel]) {
            delete meta[rel];
            fs.writeFileSync((0, cmsFiles_1.cmsMetaPath)(projectPath), JSON.stringify(meta, null, 2) + '\n', 'utf8');
        }
        send('cms:changed', {});
        // Our own writes are invisible to the watcher, so tell the app directly —
        // an open page holding the old import needs to reload.
        if (hits.length) {
            send('fs:changed', { files: hits.map((hit) => hit.file) });
        }
        return { ok: true, rewritten: hits.map((hit) => hit.rel) };
    });
}
