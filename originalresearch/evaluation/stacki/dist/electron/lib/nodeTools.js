"use strict";
// Finding and running Node and the command-line tools a project needs: the
// PATH a GUI launch lacks, the CLI entry behind a .bin shim, a bounded command
// runner, a free port, and a process tree stopped as a whole.
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
exports.toolPathReady = exports.toolPathHome = exports.cmpVersion = void 0;
exports.shellPathDirectories = shellPathDirectories;
exports.nodeDirectoryGuesses = nodeDirectoryGuesses;
exports.setToolPathHome = setToolPathHome;
exports.ensureToolPath = ensureToolPath;
exports.resolveNodeBin = resolveNodeBin;
exports.resolveCliEntry = resolveCliEntry;
exports.nodeCliCommand = nodeCliCommand;
exports.run = run;
exports.git = git;
exports.findFreePort = findFreePort;
exports.findFreePortProbe = findFreePortProbe;
exports.stopProcessTree = stopProcessTree;
exports.spawnAstroServer = spawnAstroServer;
const mainLimits_1 = require("./mainLimits");
const platform_1 = require("./platform");
const os_1 = require("os");
const record_1 = require("../../shared/core/record");
const assert_1 = require("../../shared/core/assert");
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const net = __importStar(require("net"));
const child_process_1 = require("child_process");
const mainHelpers_1 = require("./mainHelpers");
// ---------------------------------------------------------------------------
// Finding Node
//
// Launched from Finder or the Dock, the app inherits launchd's PATH —
// `/usr/bin:/bin:/usr/sbin:/sbin` — not the shell's. Nothing installed by
// Homebrew, nvm, fnm, volta, or the Node installer is on it, so `astro` (a
// `#!/usr/bin/env node` shim) dies with "env: node: No such file or
// directory" and `npm install` fails as ENOENT. Launched from a terminal it
// all works, which is why this only bites in the packaged app.
// ---------------------------------------------------------------------------
// Interactive login shell, because that's the one that sources .zshrc/.bashrc
// where version managers put themselves. Marker-delimited so rc-file chatter
// around the value can't be mistaken for it.
function shellPathDirectories() {
    // $SHELL is usually set even under launchd, but not always — the account's
    // registered login shell is the reliable source when it isn't.
    let shell = process.env['SHELL'];
    if (!shell) {
        try {
            shell = (0, os_1.userInfo)().shell || undefined;
        }
        catch {
            shell = undefined;
        }
    }
    if (!shell) {
        return [];
    }
    try {
        const out = (0, child_process_1.execFileSync)(shell, ['-ilc', 'printf "__AVB__%s__AVB__" "$PATH"'], {
            encoding: 'utf8',
            timeout: 5000,
            stdio: ['ignore', 'pipe', 'ignore'],
            // Quieter rc files: no pagers, no update prompts, no color codes.
            env: { ...process.env, TERM: 'dumb', DISABLE_AUTO_UPDATE: 'true' },
        });
        const match = /__AVB__([\s\S]*?)__AVB__/.exec(out);
        return match ? ((0, mainHelpers_1.capture)(match, 1) ?? '').split(path.delimiter).filter(Boolean) : [];
    }
    catch {
        return []; // no shell, hung rc file, exotic setup — fall through to the guesses
    }
}
const cmpVersion = (left, right) => {
    const parts = (version) => version
        .replace(/^v/, '')
        .split('.')
        .map((part) => parseInt(part, 10) || 0);
    const [x, y] = [parts(left), parts(right)];
    for (let i = 0; i < 3; i++) {
        if (x[i] !== y[i]) {
            return (x[i] ?? 0) - (y[i] ?? 0);
        }
    }
    return 0;
};
exports.cmpVersion = cmpVersion;
// Where Node ends up when the shell probe comes back empty — every install
// route in common use, since we can't ask the user which one they took.
function nodeDirectoryGuesses(home) {
    const directories = mainHelpers_1.isWin
        ? [...(0, platform_1.staticToolPathGuesses)(home, process.env)]
        : [
            '/opt/homebrew/bin', // Homebrew, Apple Silicon
            '/usr/local/bin', // Homebrew on Intel, and the official installer
            '/opt/local/bin', // MacPorts
            '/snap/bin', // Linux snap
            path.join(home, '.volta/bin'),
            path.join(home, '.asdf/shims'),
            path.join(home, '.nodenv/shims'),
            path.join(home, '.local/share/mise/shims'),
            path.join(home, '.local/bin'),
            path.join(home, '.npm-global/bin'),
            path.join(home, 'n/bin'),
        ];
    // Version managers keep one directory per version — take the newest, so a
    // project needing a modern Node still gets one.
    const versioned = mainHelpers_1.isWin
        ? [[path.join(home, 'AppData', 'Roaming', 'nvm'), '']]
        : [
            [path.join(home, '.nvm/versions/node'), 'bin'],
            [path.join(home, '.local/share/fnm/node-versions'), 'installation/bin'],
            [path.join(home, 'Library/Application Support/fnm/node-versions'), 'installation/bin'],
            [path.join(home, '.fnm/node-versions'), 'installation/bin'],
            [path.join(home, '.asdf/installs/nodejs'), 'bin'],
            [path.join(home, '.nodenv/versions'), 'bin'],
            [path.join(home, '.local/share/mise/installs/node'), 'bin'],
            ['/usr/local/n/versions/node', 'bin'],
        ];
    for (const [base, suffix] of versioned) {
        try {
            const newest = fs
                .readdirSync(base)
                .filter((version) => /^v?\d/.test(version))
                .sort(exports.cmpVersion)
                .pop();
            if (newest) {
                directories.push(suffix ? path.join(base, newest, suffix) : path.join(base, newest));
            }
        }
        catch {
            /* not installed */
        }
    }
    return directories;
}
// The home directory the guesses start from: Electron's own answer, handed
// over once at startup. This module may not import electron, because the main
// harness loads everything but main.js with Node's own require.
exports.toolPathHome = undefined;
function setToolPathHome(home) {
    (0, assert_1.assert)(path.isAbsolute(home), 'The tool path home is an absolute path');
    exports.toolPathHome = home;
}
// Costs a shell spawn, so it runs once, lazily — nothing needs it until a
// child process is about to start.
exports.toolPathReady = false;
function ensureToolPath() {
    if (exports.toolPathReady) {
        return;
    }
    (0, assert_1.assert)(exports.toolPathHome !== undefined, 'setToolPathHome runs before any child process starts');
    exports.toolPathReady = true;
    const candidates = [];
    // Appended, not prepended: the system's own resolution order stays intact,
    // and these directories only ever win for tools the base PATH lacks.
    if (!mainHelpers_1.isWin) {
        candidates.push(...shellPathDirectories());
    }
    for (const directory of nodeDirectoryGuesses(exports.toolPathHome)) {
        if (fs.existsSync(directory)) {
            candidates.push(directory);
        }
    }
    const current = (0, platform_1.pathEnvironmentValue)(process.env);
    (0, platform_1.setPathEnvironment)(process.env, (0, platform_1.mergeToolPaths)(current, candidates));
}
function resolveNodeBin() {
    ensureToolPath();
    const exe = mainHelpers_1.isWin ? 'node.exe' : 'node';
    for (const directory of (0, platform_1.pathEnvironmentValue)(process.env).split(path.delimiter)) {
        if (!directory) {
            continue;
        }
        const candidate = path.join(directory, exe);
        try {
            if (fs.statSync(candidate).isFile()) {
                return candidate;
            }
        }
        catch {
            /* not here */
        }
    }
    return undefined;
}
// node_modules/.bin/<name> is a symlink to the package's JS entry on POSIX
// and a wrapper script on Windows. The package's own `bin` field is correct
// on both (and survives pnpm's store layout, where the symlink points
// somewhere else entirely), so read that first and fall back to the link.
function resolveCliEntry(binPath) {
    const name = path.basename(binPath).replace(/\.(cmd|ps1|exe|bat)$/i, '');
    const pkgDirectory = path.join(path.dirname(binPath), '..', name);
    try {
        const pkg = (0, mainHelpers_1.parseRecord)((0, mainHelpers_1.readJson)(path.join(pkgDirectory, 'package.json')));
        const bin = pkg['bin'];
        const rel = (0, mainHelpers_1.parseOptionalString)(typeof bin === 'string' ? bin : (0, record_1.toRecord)(bin)?.[name]);
        if (rel) {
            const entry = path.join(pkgDirectory, rel);
            if (fs.existsSync(entry)) {
                return entry;
            }
        }
    }
    catch {
        /* not a plain node_modules layout */
    }
    try {
        const real = fs.realpathSync(binPath);
        if (/\.(js|mjs|cjs)$/i.test(real)) {
            return real;
        }
    }
    catch {
        /* not a symlink */
    }
    return undefined;
}
// Runs the CLI's JS entry point under a resolved Node instead of going
// through the .bin shim, so the shebang's own PATH lookup — the thing that
// fails on a GUI launch — never happens. Returns [command, argv].
function nodeCliCommand(binPath, args) {
    const node = resolveNodeBin();
    if (!node) {
        return [binPath, [...args]];
    }
    const entry = resolveCliEntry(binPath);
    return entry ? [node, [entry, ...args]] : [binPath, [...args]];
}
function run(cmd, args, cwd, options = {}) {
    // Launched from Finder, the packaged app inherits a bare PATH — Homebrew's
    // bin isn't on it, so `gh` looks uninstalled however it was set up. Cheap
    // after the first call (memoized).
    ensureToolPath();
    return new Promise((resolve, reject) => {
        (0, child_process_1.execFile)(cmd, [...args], {
            cwd,
            timeout: options.timeout || 60000,
            shell: (0, platform_1.commandNeedsShell)(cmd),
            maxBuffer: mainLimits_1.MAIN_LIMITS.commandOutputBytesMax,
            ...options,
        }, (error, stdout, stderr) => {
            if (error) {
                Object.assign(error, { stdout, stderr });
                reject(error);
            }
            else {
                resolve({ stdout: stdout.toString(), stderr: stderr.toString() });
            }
        });
    });
}
async function git(projectPath, args, options = {}) {
    return run('git', args, projectPath, options);
}
async function findFreePort(start) {
    (0, assert_1.assert)(Number.isSafeInteger(start), 'Starting port must be an integer');
    (0, assert_1.assert)(start > 0, 'Starting port must be positive');
    for (let attempt = 0; attempt < mainLimits_1.MAIN_LIMITS.portAttemptsMax; attempt++) {
        const port = start + attempt;
        if (port > 65535) {
            break;
        }
        const available = await findFreePortProbe(port);
        if (available) {
            return port;
        }
    }
    throw new Error('No available preview port within the search limit');
}
function findFreePortProbe(port) {
    return new Promise((resolve, reject) => {
        const server = net.createServer();
        server.once('error', (error) => {
            switch (error.code) {
                // Windows reserves port ranges even when no process is listening.
                // Treat those ports as unavailable within the existing bounded search.
                case 'EADDRINUSE':
                case 'EACCES':
                    resolve(false);
                    break;
                case undefined:
                default:
                    reject(error);
            }
        });
        server.once('listening', () => server.close(() => resolve(true)));
        server.listen(port, '127.0.0.1');
    });
}
function stopProcessTree(proc) {
    if (!proc?.pid) {
        return;
    }
    try {
        if (mainHelpers_1.isWin) {
            (0, child_process_1.spawn)('taskkill', ['/pid', String(proc.pid), '/T', '/F'], { windowsHide: true }).on('error', () => {
                try {
                    proc.kill('SIGTERM');
                }
                catch {
                    /* already gone */
                }
            });
        }
        else {
            process.kill(-proc.pid, 'SIGTERM');
        }
    }
    catch {
        try {
            proc.kill('SIGTERM');
        }
        catch {
            /* already gone */
        }
    }
}
// A dev server for a project that is not open, kept apart from the app's own:
// `devServer` belongs to the canvas, and a thumbnail must not disturb what the
// editor is showing. The project's own config is used rather than the app's
// generated one — the picture is of the site, not of the canvas.
function spawnAstroServer(projectPath, localBin, args, extraEnvironment = {}) {
    const [cmd, argv] = nodeCliCommand(localBin, args);
    return (0, child_process_1.spawn)(cmd, argv, {
        cwd: projectPath,
        shell: (0, platform_1.commandNeedsShell)(cmd),
        // Give descendants their own process group so closing a project can stop
        // Vite and Astro together, including CLIs that launch another process.
        detached: !mainHelpers_1.isWin,
        stdio: ['ignore', 'pipe', 'pipe'],
        env: { ...process.env, ...extraEnvironment, FORCE_COLOR: '0', NO_COLOR: '1' },
    });
}
