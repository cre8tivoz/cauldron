"use strict";
// The component IPC: creating components, editing their declared properties
// with undo, where they are used, the import paths between pages, and copying a
// selection.
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
exports.registerComponentHandlers = registerComponentHandlers;
const componentProperties_1 = require("../properties/componentProperties");
const documentWrites_1 = require("../documents/documentWrites");
const boundary_1 = require("../../shared/core/boundary");
const platform_1 = require("../lib/platform");
const assert_1 = require("../../shared/core/assert");
const result_1 = require("../../shared/core/result");
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const componentFile_1 = require("../documents/componentFile");
const componentUsage_1 = require("../properties/componentUsage");
const mainHelpers_1 = require("../lib/mainHelpers");
const pageRequests_1 = require("../documents/pageRequests");
const componentImports_1 = require("../properties/componentImports");
// Step 6: every applied property batch leaves its inverse here, and the reply
// carries the token Undo sends back (componentProperties.ts).
const propertyUndo = new componentProperties_1.PropertyUndoStore();
function registerComponentHandlers(host) {
    registerComponentCreateHandlers(host);
    registerSelectionCopyHandler(host);
}
function registerComponentCreateHandlers({ ipcMain, documents, noteAppWrite }) {
    // Turn a piece of a page into a component of its own. The file is worked out
    // in componentFile.js; writing it belongs here, with every other write.
    // The checksum is what Undo hands back to `component:discard`: the file goes
    // only while it still holds these bytes.
    ipcMain.handle('component:create', async (_event, options) => {
        const { path: target, rel, text } = (0, componentFile_1.componentFile)(options);
        fs.mkdirSync(path.dirname(target), { recursive: true });
        const checksum = (0, documentWrites_1.createProjectText)(target, text);
        return { path: target, rel, name: options.name, checksum };
    });
    // Undo of creating a component: one step with the page edit that placed it.
    ipcMain.handle('component:discard', async (_event, { projectPath, path: target, checksum, force }) => {
        noteAppWrite();
        return { outcome: (0, componentFile_1.discardComponentFile)({ projectPath, path: target, checksum, force: force === true }) };
    });
    // Component property edits validate their revision before updating project sources.
    ipcMain.handle('component:properties', (_event, location) => (0, componentProperties_1.loadComponentProperties)(location));
    ipcMain.handle('component:editProperties', (_event, request) => {
        let undo;
        const onCommitted = (changes) => {
            undo = propertyUndo.record((0, componentProperties_1.inverseBatch)(changes));
        };
        const result = (0, componentProperties_1.updateComponentProperties)(request, {
            documents,
            noteWrite: noteAppWrite,
            onCommitted,
        });
        if (!result.ok) {
            return result;
        }
        (0, assert_1.assert)(undo !== undefined, 'An applied batch recorded its inverse');
        return (0, result_1.ok)({ ...result.value, undo });
    });
    ipcMain.handle('component:revertProperties', (_event, { token }) => (0, componentProperties_1.revertComponentProperties)(token, propertyUndo, { documents, noteWrite: noteAppWrite }));
    // Which files hold instances of a component — the palette’s instance count.
    ipcMain.handle('component:usage', async (_event, { projectPath, name, exclude }) => (0, componentUsage_1.componentUsage)((0, boundary_1.definedFields)({ projectPath, name, exclude })));
    ipcMain.handle('page:importPathFor', async (_event, { pagePath, targetPath, projectPath }) => {
        const preferred = projectPath ? (0, componentImports_1.componentSpecifier)(projectPath, targetPath) : undefined;
        if (preferred !== undefined) {
            return { relative: preferred, srcRelative: undefined };
        }
        const rel = (0, mainHelpers_1.toPosix)(path.relative(path.dirname(pagePath), targetPath));
        const relative = rel.startsWith('.') ? rel : './' + rel;
        let sourceRelative = undefined;
        if (projectPath) {
            const sourceDirectory = path.join(projectPath, 'src');
            if ((0, platform_1.isPathDescendant)(sourceDirectory, targetPath)) {
                sourceRelative = (0, mainHelpers_1.toPosix)(path.relative(sourceDirectory, targetPath));
            }
        }
        return { relative, srcRelative: sourceRelative };
    });
    // The same import, written for another page.
    //
    // A relative specifier says where a file is FROM WHERE IT IS WRITTEN, so
    // `../assets/hero.png` copied from src/pages/index.astro into
    // src/pages/blog/post.astro points at nothing. Anything else — an alias, a bare
    // package, `astro:content` — means the same thing wherever it is written, and
    // is handed back untouched.
    ipcMain.handle('page:rebaseImport', async (_event, { fromPagePath, toPagePath, spec }) => {
        const text = String(spec || '');
        if (!text.startsWith('.')) {
            return { path: text };
        }
        if (!fromPagePath || !toPagePath) {
            return { path: text };
        }
        const abs = path.resolve(path.dirname(fromPagePath), text);
        const rel = (0, mainHelpers_1.toPosix)(path.relative(path.dirname(toPagePath), abs));
        return { path: rel.startsWith('.') ? rel : './' + rel };
    });
}
function registerSelectionCopyHandler({ ipcMain, clipboard }) {
    ipcMain.handle('selection:copy', async (_event, state) => {
        const trail = (0, pageRequests_1.selectionTrail)(state);
        if (!trail) {
            return { ok: false };
        }
        // Electron's clipboard is asynchronous; acknowledge only after the copy finishes.
        await clipboard.writeText(trail.join('\n'));
        return { ok: true, count: trail.length };
    });
}
