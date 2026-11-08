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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatName = exports.formatFor = void 0;
exports.listEntries = listEntries;
exports.writeEntry = writeEntry;
exports.countEntries = countEntries;
exports.coveredPaths = coveredPaths;
exports.locateRecords = locateRecords;
exports.globToRegExp = globToRegExp;
const contentPaths_1 = require("../lib/contentPaths");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const limits_1 = require("../../shared/core/limits");
const record_1 = require("../../shared/core/record");
const mainLimits_1 = require("../lib/mainLimits");
const documentWrites_1 = require("../documents/documentWrites");
const contentWitness_1 = require("./contentWitness");
const entryTitle_1 = require("../../shared/properties/entryTitle");
const frontmatter = __importStar(require("./formats/markdownEntry"));
const jsonFormat = __importStar(require("./formats/json"));
const yamlFormat = __importStar(require("./formats/yaml"));
const tomlFormat = __importStar(require("./formats/toml"));
const csvFormat = __importStar(require("./formats/csv"));
const ndjsonFormat = __importStar(require("./formats/ndjson"));
const FORMATS = {
    md: frontmatter,
    mdx: frontmatter,
    mdoc: frontmatter,
    markdown: frontmatter,
    json: jsonFormat,
    yaml: yamlFormat,
    yml: yamlFormat,
    toml: tomlFormat,
    csv: csvFormat,
    ndjson: ndjsonFormat,
};
const extensionOf = (file) => (file.split('.').pop() || '').toLowerCase();
const formatFor = (file) => FORMATS[extensionOf(file)];
exports.formatFor = formatFor;
const formatName = (file) => {
    const ext = extensionOf(file);
    return FORMATS[ext] === frontmatter ? 'frontmatter' : ext;
};
exports.formatName = formatName;
const toPosix = (filePath) => filePath.split(path_1.default.sep).join('/');
const isPlainObject = (value) => !!value && typeof value === 'object' && !Array.isArray(value);
// A glob pattern as a regular expression: `**` crosses folders, `*` does not,
// and `{a,b}` is a choice. Enough for the patterns a content config writes.
function globToRegExp(pattern) {
    let out = '';
    for (let i = 0; i < pattern.length; i++) {
        const ch = pattern.charAt(i);
        if (ch === '*') {
            if (pattern.charAt(i + 1) === '*') {
                out += pattern.charAt(i + 2) === '/' ? '(?:.*\\/)?' : '.*';
                i += pattern.charAt(i + 2) === '/' ? 2 : 1;
            }
            else {
                out += '[^/]*';
            }
        }
        else if (ch === '{') {
            const close = pattern.indexOf('}', i);
            out += `(?:${pattern
                .slice(i + 1, close)
                .split(',')
                .map((choice) => choice.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
                .join('|')})`;
            i = close;
        }
        else if (ch === '?') {
            out += '[^/]';
        }
        else {
            out += ch.replace(/[.+^${}()|[\]\\]/g, '\\$&');
        }
    }
    return new RegExp(`^${out}$`);
}
function walkFiles(directory, base = directory, out = [], depth = 0) {
    // A project's folders are not ours to trust: a tree deeper than any real one stops the walk
    // there, before it can exhaust the stack.
    if (depth > mainLimits_1.MAIN_LIMITS.directoryDepthMax) {
        return out;
    }
    let entries = [];
    try {
        entries = fs_1.default.readdirSync(directory, { withFileTypes: true });
    }
    catch {
        return out;
    }
    for (const entry of entries) {
        if (entry.name.startsWith('.') || entry.name === 'node_modules') {
            continue;
        }
        const full = path_1.default.join(directory, entry.name);
        if (entry.isDirectory()) {
            walkFiles(full, base, out, depth + 1);
        }
        else {
            out.push(toPosix(path_1.default.relative(base, full)));
        }
    }
    return out;
}
/**
 * Every entry of one collection, as { id, file, format, locator, data, body }.
 */
function listEntries(projectPath, collection) {
    const loader = collection.loader ?? {};
    if (loader.kind === 'glob') {
        return globEntries(projectPath, collection);
    }
    if (loader.kind === 'file') {
        return fileEntries(projectPath, collection);
    }
    return { entries: [], readOnly: true, reason: readOnlyReason(collection) };
}
function readOnlyReason(collection) {
    const loader = collection.loader ?? {};
    if (loader.kind === 'custom') {
        return (`${collection.name} is built by a loader in this project, not stored in a file. ` +
            'Its entries are rebuilt from scratch on every sync, so anything written here would be ' +
            'overwritten.');
    }
    return undefined;
}
const patternsOf = (pattern) => {
    const list = Array.isArray(pattern) ? pattern : pattern !== undefined ? [pattern] : [];
    return list.map(globToRegExp);
};
function globEntries(projectPath, collection) {
    const loader = collection.loader ?? {};
    const root = (0, contentPaths_1.cmsDirectoryPath)(projectPath, String(loader.base ?? ''));
    const matchers = patternsOf(loader.pattern);
    const files = walkFiles(root).filter((rel) => matchers.some((re) => re.test(rel)));
    files.sort();
    const titleFields = (0, entryTitle_1.titleFieldsOf)(collection.schema);
    const entries = [];
    for (const rel of files) {
        const abs = path_1.default.join(root, rel);
        const format = formatFor(rel);
        if (!format) {
            continue;
        }
        let text = '';
        try {
            if (fs_1.default.statSync(abs).size > mainLimits_1.MAIN_LIMITS.contentEntryBytesMax) {
                continue;
            }
            text = fs_1.default.readFileSync(abs, 'utf8');
        }
        catch {
            continue;
        }
        // Astro's own rule for the id: the path under the base, without its
        // extension.
        const base = {
            id: rel.replace(/\.[^./]+$/, ''),
            file: toPosix(path_1.default.relative(projectPath, abs)),
            format: formatName(rel),
            locator: [],
        };
        let entry;
        try {
            if (format === frontmatter) {
                const parsed = frontmatter.parse(text);
                entry = { ...base, data: parsed.data || {}, body: parsed.body, hasBody: true };
            }
            else {
                entry = { ...base, data: format.parseData(text) };
            }
        }
        catch (error) {
            entry = { ...base, error: String(error instanceof Error ? error.message : error), data: {} };
        }
        entries.push({ ...entry, title: (0, entryTitle_1.entryTitleOf)(entry.data, { id: entry.id, fields: titleFields }) });
    }
    const generated = loader.generateId;
    return {
        entries,
        readOnly: false,
        // The id is not the file path, and nothing outside the loader knows the
        // rule it uses — so an id shown here is a guess, and renaming the file is
        // not what renames the entry.
        idsAreGuesses: !!generated,
        idNote: generated
            ? `${collection.name} builds its ids in the loader, from the entry's own fields. ` +
                'The ids shown are the file paths, which is not what other collections reference.'
            : undefined,
    };
}
// Where the records are inside a data file, and what identifies each one:
//   [ { id: … } ]        → the id field, addressed by position
//   { key: { … } }       → the key itself
//   anything else        → any object with an id, wherever it sits, which is
//                          what a parser-shaped file looks like.
function locateRecords(data) {
    const list = (0, record_1.toArray)(data);
    if (list) {
        if (!list.length || !list.every(isPlainObject)) {
            return { shape: 'array', records: [] };
        }
        return {
            shape: 'array',
            records: list.map((record, index) => {
                const rec = (0, record_1.toRecord)(record) ?? {};
                const id = rec['id'];
                return {
                    id: typeof id === 'string' ? id : String(index),
                    idKey: typeof id === 'string' ? 'id' : undefined,
                    locator: [index],
                    record: rec,
                };
            }),
        };
    }
    const top = (0, record_1.toRecord)(data);
    if (!top) {
        return { shape: 'unknown', records: [] };
    }
    const keys = Object.keys(top).filter((key) => key !== '$schema');
    if (keys.length && keys.every((key) => isPlainObject(top[key]))) {
        return {
            shape: 'keyed',
            records: keys.map((key) => ({
                id: key,
                idKey: undefined,
                keyed: true,
                locator: [key],
                record: (0, record_1.toRecord)(top[key]) ?? {},
            })),
        };
    }
    // Nested: the file groups its records under something. Every object with a
    // string id counts, wherever it is — which is how a grouped file (categories
    // holding questions) comes apart without knowing what the grouping means.
    const records = [];
    const visit = (node, locator) => {
        // The file is the project's data: past the depth any IPC value may have, nothing deeper
        // could reach the editor anyway, so the search stops there.
        const depth = locator.length;
        if (depth > limits_1.LIMITS.ipcDepthMax) {
            return;
        }
        const items = (0, record_1.toArray)(node);
        if (items) {
            items.forEach((item, index) => visit(item, [...locator, index]));
            return;
        }
        const record = (0, record_1.toRecord)(node);
        if (!record) {
            return;
        }
        const id = record['id'];
        if (typeof id === 'string' && locator.length) {
            records.push({ id, idKey: 'id', locator, record });
            return;
        }
        for (const [key, value] of Object.entries(record)) {
            visit(value, [...locator, key]);
        }
    };
    visit(data, []);
    return { shape: records.length ? 'nested' : 'single', records };
}
const errorMessage = (error) => (error instanceof Error ? error.message : String(error));
function fileEntries(projectPath, collection) {
    const loader = collection.loader ?? {};
    const rel = toPosix(String(loader.file ?? '')).replace(/^\.\//, '');
    const abs = (0, contentPaths_1.cmsSourcePath)(projectPath, rel);
    const format = formatFor(rel);
    if (!format) {
        return {
            entries: [],
            readOnly: true,
            reason: `Stacki cannot read ${path_1.default.extname(rel)} data files yet.`,
        };
    }
    let text = '';
    try {
        if (fs_1.default.statSync(abs).size > mainLimits_1.MAIN_LIMITS.contentDataFileBytesMax) {
            return { entries: [], readOnly: true, reason: `${rel} is too large to edit here.` };
        }
        text = fs_1.default.readFileSync(abs, 'utf8');
    }
    catch (error) {
        return {
            entries: [],
            readOnly: true,
            reason: `Could not read ${rel} — ${errorMessage(error)}`,
        };
    }
    let data;
    try {
        data = format.parseData(text);
    }
    catch (error) {
        return {
            entries: [],
            readOnly: true,
            reason: `${rel} could not be parsed — ${errorMessage(error)}`,
        };
    }
    const { shape, records } = locateRecords(data);
    const titleFields = (0, entryTitle_1.titleFieldsOf)(collection.schema);
    const entries = records.map(({ id, locator, record, keyed }) => ({
        id,
        file: rel,
        format: formatName(rel),
        locator,
        keyed: !!keyed,
        data: record,
        title: (0, entryTitle_1.entryTitleOf)(record, { id, fields: titleFields }),
    }));
    return {
        entries,
        readOnly: false,
        shape,
        // A parser stands between the file and the entries, so some of what an
        // entry holds was never in the file — and the fields it invented cannot be
        // written back through it.
        parsed: !!loader.parser,
        parserNote: loader.parser
            ? `${collection.name} is parsed by a function in the content config before Astro sees it. ` +
                'Fields that are not in the file itself were made by that parser: they are shown, ' +
                'but editing one here would have nowhere to go.'
            : undefined,
    };
}
/**
 * Applies edits to one entry. `edits` are { path, value } against the entry's
 * own data — the locator that puts it inside its file is added here — plus an
 * optional `body` for the formats that have one.
 */
function writeEntry(projectPath, entry, edits, { body, expected, } = {}) {
    const abs = (0, contentPaths_1.cmsSourcePath)(projectPath, entry.file);
    const format = formatFor(entry.file);
    if (!format) {
        throw new Error(`Stacki cannot write ${path_1.default.extname(entry.file)} files.`);
    }
    // The larger of the readers' bounds (a whole data file): a file can grow between
    // listing and edit, and nothing larger was ever listed to be edited.
    const size = fs_1.default.statSync(abs).size;
    if (size > mainLimits_1.MAIN_LIMITS.contentDataFileBytesMax) {
        throw new Error('This file is too large to edit here.');
    }
    // Every project write goes through the document layer, which holds at most a source file's
    // bound: a data file listed above it reads, but says why it cannot be saved.
    if (size > limits_1.LIMITS.sourceBytesMax) {
        const sizeMb = Math.ceil((size / (1024 * 1024)) * 10) / 10;
        const limitMb = Math.floor(limits_1.LIMITS.sourceBytesMax / (1024 * 1024));
        throw new Error(`${entry.file} is ${sizeMb} MB; Stacki saves files up to ${limitMb} MB.`);
    }
    const text = fs_1.default.readFileSync(abs, 'utf8');
    const locator = entry.locator ?? [];
    if (expected) {
        (0, contentWitness_1.assertContentWitness)(format.parseData(text), locator, expected.data);
        if (expected.body !== undefined && frontmatter.parse(text).body !== expected.body) {
            throw new Error('Content changed. Reopen the text before saving.');
        }
    }
    const prefixed = edits.map((edit) => 
    // A rename names a key rather than setting a value, so it carries no value
    // at all — and must not be read as one being cleared.
    edit.rename !== undefined
        ? { path: [...locator, ...edit.path], rename: edit.rename }
        : {
            path: [...locator, ...edit.path],
            value: edit.value === undefined ? format.DELETE : edit.value,
        });
    const next = format === frontmatter ? frontmatter.applyEdits(text, prefixed, { body }) : format.applyEdits(text, prefixed);
    if (next === text) {
        return { ok: true, changed: false };
    }
    (0, documentWrites_1.writeProjectText)(abs, next, text);
    return { ok: true, changed: true };
}
/**
 * How many entries a collection has, without reading them. The panel shows a
 * count next to every collection, and parsing a hundred markdown files to draw
 * a number is a cost with nothing to show for it.
 */
function countEntries(projectPath, collection) {
    const loader = collection.loader ?? {};
    if (loader.kind === 'glob') {
        const root = (0, contentPaths_1.cmsDirectoryPath)(projectPath, String(loader.base ?? ''));
        const matchers = patternsOf(loader.pattern);
        return walkFiles(root).filter((rel) => matchers.some((re) => re.test(rel))).length;
    }
    if (loader.kind === 'file') {
        try {
            return listEntries(projectPath, collection).entries.length;
        }
        catch {
            return 0;
        }
    }
    return 0;
}
/**
 * The files a content collection already owns. They are edited through their
 * schema, not as loose JSON, so the file-based editor leaves them alone rather
 * than offering a second way in with different rules.
 */
function coveredPaths(projectPath, collections) {
    const files = [];
    const directories = [];
    for (const collection of collections) {
        const loader = collection.loader ?? {};
        if (loader.kind === 'file' && loader.file) {
            files.push(toPosix(loader.file).replace(/^\.\//, ''));
        }
        if (loader.kind === 'glob' && loader.base) {
            const base = toPosix(loader.base).replace(/^\.\//, '').replace(/\/$/, '');
            // src/data commonly mixes content-collection entries with imported TS
            // modules and loose data files. Only the files matching this collection's
            // pattern are owned by it; hiding the whole directory made every sibling
            // disappear from the file-based CMS.
            if (isDataDirectory(base)) {
                const root = (0, contentPaths_1.cmsDirectoryPath)(projectPath, base);
                const matchers = patternsOf(loader.pattern);
                for (const relative of walkFiles(root)) {
                    if (matchers.some((matcher) => matcher.test(relative))) {
                        files.push(toPosix(path_1.default.relative(projectPath, path_1.default.join(root, relative))));
                    }
                }
            }
            else {
                directories.push(base);
            }
        }
    }
    return {
        files: [...new Set(files)].sort(),
        dirs: [...new Set(directories)].sort(),
    };
}
function isDataDirectory(directory) {
    if (directory === 'src/data') {
        return true;
    }
    return directory.startsWith('src/data/');
}
