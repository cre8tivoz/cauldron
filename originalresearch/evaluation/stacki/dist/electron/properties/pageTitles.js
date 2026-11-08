"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.scanPageTitles = scanPageTitles;
exports.resolvePageTitles = resolvePageTitles;
exports.scanPageTitleSource = scanPageTitleSource;
// Reuse the scan's bounded source reads so titles require no additional disk access.
const astroParser_1 = require("../parse/astroParser");
const pageTitle_1 = require("../../shared/page/pageTitle");
const assert_1 = require("../../shared/core/assert");
const limits_1 = require("../../shared/core/limits");
const cmsRefs_1 = require("../content/cmsRefs");
const node_path_1 = __importDefault(require("node:path"));
// Cyclic or unusually deep wrapper chains fall back to filenames without running site code.
const WRAPPERS_MAX = 32;
function scanPageTitles(pages, sources, aliases = []) {
    (0, assert_1.assert)(pages.length <= limits_1.LIMITS.scanEntriesMax, 'Page titles: page count is bounded');
    (0, assert_1.assert)(sources.length <= limits_1.LIMITS.scanEntriesMax, 'Page titles: source count is bounded');
    // Import resolution produces native absolute paths. Normalize both sides so
    // Windows separators and equivalent source spellings use the same cache key.
    const sourceByPath = new Map(sources.map(({ file, text }) => [node_path_1.default.resolve(file), text]));
    // Keep only small title summaries, not every parsed page tree, during a scan.
    const cache = new Map();
    const read = (file) => {
        const key = node_path_1.default.resolve(file);
        if (!cache.has(key)) {
            const text = sourceByPath.get(key);
            cache.set(key, text === undefined ? undefined : scanPageTitleSource(text));
        }
        return cache.get(key);
    };
    return resolvePageTitles(pages, aliases, read);
}
function resolvePageTitles(pages, aliases, read) {
    (0, assert_1.assert)(pages.length <= limits_1.LIMITS.scanEntriesMax, 'Page titles: page count is bounded');
    const wrapperOf = (file, source) => {
        const candidates = source.specifier === undefined ? [] : (0, cmsRefs_1.resolveSpec)(source.specifier, file, aliases);
        return candidates.find((candidate) => read(candidate) !== undefined);
    };
    return pages.map((page) => {
        if (!page.path.toLowerCase().endsWith('.astro')) {
            return page;
        }
        const source = read(page.path);
        if (source === undefined) {
            return page;
        }
        const inheritedTitle = scanInheritedTitle(wrapperOf(page.path, source), wrapperOf, read);
        const title = source.kind === 'override' ? source.title : inheritedTitle;
        return title === undefined && inheritedTitle === undefined ? page : { ...page, title, inheritedTitle };
    });
}
function scanPageTitleSource(text) {
    const parsed = (0, astroParser_1.parsePage)(text);
    if (!parsed.editable) {
        return undefined;
    }
    const layout = parsed.model.nodes.find((node) => node.id === 'layout');
    if (layout?.kind !== 'component') {
        return undefined;
    }
    const imported = parsed.model.imports.find((entry) => entry.name === layout.name);
    return layout.props?.['title'] === undefined
        ? { kind: 'inherit', specifier: imported?.path }
        : { kind: 'override', title: (0, pageTitle_1.layoutPageTitle)(parsed.model.nodes), specifier: imported?.path };
}
function scanInheritedTitle(wrapper, wrapperOf, read) {
    const visited = new Set();
    let current = wrapper;
    for (let depth = 0; depth < WRAPPERS_MAX; depth++) {
        if (current === undefined || visited.has(current)) {
            return undefined;
        }
        visited.add(current);
        const source = read(current);
        if (source?.kind === 'override') {
            return source.title;
        }
        current = source === undefined ? undefined : wrapperOf(current, source);
    }
    return undefined;
}
