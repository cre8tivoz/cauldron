"use strict";
// Adding a collection to a project's Astro content config: a `defineCollection`
// with a glob loader over its own folder under src/content, and a starter
// schema of one title, added to the `collections` export. The config is the
// project's own TypeScript, so it is patched as text, in place: the
// declaration goes just above the export, the name into the export's object,
// and only the imports it lacks are added at the top. A config whose export
// cannot be found is refused rather than guessed at.
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CONTENT_CONFIG_PATH = void 0;
exports.addCollectionToConfig = addCollectionToConfig;
exports.createAstroCollection = createAstroCollection;
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
const assert_1 = require("../../shared/core/assert");
const documentWrites_1 = require("../documents/documentWrites");
const contentPaths_1 = require("../lib/contentPaths");
const contentConfig_1 = require("./contentConfig");
/** Where a project with no content config gets one (Astro 5 and later). */
exports.CONTENT_CONFIG_PATH = 'src/content.config.ts';
const COLLECTIONS_EXPORT = /export\s+const\s+collections\s*(?::[^=]+)?=\s*\{/;
// A config is a page of code; past this it is not one Stacki should patch.
const CONFIG_CHARS_MAX = 200_000;
/**
 * The config with collection `name` added, or why it cannot be. `source` is
 * the config's text, or undefined when the project has none yet.
 */
function addCollectionToConfig(source, name) {
    (0, assert_1.assert)(/^[a-z][A-Za-z0-9]*$/.test(name), 'A collection name is an identifier');
    const folder = `src/content/${kebab(name)}`;
    if (source === undefined) {
        return { ok: true, value: { text: newConfig(name, folder), folder } };
    }
    if (source.length > CONFIG_CHARS_MAX) {
        return { ok: false, error: 'The content config is too large to edit here.' };
    }
    const opening = COLLECTIONS_EXPORT.exec(source);
    if (opening === null) {
        return {
            ok: false,
            error: 'Stacki could not find `export const collections = { … }` in the content config.',
        };
    }
    const open = opening.index + opening[0].length - 1;
    const close = closingBrace(source, open);
    if (close === undefined) {
        return { ok: false, error: 'The content config’s collections export is not closed.' };
    }
    const listed = source.slice(open + 1, close);
    if (new RegExp(`(^|[\\s,{])['"]?${name}['"]?\\s*[:,}]|(^|[\\s,])${name}\\s*$`).test(listed)) {
        return { ok: false, error: `A collection named “${name}” already exists.` };
    }
    const constant = freeIdentifier(source, name);
    if (constant === undefined) {
        return { ok: false, error: `“${name}” is already used in the content config.` };
    }
    const entry = constant === name ? name : `${name}: ${constant}`;
    const patched = source.slice(0, opening.index) +
        declaration(constant, folder) +
        '\n\n' +
        source.slice(opening.index, open + 1) +
        withEntry(listed, entry) +
        source.slice(close);
    const text = withImports(patched);
    (0, assert_1.assert)(text.length > source.length, 'Adding a collection only adds text');
    return { ok: true, value: { text, folder } };
}
/**
 * Adds collection `name` to the project's content config, creating the config
 * when there is none, and makes its folder. Throws, with the reason, when the
 * config cannot be patched.
 */
function createAstroCollection(projectPath, name) {
    const found = (0, contentConfig_1.configPathOf)(projectPath);
    const rel = found?.rel ?? exports.CONTENT_CONFIG_PATH;
    const file = (0, contentPaths_1.cmsSourcePath)(projectPath, rel);
    const before = found === undefined ? undefined : node_fs_1.default.readFileSync(file, 'utf8');
    const patch = addCollectionToConfig(before, name);
    if (!patch.ok) {
        throw new Error(patch.error);
    }
    // The folder first: it makes src/ too, where a project with no config may have none.
    node_fs_1.default.mkdirSync((0, contentPaths_1.cmsSourcePath)(projectPath, patch.value.folder), { recursive: true });
    if (before === undefined) {
        (0, documentWrites_1.createProjectText)(file, patch.value.text);
    }
    else {
        (0, documentWrites_1.writeProjectText)(file, patch.value.text, before);
    }
    (0, assert_1.assert)(node_fs_1.default.existsSync(file), 'The content config exists after a collection is added');
    (0, assert_1.assert)(node_path_1.default.isAbsolute(file), 'The config is written by its full path');
    return patch.value;
}
function newConfig(name, folder) {
    return [
        "import { defineCollection } from 'astro:content';",
        "import { glob } from 'astro/loaders';",
        "import { z } from 'astro/zod';",
        '',
        declaration(name, folder),
        '',
        `export const collections = { ${name} };`,
        '',
    ].join('\n');
}
function declaration(constant, folder) {
    return [
        `const ${constant} = defineCollection({`,
        `  loader: glob({ base: './${folder}', pattern: '**/*.{md,mdx}' }),`,
        '  schema: z.object({',
        '    title: z.string(),',
        '  }),',
        '});',
    ].join('\n');
}
// The object's body with one more name: on its own line when the object spans
// lines, after the last name when it is written on one.
function withEntry(listed, entry) {
    const body = listed.trimEnd();
    if (body.trim().length === 0) {
        return ` ${entry} `;
    }
    const comma = body.endsWith(',') ? '' : ',';
    if (listed.includes('\n')) {
        const indent = /\n([ \t]*)\S/.exec(listed)?.[1] ?? '  ';
        return `${body}${comma}\n${indent}${entry},\n`;
    }
    return `${body}${comma} ${entry} `;
}
// The imports a new declaration uses that the config does not have yet.
function withImports(source) {
    const missing = [
        importNamed(source, 'defineCollection') ? '' : "import { defineCollection } from 'astro:content';",
        importNamed(source, 'glob') ? '' : "import { glob } from 'astro/loaders';",
        importNamed(source, 'z') ? '' : "import { z } from 'astro/zod';",
    ].filter((line) => line.length > 0);
    return missing.length === 0 ? source : `${missing.join('\n')}\n${source}`;
}
function importNamed(source, name) {
    return new RegExp(`import\\s*\\{[^}]*\\b${name}\\b[^}]*\\}\\s*from`).test(source);
}
// The name itself, or `<name>Collection` when the config already uses the name.
function freeIdentifier(source, name) {
    for (const candidate of [name, `${name}Collection`]) {
        if (!new RegExp(`\\b${candidate}\\b`).test(source)) {
            return candidate;
        }
    }
    return undefined;
}
// The brace that closes the one at `open`, counting nested braces and skipping strings.
function closingBrace(source, open) {
    (0, assert_1.assert)(source.charAt(open) === '{', 'The scan starts at an opening brace');
    let depth = 0;
    let quote;
    for (let at = open; at < source.length; at += 1) {
        const character = source.charAt(at);
        if (quote !== undefined) {
            if (character === '\\') {
                at += 1;
            }
            else if (character === quote) {
                quote = undefined;
            }
        }
        else if (character === '"' || character === "'" || character === '`') {
            quote = character;
        }
        else if (character === '{') {
            depth += 1;
        }
        else if (character === '}') {
            depth -= 1;
            if (depth === 0) {
                return at;
            }
        }
    }
    return undefined;
}
function kebab(name) {
    return name.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
}
