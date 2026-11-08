"use strict";
// Making new files from a model: a component out of a piece of a page, and a
// new page. Printing a whole file happens only here, for a file that does not
// exist yet; an existing file changes only by splices (plan §11.9, the
// no-whole-file-regeneration fence in eslint.config.mjs).
//
// A component made out of a piece of a page:
//
// The markup MOVES — the page keeps `<Card />` where the element was — so what
// lands in the new file has to be everything that piece needed to render. Two
// things travel with it:
//
//   the nodes themselves, serialized exactly as the page writes them, and
//   the imports it was leaning on the page to have made.
//
// The second is the one that's easy to forget: an extracted card holding a
// <Button> renders an error, not a button, unless Button comes with it. And an
// import that came along can't simply be copied — a relative path is relative
// to the file it was written in, and the new file is somewhere else.
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.componentFile = componentFile;
exports.discardComponentFile = discardComponentFile;
exports.newPageText = newPageText;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const assert_1 = require("../../shared/core/assert");
const platform_1 = require("../lib/platform");
const atomicWrite_1 = require("./atomicWrite");
const astroParser_1 = require("../parse/astroParser");
const toPosix = (filePath) => filePath.split(path_1.default.sep).join('/');
// A component's name is a filename, an import and a tag all at once — and the
// capital is load-bearing: Astro reads a lowercase tag as an HTML element, so
// `<card />` renders a literal <card> and the component never appears.
const VALID_NAME = /^[A-Z][A-Za-z0-9]*$/;
/**
 * The file to write for a new component, as `{ path, rel, text }`. Throws when
 * the name can't be used — nothing is written here; the caller does that, so
 * every write to the project stays in one place.
 */
function componentFile({ projectPath, pagePath, name, nodes, imports = [], props = [] }) {
    if (!VALID_NAME.test(String(name || ''))) {
        throw new Error('A component name has to be a word starting with a capital letter.');
    }
    if (!Array.isArray(nodes) || nodes.length === 0) {
        throw new Error('Nothing to make a component from.');
    }
    const componentsDirectory = path_1.default.join(projectPath, 'src', 'components');
    const target = path_1.default.join(componentsDirectory, `${name}.astro`);
    // Case-insensitively: on a Mac, Card.astro and card.astro are the same file,
    // and writing the second silently replaces the first.
    const clash = fs_1.default.existsSync(componentsDirectory)
        ? fs_1.default.readdirSync(componentsDirectory).find((fileName) => fileName.toLowerCase() === `${name.toLowerCase()}.astro`)
        : undefined;
    if (clash) {
        throw new Error(`There's already a component called ${path_1.default.basename(clash, '.astro')}.`);
    }
    // Which of the page's imports this piece actually uses. Matched against the
    // serialized markup rather than the node kinds, so a name used inside an
    // expression (`{items.map(…)}`, `<Fragment set:html={raw} />`) counts too.
    const markup = (0, astroParser_1.serializeNodes)(nodes);
    const used = imports.filter((imp) => imp?.name && new RegExp(`(^|[^A-Za-z0-9_$])${imp.name}([^A-Za-z0-9_$]|$)`).test(markup));
    // `@/components/Button.astro` and bare package names mean the same thing from
    // any file and travel untouched. A relative path was written from the page's
    // folder and has to be re-aimed from src/components.
    const pageDirectory = path_1.default.dirname(pagePath);
    const moved = used.map((imp) => {
        const spec = String(imp.path || '');
        if (!spec.startsWith('.')) {
            return { ...imp };
        }
        const rel = toPosix(path_1.default.relative(componentsDirectory, path_1.default.resolve(pageDirectory, spec)));
        return { ...imp, path: rel.startsWith('.') ? rel : './' + rel };
    });
    // The values the piece was reading from the page, now read from its props
    // instead. Astro's own convention, and the one the props panel reads back:
    // a destructure off Astro.props IS the component's interface.
    const names = props.filter((prop) => /^[A-Za-z_$][\w$]*$/.test(String(prop || '')));
    const extraFrontmatter = names.length ? `const { ${names.join(', ')} } = Astro.props;` : '';
    const text = (0, astroParser_1.serializePage)({
        imports: moved,
        extraFrontmatter,
        nodes,
        // No imports and no props, no `---` block: a component that needs no
        // frontmatter shouldn't be handed an empty one.
        hadFrontmatter: moved.length > 0 || names.length > 0,
    });
    return { path: target, rel: toPosix(path_1.default.relative(projectPath, target)), text };
}
/** The text of a new, empty page: a frontmatter block, and the layout wrapper
 * when one is picked (imported relative to the page). */
function newPageText(input) {
    const layout = input.layout;
    const base = {
        extraFrontmatter: '',
        frontmatterLead: '',
        extraFrontmatterSpaced: true,
        hadFrontmatter: true,
        trailingBlank: 0,
        eol: input.eol,
    };
    if (layout === undefined) {
        return (0, astroParser_1.serializePage)({ ...base, imports: [], nodes: [] });
    }
    const rel = toPosix(path_1.default.relative(path_1.default.dirname(input.pagePath), layout.path));
    const wrapper = { id: 'layout', kind: 'component', name: layout.name, props: {}, children: [] };
    const imports = [{ name: layout.name, path: rel.startsWith('.') ? rel : './' + rel }];
    const text = (0, astroParser_1.serializePage)({ ...base, imports, nodes: [wrapper] });
    (0, assert_1.assert)(text.includes(`<${layout.name}`), 'A new page prints its layout wrapper');
    (0, assert_1.assert)(text.includes(rel), 'A new page imports its layout');
    return text;
}
/**
 * Undo of "create component": the file goes only while it holds exactly what
 * was written, so an edit made to it since is never lost without a question.
 * Only a component file can go — the request crosses a process boundary, and a
 * path anywhere else is refused rather than deleted.
 */
function discardComponentFile({ projectPath, path: target, checksum, force }) {
    const componentsDirectory = path_1.default.join(projectPath, 'src', 'components');
    if (!(0, platform_1.isPathDescendant)(componentsDirectory, target)) {
        throw new Error('Only a component file can be taken back.');
    }
    if (path_1.default.extname(target) !== '.astro') {
        throw new Error('Only a component file can be taken back.');
    }
    if (!fs_1.default.existsSync(target)) {
        return 'missing';
    }
    const unchanged = (0, atomicWrite_1.digestOf)(fs_1.default.readFileSync(target)) === checksum;
    if (unchanged || force) {
        fs_1.default.rmSync(target);
        (0, assert_1.assert)(!fs_1.default.existsSync(target), 'A discarded component is gone');
        return 'deleted';
    }
    return 'edited';
}
