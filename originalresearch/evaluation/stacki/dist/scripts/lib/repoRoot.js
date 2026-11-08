"use strict";
// The repository root, found the same way wherever a script runs: from its
// source under scripts/, or compiled into dist/scripts/, at any folder depth.
// Scripts used to count folders up from __dirname, which is right only until
// a script moves; this walks up to the package.json that names the project.
Object.defineProperty(exports, "__esModule", { value: true });
exports.repositoryRoot = repositoryRoot;
const fs = require("node:fs");
const path = require("node:path");
const PACKAGE_NAME = 'stacki';
// Folders between a script and the root: dist/scripts/<area>/ is three.
const ROOT_SEARCH_DEPTH_MAX = 8;
function repositoryRoot(start = __dirname) {
    let directory = path.resolve(start);
    for (let depth = 0; depth <= ROOT_SEARCH_DEPTH_MAX; depth += 1) {
        if (namesThisPackage(path.join(directory, 'package.json'))) {
            return directory;
        }
        const parent = path.dirname(directory);
        if (parent === directory) {
            break;
        }
        directory = parent;
    }
    throw new Error(`repositoryRoot: no ${PACKAGE_NAME} package.json above ${start}`);
}
function namesThisPackage(file) {
    if (!fs.existsSync(file)) {
        return false;
    }
    const manifest = JSON.parse(fs.readFileSync(file, 'utf8'));
    if (typeof manifest !== 'object' || manifest === null) {
        return false;
    }
    return Reflect.get(manifest, 'name') === PACKAGE_NAME;
}
