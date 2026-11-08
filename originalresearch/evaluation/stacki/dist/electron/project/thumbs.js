"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.VIEWPORT = exports.thumbPathFor = void 0;
exports.capture = capture;
exports.fingerprint = fingerprint;
exports.isStale = isStale;
exports.readMeta = readMeta;
exports.readThumb = readThumb;
exports.forget = forget;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const crypto_1 = __importDefault(require("crypto"));
const electron_1 = require("electron");
const result_1 = require("../../shared/core/result");
const record_1 = require("../../shared/core/record");
// The picture of a project on the start screen.
//
// It used to be a photograph of the app: capturePage over the region where the
// canvas iframe sat. That takes a picture of whatever the editor happened to be
// showing — the page you left off on, scrolled to wherever you left it, with
// any panel that was open over the canvas in the shot. A thumbnail is supposed
// to say "this is the site", and that one said "this is what you were doing".
//
// So nothing is photographed through the app any more. The project's home page
// is loaded into a window of its own, off screen, at a fixed desktop size, and
// the top of it is captured: the hero, at the top of the page, at a size that
// matches what the site is designed for, with no editor chrome in the frame
// because there is no editor in the window.
const VIEWPORT = { width: 1440, height: 900 };
exports.VIEWPORT = VIEWPORT;
const THUMB_WIDTH = 720;
// Long enough for fonts, hero video posters and entrance animations to land —
// a hero whose headline animates in letter by letter is halfway through it at a
// second. Short enough that a project that never settles (a rotator, a marquee)
// still gets its picture taken.
const SETTLE_MS = 1800;
const LOAD_TIMEOUT = 15000;
const CAPTURE_TIMEOUT_MS = 3000;
const CAPTURE_RETRY_MS = 150;
const thumbsDirectory = (userDataPath) => path_1.default.join(userDataPath, 'thumbs');
const keyFor = (projectPath) => crypto_1.default.createHash('sha1').update(projectPath).digest('hex').slice(0, 16);
const thumbPathFor = (userDataPath, projectPath) => path_1.default.join(thumbsDirectory(userDataPath), `${keyFor(projectPath)}.png`);
exports.thumbPathFor = thumbPathFor;
const metaPathFor = (userDataPath, projectPath) => path_1.default.join(thumbsDirectory(userDataPath), `${keyFor(projectPath)}.json`);
// What the site is made of, as one number that changes when any of it does.
// Only the directories a page can be built from — a thumbnail does not go stale
// because node_modules changed, and walking it would cost more than the
// screenshot.
const SOURCE_DIRECTORIES = ['src', 'public'];
// A site's own folders rarely nest past four or five; deeper trees are left
// out of the fingerprint rather than walked.
const THUMB_LIMITS = { walkDepthMax: 8 };
const SKIP = new Set(['node_modules', 'dist', '.git', '.astro', '.stacki', '.vercel', '.netlify']);
function fingerprint(projectPath) {
    const hash = crypto_1.default.createHash('sha1');
    const include = (full) => {
        try {
            const stat = fs_1.default.statSync(full);
            // Count + newest timestamp misses changes to every older file whenever
            // another file has a future timestamp. Include each path and its own
            // metadata so renames and edits both invalidate the thumbnail.
            hash.update(JSON.stringify([path_1.default.relative(projectPath, full), stat.size, stat.mtimeMs, stat.ctimeMs]));
        }
        catch {
            /* raced with a write */
        }
    };
    const walk = (directory, depth) => {
        if (depth > THUMB_LIMITS.walkDepthMax) {
            return;
        }
        let entries;
        try {
            entries = fs_1.default.readdirSync(directory, { withFileTypes: true });
        }
        catch {
            return;
        }
        entries.sort((left, right) => left.name.localeCompare(right.name));
        for (const entry of entries) {
            if (entry.name.startsWith('.') || SKIP.has(entry.name)) {
                continue;
            }
            const full = path_1.default.join(directory, entry.name);
            if (entry.isDirectory()) {
                walk(full, depth + 1);
            }
            else {
                include(full);
            }
        }
    };
    for (const directory of SOURCE_DIRECTORIES) {
        walk(path_1.default.join(projectPath, directory), 0);
    }
    for (const name of ['astro.config.mjs', 'astro.config.ts', 'astro.config.js', 'astro.config.mts', 'astro.config.cjs', 'package.json']) {
        include(path_1.default.join(projectPath, name));
    }
    return hash.digest('hex');
}
function readMeta(userDataPath, projectPath) {
    try {
        const raw = JSON.parse(fs_1.default.readFileSync(metaPathFor(userDataPath, projectPath), 'utf8'));
        return (0, record_1.toRecord)(raw);
    }
    catch {
        return undefined;
    }
}
/**
 * True when the site has changed since its picture was taken — including
 * changes made with the app closed, which is most of them.
 */
function isStale(userDataPath, projectPath) {
    const meta = readMeta(userDataPath, projectPath);
    if (!meta || !fs_1.default.existsSync(thumbPathFor(userDataPath, projectPath))) {
        return true;
    }
    return meta['fingerprint'] !== fingerprint(projectPath);
}
function readThumb(userDataPath, projectPath) {
    try {
        const data = fs_1.default.readFileSync(thumbPathFor(userDataPath, projectPath));
        return 'data:image/png;base64,' + data.toString('base64');
    }
    catch {
        return undefined;
    }
}
function forget(userDataPath, projectPath) {
    try {
        fs_1.default.rmSync(thumbPathFor(userDataPath, projectPath), { force: true });
        fs_1.default.rmSync(metaPathFor(userDataPath, projectPath), { force: true });
    }
    catch {
        /* non-fatal */
    }
}
// The window the page is rendered in. No preload, no node, nothing of the app:
// this is a browser showing a website, and it should behave like one — the page
// is the real page, not the marked-up one the canvas edits.
function makeWindow() {
    // The untyped original carried paintWhenInitiallyHidden inside
    // webPreferences; Electron reads that option from the window options, so
    // this placement is inert. Preserved exactly — changing when the page paints
    // is a behavior change, and thumbnails work as written.
    const webPreferences = {
        paintWhenInitiallyHidden: true,
        offscreen: false,
        sandbox: true,
        contextIsolation: true,
        nodeIntegration: false,
        nodeIntegrationInSubFrames: false,
        backgroundThrottling: false,
        images: true,
    };
    return new electron_1.BrowserWindow({
        show: false,
        width: VIEWPORT.width,
        height: VIEWPORT.height,
        useContentSize: true,
        backgroundColor: '#ffffff',
        webPreferences,
    });
}
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
async function within(promise, ms, message) {
    let timer;
    try {
        return await Promise.race([
            promise,
            new Promise((_, reject) => {
                timer = setTimeout(() => reject(new Error(message)), ms);
            }),
        ]);
    }
    finally {
        clearTimeout(timer);
    }
}
async function captureImage(contents) {
    const first = await captureImageAttempt(contents);
    if (first.ok) {
        return first;
    }
    if (first.error !== 'UnknownVizError') {
        return first;
    }
    // A cold compositor can reject its first copy even after load and animation frames.
    // Retry only that transient error, once, without reloading or showing the window.
    await wait(CAPTURE_RETRY_MS);
    return captureImageAttempt(contents);
}
function captureImageAttempt(contents) {
    return within(contents.capturePage({ x: 0, y: 0, width: VIEWPORT.width, height: VIEWPORT.height }, { stayHidden: false, stayAwake: false }), CAPTURE_TIMEOUT_MS, 'the page capture did not finish').then(result_1.ok, (error) => (0, result_1.err)(error instanceof Error ? error.message : String(error)));
}
/**
 * Renders `url` and stores the top of the page as this project's thumbnail.
 * A thumbnail is never worth throwing over, so every failure comes back as a
 * value and the old picture stays.
 */
async function capture(userDataPath, projectPath, url) {
    let win = undefined;
    try {
        win = makeWindow();
        const capturedFingerprint = fingerprint(projectPath);
        // loadURL tracks the main frame, so a failed subframe cannot reject a
        // successful page. Race the load itself: awaiting it before the timeout
        // promise would leave a stalled navigation holding the capture queue.
        await within(win.loadURL(url), LOAD_TIMEOUT, 'the page did not finish loading');
        // Wait for the things that arrive after the load event and change what the
        // hero looks like, then put the page back at the top: a fragment in the
        // URL, a restored scroll position or a script's own scrollTo would
        // otherwise photograph the middle of the page — which is the bug this
        // replaces.
        await within(win.webContents.executeJavaScript(`(async () => {
           try { await document.fonts.ready; } catch {}
           window.scrollTo(0, 0);
           return document.title || '';
         })()`, true), 3000, 'fonts did not settle').catch(() => '');
        await wait(SETTLE_MS);
        // Back to the top, and stay there until it has been painted. Two things
        // make this more than one line: a page with smooth scrolling animates to
        // the top rather than jumping (so the capture catches it halfway), and a
        // scroll that has been applied has not necessarily been drawn — the
        // compositor paints on the next frame, and capturePage photographs
        // whatever is on screen now.
        await within(win.webContents.executeJavaScript(`new Promise((done) => {
           document.documentElement.style.scrollBehavior = 'auto';
           window.scrollTo(0, 0);
           requestAnimationFrame(() => requestAnimationFrame(() => done(true)));
         })`, true), 3000, 'the page did not repaint').catch(() => { });
        await wait(150);
        const captured = await captureImage(win.webContents);
        if (!captured.ok) {
            return captured;
        }
        const image = captured.value;
        if (image.isEmpty()) {
            return { ok: false, error: 'the capture came back empty' };
        }
        fs_1.default.mkdirSync(thumbsDirectory(userDataPath), { recursive: true });
        fs_1.default.writeFileSync(thumbPathFor(userDataPath, projectPath), image.resize({ width: THUMB_WIDTH }).toPNG());
        fs_1.default.writeFileSync(metaPathFor(userDataPath, projectPath), JSON.stringify({ fingerprint: capturedFingerprint, capturedAt: Date.now(), url }, null, 2));
        return { ok: true };
    }
    catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return { ok: false, error: message || String(error) };
    }
    finally {
        try {
            if (win && !win.isDestroyed()) {
                win.destroy();
            }
        }
        catch {
            /* already gone */
        }
    }
}
