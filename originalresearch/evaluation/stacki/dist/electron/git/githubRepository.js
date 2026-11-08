"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.connectRepository = connectRepository;
const assert_1 = require("../../shared/core/assert");
const githubRepository_1 = require("../../shared/ipc/githubRepository");
async function connectRepository(execute, options) {
    const repository = (0, githubRepository_1.parseGitHubRepository)(options.repository);
    const url = `https://github.com/${repository}`;
    const command = (args) => executeCommand(execute, options.projectPath, args);
    const remoteResult = await command(['remote']);
    if (!remoteResult.ok) {
        return remoteResult;
    }
    const remotes = remoteResult.value.stdout.trim().split('\n');
    (0, assert_1.assert)(remotes.length <= 1000, 'Git remote inventory exceeds limit');
    if (remotes.includes('origin')) {
        return {
            ok: false,
            error: 'This project already has an origin remote. It was left unchanged.',
        };
    }
    const branchResult = await command(['symbolic-ref', '--short', 'HEAD']);
    if (!branchResult.ok) {
        return branchResult;
    }
    const branch = branchResult.value.stdout.trim();
    (0, assert_1.assert)(branch.length > 0, 'Publishing requires a named branch');
    const added = await command(['remote', 'add', 'origin', `${url}.git`]);
    if (!added.ok) {
        return added;
    }
    // An ordinary push refuses unrelated or newer remote history. Never force it.
    // Keep the configured remote on failure so Git's normal retry remains available.
    const pushed = await command(['push', '--set-upstream', 'origin', branch]);
    if (!pushed.ok) {
        return pushed;
    }
    return { ok: true, value: { url, output: pushed.value.stdout + pushed.value.stderr } };
}
async function executeCommand(execute, projectPath, args) {
    try {
        return { ok: true, value: await execute(projectPath, args, { timeout: 180000 }) };
    }
    catch (error) {
        return { ok: false, error: error instanceof Error ? error.message : String(error) };
    }
}
