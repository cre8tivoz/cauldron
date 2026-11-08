"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.writeRelease = writeRelease;
exports.validateInstallation = validateInstallation;
exports.installRelease = installRelease;
exports.installNewRelease = installNewRelease;
const promises_1 = require("node:fs/promises");
const node_path_1 = __importDefault(require("node:path"));
const node_crypto_1 = require("node:crypto");
const node_child_process_1 = require("node:child_process");
const studioRelease_1 = require("../../shared/ipc/studioRelease");
const studioLocal_1 = require("../../shared/properties/studioLocal");
async function writeRelease(directory, release) {
    for (const file of release.files) {
        const destination = node_path_1.default.join(directory, file.path);
        await (0, promises_1.mkdir)(node_path_1.default.dirname(destination), { recursive: true });
        await (0, promises_1.writeFile)(destination, file.content, { flag: 'wx' });
    }
}
async function validateInstallation(directory, project) {
    for (const args of [
        ['ci', '--ignore-scripts', '--no-audit', '--no-fund'],
        ['run', 'check'],
        ['run', 'build'],
    ]) {
        await new Promise((resolve, reject) => {
            const child = (0, node_child_process_1.spawn)(process.platform === 'win32' ? 'npm.cmd' : 'npm', args, {
                cwd: directory,
                stdio: 'inherit',
                shell: process.platform === 'win32',
                env: { ...process.env, STUDIO_PROJECT_ROOT: project },
            });
            const timer = setTimeout(() => child.kill('SIGTERM'), 180_000);
            child.once('error', (error) => {
                clearTimeout(timer);
                reject(error);
            });
            child.once('exit', (code) => {
                clearTimeout(timer);
                if (code === 0) {
                    resolve();
                }
                else {
                    reject(new Error('Studio validation failed; the existing installation was retained'));
                }
            });
        });
    }
}
// Only the Studio directory is exchanged. Website source never enters the
// transaction; runtime state is moved, not copied or reset by an update.
function installRelease(target, release, validate = validateInstallation) {
    return installReleaseWithMode(target, release, { mode: 'replace' }, validate);
}
function installNewRelease(target, release, validate = validateInstallation) {
    return installReleaseWithMode(target, release, { mode: 'install' }, validate);
}
async function installReleaseWithMode(target, release, options, validate) {
    const directory = node_path_1.default.resolve(target);
    if (node_path_1.default.basename(directory) !== 'studio') {
        throw new Error('Updates target a project’s studio directory');
    }
    const metadata = await updateStorage(node_path_1.default.dirname(directory));
    if ((await (0, promises_1.lstat)(metadata)).isSymbolicLink()) {
        throw new Error('Update storage must not be a symlink');
    }
    await (0, promises_1.writeFile)(node_path_1.default.join(metadata, '.gitignore'), '*\n');
    const lock = await (0, promises_1.open)(node_path_1.default.join(metadata, 'update.lock'), 'wx');
    const identifier = `${release.version}-${(0, node_crypto_1.randomUUID)()}`;
    const staging = node_path_1.default.join(metadata, 'staging-' + identifier);
    const backup = node_path_1.default.join(metadata, 'backup-' + identifier);
    try {
        const previous = await (0, promises_1.lstat)(directory).catch((error) => {
            if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
                return undefined;
            }
            throw error;
        });
        if (previous && options.mode === 'install') {
            throw new Error('Studio already exists; setup will not replace it');
        }
        if (previous && (!previous.isDirectory() || previous.isSymbolicLink())) {
            throw new Error('Studio must be a real directory');
        }
        await (0, promises_1.mkdir)(staging);
        await writeRelease(staging, release);
        if (!previous) {
            await (0, promises_1.cp)(node_path_1.default.join(staging, 'templates/cloudflare'), node_path_1.default.join(staging, 'cloudflare'), {
                recursive: true,
            });
        }
        await validate(staging, node_path_1.default.dirname(directory));
        if (previous) {
            await activate(directory, staging, backup);
        }
        else {
            await (0, promises_1.rename)(staging, directory);
        }
        return { version: release.version, backup: previous ? backup : undefined };
    }
    finally {
        // Failed staging directories are retained for inspection and interrupted recovery.
        // In particular, never delete state if a rollback filesystem operation fails.
        await lock.close();
        await (0, promises_1.rm)(node_path_1.default.join(metadata, 'update.lock'), { force: true });
    }
}
async function activate(directory, staging, backup) {
    const preserved = (await (0, promises_1.readdir)(directory)).filter(studioRelease_1.retainedPath);
    const moved = [];
    await (0, promises_1.rename)(directory, backup);
    try {
        for (const entry of preserved) {
            await (0, promises_1.rename)(node_path_1.default.join(backup, entry), node_path_1.default.join(staging, entry));
            moved.push(entry);
        }
        await (0, promises_1.rename)(staging, directory);
    }
    catch (error) {
        for (const entry of moved.reverse()) {
            await (0, promises_1.rename)(node_path_1.default.join(staging, entry), node_path_1.default.join(backup, entry));
        }
        await (0, promises_1.rename)(backup, directory);
        throw error;
    }
}
// The updater's staging, backups and lock, under `.stacki/studio/`, which
// ignores its own contents. An older site's `.stacki-studio` moves in whole,
// once, so earlier backups stay where recovery looks for them.
async function updateStorage(site) {
    const local = node_path_1.default.join(site, studioLocal_1.STUDIO_LOCAL_DIRECTORY);
    const metadata = node_path_1.default.join(site, studioLocal_1.STUDIO_UPDATES_DIRECTORY);
    const legacyName = studioLocal_1.STUDIO_LEGACY_DIRECTORIES[studioLocal_1.STUDIO_UPDATES_DIRECTORY];
    if (legacyName === undefined || legacyName === '') {
        throw new Error('The older update folder must be named');
    }
    const legacy = node_path_1.default.join(site, legacyName);
    await (0, promises_1.mkdir)(local, { recursive: true });
    await (0, promises_1.writeFile)(node_path_1.default.join(local, '.gitignore'), '*\n');
    const moved = await (0, promises_1.lstat)(metadata).catch(() => undefined);
    const older = await (0, promises_1.lstat)(legacy).catch(() => undefined);
    if (!moved && older?.isDirectory()) {
        await (0, promises_1.rename)(legacy, metadata);
    }
    await (0, promises_1.mkdir)(metadata, { recursive: true });
    return metadata;
}
