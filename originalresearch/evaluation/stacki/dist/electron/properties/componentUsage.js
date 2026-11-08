"use strict";
// Where a component is used.
//
// The palette says "23 instances" — a number the panel works out by counting
// `<Name` across every .astro file under src. That count is the interesting
// half of a question it doesn't answer: 23 instances WHERE. Same count, same
// regex, now with the files it came from, so the number can be opened.
//
// Matched the way the count is matched, deliberately: if the two disagreed, the
// list would be missing something the number promised, and nothing would say
// which of them was lying.
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.instanceCounts = instanceCounts;
exports.componentUsage = componentUsage;
exports.countIn = countIn;
exports.instancesIn = instancesIn;
exports.importsOf = importsOf;
exports.templateOf = templateOf;
exports.astroFiles = astroFiles;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const cmsRefs_1 = require("../content/cmsRefs");
const mainLimits_1 = require("../lib/mainLimits");
const platform_1 = require("../lib/platform");
const assert_1 = require("../../shared/core/assert");
const limits_1 = require("../../shared/core/limits");
const toPosix = (filePath) => filePath.split(path_1.default.sep).join('/');
/** Every file that can hold an instance: .astro anywhere, and markdown pages,
 *  which render components too. The same set the palette's own count walks. */
function astroFiles(directory) {
    if (!fs_1.default.existsSync(directory)) {
        return [];
    }
    const out = [];
    const walk = (current, depth) => {
        // A project's folders are not ours to trust: a tree deeper than any real one stops the
        // walk there, before it can exhaust the stack.
        if (depth > mainLimits_1.MAIN_LIMITS.directoryDepthMax) {
            return;
        }
        for (const entry of fs_1.default.readdirSync(current, { withFileTypes: true })) {
            const full = path_1.default.join(current, entry.name);
            if (entry.isDirectory()) {
                walk(full, depth + 1);
            }
            else if (entry.name.endsWith('.astro') || (current.includes(`${path_1.default.sep}pages`) && /\.mdx?$/i.test(entry.name))) {
                out.push(full);
            }
        }
    };
    walk(directory, 0);
    return out;
}
/**
 * The markup, without the frontmatter above it — where instances actually are.
 *
 * A component's own code talks about itself: Lumos's Card.astro carries three
 * `console.warn('[lumos] <Card variant="…">…')` lines, and counting the file's
 * text as a whole read those as three more cards on the page. The number in the
 * palette was the number of times the name appeared, which is not the same
 * thing as the number of times the component is used.
 */
function templateOf(source) {
    return String(source ?? '').replace(/^---\r?\n[\s\S]*?\r?\n---[ \t]*\r?\n?/, '');
}
/** How many times `source` uses `<Name …>`. Closing tags and frontmatter code
 *  don't count. */
function countIn(source, name) {
    if (!/^[A-Za-z][A-Za-z0-9]*$/.test(String(name || ''))) {
        return 0;
    }
    return (templateOf(source).match(new RegExp(`<${String(name)}[\\s/>]`, 'g')) || []).length;
}
const IMPORT_RE = /^[ \t]*import\s+([^;'"]*?)\s+from\s*['"]([^'"]+)['"]/gm;
/**
 * What each import in a file brings in, as `{ names, candidates }`.
 *
 * A tag is a local binding, not a filename. Every page in a Lumos project says
 *
 *   import Layout from "@/layouts/BaseLayout.astro";
 *   <Layout> … </Layout>
 *
 * so counting `<BaseLayout` found nothing and the palette reported 0 instances
 * of a layout on every page in the project. The name to count is whatever THAT
 * file calls it.
 */
function importsOf(source, file, aliases) {
    const out = [];
    IMPORT_RE.lastIndex = 0;
    let match;
    while ((match = IMPORT_RE.exec(String(source))) !== null) {
        const clause = match[1];
        const spec = match[2];
        if (clause === undefined || spec === undefined) {
            continue;
        }
        const names = (0, cmsRefs_1.boundNames)(clause);
        if (!names.length) {
            continue;
        }
        const candidates = new Set();
        for (const base of (0, cmsRefs_1.resolveSpec)(spec, file, aliases)) {
            candidates.add(base);
            // A specifier can leave the extension off; components are .astro.
            if (!/\.[a-z]+$/i.test(base)) {
                candidates.add(`${base}.astro`);
            }
        }
        if (candidates.size) {
            out.push({ names, candidates });
        }
    }
    return out;
}
const USAGE_NAMES_MAX = 10_000;
/** Scan markup and imports once; all component queries then use bounded maps. */
function instanceCounts(source, file, aliases) {
    const text = String(source ?? '');
    (0, assert_1.assert)(text.length <= limits_1.LIMITS.sourceBytesMax, 'Usage source stays within the reader limit');
    const names = instanceTagCounts(templateOf(text));
    const imports = importsOf(text, file, aliases);
    const targets = new Map();
    const bound = new Set();
    for (const item of imports) {
        let count = 0;
        for (const name of item.names) {
            bound.add(name);
            count += names.get(name) ?? 0;
        }
        const candidates = new Set([...item.candidates].map((candidate) => (0, platform_1.comparablePath)(candidate)));
        for (const key of candidates) {
            targets.set(key, (targets.get(key) ?? 0) + count);
        }
        if (bound.size > USAGE_NAMES_MAX || targets.size > USAGE_NAMES_MAX) {
            throw new Error('Component usage exceeds 10,000 import bindings');
        }
    }
    (0, assert_1.assert)(targets.size <= USAGE_NAMES_MAX, 'Usage target index stays bounded');
    return ({ targetPath, name }) => {
        if (targetPath) {
            const count = targets.get((0, platform_1.comparablePath)(targetPath));
            if (count !== undefined) {
                return count;
            }
            if (bound.has(name)) {
                return 0;
            }
        }
        return names.get(name) ?? 0;
    };
}
function instanceTagCounts(template) {
    (0, assert_1.assert)(template.length <= limits_1.LIMITS.sourceBytesMax, 'Usage template stays within the reader limit');
    const counts = new Map();
    // This is the same tag grammar as countIn, including its frontmatter exclusion.
    // Iteration is bounded by the source length; distinct names have a separate cap.
    for (const match of template.matchAll(/<([A-Za-z][A-Za-z0-9]*)(?=[\s/>])/g)) {
        const name = match[1];
        if (name !== undefined) {
            counts.set(name, (counts.get(name) ?? 0) + 1);
            if (counts.size > USAGE_NAMES_MAX) {
                throw new Error('Component usage exceeds 10,000 tag names');
            }
        }
    }
    (0, assert_1.assert)(counts.size <= USAGE_NAMES_MAX, 'Usage tag index stays bounded');
    return counts;
}
/**
 * How many instances of one component a file holds — counted under the name
 * that file imports it as. A file that doesn't import it falls back to the
 * component's own name: markdown pages and auto-import integrations render
 * components they never name in an import.
 */
function instancesIn(source, { file, targetPath, name, aliases = [], counts }) {
    return (counts ?? instanceCounts(source, file, aliases))({ targetPath, name });
}
/**
 * The files that hold instances of `name`, most-used first, each as
 * `{ rel, path, kind, count }`. `kind` is where the file lives — a page, a
 * layout, or another component — which is how the caller knows whether opening
 * it means going to a page or drilling into a component.
 *
 * The component's own file is left out: a file is not one of its own users, and
 * a recursive component would otherwise list itself above everything else.
 */
function componentUsage({ projectPath, name, exclude }) {
    const sourceFolder = path_1.default.join(projectPath, 'src');
    const skip = exclude ? path_1.default.resolve(exclude) : undefined;
    // `exclude` is the component's own file, which is also the file every other
    // file's import has to resolve to for its local name to count.
    const aliases = (0, cmsRefs_1.aliasMap)(projectPath);
    const kindOf = (file) => {
        const rel = toPosix(path_1.default.relative(sourceFolder, file));
        if (rel.startsWith('pages/')) {
            return 'page';
        }
        if (rel.startsWith('layouts/')) {
            return 'layout';
        }
        if (rel.startsWith('components/')) {
            return 'component';
        }
        return 'file';
    };
    const files = [];
    for (const file of astroFiles(sourceFolder)) {
        if (skip && (0, platform_1.sameFilesystemPath)(file, skip)) {
            continue;
        }
        let text;
        try {
            text = fs_1.default.readFileSync(file, 'utf8');
        }
        catch {
            continue;
        }
        const count = instancesIn(text, { file, targetPath: exclude, name, aliases });
        if (!count) {
            continue;
        }
        files.push({
            rel: toPosix(path_1.default.relative(projectPath, file)),
            path: file,
            kind: kindOf(file),
            count,
        });
    }
    // Most instances first, then by name — the file it's really "in" leads.
    files.sort((left, right) => right.count - left.count || left.rel.localeCompare(right.rel));
    return { files, total: files.reduce((total, usage) => total + usage.count, 0) };
}
