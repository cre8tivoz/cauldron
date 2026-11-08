"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.planPageRename = planPageRename;
const node_path_1 = __importDefault(require("node:path"));
const assert_1 = require("../../shared/core/assert");
const result_1 = require("../../shared/core/result");
const pageOrder_1 = require("../../shared/properties/pageOrder");
const pageRename_1 = require("../../shared/properties/pageRename");
const pageRenameConflicts_1 = require("./pageRenameConflicts");
const pageRenameInventory_1 = require("./pageRenameInventory");
const pageRenameLinks_1 = require("./pageRenameLinks");
function planPageRename(root, change, projectAliases = []) {
    (0, assert_1.assert)(node_path_1.default.isAbsolute(root), 'Rename root must be absolute');
    if (projectAliases.length > 100 || projectAliases.some(([, targets]) => targets.length > 100)) {
        throw new Error('Too many import aliases to rename safely.');
    }
    const inventory = (0, pageRenameInventory_1.pageRenameInventory)(root);
    const conflict = (0, pageRenameConflicts_1.pageRenameConflicts)(change, inventory);
    if (!conflict.ok) {
        return conflict;
    }
    const relocated = new Map();
    for (const file of inventory.files) {
        if (file.startsWith('src/pages/')) {
            const next = 'src/pages/' + (0, pageRename_1.renamedPagePath)(file.slice(10), change);
            if (next !== file) {
                relocated.set(file, next);
            }
        }
    }
    const origins = renameOrigins(inventory.texts);
    const aliases = projectAliases.map(([prefix, targets]) => [prefix.replace(/\/$/, ''), targets.map((target) => target.replace(/\/$/, ''))]);
    const texts = inventory.texts.flatMap(({ file, source }) => {
        const linked = (0, pageRenameLinks_1.renamePageLinks)(source, { change, origins, file });
        const imported = (0, pageRenameLinks_1.renamePageImports)(linked, file, relocated, aliases);
        const after = file === '.stacki/pages.json' ? renameOrder(source, change) : imported;
        return source === after ? [] : [{ file, before: source, after }];
    });
    (0, assert_1.assert)(texts.length <= 10_000, 'Rename changes stay inside the scanned inventory');
    return (0, result_1.ok)({ root, change, texts, relocated, witnesses: inventory.texts });
}
function renameOrder(source, change) {
    const input = JSON.parse(source);
    const order = (0, pageOrder_1.parsePageOrder)(input);
    const entries = order.entries.map((key) => {
        const folder = key.endsWith('/');
        return (0, pageRename_1.renamedPagePath)(folder ? key.slice(0, -1) : key, change) + (folder ? '/' : '');
    });
    // Revalidation catches stale metadata that would otherwise merge two identities.
    return JSON.stringify((0, pageOrder_1.parsePageOrder)({ ...order, entries }), undefined, 2) + '\n';
}
function renameOrigins(files) {
    const origins = new Set();
    for (const { file, source } of files) {
        if (/^astro\.config\./.test(file) || file === '.stacki/publish.json') {
            const pattern = file.endsWith('.json') ? /"(?:url|publishedSite)"\s*:\s*"(https?:\/\/[^"\s]+)"/g : /\bsite\s*:\s*['"](https?:\/\/[^'"\s]+)['"]/g;
            for (const match of source.matchAll(pattern)) {
                if (match[1]) {
                    origins.add(new URL(match[1]).origin);
                }
                if (origins.size > 32) {
                    throw new Error('Too many configured site origins to rename safely.');
                }
            }
        }
    }
    return [...origins];
}
