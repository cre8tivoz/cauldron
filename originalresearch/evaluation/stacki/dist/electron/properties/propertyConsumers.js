"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.readPropertyConsumers = readPropertyConsumers;
exports.readBoundedSource = readBoundedSource;
exports.filesystemError = filesystemError;
// Resolve identity before editing: a tag name alone cannot identify a component.
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
const typescript_1 = __importDefault(require("typescript"));
const assert_1 = require("../../shared/core/assert");
const propertyEditing_1 = require("../../shared/properties/propertyEditing");
const result_1 = require("../../shared/core/result");
const cmsRefs_1 = require("../content/cmsRefs");
const componentUsage_1 = require("./componentUsage");
const platform_1 = require("../lib/platform");
const propertySyntax_1 = require("./propertySyntax");
function readPropertyConsumers(location) {
    const files = projectSources(location.projectPath);
    if (!files.ok) {
        return files;
    }
    const aliases = (0, cmsRefs_1.aliasMap)(location.projectPath);
    const consumers = [];
    let total = 0;
    for (const file of files.value) {
        const read = readBoundedSource(file);
        if (!read.ok) {
            return read;
        }
        total += read.value.length;
        if (total > propertyEditing_1.PROPERTY_LIMITS.totalCharsMax) {
            return (0, result_1.err)({ code: 'limit', message: 'Project exceeds the prop rename source limit.' });
        }
        const names = readConsumerNames(read.value, file, location.file, aliases);
        if (!names.ok) {
            return names;
        }
        if (names.value.size > 0 || (0, platform_1.sameFilesystemPath)(file, location.file)) {
            consumers.push({ file, source: read.value, names: names.value });
        }
    }
    (0, assert_1.assert)(consumers.length <= propertyEditing_1.PROPERTY_LIMITS.filesMax, 'Consumer collection is bounded');
    (0, assert_1.assert)(consumers.some((consumer) => (0, platform_1.sameFilesystemPath)(consumer.file, location.file)), 'The component is included among project sources');
    return (0, result_1.ok)(consumers);
}
function readBoundedSource(file) {
    try {
        if (node_fs_1.default.statSync(file).size > propertyEditing_1.PROPERTY_LIMITS.sourceCharsMax) {
            return (0, result_1.err)({ code: 'limit', message: `${file} exceeds the component source limit.` });
        }
        return (0, result_1.ok)(node_fs_1.default.readFileSync(file, 'utf8'));
    }
    catch (error) {
        return filesystemError(error);
    }
}
function filesystemError(error) {
    return (0, result_1.err)({
        code: 'filesystem',
        message: error instanceof Error ? error.message : String(error),
    });
}
function readConsumerNames(source, file, target, aliases) {
    const names = new Set((0, componentUsage_1.importsOf)(source, file, aliases)
        .filter((entry) => [...entry.candidates].some((candidate) => (0, platform_1.sameFilesystemPath)(candidate, target)))
        .flatMap((entry) => entry.names));
    const syntax = file.endsWith('.astro')
        ? (0, propertySyntax_1.readPropertySyntax)(source).syntax
        : typescript_1.default.createSourceFile(file, source, typescript_1.default.ScriptTarget.Latest, true, typescript_1.default.ScriptKind.TSX);
    const resolves = (specifier) => (0, cmsRefs_1.resolveSpec)(specifier, file, aliases).some((candidate) => (0, platform_1.sameFilesystemPath)(candidate, target));
    for (const statement of syntax.statements) {
        if (typescript_1.default.isExportDeclaration(statement) &&
            statement.moduleSpecifier &&
            typescript_1.default.isStringLiteral(statement.moduleSpecifier) &&
            resolves(statement.moduleSpecifier.text)) {
            return unsupportedConsumer(file, 're-exports this component');
        }
        if (typescript_1.default.isImportDeclaration(statement)) {
            continue;
        }
        if ((0, propertySyntax_1.syntaxNodes)(statement).some((node) => typescript_1.default.isIdentifier(node) && names.has(node.text))) {
            // Runtime aliases and ComponentProps type queries need a semantic project refactor.
            // Refuse them rather than silently leave a second API spelling behind.
            if (!file.endsWith('.mdx')) {
                return unsupportedConsumer(file, 'uses this component in frontmatter or JavaScript');
            }
        }
    }
    for (const match of source.matchAll(/\bimport\s*\(\s*['"]([^'"]+)['"]/g)) {
        if (match[1] && resolves(match[1])) {
            return unsupportedConsumer(file, 'imports it dynamically');
        }
    }
    const layout = /^layout:\s*["']?([^\s"']+)/m.exec(source)?.[1];
    if (/\.mdx?$/.test(file) && layout && resolves(layout)) {
        return unsupportedConsumer(file, 'passes layout props through Markdown frontmatter');
    }
    if (names.size > 0 && !/\.(astro|mdx)$/.test(file)) {
        return unsupportedConsumer(file, 'uses this component outside Astro or MDX');
    }
    return (0, result_1.ok)(names);
}
function unsupportedConsumer(file, reason) {
    return (0, result_1.err)({
        code: 'consumer',
        message: `${file} ${reason}. Update that consumer explicitly before changing the prop name.`,
    });
}
function projectSources(projectPath) {
    const pending = [node_path_1.default.join(projectPath, 'src')];
    const files = [];
    for (let index = 0; index < pending.length; index += 1) {
        const directory = pending[index];
        (0, assert_1.assert)(directory !== undefined, 'Queued directory exists');
        const entries = readDirectory(directory);
        if (!entries.ok) {
            return entries;
        }
        for (const entry of entries.value) {
            if (entry.isSymbolicLink()) {
                return (0, result_1.err)({
                    code: 'symlink',
                    message: 'Project sources contain a symbolic link. Resolve it before a project-wide rename.',
                });
            }
            const full = node_path_1.default.join(directory, entry.name);
            if (entry.isDirectory()) {
                pending.push(full);
            }
            else if (/\.(astro|mdx?|jsx?|tsx?|svelte|vue)$/.test(entry.name)) {
                files.push(full);
            }
            if (pending.length + files.length > propertyEditing_1.PROPERTY_LIMITS.filesMax) {
                return (0, result_1.err)({ code: 'limit', message: 'Project exceeds the prop rename file limit.' });
            }
        }
    }
    return (0, result_1.ok)(files);
}
function readDirectory(directory) {
    try {
        return (0, result_1.ok)(node_fs_1.default.readdirSync(directory, { withFileTypes: true }));
    }
    catch (error) {
        return filesystemError(error);
    }
}
