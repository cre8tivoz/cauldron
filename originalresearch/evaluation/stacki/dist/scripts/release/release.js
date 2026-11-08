"use strict";
// Release automation stays in TypeScript so version parsing and every process
// result are checked. The script deliberately stops on the first failed step;
// a partly tagged or partly pushed release needs human inspection.
Object.defineProperty(exports, "__esModule", { value: true });
const node_child_process_1 = require("node:child_process");
const node_fs_1 = require("node:fs");
const promises_1 = require("node:readline/promises");
const node_process_1 = require("node:process");
const ACTIONS_URL = 'https://github.com/flowtricks/stacki/actions';
const CHOICE_CHARS_MAX = 8;
function packageVersion() {
    const input = JSON.parse((0, node_fs_1.readFileSync)('package.json', 'utf8'));
    if (typeof input !== 'object' || input === null || !('version' in input)) {
        throw new Error('package.json: expected a version field');
    }
    if (typeof input.version !== 'string') {
        throw new Error('package.json.version: expected string');
    }
    const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(input.version);
    if (!match) {
        throw new Error(`package.json.version: expected numeric semver, got ${input.version}`);
    }
    const parts = match.slice(1).map(Number);
    if (parts.length !== 3 || parts.some((part) => !Number.isSafeInteger(part))) {
        throw new Error('package.json.version: components must be safe integers');
    }
    const [major, minor, patch] = parts;
    if (major === undefined || minor === undefined || patch === undefined) {
        throw new Error('package.json.version: expected three components');
    }
    return { major, minor, patch };
}
function nextVersion(current, choice) {
    switch (choice) {
        case '1':
            return `${current.major}.${current.minor}.${current.patch + 1}`;
        case '2':
            return `${current.major}.${current.minor + 1}.0`;
        case '3':
            return `${current.major + 1}.0.0`;
        default:
            throw new Error('Release choice must be 1, 2, or 3');
    }
}
function run(command, argumentsList) {
    const result = (0, node_child_process_1.spawnSync)(command, argumentsList, { stdio: 'inherit' });
    if (result.error) {
        throw result.error;
    }
    if (result.status !== 0) {
        throw new Error(`${command} failed with status ${String(result.status)}`);
    }
}
function openActions() {
    if (process.platform === 'darwin') {
        run('open', [ACTIONS_URL]);
    }
    else if (process.platform === 'win32') {
        run('cmd.exe', ['/c', 'start', '', ACTIONS_URL]);
    }
    else {
        run('xdg-open', [ACTIONS_URL]);
    }
}
async function main() {
    const current = packageVersion();
    node_process_1.stdout.write(`Current version: ${current.major}.${current.minor}.${current.patch}\n`);
    node_process_1.stdout.write('What kind of release?\n');
    node_process_1.stdout.write(`  1) patch (${current.major}.${current.minor}.${current.patch + 1})\n`);
    node_process_1.stdout.write(`  2) minor (${current.major}.${current.minor + 1}.0)\n`);
    node_process_1.stdout.write(`  3) major (${current.major + 1}.0.0)\n`);
    const prompt = (0, promises_1.createInterface)({ input: node_process_1.stdin, output: node_process_1.stdout });
    const answer = await prompt.question('Choose [1/2/3]: ');
    prompt.close();
    if (answer.length > CHOICE_CHARS_MAX) {
        throw new Error('Release choice exceeds limit');
    }
    const version = nextVersion(current, answer.trim());
    run('npm', ['version', version, '--no-git-tag-version']);
    node_process_1.stdout.write(`Bumped to ${version}\n`);
    run('git', ['add', '--all']);
    run('git', ['commit', '--message', `v${version}`]);
    run('git', ['tag', `v${version}`]);
    run('git', ['push']);
    run('git', ['push', '--tags']);
    node_process_1.stdout.write(`Release v${version} triggered!\n`);
    openActions();
}
void main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
});
