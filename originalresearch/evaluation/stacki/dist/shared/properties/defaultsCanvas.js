"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseCanvasFile = exports.parseCanvasCreate = exports.CANVAS_DIRECTORY = void 0;
exports.isDefaultsCanvas = isDefaultsCanvas;
exports.isCanvasPage = isCanvasPage;
exports.defaultsCanvasFile = defaultsCanvasFile;
exports.defaultsCanvasSource = defaultsCanvasSource;
exports.defaultsCanvasRoute = defaultsCanvasRoute;
const boundary_1 = require("../core/boundary");
const componentDefaults_1 = require("./componentDefaults");
exports.CANVAS_DIRECTORY = '.stacki/canvas/';
function isDefaultsCanvas(file) {
    return /^\.stacki\/canvas\/[a-f0-9-]{36}\.astro$/.test(file);
}
function isCanvasPage(file) {
    return file.startsWith('src/pages/') || isDefaultsCanvas(file);
}
function defaultsCanvasFile(input) {
    const file = (0, boundary_1.text)(input);
    if (!isDefaultsCanvas(file)) {
        throw new Error('Invalid component defaults canvas path');
    }
    return file;
}
function defaultsCanvasSource(input) {
    const source = (0, boundary_1.text)(input);
    if (source.length > componentDefaults_1.DEFAULT_LIMITS.sourceCharsMax) {
        throw new Error('Component defaults canvas exceeds 256 KiB');
    }
    return source;
}
exports.parseCanvasCreate = (0, boundary_1.object)({ file: defaultsCanvasFile, source: defaultsCanvasSource });
exports.parseCanvasFile = (0, boundary_1.object)({ file: defaultsCanvasFile });
function defaultsCanvasRoute(file) {
    return '/__avb/preview?defaults=' + defaultsCanvasFile(file).slice(exports.CANVAS_DIRECTORY.length, -6);
}
