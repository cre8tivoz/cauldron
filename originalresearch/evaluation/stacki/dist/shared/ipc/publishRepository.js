"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.REPOSITORIES_MAX = void 0;
exports.parseRepositoryRequest = parseRepositoryRequest;
exports.parseRepositoryResult = parseRepositoryResult;
const boundary_1 = require("../core/boundary");
const githubRepository_1 = require("./githubRepository");
exports.REPOSITORIES_MAX = 500;
function parseRepositoryRequest(input) {
    const value = (0, boundary_1.record)(input);
    const account = (0, boundary_1.text)(value['account']);
    if (!/^[a-zA-Z0-9][a-zA-Z0-9-]{0,38}$/.test(account)) {
        throw new Error('Choose a signed-in GitHub account.');
    }
    switch (value['action']) {
        case 'list':
            return { action: 'list', account };
        case 'connect':
            return {
                action: 'connect',
                account,
                repository: (0, githubRepository_1.parseGitHubRepository)(value['repository']),
                revision: revision(value['revision']),
            };
        case 'create': {
            const name = (0, boundary_1.text)(value['name']);
            (0, githubRepository_1.parseGitHubRepository)(`${account}/${name}`);
            return { action: 'create', account, name, private: (0, boundary_1.boolean)(value['private']) };
        }
        default:
            throw new Error('Unknown repository action.');
    }
}
function parseRepositoryResult(input) {
    const result = (0, boundary_1.record)(input);
    if (!(0, boundary_1.boolean)(result['ok'])) {
        return { ok: false, error: message(result['error']) };
    }
    const value = (0, boundary_1.record)(result['value']);
    const connected = (0, boundary_1.text)(value['connected']);
    const repositories = (0, boundary_1.list)(githubRepository_1.parseGitHubRepository)(value['repositories']);
    if (repositories.length > exports.REPOSITORIES_MAX) {
        throw new Error('Repository list exceeds 500 entries.');
    }
    const mode = value['mode'];
    if (mode !== 'editable' && mode !== 'managed') {
        throw new Error('Invalid repository connection mode.');
    }
    return {
        ok: true,
        value: {
            connected: connected ? (0, githubRepository_1.parseGitHubRepository)(connected) : '',
            revision: revision(value['revision']),
            repositories,
            mode,
            notice: message(value['notice']),
        },
    };
}
function revision(input) {
    const value = (0, boundary_1.text)(input);
    if (!/^[a-f0-9]{64}$/.test(value)) {
        throw new Error('Invalid repository connection revision.');
    }
    return value;
}
function message(input) {
    const value = (0, boundary_1.text)(input);
    if (value.length > 1000) {
        throw new Error('Repository message exceeds its limit.');
    }
    return value;
}
