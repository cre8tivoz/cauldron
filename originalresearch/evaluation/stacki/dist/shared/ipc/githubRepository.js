"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseGitHubRepository = parseGitHubRepository;
exports.parseGitHubRepositories = parseGitHubRepositories;
exports.parseCloneResult = parseCloneResult;
const assert_1 = require("../core/assert");
const boundary_1 = require("../core/boundary");
function parseGitHubRepository(input) {
    const value = (0, boundary_1.text)(input);
    if (value.length > 140 || !/^[a-zA-Z0-9][a-zA-Z0-9-]{0,38}\/[\w.-]{1,100}$/.test(value)) {
        throw new Error('Enter a GitHub repository as owner/name.');
    }
    const segments = value.split('/');
    (0, assert_1.assert)(segments.length === 2, 'Repository parser produces exactly owner/name');
    const name = segments[1];
    (0, assert_1.assert)(name !== undefined, 'Repository parser produces a name');
    if (name === '.' || name === '..') {
        throw new Error('Invalid GitHub repository name.');
    }
    return value;
}
function parseGitHubRepositories(input) {
    const repositories = (0, boundary_1.list)(parseGitHubRepository)(input);
    if (repositories.length > 100) {
        throw new Error('GitHub repository list exceeds limit.');
    }
    return repositories;
}
function parseCloneResult(input) {
    const value = (0, boundary_1.record)(input);
    if ((0, boundary_1.boolean)(value['canceled'])) {
        return { canceled: true };
    }
    if (value['error'] !== undefined) {
        return { canceled: false, error: (0, boundary_1.text)(value['error']) };
    }
    return { canceled: false, projectPath: (0, boundary_1.pathText)(value['projectPath']) };
}
