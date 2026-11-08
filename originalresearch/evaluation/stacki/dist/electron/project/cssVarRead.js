"use strict";
// Reading a project's custom properties: the stylesheets that hold them, and
// each rule's declarations and comments in source order (cssVars.ts).
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.leading = exports.toPosix = exports.SKIPPED_DIRECTORIES = exports.CSS_VARIABLE_LIMITS = void 0;
exports.findStylesheets = findStylesheets;
exports.readDeclarations = readDeclarations;
const variableWorkspace_1 = require("./variableWorkspace");
const path_1 = __importDefault(require("path"));
const postcss_1 = __importDefault(require("postcss"));
// Folders deeper than the stylesheet bound are not where a project keeps its CSS; the rename walk
// covers the whole project, where a config or a helper module can sit two levels deeper. A
// `var()` chain longer than the resolve bound is shown as written rather than followed.
exports.CSS_VARIABLE_LIMITS = {
    stylesheetDepthMax: 8,
    renameTargetDepthMax: 10,
    resolveDepthMax: 8,
};
exports.SKIPPED_DIRECTORIES = new Set(['node_modules', 'dist', '.git', '.astro', '.stacki']);
const toPosix = (filePath) => filePath.split(path_1.default.sep).join('/');
exports.toPosix = toPosix;
// --- reading ---------------------------------------------------------------
function findStylesheets(projectPath) {
    const roots = ['src', 'public', 'styles'].map((folder) => path_1.default.join(projectPath, folder));
    const found = [];
    const walk = (directory, depth) => {
        if (depth > exports.CSS_VARIABLE_LIMITS.stylesheetDepthMax) {
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
            if (entry.name.startsWith('.') || exports.SKIPPED_DIRECTORIES.has(entry.name)) {
                continue;
            }
            const full = path_1.default.join(directory, entry.name);
            if (entry.isDirectory()) {
                walk(full, depth + 1);
            }
            else if (/\.css$/i.test(entry.name)) {
                found.push(full);
            }
        }
    };
    for (const root of roots) {
        walk(root, 0);
    }
    return [...new Set(found)].sort();
}
/** The indentation in front of `text`, absent when nothing matches (never). */
const leading = (text) => text.match(/^\s*/)?.[0]?.length ?? 0;
exports.leading = leading;
// Every custom property declared in one file, with where its value sits in the
// text so it can be written back without reformatting anything around it.
function readDeclarations(text) {
    const root = postcss_1.default.parse(text);
    const rules = [];
    const contextOf = (node) => {
        const parts = [];
        let parent = node.parent;
        while (parent && parent.type !== 'root') {
            if (parent.type === 'atrule') {
                parts.unshift(`@${parent.name} ${parent.params}`.trim());
            }
            else if (parent.type === 'rule') {
                parts.unshift(parent.selector);
            }
            parent = parent.parent;
        }
        return parts;
    };
    root.walkRules((rule) => {
        const entries = [];
        for (const node of rule.nodes || []) {
            if (node.type === 'comment') {
                // Where the words are, inside the `/*` and the spacing postcss keeps in
                // raws: a heading in a single-rule file IS this comment, so renaming it
                // means writing here.
                const open = node.source?.start?.offset ?? 0;
                const textStart = open + 2 + (node.raws?.['left']?.length ?? 0);
                entries.push({
                    kind: 'comment',
                    text: node.text.trim(),
                    textStart,
                    textEnd: textStart + node.text.length,
                });
                continue;
            }
            if (node.type !== 'decl' || !node.prop.startsWith('--')) {
                continue;
            }
            // PostCSS offsets end just after the declaration. Including another
            // character can pull the next declaration into a compact CSS value.
            const start = node.source?.start?.offset ?? 0;
            const end = node.source?.end?.offset ?? start;
            const declText = text.slice(start, end);
            const rawValue = node.raws.value?.raw ?? node.value;
            const valueStart = start + node.prop.length + (node.raws.between ?? ':').length + (0, exports.leading)(rawValue);
            // Trailing `;` and whitespace are not part of the value.
            // PostCSS keeps whitespace in an empty custom property's node.value.
            // That whitespace was already skipped above, so using its length again
            // would consume the semicolon, closing brace, or following declaration.
            const valueEnd = Math.max(valueStart, start + declText.replace(/[\s;]+$/, '').length);
            entries.push({
                kind: 'var',
                name: node.prop,
                value: text.slice(valueStart, valueEnd),
                important: !!node.important,
                valueStart,
                valueEnd,
                line: node.source?.start?.line ?? 0,
            });
        }
        if (!entries.some((entry) => entry.kind === 'var')) {
            return;
        }
        rules.push({
            selector: rule.selector,
            selectors: rule.selectors ?? [],
            context: contextOf(rule),
            line: rule.source?.start?.line ?? 0,
            entries,
        });
    });
    return rules;
}
