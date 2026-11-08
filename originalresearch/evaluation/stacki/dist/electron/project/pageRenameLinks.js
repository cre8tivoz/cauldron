"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.renamePageLinks = renamePageLinks;
exports.renamePageLink = renamePageLink;
exports.renamePageImports = renamePageImports;
const node_path_1 = __importDefault(require("node:path"));
const assert_1 = require("../../shared/core/assert");
const pageRename_1 = require("../../shared/properties/pageRename");
/** Rewrite literal links without interpreting project JavaScript or changing external sites. */
function renamePageLinks(source, context) {
    (0, assert_1.assert)(source.length <= 5_000_000, 'Link rename: source size is bounded');
    (0, assert_1.assert)(context.origins.length <= 32, 'Link rename: origin count is bounded');
    const quoted = source.replace(/(["'`])((?:\\[\s\S]|(?!\1)[^\\])*)\1/g, (_match, quote, value) => {
        const escaped = value.includes('\\/');
        const literal = escaped ? value.replace(/\\\//g, '/') : value;
        const next = renamePageLink(literal, context);
        return quote + (escaped ? next.replace(/\//g, '\\/') : next) + quote;
    });
    // Markdown destinations, unquoted HTML links and XML sitemap locations are not JS strings.
    const attributes = quoted.replace(/(\b(?:href|action)\s*=\s*)(["'])([^"']*)\2/g, (_match, prefix, quote, value) => prefix + quote + renamePageLink(value, { ...context, relative: 'url' }) + quote);
    return attributes.replace(/(\]\(\s*|\b(?:href|src|action)=|<loc>)([^\s<>"'`)]+)/g, (_match, prefix, value) => prefix + renamePageLink(value, { ...context, relative: 'url' }));
}
function renamePageLink(value, context) {
    if (/[\r\n\s]/.test(value) || value.length > 32_768) {
        return value;
    }
    const absolute = /^(https?:\/\/[^/?#]+)(\/[^]*)$/.exec(value);
    if (absolute) {
        const origin = absolute[1];
        const suffix = absolute[2];
        if (origin === undefined || suffix === undefined || !context.origins.includes(origin)) {
            return value;
        }
        return origin + renameURLPath(suffix, context.change);
    }
    if (value.startsWith('//')) {
        return value;
    }
    if (value.startsWith('/')) {
        return renameURLPath(value, context.change);
    }
    if (context.relative !== 'url' || !context.file.startsWith('src/pages/')) {
        return value;
    }
    if (value.startsWith('#') || value.startsWith('?') || /^[a-z][a-z0-9+.-]*:/i.test(value)) {
        return value;
    }
    if (/\.(astro|mdx?|[cm]?[jt]sx?|css|json)(?:[?#]|$)/.test(value)) {
        return value;
    }
    const route = (0, pageRename_1.pageURLPath)(context.file.slice('src/pages/'.length));
    const resolved = new URL(value, 'https://stacki.invalid' + route);
    const before = resolved.pathname + resolved.search + resolved.hash;
    const after = renameURLPath(before, context.change);
    // Root-relative links remain stable when the referring page itself also moves.
    const ownerMoved = renameURLPath(route, context.change) !== route;
    return before === after && !ownerMoved ? value : after;
}
function renameURLPath(value, change) {
    const boundary = value.search(/[?#]/);
    const pathname = boundary < 0 ? value : value.slice(0, boundary);
    const suffix = boundary < 0 ? '' : value.slice(boundary);
    const from = change.kind === 'folder' ? '/' + change.from : (0, pageRename_1.pageURLPath)(change.from);
    const to = change.kind === 'folder' ? '/' + change.to : (0, pageRename_1.pageURLPath)(change.to);
    if (change.kind === 'folder' && pathname.startsWith(from + '/')) {
        return to + pathname.slice(from.length) + suffix;
    }
    const trailing = pathname !== '/' && pathname.endsWith('/');
    const route = trailing ? pathname.slice(0, -1) : pathname;
    const next = renameRoutePattern(route, from, to, { descendants: change.kind === 'folder' });
    return next === undefined ? value : next + (trailing && next !== '/' ? '/' : '') + suffix;
}
function renameRoutePattern(route, from, to, options) {
    if (!from.includes('[')) {
        return route === from ? to : undefined;
    }
    const parameters = /\[(\.\.\.)?[^\]]+\]/g;
    const pattern = from
        .split(/(\[(?:\.\.\.)?[^\]]+\])/g)
        .map((part, index) => {
        if (index % 2 === 1) {
            return part.startsWith('[...') ? '(.+)' : '([^/]+)';
        }
        return part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    })
        .join('');
    const match = new RegExp('^' + pattern + (options.descendants ? '(/.*)?' : '') + '$').exec(route);
    if (!match) {
        return undefined;
    }
    let index = 0;
    const next = to.replace(parameters, () => match[++index] ?? '');
    return next + (options.descendants ? (match[index + 1] ?? '') : '');
}
/** Preserve relative and aliased module references when either end of the import moves. */
function renamePageImports(source, file, relocated, aliases = []) {
    const rewrite = (specifier) => renameModulePath(specifier, file, relocated, aliases);
    const modules = source.replace(/((?:\bfrom\s*|\bimport\s*(?:\(\s*)?|\brequire\(\s*)['"])([^'"]+)(['"])/g, (_match, prefix, specifier, quote) => prefix + rewrite(specifier) + quote);
    return modules.replace(/^(\s*layout:\s*['"]?)([^'"\s]+)(['"]?\s*)$/gm, (_match, prefix, specifier, suffix) => prefix + rewrite(specifier) + suffix);
}
function renameModulePath(specifier, file, relocated, aliases) {
    const relative = specifier.startsWith('./') || specifier.startsWith('../');
    const alias = aliases.find(([prefix]) => specifier === prefix || specifier.startsWith(prefix + '/'));
    const aliasTarget = alias?.[1][0];
    if (!relative && aliasTarget === undefined) {
        return specifier;
    }
    const target = relative
        ? node_path_1.default.posix.normalize(node_path_1.default.posix.join(node_path_1.default.posix.dirname(file), specifier))
        : node_path_1.default.posix.normalize((aliasTarget ?? '') + specifier.slice(alias?.[0].length ?? 0));
    const suffix = ['', '.astro', '.md', '.mdx', '.ts', '.js', '/index.astro', '/index.ts', '/index.js'].find((extension) => relocated.has(target + extension));
    const nextFile = relocated.get(file) ?? file;
    const nextTarget = suffix === undefined ? target : relocated.get(target + suffix);
    (0, assert_1.assert)(nextTarget !== undefined, 'A matched relocation has a destination');
    if (nextTarget === target && (!relative || nextFile === file)) {
        return specifier;
    }
    let next = node_path_1.default.posix.relative(node_path_1.default.posix.dirname(nextFile), nextTarget);
    if (suffix === '.ts' || suffix === '.js') {
        next = next.slice(0, -suffix.length);
    }
    return next.startsWith('.') ? next : './' + next;
}
