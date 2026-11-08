"use strict";
// A project's Astro content collections, answering the calls the CMS panel's
// connected-CMS views make (cmsRemoteService.ts does the same for Sanity), so
// the panel draws them with the same table and item editor. Desktop calls it
// from its content handlers; Stacki Studio runs those same handlers on its
// server, inside the staging directory its CMS route commits from.
//
// Collections whose entries live in files — a glob loader's one file per entry,
// or a file loader's records in one data file — are listed; one built by a
// loader in the project's code is not, since anything written to it would be
// rebuilt away on the next sync. New entries and deletes are offered for glob
// collections, where an entry is a file of its own.
//
// An entry is named by `<collection>.<hash of its id>`: the remote views key
// their caches by document id across collections, and an Astro id can hold
// slashes and spaces a remote id may not.
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BODY_FIELD = exports.projectImage = void 0;
exports.astroRemoteService = astroRemoteService;
exports.documentId = documentId;
exports.firstImageField = firstImageField;
const node_crypto_1 = require("node:crypto");
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
const assert_1 = require("../../shared/core/assert");
const record_1 = require("../../shared/core/record");
const documentWrites_1 = require("../documents/documentWrites");
const contentPaths_1 = require("../lib/contentPaths");
const cmsRemote_1 = require("../../shared/properties/cmsRemote");
const cmsRemoteSchema_1 = require("../../shared/properties/cmsRemoteSchema");
const astroRemoteSchema_1 = require("./astroRemoteSchema");
const astroCollectionConfig_1 = require("./astroCollectionConfig");
const astroCollectionSettings_1 = require("./astroCollectionSettings");
const astroDataRecords_1 = require("./astroDataRecords");
const astroRecordReferences_1 = require("./astroRecordReferences");
Object.defineProperty(exports, "projectImage", { enumerable: true, get: function () { return astroRecordReferences_1.projectImage; } });
const contentEntries_1 = require("./contentEntries");
const contentRefs_1 = require("./contentRefs");
const entrySlug_1 = require("../../shared/properties/entrySlug");
/** The field a Markdown entry's body is edited as, below its frontmatter. */
exports.BODY_FIELD = 'body';
const ENTRY_NAMES_MAX = 100;
// A key the panel can write (parseRemoteFieldName): no system `_` keys.
const FIELD_NAME = /^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/;
const EXTENSIONS = ['md', 'mdx', 'markdown', 'mdoc', 'json', 'yaml', 'yml', 'toml'];
function astroRemoteService(projectPath, host) {
    (0, assert_1.assert)(node_path_1.default.isAbsolute(projectPath), 'A content service reads a project by its full path');
    const editable = async () => {
        const config = await host.readConfig();
        if (config.error !== undefined) {
            throw new Error(`The content config could not be read — ${config.error}`);
        }
        return config.collections.filter(inFiles);
    };
    const collectionNamed = async (name) => {
        const found = (await editable()).find((collection) => collection.name === name);
        if (found === undefined) {
            throw new Error(`${name} is not a content collection in this project.`);
        }
        return found;
    };
    const located = async (id) => {
        const collection = await collectionNamed(collectionOfId(id));
        const entry = (0, contentEntries_1.listEntries)(projectPath, collection).entries.find((candidate) => documentId(collection.name, candidate.id) === id);
        if (entry === undefined) {
            throw new Error('This entry is no longer in the project.');
        }
        return { collection, entry };
    };
    const document = async (id) => {
        const { collection, entry } = await located(id);
        const collections = await editable();
        const targets = await referenceTargets(projectPath, collection, collections);
        const records = recordsOf(projectPath, collections);
        return documentOf(projectPath, { collection, entry, targets, records });
    };
    return {
        collections: async () => (await editable()).flatMap(collectionSummary(projectPath)),
        documents: async (name, columns = []) => listWithColumns(projectPath, { collection: await collectionNamed(name), columns }, editable),
        document,
        template: async (name) => templateOf(projectPath, await collectionNamed(name), await editable()),
        write: async (write) => {
            const { collection, entry } = await located(write.id);
            writeField(projectPath, { collection, entry, write });
            return document(write.id);
        },
        rename: async (id, slug) => {
            const { collection, entry } = await located(id);
            const to = renamedId(collection, entry, slug);
            if (to !== entry.id) {
                const collections = (await editable()).map(renameable);
                (0, contentRefs_1.applyRename)(projectPath, (0, contentRefs_1.planRename)(projectPath, collections, { collection: collection.name, from: entry.id, to }));
                (0, astroCollectionSettings_1.renameEntryInSources)(projectPath, { collection: collection.name, from: entry.id, to });
            }
            return document(documentId(collection.name, to));
        },
        create: async (name) => createEntry(projectPath, await collectionNamed(name)),
        remove: async (ids) => removeEntries(projectPath, host, await Promise.all(ids.map(located))),
        settings: async (name) => (0, astroCollectionSettings_1.readCollectionSettings)(projectPath, name),
        changeSettings: (name, change) => (0, astroCollectionSettings_1.changeCollectionSettings)(projectPath, host, { name, change }),
        createCollection: async (name) => {
            const config = await host.readConfig();
            if (config.collections.some((collection) => collection.name === name)) {
                throw new Error(`A collection named “${name}” already exists.`);
            }
            (0, astroCollectionConfig_1.createAstroCollection)(projectPath, name);
            return { name, count: 0, icon: undefined };
        },
    };
}
/** An entry's remote id: its collection, then a short hash of its Astro id. */
function documentId(collection, entryId) {
    const hash = (0, node_crypto_1.createHash)('sha256').update(entryId).digest('hex').slice(0, 16);
    const id = `${collection}.${hash}`;
    (0, assert_1.assert)(id.length <= 128, 'A document id fits the remote id bound');
    (0, assert_1.assert)(id.endsWith(hash), 'A document id ends with its hash');
    return id;
}
function collectionOfId(id) {
    const dot = id.lastIndexOf('.');
    if (dot <= 0 || !/^[a-f0-9]{16}$/.test(id.slice(dot + 1))) {
        throw new Error('This is not a content collection entry.');
    }
    return id.slice(0, dot);
}
function inFiles(collection) {
    const kind = collection.loader?.kind;
    if (!/^[A-Za-z_][\w.-]{0,127}$/.test(collection.name)) {
        return false;
    }
    return kind === 'glob' || kind === 'file';
}
function collectionSummary(projectPath) {
    return (collection) => [
        {
            name: collection.name,
            count: Math.min((0, contentEntries_1.listEntries)(projectPath, collection).entries.length, Number.MAX_SAFE_INTEGER),
            // No Sanity icon: the panel draws its own CMS icon for content collections.
            icon: undefined,
        },
    ];
}
function documentList(projectPath, collection, cellsOf) {
    // A collection whose file could not be read says why, rather than listing nothing.
    const listed = (0, contentEntries_1.listEntries)(projectPath, collection);
    if (listed.entries.length === 0 && listed.reason !== undefined) {
        throw new Error(listed.reason);
    }
    // A collection past the bound shows its first entries; the panel lists no more than that.
    const ordered = collection.loader?.kind === 'glob' ? newestFirst(projectPath, listed.entries) : listed.entries;
    const entries = ordered.slice(0, cmsRemote_1.CMS_REMOTE_LIMITS.documentsMax);
    // The list's picture is the entry's first image field, as Sanity's list shows its first image.
    const image = firstImageField(collection);
    const documents = entries.map((entry) => {
        const cells = cellsOf(entry);
        const summary = summaryOf(projectPath, collection.name, entry, image);
        return cells === undefined ? summary : { ...summary, cells };
    });
    (0, assert_1.assert)(documents.length <= cmsRemote_1.CMS_REMOTE_LIMITS.documentsMax, 'A list stays within its bound');
    return { documents, orderable: false };
}
async function listWithColumns(projectPath, asked, editable) {
    const cells = await columnCells(projectPath, asked, await editable());
    return documentList(projectPath, asked.collection, cells);
}
// The columns' values for each entry: a reference by its record's name, as its field offers it.
async function columnCells(projectPath, asked, collections) {
    const { collection, columns } = asked;
    if (columns.length === 0) {
        return () => undefined;
    }
    const targets = await referenceTargets(projectPath, collection, collections);
    const records = recordsOf(projectPath, collections);
    const own = records.find((each) => each.name === collection.name);
    (0, assert_1.assert)(own !== undefined, 'A list’s own collection is among those read');
    const fields = (0, astroRecordReferences_1.withInferredReferences)((0, astroRemoteSchema_1.astroSchemaFields)(collection.schema, targets), own, records);
    const titles = new Map(columns.map((name) => [name, optionTitles(fields, name)]));
    return (entry) => {
        const data = (0, record_1.toRecord)(entry.data) ?? {};
        const cells = {};
        for (const name of columns) {
            const named = titles.get(name) ?? new Map();
            const raw = data[name];
            const shown = Array.isArray(raw)
                ? raw.map((item) => (typeof item === 'string' ? (named.get(item) ?? item) : item))
                : typeof raw === 'string'
                    ? (named.get(raw) ?? raw)
                    : raw;
            const cell = (0, cmsRemote_1.remoteCell)(plain(shown, 0));
            if (cell !== undefined) {
                cells[name] = cell;
            }
        }
        return cells;
    };
}
// A choice field's values by the titles its options give them; none for any other field.
function optionTitles(fields, name) {
    const type = fields.find((field) => field.name === name)?.type;
    const member = type?.kind === 'array' ? type.of[0] : type;
    const options = member?.kind === 'string' ? member.options : [];
    return new Map(options.map((option) => [option.value, option.title]));
}
function summaryOf(projectPath, collection, entry, imageField) {
    const title = preview(entry.title);
    const imageFile = (0, astroRecordReferences_1.entryImage)(projectPath, entry, imageField);
    return {
        ...(imageFile === undefined ? {} : { imageFile }),
        id: documentId(collection, entry.id),
        title,
        subtitle: entry.id === entry.title ? undefined : preview(entry.id),
        imageURL: undefined,
        status: 'published',
        updatedAt: modified(projectPath, entry.file),
    };
}
function documentOf(projectPath, context) {
    const { collection, entry, targets, records } = context;
    const data = (0, record_1.toRecord)(entry.data) ?? {};
    const schema = collection.schema === undefined ? undefined : (0, record_1.toRecord)(collection.schema);
    const own = records.find((each) => each.name === collection.name);
    (0, assert_1.assert)(own !== undefined, 'A document’s own collection is among those read');
    const declared = (0, astroRecordReferences_1.withInferredReferences)(schema === undefined ? inferredFields(data) : (0, astroRemoteSchema_1.astroSchemaFields)(schema, targets), own, records);
    const fields = declared.flatMap((field) => {
        const value = representable(data[field.name]);
        return value.ok ? [{ ...field, value: value.value }] : [];
    });
    const body = bodyField(entry, declared);
    const editedAt = modified(projectPath, entry.file);
    const slug = entrySlugOf(collection, { entry, entries: own.entries });
    (0, assert_1.assert)(fields.length <= cmsRemote_1.CMS_REMOTE_LIMITS.fieldsMax, 'A document has bounded fields');
    return {
        id: documentId(collection.name, entry.id),
        type: collection.name,
        status: 'published',
        fields: body === undefined ? fields : [...fields, body],
        assets: [],
        editedAt,
        publishedAt: undefined,
        editURL: undefined,
        file: entry.file,
        slug,
    };
}
// An entry with no schema is edited by what it holds: each scalar key, and lists of them.
function inferredFields(data) {
    return Object.entries(data).flatMap(([name, value]) => {
        const kind = scalarKind(value) ?? scalarKind((0, record_1.toArray)(value)?.[0]);
        if (kind === undefined || !FIELD_NAME.test(name)) {
            return [];
        }
        const scalar = { kind, options: [] };
        const type = Array.isArray(value) ? { kind: 'array', of: [scalar] } : scalar;
        return [{ name, title: (0, astroRemoteSchema_1.labelize)(name), description: '', required: false, rules: [], type }];
    });
}
function scalarKind(value) {
    if (typeof value === 'string') {
        return 'string';
    }
    if (typeof value === 'number') {
        return 'number';
    }
    return typeof value === 'boolean' ? 'boolean' : undefined;
}
function bodyField(entry, declared) {
    if (entry.hasBody !== true || declared.some((field) => field.name === exports.BODY_FIELD)) {
        return undefined;
    }
    return {
        name: exports.BODY_FIELD,
        title: 'Body',
        description: 'The entry’s Markdown, below its frontmatter.',
        required: false,
        rules: [],
        type: { kind: 'text', options: [] },
        value: entry.body === undefined || entry.body.length === 0 ? undefined : entry.body,
    };
}
// Glob entries are files of their own, to the Trash; records come out of their data file.
async function removeEntries(projectPath, host, found) {
    const files = found.filter((each) => each.collection.loader?.kind === 'glob');
    const records = found.filter((each) => each.collection.loader?.kind !== 'glob');
    for (const { entry } of files) {
        (0, assert_1.assert)(entry.locator.length === 0, 'A glob entry is a whole file');
        await host.trash((0, contentPaths_1.cmsSourcePath)(projectPath, entry.file));
    }
    (0, astroDataRecords_1.removeDataRecords)(projectPath, records.map((each) => each.entry));
    return found.length;
}
// A collection's fields with no values: a new entry before it is written. A
// Markdown collection's entries have a body, so its template has one too.
async function templateOf(projectPath, collection, collections) {
    const targets = await referenceTargets(projectPath, collection, collections);
    const records = recordsOf(projectPath, collections);
    const own = records.find((each) => each.name === collection.name);
    (0, assert_1.assert)(own !== undefined, 'A template’s own collection is among those read');
    const schema = collection.schema === undefined ? undefined : (0, record_1.toRecord)(collection.schema);
    const declared = (0, astroRecordReferences_1.withInferredReferences)(schema === undefined ? [] : (0, astroRemoteSchema_1.astroSchemaFields)(schema, targets), own, records);
    const fields = declared.map((field) => ({ ...field, value: undefined }));
    const markdown = own.entries.some((entry) => entry.hasBody === true) || markdownGlob(collection);
    const body = markdown ? bodyField({ hasBody: true }, declared) : undefined;
    (0, assert_1.assert)(fields.length <= cmsRemote_1.CMS_REMOTE_LIMITS.fieldsMax, 'A template has bounded fields');
    return {
        id: cmsRemote_1.REMOTE_TEMPLATE_ID,
        type: collection.name,
        status: 'draft',
        fields: body === undefined ? fields : [...fields, body],
        assets: [],
        editedAt: undefined,
        publishedAt: undefined,
        editURL: undefined,
        slug: entrySlugOf(collection, { entry: undefined, entries: own.entries }),
    };
}
// The id's last segment as the Slug field edits it, and the slugs beside it in
// its folder; a new entry (no `entry`) is made at the collection's root.
function entrySlugOf(collection, context) {
    const { entry, entries } = context;
    const own = entry === undefined ? { folder: '', value: '' } : (0, entrySlug_1.splitEntryId)(entry.id);
    const taken = entries
        .filter((other) => other.id !== entry?.id)
        .map((other) => (0, entrySlug_1.splitEntryId)(other.id))
        .filter((other) => other.folder === own.folder)
        .map((other) => other.value)
        .slice(0, entrySlug_1.ENTRY_SLUG_LIMITS.takenMax);
    const lock = entry === undefined ? collectionRenameLock(collection) : (0, contentRefs_1.entryRenameLock)(renameable(collection), entry);
    (0, assert_1.assert)(taken.length <= entrySlug_1.ENTRY_SLUG_LIMITS.takenMax, 'Taken slugs are bounded');
    (0, assert_1.assert)(own.folder === '' || own.folder.endsWith('/'), 'A folder ends with its slash');
    return { ...own, taken, rename: lock === undefined ? { kind: 'editable' } : { kind: 'locked', reason: lock.slice(0, entrySlug_1.ENTRY_SLUG_LIMITS.reasonCharsMax) } };
}
// Why a new entry of the collection could not be given its slug, before it exists.
function collectionRenameLock(collection) {
    if (collection.loader?.parser) {
        return `${collection.name} is parsed by a function in the content config, so its ids are not in the file.`;
    }
    if (collection.loader?.generateId) {
        return `${collection.name} builds its ids in its loader, so its id cannot be changed by renaming a file.`;
    }
    return undefined;
}
// The id an entry is renamed to: the slug, in the folder the entry is in already.
function renamedId(collection, entry, slug) {
    const lock = (0, contentRefs_1.entryRenameLock)(renameable(collection), entry);
    if (lock !== undefined) {
        throw new Error(lock);
    }
    const { folder } = (0, entrySlug_1.splitEntryId)(entry.id);
    const to = `${folder}${slug}`;
    (0, assert_1.assert)((0, entrySlug_1.splitEntryId)(to).folder === folder, 'A rename keeps the entry’s folder');
    return to;
}
// A collection as the rename planner reads it: every collection has a loader kind there.
function renameable(collection) {
    return { ...collection, loader: { ...collection.loader, kind: collection.loader?.kind ?? 'none' } };
}
// A glob collection whose files are Markdown (or MDX, Markdoc): its entries have a body.
function markdownGlob(collection) {
    const loader = collection.loader;
    if (loader?.kind !== 'glob') {
        return false;
    }
    const patterns = typeof loader.pattern === 'string' ? [loader.pattern] : (loader.pattern ?? []);
    const extension = EXTENSIONS.find((candidate) => patterns.some((pattern) => pattern.includes(candidate)));
    return extension === undefined || ['md', 'mdx', 'markdown', 'mdoc'].includes(extension);
}
// A stored value as JSON the panel can hold: dates as ISO text, the rest checked
// against the remote value bounds. A value past them is left out, not cut.
function representable(input) {
    try {
        return { ok: true, value: (0, cmsRemoteSchema_1.parseRemoteValue)(plain(input, 0)) };
    }
    catch {
        return { ok: false };
    }
}
function plain(input, depth) {
    if (depth > cmsRemoteSchema_1.REMOTE_SCHEMA_LIMITS.valueDepthMax) {
        throw new Error('The value is nested too deeply.');
    }
    if (input instanceof Date) {
        const iso = input.toISOString();
        return iso.endsWith('T00:00:00.000Z') ? iso.slice(0, 10) : iso;
    }
    const items = (0, record_1.toArray)(input);
    if (items !== undefined) {
        return items.map((item) => plain(item, depth + 1));
    }
    const value = (0, record_1.toRecord)(input);
    if (value === undefined) {
        return input;
    }
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, plain(item, depth + 1)]));
}
async function referenceTargets(projectPath, collection, collections) {
    const targets = new Map();
    for (const name of (0, astroRemoteSchema_1.referencedCollections)(collection.schema)) {
        const target = collections.find((candidate) => candidate.name === name);
        const entries = target === undefined ? [] : (0, contentEntries_1.listEntries)(projectPath, target).entries;
        // Past the bound a reference is typed rather than chosen from a list too long to use.
        if (target !== undefined && entries.length <= cmsRemoteSchema_1.REMOTE_SCHEMA_LIMITS.optionsMax) {
            const image = firstImageField(target);
            targets.set(name, entries.map((entry) => {
                const imageFile = (0, astroRecordReferences_1.entryImage)(projectPath, entry, image);
                return {
                    title: preview(entry.title),
                    value: entry.id,
                    ...(imageFile === undefined ? {} : { imageFile }),
                };
            }));
        }
    }
    (0, assert_1.assert)(targets.size <= cmsRemoteSchema_1.REMOTE_SCHEMA_LIMITS.valueNodesMax, 'Targets are bounded');
    return targets;
}
function writeField(projectPath, context) {
    const { collection, entry, write } = context;
    const schemaBody = (0, astroRemoteSchema_1.astroSchemaFields)(collection.schema, new Map()).some((field) => field.name === exports.BODY_FIELD);
    if (write.field === exports.BODY_FIELD && entry.hasBody === true && !schemaBody) {
        if (write.value !== undefined && typeof write.value !== 'string') {
            throw new Error('An entry’s body is text.');
        }
        (0, contentEntries_1.writeEntry)(projectPath, entry, [], { body: write.value ?? '' });
        return;
    }
    (0, contentEntries_1.writeEntry)(projectPath, entry, [{ path: [write.field], value: write.value }]);
}
async function createEntry(projectPath, collection) {
    const loader = collection.loader;
    if (loader?.kind === 'file') {
        return createRecord(projectPath, collection, String(loader.file ?? ''));
    }
    if (loader?.kind !== 'glob') {
        throw new Error(`${collection.name} is built by code; its entries cannot be added here.`);
    }
    const patterns = typeof loader.pattern === 'string' ? [loader.pattern] : (loader.pattern ?? []);
    const extension = EXTENSIONS.find((candidate) => patterns.some((pattern) => pattern.includes(candidate))) ?? 'md';
    const base = (0, contentPaths_1.cmsDirectoryPath)(projectPath, String(loader.base ?? ''));
    const name = freeName(base, extension);
    if (!patterns.some((pattern) => (0, contentEntries_1.globToRegExp)(pattern).test(name))) {
        throw new Error(`Stacki can’t tell where new ${collection.name} entries go.`);
    }
    const titled = (0, astroRemoteSchema_1.astroSchemaFields)(collection.schema, new Map()).some((field) => field.name === 'title');
    // A new collection's folder may not exist yet: Studio carries files, not empty folders.
    node_fs_1.default.mkdirSync(base, { recursive: true });
    (0, documentWrites_1.createProjectText)(node_path_1.default.join(base, name), starter(extension, { titled }));
    const entryId = name.replace(/\.[^./]+$/, '');
    const made = (0, contentEntries_1.listEntries)(projectPath, collection).entries.find((entry) => entry.id === entryId);
    (0, assert_1.assert)(made !== undefined, 'A created entry is listed');
    return summaryOf(projectPath, collection.name, made);
}
// Every collection's records, for the references the config leaves undeclared.
function recordsOf(projectPath, collections) {
    return collections.map((each) => ({
        name: each.name,
        entries: (0, contentEntries_1.listEntries)(projectPath, each).entries,
        imageOf: imageOf(projectPath, firstImageField(each)),
    }));
}
// A record's picture in a collection whose image field is `imageField`.
function imageOf(projectPath, imageField) {
    return imageField === undefined ? undefined : (entry) => (0, astroRecordReferences_1.entryImage)(projectPath, entry, imageField);
}
/** The collection's first image field: its entries' picture in lists and choices. */
function firstImageField(collection) {
    return (0, astroRemoteSchema_1.astroSchemaFields)(collection.schema, new Map()).find((field) => field.type.kind === 'string' && field.type.asset === 'image')?.name;
}
// A record in the collection's data file, listed afterwards as any other.
function createRecord(projectPath, collection, file) {
    const entries = (0, contentEntries_1.listEntries)(projectPath, collection).entries;
    const fields = (0, astroRemoteSchema_1.astroSchemaFields)(collection.schema, new Map());
    const added = (0, astroDataRecords_1.addDataRecord)(projectPath, {
        file: file.replace(/^\.\//, ''),
        entries,
        fields,
    });
    const made = (0, contentEntries_1.listEntries)(projectPath, collection).entries.find((entry) => entry.id === added.id);
    if (made === undefined) {
        throw new Error(`The new record was written but ${collection.name} does not list it.`);
    }
    return summaryOf(projectPath, collection.name, made);
}
function freeName(base, extension) {
    for (let index = 1; index <= ENTRY_NAMES_MAX; index += 1) {
        const name = index === 1 ? `untitled.${extension}` : `untitled-${index}.${extension}`;
        if (!node_fs_1.default.existsSync(node_path_1.default.join(base, name))) {
            return name;
        }
    }
    throw new Error('Rename some untitled entries before adding another.');
}
function starter(extension, options) {
    const title = options.titled ? 'Untitled' : undefined;
    switch (extension) {
        case 'json':
            return title === undefined ? '{}\n' : `{\n  "title": "${title}"\n}\n`;
        case 'yaml':
        case 'yml':
            return title === undefined ? '{}\n' : `title: ${title}\n`;
        case 'toml':
            return title === undefined ? '' : `title = "${title}"\n`;
        default:
            return title === undefined ? '---\n---\n' : `---\ntitle: ${title}\n---\n`;
    }
}
// Files listed newest first, so an entry just added is on top. A file's name
// is no order (`untitled-2.md` sorts before `untitled.md`), so its creation
// time is; a file system that keeps none reports zero, and the last change
// stands in. A checkout gives every file the same time: then by name.
function newestFirst(projectPath, entries) {
    const created = new Map(entries.map((entry) => [entry, createdMs(projectPath, entry.file)]));
    const sorted = [...entries].sort((left, right) => (created.get(right) ?? 0) - (created.get(left) ?? 0) || left.file.localeCompare(right.file));
    (0, assert_1.assert)(sorted.length === entries.length, 'Ordering keeps every entry');
    return sorted;
}
function createdMs(projectPath, file) {
    const stat = node_fs_1.default.statSync((0, contentPaths_1.cmsSourcePath)(projectPath, file));
    const time = stat.birthtimeMs > 0 ? stat.birthtimeMs : stat.mtimeMs;
    (0, assert_1.assert)(Number.isFinite(time), 'A file time is a number');
    return time;
}
function modified(projectPath, file) {
    const time = node_fs_1.default.statSync((0, contentPaths_1.cmsSourcePath)(projectPath, file)).mtime.toISOString();
    (0, assert_1.assert)(!Number.isNaN(Date.parse(time)), 'A file time is a real date');
    return time;
}
function preview(value) {
    return value.slice(0, cmsRemote_1.CMS_REMOTE_LIMITS.previewCharsMax);
}
