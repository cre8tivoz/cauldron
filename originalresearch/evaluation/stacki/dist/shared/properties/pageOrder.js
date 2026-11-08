"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EMPTY_PAGE_ORDER = exports.PAGE_ORDER_LIMITS = void 0;
exports.pageOrderKey = pageOrderKey;
exports.parsePageOrder = parsePageOrder;
exports.pageOrderParent = pageOrderParent;
exports.reorderPageEntries = reorderPageEntries;
// Shared ordering uses page-relative paths, with a trailing slash identifying folders.
const boundary_1 = require("../core/boundary");
exports.PAGE_ORDER_LIMITS = { entriesMax: 20_000, pathCharsMax: 1024 };
exports.EMPTY_PAGE_ORDER = { version: 1, entries: [] };
function pageOrderKey(input) {
    if (typeof input !== 'string' || input.length === 0) {
        return undefined;
    }
    if (input.length > exports.PAGE_ORDER_LIMITS.pathCharsMax || /[\\\u0000-\u001f]/.test(input)) {
        return undefined;
    }
    const path = input.endsWith('/') ? input.slice(0, -1) : input;
    if (path.split('/').some((part) => part === '' || part === '.' || part === '..')) {
        return undefined;
    }
    if (!input.endsWith('/') && !/\.(astro|mdx?)$/i.test(input)) {
        return undefined;
    }
    return input;
}
function parsePageOrder(input) {
    const value = (0, boundary_1.record)(input);
    if (value['version'] !== 1) {
        throw new Error('Unsupported page order version');
    }
    const entries = value['entries'];
    if (!Array.isArray(entries) || entries.length > exports.PAGE_ORDER_LIMITS.entriesMax) {
        throw new Error('Invalid page order entries');
    }
    const keys = entries.map((entry) => {
        const key = pageOrderKey(entry);
        if (key === undefined) {
            throw new Error('Invalid page order path');
        }
        return key;
    });
    if (new Set(keys).size !== keys.length) {
        throw new Error('Duplicate page order path');
    }
    return { version: 1, entries: keys };
}
function pageOrderParent(key) {
    const path = key.endsWith('/') ? key.slice(0, -1) : key;
    return path.slice(0, path.lastIndexOf('/') + 1);
}
function reorderPageEntries(order, siblings, move) {
    const { source, target, position } = move;
    if (source === target || !siblings.includes(source) || !siblings.includes(target)) {
        return order;
    }
    const parent = pageOrderParent(source);
    if (siblings.some((key) => pageOrderParent(key) !== parent)) {
        return order;
    }
    const next = siblings.filter((key) => key !== source);
    next.splice(next.indexOf(target) + (position === 'after' ? 1 : 0), 0, source);
    // Keep other folders' ordering, and remove stale siblings when that folder is reordered.
    return parsePageOrder({
        version: 1,
        entries: [...order.entries.filter((key) => pageOrderParent(key) !== parent), ...next],
    });
}
