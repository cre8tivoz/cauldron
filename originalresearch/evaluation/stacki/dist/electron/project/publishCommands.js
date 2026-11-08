"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runPublishScripts = runPublishScripts;
exports.deployHosting = deployHosting;
exports.runPublishCommand = runPublishCommand;
exports.publishEnvironment = publishEnvironment;
exports.stopPublishProcess = stopPublishProcess;
const node_child_process_1 = require("node:child_process");
const publishConfig_1 = require("../../shared/properties/publishConfig");
const publishCommands_1 = require("../../shared/properties/publishCommands");
const publishExecutable_1 = require("./publishExecutable");
const publishWorkerConfig_1 = require("./publishWorkerConfig");
async function runPublishScripts(root, scripts, environment = {}) {
    if (scripts.length > publishConfig_1.PUBLISH_LIMITS.hooksMax) {
        throw new Error('Publish hook exceeds eight scripts.');
    }
    for (const script of scripts) {
        await runPublishCommand(root, { ...(0, publishCommands_1.scriptCommand)(script), environment });
    }
}
async function deployHosting(root, config) {
    if (config.hosting.provider === 'none') {
        throw new Error('Choose a hosting provider in Publish settings.');
    }
    const command = (0, publishCommands_1.hostingCommand)(config.hosting);
    if (config.hosting.provider === 'cloudflare-workers') {
        await (0, publishWorkerConfig_1.withWorkerAccount)(root, config.hosting.accountId, (configuration) => runPublishCommand(root, {
            ...command,
            arguments: [...command.arguments, '--config', configuration],
        }));
    }
    else {
        await runPublishCommand(root, command);
    }
}
/** Run installed tools only: publishing must never implicitly download executable packages. */
async function runPublishCommand(root, command) {
    const resolved = (0, publishExecutable_1.resolvePublishExecutable)(root, command);
    const environment = {
        ...publishEnvironment(),
        ...command.environment,
        CI: 'true',
        NO_COLOR: '1',
        npm_config_yes: 'false',
    };
    const argumentsList = [...resolved.arguments];
    const token = process.env['VERCEL_TOKEN'];
    if (command.executable === 'vercel' && token) {
        argumentsList.push('--token', token);
    }
    return new Promise((resolve, reject) => {
        const child = (0, node_child_process_1.spawn)(resolved.executable, argumentsList, {
            cwd: root,
            env: environment,
            shell: false,
            detached: process.platform !== 'win32',
            stdio: ['ignore', 'pipe', 'pipe'],
        });
        // Logs may contain credentials from third-party hooks. Keep them out of IPC and UI errors.
        let outputBytes = 0;
        let failure = '';
        const stop = (message) => {
            failure = message;
            stopPublishProcess(child.pid);
            child.kill('SIGKILL');
        };
        const collect = (chunk) => {
            outputBytes += chunk.length;
            if (outputBytes > publishConfig_1.PUBLISH_LIMITS.outputBytesMax) {
                stop('Command exceeded the 1 MiB output limit.');
            }
        };
        child.stdout.on('data', collect);
        child.stderr.on('data', collect);
        const timer = setTimeout(() => stop('Command exceeded the ten-minute time limit.'), publishConfig_1.PUBLISH_LIMITS.commandTimeoutMs);
        child.once('error', () => {
            clearTimeout(timer);
            reject(new Error(`Could not start ${command.executable}. Install and authenticate it first.`));
        });
        child.once('close', (code) => {
            clearTimeout(timer);
            if (code === 0 && !failure) {
                resolve();
            }
            else {
                reject(new Error(failure || `${command.executable} failed (exit ${code}). Check its setup.`));
            }
        });
    });
}
function publishEnvironment() {
    const environment = { ...process.env };
    // Site automation may use deployment credentials, but never Studio's private control channel.
    for (const name of [
        'STUDIO_CONTAINER_TOKEN',
        'STUDIO_BACKEND_URL',
        'GITHUB_PRIVATE_KEY',
        'GITHUB_APP_ID',
        'GITHUB_INSTALLATION_ID',
        'GH_TOKEN',
        'GITHUB_TOKEN',
        'AI_API_KEY',
    ]) {
        delete environment[name];
    }
    return environment;
}
function stopPublishProcess(pid) {
    if (pid === undefined) {
        return;
    }
    try {
        if (process.platform === 'win32') {
            const cleanup = (0, node_child_process_1.spawn)('taskkill', ['/pid', String(pid), '/T', '/F'], { stdio: 'ignore' });
            cleanup.on('error', () => undefined);
        }
        else {
            process.kill(-pid, 'SIGKILL');
        }
    }
    catch {
        // The command may have exited between its timeout and process-group cleanup.
    }
}
