"use strict";
// References a content config does not declare, found in the data. A site
// moved from another CMS (a Webflow export, say) often keeps a link to a
// campus as the campus record's id in a plain string field — `campus:
// z.string()`, `campuses: z.array(z.string())` — rather than through Astro's
// `reference()`. Such a field reads as a wall of ids. When every value a
// collection holds in a field is the id of a record in one other collection,
// the field is that collection's reference in all but name, so it is offered
// as a choice of that collection's entries by title, and still writes the id.
//
// A record is named by its entry id, or by an `_id` key it carries (the id the
// old CMS gave it); whichever the values use is the one written back.
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.withInferredReferences = withInferredReferences;
exports.projectImage = projectImage;
exports.entryImage = entryImage;
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
const assert_1 = require("../../shared/core/assert");
const record_1 = require("../../shared/core/record");
const cmsRemoteSchema_1 = require("../../shared/properties/cmsRemoteSchema");
/**
 * The fields of collection `own`, with each undeclared reference given its
 * target's entries as options. A field that already offers options, names an
 * image, or holds values matching no single collection is returned as it was.
 */
function withInferredReferences(fields, own, collections) {
    const inferred = fields.map((field) => {
        const scalar = plainString(field.type);
        if (scalar === undefined) {
            return field;
        }
        const values = fieldValues(own.entries, field.name);
        const options = values.length === 0 ? undefined : targetOptions(values, collections);
        if (options === undefined) {
            return field;
        }
        const choice = { kind: 'string', options };
        const type = scalar === 'list' ? { kind: 'array', of: [choice] } : choice;
        return { ...field, type };
    });
    (0, assert_1.assert)(inferred.length === fields.length, 'Inference changes fields, never their number');
    return inferred;
}
// A free-text string, or a list of them: the shapes an undeclared reference takes.
function plainString(type) {
    const free = (member) => member?.kind === 'string' && member.options.length === 0 && member.asset === undefined;
    if (free(type)) {
        return 'one';
    }
    if (type.kind === 'array' && type.of.length === 1 && free(type.of[0])) {
        return 'list';
    }
    return undefined;
}
// Every string the collection holds in the field, each once.
function fieldValues(entries, name) {
    const values = new Set();
    for (const entry of entries) {
        const value = (0, record_1.toRecord)(entry.data)?.[name];
        const items = (0, record_1.toArray)(value) ?? [value];
        for (const item of items) {
            if (typeof item === 'string' && item.length > 0) {
                values.add(item);
            }
        }
    }
    return [...values];
}
// The one collection whose records every value names, by entry id or by `_id`, as options.
function targetOptions(values, collections) {
    for (const collection of collections) {
        if (collection.entries.length > cmsRemoteSchema_1.REMOTE_SCHEMA_LIMITS.optionsMax) {
            continue;
        }
        for (const key of KEYS) {
            const named = new Set(collection.entries.map(key).filter(isString));
            if (values.every((value) => named.has(value))) {
                return collection.entries.flatMap((entry) => {
                    const value = key(entry);
                    const imageFile = collection.imageOf?.(entry);
                    return value === undefined ? [] : [{ title: entry.title, value, ...(imageFile === undefined ? {} : { imageFile }) }];
                });
            }
        }
    }
    return undefined;
}
const KEYS = [
    (entry) => entry.id,
    (entry) => {
        const id = (0, record_1.toRecord)(entry.data)?.['_id'];
        return typeof id === 'string' && id.length > 0 ? id : undefined;
    },
];
/**
 * An image path as Astro resolves it, relative to the project: beside the
 * entry's file (`./`, `../`, or a bare name), or from the root (`/`). Astro
 * imports the path through Vite, which looks for a root path in public/ first
 * and then from the project root, so `/src/assets/a.png` names a file too.
 * A link elsewhere, or a path that climbs out of the project, has no file here.
 */
function projectImage(projectPath, entryFile, value) {
    const target = value.trim().split(/[?#]/)[0] ?? '';
    if (target.length === 0 || /^[a-z][a-z0-9+.-]*:/i.test(target) || target.startsWith('@')) {
        return undefined;
    }
    if (target.startsWith('/')) {
        const published = inProject(node_path_1.default.posix.join('public', target));
        const rooted = inProject(target.slice(1));
        // A file in neither place keeps the public/ reading, as Vite tries it first.
        if (published !== undefined && isFile(projectPath, published)) {
            return published;
        }
        return rooted !== undefined && isFile(projectPath, rooted) ? rooted : published;
    }
    return inProject(node_path_1.default.posix.join(node_path_1.default.posix.dirname(entryFile), target));
}
/** An entry's picture: the project file its image field names, if it names one. */
function entryImage(projectPath, entry, imageField) {
    const picture = imageField === undefined ? undefined : (0, record_1.toRecord)(entry.data)?.[imageField];
    return typeof picture === 'string' ? projectImage(projectPath, entry.file, picture) : undefined;
}
// The path, normalized, while it stays inside the project.
function inProject(joined) {
    const file = node_path_1.default.posix.normalize(joined);
    if (file.startsWith('..') || node_path_1.default.posix.isAbsolute(file)) {
        return undefined;
    }
    (0, assert_1.assert)(!file.split('/').includes('..'), 'A project image stays inside the project');
    (0, assert_1.assert)(file.length > 0, 'A project image names a file');
    return file;
}
function isFile(projectPath, file) {
    (0, assert_1.assert)(node_path_1.default.isAbsolute(projectPath), 'A project path is absolute');
    return node_fs_1.default.statSync(node_path_1.default.join(projectPath, file), { throwIfNoEntry: false })?.isFile() === true;
}
function isString(value) {
    return value !== undefined;
}
