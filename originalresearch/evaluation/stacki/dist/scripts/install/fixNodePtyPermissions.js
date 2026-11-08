"use strict";
// node-pty's packaged Unix spawn helper can lose its execute bit. This script
// repairs both prebuilt and locally built helpers during install and packaging.
Object.defineProperty(exports, "__esModule", { value: true });
exports.fixNodePtyPermissions = fixNodePtyPermissions;
const fs = require("node:fs");
const path = require("node:path");
const repoRoot_1 = require("../lib/repoRoot");
const EXEC_MODE = 0o755;
function findSpawnHelpers(nodePtyDirectory) {
    const prebuilds = path.join(nodePtyDirectory, 'prebuilds');
    let entries;
    try {
        entries = fs.readdirSync(prebuilds, { withFileTypes: true });
    }
    catch {
        return [];
    }
    return entries
        .filter((entry) => entry.isDirectory())
        .map((entry) => path.join(prebuilds, entry.name, 'spawn-helper'))
        .filter((helperPath) => fs.existsSync(helperPath));
}
function findBuiltHelper(nodePtyDirectory) {
    const helperPath = path.join(nodePtyDirectory, 'build', 'Release', 'spawn-helper');
    return fs.existsSync(helperPath) ? [helperPath] : [];
}
function fixNodePtyPermissions(nodePtyDirectory) {
    const fixed = [];
    const helpers = [...findSpawnHelpers(nodePtyDirectory), ...findBuiltHelper(nodePtyDirectory)];
    for (const helperPath of helpers) {
        const mode = fs.statSync(helperPath).mode & 0o777;
        if ((mode & 0o111) === 0o111) {
            continue;
        }
        fs.chmodSync(helperPath, EXEC_MODE);
        fixed.push(helperPath);
    }
    return fixed;
}
function main() {
    if (process.platform === 'win32') {
        return;
    }
    const root = (0, repoRoot_1.repositoryRoot)();
    const nodePtyDirectory = path.join(root, 'node_modules', 'node-pty');
    if (!fs.existsSync(nodePtyDirectory)) {
        return;
    }
    try {
        for (const helperPath of fixNodePtyPermissions(nodePtyDirectory)) {
            console.log(`  • node-pty: made ${path.relative(root, helperPath)} executable`);
        }
    }
    catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        // Installation still succeeds because the terminal is an optional surface.
        console.warn(`  • node-pty: could not fix spawn-helper permissions: ${message}`);
    }
}
if (require.main === module) {
    main();
}
