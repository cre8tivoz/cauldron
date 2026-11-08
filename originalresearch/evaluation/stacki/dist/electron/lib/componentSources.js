"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.readComponentSources = readComponentSources;
exports.packageComponentFiles = packageComponentFiles;
exports.readPackageSource = readPackageSource;
exports.readPackagePreviews = readPackagePreviews;
exports.packageSourcePath = packageSourcePath;
exports.packageComponentImport = packageComponentImport;
// Only explicitly configured packages may contribute read-only component source.
// Canonical containment permits pnpm/workspace package links without following links
// within a package or widening the editor's write boundary.
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
const assert_1 = require("../../shared/core/assert");
const componentSources_1 = require("../../shared/properties/componentSources");
function readComponentSources(root) {
    const file = node_path_1.default.join(root, componentSources_1.COMPONENT_SOURCE_FILE);
    if (!node_fs_1.default.existsSync(file)) {
        return [];
    }
    if (node_fs_1.default.lstatSync(file).isSymbolicLink() || node_fs_1.default.lstatSync(node_path_1.default.dirname(file)).isSymbolicLink()) {
        throw new Error('Component source settings cannot be symbolic links.');
    }
    const input = JSON.parse(readBounded(file, componentSources_1.COMPONENT_SOURCE_LIMITS.configBytesMax));
    return (0, componentSources_1.parseComponentSources)(input).sources;
}
function packageComponentFiles(root) {
    const files = [];
    let sizeBytes = 0;
    const queue = readComponentSources(root).map(componentSources_1.componentSourceRoot);
    for (let index = 0; index < queue.length; index++) {
        if (queue.length > componentSources_1.COMPONENT_SOURCE_LIMITS.directoriesMax) {
            throw new Error('Package component directory limit exceeded.');
        }
        const directory = queue[index];
        (0, assert_1.assert)(directory !== undefined, 'Package scan queue entry exists');
        const absolute = packageSourcePath(root, directory);
        const entries = node_fs_1.default.readdirSync(absolute, { withFileTypes: true });
        if (entries.length > componentSources_1.COMPONENT_SOURCE_LIMITS.filesMax) {
            throw new Error('Package component directory is too large.');
        }
        for (const entry of entries) {
            if (entry.name.startsWith('.') || entry.name === 'node_modules') {
                continue;
            }
            if (entry.isSymbolicLink()) {
                throw new Error('Links within component packages are not supported.');
            }
            const file = directory + '/' + entry.name;
            if (entry.isDirectory()) {
                queue.push(file);
            }
            else if (entry.isFile() && file.endsWith('.astro')) {
                sizeBytes += node_fs_1.default.statSync(node_path_1.default.join(absolute, entry.name)).size;
                if (sizeBytes > componentSources_1.COMPONENT_SOURCE_LIMITS.sourceBytesTotalMax) {
                    throw new Error('Package component sources exceed the 16 MiB scan limit.');
                }
                files.push(file);
            }
            if (files.length > componentSources_1.COMPONENT_SOURCE_LIMITS.filesMax) {
                throw new Error('Package component file limit exceeded.');
            }
        }
    }
    (0, assert_1.assert)(files.length <= componentSources_1.COMPONENT_SOURCE_LIMITS.filesMax, 'Package scan is bounded');
    return files.sort();
}
function readPackageSource(root, file) {
    return readBounded(packageSourcePath(root, file), componentSources_1.COMPONENT_SOURCE_LIMITS.sourceBytesMax);
}
function readPackagePreviews(root) {
    return packageComponentFiles(root).map((file) => {
        const importPath = packageComponentImport(root, file);
        (0, assert_1.assert)(importPath !== undefined, 'Scanned package component has an import');
        return { file, importPath, source: readPackageSource(root, file) };
    });
}
function packageSourcePath(root, file) {
    const source = readComponentSources(root).find((entry) => file.startsWith(`node_modules/${entry.package}/`));
    if (!source || file.split('/').some((segment) => segment === '..' || segment === '.')) {
        throw new Error('Source is outside configured component packages.');
    }
    const packageRoot = node_fs_1.default.realpathSync(node_path_1.default.join(root, 'node_modules', source.package));
    const relative = file.slice(`node_modules/${source.package}/`.length);
    let current = packageRoot;
    for (const segment of relative.split('/')) {
        current = node_path_1.default.join(current, segment);
        if (node_fs_1.default.lstatSync(current).isSymbolicLink()) {
            throw new Error('Links within component packages are not supported.');
        }
    }
    const actual = node_fs_1.default.realpathSync(current);
    (0, assert_1.assert)(actual.startsWith(packageRoot + node_path_1.default.sep), 'Package source stays inside its package');
    (0, assert_1.assert)(relative.length <= 500, 'Package source path is bounded');
    return actual;
}
function packageComponentImport(root, file) {
    const relative = node_path_1.default.isAbsolute(file) ? node_path_1.default.relative(root, file).split(node_path_1.default.sep).join('/') : file;
    const source = readComponentSources(root).find((entry) => relative.startsWith((0, componentSources_1.componentSourceRoot)(entry) + '/'));
    if (!source) {
        return undefined;
    }
    packageSourcePath(root, relative);
    return source.importPrefix + relative.slice((0, componentSources_1.componentSourceRoot)(source).length + 1);
}
function readBounded(file, maximum) {
    if (node_fs_1.default.statSync(file).size > maximum) {
        throw new Error('Component source exceeds its byte limit.');
    }
    const bytes = node_fs_1.default.readFileSync(file);
    if (bytes.length > maximum) {
        throw new Error('Component source exceeds its byte limit.');
    }
    return new TextDecoder('utf-8', { fatal: true, ignoreBOM: false }).decode(bytes);
}
