"use strict";
// The commit preview IPC: a dev server for a past commit in its own worktree,
// its render check, and stopping it.
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
exports.registerPreviewHandlers = registerPreviewHandlers;
const mainLimits_1 = require("../lib/mainLimits");
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const previewWorktree = __importStar(require("../preview/previewWorktree"));
const previewCheck_1 = require("../preview/previewCheck");
const mainHelpers_1 = require("../lib/mainHelpers");
const nodeTools_1 = require("../lib/nodeTools");
const devServerChecks_1 = require("../preview/devServerChecks");
const previewServers_1 = require("../preview/previewServers");
function registerPreviewHandlers(host) {
    registerPreviewAtCommitHandler(host);
    registerPreviewCheckHandlers(host);
}
function registerPreviewAtCommitHandler({ ipcMain }) {
    ipcMain.handle('preview:atCommit', async (_event, { projectPath, ref }) => {
        const directory = await previewWorktree.ensureWorktree(nodeTools_1.git, { projectPath, ref });
        // A server already up for this project just needs the checkout moved under
        // it — Vite notices the files changed and reloads, which is far quicker than
        // starting Astro again for every commit somebody clicks.
        const running = previewServers_1.previewServers.get(projectPath);
        if (running?.proc && !running.proc.killed) {
            previewServers_1.previewServers.set(projectPath, { ...running, ref });
            return { url: running.url, ref, reused: true };
        }
        const bin = mainHelpers_1.isWin ? 'astro.cmd' : 'astro';
        const localBin = path.join(projectPath, 'node_modules', '.bin', bin);
        if (!fs.existsSync(localBin)) {
            throw new Error('This project’s packages aren’t installed, so an older version can’t be shown. ' + 'Install them and try again.');
        }
        const port = await (0, nodeTools_1.findFreePort)(4500);
        if (previewServers_1.previewServers.size >= mainLimits_1.MAIN_LIMITS.previewServersMax) {
            if (!previewServers_1.previewServers.has(projectPath)) {
                throw new Error('Preview server limit');
            }
        }
        const proc = (0, nodeTools_1.spawnAstroServer)(directory, localBin, ['dev', '--port', String(port), '--host', '127.0.0.1']);
        const url = `http://127.0.0.1:${port}`;
        let log = '';
        proc.stdout.on('data', (chunk) => (log = (log + chunk).slice(-12000)));
        proc.stderr.on('data', (chunk) => (log = (log + chunk).slice(-12000)));
        const spawnState = {};
        proc.on('error', (error) => {
            spawnState.error = error;
        });
        previewServers_1.previewServers.set(projectPath, { proc, url, ref, port });
        proc.on('exit', () => {
            if (previewServers_1.previewServers.get(projectPath)?.proc === proc) {
                previewServers_1.previewServers.delete(projectPath);
            }
        });
        // Wait for it to answer rather than guessing at a delay. An old commit can
        // need packages that are not installed now, and that shows up as a server
        // that never comes up — so the failure has to be caught here and explained,
        // not left as a blank canvas.
        const deadline = Date.now() + 45000;
        while (Date.now() < deadline) {
            if (spawnState.error || proc.exitCode !== null || proc.killed) {
                break;
            }
            if (await (0, devServerChecks_1.serverAlive)(url)) {
                return { url, ref, reused: false };
            }
            await new Promise((resolve) => setTimeout(resolve, 400));
        }
        await (0, previewServers_1.stopPreview)(projectPath);
        // The commonest real cause, said in those terms rather than as a stack trace.
        const missing = /Cannot find (?:module|package) ['"]?([^'"\s]+)/i.exec(log);
        throw new Error(missing
            ? `That version needs ${missing[1]}, which isn’t installed here. ` + 'It can’t be shown without it.'
            : 'That version wouldn’t start. It may need packages that aren’t installed any more.');
    });
}
function registerPreviewCheckHandlers({ ipcMain }) {
    // The canvas's preview token (plan §9, step 7): a click on the canvas selects
    // a node only while every file its rendering came from still holds the bytes
    // the rendering's stamps name. Read from disk here, never from the watcher.
    ipcMain.handle('preview:check', (_event, { projectPath, render }) => (0, previewCheck_1.checkPreviewRender)(projectPath, render));
    ipcMain.handle('preview:stop', async (_event, { projectPath }) => {
        await (0, previewServers_1.stopPreview)(projectPath);
        return { ok: true };
    });
}
