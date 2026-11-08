"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.projectHasWrangler = projectHasWrangler;
exports.resolvePublishExecutable = resolvePublishExecutable;
const node_module_1 = require("node:module");
const node_fs_1 = require("node:fs");
const node_path_1 = __importDefault(require("node:path"));
const boundary_1 = require("../../shared/core/boundary");
function projectHasWrangler(root) {
    const resolver = (0, node_module_1.createRequire)(node_path_1.default.join(root, 'package.json'));
    try {
        // Resolution from the site also supports dependencies hoisted by a workspace package manager.
        // Node caches resolved paths for the life of the process, so a Wrangler removed since the
        // last lookup still resolves; only a manifest that exists now counts.
        return (0, node_fs_1.existsSync)(resolver.resolve('wrangler/package.json'));
    }
    catch (error) {
        if (error instanceof Error && 'code' in error && error.code === 'MODULE_NOT_FOUND') {
            return false;
        }
        throw error;
    }
}
function resolvePublishExecutable(root, command) {
    const local = node_path_1.default.join(root, 'node_modules', '.bin', command.executable);
    if (process.platform !== 'win32' && (0, node_fs_1.existsSync)(local)) {
        return { executable: local, arguments: command.arguments };
    }
    const installed = installedPublishTool(root, command.executable);
    if (installed) {
        return {
            executable: process.platform === 'win32' ? 'node.exe' : 'node',
            arguments: [installed, ...command.arguments],
        };
    }
    if (process.platform !== 'win32') {
        return {
            executable: (0, node_fs_1.existsSync)(local) ? local : command.executable,
            arguments: command.arguments,
        };
    }
    // Running the JS entry avoids cmd.exe interpolation of paths, arguments, and credentials.
    const directories = (process.env['PATH'] ?? process.env['Path'] ?? '').split(node_path_1.default.delimiter);
    if (directories.length > 256) {
        throw new Error('Tool search path exceeds 256 directories.');
    }
    const candidates = [
        node_path_1.default.join(root, 'node_modules', command.executable),
        ...directories.map((directory) => node_path_1.default.join(directory, 'node_modules', command.executable)),
    ];
    for (const directory of candidates) {
        const manifest = node_path_1.default.join(directory, 'package.json');
        if ((0, node_fs_1.existsSync)(manifest)) {
            return { executable: 'node.exe', arguments: [publishEntry(directory), ...command.arguments] };
        }
    }
    throw new Error(`Install ${command.executable} in this project's development dependencies.`);
}
function publishEntry(directory) {
    const source = (0, node_fs_1.readFileSync)(node_path_1.default.join(directory, 'package.json'), 'utf8');
    if (source.length > 65_536) {
        throw new Error('CLI package metadata exceeds 64 KiB.');
    }
    const input = JSON.parse(source);
    const metadata = (0, boundary_1.record)(input);
    const bin = metadata['bin'];
    const relative = (0, boundary_1.text)(typeof bin === 'string' ? bin : (0, boundary_1.record)(bin)[node_path_1.default.basename(directory)]);
    const canonical = (0, node_fs_1.realpathSync)(directory);
    const entry = (0, node_fs_1.realpathSync)(node_path_1.default.join(directory, relative));
    const within = node_path_1.default.relative(canonical, entry);
    if (node_path_1.default.isAbsolute(within) || within.startsWith('..')) {
        throw new Error('CLI entry must stay inside its installed package.');
    }
    return entry;
}
function installedPublishTool(root, executable) {
    if (executable !== 'wrangler' && executable !== 'vercel') {
        return undefined;
    }
    // Desktop and Studio can share an installed CLI without downloading code during discovery.
    const resolver = (0, node_module_1.createRequire)(node_path_1.default.join(process.cwd(), 'package.json'));
    const directories = [root, process.cwd(), node_path_1.default.join(process.cwd(), 'studio'), node_path_1.default.dirname(process.argv[1] ?? process.cwd())];
    for (const directory of directories) {
        let manifest;
        try {
            manifest = resolver.resolve(`${executable}/package.json`, { paths: [directory] });
        }
        catch {
            continue;
        }
        // A cached resolution can outlive a removed package; look further instead.
        if (!(0, node_fs_1.existsSync)(manifest)) {
            continue;
        }
        return publishEntry(node_path_1.default.dirname(manifest));
    }
    return undefined;
}
