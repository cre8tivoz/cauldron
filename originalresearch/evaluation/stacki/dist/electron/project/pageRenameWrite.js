"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.applyPageRename = applyPageRename;
exports.undoPageRename = undoPageRename;
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
const assert_1 = require("../../shared/core/assert");
const result_1 = require("../../shared/core/result");
function applyPageRename(plan, writer) {
    (0, assert_1.assert)(plan.texts.length <= 10_000, 'Rename write batch is bounded');
    (0, assert_1.assert)(node_path_1.default.isAbsolute(plan.root), 'Rename writes use an absolute project root');
    if (plan.change.from === plan.change.to) {
        return (0, result_1.ok)(undefined);
    }
    for (const witness of plan.witnesses) {
        const current = writer.current(node_path_1.default.join(plan.root, witness.file));
        if (!current.ok || current.value !== witness.source) {
            return (0, result_1.err)({ code: 'conflict', message: `${witness.file} changed. Retry the rename.` });
        }
    }
    const texts = plan.texts.map((entry) => ({ ...entry, file: node_path_1.default.join(plan.root, entry.file) }));
    return writer.lease(texts, () => renameLeased(plan, texts, writer));
}
function renameLeased(plan, texts, writer) {
    const source = node_path_1.default.join(plan.root, 'src/pages', plan.change.from);
    const target = node_path_1.default.join(plan.root, 'src/pages', plan.change.to);
    if (node_fs_1.default.existsSync(target)) {
        return (0, result_1.err)({ code: 'conflict', message: 'That page or folder already exists.' });
    }
    for (const entry of texts) {
        const current = writer.current(entry.file);
        if (!current.ok || current.value !== entry.before) {
            return (0, result_1.err)({ code: 'conflict', message: `${entry.file} changed. Retry the rename.` });
        }
    }
    const written = [];
    for (const entry of texts) {
        const saved = writer.write(entry);
        if (!saved.ok) {
            // Include the failed write: a filesystem error can occur after replacement.
            return restoreRenameTexts([...written, entry], saved.error.message, writer);
        }
        written.push(entry);
    }
    const moved = moveRenamePath(source, target);
    return moved.ok ? moved : restoreRenameTexts(written, moved.error.message, writer);
}
function moveRenamePath(source, target) {
    try {
        if (node_fs_1.default.existsSync(target)) {
            return (0, result_1.err)({ code: 'conflict', message: 'The destination appeared during the rename.' });
        }
        node_fs_1.default.mkdirSync(node_path_1.default.dirname(target), { recursive: true });
        node_fs_1.default.renameSync(source, target);
        return (0, result_1.ok)(undefined);
    }
    catch (error) {
        return (0, result_1.err)({
            code: 'filesystem',
            message: error instanceof Error ? error.message : String(error),
        });
    }
}
function restoreRenameTexts(written, message, writer) {
    const failed = [];
    for (const entry of [...written].reverse()) {
        const current = writer.current(entry.file);
        if (current.ok && current.value === entry.before) {
            continue;
        }
        const saved = writer.write({ ...entry, before: entry.after, after: entry.before });
        if (!saved.ok) {
            failed.push(entry.file);
        }
    }
    return (0, result_1.err)({
        code: failed.length ? 'rollback' : 'filesystem',
        message: failed.length
            ? `${message} Could not restore: ${failed.join(', ')}. Check these files before retrying.`
            : `${message} Link changes were restored.`,
    });
}
/** Used only before Studio acknowledges a durable checkpoint. */
function undoPageRename(plan, writer) {
    const inverse = {
        ...plan,
        change: { ...plan.change, from: plan.change.to, to: plan.change.from },
        witnesses: [],
        texts: plan.texts.map((entry) => ({
            file: plan.relocated.get(entry.file) ?? entry.file,
            before: entry.after,
            after: entry.before,
        })),
    };
    return applyPageRename(inverse, writer);
}
