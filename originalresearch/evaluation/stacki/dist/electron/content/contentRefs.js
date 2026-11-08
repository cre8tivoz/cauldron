"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.planRename = planRename;
exports.applyRename = applyRename;
exports.entryRenameLock = entryRenameLock;
exports.referencePaths = referencePaths;
exports.matchingPaths = matchingPaths;
exports.rewriteRelative = rewriteRelative;
exports.mentions = mentions;
const contentPaths_1 = require("../lib/contentPaths");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const limits_1 = require("../../shared/core/limits");
const record_1 = require("../../shared/core/record");
const contentEntries_1 = require("./contentEntries");
// Renaming an entry, and everything that points at it.
//
// An id is not a label. It is what `reference("authors")` resolves, what a
// dynamic route builds a URL from, and what half a dozen other entries hold in
// their own fields. Changing it in one place and nowhere else does not fail
// loudly — Astro's getEntries() returns holes rather than throwing, and pages
// written defensively filter them out — so the post simply loses its author and
// nobody finds out until someone reads the page.
//
// So a rename is planned before it is done: every field in every collection
// that could point at this entry is found first, by walking the schema rather
// than by searching for the string, and the plan says exactly what will change.
// The schemas come from the project's content config, so their nesting is not ours to trust.
// A `$ref` chain longer than a few links, or a field nested past a dozen levels, is not a real
// reference field; the walk stops there and finds nothing. `mentions` is only the cheap
// pre-check for the walk, so it may look as deep as any value crossing a boundary can be.
const REFERENCE_LIMITS = {
    derefDepthMax: 8,
    schemaDepthMax: 12,
    mentionsDepthMax: limits_1.LIMITS.ipcDepthMax,
};
const isPlainObject = (value) => !!value && typeof value === 'object' && !Array.isArray(value);
const definitionsOf = (root) => (0, record_1.toRecord)((0, record_1.toRecord)(root)?.['$defs']) ?? {};
function deref(node, root, depth) {
    const ref = (0, record_1.toRecord)(node)?.['$ref'];
    if (!ref || depth > REFERENCE_LIMITS.derefDepthMax) {
        return ref ? undefined : (0, record_1.toRecord)(node);
    }
    const name = String(ref).split('/').pop();
    const target = name === undefined ? undefined : definitionsOf(root)[name];
    // A falsy definition is no definition. A truthy non-object (a boolean JSON
    // Schema) cannot be walked, so it reads as no definition too.
    if (!target) {
        return undefined;
    }
    return (0, record_1.toRecord)(target);
}
/**
 * Every place inside one entry's data where a reference to `target` sits, as a
 * path. Walking the schema and the data together is what keeps this honest: a
 * plain string that happens to read like an id is not a reference, and a
 * reference nested inside the third member of a union inside an array is.
 */
function referencePaths(schema, data, target, options = {}) {
    return matchingPaths(schema, data, (node, value) => node['astroReference'] === target && typeof value === 'string', options);
}
/**
 * Every path in an entry where the schema node and the value both satisfy
 * `match`. One walker for two questions — which fields point at another entry,
 * and which hold an image — because both have to follow the same awkward route
 * through arrays, unions and recursion to find them.
 */
function matchingPaths(schema, data, match, { root = schema, depth = 0, path: at = [] } = {}) {
    const node = deref(schema, root, depth);
    if (!node || depth > REFERENCE_LIMITS.schemaDepthMax) {
        return [];
    }
    const found = [];
    if (match(node, data)) {
        return [at];
    }
    const branches = (0, record_1.toArray)(node['oneOf']) ?? (0, record_1.toArray)(node['anyOf']);
    if (branches) {
        for (const branch of branches) {
            found.push(...matchingPaths(branch, data, match, { root, depth: depth + 1, path: at }));
        }
        // A union matches at most one branch, so the same path found twice is the
        // same field seen through two branches.
        return dedupe(found);
    }
    const items = (0, record_1.toArray)(data);
    if (node['type'] === 'array' && items) {
        items.forEach((item, index) => {
            found.push(...matchingPaths(node['items'] ?? {}, item, match, {
                root,
                depth: depth + 1,
                path: [...at, index],
            }));
        });
        return found;
    }
    const record = (0, record_1.toRecord)(data);
    if (record && isPlainObject(data)) {
        const properties = (0, record_1.toRecord)(node['properties']);
        const additional = (0, record_1.toRecord)(node['additionalProperties']);
        for (const [key, value] of Object.entries(record)) {
            const child = properties?.[key] ?? additional;
            if (!child) {
                continue;
            }
            found.push(...matchingPaths(child, value, match, { root, depth: depth + 1, path: [...at, key] }));
        }
    }
    return found;
}
const dedupe = (paths) => {
    const seen = new Set();
    return paths.filter((schemaPath) => {
        const key = schemaPath.join(' ');
        if (seen.has(key)) {
            return false;
        }
        seen.add(key);
        return true;
    });
};
// Does this schema mention the collection at all? Cheap enough to run over
// every collection before doing the expensive per-entry walk.
function mentions(schema, target, seen = new Set(), depth = 0) {
    if (!schema || typeof schema !== 'object') {
        return false;
    }
    // Past the bound, say it might: the exact walk that follows is bounded on its own.
    if (depth > REFERENCE_LIMITS.mentionsDepthMax) {
        return true;
    }
    // oneOf/anyOf/tuple items arrive as arrays; the untyped walk visited them
    // through Object.entries, so they are walked here too.
    const list = (0, record_1.toArray)(schema);
    if (list) {
        for (const item of list) {
            if (typeof item !== 'object' || item === null || seen.has(item)) {
                continue;
            }
            seen.add(item);
            if (mentions(item, target, seen, depth + 1)) {
                return true;
            }
        }
        return false;
    }
    const node = (0, record_1.toRecord)(schema);
    if (!node) {
        return false;
    }
    if (node['astroReference'] === target) {
        return true;
    }
    for (const [key, value] of Object.entries(node)) {
        if (key === '$defs' || key === '$schema') {
            continue;
        }
        if (typeof value !== 'object' || value === null) {
            continue;
        }
        if (seen.has(value)) {
            continue;
        }
        seen.add(value);
        if (mentions(value, target, seen, depth + 1)) {
            return true;
        }
    }
    return Object.values(definitionsOf(node)).some((definition) => mentions(definition, target, seen, depth + 1));
}
const isRelativeAsset = (value) => typeof value === 'string' && !!value && !/^(\/|[a-z][a-z0-9+.-]*:)/i.test(value);
const posix = path_1.default.posix;
/**
 * An image path rewritten for a file that has moved. The value is relative to
 * the entry that holds it — which is the whole point of it, and the reason a
 * post moved one folder up stops finding its own hero image.
 */
function rewriteRelative(value, sourceDirectory, targetDirectory) {
    const target = posix.normalize(posix.join(sourceDirectory, value));
    const next = posix.relative(targetDirectory, target);
    return next.startsWith('.') ? next : './' + next;
}
// The value at a path walked by matchingPaths: records by key, arrays by index.
const stepInto = (node, key) => (typeof key === 'number' ? (0, record_1.toArray)(node)?.[key] : (0, record_1.toRecord)(node)?.[key]);
/**
 * What renaming an entry would touch: the entry itself, and every field
 * anywhere in the project that points at it.
 */
function planRename(projectPath, collections, { collection: name, from, to }) {
    const collection = collections.find((candidate) => candidate.name === name);
    if (!collection) {
        throw new Error(`${name} is not a collection in this project.`);
    }
    const listed = (0, contentEntries_1.listEntries)(projectPath, collection);
    const entry = listed.entries.find((listedEntry) => listedEntry.id === from);
    if (!entry) {
        throw new Error(`${name} has no entry with the id "${from}".`);
    }
    if (listed.entries.some((listedEntry) => listedEntry.id === to)) {
        throw new Error(`${name} already has an entry with the id "${to}".`);
    }
    const pointers = pointersTo(projectPath, collections, name, from);
    const move = entryMove(collection, entry, { name, from, to });
    const imageEdits = move.kind === 'file' ? movedImageEdits(collection, entry, move.to) : [];
    return { collection: name, from, to, entry, move, pointers, imageEdits };
}
// The value at a path walked by matchingPaths, or the absence the walk ran into.
const valueAt = (data, at) => at.reduce((node, key) => (node === undefined || node === null ? node : stepInto(node, key)), data);
// Every field in the project's editable collections that holds `from` as a reference into
// the collection `name`.
function pointersTo(projectPath, collections, name, from) {
    const pointers = [];
    for (const other of collections) {
        if (!other.editable || !other.schema || !mentions(other.schema, name)) {
            continue;
        }
        const otherEntries = (0, contentEntries_1.listEntries)(projectPath, other).entries;
        for (const candidate of otherEntries) {
            for (const at of referencePaths(other.schema, candidate.data, name)) {
                if (valueAt(candidate.data, at) !== from) {
                    continue;
                }
                pointers.push({
                    collection: other.name,
                    entryId: candidate.id,
                    entryTitle: candidate.title,
                    file: candidate.file,
                    path: at,
                    entry: { file: candidate.file, locator: candidate.locator },
                });
            }
        }
    }
    return pointers;
}
// How the entry's own id is written down, which is the part that differs most
// between collections (see contentEntries.js).
function entryMove(collection, entry, { name, from, to }) {
    if (collection.loader.kind === 'glob') {
        if (collection.loader.generateId) {
            return {
                kind: 'generated',
                note: `${name} builds its ids in its loader, ` + 'so its id cannot be changed by renaming a file.',
            };
        }
        const extension = path_1.default.extname(entry.file);
        const pathPrefix = entry.file.slice(0, entry.file.length - extension.length - from.length);
        return { kind: 'file', from: entry.file, to: `${pathPrefix}${to}${extension}` };
    }
    if (entry.keyed) {
        return { kind: 'key', file: entry.file, locator: entry.locator };
    }
    if (isPlainObject(entry.data) && typeof (0, record_1.toRecord)(entry.data)?.['id'] === 'string') {
        return { kind: 'field', file: entry.file, locator: entry.locator };
    }
    return { kind: 'unknown', note: `Nothing in ${entry.file} says what this entry's id is.` };
}
/**
 * Why an entry's id cannot be renamed here, or nothing when it can: a loader
 * that builds ids in code, a parser between the file and the entry, or a
 * record that does not write its id down.
 */
function entryRenameLock(collection, entry) {
    if (collection.loader.parser) {
        return `${collection.name} is parsed by a function in the content config, so its ids are not in the file.`;
    }
    const move = entryMove(collection, entry, { name: collection.name, from: entry.id, to: entry.id });
    switch (move.kind) {
        case 'generated':
        case 'unknown':
            return move.note;
        case 'file':
        case 'key':
        case 'field':
            return undefined;
        default: {
            const exhaustive = move;
            return exhaustive;
        }
    }
}
// Moving the file moves what its image paths are relative to.
function movedImageEdits(collection, entry, movedTo) {
    const imageEdits = [];
    if (!collection.schema) {
        return imageEdits;
    }
    const sourceDirectory = posix.dirname(entry.file);
    const targetDirectory = posix.dirname(movedTo);
    if (sourceDirectory === targetDirectory) {
        return imageEdits;
    }
    const isImage = (node, value) => !!node['astroImage'] && isRelativeAsset(value);
    for (const at of matchingPaths(collection.schema, entry.data, isImage)) {
        const value = valueAt(entry.data, at);
        imageEdits.push({
            path: at,
            from: value,
            value: rewriteRelative(String(value), sourceDirectory, targetDirectory),
        });
    }
    return imageEdits;
}
/**
 * Carries out a plan. The pointers are rewritten first: an entry that has been
 * renamed but not yet pointed at is a broken link, and the shorter that window
 * is the better.
 */
function applyRename(projectPath, plan) {
    const touched = new Set();
    for (const pointer of plan.pointers) {
        (0, contentEntries_1.writeEntry)(projectPath, pointer.entry, [{ path: pointer.path, value: plan.to }]);
        touched.add(pointer.file);
    }
    const { move } = plan;
    if (move.kind === 'file') {
        // Written before the move, while the paths are still relative to where the
        // file is.
        if (plan.imageEdits.length) {
            (0, contentEntries_1.writeEntry)(projectPath, plan.entry, plan.imageEdits.map(({ path: at, value }) => ({ path: at, value })));
        }
        const from = (0, contentPaths_1.cmsSourcePath)(projectPath, move.from);
        const to = (0, contentPaths_1.cmsSourcePath)(projectPath, move.to);
        fs_1.default.mkdirSync(path_1.default.dirname(to), { recursive: true });
        fs_1.default.renameSync(from, to);
        touched.add(move.to);
    }
    else if (move.kind === 'key') {
        (0, contentEntries_1.writeEntry)(projectPath, { file: move.file, locator: [] }, [{ path: move.locator, rename: plan.to }]);
        touched.add(move.file);
    }
    else if (move.kind === 'field') {
        (0, contentEntries_1.writeEntry)(projectPath, plan.entry, [{ path: ['id'], value: plan.to }]);
        touched.add(move.file);
    }
    return {
        renamed: move.kind !== 'unknown' && move.kind !== 'generated',
        pointers: plan.pointers.length,
        files: [...touched],
    };
}
