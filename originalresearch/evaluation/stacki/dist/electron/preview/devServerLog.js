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
exports.readDevServerLog = readDevServerLog;
const promises_1 = require("node:fs/promises");
const path = __importStar(require("node:path"));
const assert_1 = require("../../shared/core/assert");
// Astro's logs command requires a running daemon. Read its bounded log tail
// directly after startup failure, when that command can no longer help.
async function readDevServerLog(projectPath, startedAtMs) {
    (0, assert_1.assert)(projectPath.length > 0, 'Dev server logs require a project path');
    (0, assert_1.assert)(Number.isFinite(startedAtMs), 'Dev server logs require a start time');
    try {
        const file = await (0, promises_1.open)(path.join(projectPath, '.astro', 'dev.log'), 'r');
        try {
            const stats = await file.stat();
            if (!stats.isFile()) {
                return undefined;
            }
            // Filesystems may round modification times to a whole second.
            if (stats.mtimeMs < startedAtMs - 1000) {
                return undefined;
            }
            const length = Math.min(stats.size, 16_384);
            const buffer = Buffer.alloc(length);
            const { bytesRead } = await file.read(buffer, 0, length, stats.size - length);
            const text = buffer.subarray(0, bytesRead).toString('utf8').trim();
            return text.length > 0 ? text : undefined;
        }
        finally {
            await file.close();
        }
    }
    catch {
        // Older Astro versions may not create a daemon log at all.
        return undefined;
    }
}
