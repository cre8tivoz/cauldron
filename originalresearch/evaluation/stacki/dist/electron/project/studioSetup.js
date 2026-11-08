"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.automaticStudio = automaticStudio;
exports.studioStatus = studioStatus;
exports.readStudioRelease = readStudioRelease;
exports.installStudio = installStudio;
exports.publishedStudio = publishedStudio;
// Reuse Studio's release parser and transactional installer for published
// releases, the development checkout's bundle, and explicitly chosen local files.
const path = __importStar(require("node:path"));
const promises_1 = require("node:fs/promises");
const studioCatalog_1 = require("./studioCatalog");
const studioRelease_1 = require("../../shared/ipc/studioRelease");
const studioInstall_1 = require("./studioInstall");
const boundary_1 = require("../../shared/core/boundary");
const nodeTools_1 = require("../lib/nodeTools");
const mainHelpers_1 = require("../lib/mainHelpers");
const studioCommand_1 = require("./studioCommand");
async function automaticStudio(input, environment) {
    const version = (0, studioRelease_1.releaseVersion)(input);
    if (environment.kind === 'packaged') {
        return publishedStudio(version);
    }
    // Development versions may not be published. Only the app's own generated
    // bundle is eligible; the open website must never supply executable installer code.
    const file = path.join(environment.appPath, 'studio/release', `stacki-studio-${version}.json`);
    const info = await (0, promises_1.lstat)(file).catch((error) => {
        if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
            return undefined;
        }
        throw error;
    });
    if (!info) {
        throw new Error('Build the development Studio bundle with npm run studio:release, then retry.');
    }
    const release = await readStudioRelease(file);
    if (release.version !== version) {
        throw new Error('Development Studio version does not match Stacki. Run npm run studio:release.');
    }
    return release;
}
async function studioStatus(project, desktopVersion) {
    const directory = path.join(project, 'studio');
    const existing = await (0, promises_1.lstat)(directory).catch((error) => {
        if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
            return undefined;
        }
        throw error;
    });
    if (!existing) {
        return { kind: 'missing', desktopVersion };
    }
    if (existing.isDirectory() && !existing.isSymbolicLink()) {
        try {
            const file = path.join(directory, 'src/shared/release.json');
            if ((await (0, promises_1.lstat)(file)).size > 4096) {
                throw new Error('Release metadata exceeds limit');
            }
            const metadata = JSON.parse(await (0, promises_1.readFile)(file, 'utf8'));
            return {
                kind: 'installed',
                desktopVersion,
                version: (0, studioRelease_1.releaseVersion)((0, boundary_1.record)(metadata)['version']),
            };
        }
        catch {
            // An unrelated studio directory must never be treated as replaceable.
        }
    }
    return {
        kind: 'blocked',
        desktopVersion,
        message: 'A studio folder already exists. Setup will not overwrite it. Ask your agent to inspect it.',
    };
}
async function readStudioRelease(file) {
    const info = await (0, promises_1.lstat)(file);
    if (!info.isFile() || info.size > studioRelease_1.RELEASE_BYTES_MAX) {
        throw new Error('Choose a Studio release JSON file smaller than 32 MB.');
    }
    const value = JSON.parse(await (0, promises_1.readFile)(file, 'utf8'));
    return (0, studioRelease_1.parseRelease)(value);
}
async function installStudio(project, release, onProgress = () => { }) {
    onProgress({ kind: 'stage', stage: 'files' });
    await (0, studioInstall_1.installNewRelease)(path.join(project, 'studio'), release, async (directory, projectRoot) => {
        await validateStudio(directory, projectRoot, onProgress);
        onProgress({ kind: 'stage', stage: 'activate' });
    });
    onProgress({ kind: 'stage', stage: 'complete' });
    return release.version;
}
async function publishedStudio(version) {
    try {
        return await (0, studioCatalog_1.downloadRelease)(version);
    }
    catch {
        throw new Error('Could not download Studio ' +
            version +
            '. Check your connection and try again. ' +
            'If the Studio bundle is not published yet, use the agent setup prompt in Go live.');
    }
}
async function validateStudio(directory, project, onProgress) {
    const node = (0, nodeTools_1.resolveNodeBin)();
    if (!node) {
        throw new Error('Install Node.js 22.19 or newer, then reopen Stacki and retry.');
    }
    const result = await (0, nodeTools_1.run)(node, ['--version'], directory);
    const match = /^v(\d+)\.(\d+)\./.exec(result.stdout.trim());
    const major = Number(match?.[1]);
    const minor = Number(match?.[2]);
    if (!(major > 22 || (major === 22 && minor >= 19))) {
        throw new Error('Studio needs Node.js 22.19 or newer. Update Node.js and retry.');
    }
    for (const command of [
        { stage: 'dependencies', args: ['ci', '--ignore-scripts', '--no-audit', '--no-fund'] },
        { stage: 'check', args: ['run', 'check'] },
        { stage: 'build', args: ['run', 'build'] },
    ]) {
        onProgress({ kind: 'stage', stage: command.stage });
        onProgress({ kind: 'output', text: `\n$ npm ${command.args.join(' ')}\n` });
        const outcome = await (0, studioCommand_1.runStudioCommand)({
            command: mainHelpers_1.isWin ? 'npm.cmd' : 'npm',
            argumentsList: command.args,
            directory,
            project,
            timeoutMs: 180_000,
        }, (text) => onProgress({ kind: 'output', text }));
        if (!outcome.ok) {
            onProgress({ kind: 'output', text: `\n${outcome.error}\n` });
            throw new Error('Studio could not finish npm ' + command.args.join(' ') + '. ' + 'See the output above. Your project was not replaced.');
        }
    }
}
