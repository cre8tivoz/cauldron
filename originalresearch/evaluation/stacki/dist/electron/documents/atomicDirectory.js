"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ATOMIC_DIRECTORY = void 0;
exports.atomicDirectoryOf = atomicDirectoryOf;
exports.prepareAtomicDirectory = prepareAtomicDirectory;
// Keep save files outside source trees so Astro never scans a disappearing lock
// or temporary file. Staging must share the target's device for atomic renames.
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
const result_1 = require("../../shared/core/result");
exports.ATOMIC_DIRECTORY = node_path_1.default.join('.stacki', 'io');
const ANCESTORS_MAX = 256;
function atomicDirectoryOf(file) {
    return node_path_1.default.join(atomicDirectoryRoot(file), exports.ATOMIC_DIRECTORY);
}
/** Validate both levels separately so a linked .stacki cannot redirect staging. */
function prepareAtomicDirectory(file) {
    const directory = atomicDirectoryOf(file);
    try {
        const device = node_fs_1.default.statSync(node_path_1.default.dirname(file)).dev;
        for (const folder of [node_path_1.default.dirname(directory), directory]) {
            try {
                node_fs_1.default.mkdirSync(folder);
            }
            catch (error) {
                if (!prepareAtomicDirectoryExists(error)) {
                    return prepareAtomicDirectoryFailure(folder, error);
                }
            }
            const metadata = node_fs_1.default.lstatSync(folder);
            if (!metadata.isDirectory()) {
                return prepareAtomicDirectoryFailure(folder, 'Expected a directory, not a file or link');
            }
            if (metadata.dev !== device) {
                return prepareAtomicDirectoryFailure(folder, 'Must be on the target filesystem');
            }
        }
    }
    catch (error) {
        return prepareAtomicDirectoryFailure(directory, error);
    }
    return (0, result_1.ok)(directory);
}
function atomicDirectoryRoot(file) {
    const parent = node_path_1.default.dirname(node_path_1.default.resolve(file));
    let directory = parent;
    // Resolve from disk, not the active window: cooperating processes must choose
    // the same staging directory. Standalone files use their own parent folder.
    for (let depth = 0; depth < ANCESTORS_MAX; depth += 1) {
        if (node_path_1.default.basename(directory) === '.stacki') {
            return node_path_1.default.dirname(directory);
        }
        if (node_fs_1.default.existsSync(node_path_1.default.join(directory, '.stacki'))) {
            return directory;
        }
        if (node_fs_1.default.existsSync(node_path_1.default.join(directory, 'package.json'))) {
            return directory;
        }
        if (node_path_1.default.basename(directory) === 'node_modules') {
            return parent;
        }
        const ancestor = node_path_1.default.dirname(directory);
        if (ancestor === directory) {
            return parent;
        }
        directory = ancestor;
    }
    return parent;
}
function prepareAtomicDirectoryExists(error) {
    if (error instanceof Error) {
        if ('code' in error) {
            return error.code === 'EEXIST';
        }
    }
    return false;
}
function prepareAtomicDirectoryFailure(directory, error) {
    const message = error instanceof Error ? error.message : String(error);
    return (0, result_1.err)({ code: 'filesystem', message: `Could not prepare ${directory}: ${message}` });
}
