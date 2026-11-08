"use strict";
// The variables panel's IPC: the CSS custom properties a project declares,
// and the edits that add, move, rename and group them.
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
exports.registerCssVariableHandlers = registerCssVariableHandlers;
const cssVars = __importStar(require("../project/cssVars"));
const mainHelpers_1 = require("../lib/mainHelpers");
function registerCssVariableHandlers(host) {
    registerCssVariablesHandlers(host);
    registerCssAddSectionHandlers(host);
}
function registerCssVariablesHandlers({ ipcMain, send }) {
    // The collections themselves, with counts, for the panel that lists them.
    // Every CSS custom property in the project, grouped the way the stylesheets
    // themselves group them — see cssVars.js for what "the way" means.
    ipcMain.handle('css:variables', async (_event, projectPath) => {
        try {
            return cssVars.readVariables(projectPath);
        }
        catch (error) {
            return { files: [], error: (0, mainHelpers_1.errorMessage)(error) };
        }
    });
    // A variable added at the bottom of a group. One call carries several: a row in
    // a table of modes is one name in every mode, and a row in a family is one
    // property of every member.
    ipcMain.handle('css:addVariables', async (_event, { projectPath, adds }) => {
        let last = { ok: true };
        for (const add of adds || []) {
            last = cssVars.addVariable(projectPath, add);
            if (!last.ok) {
                break;
            }
        }
        if (last.ok) {
            send('css:changed', {});
        }
        return last;
    });
    // A row dragged to a new place: the declaration moves inside its rule, which is
    // where the order actually lives.
    ipcMain.handle('css:moveVariables', async (_event, { projectPath, moves }) => {
        let last = { ok: true };
        for (const move of moves || []) {
            // A group carries its heading and every line under it; a row is one line.
            last = 'names' in move ? cssVars.moveSection(projectPath, move) : cssVars.moveVariable(projectPath, move);
            if (!last.ok) {
                break;
            }
        }
        if (last.ok) {
            send('css:changed', {});
        }
        return last;
    });
    // A heading that is a comment rather than a shared name: renaming it rewrites
    // the comment, in place, the same way a value is written.
    ipcMain.handle('css:setSectionTitle', async (_event, { projectPath, ...edit }) => {
        const result = cssVars.setSectionTitle(projectPath, edit);
        if (result.ok) {
            send('css:changed', {});
        }
        return result;
    });
    // A heading is a line between declarations: removing it joins the runs either
    // side, and adding one splits them.
    ipcMain.handle('css:removeSection', async (_event, { projectPath, ...edit }) => {
        const result = cssVars.removeSection(projectPath, edit);
        if (result.ok) {
            send('css:changed', {});
        }
        return result;
    });
    ipcMain.handle('css:moveHeading', async (_event, { projectPath, ...edit }) => {
        const result = cssVars.moveHeading(projectPath, edit);
        if (result.ok) {
            send('css:changed', {});
        }
        return result;
    });
}
function registerCssAddSectionHandlers({ ipcMain, send }) {
    ipcMain.handle('css:addSection', async (_event, { projectPath, ...edit }) => {
        const result = cssVars.addSection(projectPath, edit);
        if (result.ok) {
            send('css:changed', {});
        }
        return result;
    });
    // Renaming reaches every file that mentions the name, so it is one call rather
    // than one per file: the panel says which names become which, and either all of
    // them move or none does.
    ipcMain.handle('css:renameVariables', async (_event, { projectPath, renames }) => {
        const result = cssVars.renameVariables(projectPath, { renames });
        if (result.ok) {
            send('css:changed', {});
        }
        return result;
    });
    // One value, replaced where it sits. The old value is sent back with the new
    // one: if the file no longer says what the panel was showing, somebody else has
    // edited it and the offsets are meaningless.
    ipcMain.handle('css:setVariable', async (_event, { projectPath, ...edit }) => {
        const result = cssVars.setVariable(projectPath, edit);
        if (result.ok) {
            send('css:changed', {});
        }
        return result;
    });
}
