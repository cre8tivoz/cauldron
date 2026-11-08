"use strict";
// The assets panel's IPC: listing, uploading, moving, renaming and deleting a
// project's asset files, and reading and writing the text ones.
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
exports.registerAssetHandlers = registerAssetHandlers;
const mainLimits_1 = require("../lib/mainLimits");
const documentWrites_1 = require("../documents/documentWrites");
const platform_1 = require("../lib/platform");
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const assetFiles_1 = require("../project/assetFiles");
function registerAssetHandlers(host) {
    registerAssetsListHandlers(host);
    registerAssetsMoveHandlers(host);
    registerAssetsReadTextHandlers(host);
}
function registerAssetsListHandlers({ ipcMain, showOpenDialog, noteAppWrite, send, }) {
    ipcMain.handle('assets:list', async (_event, projectPath) => {
        const entries = [];
        // The roots themselves are entries, so the panel navigates and drops into
        // them with the folder handling it already has.
        const publicDirectory = (0, assetFiles_1.publicDirectoryOf)(projectPath);
        const sourceDirectory = path.join(projectPath, 'src');
        const hasPublic = fs.existsSync(publicDirectory);
        if (hasPublic) {
            entries.push({
                rel: 'public',
                name: 'public',
                parent: '',
                isDir: true,
                root: 'public',
                isRoot: true,
            });
            entries.push(...(0, assetFiles_1.listAssetTree)(publicDirectory, 'public', { mediaOnly: false }));
        }
        if (fs.existsSync(sourceDirectory)) {
            entries.push({ rel: 'src', name: 'src', parent: '', isDir: true, root: 'src', isRoot: true });
            entries.push(...(0, assetFiles_1.listAssetTree)(sourceDirectory, 'src', { mediaOnly: true }));
        }
        return { entries, missing: !hasPublic };
    });
    // Opens a picker and copies the chosen files into public/<destRel>.
    ipcMain.handle('assets:pickUpload', async (_event, { projectPath, destRel: targetRel }) => {
        const result = await showOpenDialog({
            title: 'Upload assets',
            properties: ['openFile', 'multiSelections'],
        });
        if (result.canceled || !result.filePaths.length) {
            return { added: 0 };
        }
        return copyAssetsIn({ noteAppWrite, send }, projectPath, targetRel, result.filePaths);
    });
    // Copies OS-dragged files into public/<destRel>.
    ipcMain.handle('assets:upload', async (_event, { projectPath, destRel: targetRel, filePaths }) => {
        return copyAssetsIn({ noteAppWrite, send }, projectPath, targetRel, filePaths || []);
    });
}
function registerAssetsMoveHandlers({ ipcMain, noteAppWrite, send, shell }) {
    ipcMain.handle('assets:move', async (_event, { projectPath, fromRel, toDirRel: toDirectoryRel }) => {
        const from = (0, assetFiles_1.assetAbs)(projectPath, fromRel);
        const toDirectory = (0, assetFiles_1.assetAbs)(projectPath, toDirectoryRel);
        // Between roots the file's IDENTITY changes, not just its path: a public/
        // asset is referenced by URL and a src/ one by import, so every reference to
        // it would have to be rewritten in place. Until that rewrite exists, refuse
        // — moving the file alone would leave the site pointing at nothing, quietly.
        if ((0, assetFiles_1.rootOfRel)(fromRel) !== (0, assetFiles_1.rootOfRel)(toDirectoryRel)) {
            throw new Error('Moving between public/ and src/ changes how the file is referenced ' +
                '(URL vs import), so it needs the references updated too. Not supported yet — ' +
                'move it outside the app and fix the references by hand.');
        }
        if (!fs.existsSync(from)) {
            return { ok: false };
        }
        // Refuse moving a folder into itself/its own subtree.
        if (fs.statSync(from).isDirectory() && (0, platform_1.isPathWithin)(from, toDirectory)) {
            throw new Error('Cannot move a folder into itself.');
        }
        const target = (0, assetFiles_1.uniqueTarget)(toDirectory, path.basename(from));
        noteAppWrite();
        noteAppWrite();
        fs.mkdirSync(toDirectory, { recursive: true });
        fs.renameSync(from, target);
        send('assets:changed', {});
        return { ok: true };
    });
    ipcMain.handle('assets:rename', async (_event, { projectPath, rel, newName }) => {
        const clean = String(newName).trim().replace(/[/\\]/g, '');
        if (!clean) {
            throw new Error('Invalid name');
        }
        const from = (0, assetFiles_1.assetAbs)(projectPath, rel);
        const target = path.join(path.dirname(from), clean);
        if ((0, platform_1.sameFilesystemPath)(target, from)) {
            return { ok: true };
        }
        if (fs.existsSync(target)) {
            throw new Error('Something with that name already exists.');
        }
        noteAppWrite();
        noteAppWrite();
        fs.renameSync(from, target);
        send('assets:changed', {});
        return { ok: true };
    });
    // To the system's bin, not to nothing. An asset is somebody's photograph as
    // often as it is a placeholder, references to it live in files this does not
    // read, and the app has no copy of it — so "gone" has to mean somewhere they
    // can get it back from without us.
    ipcMain.handle('assets:delete', async (_event, { projectPath, rel }) => {
        const abs = (0, assetFiles_1.assetAbs)(projectPath, rel);
        if (!fs.existsSync(abs)) {
            return { ok: false };
        }
        noteAppWrite();
        await shell.trashItem(abs);
        send('assets:changed', {});
        return { ok: true };
    });
}
function registerAssetsReadTextHandlers({ ipcMain, noteAppWrite, send, assertInProject, }) {
    // Text assets (css/js/json/svg/…) are editable in the floating code window.
    ipcMain.handle('assets:readText', async (_event, { projectPath, rel }) => {
        const abs = (0, assetFiles_1.assetAbs)(projectPath, rel);
        const stat = fs.statSync(abs);
        if (stat.size > mainLimits_1.MAIN_LIMITS.editableFileBytesMax) {
            throw new Error('That file is too large to edit in the app (over 5 MB).');
        }
        return { text: (0, mainLimits_1.readSource)(abs) };
    });
    ipcMain.handle('assets:writeText', async (_event, { projectPath, rel, text }) => {
        const abs = (0, assetFiles_1.assetAbs)(projectPath, rel);
        (0, documentWrites_1.writeProjectText)(abs, text);
        return { ok: true };
    });
    ipcMain.handle('assets:mkdir', async (_event, { projectPath, parentRel, name }) => {
        const clean = String(name).trim().replace(/[/\\]/g, '');
        if (!clean) {
            throw new Error('Invalid folder name');
        }
        const directory = path.join((0, assetFiles_1.assetAbs)(projectPath, parentRel), clean);
        noteAppWrite();
        fs.mkdirSync(directory, { recursive: true });
        send('assets:changed', {});
        return { ok: true };
    });
    ipcMain.handle('assets:dimensions', async (_event, { projectPath, rel }) => {
        const abs = assertInProject(path.resolve(projectPath, rel));
        return { dims: (0, assetFiles_1.imageSizeOf)(abs) ?? undefined };
    });
}
function copyAssetsIn({ noteAppWrite, send }, projectPath, targetRel, filePaths) {
    const targetDirectory = (0, assetFiles_1.assetAbs)(projectPath, targetRel);
    fs.mkdirSync(targetDirectory, { recursive: true });
    let added = 0;
    for (const source of filePaths) {
        try {
            const target = (0, assetFiles_1.uniqueTarget)(targetDirectory, path.basename(source));
            noteAppWrite();
            fs.cpSync(source, target, { recursive: true });
            added++;
        }
        catch {
            /* skip unreadable file */
        }
    }
    send('assets:changed', {});
    return { added };
}
