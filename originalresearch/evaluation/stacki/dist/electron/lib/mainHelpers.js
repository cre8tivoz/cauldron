"use strict";
// Small helpers every part of the main process shares: an error's message, a
// regex group that must be there, a JSON file read as unknown, and a path in
// the forward-slash form the renderer and the project files use.
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
exports.isWin = exports.SHORT_COMMAND = exports.parseOptionalString = exports.parseString = exports.parseRecord = exports.parseData = void 0;
exports.toPosix = toPosix;
exports.errorMessage = errorMessage;
exports.capture = capture;
exports.readJson = readJson;
exports.parseDataList = parseDataList;
const mainLimits_1 = require("./mainLimits");
const record_1 = require("../../shared/core/record");
const assert_1 = require("../../shared/core/assert");
const path = __importStar(require("path"));
const boundary_1 = require("../../shared/core/boundary");
Object.defineProperty(exports, "parseData", { enumerable: true, get: function () { return boundary_1.data; } });
Object.defineProperty(exports, "parseRecord", { enumerable: true, get: function () { return boundary_1.record; } });
Object.defineProperty(exports, "parseString", { enumerable: true, get: function () { return boundary_1.text; } });
exports.parseOptionalString = (0, boundary_1.optional)(boundary_1.text);
// A stop or log command: ten seconds, and the output bound stated rather than
// left to Node's default.
exports.SHORT_COMMAND = {
    timeout: 10000,
    maxBuffer: mainLimits_1.MAIN_LIMITS.commandOutputBytesMax,
};
exports.isWin = process.platform === 'win32';
function toPosix(filePath) {
    return filePath.split(path.sep).join('/');
}
function errorMessage(error) {
    return error instanceof Error ? error.message : String(error);
}
function capture(match, index) {
    const value = match[index];
    (0, assert_1.assert)(value !== undefined, `Missing required regex group ${index}`);
    return value;
}
function readJson(file) {
    const input = JSON.parse((0, mainLimits_1.readSource)(file));
    return input;
}
function parseDataList(input) {
    const values = (0, record_1.toArray)(input);
    if (!values) {
        throw new Error('Expected collection array');
    }
    return values;
}
