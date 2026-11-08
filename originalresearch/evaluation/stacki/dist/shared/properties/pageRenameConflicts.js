"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.pageRenameConflicts = pageRenameConflicts;
exports.parseRenameFolders = parseRenameFolders;
const boundary_1 = require("../core/boundary");
const assert_1 = require("../core/assert");
const result_1 = require("../core/result");
const pageRename_1 = require("./pageRename");
function pageRenameConflicts(change, inventory) {
    const { pages, folders } = inventory;
    (0, assert_1.assert)(pages.length <= 10_000, 'Rename page inventory is bounded');
    (0, assert_1.assert)(folders.length <= 10_000, 'Rename folder inventory is bounded');
    const source = change.kind === 'page' ? pages : folders;
    if (!source.includes(change.from)) {
        return (0, result_1.err)({
            code: 'missing',
            message: 'This page or folder no longer exists. Refresh the list.',
        });
    }
    if (change.from === change.to) {
        return (0, result_1.ok)(undefined);
    }
    if (change.kind === 'folder' && change.to.startsWith(change.from + '/')) {
        return (0, result_1.err)({ code: 'path', message: 'A folder cannot be moved inside itself.' });
    }
    const untouched = [...pages.map(pageRename_1.pageURLPath), ...folders.map((folder) => '/' + folder)];
    const occupied = new Set();
    for (const [index, file] of [...pages, ...folders].entries()) {
        if ((0, pageRename_1.renamedPagePath)(file, change) === file) {
            const route = untouched[index];
            if (route !== undefined) {
                occupied.add(collisionKey(route));
            }
        }
    }
    const targets = change.kind === 'page'
        ? [(0, pageRename_1.pageURLPath)(change.to)]
        : ['/' + change.to, ...pages.filter((file) => file.startsWith(change.from + '/')).map((file) => (0, pageRename_1.pageURLPath)((0, pageRename_1.renamedPagePath)(file, change)))];
    const collision = targets.find((route) => occupied.has(collisionKey(route)));
    return collision === undefined
        ? (0, result_1.ok)(undefined)
        : (0, result_1.err)({
            code: 'conflict',
            message: `The URL ${collision} is already used by another page or folder.`,
        });
}
function collisionKey(route) {
    // Case folding keeps renames portable; parameter names do not distinguish Astro routes.
    return route
        .toLowerCase()
        .replace(/\[\.\.\.[^\]]+\]/g, '[...]')
        .replace(/\[(?!\.\.\.)[^\]]+\]/g, '[]');
}
/** Folder inventories include empty directories, which also reserve rename destinations. */
function parseRenameFolders(input) {
    if (!Array.isArray(input) || input.length > 10_000) {
        throw new Error('Invalid page folder inventory.');
    }
    return (0, boundary_1.list)(boundary_1.pathText)(input);
}
