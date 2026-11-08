"use strict";
// The style and source IPC: the stylesheets the style panel can author, and
// the source files behind a symbol, read and written inside the open project.
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
exports.registerStyleSourceHandlers = registerStyleSourceHandlers;
const mainLimits_1 = require("../lib/mainLimits");
const documentWrites_1 = require("../documents/documentWrites");
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const mainHelpers_1 = require("../lib/mainHelpers");
const importPaths_1 = require("../properties/importPaths");
const styleFiles_1 = require("../project/styleFiles");
function registerStyleSourceHandlers(host) {
    registerStyleListFilesHandlers(host);
    registerSourceWriteTextHandler(host);
}
function registerStyleListFilesHandlers({ ipcMain, assertInProject }) {
    ipcMain.handle('style:listFiles', async (_event, projectPath) => {
        if (!projectPath) {
            return { files: [] };
        }
        return { files: (0, styleFiles_1.listCssFiles)(projectPath) };
    });
    ipcMain.handle('style:listAstroStyles', async (_event, projectPath) => {
        if (!projectPath) {
            return { files: [] };
        }
        return { files: (0, styleFiles_1.listAstroStyleFiles)(projectPath) };
    });
    ipcMain.handle('style:readFile', async (_event, filePath) => {
        const abs = assertInProject(filePath);
        return { css: (0, mainLimits_1.readSource)(abs) };
    });
    ipcMain.handle('style:writeFile', async (_event, { filePath, css }) => {
        const abs = assertInProject(filePath);
        (0, documentWrites_1.writeProjectText)(abs, css); // notes the write, so the watcher does not see it as external
        return { ok: true };
    });
    // Opens the file an imported symbol comes from. `fromFile` is the file doing
    // the importing, so relative specifiers resolve the way the bundler sees them.
    ipcMain.handle('src:readSymbol', async (_event, { projectPath, fromFile, spec, name }) => {
        if (!projectPath || !fromFile) {
            return { ok: false };
        }
        const abs = (0, importPaths_1.resolveImportPath)(projectPath, path.resolve(fromFile), spec);
        if (!abs) {
            return { ok: false, reason: 'not-found' };
        }
        assertInProject(abs);
        const stat = fs.statSync(abs);
        if (stat.size > mainLimits_1.MAIN_LIMITS.editableFileBytesMax) {
            return { ok: false, reason: 'too-large' };
        }
        const text = (0, mainLimits_1.readSource)(abs);
        return {
            ok: true,
            rel: path.relative(projectPath, abs),
            text,
            line: (0, importPaths_1.declarationLine)(text, name),
        };
    });
    // Where an import points, as a project-relative path. Same resolution as
    // src:readSymbol, but it never reads the file — the callers here are asking
    // about images, and their bytes are none of this channel's business.
    ipcMain.handle('src:resolvePath', async (_event, { projectPath, fromFile, spec }) => {
        if (!projectPath || !fromFile) {
            return { ok: false };
        }
        const abs = (0, importPaths_1.resolveImportPath)(projectPath, path.resolve(fromFile), spec);
        if (!abs) {
            return { ok: false };
        }
        assertInProject(abs);
        return { ok: true, rel: (0, mainHelpers_1.toPosix)(path.relative(projectPath, abs)) };
    });
    ipcMain.handle('src:readText', async (_event, { projectPath, rel }) => {
        const abs = assertInProject(path.resolve(projectPath, rel));
        return { text: (0, mainLimits_1.readSource)(abs) };
    });
}
function registerSourceWriteTextHandler({ ipcMain, assertInProject }) {
    ipcMain.handle('src:writeText', async (_event, { projectPath, rel, text }) => {
        const abs = assertInProject(path.resolve(projectPath, rel));
        (0, documentWrites_1.writeProjectText)(abs, text);
        return { ok: true };
    });
}
