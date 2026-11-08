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
const publishHandlers_1 = require("./handlers/publishHandlers");
const cmsConnectionHandlers_1 = require("./handlers/cmsConnectionHandlers");
const cmsConnectionStore_1 = require("./content/cmsConnectionStore");
const sanityLogin_1 = require("./content/sanityLogin");
const cmsPreviewEnvironment_1 = require("./content/cmsPreviewEnvironment");
const projectMetadataHandlers_1 = require("./handlers/projectMetadataHandlers");
const imageConversionHandler_1 = require("./handlers/imageConversionHandler");
const gitRepositoryHandlers_1 = require("./handlers/gitRepositoryHandlers");
const previewFailure_1 = require("./preview/previewFailure");
const studioHandlers_1 = require("./handlers/studioHandlers");
const ipcRegistrar_1 = require("./lib/ipcRegistrar");
const runtimePaths_1 = require("./lib/runtimePaths");
const mainLimits_1 = require("./lib/mainLimits");
const atomicWrite_1 = require("./documents/atomicWrite");
const documentActors_1 = require("./documents/documentActors");
const documentWrites_1 = require("./documents/documentWrites");
const platform_1 = require("./lib/platform");
const record_1 = require("../shared/core/record");
const mainValidation_1 = require("./app/mainValidation");
const usageCounts_1 = require("./app/usageCounts");
const electron_1 = require("electron");
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const url_1 = require("url");
const contentConfig_1 = require("./content/contentConfig");
const thumbs = __importStar(require("./project/thumbs"));
const windowBounds_1 = require("./app/windowBounds");
const windowSecurity_1 = require("./app/windowSecurity");
const terminal_1 = require("./terminal/terminal");
const projectWatcher_1 = require("./project/projectWatcher");
const electron_updater_1 = require("electron-updater");
const autoUpdate_1 = require("./app/autoUpdate");
const mainHelpers_1 = require("./lib/mainHelpers");
const nodeTools_1 = require("./lib/nodeTools");
const projectFiles_1 = require("./project/projectFiles");
const assetFiles_1 = require("./project/assetFiles");
const previewServers_1 = require("./preview/previewServers");
const devServers_1 = require("./handlers/devServers");
const thumbnails_1 = require("./handlers/thumbnails");
const assetHandlers_1 = require("./handlers/assetHandlers");
const cmsHandlers_1 = require("./handlers/cmsHandlers");
const componentHandlers_1 = require("./handlers/componentHandlers");
const contentHandlers_1 = require("./handlers/contentHandlers");
const cssVariableHandlers_1 = require("./handlers/cssVariableHandlers");
const gitHandlers_1 = require("./handlers/gitHandlers");
const pageHandlers_1 = require("./handlers/pageHandlers");
const previewHandlers_1 = require("./handlers/previewHandlers");
const projectHandlers_1 = require("./handlers/projectHandlers");
const projectScanHandlers_1 = require("./handlers/projectScanHandlers");
const styleSourceHandlers_1 = require("./handlers/styleSourceHandlers");
const selectorHandlers_1 = require("./handlers/selectorHandlers");
// The facade keeps native Electron registration behind a parsed payload boundary.
const ipcMain = { handle: (0, ipcRegistrar_1.createIpcRegistrar)(electron_1.ipcMain) };
(0, nodeTools_1.setToolPathHome)(electron_1.app.getPath('home'));
let mainWindow = undefined;
// The project's dev server and its home-page pictures: state of this process,
// kept by the objects that own it (handlers/devServers.ts, thumbnails.ts).
// CMS keys are encrypted by the operating system (cms/cmsConnectionStore.ts).
const cmsConnections = new cmsConnectionStore_1.CmsConnectionStore({
    available: () => electron_1.safeStorage.isEncryptionAvailable(),
    encrypt: (text) => electron_1.safeStorage.encryptString(text),
    decrypt: (data) => electron_1.safeStorage.decryptString(data),
}, () => electron_1.app.getPath('userData'));
const devServers = new devServers_1.DevServers({ send }, (projectRoot) => (0, cmsPreviewEnvironment_1.cmsPreviewEnvironment)(cmsConnections, projectRoot));
const thumbnails = new thumbnails_1.Thumbnails({
    devServers,
    userDataPath: () => electron_1.app.getPath('userData'),
});
const autoUpdates = new autoUpdate_1.AutoUpdates({
    app: electron_1.app,
    autoUpdater: electron_updater_1.autoUpdater,
    beforeInstall: () => devServers.stop(),
    parentWindow: () => (mainWindow && !mainWindow.isDestroyed() ? mainWindow : undefined),
    showMessageBox,
});
// --- Dev reload ------------------------------------------------------------
// Only the renderer hot-reloads on its own (Vite). preload.js is re-read from
// disk on a window reload, but main.js and astroParser.js are bound into this
// process at require time and can only be picked up by starting over — which
// is what "Reload All Code" does. So the app relaunches itself, leaving the
// open project in a file for the next process to pick up (the supervisor
// re-spawns us with the same argv, so there's nothing to hand forward there),
// landing back where you were instead of on the welcome screen.
const isDev = !!process.env['VITE_DEV_SERVER_URL'];
// Exiting with this asks scripts/build/devElectron.ts to start us again. Not
// app.relaunch(): `npm run dev` runs us under `concurrently -k`, so quitting
// would take the Vite server down with us and the new process would load a
// dead localhost:5173.
const RELAUNCH_CODE = 42;
const reopenFile = () => path.join(electron_1.app.getPath('userData'), 'dev-reopen.json');
function relaunchApp() {
    try {
        // openProjectRoot is set whenever a project's watcher starts, i.e. on open.
        if (openProjectRoot) {
            fs.writeFileSync(reopenFile(), JSON.stringify({ path: openProjectRoot }), 'utf8');
        }
    }
    catch {
        /* worst case the reload lands on the welcome screen */
    }
    // app.exit skips before-quit, so take the Astro dev server down by hand —
    // otherwise it keeps the port and the next process adopts a server still
    // running the previously generated config.
    devServers.stop();
    electron_1.app.exit(RELAUNCH_CODE);
}
// ---------------------------------------------------------------------------
// Asset previews
//
// Thumbnails (Assets panel, the props panel's image field) read straight off
// disk. A bare file:// URL only loads when the document itself came from
// file://, which is true of a packaged build (loadFile) but not of `npm run
// dev`, where the renderer is served over http — Chromium blocks file://
// subresources from an http document, so every preview fell back to its
// extension badge. Serving them over our own scheme behaves the same in both.
// ---------------------------------------------------------------------------
const ASSET_SCHEME = 'stacki-asset';
let openProjectRoot = undefined; // set when a project's watcher starts
// The project the app has open: the asset protocol, the style panel and the
// terminal touch files only inside it.
function noteProjectRoot(projectPath) {
    openProjectRoot = path.resolve(projectPath);
}
// Same containment rule the asset protocol uses: the style panel writes only
// inside the project that is currently open.
function assertInProject(filePath) {
    const abs = path.resolve(String(filePath || ''));
    if (!openProjectRoot || !(0, platform_1.isPathDescendant)(openProjectRoot, abs)) {
        throw new Error('Refusing to touch a file outside the open project.');
    }
    return abs;
}
// Must run before the app is ready.
electron_1.protocol.registerSchemesAsPrivileged([
    {
        scheme: ASSET_SCHEME,
        privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true },
    },
]);
function registerAssetProtocol() {
    electron_1.protocol.handle(ASSET_SCHEME, (request) => {
        let abs;
        try {
            abs = decodeURIComponent(new URL(request.url).pathname);
        }
        catch {
            return new Response(undefined, { status: 400 });
        }
        // The URL's path is stacki-asset://local/Users/… on POSIX, /C:/… for a
        // Windows drive, and ///server/share/… for a Windows UNC path.
        if (mainHelpers_1.isWin) {
            abs = abs.replace(/^\//, '');
        }
        abs = path.resolve(abs);
        // Preview iframes run the user's own site; keep the scheme from being a
        // general-purpose file reader by serving only the open project's files.
        if (!openProjectRoot || !(0, platform_1.isPathDescendant)(openProjectRoot, abs)) {
            return new Response(undefined, { status: 403 });
        }
        return serveFile(abs, request);
    });
}
// Every window shares the default session, so one rule covers the app and its previews.
function refusePrivatePermissions() {
    electron_1.session.defaultSession.setPermissionRequestHandler((_contents, permission, callback) => {
        callback(!(0, windowSecurity_1.isPrivatePermission)(permission));
    });
    electron_1.session.defaultSession.setPermissionCheckHandler((_contents, permission) => !(0, windowSecurity_1.isPrivatePermission)(permission));
}
// The preload hands Stacki's API to whatever page this window shows, so the
// window never leaves Stacki's own page; web links open in the browser instead.
function keepOnAppPage(window, appUrl) {
    window.webContents.on('will-navigate', (event) => {
        if ((0, windowSecurity_1.isAppPage)(event.url, appUrl)) {
            return;
        }
        event.preventDefault();
        if ((0, windowSecurity_1.isBrowserLink)(event.url)) {
            openExternalLink(event.url);
        }
    });
}
async function serveFile(abs, request) {
    const response = await electron_1.net.fetch((0, url_1.pathToFileURL)(abs).toString(), { headers: request.headers });
    // The renderer is a different origin from this scheme, and font loading is
    // CORS-checked (unlike <img>/<video>), so the Assets panel's "Aa" preview
    // needs this to fetch the face at all. Reach is already limited to the open
    // project by the check above.
    const headers = new Headers(response.headers);
    headers.set('Access-Control-Allow-Origin', '*');
    return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers,
    });
}
// ---------------------------------------------------------------------------
// Window
// ---------------------------------------------------------------------------
const resource = runtimePaths_1.resourcePath;
// electron-builder stamps the icon onto packaged builds (build.mac.icon), but
// `npm run dev` runs the bare Electron binary, which shows its own icon in the
// Dock. Set it explicitly so dev looks like the real app. macOS takes the
// padded icon-dock.png; elsewhere the Dock isn't a thing and the window icon
// below covers it.
function setApplicationIcon() {
    if (process.platform !== 'darwin') {
        return;
    }
    const img = electron_1.nativeImage.createFromPath(resource('icon-dock.png'));
    if (!img.isEmpty()) {
        electron_1.app.dock?.setIcon(img);
    }
}
function createWindow() {
    // Opened filled: the display the pointer is on, minus what the OS keeps (see
    // windowBounds.js). The display under the pointer rather than the primary
    // one — on a laptop with a monitor beside it, the app should open where the
    // person is looking.
    let bounds;
    try {
        bounds = (0, windowBounds_1.openingBounds)(electron_1.screen.getDisplayNearestPoint(electron_1.screen.getCursorScreenPoint()).workArea);
    }
    catch {
        // No display to ask about (a headless run, an unusual session): a laptop
        // sized window is a fine thing to fall back to.
        bounds = (0, windowBounds_1.openingBounds)({ width: 1480, height: 940 });
    }
    mainWindow = new electron_1.BrowserWindow({
        ...bounds,
        title: 'Stacki',
        backgroundColor: '#111111',
        titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : mainHelpers_1.isWin ? 'hidden' : 'default',
        ...(mainHelpers_1.isWin
            ? {
                titleBarOverlay: {
                    color: '#171717',
                    symbolColor: '#a8a8a8',
                    height: 40,
                },
            }
            : {}),
        // Windows/Linux taskbar + window chrome; macOS uses the Dock icon above.
        icon: resource(process.platform === 'darwin' ? 'icon.icns' : mainHelpers_1.isWin ? 'icon.ico' : 'icon.png'),
        webPreferences: {
            preload: runtimePaths_1.RUNTIME_PATHS.preload,
            contextIsolation: true,
            nodeIntegration: false,
            // Run the preload in preview iframes too, so they can report their
            // page height for the canvas view (the preload guards what each
            // frame type gets).
            nodeIntegrationInSubFrames: true,
        },
    });
    (0, previewFailure_1.listenForPreviewFailures)(mainWindow.webContents, () => devServers.current()?.url);
    // A renderer that does not load leaves an empty window; the log says why.
    const loaded = process.env['VITE_DEV_SERVER_URL'] ? mainWindow.loadURL(process.env['VITE_DEV_SERVER_URL']) : mainWindow.loadFile(runtimePaths_1.RUNTIME_PATHS.rendererIndex);
    loaded.catch((error) => {
        console.error('[window] the renderer did not load:', error);
    });
    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
        if ((0, windowSecurity_1.isBrowserLink)(url)) {
            openExternalLink(url);
        }
        return { action: 'deny' };
    });
    keepOnAppPage(mainWindow, process.env['VITE_DEV_SERVER_URL'] ?? (0, url_1.pathToFileURL)(runtimePaths_1.RUNTIME_PATHS.rendererIndex).toString());
    // Somebody closed the window. Whatever was open is over: the next window is a
    // fresh start and belongs on the welcome screen, not back in the project this
    // one had. (A reload doesn't come through here, which is the difference the
    // reopen above is asking about.)
    mainWindow.on('closed', () => {
        openProjectRoot = undefined;
        stopWatchingProject();
        devServers.stop();
        (0, contentConfig_1.stopAllServices)();
        (0, previewServers_1.stopAllPreviews)();
        (0, terminal_1.cleanupTerminals)();
    });
}
// Links open in the user's browser. There is no one to tell when the browser
// cannot be started, so the failure goes to the log.
function openExternalLink(url) {
    electron_1.shell.openExternal(url).catch((error) => {
        console.error(`[shell] could not open ${url}:`, error);
    });
}
ipcMain.handle('shell:openExternal', async (_event, url) => {
    if ((0, windowSecurity_1.isBrowserLink)(url)) {
        openExternalLink(url);
    }
    return { ok: true };
});
// Custom menu: on macOS the native menu consumes ⌘Z/⌘C/⌘V before the page
// sees them, so Undo/Redo/Copy/Paste forward to the renderer, which decides
// between app-level actions (nodes) and native ones (text fields).
function buildMenu() {
    const isMac = process.platform === 'darwin';
    const template = [
        ...(isMac ? [{ role: 'appMenu' }] : []),
        {
            // Spelled out rather than `role: 'fileMenu'`, which takes no additions.
            // What that role provides is one item — Close Window on macOS, Quit
            // everywhere else — so the menu keeps exactly what it had, with the
            // update check above it.
            label: 'File',
            submenu: [
                {
                    label: 'Settings…',
                    accelerator: 'CmdOrCtrl+,',
                    click: () => send('menu:settings'),
                },
                { type: 'separator' },
                // Until now the only way out of a project was to close the app, and on
                // macOS closing the app is not what people think it is: the window goes
                // and the process stays, so coming back lands on the same project and
                // there is nothing to press that says otherwise.
                {
                    label: 'Open Project…',
                    accelerator: 'CmdOrCtrl+O',
                    click: () => send('menu:openProject'),
                },
                {
                    label: 'Close Project',
                    accelerator: 'Shift+CmdOrCtrl+W',
                    click: () => send('menu:closeProject'),
                },
                { type: 'separator' },
                { label: 'Check for Updates…', click: () => void autoUpdates.checkFromMenu() },
                { type: 'separator' },
                isMac ? { role: 'close' } : { role: 'quit' },
            ],
        },
        {
            label: 'Edit',
            submenu: [
                { label: 'Undo', accelerator: 'CmdOrCtrl+Z', click: () => send('menu:undo') },
                { label: 'Redo', accelerator: 'Shift+CmdOrCtrl+Z', click: () => send('menu:redo') },
                { type: 'separator' },
                { role: 'cut' },
                { label: 'Copy', accelerator: 'CmdOrCtrl+C', click: () => send('menu:copy') },
                { label: 'Paste', accelerator: 'CmdOrCtrl+V', click: () => send('menu:paste') },
                { role: 'selectAll' },
                { type: 'separator' },
                {
                    label: 'Copy Selection',
                    accelerator: 'Shift+CmdOrCtrl+C',
                    click: () => send('menu:copySelection'),
                },
                { label: 'Insert Element…', accelerator: 'CmdOrCtrl+E', click: () => send('menu:insert') },
            ],
        },
        // In dev ⌘R has to mean "restart the process". main.js, astroParser.js and
        // the rest of this side are bound in at require time, so the stock reload
        // repaints the renderer while silently going on running the old code —
        // the failure mode is an edit that appears to do nothing. The plain window
        // reload keeps its usual behaviour one item down. A packaged build has no
        // supervisor to restart it and no source to pick up, so it keeps the stock
        // menu.
        buildViewMenu(),
        { role: 'windowMenu' },
    ];
    electron_1.Menu.setApplicationMenu(electron_1.Menu.buildFromTemplate(template));
}
// A project the app has been asked to open in the window it is about to load —
// set by `project:close` when somebody picks a different project, since letting
// go of one is done by reloading the window and the choice has to outlive that.
// Consumed on read.
let pendingProject = undefined;
// The project the renderer should pick up as it mounts, or undefined — which is the
// welcome screen, and is what a cold start gets.
//
// Three ways a renderer can come up wanting a project:
//   - it was told to: somebody chose one from the menu, and the window was
//     reloaded to let go of the last one (`pendingProject`).
//   - it reloaded but this process didn't — a Vite full page reload, or
//     "Reload Window Only" in dev. openProjectRoot is still in memory, so use
//     it. A window that a PERSON closed clears that memory (see createWindow),
//     because closing a window is not reloading it: the next one is a fresh
//     start and must land on the welcome screen.
//   - the whole process restarted ("Reload All Code"), and memory is gone —
//     relaunchApp left the path in a file. Consumed on read, so a later cold
//     start doesn't silently skip the welcome screen.
ipcMain.handle('project:pending', () => {
    const asked = pendingProject;
    pendingProject = undefined;
    if (asked && fs.existsSync(asked)) {
        return asked;
    }
    if (!isDev) {
        return undefined;
    }
    if (openProjectRoot && fs.existsSync(openProjectRoot)) {
        return openProjectRoot;
    }
    let reopenPath = undefined;
    try {
        const input = JSON.parse((0, mainLimits_1.readSource)(reopenFile()));
        reopenPath = (0, mainValidation_1.parseOptionalString)((0, record_1.toRecord)(input)?.['path']) || undefined;
    }
    catch {
        return undefined;
    }
    try {
        fs.rmSync(reopenFile(), { force: true });
    }
    catch {
        /* non-fatal */
    }
    return reopenPath && fs.existsSync(reopenPath) ? reopenPath : undefined;
});
// Native clipboard actions on the focused element, requested by the renderer
// when a menu Copy/Paste lands while a text field has focus.
ipcMain.handle('native:copy', () => {
    mainWindow?.webContents.copy();
    return { ok: true };
});
ipcMain.handle('native:paste', () => {
    mainWindow?.webContents.paste();
    return { ok: true };
});
// Undo INSIDE a field. ⌘Z is a menu accelerator, so the key never reaches the
// page and a text field's own undo never runs — this is the app handing it
// back when that is what the shortcut meant.
ipcMain.handle('native:undo', () => {
    mainWindow?.webContents.undo();
    return { ok: true };
});
ipcMain.handle('native:redo', () => {
    mainWindow?.webContents.redo();
    return { ok: true };
});
// Electron resolves whenReady once; were it ever refused, there is no window
// to report that to, so the log says it.
electron_1.app.whenReady().then(() => {
    // Before the menu, which draws the sound item's tick from it.
    settings = readSettings();
    setApplicationIcon();
    registerAssetProtocol();
    refusePrivatePermissions();
    buildMenu();
    createWindow();
    autoUpdates.start();
    void showUsageNotice();
    electron_1.app.on('browser-window-focus', () => {
        if (watcher) {
            noteUsageActivity();
        }
    });
    // Terminals open in the project the app has open — same reach as the asset
    // protocol, which is what `openProjectRoot` already scopes.
    (0, terminal_1.registerTerminalHandlers)({ send, projectRoot: () => openProjectRoot });
    electron_1.app.on('activate', () => {
        if (electron_1.BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
}, (error) => {
    console.error('[app] Electron did not become ready:', error);
});
// Everything a project had running, let go of. The window reloads after this,
// which is the only way to be sure nothing of the last project is still being
// held — a page half-loaded, an undo stack, a watcher, a shell — and none of
// this survives the reload on its own: a pty outlives the window that opened
// it, and the dev server outlives everything.
ipcMain.handle('project:close', async (_event, next) => {
    pendingProject = typeof next === 'string' && next ? next : undefined;
    devServers.stop();
    (0, contentConfig_1.stopAllServices)();
    (0, previewServers_1.stopAllPreviews)();
    (0, terminal_1.cleanupTerminals)();
    stopWatchingProject();
    // Nothing is open, so nothing is in reach: the asset protocol and the
    // terminals both scope themselves to this.
    openProjectRoot = undefined;
    // The window starts over. Done here rather than in the renderer because it
    // is the same act as the teardown above — the renderer holds a page, an undo
    // stack and forty pieces of state that belong to the project just closed, and
    // none of it should be in the window that opens the next one.
    mainWindow?.webContents.reload();
    return { ok: true };
});
electron_1.app.on('window-all-closed', () => {
    // The hidden window a thumbnail is captured in is still a window, and
    // destroying it fires this. That is not the app being closed — and treating
    // it as one killed the dev server (and, off macOS, quit) in the middle of
    // taking a picture.
    if (mainWindow && !mainWindow.isDestroyed()) {
        return;
    }
    devServers.stop();
    // The pty ids are keyed to the window that opened them, so a surviving shell
    // could never be reached again — and on macOS the app stays running.
    (0, terminal_1.cleanupTerminals)();
    if (process.platform !== 'darwin') {
        electron_1.app.quit();
    }
});
electron_1.app.on('before-quit', () => {
    stopWatchingProject();
    devServers.stop();
});
// Reading a project's content config leaves a process behind holding its
// schemas; they go when the app does.
electron_1.app.on('before-quit', () => (0, contentConfig_1.stopAllServices)());
// The preview checkouts live inside the user's projects, so leaving one behind
// leaves a stray folder in a place they will notice.
electron_1.app.on('before-quit', () => (0, previewServers_1.stopAllPreviews)());
// A pty outlives the window that opened it unless it is killed.
electron_1.app.on('before-quit', () => (0, terminal_1.cleanupTerminals)());
// ---------------------------------------------------------------------------
// The renderer's window: what the main process tells it, and its dialogs
// ---------------------------------------------------------------------------
function send(channel, payload) {
    if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send(channel, payload);
    }
}
function showMessageBox(parent, options) {
    return parent ? electron_1.dialog.showMessageBox(parent, options) : electron_1.dialog.showMessageBox(options);
}
function showOpenDialog(options) {
    return mainWindow ? electron_1.dialog.showOpenDialog(mainWindow, options) : electron_1.dialog.showOpenDialog(options);
}
// ---------------------------------------------------------------------------
// Settings
//
// One file, read once at startup and written on every change. Only the app's
// own preferences live here — anything about a project belongs to the project.
// ---------------------------------------------------------------------------
// Sound is off. An editor that makes a noise the first time somebody touches it
// is an editor they turn off, so it is asked for rather than opted out of.
const SETTINGS_DEFAULTS = {
    sound: false,
    usageCountsEnabled: true,
    usageNoticeVersion: 0,
};
let settings = { ...SETTINGS_DEFAULTS };
let usageCountInFlight;
const settingsFile = () => path.join(electron_1.app.getPath('userData'), 'settings.json');
function readSettings() {
    if (!fs.existsSync(settingsFile())) {
        return { ...SETTINGS_DEFAULTS };
    }
    try {
        const input = JSON.parse((0, mainLimits_1.readSource)(settingsFile()));
        return (0, mainValidation_1.parseSettings)(input);
    }
    catch {
        // A damaged preference file must never silently re-enable usage counts.
        return { ...SETTINGS_DEFAULTS, usageCountsEnabled: false };
    }
}
function writeSettings() {
    try {
        fs.writeFileSync(settingsFile(), JSON.stringify(settings, null, 2), 'utf8');
        return true;
    }
    catch {
        return false;
    }
}
// Preferences apply immediately; replies distinguish session changes from saved ones.
const publicSettings = () => ({
    sound: settings.sound,
    usageCountsEnabled: settings.usageCountsEnabled,
});
ipcMain.handle('settings:get', publicSettings);
ipcMain.handle('settings:set', (_event, { setting, enabled }) => {
    let saved;
    if (setting === 'sound') {
        settings = { ...settings, sound: enabled };
        saved = writeSettings();
        send('menu:sound', enabled);
    }
    else {
        saved = setUsageCountsEnabled(enabled);
    }
    return { ...publicSettings(), saved };
});
function setUsageCountsEnabled(enabled) {
    if (!enabled) {
        usageCountInFlight?.abort();
    }
    settings = { ...settings, usageCountsEnabled: enabled };
    const saved = writeSettings();
    if (!saved) {
        void showMessageBox(mainWindow, {
            type: 'warning',
            title: 'Privacy Setting Not Saved',
            message: 'Stacki could not save your usage-count preference.',
            detail: 'The change applies for this session. Check available disk space and try again.',
        });
    }
    if (enabled && watcher) {
        noteUsageActivity();
    }
    return saved;
}
function noteUsageActivity() {
    const day = (0, usageCounts_1.usageDay)(new Date());
    if (!(0, usageCounts_1.shouldCountUsage)({
        packaged: electron_1.app.isPackaged,
        enabled: settings.usageCountsEnabled,
        noticeVersion: settings.usageNoticeVersion,
        lastAttemptDay: settings.usageLastAttemptDay,
    }, day)) {
        return;
    }
    if (usageCountInFlight) {
        return;
    }
    const controller = new AbortController();
    usageCountInFlight = controller;
    // Save the attempt before sending so reopening projects cannot produce
    // duplicate counts if the server accepted a request but its reply was lost.
    settings = { ...settings, usageLastAttemptDay: day };
    if (!writeSettings()) {
        usageCountInFlight = undefined;
        return;
    }
    void (0, usageCounts_1.sendUsageCount)({ signal: controller.signal }, fetch).finally(() => {
        if (usageCountInFlight === controller) {
            usageCountInFlight = undefined;
        }
    });
}
function usageNoticeOptions() {
    return {
        type: 'info',
        title: 'Anonymous Usage Counts',
        message: 'Help us understand how many Stacki installations are active.',
        detail: 'Stacki sends one count on days you open a project. It sends no project names, ' +
            'file contents, device identifier, or activity history. Daily totals are kept ' +
            'on Cloudflare for up to 366 days; its network sees the connection IP, but the ' +
            'usage database does not store it. Turn this off any time in File → Settings.',
        buttons: ['Continue'],
        checkboxLabel: 'Turn off anonymous usage counts',
        checkboxChecked: !settings.usageCountsEnabled,
    };
}
async function showUsageNotice() {
    if (!electron_1.app.isPackaged || settings.usageNoticeVersion >= usageCounts_1.USAGE_NOTICE_VERSION) {
        return;
    }
    try {
        const answer = await showMessageBox(mainWindow, usageNoticeOptions());
        settings = {
            ...settings,
            usageCountsEnabled: !answer.checkboxChecked,
            usageNoticeVersion: usageCounts_1.USAGE_NOTICE_VERSION,
        };
        writeSettings();
        buildMenu();
        if (watcher) {
            noteUsageActivity();
        }
    }
    catch (error) {
        // If the notice could not be shown, the version stays old and no count is sent.
        console.warn('Could not show usage notice:', error);
    }
}
// ---------------------------------------------------------------------------
// Recent projects (their pictures: handlers/thumbnails.ts)
// ---------------------------------------------------------------------------
const recentsFile = () => path.join(electron_1.app.getPath('userData'), 'recents.json');
function readRecents() {
    try {
        const input = JSON.parse((0, mainLimits_1.readSource)(recentsFile()));
        return (0, mainValidation_1.parseRecents)(input);
    }
    catch {
        return [];
    }
}
function writeRecents(list) {
    try {
        fs.writeFileSync(recentsFile(), JSON.stringify(list, null, 2), 'utf8');
    }
    catch {
        /* non-fatal */
    }
}
ipcMain.handle('recents:list', async () => {
    // Drop entries whose folder is gone or no longer looks like an Astro project.
    const list = readRecents().filter((recent) => {
        try {
            return fs.existsSync(recent.path) && (0, projectFiles_1.isAstroProject)(recent.path);
        }
        catch {
            return false;
        }
    });
    const userData = electron_1.app.getPath('userData');
    return list.map((recent) => {
        // `stale` compares the picture against the files it was taken from, so a
        // project edited in another editor — or by a teammate, through git — says
        // so on the card instead of showing last month's homepage as if it were
        // today's.
        let stale = true;
        let thumb = undefined;
        try {
            thumb = thumbs.readThumb(userData, recent.path) ?? undefined;
            stale = thumbs.isStale(userData, recent.path);
        }
        catch {
            /* card renders a placeholder */
        }
        return { ...recent, thumb, stale: !!stale, canRefresh: (0, projectFiles_1.hasDependencies)(recent.path) };
    });
});
ipcMain.handle('recents:add', async (_event, projectPath) => {
    const list = readRecents().filter((recent) => !(0, platform_1.sameFilesystemPath)(recent.path, projectPath));
    list.unshift({
        path: projectPath,
        name: path.basename(projectPath),
        openedAt: Date.now(),
    });
    writeRecents(list.slice(0, 12));
    return { ok: true };
});
ipcMain.handle('recents:remove', async (_event, projectPath) => {
    writeRecents(readRecents().filter((recent) => !(0, platform_1.sameFilesystemPath)(recent.path, projectPath)));
    // The picture and the note about when it was taken both go.
    thumbs.forget(electron_1.app.getPath('userData'), projectPath);
    return { ok: true };
});
// ---------------------------------------------------------------------------
// File watching — reflect external edits back into the app
// ---------------------------------------------------------------------------
let watcher;
// A compile error replaces the site with the dev server's own error screen, and
// that screen carries no HMR client — so when the mistake is fixed, nothing in
// the preview hears about it and it sits on the error until someone presses
// refresh. The app's own writes are deliberately invisible to the watcher
// below, so this is the one place that sees every one of them: say that the
// site may have changed, and let the renderer go and ask (see `dev:probe`).
// `external` — the change came from outside the app: an editor, a script, a
// git checkout. The canvas hears about the app's own writes through the dev
// server's HMR socket and patches itself; an outside change reaches it the
// same way, when that socket is still listening. This flag is what lets the
// app tell the canvas directly as well, so a socket that has gone quiet is no
// longer the difference between seeing your edit and pressing refresh.
let pageChangeTimer;
let pageChangeExternal = false;
function notePageMayHaveChanged(external = false) {
    pageChangeExternal = pageChangeExternal || external;
    clearTimeout(pageChangeTimer);
    pageChangeTimer = setTimeout(() => {
        const wasExternal = pageChangeExternal;
        pageChangeExternal = false;
        send('page:maybe-changed', { external: wasExternal });
    }, 200);
}
// The app changed a project file: its own text write (through the file's
// actor), or a move, rename or delete. The canvas may need to hear of it.
function noteAppWrite() {
    notePageMayHaveChanged();
}
// The main process's document actors (plan §2 layer 2): from step 5 every
// write of project text goes through them (documentWrites.ts). Telemetry (plan
// §9a) is one structured line per outcome on stdout, with hashed paths.
(0, documentWrites_1.installDocumentHost)({
    documents: (0, documentActors_1.createNodeDocumentActors)({
        log: (line) => console.info(line),
        schedule: (task) => setImmediate(task),
    }),
    noteWrite: noteAppWrite,
});
const documents = (0, documentWrites_1.documentHost)().documents;
// Whether a watcher event is the app hearing its own write come back (plan
// §11.9): the file holds exactly the bytes its actor last wrote. That is a
// question about bytes, never about elapsed time — an editor's save a moment
// after the app's holds other bytes, and is heard. A save's temporary file and
// its lock file (atomicWrite.ts) are the app's own too: they exist only while
// the actor writes. A move, rename or delete is heard like an outside change;
// the one read each listener then makes finds what the app already has.
const isSelfWrite = (full) => {
    if ((0, atomicWrite_1.isAtomicTemporary)(full)) {
        return true;
    }
    return documents.echoes(path.resolve(full));
};
ipcMain.handle('watch:start', async (_event, projectPath) => {
    stopWatchingProject();
    noteProjectRoot(projectPath);
    if (!fs.existsSync(path.join(projectPath, 'src'))) {
        return { ok: false };
    }
    watcher = (0, projectWatcher_1.watchProject)({
        projectPath,
        send,
        isSelfWrite,
        noteExternalChange: (changed) => documents.noteExternalChange(changed),
        notePageMayHaveChanged,
        scheduleThumb: (projectPath, delayMs) => thumbnails.schedule(projectPath, delayMs),
        mediaPattern: assetFiles_1.MEDIA_EXT,
    });
    noteUsageActivity();
    return { ok: true };
});
function stopWatchingProject() {
    watcher?.close();
    watcher = undefined;
    clearTimeout(pageChangeTimer);
    pageChangeTimer = undefined;
    pageChangeExternal = false;
    thumbnails.stop();
    documents.clear();
}
function buildViewMenu() {
    return isDev
        ? {
            label: 'View',
            submenu: [
                { label: 'Reload All Code', accelerator: 'CmdOrCtrl+R', click: () => relaunchApp() },
                {
                    label: 'Reload Window Only',
                    accelerator: 'Shift+CmdOrCtrl+R',
                    click: () => mainWindow?.webContents.reload(),
                },
                { type: 'separator' },
                { role: 'toggleDevTools' },
                { type: 'separator' },
                { role: 'resetZoom' },
                { role: 'zoomIn' },
                { role: 'zoomOut' },
                { type: 'separator' },
                { role: 'togglefullscreen' },
            ],
        }
        : { role: 'viewMenu' };
}
// ---------------------------------------------------------------------------
// IPC handler modules
//
// Each module registers its channels with what it uses of this file, a Pick
// of one host (handlers/mainHost.ts). Registration runs when this file loads,
// before the window can invoke anything.
// ---------------------------------------------------------------------------
const host = {
    ipcMain,
    assertInProject,
    clipboard: electron_1.clipboard,
    documents,
    noteAppWrite,
    noteProjectRoot,
    readTrailingSlash: (projectPath) => devServers.readTrailingSlash(projectPath),
    send,
    shell: electron_1.shell,
    showOpenDialog,
};
(0, assetHandlers_1.registerAssetHandlers)(host);
(0, cmsHandlers_1.registerCmsHandlers)(host);
(0, componentHandlers_1.registerComponentHandlers)(host);
(0, contentHandlers_1.registerContentHandlers)(host, { restartForNewContentConfig: (devUrl) => devServers.restartForNewContentConfig(devUrl) });
(0, cssVariableHandlers_1.registerCssVariableHandlers)(host);
(0, gitHandlers_1.registerGitHandlers)(host);
(0, gitRepositoryHandlers_1.registerGitRepositoryHandlers)(host);
(0, imageConversionHandler_1.registerImageConversionHandler)(host);
(0, pageHandlers_1.registerPageHandlers)(host);
(0, previewHandlers_1.registerPreviewHandlers)(host);
(0, projectHandlers_1.registerProjectHandlers)(host);
(0, projectMetadataHandlers_1.registerProjectMetadataHandlers)(host);
(0, publishHandlers_1.registerPublishHandlers)(host);
(0, cmsConnectionHandlers_1.registerCmsConnectionHandlers)(host, cmsConnections, new sanityLogin_1.SanityLogin(cmsConnections));
(0, studioHandlers_1.registerStudioHandlers)(host, electron_1.app.isPackaged ? { kind: 'packaged' } : { kind: 'development', appPath: electron_1.app.getAppPath() }, () => electron_1.app.getVersion());
(0, projectScanHandlers_1.registerProjectScanHandlers)(host);
(0, styleSourceHandlers_1.registerStyleSourceHandlers)(host);
(0, selectorHandlers_1.registerSelectorHandlers)(host);
(0, devServers_1.registerDevServerHandlers)({ ipcMain, devServers, thumbnails });
(0, thumbnails_1.registerThumbnailHandlers)({ ipcMain, thumbnails, userDataPath: () => electron_1.app.getPath('userData') });
