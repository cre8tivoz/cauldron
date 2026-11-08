"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerGitRepositoryHandlers = registerGitRepositoryHandlers;
const node_fs_1 = require("node:fs");
const publishConfig_1 = require("../project/publishConfig");
const publishGitHub_1 = require("../project/publishGitHub");
const node_os_1 = require("node:os");
const node_path_1 = require("node:path");
const assert_1 = require("../../shared/core/assert");
const boundary_1 = require("../../shared/core/boundary");
const githubRepository_1 = require("../../shared/ipc/githubRepository");
const nodeTools_1 = require("../lib/nodeTools");
const projectFiles_1 = require("../project/projectFiles");
const githubRepository_2 = require("../git/githubRepository");
const nodeTools_2 = require("../lib/nodeTools");
function registerGitRepositoryHandlers({ ipcMain, showOpenDialog }) {
    ipcMain.handle('git:repositories', async () => {
        const response = await (0, nodeTools_1.run)('gh', ['api', 'user/repos?per_page=100&sort=pushed&affiliation=owner,collaborator,organization_member'], (0, node_os_1.homedir)(), {
            timeout: 30000,
        });
        const data = JSON.parse(response.stdout);
        return (0, githubRepository_1.parseGitHubRepositories)((0, boundary_1.list)((entry) => (0, githubRepository_1.parseGitHubRepository)((0, boundary_1.record)(entry)['full_name']))(data));
    });
    ipcMain.handle('git:clone', async (_event, { repository }) => {
        const result = await showOpenDialog({
            title: 'Choose where to download the repository',
            properties: ['openDirectory', 'createDirectory'],
        });
        if (result.canceled) {
            return { canceled: true };
        }
        const parent = result.filePaths[0];
        (0, assert_1.assert)(parent !== undefined, 'Clone destination must exist');
        const name = repository.split('/')[1];
        (0, assert_1.assert)(name !== undefined, 'Repository must have a name');
        const projectPath = (0, node_path_1.join)(parent, name);
        // Exclusive creation protects existing projects, including empty directories.
        (0, node_fs_1.mkdirSync)(projectPath);
        await (0, nodeTools_1.run)('gh', ['repo', 'clone', `https://github.com/${repository}`, '.'], projectPath, {
            timeout: 180000,
        });
        if (!(0, projectFiles_1.isAstroProject)(projectPath)) {
            return {
                canceled: false,
                error: `Downloaded to ${projectPath}, but its root is not an Astro project. ` + 'Use Open Project to choose the Astro folder inside it.',
            };
        }
        return { canceled: false, projectPath };
    });
    ipcMain.handle('git:connect', async (_event, payload) => {
        const environment = await (0, publishGitHub_1.publishingGitEnvironment)(payload.projectPath, (0, publishConfig_1.readPublishConfig)(payload.projectPath));
        const result = await (0, githubRepository_2.connectRepository)((root, argumentsList) => (0, nodeTools_2.git)(root, argumentsList, { env: environment }), payload);
        if (!result.ok) {
            throw new Error(result.error);
        }
        return { ok: true, ...result.value };
    });
}
