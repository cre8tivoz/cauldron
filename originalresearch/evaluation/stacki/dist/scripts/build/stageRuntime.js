"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// Keep the runtime self-contained: content workers and icons are authored assets,
// copied beside compiled code so development and packaged paths stay identical.
const fileSystemPromises = require("node:fs/promises");
const path = require("node:path");
const repoRoot_1 = require("../lib/repoRoot");
const linuxInstaller_1 = require("../release/linuxInstaller");
const root = (0, repoRoot_1.repositoryRoot)();
// An explicit inventory bounds the copy and excludes signing material.
const files = [
    'electron/content/workers/introspect.mjs',
    'electron/content/workers/schemaTools.mjs',
    'electron/content/workers/stubAstroContent.mjs',
    'electron/content/workers/stubAstroLoaders.mjs',
    'resources/icon-dock.png',
    'resources/icon.icns',
    'resources/icon.ico',
    'resources/icon.png',
];
async function main() {
    for (const file of files) {
        const target = path.resolve(root, 'dist', file);
        await fileSystemPromises.mkdir(path.dirname(target), { recursive: true });
        await fileSystemPromises.copyFile(path.resolve(root, file), target);
    }
    (0, linuxInstaller_1.writeLinuxInstaller)(root);
}
void main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
