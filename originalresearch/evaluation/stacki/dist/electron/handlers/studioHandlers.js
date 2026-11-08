"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerStudioHandlers = registerStudioHandlers;
const path = __importStar(require("node:path"));
// Setup is scoped to the open project. Local bundles are selected in main,
// never accepted as arbitrary paths from renderer input.
const studioSetup_1 = require("../project/studioSetup");
const mainHelpers_1 = require("../lib/mainHelpers");
const studioProgress_1 = require("../project/studioProgress");
function registerStudioHandlers(host, environment, desktopVersion) {
    host.ipcMain.handle('studio:status', (_event, project) => (0, studioSetup_1.studioStatus)(path.dirname(host.assertInProject(path.join(project, 'studio'))), desktopVersion()));
    host.ipcMain.handle('studio:install', async (_event, options) => {
        const project = path.dirname(host.assertInProject(path.join(options.projectPath, 'studio')));
        const progress = (0, studioProgress_1.createStudioProgress)({ projectPath: options.projectPath, requestId: options.requestId }, (value) => host.send('studio:progress', value));
        try {
            const status = await (0, studioSetup_1.studioStatus)(project, desktopVersion());
            if (status.kind !== 'missing') {
                return {
                    kind: 'error',
                    message: 'Studio already exists. Setup does not replace existing files.',
                };
            }
            progress.update({ kind: 'stage', stage: 'release' });
            const release = await selectRelease(host, options.source, desktopVersion(), environment);
            if (!release) {
                return { kind: 'canceled' };
            }
            return {
                kind: 'installed',
                version: await (0, studioSetup_1.installStudio)(project, release, progress.update),
            };
        }
        catch (error) {
            return { kind: 'error', message: (0, mainHelpers_1.errorMessage)(error) };
        }
        finally {
            progress.close();
        }
    });
}
async function selectRelease(host, source, version, environment) {
    if (source === 'published') {
        return (0, studioSetup_1.automaticStudio)(version, environment);
    }
    const selection = await host.showOpenDialog({
        title: 'Choose a trusted Stacki Studio release bundle',
        properties: ['openFile'],
        filters: [{ name: 'Studio release', extensions: ['json'] }],
    });
    const file = selection.filePaths[0];
    return selection.canceled || !file ? undefined : (0, studioSetup_1.readStudioRelease)(file);
}
