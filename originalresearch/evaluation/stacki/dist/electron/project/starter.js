"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.STARTERS = exports.runCreateCommand = void 0;
exports.createStarter = createStarter;
exports.newSiteDirectory = newSiteDirectory;
exports.startSiteHistory = startSiteHistory;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const child_process_1 = require("child_process");
const record_1 = require("../../shared/core/record");
const platform_1 = require("../lib/platform");
const nodeTools_1 = require("../lib/nodeTools");
// Starting a site from a starter.
//
// The framework publishes its own scaffolder, so the app runs that rather than
// copying files itself: `npm create lumos@latest my-site`. It is the command
// the framework's own documentation gives, which means a site started here is
// the same site as one started in a terminal — and when the starter changes
// what a new site needs, the change arrives without this app being rebuilt.
//
// What it leaves behind is files: no history, and no remote pointing at a
// repository the user cannot push to. So the first commit is made here, of the
// starter as it stands, which is what they are actually starting from.
const isWin = process.platform === 'win32';
const STARTERS = {
    lumos: {
        label: 'Lumos',
        // Pinned to `@latest` rather than a version: the scaffolder is downloaded
        // per run, and a site started today should be started from today's.
        create: 'lumos@latest',
    },
};
exports.STARTERS = STARTERS;
// A folder name has to be a folder name; the site can be renamed later, but not
// out of a directory that already exists.
const NAME_RE = /^[A-Za-z0-9._-]+$/;
// A scaffolder only downloads a template, so a run this long has stalled, and the wizard
// cannot be closed while it waits.
const RUN_TIMEOUT_MS = 5 * 60 * 1000;
const run = (cmd, args, cwd, onLog) => new Promise((resolve, reject) => {
    let proc;
    try {
        proc = (0, child_process_1.spawn)(cmd, [...args], {
            cwd,
            // On Windows npm is a .cmd shim, which needs a shell to be found.
            shell: (0, platform_1.commandNeedsShell)(cmd),
            // Its own process group, so a stalled run is stopped with what it started.
            detached: !isWin,
            env: {
                ...process.env,
                GIT_TERMINAL_PROMPT: '0',
                FORCE_COLOR: '0',
                NO_COLOR: '1',
                CI: '1', // npm asks before downloading a scaffolder; nobody is here to answer
            },
        });
    }
    catch (error) {
        reject(new Error(`Could not run ${cmd}: ${error instanceof Error ? error.message : String(error)}`));
        return;
    }
    const child = proc;
    const timer = setTimeout(() => {
        (0, nodeTools_1.stopProcessTree)(child);
        reject(new Error(`${path_1.default.basename(cmd)} ${args[0] ?? ''} took over 5 minutes and was stopped.`));
    }, RUN_TIMEOUT_MS);
    let tail = '';
    const onOut = (chunk) => {
        // Progress spinners are drawn with cursor moves and line clears; strip
        // them so the log pane reads as the plain text it renders.
        const text = chunk
            .toString()
            .replace(/\x1b\[[0-9;?]*[A-Za-z]/g, '')
            .replace(/\r/g, '\n');
        tail = (tail + text).slice(-4000);
        onLog?.(text);
    };
    proc.stdout.on('data', onOut);
    proc.stderr.on('data', onOut);
    proc.on('error', (error) => {
        clearTimeout(timer);
        const code = (0, record_1.toRecord)(error)?.['code'];
        reject(new Error(code === 'ENOENT'
            ? path_1.default.basename(cmd).startsWith('npm')
                ? 'npm could not be found. Install Node.js (which includes npm) and try again.'
                : `${cmd} could not be found. Install it and try again.`
            : `Could not run ${cmd}: ${error.message}`));
    });
    proc.on('exit', (code) => {
        clearTimeout(timer);
        if (code === 0) {
            resolve(tail);
        }
        else {
            reject(new Error(`${cmd} ${args[0] ?? ''} exited with code ${code}.\n\n${tail}`));
        }
    });
});
exports.runCreateCommand = run;
/**
 * Runs a starter's scaffolder in `parentPath` to make `parentPath/name`.
 * Installing what it needs and its first commit (`startSiteHistory`) are the
 * caller's — this is the part that has to be right before anything is
 * installed into it.
 */
async function createStarter({ starter = 'lumos', parentPath, name, npm, onLog } = {}) {
    const template = STARTERS[starter];
    if (!template) {
        throw new Error(`${starter} is not a starter this app knows.`);
    }
    const directory = newSiteDirectory(parentPath, name);
    const folder = path_1.default.basename(directory);
    // `--no-install`: the app installs afterwards, where a failure is an error
    // the wizard can show rather than a line in a log that scrolled past.
    const args = ['create', template.create, folder, '--yes', '--', '--no-install'];
    onLog?.(`> npm create ${template.create} ${folder}\n\n`);
    await run(npm || (isWin ? 'npm.cmd' : 'npm'), args, path_1.default.dirname(directory), onLog);
    if (!fs_1.default.existsSync(path_1.default.join(directory, 'package.json'))) {
        throw new Error('The starter finished but there is no package.json in it.');
    }
    // The package is the site, so it takes the site's name. The scaffolder does
    // this too; doing it here is what makes it a promise this app keeps rather
    // than one it hopes for.
    try {
        const file = path_1.default.join(directory, 'package.json');
        const raw = JSON.parse(fs_1.default.readFileSync(file, 'utf8'));
        const pkg = (0, record_1.toRecord)(raw);
        if (pkg) {
            pkg['name'] = folder.toLowerCase().replace(/[^a-z0-9._-]+/g, '-');
            fs_1.default.writeFileSync(file, `${JSON.stringify(pkg, null, 2)}\n`, 'utf8');
        }
    }
    catch {
        /* an unusual package.json is not worth failing the site over */
    }
    return { ok: true, projectPath: directory };
}
/**
 * Gives a new site a history of its own: one commit of the site as it stands.
 * The caller runs it after the install, so the lockfile is part of that commit.
 */
async function startSiteHistory(directory, label, onLog) {
    // A scaffolder that started a history of its own has already done this, and
    // its first commit is the one to keep.
    if (fs_1.default.existsSync(path_1.default.join(directory, '.git'))) {
        return;
    }
    onLog?.('\n> starting a history for this site\n');
    try {
        await run('git', ['init', '-b', 'main'], directory);
        await run('git', ['add', '-A'], directory);
        // A first-time Git installation has no author configured yet. Give only
        // this generated commit a neutral identity; do not change the user's
        // repository or global configuration behind their back.
        await run('git', ['-c', 'user.name=Stacki', '-c', 'user.email=stacki@local.invalid', 'commit', '-m', `Start ${path_1.default.basename(directory)} from ${label}`], directory);
    }
    catch (error) {
        // A site with no git still runs; say so rather than throwing it away.
        const reason = error instanceof Error ? error.message : String(error);
        onLog?.(`\n(could not start a git history: ${reason})\n`);
    }
}
/**
 * The folder a new site gets, `parentPath/name`, which must not exist yet. The
 * starter and the Astro wizard both use it, so the name rules and their
 * messages are the same in either flow.
 */
function newSiteDirectory(parentPath, name) {
    if (!parentPath || !fs_1.default.existsSync(parentPath)) {
        throw new Error('Choose where the site should go first.');
    }
    const folder = String(name || '').trim();
    if (!folder) {
        throw new Error('Give the site a name.');
    }
    if (!NAME_RE.test(folder)) {
        throw new Error('Use letters, numbers, dashes, dots or underscores for the folder name.');
    }
    const directory = path_1.default.join(parentPath, folder);
    if (fs_1.default.existsSync(directory)) {
        throw new Error(`${folder} already exists in that folder.`);
    }
    return directory;
}
