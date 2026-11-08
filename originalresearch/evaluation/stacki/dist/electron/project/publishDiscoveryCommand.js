"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.discoveryCommand = discoveryCommand;
const node_child_process_1 = require("node:child_process");
const publishDiscovery_1 = require("../../shared/properties/publishDiscovery");
const publishExecutable_1 = require("./publishExecutable");
const publishCommands_1 = require("./publishCommands");
/** Only fixed read commands reach this runner; credentials never reach renderer diagnostics. */
async function discoveryCommand(root, executable, argumentsList) {
    const resolved = executable === 'gh'
        ? { executable: 'gh', arguments: argumentsList }
        : (0, publishExecutable_1.resolvePublishExecutable)(root, { executable, arguments: argumentsList, environment: {} });
    const args = [...resolved.arguments];
    if (executable === 'vercel' && process.env['VERCEL_TOKEN']) {
        args.push('--token', process.env['VERCEL_TOKEN']);
    }
    const output = await new Promise((resolve, reject) => {
        const child = (0, node_child_process_1.execFile)(resolved.executable, args, {
            cwd: root,
            env: { ...(0, publishCommands_1.publishEnvironment)(), CI: 'true', NO_COLOR: '1', WRANGLER_SEND_METRICS: 'false' },
            shell: false,
            encoding: 'utf8',
            timeout: publishDiscovery_1.DISCOVERY_LIMITS.timeoutMs,
            maxBuffer: 1_048_576,
            killSignal: 'SIGKILL',
            windowsHide: true,
        }, (error, stdout) => {
            if (error) {
                reject(new Error(`Could not read ${executable} accounts. Install the latest CLI and sign in.`));
            }
            else {
                resolve(stdout);
            }
        });
        child.stdin?.end();
    });
    const value = JSON.parse(output);
    return value;
}
