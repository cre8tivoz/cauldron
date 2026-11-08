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
exports.registerSelectorHandlers = registerSelectorHandlers;
// The unused-selector IPC: check the project, remove proven-unused selectors,
// and undo or redo a removal. The keep list is read from `.stacki/styles.json`
// on every call, so a selector locked a moment ago is never removed.
const fs = __importStar(require("node:fs"));
const path = __importStar(require("node:path"));
const result_1 = require("../../shared/core/result");
const projectMetadata_1 = require("../../shared/properties/projectMetadata");
const styleKeepList_1 = require("../../shared/properties/styleKeepList");
const projectMetadata_2 = require("../project/projectMetadata");
const selectorRemoval_1 = require("../properties/selectorRemoval");
function registerSelectorHandlers(host) {
    const root = (projectPath) => {
        // The same containment check the metadata handlers make: the open
        // project's own settings file must be inside the open project.
        const canonical = fs.realpathSync(projectPath);
        host.assertInProject(path.join(canonical, projectMetadata_1.METADATA_FILES.styles));
        return canonical;
    };
    host.ipcMain.handle('style:selectorUsage', async (_event, input) => {
        const project = root(input.projectPath);
        const keepList = readKeepList(project);
        if (!keepList.ok) {
            return keepList;
        }
        return (0, result_1.ok)((await (0, selectorRemoval_1.checkSelectorUsage)(project, keepList.value, input.packages ?? 'search')).report);
    });
    host.ipcMain.handle('style:removeSelectors', async (_event, input) => {
        const project = root(input.projectPath);
        for (const file of input.files) {
            host.assertInProject(path.join(project, file.rel));
        }
        const keepList = readKeepList(project);
        if (!keepList.ok) {
            return keepList;
        }
        return (0, selectorRemoval_1.removeUnusedSelectors)(project, keepList.value, { ids: input.ids, files: input.files });
    });
    host.ipcMain.handle('style:restoreSelectors', (_event, input) => {
        const project = root(input.projectPath);
        for (const change of input.changes) {
            host.assertInProject(path.join(project, change.rel));
        }
        return (0, selectorRemoval_1.restoreSelectorFiles)(project, input.changes, input.to);
    });
}
function readKeepList(project) {
    const stored = (0, projectMetadata_2.readProjectMetadata)(project, 'styles');
    if (!stored.ok) {
        return stored;
    }
    if (stored.value.source === undefined) {
        return (0, result_1.ok)(styleKeepList_1.EMPTY_KEEP_LIST);
    }
    try {
        const input = JSON.parse(stored.value.source);
        return (0, result_1.ok)((0, styleKeepList_1.parseStyleKeepList)(input));
    }
    catch (error) {
        return (0, result_1.err)({ code: 'keep-list', message: `.stacki/styles.json is invalid: ${error instanceof Error ? error.message : String(error)}` });
    }
}
