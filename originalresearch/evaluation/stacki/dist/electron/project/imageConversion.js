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
exports.convertImage = convertImage;
const fs = __importStar(require("node:fs"));
const path = __importStar(require("node:path"));
const assetConversion_1 = require("../../shared/ipc/assetConversion");
const documentWrites_1 = require("../documents/documentWrites");
const assetFiles_1 = require("./assetFiles");
const platform_1 = require("../lib/platform");
const imageEncoder_1 = require("./imageEncoder");
const imageReferences_1 = require("./imageReferences");
async function convertImage(options) {
    const rel = (0, assetConversion_1.parseImagePath)(options.rel);
    const prepared = prepareImage(options.projectPath, rel, options.format);
    if (!prepared.ok) {
        return prepared;
    }
    const { from, to, bytes } = prepared.value;
    const encoded = await (0, imageEncoder_1.encodeImage)(bytes, options.format);
    if (!encoded.ok) {
        return encoded;
    }
    const staged = stageImage(options.projectPath, from, to, encoded.value, options.aliases ?? []);
    if (!staged.ok) {
        return staged;
    }
    const unchanged = verifyImages(from, bytes, to, encoded.value);
    if (!unchanged.ok) {
        return unchanged;
    }
    const references = applyReferences(staged.value);
    if (!references.ok) {
        return {
            ok: false,
            error: references.error + ' Both images were kept so references still work.',
        };
    }
    try {
        const verified = verifyImages(from, bytes, to, encoded.value);
        if (!verified.ok) {
            return verified;
        }
        await options.trash(from);
    }
    catch (error) {
        return { ok: false, error: `References updated, but the original was kept: ${String(error)}` };
    }
    return {
        ok: true,
        value: {
            rel: path.relative(options.projectPath, to).split(path.sep).join('/'),
            references: staged.value.length,
            bytesBefore: bytes.length,
            bytesAfter: encoded.value.length,
        },
    };
}
function prepareImage(projectPath, rel, format) {
    try {
        const from = (0, assetFiles_1.assetAbs)(projectPath, rel);
        const to = from.replace(/\.[^.]+$/, `.${format}`);
        const root = fs.realpathSync(projectPath);
        if (!(0, platform_1.isPathWithin)(root, fs.realpathSync(from)) || fs.lstatSync(from).isSymbolicLink()) {
            throw new Error('Linked images outside the project cannot be converted.');
        }
        if (fs.existsSync(to)) {
            throw new Error(`${path.basename(to)} already exists; nothing was changed.`);
        }
        if (fs.statSync(from).size > imageEncoder_1.IMAGE_BYTES_MAX) {
            throw new Error('Choose an image smaller than 50 MB.');
        }
        return { ok: true, value: { from, to, bytes: fs.readFileSync(from) } };
    }
    catch (error) {
        return { ok: false, error: String(error) };
    }
}
function stageImage(projectPath, from, to, bytes, aliases) {
    try {
        const edits = (0, imageReferences_1.planImageReferences)(projectPath, from, to, aliases);
        // Exclusive binary creation never overwrites an asset; text uses actors below.
        if (!(0, platform_1.isPathWithin)(fs.realpathSync(projectPath), fs.realpathSync(path.dirname(to)))) {
            throw new Error('The image directory moved outside the project.');
        }
        fs.writeFileSync(to, bytes, { flag: 'wx', mode: fs.statSync(from).mode & 0o777 });
        if (!fs.readFileSync(to).equals(bytes)) {
            throw new Error('Converted image verification failed.');
        }
        return { ok: true, value: edits };
    }
    catch (error) {
        return { ok: false, error: String(error) };
    }
}
function applyReferences(edits) {
    const host = (0, documentWrites_1.documentHost)();
    const result = host.documents.withLeases(edits, (ordered) => {
        const applied = [];
        for (const edit of ordered) {
            const report = host.documents.writeText(edit.file, edit.after, (0, imageReferences_1.imageReferenceDigest)(edit.before));
            if (report.tag !== 'applied') {
                let rollbackFailures = 0;
                for (const previous of [...applied].reverse()) {
                    const rollback = host.documents.writeText(previous.file, previous.before, (0, imageReferences_1.imageReferenceDigest)(previous.after));
                    if (rollback.tag !== 'applied') {
                        rollbackFailures += 1;
                    }
                }
                return {
                    ok: false,
                    error: `Could not update ${edit.file}: ${report.tag}. ` + `${rollbackFailures} rollback failures.`,
                };
            }
            host.noteWrite(edit.file);
            applied.push(edit);
        }
        return { ok: true, value: undefined };
    });
    return result.ok ? result.value : result;
}
function verifyImages(from, before, to, after) {
    try {
        for (const [file, bytes] of [
            [from, before],
            [to, after],
        ]) {
            if (fs.statSync(file).size !== bytes.length || !fs.readFileSync(file).equals(bytes)) {
                return { ok: false, error: 'An image changed during conversion. Both images were kept.' };
            }
        }
        return { ok: true, value: undefined };
    }
    catch (error) {
        return {
            ok: false,
            error: `Could not verify images; originals were not removed: ${String(error)}`,
        };
    }
}
