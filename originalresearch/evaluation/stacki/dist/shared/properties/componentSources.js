"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.COMPONENT_SOURCE_LIMITS = exports.COMPONENT_SOURCE_FILE = void 0;
exports.parseComponentSources = parseComponentSources;
exports.parseComponentOrigin = parseComponentOrigin;
exports.componentSourceRoot = componentSourceRoot;
exports.componentImportPath = componentImportPath;
// Package locations and import spelling are separate: an alias must never turn an
// installed component into an editable local file with the same display name.
const boundary_1 = require("../core/boundary");
exports.COMPONENT_SOURCE_FILE = '.stacki/component-sources.json';
exports.COMPONENT_SOURCE_LIMITS = {
    sourcesMax: 16,
    filesMax: 10000,
    directoriesMax: 1000,
    sourceBytesMax: 1024 * 1024,
    sourceBytesTotalMax: 16 * 1024 * 1024,
    configBytesMax: 16384,
};
function parseComponentSources(input) {
    const value = (0, boundary_1.record)(input);
    if (value['version'] !== 1) {
        throw new Error('Unsupported component sources version.');
    }
    const sources = value['sources'];
    if (!Array.isArray(sources) || sources.length > exports.COMPONENT_SOURCE_LIMITS.sourcesMax) {
        throw new Error('Component sources must contain at most 16 entries.');
    }
    const parsed = sources.map(parsePackageComponentSource);
    for (const [index, source] of parsed.entries()) {
        for (const previous of parsed.slice(0, index)) {
            if (source.importPrefix.startsWith(previous.importPrefix) || previous.importPrefix.startsWith(source.importPrefix)) {
                throw new Error('Component import prefixes must not overlap.');
            }
            const currentRoot = componentSourceRoot(source) + '/';
            const previousRoot = componentSourceRoot(previous) + '/';
            if (currentRoot.startsWith(previousRoot) || previousRoot.startsWith(currentRoot)) {
                throw new Error('Component source directories must not overlap.');
            }
        }
    }
    return { version: 1, sources: parsed };
}
function parseComponentOrigin(input) {
    if (input === undefined) {
        return { kind: 'local' };
    }
    const value = (0, boundary_1.record)(input);
    if (value['kind'] === 'local') {
        return { kind: 'local' };
    }
    if (value['kind'] !== 'package') {
        throw new Error('Unknown component origin.');
    }
    const importPath = componentImportPath(value['importPath']);
    return { kind: 'package', package: packageName(value['package']), importPath };
}
function componentSourceRoot(source) {
    return `node_modules/${source.package}/${source.directory}`;
}
function componentImportPath(input) {
    const value = (0, boundary_1.text)(input);
    if (value.length > 500 || !/^(?:@\/|@?[\w-])[\w@./-]*\.astro$/.test(value)) {
        throw new Error('Expected a bounded component import specifier.');
    }
    if (value.split('/').some((segment) => segment === '..' || segment === '.')) {
        throw new Error('Component imports cannot traverse directories.');
    }
    return value;
}
function parsePackageComponentSource(input) {
    const value = (0, boundary_1.record)(input);
    if (value['kind'] !== 'package') {
        throw new Error('Component sources currently support installed packages.');
    }
    const directory = (0, boundary_1.text)(value['directory']);
    if (directory.length > 300 || !/^[\w-]+(?:\/[\w-]+)*$/.test(directory)) {
        throw new Error('Component source directory must be relative to its package.');
    }
    const importPrefix = (0, boundary_1.text)(value['importPrefix']);
    componentImportPath(importPrefix + 'Component.astro');
    if (!importPrefix.endsWith('/')) {
        throw new Error('Component import prefix must end with a slash.');
    }
    return { kind: 'package', package: packageName(value['package']), directory, importPrefix };
}
function packageName(input) {
    const value = (0, boundary_1.text)(input);
    if (value.length > 214 || !/^(?:@[a-z0-9][\w.-]*\/)?[a-z0-9][\w.-]*$/.test(value)) {
        throw new Error('Invalid component package name.');
    }
    return value;
}
