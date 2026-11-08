"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createAstroFileMonitor = createAstroFileMonitor;
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
const astroFileChanges_1 = require("../../shared/properties/astroFileChanges");
// A settled inventory distinguishes creation/deletion from an editor's atomic replacement.
// Initial contents establish a silent baseline; unreadable scans never imply mass deletion.
function createAstroFileMonitor(root, report) {
    const initial = readAstroFiles(root);
    let previous = initial.ok ? initial.value : undefined;
    let timer;
    let closed = false;
    return {
        request: () => {
            if (closed || timer !== undefined) {
                return;
            }
            // One pending scan bounds work even when an agent continuously writes files.
            timer = setTimeout(() => {
                timer = undefined;
                const result = readAstroFiles(root);
                if (!result.ok) {
                    console.warn(`Astro file notifications: ${result.error}`);
                    return;
                }
                const changes = previous === undefined ? [] : (0, astroFileChanges_1.diffAstroFiles)(previous, result.value);
                previous = result.value;
                if (changes.length > 0) {
                    report(changes);
                }
            }, 200);
        },
        close: () => {
            closed = true;
            clearTimeout(timer);
        },
    };
}
function readAstroFiles(root) {
    // Filesystem failures are expected at this boundary.
    // The diff's assertions run outside this catch.
    try {
        const directories = ['src'];
        const files = new Set();
        let entriesCount = 0;
        for (let index = 0; index < directories.length; index++) {
            const directory = directories[index];
            if (directory === undefined) {
                return { ok: false, error: 'Missing scan directory' };
            }
            const absolute = node_path_1.default.join(root, directory);
            const entries = readAstroDirectory(absolute);
            entriesCount += entries.length;
            if (entriesCount > astroFileChanges_1.ASTRO_FILES_MAX) {
                return { ok: false, error: 'Project file notification scan exceeds limit' };
            }
            for (const entry of entries) {
                if (entry.name.startsWith('.') || entry.name === 'node_modules' || entry.isSymbolicLink()) {
                    continue;
                }
                const file = `${directory}/${entry.name}`;
                if (entry.isDirectory()) {
                    directories.push(file);
                }
                else if (entry.isFile() && /\.astro$/i.test(file)) {
                    files.add(file);
                }
            }
        }
        return { ok: true, value: files };
    }
    catch (error) {
        return { ok: false, error: error instanceof Error ? error.message : String(error) };
    }
}
function readAstroDirectory(directory) {
    try {
        if (node_fs_1.default.lstatSync(directory).isSymbolicLink()) {
            return [];
        }
        return node_fs_1.default.readdirSync(directory, { withFileTypes: true });
    }
    catch (error) {
        if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
            return [];
        }
        throw error;
    }
}
