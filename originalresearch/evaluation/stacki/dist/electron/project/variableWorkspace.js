"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.variableFiles = exports.MAIN_LIMITS = exports.writeProjectText = void 0;
const node_fs_1 = __importDefault(require("node:fs"));
var documentWrites_1 = require("../documents/documentWrites");
Object.defineProperty(exports, "writeProjectText", { enumerable: true, get: function () { return documentWrites_1.writeProjectText; } });
var mainLimits_1 = require("../lib/mainLimits");
Object.defineProperty(exports, "MAIN_LIMITS", { enumerable: true, get: function () { return mainLimits_1.MAIN_LIMITS; } });
exports.variableFiles = {
    readFileSync: (file, encoding) => node_fs_1.default.readFileSync(file, encoding),
    readdirSync: (directory, options) => node_fs_1.default.readdirSync(directory, options),
    statSync: (file) => node_fs_1.default.statSync(file),
};
