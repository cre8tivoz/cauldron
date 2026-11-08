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
exports.planImageReferences = planImageReferences;
exports.rewriteImageReferences = rewriteImageReferences;
exports.imageReferenceDigest = imageReferenceDigest;
const fs = __importStar(require("node:fs"));
const path = __importStar(require("node:path"));
const node_crypto_1 = require("node:crypto");
const brand_1 = require("../../shared/core/brand");
const limits_1 = require("../../shared/core/limits");
const mainLimits_1 = require("../lib/mainLimits");
const platform_1 = require("../lib/platform");
const TEXT_FILE = /\.(astro|[cm]?[jt]sx?|mdx?|css|scss|sass|less|html|json|ya?ml|toml)$/i;
const SKIP = new Set(['node_modules', '.git', 'dist', 'build', 'studio', 'vendor']);
const TOTAL_BYTES_MAX = 64 * 1024 * 1024;
function planImageReferences(projectPath, from, to, aliases) {
    if (aliases.length > 100 || aliases.reduce((count, [, targets]) => count + targets.length, 0) > 1000) {
        throw new Error('Too many path aliases for image conversion.');
    }
    const files = sourceFiles(projectPath);
    const edits = [];
    let bytes = 0;
    for (const file of files) {
        bytes += fs.statSync(file).size;
        if (bytes > TOTAL_BYTES_MAX) {
            throw new Error('Project text exceeds the 64 MB conversion limit.');
        }
        const before = (0, mainLimits_1.readSource)(file);
        const after = rewriteImageReferences(before, file, projectPath, from, to, aliases);
        if (before !== after) {
            edits.push({ file, before, after });
        }
        if (edits.length > limits_1.LIMITS.documentActorsMax) {
            throw new Error('Too many files reference this image; convert a smaller project.');
        }
    }
    return edits;
}
function rewriteImageReferences(source, file, projectPath, from, to, aliases = []) {
    const relative = (target) => path.relative(path.dirname(file), target).split(path.sep).join('/');
    const pairs = [[relative(from), relative(to)]];
    if (!relative(from).startsWith('.')) {
        pairs.push([`./${relative(from)}`, `./${relative(to)}`]);
    }
    const publicRoot = path.join(projectPath, 'public');
    if ((0, platform_1.isPathWithin)(publicRoot, from)) {
        pairs.push(['/' + path.relative(publicRoot, from).split(path.sep).join('/'), '/' + path.relative(publicRoot, to).split(path.sep).join('/')]);
    }
    for (const [prefix, targets] of aliases) {
        for (const target of targets) {
            const root = path.resolve(projectPath, target);
            if ((0, platform_1.isPathWithin)(root, from)) {
                pairs.push([prefix + path.relative(root, from).split(path.sep).join('/'), prefix + path.relative(root, to).split(path.sep).join('/')]);
            }
        }
    }
    let result = source;
    for (const [before, after] of pairs) {
        for (const encode of [(value) => value, encodedPath]) {
            const escaped = encode(before).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            // Boundaries exclude longer filenames, remote URLs and embedded identifiers.
            const pattern = new RegExp('(^|[\\s"\'`(=])' + escaped + '(?=[\\s"\'`)<>?#,;\\]}]|$)', 'gm');
            result = result.replace(pattern, (_match, prefix) => prefix + encode(after));
        }
    }
    return result;
}
function imageReferenceDigest(source) {
    return (0, brand_1.toDigest)((0, node_crypto_1.createHash)('sha256').update(source).digest('hex'));
}
function encodedPath(value) {
    return value
        .split('/')
        .map((part) => encodeURIComponent(part))
        .join('/');
}
function sourceFiles(projectPath) {
    const pending = [projectPath];
    const files = [];
    let visited = 0;
    for (let index = 0; index < pending.length; index++) {
        const directory = pending[index];
        if (directory === undefined) {
            throw new Error('Missing scan directory.');
        }
        for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
            if (++visited > limits_1.LIMITS.scanEntriesMax) {
                throw new Error('Project scan exceeds 10,000 entries.');
            }
            if (entry.name.startsWith('.') || SKIP.has(entry.name)) {
                continue;
            }
            const file = path.join(directory, entry.name);
            if (entry.isDirectory()) {
                pending.push(file);
            }
            else if (entry.isFile() && TEXT_FILE.test(entry.name)) {
                files.push(file);
            }
        }
    }
    return files;
}
