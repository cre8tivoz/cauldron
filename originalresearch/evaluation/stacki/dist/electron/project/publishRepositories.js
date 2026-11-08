"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.publishingRepositories = publishingRepositories;
exports.repositoryState = repositoryState;
exports.connectPublishingRepository = connectPublishingRepository;
const node_crypto_1 = require("node:crypto");
const node_fs_1 = require("node:fs");
const nodeTools_1 = require("../lib/nodeTools");
const platform_1 = require("../lib/platform");
const boundary_1 = require("../../shared/core/boundary");
const githubRepository_1 = require("../../shared/ipc/githubRepository");
const publishRepository_1 = require("../../shared/ipc/publishRepository");
const publishConfig_1 = require("../../shared/properties/publishConfig");
const publishGitHub_1 = require("./publishGitHub");
/** Repository setup never commits, pulls, or pushes project files. */
async function publishingRepositories(root, input) {
    const request = (0, publishRepository_1.parseRepositoryRequest)(input);
    try {
        const state = await repositoryState(root);
        if (request.action === 'list') {
            return { ok: true, value: await repositoryList(root, request.account, state) };
        }
        const environment = await (0, publishGitHub_1.publishingGitEnvironment)(root, {
            ...publishConfig_1.DEFAULT_PUBLISH_CONFIG,
            githubAccount: request.account,
        });
        if (request.action === 'create') {
            const repository = (0, githubRepository_1.parseGitHubRepository)(`${request.account}/${request.name}`);
            await repositoryCommand(root, ['repo', 'create', repository, request.private ? '--private' : '--public'], environment);
            return { ok: true, value: { ...state, repositories: [repository] } };
        }
        const access = (0, boundary_1.record)(await repositoryJSON(root, ['api', `repos/${request.repository}`], environment));
        if ((0, boundary_1.record)(access['permissions'])['push'] !== true) {
            return { ok: false, error: 'This account does not have write access to that repository.' };
        }
        return connectPublishingRepository(root, request);
    }
    catch {
        return {
            ok: false,
            error: request.action === 'create'
                ? 'Could not create the repository. Check the name, account permissions, and connection.'
                : 'Could not access GitHub repositories. Refresh or reconnect this GitHub account.',
        };
    }
}
async function repositoryState(root) {
    const top = await repositoryRoot(root);
    if (top && !(0, platform_1.sameFilesystemPath)(node_fs_1.realpathSync.native(top), node_fs_1.realpathSync.native(root))) {
        throw new Error('Open the repository root to change its connection.');
    }
    let remote = '';
    if (top) {
        const remotes = (await (0, nodeTools_1.git)(root, ['remote'])).stdout.trim().split('\n');
        if (remotes.includes('origin')) {
            remote = (await (0, nodeTools_1.git)(root, ['remote', 'get-url', 'origin'])).stdout.trim();
        }
    }
    const match = /^(?:https:\/\/github\.com\/|git@github\.com:)([\w.-]+\/[\w.-]+?)(?:\.git)?$/.exec(remote);
    const connected = match?.[1] ? (0, githubRepository_1.parseGitHubRepository)(match[1]) : '';
    return {
        connected,
        revision: (0, node_crypto_1.createHash)('sha256').update(remote).digest('hex'),
        repositories: connected ? [connected] : [],
        mode: 'editable',
        notice: '',
    };
}
async function connectPublishingRepository(root, request) {
    const current = await repositoryState(root);
    if (current.revision !== request.revision) {
        return { ok: false, error: 'The connected repository changed. Refresh before saving.' };
    }
    if (!(await repositoryRoot(root))) {
        await (0, nodeTools_1.git)(root, ['init', '--initial-branch=main']);
    }
    const remotes = (await (0, nodeTools_1.git)(root, ['remote'])).stdout.trim().split('\n');
    await (0, nodeTools_1.git)(root, ['remote', remotes.includes('origin') ? 'set-url' : 'add', 'origin', `https://github.com/${request.repository}.git`]);
    const saved = await repositoryState(root);
    if (saved.connected !== request.repository) {
        return {
            ok: false,
            error: 'The repository connection changed while saving. Refresh to review it.',
        };
    }
    return { ok: true, value: saved };
}
async function repositoryRoot(root) {
    try {
        return (await (0, nodeTools_1.git)(root, ['rev-parse', '--show-toplevel'])).stdout.trim();
    }
    catch {
        return undefined;
    }
}
async function listRepositories(root, account, environment) {
    const repositories = [];
    for (let page = 1; page <= 5; page++) {
        const values = (0, boundary_1.list)(boundary_1.record)(await repositoryJSON(root, ['api', `user/repos?per_page=100&page=${page}&sort=pushed&` + 'affiliation=owner,collaborator,organization_member'], environment));
        if (values.length > 100) {
            throw new Error('GitHub repository page exceeds its limit.');
        }
        for (const value of values) {
            if ((0, boundary_1.record)(value['permissions'])['push'] === true) {
                repositories.push((0, githubRepository_1.parseGitHubRepository)(value['full_name']));
            }
        }
        if (repositories.length > publishRepository_1.REPOSITORIES_MAX) {
            throw new Error('Too many repositories.');
        }
        if (values.length < 100) {
            // Owned repositories come first; accessible organization repositories remain selectable.
            return repositories.sort((left, right) => Number(right.startsWith(`${account}/`)) - Number(left.startsWith(`${account}/`)));
        }
    }
    throw new Error('More than 500 repositories are available. Narrow repository access first.');
}
async function repositoryJSON(root, args, environment) {
    const output = await repositoryCommand(root, args, environment);
    const value = JSON.parse(output);
    return value;
}
async function repositoryCommand(root, args, environment) {
    const result = await (0, nodeTools_1.run)('gh', args, root, { env: environment, timeout: 30_000 });
    return result.stdout;
}
async function repositoryList(root, account, state) {
    try {
        const environment = await (0, publishGitHub_1.publishingGitEnvironment)(root, {
            ...publishConfig_1.DEFAULT_PUBLISH_CONFIG,
            githubAccount: account,
        });
        return { ...state, repositories: await listRepositories(root, account, environment) };
    }
    catch {
        return {
            ...state,
            notice: 'Could not list repositories for this account. Refresh or reconnect the account.',
        };
    }
}
