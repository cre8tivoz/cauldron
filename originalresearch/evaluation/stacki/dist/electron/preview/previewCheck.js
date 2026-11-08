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
exports.checkPreviewRender = checkPreviewRender;
exports.sha256Text = sha256Text;
// Main's half of the preview token (plan §9, step 7): is every file a canvas
// rendering came from still the bytes its stamp names? The disk is the truth —
// the watcher is a hint, and a document actor's snapshot can be older than the
// file (plan §2) — so each stamped file is read and hashed here, on demand, for
// the one event that asks. A rendering names at most previewManifestFilesMax
// files, each read only when it is inside sourceBytesMax.
const node_crypto_1 = require("node:crypto");
const fs = __importStar(require("node:fs"));
const path = __importStar(require("node:path"));
const assert_1 = require("../../shared/core/assert");
const brand_1 = require("../../shared/core/brand");
const limits_1 = require("../../shared/core/limits");
const previewToken_1 = require("../../shared/page/previewToken");
/** Judge `render` against the files under `projectPath` now. */
function checkPreviewRender(projectPath, render) {
    (0, assert_1.assert)(render.stamps.length <= limits_1.LIMITS.previewManifestFilesMax, 'A parsed render is bounded');
    const root = path.resolve(projectPath);
    const current = new Map();
    for (const stamp of render.stamps) {
        current.set(stamp.file, stampedFileState(root, stamp.file));
    }
    (0, assert_1.assert)(current.size === render.stamps.length, 'One state per stamped file');
    return (0, previewToken_1.judgePreviewRender)(render, current, sha256Text);
}
/** The token of a canonical manifest: SHA-256 of its UTF-8 bytes. */
function sha256Text(text) {
    return (0, brand_1.toDigest)((0, node_crypto_1.createHash)('sha256').update(text, 'utf8').digest('hex'));
}
// A stamp names a project-relative path, but the page's own code can forge a
// comment, so a path that resolves outside the project reads as missing rather
// than as a file of the user's somewhere else on disk.
function stampedFileState(root, file) {
    const target = path.resolve(root, ...file.split('/'));
    const relative = path.relative(root, target);
    if (relative === '' || relative.startsWith('..') || path.isAbsolute(relative)) {
        return { tag: 'missing' };
    }
    let descriptor;
    try {
        descriptor = fs.openSync(target, 'r');
    }
    catch {
        return { tag: 'missing' };
    }
    try {
        const stats = fs.fstatSync(descriptor);
        if (!stats.isFile()) {
            return { tag: 'missing' };
        }
        if (limits_1.LIMITS.sourceBytesMax < stats.size) {
            return { tag: 'over-limit' };
        }
        const bytes = fs.readFileSync(descriptor);
        if (limits_1.LIMITS.sourceBytesMax < bytes.length) {
            return { tag: 'over-limit' }; // It grew between the stat and the read.
        }
        return { tag: 'present', checksum: (0, brand_1.toDigest)((0, node_crypto_1.createHash)('sha256').update(bytes).digest('hex')) };
    }
    finally {
        fs.closeSync(descriptor);
    }
}
