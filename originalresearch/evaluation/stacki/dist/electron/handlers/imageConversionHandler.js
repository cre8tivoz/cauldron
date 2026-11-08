"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerImageConversionHandler = registerImageConversionHandler;
const importPaths_1 = require("../properties/importPaths");
const imageConversion_1 = require("../project/imageConversion");
function registerImageConversionHandler(host) {
    // Image codecs and multi-file rewrites run one at a time, with no growing queue.
    let running = false;
    host.ipcMain.handle('assets:convert', async (_event, payload) => {
        if (running) {
            throw new Error('Another image is being converted. Try again when it finishes.');
        }
        running = true;
        try {
            const result = await (0, imageConversion_1.convertImage)({
                ...payload,
                aliases: (0, importPaths_1.projectAliases)(payload.projectPath),
                trash: (file) => host.shell.trashItem(file),
            });
            host.noteAppWrite();
            host.send('assets:changed', {});
            if (!result.ok) {
                throw new Error(result.error);
            }
            return result.value;
        }
        finally {
            running = false;
        }
    });
}
