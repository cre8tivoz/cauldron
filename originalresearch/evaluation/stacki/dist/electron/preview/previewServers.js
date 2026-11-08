"use strict";
// Preview servers for a past commit: each runs in its own worktree, and
// stopping one removes the worktree with it.
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
exports.previewServers = void 0;
exports.stopPreview = stopPreview;
exports.stopAllPreviews = stopAllPreviews;
const previewWorktree = __importStar(require("./previewWorktree"));
const nodeTools_1 = require("../lib/nodeTools");
// --- Previewing an old version ---------------------------------------------
//
// A second, deliberately dumb dev server pointed at a checkout of an old
// commit (see previewWorktree.js). None of the primary server's machinery
// applies: a preview is read-only, so it needs no markers, no morph client and
// no click-to-select — it only has to render. That is `bare` on spawnDevServer,
// which already exists as the primary server's last-resort path.
//
// Kept in its own registry rather than generalising `DevServers`, whose daemon
// detection, external-server adoption and log plumbing are all keyed to there
// being exactly one. Keyed by project path.
exports.previewServers = new Map();
async function stopPreview(projectPath) {
    const current = exports.previewServers.get(projectPath);
    if (!current) {
        return;
    }
    exports.previewServers.delete(projectPath);
    (0, nodeTools_1.stopProcessTree)(current.proc);
    try {
        await previewWorktree.removeWorktree(nodeTools_1.git, { projectPath });
    }
    catch {
        /* the checkout is disposable; nothing here is the user's work */
    }
}
function stopAllPreviews() {
    for (const [projectPath] of exports.previewServers) {
        // Nothing to wait for: stopPreview settles on its own, since removing the
        // disposable checkout is already best-effort inside it.
        void stopPreview(projectPath);
    }
}
