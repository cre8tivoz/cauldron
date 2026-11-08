"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IPC_PAYLOADS = exports.parseIpcPayload = void 0;
exports.parseSymbolReadResult = parseSymbolReadResult;
exports.parseResolvePathResult = parseResolvePathResult;
exports.parseTextResult = parseTextResult;
exports.parseOkResult = parseOkResult;
// One contract for all invoke channels. Payload parsers run in main before
// side effects; result types are checked at registration. Rejected operating
// errors keep Electron's existing Promise-rejection channel during migration.
const boundary_1 = require("../core/boundary");
var ipcPayloads_1 = require("./ipcPayloads");
Object.defineProperty(exports, "parseIpcPayload", { enumerable: true, get: function () { return ipcPayloads_1.parseIpcPayload; } });
Object.defineProperty(exports, "IPC_PAYLOADS", { enumerable: true, get: function () { return ipcPayloads_1.IPC_PAYLOADS; } });
// --- Parsers for the small result unions -----------------------------------
// Built on the bounded boundary parsers, so a result's text, path and line obey
// the same wire limits as every payload.
function parseSymbolReadResult(input) {
    const value = (0, boundary_1.record)(input);
    if (value['ok'] === false) {
        const reason = value['reason'];
        if (reason === undefined) {
            return { ok: false };
        }
        if (reason === 'not-found' || reason === 'too-large') {
            return { ok: false, reason };
        }
        throw new Error(`SymbolReadResult: unknown reason ${JSON.stringify(reason)}`);
    }
    if (value['ok'] !== true) {
        throw new Error('SymbolReadResult.ok: expected boolean');
    }
    return {
        ok: true,
        rel: (0, boundary_1.pathText)(value['rel']),
        text: (0, boundary_1.text)(value['text']),
        line: (0, boundary_1.count)(value['line']),
    };
}
function parseResolvePathResult(input) {
    const value = (0, boundary_1.record)(input);
    if (value['ok'] === false) {
        return { ok: false };
    }
    if (value['ok'] !== true) {
        throw new Error('ResolvePathResult.ok: expected boolean');
    }
    return { ok: true, rel: (0, boundary_1.pathText)(value['rel']) };
}
function parseTextResult(input) {
    return { text: (0, boundary_1.text)((0, boundary_1.record)(input)['text']) };
}
function parseOkResult(input) {
    if ((0, boundary_1.record)(input)['ok'] !== true) {
        throw new Error('OkResult.ok: expected true');
    }
    return { ok: true };
}
