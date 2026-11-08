"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.watchProject = watchProject;
const astroFileMonitor_1 = require("./astroFileMonitor");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
// Both directory watchers and every queued notification belong to one open
// project. Closing it cancels the whole group before another project can hear
// an event or a timer left over from the old one.
function watchProject({ projectPath, send, isSelfWrite, noteExternalChange, notePageMayHaveChanged, scheduleThumb, mediaPattern, watch = fs_1.default.watch, }) {
    const watchers = [];
    const notifier = createNotifier(send);
    const astroFiles = (0, astroFileMonitor_1.createAstroFileMonitor)(projectPath, (astroChanges) => send('fs:changed', { files: [], astroChanges }));
    const close = () => {
        notifier.close();
        astroFiles.close();
        for (const watcher of watchers) {
            watcher.close();
        }
    };
    try {
        const sourceDirectory = path_1.default.join(projectPath, 'src');
        watchers.push(watch(sourceDirectory, { recursive: true }, (event, filename) => {
            if (notifier.isClosed()) {
                return;
            }
            if (event === 'rename' || !filename || /\.astro$/i.test(filename.toString())) {
                astroFiles.request();
            }
            if (!filename) {
                // macOS can coalesce a directory change without naming the file.
                // Refresh every source-backed panel rather than losing the edit.
                notePageMayHaveChanged(true);
                notifier.debounce('fs:changed', 150);
                notifier.debounce('css:changed');
                notifier.debounce('cms:changed');
                notifier.debounce('assets:changed');
                return;
            }
            const name = filename.toString();
            const changed = path_1.default.join(sourceDirectory, name);
            // Comparing self writes can read the file. Do it once per event, before
            // routing it to the panels interested in that kind of file.
            if (isSelfWrite(changed)) {
                return;
            }
            noteExternalChange(changed);
            notePageMayHaveChanged(true);
            const channel = sourceChangeChannel(name, mediaPattern, event);
            if (channel === 'fs:changed') {
                notifier.addFile(changed);
                scheduleThumb(projectPath, 60000);
                notifier.debounce(channel, 150);
            }
            else if (channel !== undefined) {
                notifier.debounce(channel);
            }
        }));
        const publicWatcher = watchPublicFiles({ projectPath, isSelfWrite, watch }, notifier);
        if (publicWatcher !== undefined) {
            watchers.push(publicWatcher);
        }
    }
    catch (error) {
        close();
        throw error;
    }
    // Catch files created while the operating system is still arming its watcher.
    astroFiles.request();
    return { close };
}
// The panel a changed file under src/ concerns, or undefined when none does.
function sourceChangeChannel(name, mediaPattern, event) {
    if (/\.json$/i.test(name)) {
        return 'cms:changed';
    }
    if (mediaPattern.test(name)) {
        return 'assets:changed';
    }
    if (/\.css$/i.test(name)) {
        return 'css:changed';
    }
    if (/\.(astro|md|mdx|html)$/i.test(name)) {
        return 'fs:changed';
    }
    // Directory creation/removal has no extension but still changes the Pages tree.
    return event === 'rename' ? 'fs:changed' : undefined;
}
// One timer per channel, so a burst of events sends each channel once. The
// changed page files ride along with `fs:changed` and are cleared as it goes.
function createNotifier(send) {
    const timers = new Map();
    const files = new Set();
    let closed = false;
    const debounce = (channel, delayMs = 200) => {
        clearTimeout(timers.get(channel));
        timers.set(channel, setTimeout(() => {
            timers.delete(channel);
            if (closed) {
                return;
            }
            const payload = channel === 'fs:changed' ? { files: [...files] } : {};
            if (channel === 'fs:changed') {
                files.clear();
            }
            send(channel, payload);
        }, delayMs));
    };
    const close = () => {
        closed = true;
        for (const timer of timers.values()) {
            clearTimeout(timer);
        }
        timers.clear();
        files.clear();
    };
    return { debounce, addFile: (file) => files.add(file), isClosed: () => closed, close };
}
function watchPublicFiles({ projectPath, isSelfWrite, watch = fs_1.default.watch }, notifier) {
    const publicDirectory = path_1.default.join(projectPath, 'public');
    if (!fs_1.default.existsSync(publicDirectory)) {
        return undefined;
    }
    return watch(publicDirectory, { recursive: true }, (_event, filename) => {
        if (notifier.isClosed() || (filename && String(filename).startsWith('.'))) {
            return;
        }
        if (filename && isSelfWrite(path_1.default.join(publicDirectory, filename.toString()))) {
            return;
        }
        notifier.debounce('assets:changed');
    });
}
