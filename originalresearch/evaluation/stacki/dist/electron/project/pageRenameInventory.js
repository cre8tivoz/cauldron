"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.pageRenameInventory = pageRenameInventory;
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
const assert_1 = require("../../shared/core/assert");
const ignored = new Set([
    'node_modules',
    '.git',
    '.astro',
    '.studio-state',
    'dist',
    'build',
    'coverage',
    '.next',
    '.vercel',
    '.netlify',
    '.wrangler',
    '.cache',
]);
const binary = /\.(png|jpe?g|webp|gif|ico|avif|pdf|woff2?|ttf|otf|eot|mp[34]|mov|webm|zip|gz|br|wasm)$/i;
/** Inventory authored files once; never follow links into dependencies or another project. */
function pageRenameInventory(root) {
    const pending = [''];
    const files = [];
    const folders = [];
    let count = 0;
    for (let index = 0; index < pending.length; index++) {
        const directory = pending[index];
        (0, assert_1.assert)(directory !== undefined, 'Inventory queue contains its current directory');
        const entries = node_fs_1.default.readdirSync(node_path_1.default.join(root, directory), { withFileTypes: true });
        count += entries.length;
        if (count > 10_000 || directory.split('/').length > 32) {
            throw new Error('Rename supports at most 10,000 project entries and 32 folder levels.');
        }
        for (const entry of entries) {
            const file = directory ? directory + '/' + entry.name : entry.name;
            if (ignored.has(entry.name) || /^\.stacki\/(preview|canvas|io|studio)(\/|$)/.test(file)) {
                continue;
            }
            if (entry.isSymbolicLink()) {
                throw new Error(`Cannot safely update links through symbolic link ${file}.`);
            }
            if (entry.isDirectory()) {
                pending.push(file);
                if (file.startsWith('src/pages/')) {
                    folders.push(file.slice(10));
                }
            }
            else if (entry.isFile()) {
                files.push(file);
            }
        }
    }
    (0, assert_1.assert)(files.length <= 10_000, 'Rename files stay within the entry budget');
    return {
        files,
        folders,
        pages: files.filter((file) => /^src\/pages\/.*\.(astro|mdx?)$/i.test(file)).map((file) => file.slice(10)),
        texts: inventoryTexts(root, files),
    };
}
function inventoryTexts(root, files) {
    const texts = [];
    let total = 0;
    for (const file of files) {
        if (binary.test(file) || /(^|\/)(package-lock.json|pnpm-lock.yaml|yarn.lock)$/.test(file)) {
            continue;
        }
        const full = node_path_1.default.join(root, file);
        const size = node_fs_1.default.statSync(full).size;
        total += size;
        if (size > 5_000_000 || total > 100_000_000) {
            throw new Error(`Rename text scan exceeds its 5 MB/file or 100 MB/project limit: ${file}`);
        }
        const bytes = node_fs_1.default.readFileSync(full);
        if (bytes.length !== size) {
            throw new Error(`${file} changed while preparing the rename. Try again.`);
        }
        if (bytes.includes(0)) {
            continue;
        }
        const source = bytes.toString('utf8');
        if (Buffer.from(source).equals(bytes)) {
            texts.push({ file, source });
        }
    }
    return texts;
}
