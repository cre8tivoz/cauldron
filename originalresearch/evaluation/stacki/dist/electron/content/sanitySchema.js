"use strict";
// A document type's fields as the site's own Sanity Studio defines them: their
// order, titles, help text, whether they are required, and their types.
//
// Sanity does not serve a schema over its API — the schema is the Studio's code
// — so it is read from that code, without running it. Every `defineType({ … })`
// in the project's source is a named type. A document type's `fields: [ … ]`
// lists its fields in order, as `defineField({ name: "address", … })` or plain
// `{ name: "address", … }`; each entry's own keys (not a nested object's) give
// its name, title, description, type and validation. A type that names another
// (`type: "richText"`) resolves through the named types, to a bounded depth.
//
// What code alone cannot settle is left to the value (sanityFields.ts): a type
// built by a function, or a field whose type cannot be resolved. A field whose
// own options say `hidden: true` is hidden in the Studio, and so here; a hidden
// callback depends on the document, so the field is shown. An entry spreading
// `orderRankField(…)` is the orderable plugin's hidden `orderRank`.
//
// A document type's `groups: [ … ]` split its fields into tabs, each field
// naming its own in `group: "pastor"` (or a list of them). The tabs are read
// as the Studio shows them: a group whose `hidden` is `true`, or that holds no
// shown field, has no tab. The panel always opens on all fields, so the
// group marked `default: true` is not read.
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sanityNamedTypes = sanityNamedTypes;
exports.sanityTypeIcons = sanityTypeIcons;
exports.iconSymbol = iconSymbol;
exports.sanityDocumentSchema = sanityDocumentSchema;
exports.definedTypes = definedTypes;
exports.sanityConstantLists = sanityConstantLists;
const node_fs_1 = __importDefault(require("node:fs"));
const assert_1 = require("../../shared/core/assert");
const cmsRemote_1 = require("../../shared/properties/cmsRemote");
const cmsRemoteSchema_1 = require("../../shared/properties/cmsRemoteSchema");
const sanityRules_1 = require("./sanityRules");
const sanityStructure_1 = require("./sanityStructure");
const sanitySource_1 = require("./sanitySource");
// `defineType` calls one file may hold.
const TYPES_PER_FILE_MAX = 64;
const SCALARS = ['string', 'text', 'url', 'email', 'number', 'boolean', 'date', 'datetime', 'slug'];
/** Every type the project's source defines, by name: the body of its `defineType({…})`. */
function sanityNamedTypes(projectRoot) {
    const named = new Map();
    for (const file of (0, sanityStructure_1.projectSourceFiles)(projectRoot, (text) => text.includes('defineType('))) {
        let text;
        try {
            text = node_fs_1.default.readFileSync(file, 'utf8');
        }
        catch {
            continue;
        }
        for (const [name, body] of definedTypes(text)) {
            if (!named.has(name)) {
                named.set(name, body);
            }
        }
    }
    return named;
}
/**
 * The Sanity icon each type's schema names (`icon: UserIcon`, imported from
 * `@sanity/icons`), as the icon's symbol (`user`). An icon from anywhere else
 * is the Studio's own drawing, so that type has none here.
 */
function sanityTypeIcons(projectRoot) {
    const icons = new Map();
    for (const file of (0, sanityStructure_1.projectSourceFiles)(projectRoot, (text) => text.includes('defineType('))) {
        let text;
        try {
            text = node_fs_1.default.readFileSync(file, 'utf8');
        }
        catch {
            continue;
        }
        for (const [name, body] of definedTypes(text)) {
            const symbol = iconSymbol(text, body);
            if (symbol !== undefined && !icons.has(name)) {
                icons.set(name, symbol);
            }
        }
    }
    return icons;
}
const ICON_IMPORT = /import\s*\{([^}]{1,2000})\}\s*from\s*["'](@sanity\/icons(?:\/[A-Za-z]+)?)["']/g;
/** The symbol of the `@sanity/icons` icon a type's `icon:` names, if it names one. */
function iconSymbol(text, body) {
    const local = (0, sanitySource_1.ownSource)(body, 'icon')?.trim();
    if (local === undefined || !/^[A-Za-z_$][\w$]{0,63}$/.test(local)) {
        return undefined;
    }
    for (const match of text.matchAll(ICON_IMPORT)) {
        for (const specifier of (match[1] ?? '').split(',')) {
            const [imported = '', alias] = specifier.trim().split(/\s+as\s+/);
            if ((alias ?? imported) === local && /^[A-Z][A-Za-z0-9]{0,60}Icon$/.test(imported)) {
                const symbol = imported
                    .slice(0, -'Icon'.length)
                    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
                    .toLowerCase();
                (0, assert_1.assert)(/^[a-z][a-z0-9-]*$/.test(symbol), 'An icon symbol is kebab case');
                return symbol;
            }
        }
    }
    return undefined;
}
/** The schema of document type `type`, or undefined when the project does not define it. */
function sanityDocumentSchema(named, type, lists = new Map()) {
    const body = named.get(type);
    if (body === undefined) {
        return undefined;
    }
    const hidden = new Set();
    const fields = fieldsOf(body, { named, lists, depth: 0, hidden });
    (0, assert_1.assert)(fields.length <= cmsRemoteSchema_1.REMOTE_SCHEMA_LIMITS.fieldsMax, 'A schema stays within its field bound');
    return { preview: previewOf(body), fields, hidden, fieldGroups: fieldGroupsOf(body, fields) };
}
// The type's `groups`, each with a tab only when a shown field names it.
function fieldGroupsOf(body, fields) {
    const list = (0, sanitySource_1.ownBracketed)(body, 'groups', '[');
    if (list === undefined) {
        return undefined;
    }
    const declared = (0, sanitySource_1.entries)(list)
        .slice(0, cmsRemote_1.CMS_REMOTE_LIMITS.fieldGroupsMax)
        .flatMap((entry) => {
        const own = (0, sanitySource_1.entryObject)(entry);
        const name = (0, sanitySource_1.ownString)(own, 'name');
        if (name === undefined || !GROUP_NAME.test(name) || literalTrue(own, 'hidden')) {
            return [];
        }
        const title = (0, sanitySource_1.ownString)(own, 'title') ?? '';
        return [{ name, title: title === '' ? name : title }];
    });
    const used = new Set(fields.flatMap((field) => field.groups));
    const groups = declared.filter((group, index) => used.has(group.name) && declared.findIndex((other) => other.name === group.name) === index);
    if (groups.length === 0) {
        return undefined;
    }
    (0, assert_1.assert)(groups.length <= cmsRemote_1.CMS_REMOTE_LIMITS.fieldGroupsMax, 'A type has few field groups');
    (0, assert_1.assert)(groups.every((group) => used.has(group.name)), 'Every tab holds a field');
    return groups;
}
const GROUP_NAME = /^[A-Za-z_][\w-]{0,63}$/;
// `group: "pastor"` or `group: ["pastor", "media"]`.
function groupsOf(own) {
    const one = (0, sanitySource_1.ownString)(own, 'group');
    const many = one === undefined ? (0, sanitySource_1.ownBracketed)(own, 'group', '[') : undefined;
    const names = one !== undefined ? [one] : many === undefined ? [] : (0, sanitySource_1.entries)(many).map((entry) => /^\s*["'`]([^"'`]{1,64})["'`]\s*$/.exec(entry)?.[1]);
    return names.filter((name) => name !== undefined && GROUP_NAME.test(name)).slice(0, cmsRemote_1.CMS_REMOTE_LIMITS.fieldGroupsMax);
}
/** Each `defineType({ name: … })` in this source text, as name and body. */
function definedTypes(text) {
    const out = [];
    let from = 0;
    for (let count = 0; count < TYPES_PER_FILE_MAX; count++) {
        const call = text.indexOf('defineType(', from);
        if (call === -1) {
            break;
        }
        from = call + 1;
        const open = text.indexOf('{', call);
        const close = open === -1 ? undefined : (0, sanitySource_1.closing)(text, open);
        const body = close === undefined ? undefined : inlineHelpers(text.slice(open + 1, close), text);
        const name = body === undefined ? undefined : (0, sanitySource_1.ownString)(body, 'name');
        if (body !== undefined && name !== undefined) {
            out.push([name, body]);
        }
    }
    return out;
}
// A path that is safe to place in a query: up to three field names joined by dots.
const PREVIEW_PATH = /^[A-Za-z_][A-Za-z0-9_]*(?:\.[A-Za-z_][A-Za-z0-9_]*){0,2}$/;
const PREVIEW_OTHERS_MAX = 6;
function previewOf(body) {
    const preview = (0, sanitySource_1.ownBracketed)(body, 'preview', '{');
    const select = preview === undefined ? undefined : (0, sanitySource_1.ownBracketed)(preview, 'select', '{');
    if (preview === undefined || select === undefined) {
        return undefined;
    }
    const paths = (0, sanitySource_1.entries)(select).flatMap((entry) => {
        const match = /^\s*["']?([A-Za-z_][A-Za-z0-9_]*)["']?\s*:\s*["'`]([^"'`]+)["'`]\s*$/.exec(entry);
        const key = match?.[1];
        const path = match?.[2];
        return key !== undefined && path !== undefined && PREVIEW_PATH.test(path) ? [{ key, path }] : [];
    });
    const find = (key) => paths.find((entry) => entry.key === key)?.path;
    const parts = subtitleParts(preview, paths).slice(0, PREVIEW_OTHERS_MAX);
    (0, assert_1.assert)(parts.every((entry) => PREVIEW_PATH.test(entry.path)), 'Preview paths are plain');
    return { title: find('title'), media: find('media'), parts };
}
// `options: { columns: 2 }`: the Studio lays the group's fields out side by side.
function columnsOf(own) {
    const options = (0, sanitySource_1.ownBracketed)(own, 'options', '{');
    const columns = Number(/^\s*(\d)\b/.exec(options === undefined ? '' : ((0, sanitySource_1.ownSource)(options, 'columns') ?? ''))?.[1]);
    return columns >= 2 && columns <= 4 ? { columns } : {};
}
// An object type's list row, when its schema says how to preview it.
function rowPreview(own) {
    const preview = previewOf(own);
    if (preview === undefined) {
        return {};
    }
    return { preview: { title: preview.title, parts: preview.parts.map((part) => part.path) } };
}
// The values the line under a title is built from, in order. A `prepare` that
// returns a `subtitle` names them in the order it joins them (`[campus,
// subtitle]`); without one, the selected `subtitle` is the line, or failing
// that every other selected value.
function subtitleParts(preview, paths) {
    const candidates = paths.filter((entry) => !['title', 'media'].includes(entry.key));
    const prepare = (0, sanitySource_1.ownSource)(preview, 'prepare');
    const built = prepare === undefined ? undefined : /\bsubtitle\s*:([^\n]*)/.exec(prepare)?.[1];
    if (built !== undefined) {
        return candidates
            .map((entry) => ({ entry, at: built.search(new RegExp(`\\b${entry.key}\\b`)) }))
            .filter((found) => found.at !== -1)
            .sort((left, right) => left.at - right.at)
            .map((found) => found.entry);
    }
    const subtitle = candidates.filter((entry) => entry.key === 'subtitle');
    return subtitle.length > 0 ? subtitle : candidates;
}
// A field helper in the same file — `const asset = (name, title) => defineField({
// name, title, type: "object", fields: […] })` — written out where it is called,
// with its string arguments in place of its parameters, so the fields it makes
// read as if they had been written by hand. Only helpers whose arguments are
// all string literals are expanded; anything else is left to the value.
const HELPERS_MAX = 16;
const HELPER = new RegExp(String.raw `\bconst\s+([A-Za-z_$][\w$]*)\s*=\s*\(([^()]{0,200})\)` + String.raw `\s*(?::[^=]{0,80})?=>\s*defineField\(\s*\{`, 'g');
function inlineHelpers(body, text) {
    let out = body;
    const helpers = [...text.matchAll(HELPER)].slice(0, HELPERS_MAX);
    for (const helper of helpers) {
        const name = helper[1] ?? '';
        const params = (helper[2] ?? '')
            .split(',')
            .map((param) => param.replace(/[:=].*$/s, '').trim())
            .filter((param) => param !== '');
        const open = (helper.index ?? 0) + helper[0].length - 1;
        const close = (0, sanitySource_1.closing)(text, open);
        if (close === undefined || !out.includes(`${name}(`)) {
            continue;
        }
        const keys = text.slice(open + 1, close);
        out = out.replace(new RegExp(`(\\.\\.\\.\\s*)?\\b${name}\\(([^()]{0,400})\\)`, 'g'), (call, spread, args) => {
            const values = (0, sanitySource_1.entries)(args).map((arg) => /^\s*(["'`])([^"'`]*)\1\s*$/.exec(arg)?.[2]);
            if (values.length !== params.length || values.some((value) => value === undefined)) {
                return call;
            }
            const filled = withArguments(keys, params, values);
            return spread === undefined ? `{${filled}}` : filled;
        });
    }
    return out;
}
// A helper's object keys with each parameter replaced by its argument: a
// shorthand `name,` becomes `name: "icon1",`, and `title: title` takes the text.
function withArguments(keys, params, values) {
    let out = keys;
    params.forEach((param, index) => {
        const literal = JSON.stringify(values[index] ?? '');
        out = out
            .replace(new RegExp(`(:\\s*)${param}\\b`, 'g'), `$1${literal}`)
            .replace(new RegExp(`(^|[{,\\s])${param}(\\s*(?:,|}|$))`, 'g'), `$1${param}: ${literal}$2`);
    });
    return out;
}
// The fields of an object-like body (`fields: [ … ]`), in order, hidden ones out.
function fieldsOf(body, context) {
    const list = (0, sanitySource_1.ownBracketed)(body, 'fields', '[');
    if (list === undefined) {
        return [];
    }
    const out = [];
    for (const entry of (0, sanitySource_1.entries)(list).slice(0, cmsRemoteSchema_1.REMOTE_SCHEMA_LIMITS.fieldsMax)) {
        const own = (0, sanitySource_1.entryObject)(entry);
        // The orderable plugin's `orderRank`, spread into an entry or the entry itself;
        // the plugin always hides it, so the Studio never shows it.
        const spreadRank = /\.\.\.\s*orderRankField\(/.test(own) || /^\s*orderRankField\(/.test(entry);
        const name = (0, sanitySource_1.ownString)(own, 'name') ?? (spreadRank ? 'orderRank' : undefined);
        if (name === undefined || !/^[A-Za-z_][\w]{0,63}$/.test(name)) {
            continue;
        }
        if (literalTrue(own, 'hidden') || spreadRank) {
            context.hidden?.add(name);
            continue;
        }
        out.push({
            name,
            title: (0, sanitySource_1.ownString)(own, 'title') ?? '',
            description: (0, sanitySource_1.ownString)(own, 'description') ?? '',
            required: /\.required\(\)/.test((0, sanitySource_1.ownSource)(own, 'validation') ?? ''),
            rules: (0, sanityRules_1.rulesOf)((0, sanitySource_1.ownSource)(own, 'validation')),
            type: typeOf(own, { ...context, hidden: undefined }),
            // Only a document's own fields are tabbed; an object's inner groups are not.
            groups: context.depth === 0 ? groupsOf(own) : [],
            ...readOnlyOf(own),
        });
    }
    return out;
}
// The type an entry's own object declares, resolved through named types.
function typeOf(own, context) {
    if (context.depth > cmsRemoteSchema_1.REMOTE_SCHEMA_LIMITS.typeDepthMax) {
        return undefined;
    }
    const name = (0, sanitySource_1.ownString)(own, 'type');
    const inner = { ...context, depth: context.depth + 1 };
    const scalar = SCALARS.find((candidate) => candidate === name);
    if (scalar !== undefined) {
        return { kind: scalar, options: optionsOf(own, context.lists) };
    }
    switch (name) {
        case 'geopoint':
        case 'file':
            return { kind: name };
        case 'block':
            return { kind: 'richText' };
        case 'image':
            return { kind: 'image', fields: settled(fieldsOf(own, inner)) };
        case 'object':
        case 'document':
            return {
                kind: 'object',
                name: (0, sanitySource_1.ownString)(own, 'name') ?? 'object',
                fields: settled(fieldsOf(own, inner)),
                ...rowPreview(own),
                ...columnsOf(own),
            };
        case 'reference':
            return { kind: 'reference', to: referenceTargets(own) };
        case 'array':
            return arrayOf(own, inner);
        case undefined:
            return undefined;
        default: {
            const definition = context.named.get(name);
            return definition === undefined ? undefined : typeOf(definition, inner);
        }
    }
}
// An array of block members is rich text; otherwise a list of its member types.
function arrayOf(own, context) {
    const list = (0, sanitySource_1.ownBracketed)(own, 'of', '[') ?? '';
    const members = (0, sanitySource_1.entries)(list)
        .slice(0, cmsRemoteSchema_1.REMOTE_SCHEMA_LIMITS.membersMax)
        .map((entry) => typeOf((0, sanitySource_1.entryObject)(entry), context));
    if (members.some((member) => member?.kind === 'richText')) {
        return { kind: 'richText' };
    }
    // A list's `options.list` is the values its text items may be — Sanity's
    // checkbox list — so each text member carries those choices.
    const choices = optionsOf(own, context.lists);
    const of = members
        .filter((member) => member !== undefined)
        .map((member) => (member.kind === 'string' && member.options.length === 0 && choices.length > 0 ? { ...member, options: choices } : member));
    return of.length === 0 ? undefined : { kind: 'array', of };
}
function referenceTargets(own) {
    const list = (0, sanitySource_1.ownBracketed)(own, 'to', '[') ?? '';
    return (0, sanitySource_1.entries)(list)
        .map((entry) => (0, sanitySource_1.ownString)((0, sanitySource_1.entryObject)(entry), 'type'))
        .filter((target) => target !== undefined)
        .slice(0, cmsRemoteSchema_1.REMOTE_SCHEMA_LIMITS.membersMax);
}
// `options: { list: ["a", …] }` or `[{ title: "A", value: "a" }, …]`.
// `options: { list: [...] }` — text, `{ title, value }`, or a project constant
// spread in (`[...SERMON_SERVICES]`) or named outright (`list: SERMON_SERVICES`).
function optionsOf(own, lists) {
    const options = (0, sanitySource_1.ownBracketed)(own, 'options', '{');
    if (options === undefined) {
        return [];
    }
    const named = /^\s*([A-Za-z_$][\w$]*)\s*$/.exec((0, sanitySource_1.ownSource)(options, 'list') ?? '')?.[1];
    const list = (0, sanitySource_1.ownBracketed)(options, 'list', '[');
    const items = named !== undefined ? [`...${named}`] : list === undefined ? [] : (0, sanitySource_1.entries)(list);
    const out = items.flatMap((entry) => {
        const spread = /^\s*\.\.\.\s*([A-Za-z_$][\w$]*)\s*$/.exec(entry)?.[1];
        if (spread !== undefined) {
            return (lists.get(spread) ?? []).map((value) => ({ title: value, value }));
        }
        const literal = /^\s*["'`]([^"'`]{0,200})["'`]\s*$/.exec(entry)?.[1];
        if (literal !== undefined) {
            return [{ title: literal, value: literal }];
        }
        const value = (0, sanitySource_1.ownString)((0, sanitySource_1.entryObject)(entry), 'value');
        const title = (0, sanitySource_1.ownString)((0, sanitySource_1.entryObject)(entry), 'title') ?? value;
        return value === undefined || title === undefined ? [] : [{ title, value }];
    });
    return out.slice(0, cmsRemoteSchema_1.REMOTE_SCHEMA_LIMITS.optionsMax);
}
/**
 * The project's constant lists of text (`export const SERMON_SERVICES = ["…", …]`,
 * `as const` or not), by name: what a schema's choices may be built from.
 */
function sanityConstantLists(projectRoot) {
    const lists = new Map();
    const declaration = /\bconst\s+([A-Za-z_$][\w$]*)\s*(?::[^=]{0,80})?=\s*\[/g;
    for (const file of (0, sanityStructure_1.projectSourceFiles)(projectRoot, (text) => /\bconst\s+\w+\s*=\s*\[/.test(text))) {
        let text;
        try {
            text = node_fs_1.default.readFileSync(file, 'utf8');
        }
        catch {
            continue;
        }
        for (const match of text.matchAll(declaration)) {
            const name = match[1] ?? '';
            const open = (match.index ?? 0) + match[0].length - 1;
            const close = (0, sanitySource_1.closing)(text, open);
            const values = close === undefined ? [] : stringItems(text.slice(open + 1, close));
            if (values !== undefined && values.length > 0 && !lists.has(name)) {
                lists.set(name, values);
            }
            if (lists.size >= CONSTANT_LISTS_MAX) {
                return lists;
            }
        }
    }
    return lists;
}
const CONSTANT_LISTS_MAX = 500;
// The array's items when every one is a string literal; otherwise it is not a list of text.
function stringItems(list) {
    const values = [];
    for (const entry of (0, sanitySource_1.entries)(list).slice(0, cmsRemoteSchema_1.REMOTE_SCHEMA_LIMITS.optionsMax)) {
        const literal = /^\s*["'`]([^"'`$]{0,200})["'`]\s*$/.exec(entry)?.[1];
        if (literal === undefined) {
            return undefined;
        }
        values.push(literal);
    }
    (0, assert_1.assert)(values.length <= cmsRemoteSchema_1.REMOTE_SCHEMA_LIMITS.optionsMax, 'A constant list fits a dropdown');
    return values;
}
// Nested fields need a settled type to be part of an object's shape; one the
// code does not settle is edited as text, which is what most such fields hold.
function settled(fields) {
    return fields.map(({ groups: _groups, ...field }) => ({ ...field, type: field.type ?? { kind: 'string', options: [] } }));
}
// `readOnly: true`, or a callback that locks the field once it holds a value:
// `({ value }) => value !== undefined` (or `!= null`, `!!value`, `Boolean(value)`).
// Any other callback depends on what the Studio knows (who is signed in), so
// the field stays editable rather than locked by a guess.
const LOCKED_WHEN_SET = /^\s*\(\s*\{\s*value\s*\}\s*\)\s*=>\s*(?:value\s*!==?\s*(?:undefined|null)|!!\s*value|Boolean\(\s*value\s*\))\s*$/;
function readOnlyOf(own) {
    if (literalTrue(own, 'readOnly')) {
        return { readOnly: 'always' };
    }
    const source = (0, sanitySource_1.ownSource)(own, 'readOnly');
    if (source !== undefined && LOCKED_WHEN_SET.test(source)) {
        return { readOnly: 'when-set' };
    }
    return {};
}
function literalTrue(own, key) {
    const at = (0, sanitySource_1.ownKey)(own, key);
    return at !== undefined && /^\s*true\b/.test(own.slice(at));
}
