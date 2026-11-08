"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runStudioCommand = runStudioCommand;
const node_child_process_1 = require("node:child_process");
const assert_1 = require("../../shared/core/assert");
const nodeTools_1 = require("../lib/nodeTools");
const platform_1 = require("../lib/platform");
const COMMAND_TIMEOUT_MS_MAX = 180_000;
const COMMAND_OUTPUT_BYTES_MAX = 2 * 1024 * 1024;
function runStudioCommand(options, onOutput) {
    (0, assert_1.assert)(Number.isSafeInteger(options.timeoutMs), 'Studio command timeout is an integer');
    (0, assert_1.assert)(options.timeoutMs > 0, 'Studio command timeout is positive');
    (0, assert_1.assert)(options.timeoutMs <= COMMAND_TIMEOUT_MS_MAX, 'Studio command timeout stays bounded');
    (0, nodeTools_1.ensureToolPath)();
    return new Promise((resolve) => {
        const child = (0, node_child_process_1.execFile)(options.command, [...options.argumentsList], {
            cwd: options.directory,
            timeout: options.timeoutMs,
            maxBuffer: COMMAND_OUTPUT_BYTES_MAX,
            encoding: 'utf8',
            shell: (0, platform_1.commandNeedsShell)(options.command),
            env: {
                ...process.env,
                STUDIO_PROJECT_ROOT: options.project,
                NO_COLOR: '1',
                FORCE_COLOR: '0',
                npm_config_progress: 'false',
            },
        }, (error) => {
            resolve(error ? { ok: false, error: error.message } : { ok: true, value: undefined });
        });
        const receive = (input) => {
            (0, assert_1.assert)(typeof input === 'string', 'Studio command streams decode UTF-8');
            onOutput(input);
        };
        child.stdout?.setEncoding('utf8').on('data', receive);
        child.stderr?.setEncoding('utf8').on('data', receive);
    });
}
