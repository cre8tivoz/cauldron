"use strict";
// A project's asset files: the folders they live in, a path inside one,
// a name that is free, the tree the assets panel lists, and an image's pixel
// size read from its header.
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
exports.rootOfRel = exports.MEDIA_EXT = exports.ASSET_ROOTS = exports.publicDirectoryOf = void 0;
exports.assetAbs = assetAbs;
exports.uniqueTarget = uniqueTarget;
exports.imageSizeOf = imageSizeOf;
exports.listAssetTree = listAssetTree;
exports.webpImageSize = webpImageSize;
const mainLimits_1 = require("../lib/mainLimits");
const platform_1 = require("../lib/platform");
const assert_1 = require("../../shared/core/assert");
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const mainHelpers_1 = require("../lib/mainHelpers");
// ---------------------------------------------------------------------------
// Assets (public/) — list, upload, move, rename, folders
// ---------------------------------------------------------------------------
const publicDirectoryOf = (projectPath) => path.join(projectPath, 'public');
exports.publicDirectoryOf = publicDirectoryOf;
// Assets live in two places and they mean different things:
//
//   public/  copied to the site as-is; referenced by URL ("/hero.png")
//   src/     imported by the build; referenced by ESM import, and optimised
//            (this is where <Image> wants its images)
//
// So an asset is addressed by a ROOTED rel — "public/img/hero.png" or
// "src/assets/hero.png" — and every handler below takes that. The root is the
// first segment, which keeps one string identifying a file across listing,
// moving, renaming and picking, and makes a cross-root move just a move.
exports.ASSET_ROOTS = ['public', 'src'];
// Media only under src/: everything else there is code. public/ lists whatever
// is in it — that folder exists to be served.
exports.MEDIA_EXT = new RegExp('\\.(png|jpe?g|gif|webp|avif|svg|ico|bmp|tiff?|' + 'mp4|webm|mov|m4v|ogv|mp3|wav|ogg|m4a|flac|aac|woff2?|ttf|otf|eot)$', 'i');
const rootOfRel = (rel) => String(rel || '').split('/')[0] ?? '';
exports.rootOfRel = rootOfRel;
// Refuses anything that escapes the two roots.
function assetAbs(projectPath, rel) {
    const clean = String(rel || '').replace(/^\/+/, '');
    const root = (0, exports.rootOfRel)(clean);
    if (!exports.ASSET_ROOTS.includes(root)) {
        throw new Error('Invalid asset path');
    }
    const rootAbs = path.resolve(projectPath, root);
    const abs = path.resolve(projectPath, clean);
    if (!(0, platform_1.isPathWithin)(rootAbs, abs)) {
        throw new Error('Invalid asset path');
    }
    return abs;
}
// A destination name that doesn't collide: name.ext, name-1.ext, name-2.ext and on.
function uniqueTarget(directory, name) {
    const ext = path.extname(name);
    const base = path.basename(name, ext);
    let candidate = name;
    let i = 1;
    while (fs.existsSync(path.join(directory, candidate))) {
        if (i > mainLimits_1.MAIN_LIMITS.fileNameAttemptsMax) {
            throw new Error('File name attempts exceed limit');
        }
        candidate = `${base}-${i++}${ext}`;
    }
    return path.join(directory, candidate);
}
// An image's pixel size, read from the file's own header.
//
// Astro takes the intrinsic size straight from a local asset — only a remote
// source gets `inferSize`. So a width/height field over a project file should
// say what that size IS, and to do that the app has to know it without waiting
// for a thumbnail somewhere to finish decoding.
function imageSizeOf(abs) {
    let fd;
    try {
        fd = fs.openSync(abs, 'r');
        const head = Buffer.alloc(32768);
        const read = fs.readSync(fd, head, 0, head.length, 0);
        const buf = head.subarray(0, read);
        // PNG: IHDR is always the first chunk.
        if (buf.length > 24 && buf.toString('binary', 1, 4) === 'PNG') {
            return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) };
        }
        // GIF: little-endian in the logical screen descriptor.
        if (buf.length > 10 && buf.toString('binary', 0, 3) === 'GIF') {
            return { w: buf.readUInt16LE(6), h: buf.readUInt16LE(8) };
        }
        const webp = webpImageSize(buf);
        if (webp) {
            return webp;
        }
        // JPEG: walk the segments to the start-of-frame, which carries the size.
        if (buf.length > 4 && buf[0] === 0xff && buf[1] === 0xd8) {
            let at = 2;
            while (at + 9 < buf.length) {
                if (buf[at] !== 0xff) {
                    at += 1;
                    continue;
                }
                const marker = buf.readUInt8(at + 1);
                const segmentLength = buf.readUInt16BE(at + 2);
                // SOF0…SOF15, minus the four that aren't frame headers.
                if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc, 0xd8].includes(marker)) {
                    return { h: buf.readUInt16BE(at + 5), w: buf.readUInt16BE(at + 7) };
                }
                at += 2 + segmentLength;
            }
        }
        // SVG: width/height when they're absolute, else the viewBox's own units.
        if (/\.svg$/i.test(abs)) {
            const text = buf.toString('utf8');
            const tag = text.match(/<svg\b[^>]*>/i)?.[0] || '';
            const dimension = (name) => {
                const raw = tag.match(new RegExp(`\\b${name}\\s*=\\s*["']([^"']+)["']`, 'i'))?.[1];
                return raw && /^[\d.]+(px)?$/i.test(raw.trim()) ? Math.round(parseFloat(raw)) : undefined;
            };
            const width = dimension('width');
            const height = dimension('height');
            if (width && height) {
                return { w: width, h: height };
            }
            const box = tag.match(/\bviewBox\s*=\s*["']\s*[-\d.]+\s+[-\d.]+\s+([\d.]+)\s+([\d.]+)/i);
            if (box) {
                return {
                    w: Math.round(parseFloat((0, mainHelpers_1.capture)(box, 1))),
                    h: Math.round(parseFloat((0, mainHelpers_1.capture)(box, 2))),
                };
            }
        }
    }
    catch {
        /* unreadable or a format we don't decode — the caller falls back */
    }
    finally {
        if (fd !== undefined) {
            try {
                fs.closeSync(fd);
            }
            catch {
                /* already gone */
            }
        }
    }
    return undefined;
}
function listAssetTree(root, rel, options) {
    const entries = [];
    // Folders are only worth showing when something is in them, which for src/
    // means "holds media somewhere below" — otherwise every component folder in
    // the project would show up as an empty asset folder.
    const checkDirectory = (0, mainLimits_1.directoryBudget)(root);
    const mediaOnly = options.mediaOnly;
    const walk = (directory, rel, depth) => {
        let held = false;
        let names = [];
        try {
            names = fs.readdirSync(directory, { withFileTypes: true });
        }
        catch {
            return false;
        }
        checkDirectory(directory, names.length);
        (0, assert_1.assert)(depth <= mainLimits_1.MAIN_LIMITS.directoryDepthMax, 'listAssetTree: the budget bounds depth');
        for (const entry of names) {
            if (entry.name.startsWith('.') || entry.name === 'node_modules') {
                continue;
            }
            const full = path.join(directory, entry.name);
            const entryRel = `${rel}/${entry.name}`;
            if (entry.isDirectory()) {
                const at = entries.length;
                const placeholder = {
                    rel: entryRel,
                    name: entry.name,
                    parent: rel,
                    isDir: true,
                    root: (0, exports.rootOfRel)(rel),
                };
                entries.push(placeholder);
                const any = walk(full, entryRel, depth + 1);
                if (any) {
                    held = true;
                }
                else if (mediaOnly) {
                    entries.splice(at, 1);
                } // nothing below it — not an asset folder
            }
            else {
                if (mediaOnly && !exports.MEDIA_EXT.test(entry.name)) {
                    continue;
                }
                let size = 0;
                try {
                    size = fs.statSync(full).size;
                }
                catch {
                    /* race */
                }
                held = true;
                entries.push({
                    rel: entryRel,
                    name: entry.name,
                    parent: rel,
                    isDir: false,
                    size,
                    abs: full,
                    root: (0, exports.rootOfRel)(rel),
                });
            }
        }
        return held;
    };
    walk(root, rel, 0);
    return entries;
}
function webpImageSize(buf) {
    // WebP: VP8 (lossy), VP8L (lossless) and VP8X (extended) each differ.
    if (buf.length > 30 && buf.toString('binary', 0, 4) === 'RIFF' && buf.toString('binary', 8, 12) === 'WEBP') {
        const kind = buf.toString('binary', 12, 16);
        if (kind === 'VP8 ') {
            return { w: buf.readUInt16LE(26) & 0x3fff, h: buf.readUInt16LE(28) & 0x3fff };
        }
        if (kind === 'VP8L') {
            const bits = buf.readUInt32LE(21);
            return { w: (bits & 0x3fff) + 1, h: ((bits >> 14) & 0x3fff) + 1 };
        }
        if (kind === 'VP8X') {
            const width = 1 + buf.readUIntLE(24, 3);
            const height = 1 + buf.readUIntLE(27, 3);
            return { w: width, h: height };
        }
    }
    return undefined;
}
