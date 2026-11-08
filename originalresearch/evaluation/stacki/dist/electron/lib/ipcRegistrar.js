"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createIpcRegistrar = createIpcRegistrar;
const ipcPayloads_1 = require("../../shared/ipc/ipcPayloads");
function createIpcRegistrar(ipcMain) {
    return function handle(channel, listener) {
        ipcMain.handle(channel, (event, input) => listener(event, (0, ipcPayloads_1.parseIpcPayload)(channel, input)));
    };
}
