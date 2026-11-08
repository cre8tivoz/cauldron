"use strict";
// Studio's local folders, made ready and moved into `.stacki/studio/` once.
// Called wherever Studio is about to read or write them — the desktop app's
// local Studio, Studio's own server, and the updater — so a project from an
// older Studio keeps its drafts, history and backups under the new layout.
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.prepareStudioLocal = prepareStudioLocal;
const node_fs_1 = require("node:fs");
const node_path_1 = __importDefault(require("node:path"));
const studioLocal_1 = require("../../shared/properties/studioLocal");
const assert_1 = require("../../shared/core/assert");
function prepareStudioLocal(project) {
    const local = node_path_1.default.join(project, studioLocal_1.STUDIO_LOCAL_DIRECTORY);
    (0, node_fs_1.mkdirSync)(local, { recursive: true });
    if ((0, node_fs_1.lstatSync)(local).isSymbolicLink()) {
        throw new Error('Studio storage must be a real directory');
    }
    // Everything under here is this machine's own: drafts, history, backups.
    const ignore = node_path_1.default.join(local, '.gitignore');
    if (!(0, node_fs_1.existsSync)(ignore)) {
        (0, node_fs_1.writeFileSync)(ignore, '*\n', { flag: 'wx' });
    }
    for (const [next, legacy] of Object.entries(studioLocal_1.STUDIO_LEGACY_DIRECTORIES)) {
        moveLegacy(node_path_1.default.join(project, legacy), node_path_1.default.join(project, next));
    }
    (0, assert_1.assert)((0, node_fs_1.existsSync)(ignore), 'Studio storage ignores its own contents');
}
// An older folder moves whole, in one rename, so a draft is never half moved.
// Once the new one exists the old one is left alone: two copies are never merged.
function moveLegacy(legacy, next) {
    (0, assert_1.assert)(node_path_1.default.basename(legacy) !== '', 'An older folder has a name');
    if (!(0, node_fs_1.existsSync)(legacy) || (0, node_fs_1.existsSync)(next)) {
        return;
    }
    if ((0, node_fs_1.lstatSync)(legacy).isSymbolicLink()) {
        throw new Error(`${node_path_1.default.basename(legacy)} must be a real directory to move`);
    }
    (0, node_fs_1.renameSync)(legacy, next);
    (0, assert_1.assert)((0, node_fs_1.existsSync)(next), 'The moved Studio folder is in place');
}
