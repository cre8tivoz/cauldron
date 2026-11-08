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
exports.checkSelectorUsage = void 0;
exports.removeUnusedSelectors = removeUnusedSelectors;
exports.restoreSelectorFiles = restoreSelectorFiles;
// Running the unused-selector check against a project on disk, and applying
// or undoing a cleanup. Every write is witnessed by the bytes it replaces, so a
// file changed by an editor or an AI between the check and the write is
// refused rather than overwritten, and every written file is read back.
const fs = __importStar(require("node:fs"));
const path = __importStar(require("node:path"));
const assert_1 = require("../../shared/core/assert");
const result_1 = require("../../shared/core/result");
const documentWrites_1 = require("../documents/documentWrites");
const selectorCleanup_1 = require("./selectorCleanup");
const selectorUsageFiles_1 = require("./selectorUsageFiles");
Object.defineProperty(exports, "checkSelectorUsage", { enumerable: true, get: function () { return selectorUsageFiles_1.checkSelectorUsage; } });
async function removeUnusedSelectors(root, keepList, request) {
    const analysis = await (0, selectorUsageFiles_1.checkSelectorUsage)(root, keepList);
    const planned = (0, selectorCleanup_1.planSelectorRemoval)(analysis, request.ids, request.files);
    if (!planned.ok) {
        return planned;
    }
    const written = writeChanges(root, planned.value, 'after');
    if (!written.ok) {
        return written;
    }
    return (0, result_1.ok)({ removed: new Set(request.ids).size, changes: planned.value });
}
/** Undo (`to: 'before'`) or redo (`to: 'after'`) a cleanup, if its files are as it left them. */
function restoreSelectorFiles(root, changes, to) {
    const written = writeChanges(root, changes, to);
    if (!written.ok) {
        return written;
    }
    return (0, result_1.ok)({ removed: 0, changes });
}
// Files are written one at a time; if one is refused, the ones already
// written are put back, so a cleanup lands in every file or in none.
function writeChanges(root, changes, to) {
    const done = [];
    for (const change of changes) {
        const file = projectFile(root, change.rel);
        const target = to === 'after' ? change.after : change.before;
        const expected = to === 'after' ? change.before : change.after;
        try {
            (0, documentWrites_1.writeProjectText)(file, target, expected);
        }
        catch (error) {
            const rollback = rollBack(done, to);
            const reason = error instanceof Error ? error.message : String(error);
            return (0, result_1.err)({ code: 'write-failed', message: rollback === undefined ? reason : `${reason} ${rollback}` });
        }
        // Pair assertion: the bytes on disk are the bytes the plan verified.
        (0, assert_1.assert)(fs.readFileSync(file, 'utf8') === target, 'writeChanges: the written file reads back as planned');
        done.push({ file, change });
    }
    return (0, result_1.ok)(undefined);
}
function rollBack(done, to) {
    const failed = [];
    for (const { file, change } of [...done].reverse()) {
        try {
            (0, documentWrites_1.writeProjectText)(file, to === 'after' ? change.before : change.after, to === 'after' ? change.after : change.before);
        }
        catch {
            failed.push(change.rel);
        }
    }
    return failed.length === 0 ? undefined : `These files kept the cleanup and need checking: ${failed.join(', ')}.`;
}
function projectFile(root, rel) {
    const file = path.resolve(root, rel);
    const relative = path.relative(root, file);
    (0, assert_1.assert)(relative !== '', 'projectFile: a change names a file, not the project');
    (0, assert_1.assert)(!relative.startsWith('..'), 'projectFile: a change stays inside the project');
    (0, assert_1.assert)(!path.isAbsolute(relative), 'projectFile: a change is relative to the project');
    return file;
}
