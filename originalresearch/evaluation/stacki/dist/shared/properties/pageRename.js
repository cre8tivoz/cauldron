"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parsePageRename = parsePageRename;
exports.renamePath = renamePath;
exports.renamedPagePath = renamedPagePath;
exports.pageURLPath = pageURLPath;
const boundary_1 = require("../core/boundary");
function parsePageRename(input) {
    const value = (0, boundary_1.record)(input);
    const kind = value['kind'];
    if (kind !== 'page' && kind !== 'folder') {
        throw new Error('Choose a page or folder to rename.');
    }
    const from = renamePath(value['from']);
    const to = renamePath(value['to']);
    if (kind === 'page') {
        if (!/\.(astro|md|mdx)$/i.test(from) || !/\.(astro|md|mdx)$/i.test(to)) {
            throw new Error('Pages must keep an Astro or Markdown extension.');
        }
    }
    const parameters = (file) => file.match(/\[[^\]]+\]/g)?.join('/') ?? '';
    if (parameters(from) !== parameters(to)) {
        throw new Error('Keep dynamic route parameters unchanged; rename their surrounding folders.');
    }
    return { kind, from, to };
}
function renamePath(input) {
    const value = (0, boundary_1.pathText)(input);
    if (value.length === 0 || value.length > 500 || /[\\?#%\x00-\x1f]/.test(value)) {
        throw new Error('Enter a valid page or folder path.');
    }
    const parts = value.split('/');
    if (parts.length > 32 || parts.some((part) => ['', '.', '..'].includes(part))) {
        throw new Error('Page paths must stay inside the pages folder.');
    }
    if (parts.some((part) => !/^[\w.\[\] -]+$/.test(part))) {
        throw new Error('Use letters, numbers, spaces or dashes in page paths.');
    }
    return value;
}
function renamedPagePath(file, change) {
    if (file === change.from) {
        return change.to;
    }
    if (change.kind === 'folder' && file.startsWith(change.from + '/')) {
        return change.to + file.slice(change.from.length);
    }
    return file;
}
function pageURLPath(file) {
    const route = file.replace(/\.(astro|mdx?)$/i, '').replace(/(^|\/)index$/, '');
    return '/' + route.replace(/\/$/, '');
}
