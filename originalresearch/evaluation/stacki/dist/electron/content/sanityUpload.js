"use strict";
// Storing an image or file in a Sanity dataset, from a file the person chose.
// Sanity keeps it as an asset document; the panel then writes a field that
// points at it, as Sanity Studio does. The file goes straight from disk to
// Sanity's assets API with the connection's key; nothing else is sent.
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SANITY_UPLOAD_BYTES_MAX = exports.IMAGE_EXTENSIONS = void 0;
exports.sanityUpload = sanityUpload;
exports.sanityUploadBytes = sanityUploadBytes;
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
const assert_1 = require("../../shared/core/assert");
const sanityContent_1 = require("./sanityContent");
// The largest file uploaded from the panel, and how long one may take.
const UPLOAD_BYTES_MAX = 100 * 1024 * 1024;
const UPLOAD_TIMEOUT_MS = 120_000;
exports.IMAGE_EXTENSIONS = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'avif', 'svg', 'tif', 'tiff'];
/** Uploads a file the system dialog picked (Desktop). */
async function sanityUpload(target, kind, file) {
    (0, assert_1.assert)(node_path_1.default.isAbsolute(file), 'An upload reads an absolute path the dialog returned');
    if (node_fs_1.default.statSync(file).size > UPLOAD_BYTES_MAX) {
        throw new Error('This file is larger than 100 MB.');
    }
    return sanityUploadBytes(target, kind, node_path_1.default.basename(file), node_fs_1.default.readFileSync(file));
}
/** Uploads a file's bytes under its name (Desktop's dialog, or a browser in Studio). */
async function sanityUploadBytes(target, kind, name, bytes) {
    const filename = node_path_1.default.basename(name).slice(0, 200) || 'upload';
    if (bytes.byteLength > UPLOAD_BYTES_MAX) {
        throw new Error('This file is larger than 100 MB.');
    }
    const extension = node_path_1.default.extname(filename).slice(1).toLowerCase();
    if (kind === 'image' && !exports.IMAGE_EXTENSIONS.includes(extension)) {
        throw new Error('Choose an image file.');
    }
    (0, assert_1.assert)(bytes.byteLength <= UPLOAD_BYTES_MAX, 'An upload stays within its size bound');
    const url = `https://${target.projectId}.api.sanity.io/${sanityContent_1.SANITY_API_VERSION}/assets/` +
        `${kind === 'image' ? 'images' : 'files'}/${target.dataset}` +
        `?filename=${encodeURIComponent(filename)}`;
    const response = await fetch(url, {
        method: 'POST',
        headers: { Authorization: `Bearer ${target.token}`, 'Content-Type': mimeOf(extension) },
        // A copy on its own ArrayBuffer: what fetch takes as a body in every runtime.
        body: new Uint8Array(bytes),
        redirect: 'error',
        signal: AbortSignal.timeout(UPLOAD_TIMEOUT_MS),
    });
    const text = await response.text();
    const body = text ? JSON.parse(text) : undefined;
    if (!response.ok) {
        throw new Error(`Sanity did not accept the upload (${response.status}).`);
    }
    return assetOf(body, filename);
}
/** The largest file the CMS panel uploads, for a host to bound a request body by. */
exports.SANITY_UPLOAD_BYTES_MAX = UPLOAD_BYTES_MAX;
function assetOf(body, filename) {
    const document = typeof body === 'object' && body !== null ? Reflect.get(body, 'document') : undefined;
    const id = typeof document === 'object' && document !== null ? Reflect.get(document, '_id') : undefined;
    const url = typeof document === 'object' && document !== null ? Reflect.get(document, 'url') : undefined;
    if (typeof id !== 'string' || typeof url !== 'string' || !url.startsWith('https://')) {
        throw new Error('Sanity returned an unexpected asset.');
    }
    return { id, url, filename };
}
function mimeOf(extension) {
    const types = {
        png: 'image/png',
        jpg: 'image/jpeg',
        jpeg: 'image/jpeg',
        gif: 'image/gif',
        webp: 'image/webp',
        avif: 'image/avif',
        svg: 'image/svg+xml',
        tif: 'image/tiff',
        tiff: 'image/tiff',
        pdf: 'application/pdf',
    };
    return types[extension] ?? 'application/octet-stream';
}
