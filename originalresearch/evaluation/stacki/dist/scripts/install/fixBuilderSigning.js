"use strict";
// Backport electron-builder PR 10172 to the locked app-builder-lib 26.15.3.
// Certificate and keychain passwords are separate credentials; this patch
// refuses unknown upstream source so an upgrade cannot silently corrupt it.
Object.defineProperty(exports, "__esModule", { value: true });
exports.patchSigningSource = patchSigningSource;
exports.fixElectronBuilderSigning = fixElectronBuilderSigning;
const node_crypto_1 = require("node:crypto");
const fs = require("node:fs");
const node_module_1 = require("node:module");
const path = require("node:path");
const repoRoot_1 = require("../lib/repoRoot");
const BUILDER_VERSION = '26.15.3';
const ORIGINAL_HASH = '9f7d789b326147b6da29e1218d6e3f76b0314c68cf5d0f1efa59338a3c86e71a';
const PATCHED_HASH = '5b6551607c61c75cd1eadb2165b05513ff6d6b2965d129b5db9192b7e99e6fd1';
function sourceHash(source) {
    return (0, node_crypto_1.createHash)('sha256').update(source).digest('hex');
}
function patchSigningSource(source) {
    const digest = sourceHash(source);
    if (digest === PATCHED_HASH) {
        return source;
    }
    if (digest !== ORIGINAL_HASH) {
        throw new Error('Unrecognized electron-builder signing source; ' + 'review the signing backport before installing.');
    }
    const patched = source
        .replace('return await importCerts(keychainFile, certPaths, cscPasswords);', 'return await importCerts(keychainFile, certPaths, cscPasswords, keychainPassword);')
        .replace('async function importCerts(keychainFile, paths, keyPasswords) {', 'async function importCerts(keychainFile, paths, keyPasswords, keychainPassword) {')
        .replace('["set-key-partition-list", "-S", "apple-tool:,apple:", "-s", "-k", password, keychainFile]', '["set-key-partition-list", "-S", "apple-tool:,apple:", "-s", "-k", ' + 'keychainPassword, keychainFile]');
    if (sourceHash(patched) !== PATCHED_HASH) {
        throw new Error('Electron-builder signing backport failed validation.');
    }
    return patched;
}
function packageVersion(packagePath) {
    const input = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
    if (typeof input !== 'object' || input === null || !('version' in input)) {
        throw new Error(`${packagePath}: expected version field`);
    }
    if (typeof input.version !== 'string') {
        throw new Error(`${packagePath}: version must be a string`);
    }
    return input.version;
}
function isModuleNotFound(error) {
    return error instanceof Error && 'code' in error && error.code === 'MODULE_NOT_FOUND';
}
function fixElectronBuilderSigning(projectDirectory = (0, repoRoot_1.repositoryRoot)()) {
    const projectRequire = (0, node_module_1.createRequire)(path.join(projectDirectory, 'package.json'));
    let builderPackage;
    try {
        builderPackage = projectRequire.resolve('electron-builder/package.json');
    }
    catch (error) {
        if (isModuleNotFound(error)) {
            return 'not-installed';
        }
        throw error;
    }
    const libraryPackage = (0, node_module_1.createRequire)(builderPackage).resolve('app-builder-lib/package.json');
    const version = packageVersion(libraryPackage);
    if (version !== BUILDER_VERSION) {
        throw new Error(`Unsupported app-builder-lib ${version}; review the signing backport before upgrading.`);
    }
    const filePath = path.join(path.dirname(libraryPackage), 'out/codeSign/macCodeSign.js');
    const source = fs.readFileSync(filePath, 'utf8');
    const patched = patchSigningSource(source);
    if (source === patched) {
        return 'already-patched';
    }
    const temporaryPath = `${filePath}.stacki-${(0, node_crypto_1.randomUUID)()}.tmp`;
    try {
        fs.writeFileSync(temporaryPath, patched, {
            flag: 'wx',
            mode: fs.statSync(filePath).mode & 0o777,
        });
        fs.renameSync(temporaryPath, filePath);
    }
    finally {
        fs.rmSync(temporaryPath, { force: true });
    }
    return 'patched';
}
function main() {
    try {
        console.log(`  • electron-builder signing: ${fixElectronBuilderSigning()}`);
    }
    catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`  • electron-builder signing: ${message}`);
        process.exitCode = 1;
    }
}
if (require.main === module) {
    main();
}
