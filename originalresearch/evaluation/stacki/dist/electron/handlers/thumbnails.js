"use strict";
// The project's home page, rendered on its own and photographed from the top.
//
// Two ways in. The project that is open already has a dev server, so its
// picture costs one hidden window. A project on the start screen has nothing
// running, so one is started for it, used, and stopped again — which is what
// makes "the site as it is now" true for a project that was last edited
// somewhere else entirely. One instance per main process, made by main.ts.
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
exports.Thumbnails = void 0;
exports.registerThumbnailHandlers = registerThumbnailHandlers;
const path = __importStar(require("path"));
const thumbs = __importStar(require("../project/thumbs"));
const platform_1 = require("../lib/platform");
const serialQueue_1 = require("../lib/serialQueue");
const mainHelpers_1 = require("../lib/mainHelpers");
const nodeTools_1 = require("../lib/nodeTools");
const projectFiles_1 = require("../project/projectFiles");
const devServerChecks_1 = require("../preview/devServerChecks");
class Thumbnails {
    host;
    queueCapture = (0, serialQueue_1.createSerialQueue)(); // each capture owns a browser and a server
    // Bumped when a project is opened. A capture waiting its turn behind another
    // one belongs to a start screen that is no longer on screen — and the machine
    // is now busy starting the project the user actually asked for.
    captureEra = 0;
    captureController;
    thumbTimer = undefined;
    constructor(host) {
        this.host = host;
    }
    capture(projectPath) {
        const era = this.captureEra;
        return this.queueCapture(async () => {
            if (era !== this.captureEra) {
                return { ok: false, error: 'skipped' };
            }
            const controller = new AbortController();
            this.captureController = controller;
            try {
                return await this.captureNow(projectPath, controller.signal);
            }
            finally {
                this.captureController = undefined;
            }
        });
    }
    /** Give the editor priority over active and queued welcome-screen server startups. */
    noteProjectOpened() {
        this.captureEra++;
        this.captureController?.abort();
    }
    /** The project closed: no background capture is left pending for it. */
    stop() {
        clearTimeout(this.thumbTimer);
        this.thumbTimer = undefined;
        this.captureEra++;
        this.captureController?.abort();
    }
    // While a project is open, its picture is kept current in the background: once
    // when the preview comes up, and again a while after the last edit. Neither
    // touches the window the user is working in.
    schedule(projectPath, delay) {
        clearTimeout(this.thumbTimer);
        this.thumbTimer = setTimeout(() => {
            const devServer = this.host.devServers.current();
            if (!devServer || !(0, platform_1.sameFilesystemPath)(devServer.projectPath, projectPath)) {
                return;
            }
            if (!thumbs.isStale(this.host.userDataPath(), projectPath)) {
                return;
            }
            this.capture(projectPath).catch((error) => {
                // A background refresh: the old picture stays, and the log says why.
                console.error('[thumbs] capture failed:', error);
            });
        }, delay);
        if (this.thumbTimer.unref) {
            this.thumbTimer.unref();
        }
    }
    async captureNow(projectPath, signal) {
        const userData = this.host.userDataPath();
        const devServer = this.host.devServers.current();
        // Already running for this project (it is the one that is open) — use it.
        if (devServer && (0, platform_1.sameFilesystemPath)(devServer.projectPath, projectPath) && devServer.url) {
            if (await (0, devServerChecks_1.serverAlive)(devServer.url)) {
                return thumbs.capture(userData, projectPath, devServer.url + '/');
            }
        }
        if (!(0, projectFiles_1.hasDependencies)(projectPath)) {
            return { ok: false, error: 'This project has no dependencies installed yet.' };
        }
        return withTemporaryServer(projectPath, signal, (url) => thumbs.capture(userData, projectPath, url + '/'));
    }
}
exports.Thumbnails = Thumbnails;
function registerThumbnailHandlers({ ipcMain, thumbnails, userDataPath, }) {
    // Asked for by the start screen, for a card whose picture is out of date.
    ipcMain.handle('recents:refreshThumb', async (_event, projectPath) => {
        const result = await thumbnails.capture(projectPath);
        const userData = userDataPath();
        return {
            ...result,
            thumb: thumbs.readThumb(userData, projectPath) ?? undefined,
            stale: thumbs.isStale(userData, projectPath),
        };
    });
}
// A dev server of the project's own, for one capture: the canvas's server is
// left alone, and the temporary one is stopped however the capture ends.
async function withTemporaryServer(projectPath, signal, capture) {
    const binName = mainHelpers_1.isWin ? 'astro.cmd' : 'astro';
    const localBin = path.join(projectPath, 'node_modules', '.bin', binName);
    const port = await (0, nodeTools_1.findFreePort)(4400 + Math.floor(Math.random() * 200));
    if (signal.aborted) {
        return { ok: false, error: 'skipped' };
    }
    const proc = (0, nodeTools_1.spawnAstroServer)(projectPath, localBin, [
        'dev',
        '--port',
        String(port),
        '--host',
        '127.0.0.1',
        // Keep a temporary server in our process group. A detached Astro daemon
        // cannot be cancelled while it is still compiling and has no lock file yet.
        '--ignore-lock',
    ]);
    const spawnState = {};
    proc.on('error', (error) => {
        spawnState.error = error;
    });
    let log = '';
    proc.stdout.on('data', (chunk) => (log = (log + chunk).slice(-4000)));
    proc.stderr.on('data', (chunk) => (log = (log + chunk).slice(-4000)));
    const url = `http://127.0.0.1:${port}`;
    const stop = () => (0, nodeTools_1.stopProcessTree)(proc);
    signal.addEventListener('abort', stop, { once: true });
    try {
        const state = await waitForTemporaryServer(proc, url, spawnState, signal);
        if (signal.aborted) {
            return { ok: false, error: 'skipped' };
        }
        if (state instanceof Error) {
            return { ok: false, error: state.message };
        }
        if (state === 'down') {
            return {
                ok: false,
                error: cleanDevLog(log) || 'the dev server did not start in time',
            };
        }
        return await capture(url);
    }
    finally {
        signal.removeEventListener('abort', stop);
        stop();
    }
}
// Polls the temporary server for at most 45 seconds: up once its port
// answers, down if it exits first or never answers, or the spawn's own error.
async function waitForTemporaryServer(proc, url, spawnState, signal) {
    const deadline = Date.now() + 45000;
    while (Date.now() < deadline) {
        if (signal.aborted) {
            return 'down';
        }
        if (spawnState.error) {
            return spawnState.error;
        }
        if (proc.exitCode !== null && proc.exitCode !== 0) {
            return 'down';
        }
        if (await (0, devServerChecks_1.serverAlive)(url)) {
            return 'up';
        }
        await new Promise((resolve) => setTimeout(resolve, 400));
    }
    return 'down';
}
const cleanDevLog = (text) => String(text || '')
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line && !/^\[?\d{1,2}:\d{2}/.test(line))
    .slice(-2)
    .join(' ')
    .slice(0, 300);
