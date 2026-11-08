"use strict";
// The project IPC: opening and creating projects (from a dialog, the Astro
// template or a starter), and installing their dependencies.
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
exports.PROGRESS_CLEARED = void 0;
exports.registerProjectHandlers = registerProjectHandlers;
exports.installDependencies = installDependencies;
const git_1 = require("../git/git");
const record_1 = require("../../shared/core/record");
const assert_1 = require("../../shared/core/assert");
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const os = __importStar(require("os"));
const starter_1 = require("../project/starter");
const mainHelpers_1 = require("../lib/mainHelpers");
const nodeTools_1 = require("../lib/nodeTools");
const projectFiles_1 = require("../project/projectFiles");
const packageManager_1 = require("../project/packageManager");
const packageManager_2 = require("../../shared/properties/packageManager");
function registerProjectHandlers(host) {
    registerProjectOpenDialogHandlers(host);
    registerProjectCreateAstroHandlers(host);
    registerProjectCreateStarterHandlers(host);
}
function registerProjectOpenDialogHandlers({ ipcMain, showOpenDialog }) {
    ipcMain.handle('project:openDialog', async () => {
        const result = await showOpenDialog({
            title: 'Open an Astro project',
            properties: ['openDirectory'],
        });
        if (result.canceled || !result.filePaths.length) {
            return { canceled: true };
        }
        const directory = result.filePaths[0];
        (0, assert_1.assert)(directory !== undefined, 'Accepted directory dialog must have a path');
        if (!(0, projectFiles_1.isAstroProject)(directory)) {
            return {
                canceled: false,
                error: 'That folder does not look like an Astro project ' + '(no astro dependency or astro.config found).',
            };
        }
        return { canceled: false, projectPath: directory };
    });
}
function registerProjectCreateAstroHandlers({ ipcMain, send, showOpenDialog }) {
    // Runs the real `npm create astro@latest`, answering the questions the CLI
    // would ask interactively with the choices collected in the app's wizard.
    // Output is streamed to the renderer so the user sees the same progress the
    // terminal would show. The wizard names the site, so its folder is made here,
    // empty, and create-astro runs in it with "." as the target rather than
    // guessing a name.
    ipcMain.handle('project:createAstro', async (_event, options) => {
        const { parentPath, name, template = 'basics', install = true, git = true, ai = false, packageManager = 'npm' } = options || {};
        const directory = (0, starter_1.newSiteDirectory)(parentPath, name);
        (0, nodeTools_1.ensureToolPath)(); // npm is a Node shim — same PATH problem as astro
        if (install) {
            await requirePackageManager(packageManager);
        }
        fs.mkdirSync(directory);
        const args = [
            'create',
            'astro@latest',
            '.',
            '--',
            '--template',
            template,
            '--no-install', // Stacki installs, then makes the first commit (finishNewSite).
            '--no-git',
            ...(ai ? [] : ['--no-ai']),
            '--skip-houston',
            '--yes', // accept defaults for anything not covered above
        ];
        send('create:log', `> npm ${args.join(' ')}\n\n`);
        await runCreateAstroInNewFolder({ send }, directory, args);
        await finishNewSite({ send }, directory, {
            install,
            manager: packageManager,
            history: git,
            label: 'Astro',
        });
        return { ok: true, installed: install, projectPath: directory };
    });
    // A folder to put a new project IN, rather than the project's own folder: the
    // starter arrives as a directory of its own, named by the user.
    ipcMain.handle('project:parentDialog', async () => {
        const result = await showOpenDialog({
            title: 'Choose where the site should go',
            properties: ['openDirectory', 'createDirectory'],
        });
        if (result.canceled || !result.filePaths.length) {
            return { canceled: true };
        }
        return { canceled: false, parentPath: result.filePaths[0] };
    });
}
function registerProjectCreateStarterHandlers({ ipcMain, send }) {
    // Starting from a starter. The scaffolder, the first commit and the package's
    // name are in ./starter.js; what is here is the install that follows and the
    // log the wizard reads.
    ipcMain.handle('project:createStarter', async (_event, { starter = 'lumos', parentPath, name, packageManager = 'npm' }) => {
        (0, nodeTools_1.ensureToolPath)(); // npm and git are both on the PATH the Dock does not have
        await requirePackageManager(packageManager);
        const result = await (0, starter_1.createStarter)({
            starter,
            parentPath,
            name,
            onLog: (text) => send('create:log', text),
        });
        const label = starter_1.STARTERS[starter]?.label ?? starter;
        await finishNewSite({ send }, result.projectPath, {
            install: true,
            manager: packageManager,
            history: true,
            label,
        });
        return result;
    });
}
async function installDependencies({ send }, directory, pm = (0, packageManager_1.detectPackageManager)(directory)) {
    (0, nodeTools_1.ensureToolPath)(); // npm/pnpm/yarn are Node shims — same PATH problem as astro
    send('progress', { message: `Installing dependencies (${pm} install)…` });
    try {
        await (0, nodeTools_1.run)(mainHelpers_1.isWin ? `${pm}.cmd` : pm, [...(0, packageManager_1.installArguments)(pm)], directory, {
            timeout: 10 * 60 * 1000,
            shell: mainHelpers_1.isWin,
        });
    }
    catch (error) {
        if ((0, record_1.toRecord)(error)?.['code'] === 'ENOENT') {
            throw new Error(`This project uses ${pm}, but ${pm} is not installed. Install it and try again.`);
        }
        throw new Error(`${pm} install failed: ${(0, git_1.gitErrorDetail)(error).slice(-400)}`);
    }
}
// A new site is only started when its manager can install it, so a missing one fails before
// any folder exists. On Windows a missing command fails without ENOENT, so any failure counts.
async function requirePackageManager(manager) {
    try {
        await (0, nodeTools_1.run)(mainHelpers_1.isWin ? `${manager}.cmd` : manager, ['--version'], os.homedir());
    }
    catch {
        throw new Error(`${(0, packageManager_2.packageManagerLabel)(manager)} is not installed. Install it or choose npm.`);
    }
}
// The install comes first, so the site's first commit includes the lockfile. The site gets
// its history even when the install fails; the install error still reaches the wizard.
async function finishNewSite({ send }, directory, options) {
    const onLog = (text) => send('create:log', text);
    try {
        if (options.install) {
            // A starter's npm lockfile would sit beside the chosen manager's own and misname it.
            if (options.manager !== 'npm') {
                fs.rmSync(path.join(directory, 'package-lock.json'), { force: true });
            }
            onLog(`\n> installing dependencies with ${(0, packageManager_2.packageManagerLabel)(options.manager)}\n`);
            await installDependencies({ send }, directory, options.manager);
        }
    }
    finally {
        if (options.history) {
            await (0, starter_1.startSiteHistory)(directory, options.label, onLog);
        }
    }
    send('progress', exports.PROGRESS_CLEARED);
}
// Clears the progress line: no message (src/ipc/appBridge.ts, onAppProgress). IPC is
// a structured clone, which keeps the absent value.
exports.PROGRESS_CLEARED = { message: undefined };
// A run that wrote nothing leaves no folder behind, so Try again can reuse the
// name. Anything it did write stays for the user to inspect; nothing is deleted
// recursively.
async function runCreateAstroInNewFolder({ send }, directory, args) {
    try {
        await runCreateAstro({ send }, directory, args);
    }
    catch (error) {
        if (fs.readdirSync(directory).length === 0) {
            fs.rmdirSync(directory);
        }
        throw error;
    }
}
// The create-astro run itself, its output streamed to the wizard's log. It
// settles once the CLI exits and a package.json has landed in `directory`.
async function runCreateAstro({ send }, directory, args) {
    const npm = mainHelpers_1.isWin ? 'npm.cmd' : 'npm';
    await (0, starter_1.runCreateCommand)(npm, args, directory, (text) => send('create:log', text));
    if (!fs.existsSync(path.join(directory, 'package.json'))) {
        throw new Error('create-astro finished but no package.json appeared.');
    }
}
