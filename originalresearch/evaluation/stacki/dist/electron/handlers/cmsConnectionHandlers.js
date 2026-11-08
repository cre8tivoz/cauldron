"use strict";
// CMS connections over IPC: list, save (with a pasted key), remove, and the
// "Log in with Sanity" steps. Keys come in once, with a save, and never go back
// out: every reply is the public half of a connection.
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.failureMessage = void 0;
exports.registerCmsConnectionHandlers = registerCmsConnectionHandlers;
const node_path_1 = __importDefault(require("node:path"));
const node_fs_1 = __importStar(require("node:fs"));
const cmsRemoteService_1 = require("../content/cmsRemoteService");
const linkPreview_1 = require("../content/linkPreview");
const sanityUpload_1 = require("../content/sanityUpload");
function registerCmsConnectionHandlers(host, store, login) {
    // The open project only, by its real path: connections are keyed by it.
    const root = (projectPath) => {
        const canonical = (0, node_fs_1.realpathSync)(projectPath);
        host.assertInProject(node_path_1.default.join(canonical, 'package.json'));
        return canonical;
    };
    host.ipcMain.handle('cmsConnections:list', (_event, input) => store.list(root(input.projectPath)));
    host.ipcMain.handle('cmsConnections:save', (_event, input) => {
        const project = root(input.projectPath);
        try {
            store.save(project, input.draft);
        }
        catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            return { ok: false, message: message.slice(0, 900) || 'Could not save the connection.' };
        }
        return { ok: true, list: store.list(project) };
    });
    host.ipcMain.handle('cmsConnections:remove', (_event, input) => {
        const project = root(input.projectPath);
        store.remove(project, input.id);
        return store.list(project);
    });
    host.ipcMain.handle('cmsConnections:sanityLogin', (_event, input) => login.request(root(input.projectPath), input.request));
    registerCmsRemoteHandlers(host, store, root);
    // A video link's card in a CMS field; the payload parser admits video host links only.
    host.ipcMain.handle('cmsRemote:linkPreview', (_event, input) => remote(() => (0, linkPreview_1.fetchLinkPreview)(input.url)));
}
// The CMS panel's reads and draft writes, against one saved connection
// (cmsRemoteService.ts). Its key is decrypted here, for the request, and never
// returned.
function registerCmsRemoteHandlers(host, store, root) {
    const service = connectionService(store, root);
    const { ipcMain } = host;
    ipcMain.handle('cmsRemote:collections', (_event, input) => remote(() => service(input.projectPath, input.connectionId).collections()));
    ipcMain.handle('cmsRemote:documents', (_event, input) => remote(() => service(input.projectPath, input.connectionId).documents(input.collection, input.columns ?? [])));
    ipcMain.handle('cmsRemote:create', (_event, input) => remote(() => service(input.projectPath, input.connectionId).create(input.collection)));
    ipcMain.handle('cmsRemote:delete', (_event, input) => remote(() => service(input.projectPath, input.connectionId).remove(input.ids)));
    ipcMain.handle('cmsRemote:move', (_event, input) => remote(() => service(input.projectPath, input.connectionId).move(input.move)));
    ipcMain.handle('cmsRemote:document', (_event, input) => remote(() => service(input.projectPath, input.connectionId).document(input.id)));
    ipcMain.handle('cmsRemote:template', (_event, input) => remote(() => service(input.projectPath, input.connectionId).template(input.collection)));
    ipcMain.handle('cmsRemote:write', (_event, input) => remote(() => service(input.projectPath, input.connectionId).write(input.write)));
    ipcMain.handle('cmsRemote:act', (_event, input) => remote(() => service(input.projectPath, input.connectionId).act(input.id, input.action)));
    ipcMain.handle('cmsRemote:history', (_event, input) => remote(() => service(input.projectPath, input.connectionId).history(input.id)));
    ipcMain.handle('cmsRemote:restore', (_event, input) => remote(() => service(input.projectPath, input.connectionId).restore(input.id, input.revision)));
    ipcMain.handle('cmsRemote:references', (_event, input) => remote(() => service(input.projectPath, input.connectionId).references(input.types)));
    // The person picks the file in the system dialog; a cancel is no asset, not a failure.
    ipcMain.handle('cmsRemote:upload', (_event, input) => remote(async () => {
        const target = service(input.projectPath, input.connectionId);
        const picked = await host.showOpenDialog({
            title: input.kind === 'image' ? 'Choose an image' : 'Choose a file',
            properties: ['openFile'],
            filters: input.kind === 'image' ? [{ name: 'Images', extensions: sanityUpload_1.IMAGE_EXTENSIONS }] : [],
        });
        const file = picked.filePaths[0];
        if (picked.canceled || file === undefined) {
            return undefined;
        }
        if (node_fs_1.default.statSync(file).size > sanityUpload_1.SANITY_UPLOAD_BYTES_MAX) {
            throw new Error('This file is larger than 100 MB.');
        }
        return target.upload(input.kind, { name: node_path_1.default.basename(file), bytes: node_fs_1.default.readFileSync(file) });
    }));
}
// The service for one saved connection, its key decrypted for this request only.
function connectionService(store, root) {
    return (projectPath, connectionId) => {
        const project = root(projectPath);
        const connection = store.list(project).connections.find((entry) => entry.id === connectionId);
        if (!connection) {
            throw new Error('This CMS connection was removed. Reconnect it in Settings.');
        }
        if (connection.kind !== 'sanity') {
            throw new Error('Browsing this CMS in Stacki is not available yet.');
        }
        const token = store.secret(project, connection.id);
        if (token === undefined) {
            throw new Error('Stacki could not read this connection’s key. Reconnect it in Settings.');
        }
        return (0, cmsRemoteService_1.cmsRemoteService)(project, {
            projectId: connection.projectId,
            dataset: connection.dataset,
            token,
        });
    };
}
// Expected failures — offline, a revoked key, a removed document — are answers,
// not crashes: the panel shows them where the person is looking.
async function remote(run) {
    try {
        return { ok: true, value: await run() };
    }
    catch (error) {
        return { ok: false, message: (0, exports.failureMessage)(error).slice(0, 900) };
    }
}
/** A failure as the panel says it (cmsRemoteService.ts). */
exports.failureMessage = cmsRemoteService_1.cmsFailureMessage;
