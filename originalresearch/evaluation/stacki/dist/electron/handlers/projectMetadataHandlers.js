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
exports.registerProjectMetadataHandlers = registerProjectMetadataHandlers;
const fs = __importStar(require("node:fs"));
const path = __importStar(require("node:path"));
const projectMetadata_1 = require("../../shared/properties/projectMetadata");
const projectMetadata_2 = require("../project/projectMetadata");
const documentWrites_1 = require("../documents/documentWrites");
const projectExclusions_1 = require("../lib/projectExclusions");
function registerProjectMetadataHandlers(host) {
    const root = (projectPath, kind) => {
        const canonical = fs.realpathSync(projectPath);
        host.assertInProject(path.join(canonical, projectMetadata_1.METADATA_FILES[kind]));
        return canonical;
    };
    host.ipcMain.handle('project:metadata', (_event, input) => (0, projectMetadata_2.readProjectMetadata)(root(input.projectPath, input.kind), input.kind));
    host.ipcMain.handle('project:writeMetadata', (_event, input) => (0, projectMetadata_2.writeProjectMetadata)(root(input.projectPath, input.write.kind), input.write));
    host.ipcMain.handle('project:createDefaultsCanvas', (_event, input) => {
        const project = root(input.projectPath, 'components');
        const file = canvasPath(project, input.canvas.file);
        const directory = path.dirname(file);
        fs.mkdirSync(directory, { recursive: true });
        if (fs.readdirSync(directory).length >= 64) {
            throw new Error('Too many defaults previews. Close an existing preview first.');
        }
        (0, documentWrites_1.createProjectText)(file, input.canvas.source);
        (0, projectExclusions_1.ensureExcluded)(project);
        return { file: input.canvas.file };
    });
    host.ipcMain.handle('project:removeDefaultsCanvas', (_event, input) => {
        const project = root(input.projectPath, 'components');
        fs.rmSync(canvasPath(project, input.file), { force: true });
        return undefined;
    });
}
function canvasPath(root, relative) {
    const file = path.join(root, relative);
    for (const candidate of [path.join(root, '.stacki'), path.dirname(file), file]) {
        if (fs.existsSync(candidate) && fs.lstatSync(candidate).isSymbolicLink()) {
            throw new Error('Defaults previews cannot be symbolic links.');
        }
    }
    return file;
}
