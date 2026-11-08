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
exports.RUNTIME_PATHS = void 0;
exports.resourcePath = resourcePath;
exports.contentWorkerPath = contentWorkerPath;
// Where the main process finds what it ships with: the preload, the renderer,
// the icons, the scripts served to the preview, and the files the project's
// own dev server loads. This is the one module that reads __dirname for them.
//
// Each path is written as the build output it is, `dist/electron/preload/preload.js`,
// and resolved against dist/ from here (dist/electron/lib), inside app.asar or
// out of it. Written whole, a path is what scripts/move/moveSources.mts
// rewrites when its source moves; built from pieces, it would silently go
// stale.
const path = __importStar(require("path"));
// dist/, the root of the build output: two folders above this module.
const DIST_ROOT = path.join(__dirname, '..', '..');
function distPath(file) {
    if (!file.startsWith('dist/')) {
        throw new Error(`distPath: ${file} is not a build-output path`);
    }
    return path.join(DIST_ROOT, ...file.slice('dist/'.length).split('/'));
}
// The project's dev server is a plain Node process, and plain Node cannot read
// inside app.asar — it would fail the config import and take the whole preview
// down. build.asarUnpack keeps a real copy on disk beside the archive; this
// points at that copy. Outside a package (no asar in the path) it is a no-op.
function unpackedPath(file) {
    return distPath(file).replace(`app.asar${path.sep}`, `app.asar.unpacked${path.sep}`);
}
exports.RUNTIME_PATHS = {
    preload: distPath('dist/electron/preload/preload.js'),
    rendererIndex: distPath('dist/renderer/index.html'),
    morphClient: distPath('dist/electron/previewClient/morphClient.js'),
    previewMarkers: unpackedPath('dist/electron/previewServer/previewMarkers.js'),
    componentPreview: unpackedPath('dist/electron/previewServer/componentPreview.js'),
    studioEntry: unpackedPath('dist/electron/previewServer/studioEntry.js'),
    previewWarmup: unpackedPath('dist/electron/previewServer/previewWarmup.js'),
};
/** An icon or other file the build copies to dist/resources/. */
function resourcePath(name) {
    return path.join(distPath('dist/resources'), name);
}
/** A module the content tooling copies into a project's temporary folder. */
function contentWorkerPath(name) {
    return path.join(distPath('dist/electron/content/workers'), name);
}
