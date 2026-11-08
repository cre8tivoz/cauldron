"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.hasLocalStudio = hasLocalStudio;
exports.createLocalStudio = createLocalStudio;
exports.writeLocalStudioConfig = writeLocalStudioConfig;
// Studio gets its own module graph so its preview hooks cannot interfere with
// Electron's canvas. Both servers read and write the same website source folder.
const node_child_process_1 = require("node:child_process");
const studioLocalMove_1 = require("./studioLocalMove");
const studioLocal_1 = require("../../shared/properties/studioLocal");
const node_fs_1 = require("node:fs");
const node_net_1 = require("node:net");
const node_path_1 = __importDefault(require("node:path"));
const node_url_1 = require("node:url");
const assert_1 = require("../../shared/core/assert");
const boundary_1 = require("../../shared/core/boundary");
const result_1 = require("../../shared/core/result");
const studioRelease_1 = require("../../shared/ipc/studioRelease");
function hasLocalStudio(project) {
    try {
        const directory = node_path_1.default.join(project, 'studio');
        if (!(0, node_fs_1.lstatSync)(directory).isDirectory()) {
            return false;
        }
        const metadata = node_path_1.default.join(directory, 'src/shared/release.json');
        const information = (0, node_fs_1.lstatSync)(metadata);
        if (!information.isFile() || information.size > 4096) {
            return false;
        }
        const input = JSON.parse((0, node_fs_1.readFileSync)(metadata, 'utf8'));
        (0, studioRelease_1.releaseVersion)((0, boundary_1.record)(input)['version']);
        return true;
    }
    catch {
        return false;
    }
}
function createLocalStudio(project, log) {
    let lifecycle = 'open';
    let pending;
    const children = new Set();
    return {
        open() {
            if (lifecycle === 'closed') {
                return Promise.resolve((0, result_1.err)('The website preview has closed.'));
            }
            pending ??= launchLocalStudio((0, node_fs_1.realpathSync)(project), {
                active: () => lifecycle === 'open',
                track: (child) => {
                    (0, assert_1.assert)(children.size === 0, 'Only one local Studio process may run per project');
                    children.add(child);
                    child.once('exit', () => children.delete(child));
                },
                log,
            });
            return pending;
        },
        close() {
            lifecycle = 'closed';
            for (const child of children) {
                stopLocalStudio(child);
            }
            children.clear();
        },
    };
}
async function launchLocalStudio(project, host) {
    const assets = node_path_1.default.join(project, 'studio/dist');
    if (!(0, node_fs_1.existsSync)(node_path_1.default.join(assets, 'integration.mjs'))) {
        return (0, result_1.err)('Studio needs a build. Run npm --prefix studio run build, then restart the preview.');
    }
    const port = await availablePort();
    if (!host.active()) {
        return (0, result_1.err)('The website preview has closed.');
    }
    const configuration = writeLocalStudioConfig(project, assets, port);
    const child = (0, node_child_process_1.spawn)(process.execPath, [
        node_path_1.default.join(project, 'node_modules/astro/bin/astro.mjs'),
        'dev',
        '--config',
        node_path_1.default.relative(project, configuration),
        '--port',
        String(port),
        '--host',
        '127.0.0.1',
        '--ignore-lock',
    ], { cwd: project, detached: process.platform !== 'win32', stdio: ['ignore', 'pipe', 'pipe'] });
    host.track(child);
    let failure;
    child.once('error', (error) => {
        failure = error.message;
    });
    for (const stream of [child.stdout, child.stderr]) {
        stream?.on('data', (chunk) => {
            (0, assert_1.assert)(Buffer.isBuffer(chunk), 'Studio process output must be bytes');
            host.log(chunk.toString('utf8').slice(-24_000));
        });
    }
    const origin = `http://127.0.0.1:${port}`;
    // Bound startup to roughly one minute, including probes and backoff.
    for (let attempt = 0; attempt < 60; attempt += 1) {
        if (!host.active() || child.exitCode !== null || failure) {
            stopLocalStudio(child);
            return (0, result_1.err)(failure ?? 'Studio stopped. Check the website preview log.');
        }
        if (await localStudioReady(origin)) {
            return (0, result_1.ok)(origin);
        }
        await new Promise((resolve) => setTimeout(resolve, 500));
    }
    stopLocalStudio(child);
    return (0, result_1.err)('Studio did not start. Check the website preview log and restart the preview.');
}
function writeLocalStudioConfig(project, assets, port) {
    (0, assert_1.assert)(Number.isSafeInteger(port), 'Studio port must be an integer');
    (0, assert_1.assert)(port >= 1024, 'Studio port must be a nonprivileged TCP port');
    (0, assert_1.assert)(port <= 65535, 'Studio port must be a nonprivileged TCP port');
    const names = ['astro.config.mjs', 'astro.config.js', 'astro.config.ts', 'astro.config.mts'];
    const userConfig = names.find((name) => (0, node_fs_1.existsSync)(node_path_1.default.join(project, name)));
    const source = userConfig ? `import config from ${JSON.stringify((0, node_url_1.pathToFileURL)(node_path_1.default.join(project, userConfig)).href)};` : 'const config = {};';
    const integration = (0, node_url_1.pathToFileURL)(node_path_1.default.join(assets, 'integration.mjs')).href;
    const directory = node_path_1.default.join(project, 'node_modules/.avb');
    const state = node_path_1.default.join(project, studioLocal_1.STUDIO_STATE_DIRECTORY);
    (0, node_fs_1.mkdirSync)(directory, { recursive: true });
    // `.stacki/studio/` ignores its own contents; an older `.studio-state` moves in.
    (0, studioLocalMove_1.prepareStudioLocal)(project);
    (0, node_fs_1.mkdirSync)(state, { recursive: true });
    if ((0, node_fs_1.lstatSync)(state).isSymbolicLink()) {
        throw new Error('Studio session storage must be a real directory');
    }
    const file = node_path_1.default.join(directory, 'astro.studio.config.mjs');
    (0, node_fs_1.writeFileSync)(file, `${source}\nimport studio from ${JSON.stringify(integration)};
export default { ...config, devToolbar: { enabled: false },
  cacheDir: './node_modules/.avb/studio-cache',
  vite: { ...config.vite, cacheDir: './node_modules/.avb/studio-vite-cache' },
  integrations: [...(config.integrations ?? []),
    studio(${JSON.stringify({ root: project, assets, port, editing: 'source' })})]
};\n`);
    return file;
}
async function availablePort() {
    const server = (0, node_net_1.createServer)();
    await new Promise((resolve, reject) => {
        server.once('error', reject);
        server.listen(0, '127.0.0.1', resolve);
    });
    const address = server.address();
    (0, assert_1.assert)(address !== null, 'Listening Studio probe must have an address');
    (0, assert_1.assert)(typeof address !== 'string', 'Studio probe must use TCP');
    await new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
    return address.port;
}
async function localStudioReady(origin) {
    try {
        const response = await fetch(origin + '/studio/api/session', {
            signal: AbortSignal.timeout(500),
            redirect: 'error',
        });
        if (!response.ok) {
            return false;
        }
        const reader = response.body?.getReader();
        if (!reader) {
            return false;
        }
        const chunks = [];
        let size = 0;
        // Session replies are tiny. Bound both bytes and chunks before parsing JSON.
        for (let count = 0; count < 64; count += 1) {
            const chunk = await reader.read();
            if (chunk.done) {
                const value = JSON.parse(Buffer.concat(chunks).toString('utf8'));
                return (0, boundary_1.record)(value)['kind'] === 'local';
            }
            const bytes = chunk.value;
            if (!(bytes instanceof Uint8Array)) {
                break;
            }
            size += bytes.byteLength;
            if (size > 4096) {
                break;
            }
            chunks.push(bytes);
        }
        await reader.cancel();
        return false;
    }
    catch {
        return false;
    }
}
function stopLocalStudio(child) {
    if (!child.pid || child.exitCode !== null) {
        return;
    }
    try {
        if (process.platform === 'win32') {
            (0, node_child_process_1.spawn)('taskkill', ['/pid', String(child.pid), '/T', '/F'], { windowsHide: true }).once('error', () => child.kill());
        }
        else {
            process.kill(-child.pid, 'SIGTERM');
        }
    }
    catch {
        child.kill();
    }
}
