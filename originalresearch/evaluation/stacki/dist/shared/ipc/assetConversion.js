"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseConversionResult = exports.IMAGE_BATCH_MAX = void 0;
exports.parseImageFormat = parseImageFormat;
exports.parseImagePath = parseImagePath;
const assert_1 = require("../core/assert");
const boundary_1 = require("../core/boundary");
exports.IMAGE_BATCH_MAX = 100;
function parseImageFormat(input) {
    if (input !== 'webp' && input !== 'avif') {
        throw new Error('Image format must be webp or avif.');
    }
    return input;
}
function parseImagePath(input) {
    const value = (0, boundary_1.pathText)(input);
    if (!/^(public|src)\/.+\.(png|jpe?g|webp|avif|tiff?)$/i.test(value) ||
        value.split('/').some((part) => part === '..' || part === '.' || part === '') ||
        value.includes('\\')) {
        throw new Error('Choose a raster image inside public/ or src/.');
    }
    (0, assert_1.assert)(!value.startsWith('/'), 'Image parser produces a project-relative path');
    (0, assert_1.assert)(value.split('/').length >= 2, 'Image parser preserves the asset root');
    return value;
}
exports.parseConversionResult = (0, boundary_1.object)({
    rel: parseImagePath,
    references: boundary_1.count,
    bytesBefore: boundary_1.count,
    bytesAfter: boundary_1.count,
});
