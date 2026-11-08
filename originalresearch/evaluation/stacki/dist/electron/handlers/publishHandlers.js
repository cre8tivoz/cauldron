"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerPublishHandlers = registerPublishHandlers;
const publishAccount_1 = require("../project/publishAccount");
const publishRepositories_1 = require("../project/publishRepositories");
const publishDiscovery_1 = require("../project/publishDiscovery");
const nodeTools_1 = require("../lib/nodeTools");
const node_path_1 = __importDefault(require("node:path"));
const node_fs_1 = require("node:fs");
const publisher_1 = require("../project/publisher");
const publishAvailability_1 = require("../project/publishAvailability");
const projectMetadata_1 = require("../project/projectMetadata");
const publishSite_1 = require("../project/publishSite");
function registerPublishHandlers(host) {
    const publisher = new publisher_1.DesktopPublisher();
    const account = new publishAccount_1.PublishingAccount();
    host.ipcMain.handle('publish:discover', async (_event, input) => {
        const project = root(input.projectPath);
        await (0, nodeTools_1.ensureToolPath)();
        return (0, publishDiscovery_1.discoverPublishing)(project, input.request);
    });
    const root = (projectPath) => {
        const canonical = (0, node_fs_1.realpathSync)(projectPath);
        host.assertInProject(node_path_1.default.join(canonical, '.stacki', 'publish.json'));
        return canonical;
    };
    host.ipcMain.handle('publish:account', (_event, input) => account.request(root(input.projectPath), input.request));
    host.ipcMain.handle('publish:repository', async (_event, input) => {
        const project = root(input.projectPath);
        await (0, nodeTools_1.ensureToolPath)();
        if (input.request.action !== 'list' && publisher.state(project).kind === 'running') {
            return { ok: false, error: 'Wait for publishing to finish before changing repositories.' };
        }
        return (0, publishRepositories_1.publishingRepositories)(project, input.request);
    });
    host.ipcMain.handle('publish:start', (_event, input) => publisher.start(root(input.projectPath), input.target, input.commitMessage));
    host.ipcMain.handle('publish:state', (_event, projectPath) => publisher.state(root(projectPath)));
    host.ipcMain.handle('publish:availability', (_event, projectPath) => (0, publishAvailability_1.readPublishAvailability)(root(projectPath)));
    host.ipcMain.handle('publish:siteURL', async (_event, projectPath) => {
        const project = root(projectPath);
        await (0, nodeTools_1.ensureToolPath)();
        // URL discovery is independent of the local status check, which must stay responsive offline.
        try {
            const metadata = (0, projectMetadata_1.readProjectMetadata)(project, 'publish');
            return metadata.ok ? await (0, publishSite_1.publishedProjectSiteURL)(project, metadata.value.source) : undefined;
        }
        catch {
            return undefined;
        }
    });
}
