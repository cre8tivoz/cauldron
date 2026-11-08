"use strict";
// The project's dev server, the one the canvas shows: starting it with the
// app's generated config (falling back to the project's own), adopting a
// server the user already runs, stopping it, and its log. One instance per
// main process, made by main.ts; its IPC is registered below.
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
exports.DevServers = void 0;
exports.registerDevServerHandlers = registerDevServerHandlers;
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const child_process_1 = require("child_process");
const assert_1 = require("../../shared/core/assert");
const limits_1 = require("../../shared/core/limits");
const record_1 = require("../../shared/core/record");
const mainLimits_1 = require("../lib/mainLimits");
const runtimePaths_1 = require("../lib/runtimePaths");
const platform_1 = require("../lib/platform");
const serialQueue_1 = require("../lib/serialQueue");
const mainHelpers_1 = require("../lib/mainHelpers");
const nodeTools_1 = require("../lib/nodeTools");
const componentPreview_1 = require("../previewServer/componentPreview");
const devProbe_1 = require("../preview/devProbe");
const devServerLog_1 = require("../preview/devServerLog");
const devServerChecks_1 = require("../preview/devServerChecks");
const contentConfig_1 = require("../content/contentConfig");
const markerConfig_1 = require("../preview/markerConfig");
const projectHandlers_1 = require("./projectHandlers");
// Subscribe before sending the stop signal so a fast exit cannot be missed.
function waitForPreviewExit(process) {
    if (!process || process.exitCode !== null || process.signalCode !== null) {
        return Promise.resolve();
    }
    return new Promise((resolve, reject) => {
        const exited = () => {
            clearTimeout(timeout);
            resolve();
        };
        const timeout = setTimeout(() => {
            process.removeListener('exit', exited);
            reject(new Error('Preview did not stop in time. Try switching branches again.'));
        }, 10000);
        process.once('exit', exited);
    });
}
// The page patcher, handed to every page as a module. It lives in its own
// file rather than as a string in here because it is real code that has to
// stay readable — and it is read rather than required, since it runs in the
// browser and not in this process. If it cannot be read, pages simply reload
// the way they always did.
//
// Its bounds come from shared/core/limits.ts, prepended here — the bridge boundary —
// so the patcher in the page answers to the same numbers as the rest of the app
// (step 7). The patcher declares the constant and reads nothing else.
let MORPH_CLIENT = '';
try {
    const bounds = {
        previewMarkersMax: limits_1.LIMITS.previewMarkersMax,
        previewMorphWorkMax: limits_1.LIMITS.previewMorphWorkMax,
    };
    MORPH_CLIENT = `const AVB_PREVIEW_LIMITS = Object.freeze(${JSON.stringify(bounds)});\n` + (0, mainLimits_1.readSource)(runtimePaths_1.RUNTIME_PATHS.morphClient);
}
catch {
    MORPH_CLIENT = '';
}
// The patcher, written as a script Astro is allowed to process — which means
// Astro bundles it and puts it in <head>, exactly as it does for any script a
// component writes. It is still a module (import.meta.hot, which is what it
// listens on), and it is no longer a node in the page's own markup.
//
// It used to carry `is:inline`, which tells Astro to leave a tag exactly where
// it was written. A script is display:none, so a tag in the body looked free —
// and it is a child: :last-child, :nth-child, `+`, `~` and `> *` all count it.
// A page rendered into a layout's slot handed that slot one extra child, and
// CSS written for the children a component is given saw something the real
// build has not got.
const MORPH_TAG_HTML = MORPH_CLIENT ? "<script>import 'virtual:avb-morph';</script>" : '';
class DevServers {
    host;
    previewEnvironment;
    server = undefined;
    // Whether the running server's project had a content config when it started.
    // Astro reads src/content.config.* once, at startup: a config that appears
    // later (the CMS's first collection, or one written by hand) is never loaded,
    // and its collections read as empty for as long as that server runs. The
    // content-sync hook cannot fix it, since it re-syncs the config it has.
    contentConfigAtStart = undefined;
    logBuffer = [];
    // Serialize dev:start calls — concurrent spawns race Astro's daemon lock and
    // the loser dies with "exited before becoming ready".
    starts = (0, serialQueue_1.createKeyedQueue)();
    constructor(host, 
    // Extra variables the project's dev server gets (cms/cmsPreviewEnvironment.ts).
    previewEnvironment = () => ({})) {
        this.host = host;
        this.previewEnvironment = previewEnvironment;
    }
    /** The dev server the canvas shows, while one runs. */
    current() {
        return this.server;
    }
    /** A checkout must wait until the old watcher stops before replacing its files. */
    async pause() {
        this.starts.cancel();
        const server = this.server;
        if (!server) {
            return;
        }
        if (server.daemon && server.bin) {
            const [command, args] = (0, nodeTools_1.nodeCliCommand)(server.bin, ['dev', 'stop']);
            await (0, nodeTools_1.run)(command, args, server.projectPath, mainHelpers_1.SHORT_COMMAND);
            if (this.server === server) {
                this.server = undefined;
            }
            return;
        }
        const stopped = waitForPreviewExit(server.proc);
        this.stop(false);
        await stopped;
    }
    /** Runs `task` as the project's one dev start; a later start cancels it. */
    run(projectPath, task) {
        return this.starts.run(projectPath, task);
    }
    stop(cancelPending = true) {
        if (cancelPending) {
            this.starts.cancel();
        }
        if (!this.server) {
            return;
        }
        const { proc, daemon, bin, projectPath } = this.server;
        this.server = undefined;
        // Daemonized servers (Astro >= 7 forks a background process) stop via the CLI.
        if (daemon && bin) {
            try {
                const [cmd, argv] = (0, nodeTools_1.nodeCliCommand)(bin, ['dev', 'stop']);
                (0, child_process_1.execFile)(cmd, argv, { ...mainHelpers_1.SHORT_COMMAND, cwd: projectPath, shell: (0, platform_1.commandNeedsShell)(cmd) }, () => { });
            }
            catch {
                /* best effort */
            }
            return;
        }
        // External servers have no owned process and stay running.
        (0, nodeTools_1.stopProcessTree)(proc);
    }
    /**
     * Restarts the dev server at `devUrl` when its project gained a content
     * config after it started, so Astro loads the collections it declares.
     * Once per server: the restarted one starts with the config, so it never
     * asks again. Resolves true when the server is back at the same address
     * (its port comes from the project path, so it normally is) — the canvas's
     * Vite client reconnects to it by itself. False when there was nothing to
     * do, or the server came back somewhere else; the app then hears of it as
     * an exit and offers to start the preview again.
     */
    async restartForNewContentConfig(devUrl) {
        const server = this.server;
        const atStart = this.contentConfigAtStart;
        if (server === undefined || server.external === true || server.url !== devUrl) {
            return false;
        }
        if (atStart === undefined || atStart.url !== devUrl || atStart.present) {
            return false;
        }
        if (!(0, contentConfig_1.hasContentConfig)(server.projectPath)) {
            return false;
        }
        // Cleared before the restart, so a second empty read meanwhile does not
        // start another one.
        this.contentConfigAtStart = undefined;
        const { projectPath } = server;
        this.pushLog('\n[stacki] the content config appeared after the preview started; restarting it so Astro loads its collections.\n');
        await this.pause();
        const restarted = await this.run(projectPath, async (assertActive) => ({
            ...(await this.start(projectPath, assertActive)),
            trailingSlash: this.readTrailingSlash(projectPath),
        }));
        (0, assert_1.assert)(restarted.url.length > 0, 'A restarted server has an address');
        (0, assert_1.assert)((0, contentConfig_1.hasContentConfig)(projectPath), 'A server restarted for its content config starts with one');
        if (restarted.url !== devUrl) {
            this.host.send('dev:exit', { code: 0, log: this.recentLog() });
            return false;
        }
        return true;
    }
    /** The trailing-slash mode the project's dev server serves. */
    readTrailingSlash(projectPath) {
        // What the dev server resolved beats what the config says: it has been
        // through Astro's own defaults, and it accounts for a value that arrives by
        // variable, spread or integration rather than as a literal. Only this app's
        // own server writes it, so it is only trustworthy while that server is the
        // one running — an adopted external server never loads the marker config,
        // and a file left behind by an earlier run would answer for a config that
        // has since changed.
        const ours = this.server && (0, platform_1.sameFilesystemPath)(this.server.projectPath, projectPath) && !this.server.external;
        try {
            if (!ours) {
                throw new Error('no server of ours');
            }
            const resolved = (0, mainHelpers_1.parseRecord)((0, mainHelpers_1.readJson)(path.join(projectPath, 'node_modules', '.avb', 'resolved.json')));
            const mode = (0, mainHelpers_1.parseOptionalString)(resolved['trailingSlash']);
            if (mode && devServerChecks_1.TRAILING_SLASH_MODES.includes(mode)) {
                return mode;
            }
        }
        catch {
            /* no server has run yet — read the config instead */
        }
        for (const file of devServerChecks_1.ASTRO_CONFIG_FILES) {
            let text;
            try {
                text = (0, mainLimits_1.readSource)(path.join(projectPath, file));
            }
            catch {
                continue;
            }
            const mode = (0, devServerChecks_1.trailingSlashFromSource)(text);
            if (mode) {
                return mode;
            }
            break; // the first config that exists is the one Astro loads
        }
        return 'ignore'; // Astro's default, and the one that serves either spelling
    }
    /** The generated config's path, or undefined when the dev server runs without it. */
    writeMarkerConfig(projectPath) {
        try {
            const directory = path.join(projectPath, 'node_modules', '.avb');
            fs.mkdirSync(directory, { recursive: true });
            // Stale until this run's astro:config:done writes it again; until then the
            // config's own text is the better answer.
            fs.rmSync(path.join(directory, 'resolved.json'), { force: true });
            fs.rmSync(path.join(directory, 'routes.json'), { force: true });
            const userConfig = ['astro.config.mjs', 'astro.config.js', 'astro.config.ts'].find((name) => fs.existsSync(path.join(projectPath, name)));
            // Unpacked copies: the dev server is plain Node (see runtimePaths.ts).
            const markersPath = runtimePaths_1.RUNTIME_PATHS.previewMarkers;
            const previewHelperPath = runtimePaths_1.RUNTIME_PATHS.componentPreview;
            // Vite normally resolves symlinks before loading source (including
            // macOS /var -> /private/var). Match both spellings because a project's
            // preserveSymlinks option can keep the original one instead.
            const projectDirectories = [...new Set([(0, mainHelpers_1.toPosix)(path.resolve(projectPath)), (0, mainHelpers_1.toPosix)(fs.realpathSync(projectPath))])];
            const config = (0, markerConfig_1.renderMarkerConfig)([
                userConfig ? `import userConfig from '../../${userConfig}';` : 'const userConfig = {};',
                JSON.stringify(markersPath),
                JSON.stringify(previewHelperPath),
                JSON.stringify(runtimePaths_1.RUNTIME_PATHS.studioEntry),
                JSON.stringify(runtimePaths_1.RUNTIME_PATHS.previewWarmup),
                JSON.stringify(projectDirectories),
                JSON.stringify(MORPH_CLIENT),
                JSON.stringify(MORPH_TAG_HTML),
                JSON.stringify((0, mainHelpers_1.toPosix)(path.join(directory, 'preview.astro'))),
                JSON.stringify((0, mainHelpers_1.toPosix)(path.join(directory, 'paths.js'))),
                JSON.stringify((0, mainHelpers_1.toPosix)(path.join(directory, 'data.js'))),
                JSON.stringify((0, mainHelpers_1.toPosix)(path.join(directory, 'value.js'))),
            ]);
            const configPath = path.join(directory, 'astro.config.mjs');
            fs.writeFileSync(configPath, config);
            fs.writeFileSync(path.join(directory, 'preview.astro'), (0, componentPreview_1.renderComponentPreviewPage)());
            fs.writeFileSync(path.join(directory, 'paths.js'), markerConfig_1.PATHS_ENDPOINT);
            fs.writeFileSync(path.join(directory, 'data.js'), markerConfig_1.DATA_ENDPOINT);
            fs.writeFileSync(path.join(directory, 'value.js'), markerConfig_1.VALUE_ENDPOINT);
            // This file is assembled here and handed to Astro as its config. If it
            // will not parse, Astro does not start, and the project gets no preview at
            // all — the editor's own canvas broken by the editor's own scaffolding,
            // over something the project never asked for. Read it back the way node
            // will and say no rather than hand over something that cannot load: the
            // caller falls back to a plain dev server, which costs the outlines and
            // the live patching and keeps everything else working.
            if (!(0, devServerChecks_1.parsesAsModule)(configPath)) {
                this.pushLog('\n[stacki] the generated preview config did not parse; starting the dev ' +
                    'server without it. Outlines and live updates are off for this session.\n');
                return undefined;
            }
            return configPath;
        }
        catch {
            return undefined; // preview still works, just without outlines
        }
    }
    /** Starts the project's dev server, or answers with the one already running. */
    async start(projectPath, assertActive) {
        assertActive();
        if (this.server && (0, platform_1.sameFilesystemPath)(this.server.projectPath, projectPath)) {
            // For adopted external servers, make sure it's still alive.
            if (this.server.external) {
                const current = this.server;
                if (await (0, devServerChecks_1.serverAlive)(current.url)) {
                    assertActive();
                    return { url: current.url, external: true };
                }
                this.server = undefined;
            }
            else {
                return { url: this.server.url };
            }
        }
        assertActive();
        this.stop(false);
        this.logBuffer = [];
        const localBin = await this.installedBin(projectPath, assertActive);
        // A lock file means a daemon exists (possibly stale, possibly started
        // without the app's marker config) — pass --force so ours replaces it.
        const configPresent = (0, contentConfig_1.hasContentConfig)(projectPath);
        let lastError = undefined;
        for (let attempt = 0; attempt < 2; attempt++) {
            const force = attempt > 0 || !!(0, devServerChecks_1.readAstroLock)(projectPath);
            try {
                // Retry with --force: first-attempt daemon startup can flake (stale
                // daemon state, vite re-optimizing after a config change).
                const url = await this.spawn(projectPath, localBin, { force, bare: false }, assertActive);
                this.contentConfigAtStart = { url, present: configPresent };
                return { url };
            }
            catch (error) {
                assertActive();
                lastError = error;
                this.stop(false);
                // Another dev server already running for this project?
                const existing = (0, devServerChecks_1.parseExistingServer)(this.recentLog());
                if (existing) {
                    const alive = await (0, devServerChecks_1.serverAlive)(existing);
                    assertActive();
                    if (alive) {
                        // Adopt the user's own server instead of fighting it.
                        this.server = { proc: undefined, url: existing, projectPath, external: true };
                        return { url: existing, external: true };
                    }
                }
                this.logBuffer = [];
                await new Promise((resolve) => setTimeout(resolve, 800));
                assertActive();
            }
        }
        // Everything above ran with this app's generated config. A project whose
        // preview will not come up is worse than one without outlines, so try once
        // more on the project's own config before giving up. What starts here has no
        // markers and no live patching — an edit reloads the page, the way it did
        // before any of this — but the canvas is a canvas again.
        try {
            const url = await this.spawn(projectPath, localBin, { force: true, bare: true }, assertActive);
            this.pushLog("\n[stacki] the preview would not start with this app's config, so it is " +
                "running on the project's own. Outlines and live updates are off; the " +
                'log above says why.\n');
            if (this.server) {
                this.server = { ...this.server, bare: true };
            }
            return { url, bare: true };
        }
        catch {
            assertActive();
            this.stop(false);
            throw lastError; // report the first failure: it is the one that explains it
        }
    }
    async spawn(projectPath, localBin, { force, bare }, assertActive) {
        const port = await (0, nodeTools_1.findFreePort)((0, devServerChecks_1.previewPort)(fs.realpathSync(projectPath)));
        assertActive();
        const args = ['dev', '--port', String(port), '--host', '127.0.0.1'];
        // Astro resolves --config against the project root and rejects absolute
        // paths ([ConfigNotFound]), so pass it relative to the spawn cwd.
        // `bare` is the last resort: the project's own config, none of this app's,
        // so a preview still comes up even if what this app generates cannot run.
        const markerConfig = bare ? undefined : this.writeMarkerConfig(projectPath);
        if (markerConfig) {
            args.push('--config', (0, mainHelpers_1.toPosix)(path.relative(projectPath, markerConfig)));
        }
        if (force) {
            args.push('--force');
        }
        const startedAtMs = Date.now();
        const extra = this.previewEnvironment(fs.realpathSync(projectPath));
        const proc = (0, nodeTools_1.spawnAstroServer)(projectPath, localBin, args, extra);
        const url = `http://127.0.0.1:${port}`;
        this.server = { proc, url, projectPath, bin: localBin };
        // Startup failures belong to start()'s retries and final IPC reply. Only an
        // exit after readiness should take the renderer's running preview offline.
        let ready = false;
        proc.stdout.on('data', (chunk) => this.pushLog(chunk.toString()));
        proc.stderr.on('data', (chunk) => this.pushLog(chunk.toString()));
        proc.on('error', (error) => {
            this.pushLog(`\n[spawn error] ${(0, mainHelpers_1.errorMessage)(error)}\n`);
            if (this.server?.proc === proc) {
                this.server = undefined;
            }
        });
        proc.on('exit', (code) => {
            if (this.server && this.server.proc === proc) {
                // Astro >= 7 daemonizes: the CLI exits 0 after forking the real server
                // into a background process. That's a success, not a failure.
                const running = this.recentLog().match(/Dev server running at (https?:\/\/[^\s"\\)]+)/i);
                if (code === 0 && running) {
                    this.server = { proc: undefined, url, projectPath, daemon: true, bin: localBin };
                }
                else {
                    this.server = undefined;
                    if (ready) {
                        this.host.send('dev:exit', { code, log: this.recentLog() });
                    }
                }
            }
        });
        // The daemon's own failure reasons land in its separate project log.
        // Wait for HTTP readiness; a listening socket alone can leave the iframe blank.
        const deadline = Date.now() + 60000;
        while (Date.now() < deadline) {
            assertActive();
            if (!this.server) {
                throw new Error('Dev server exited before it was ready.\n\n' + (await this.failureDetail(projectPath, localBin, startedAtMs)));
            }
            if (await (0, devServerChecks_1.serverResponds)(url)) {
                assertActive();
                if (this.server) {
                    ready = true;
                    return url;
                }
            }
            await new Promise((resolve) => setTimeout(resolve, 300));
        }
        throw new Error('Astro dev server did not start within 60 seconds.\n\n' + (await this.failureDetail(projectPath, localBin, startedAtMs)));
    }
    // The project's astro CLI, installing the project's dependencies first when it
    // has none.
    async installedBin(projectPath, assertActive) {
        // Without this the failure is the shim's "env: node: No such file or
        // directory", which reads like a broken project rather than a missing tool.
        if (!(0, nodeTools_1.resolveNodeBin)()) {
            throw new Error('Node.js could not be found. Install a current Node.js release, restart Stacki, and ' +
                'try again. Stacki checks standard installers and common version managers.');
        }
        const binName = mainHelpers_1.isWin ? 'astro.cmd' : 'astro';
        const localBin = path.join(projectPath, 'node_modules', '.bin', binName);
        if (!fs.existsSync(localBin)) {
            // Dependencies missing or incomplete — install with the right PM first.
            await (0, projectHandlers_1.installDependencies)(this.host, projectPath);
            assertActive();
            this.host.send('progress', projectHandlers_1.PROGRESS_CLEARED);
            if (!fs.existsSync(localBin)) {
                throw new Error('astro is not installed in this project (no node_modules/.bin/astro after install). ' + 'Is astro listed in package.json dependencies?');
            }
        }
        return localBin;
    }
    async failureDetail(projectPath, localBin, startedAtMs) {
        let log = this.recentLog();
        const daemonLog = await (0, devServerLog_1.readDevServerLog)(projectPath, startedAtMs);
        if (daemonLog) {
            return `${log}\n\n— Astro startup log —\n${daemonLog}`;
        }
        try {
            const [logCmd, logArgs] = (0, nodeTools_1.nodeCliCommand)(localBin, ['dev', 'logs']);
            const { stdout } = await new Promise((resolve, reject) => (0, child_process_1.execFile)(logCmd, logArgs, { ...mainHelpers_1.SHORT_COMMAND, cwd: projectPath, shell: (0, platform_1.commandNeedsShell)(logCmd) }, (error, so) => error ? reject(error) : resolve({ stdout: so.toString() })));
            const tail = stdout.trim().split('\n').slice(-12).join('\n');
            if (tail) {
                log += `\n\n— astro dev logs —\n${tail}`;
            }
        }
        catch {
            /* no daemon logs available */
        }
        return log;
    }
    pushLog(chunk) {
        this.logBuffer.push(chunk.slice(-mainLimits_1.MAIN_LIMITS.logChunkCharsMax));
        // Keep roughly the last 200 chunks.
        if (this.logBuffer.length > 200) {
            this.logBuffer = this.logBuffer.slice(-200);
        }
        this.host.send('dev:log', chunk);
    }
    recentLog(charsMax = 1200) {
        const text = this.logBuffer.join('').replace(/\x1b\[[0-9;]*m/g, '');
        return text.slice(-charsMax).trim();
    }
}
exports.DevServers = DevServers;
function registerDevServerHandlers({ ipcMain, devServers, thumbnails, }) {
    ipcMain.handle('dev:start', (_event, projectPath) => {
        thumbnails.noteProjectOpened();
        return devServers.run(projectPath, async (assertActive) => {
            const result = await devServers.start(projectPath, assertActive);
            assertActive();
            thumbnails.schedule(projectPath, 6000);
            return { ...result, trailingSlash: devServers.readTrailingSlash(projectPath) };
        });
    });
    ipcMain.handle('dev:stop', async () => {
        await devServers.pause();
        return { ok: true };
    });
    ipcMain.handle('dev:probe', (_event, url) => (0, devProbe_1.probeUrl)(url));
    ipcMain.handle('dev:diagnose', async (_event, projectPath) => {
        const nodePath = (0, nodeTools_1.resolveNodeBin)() ?? undefined;
        const nodeVersion = nodePath ? (0, devServerChecks_1.nodeVersionOf)(nodePath) : undefined;
        let astroVersion = undefined;
        let requires = undefined;
        try {
            const pkg = (0, mainHelpers_1.parseRecord)((0, mainHelpers_1.readJson)(path.join(projectPath, 'node_modules', 'astro', 'package.json')));
            astroVersion = (0, mainHelpers_1.parseOptionalString)(pkg['version']) || undefined;
            requires = (0, mainHelpers_1.parseOptionalString)((0, record_1.toRecord)(pkg['engines'])?.['node']) || undefined;
        }
        catch {
            /* astro not installed — reported as its own kind below */
        }
        const hasDeps = fs.existsSync(path.join(projectPath, 'node_modules'));
        const nodeOk = nodeVersion ? (0, devServerChecks_1.satisfiesRange)(nodeVersion, requires) : false;
        let kind = 'unknown';
        if (!nodePath) {
            kind = 'no-node';
        }
        else if (!hasDeps || !astroVersion) {
            kind = 'no-deps';
        }
        else if (!nodeOk) {
            kind = 'node-too-old';
        }
        return {
            kind,
            nodePath,
            nodeVersion,
            astroVersion,
            requires,
            launchedFromGui: !process.env['SHELL'],
        };
    });
}
