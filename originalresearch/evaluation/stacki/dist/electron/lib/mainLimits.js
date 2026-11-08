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
exports.MAIN_LIMITS = void 0;
exports.readSource = readSource;
exports.readSourceBytes = readSourceBytes;
exports.directoryBudget = directoryBudget;
// Disk work is bounded before allocating or recursing. These limits leave room
// for large sites while making a pathological project fail near its cause.
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const assert_1 = require("../../shared/core/assert");
const limits_1 = require("../../shared/core/limits");
// The source-file bound lives in shared/core/limits.ts (plan §8), because the actor,
// the renderer and these readers must all refuse the same file.
exports.MAIN_LIMITS = {
    directoryEntriesMax: 100000,
    directoryDepthMax: 64,
    portAttemptsMax: 100,
    fileNameAttemptsMax: 10000,
    previewServersMax: 16,
    logChunkCharsMax: 64000,
    /** One JSON line from the content-config runner. Sized as one IPC field: a
     * reply longer than that could never reach the renderer, so the runner is
     * stopped instead of buffering toward it. */
    runnerLineCharsMax: limits_1.LIMITS.ipcFieldCharsMax,
    /** The runner's stderr tail kept for an error message. */
    runnerStderrCharsMax: 4000,
    /** One content-collection entry file. An entry is a page's worth of data. */
    contentEntryBytesMax: 2 * 1024 * 1024,
    /**
     * One data file holding a whole content collection (Astro's `file()` loader):
     * every entry at once, so a few hundred sermons with transcripts run past 10 MB.
     * Matches Studio's bound on a whole CMS scan, which must hold the file too.
     */
    contentDataFileBytesMax: 32 * 1024 * 1024,
    /** One JSON data file edited as a CMS collection. */
    cmsFileBytesMax: 2 * 1024 * 1024,
    /** One stylesheet scanned for CSS variables. */
    cssVariableFileBytesMax: 1024 * 1024,
    /** One text asset opened in the floating code window. */
    editableFileBytesMax: 5 * 1024 * 1024,
    /** Output one command (git, the package manager, astro) may print before it
     * is killed. Node's own default, stated so no call relies on it. */
    commandOutputBytesMax: 1024 * 1024,
};
function readSource(file) {
    return readSourceBytes(file).toString('utf8');
}
/** The exact bytes of a source file, bounded before and after the read. A
 * checksum must be taken over these bytes, never over decoded text. */
function readSourceBytes(file) {
    const size = fs.statSync(file).size;
    if (size > limits_1.LIMITS.sourceBytesMax) {
        throw new Error('Source file exceeds 10 MB limit');
    }
    const bytes = fs.readFileSync(file);
    // A writer may grow the file between stat and read, so check both sides.
    if (bytes.length > limits_1.LIMITS.sourceBytesMax) {
        throw new Error('Source file exceeds 10 MB limit');
    }
    return bytes;
}
function directoryBudget(root) {
    // This closure owns the total; nested directory readers cannot reset it.
    let visited = 0;
    return (directory, entries) => {
        (0, assert_1.assert)(Number.isSafeInteger(entries), 'Directory entry count must be an integer');
        (0, assert_1.assert)(entries >= 0, 'Directory entry count must be nonnegative');
        const depth = path.relative(root, directory).split(path.sep).length;
        if (depth > exports.MAIN_LIMITS.directoryDepthMax) {
            throw new Error('Directory depth exceeds limit');
        }
        visited += entries + 1;
        if (visited > exports.MAIN_LIMITS.directoryEntriesMax) {
            throw new Error('Directory entries exceed limit');
        }
    };
}
