"use strict";
// Renaming custom properties across a project: the files a name can appear in,
// and the checks a batch of renames must pass before any file is written
// (cssVars.ts).
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EDGE = exports.NAME_RE = exports.RENAME_EXTS = void 0;
exports.findRenameTargets = findRenameTargets;
exports.renameVariables = renameVariables;
exports.renameBatchProblem = renameBatchProblem;
exports.renameTakenProblem = renameTakenProblem;
const variableWorkspace_1 = require("./variableWorkspace");
const path_1 = __importDefault(require("path"));
const variableWorkspace_2 = require("./variableWorkspace");
const variableWorkspace_3 = require("./variableWorkspace");
const cssVarRead_1 = require("./cssVarRead");
// --- renaming ----------------------------------------------------------------
//
// A custom property's name is not kept anywhere but in the text: it is the
// declaration `--brand: …` and every `var(--brand)` that reads it, spread across
// however many stylesheets and components the project has. So a rename is one
// substitution over all of them, and it either happens everywhere or the name is
// silently broken somewhere the panel cannot show.
//
// Groups are not stored either — the panel derives them from shared name
// prefixes (see prefixSections), so renaming a group is renaming each of its
// members. Both arrive here as a list of renames applied in a single pass, which
// is also what makes a swap (`a`→`b`, `b`→`a`) come out right instead of
// collapsing into one name.
// Where a name can be written. CSS files hold most of them; an Astro component
// keeps its rules in a `<style>` block, and a `style="--x: 1"` can sit in markup
// or a template — a token spelled `--x` in any of these is that variable.
exports.RENAME_EXTS = /\.(css|s[ac]ss|less|pcss|postcss|astro|html|htm|md|mdx|mdoc|svelte|vue|jsx|tsx|[cm]?[jt]s)$/i;
/**
 * Every file in the project that could spell a variable's name.
 *
 * The panel READS variables from `src`, `public` and `styles` — that is where a
 * project keeps its stylesheets. References are not so tidy: a `style` attribute
 * in a layout, a `--x` in a Tailwind or Astro config at the root, a themed
 * string in a helper module. So this walks the project rather than those three
 * roots, and skips only what is not the project's own text (dependencies, build
 * output, version control, caches).
 *
 * Broad on purpose. A missed reference is a variable that silently stops
 * resolving somewhere the panel cannot see, which is the failure that has no
 * symptom until someone looks at the page.
 */
function findRenameTargets(projectPath) {
    const found = [];
    const walk = (directory, depth) => {
        if (depth > cssVarRead_1.CSS_VARIABLE_LIMITS.renameTargetDepthMax) {
            return;
        }
        let entries;
        try {
            entries = variableWorkspace_1.variableFiles.readdirSync(directory, { withFileTypes: true });
        }
        catch {
            return;
        }
        for (const entry of entries) {
            // Dotted directories are caches and version control; a dotted FILE at the
            // root can still be a config that names a variable (`.postcssrc`), so the
            // skip is for directories only.
            if (entry.isDirectory()) {
                if (entry.name.startsWith('.') || cssVarRead_1.SKIPPED_DIRECTORIES.has(entry.name)) {
                    continue;
                }
                walk(path_1.default.join(directory, entry.name), depth + 1);
            }
            else if (exports.RENAME_EXTS.test(entry.name)) {
                found.push(path_1.default.join(directory, entry.name));
            }
        }
    };
    walk(projectPath, 0);
    return [...new Set(found)].sort();
}
/** A custom property name, as a name and not as a prefix of a longer one. */
exports.NAME_RE = /^--[^\s:;{}()'"\\,]+$/;
// `--space` must not match inside `--space-2` or `--x--space`, in either
// direction — the parts of a name are separated by hyphens, so a hyphen on
// either side is part of a longer name rather than a boundary.
exports.EDGE = '[-\\w\\u00a0-\\uffff]';
/**
 * Renames custom properties across the project — declarations and references
 * alike, in one pass.
 *
 * `renames` is [{ from, to }]. Everything is checked before anything is written:
 * a rename that would land on a name already in use, or that is not a name at
 * all, takes the whole batch down rather than leaving a group half renamed.
 */
function renameVariables(projectPath, { renames }) {
    const list = (renames || []).filter((rename) => rename && rename.from !== rename.to);
    if (!list.length) {
        return { ok: true, files: 0, occurrences: 0 };
    }
    const problem = renameBatchProblem(list) ?? renameTakenProblem(projectPath, list);
    if (problem !== undefined) {
        return { ok: false, error: problem };
    }
    const by = new Map(list.map(({ from, to }) => [from, to]));
    // One alternation over every name being renamed, longest first — so that with
    // both `--a` and `--a-b` in the batch, `--a-b` is the one that matches.
    const alternation = [...by.keys()]
        .sort((left, right) => right.length - left.length)
        .map((name) => name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
        .join('|');
    const re = new RegExp(`(?<!${exports.EDGE})(${alternation})(?!${exports.EDGE})`, 'g');
    const writes = [];
    let occurrences = 0;
    for (const abs of findRenameTargets(projectPath)) {
        let text;
        try {
            if (variableWorkspace_1.variableFiles.statSync(abs).size > variableWorkspace_3.MAIN_LIMITS.cssVariableFileBytesMax) {
                continue;
            }
            text = variableWorkspace_1.variableFiles.readFileSync(abs, 'utf8');
        }
        catch {
            continue;
        }
        let hits = 0;
        const next = text.replace(re, (match) => {
            hits += 1;
            return by.get(match) ?? match;
        });
        if (!hits) {
            continue;
        }
        occurrences += hits;
        writes.push([abs, next]);
    }
    // Written only once every file has been read and rewritten in memory: a
    // half-applied rename is worse than a refused one. Each write goes through
    // the file's document actor (documentWrites.ts), which also announces it as
    // the app's own, so the watcher does not read it back as an outside edit.
    for (const [abs, next] of writes) {
        (0, variableWorkspace_2.writeProjectText)(abs, next);
    }
    return { ok: true, files: writes.length, occurrences };
}
// Why the batch cannot be applied as asked, before looking at the project: a name that is not
// one, or two renames that collide with each other.
function renameBatchProblem(list) {
    const froms = new Set();
    const tos = new Set();
    for (const { from, to } of list) {
        if (!exports.NAME_RE.test(String(from || ''))) {
            return `${from} is not a variable name.`;
        }
        if (!exports.NAME_RE.test(String(to || ''))) {
            return `"${String(to || '').replace(/^--/, '')}" cannot be a variable name.`;
        }
        if (froms.has(from)) {
            return `${from} is renamed twice in one go.`;
        }
        if (tos.has(to)) {
            return `Two variables would both be called ${to}.`;
        }
        froms.add(from);
        tos.add(to);
    }
    return undefined;
}
// Taken names, minus the ones this batch is freeing up: renaming a group means
// every member moves at once, and a swap within it is legitimate.
function renameTakenProblem(projectPath, list) {
    const froms = new Set(list.map(({ from }) => from));
    const declared = new Set();
    for (const abs of (0, cssVarRead_1.findStylesheets)(projectPath)) {
        let text;
        try {
            text = variableWorkspace_1.variableFiles.readFileSync(abs, 'utf8');
        }
        catch {
            continue;
        }
        for (const match of text.matchAll(/(^|[;{}\s])(--[^\s:;{}()'"\\,]+)\s*:/g)) {
            const name = match[2];
            if (name) {
                declared.add(name);
            }
        }
    }
    for (const { to } of list) {
        if (declared.has(to) && !froms.has(to)) {
            return `${to} already exists.`;
        }
    }
    return undefined;
}
