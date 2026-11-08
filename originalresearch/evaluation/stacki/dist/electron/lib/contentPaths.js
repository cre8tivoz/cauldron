"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.cmsDirectoryPath = exports.cmsSourcePath = void 0;
exports.cmsIncludesGeneral = cmsIncludesGeneral;
const node_path_1 = __importDefault(require("node:path"));
const cmsSourcePath = (root, relative) => node_path_1.default.resolve(root, relative);
exports.cmsSourcePath = cmsSourcePath;
exports.cmsDirectoryPath = exports.cmsSourcePath;
// Astro sites commonly keep global settings in src/consts.ts or src/constants.ts.
// Recognize those entry points without exposing internal utility constants as content.
function cmsIncludesGeneral(relative) {
    if (/^data\//i.test(relative)) {
        return true;
    }
    return /^(consts|constants)\.(cjs|cts|js|jsx|mjs|mts|ts|tsx)$/i.test(relative);
}
