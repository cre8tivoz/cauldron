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
exports.readProjectMetadata = readProjectMetadata;
exports.writeProjectMetadata = writeProjectMetadata;
const projectExclusions_1 = require("../lib/projectExclusions");
const node_crypto_1 = require("node:crypto");
const brand_1 = require("../../shared/core/brand");
// Metadata uses the same witnessed document writes as pages, so stale settings cannot overwrite.
const fs = __importStar(require("node:fs"));
const path = __importStar(require("node:path"));
const result_1 = require("../../shared/core/result");
const projectMetadata_1 = require("../../shared/properties/projectMetadata");
const documentWrites_1 = require("../documents/documentWrites");
const mainLimits_1 = require("../lib/mainLimits");
function readProjectMetadata(root, kind) {
    const target = metadataPath(root, kind);
    if (!target.ok) {
        return target;
    }
    try {
        if (!fs.existsSync(target.value)) {
            return (0, result_1.ok)({});
        }
        return (0, result_1.ok)({ source: (0, projectMetadata_1.metadataSource)((0, mainLimits_1.readSource)(target.value)) });
    }
    catch (error) {
        return metadataFailure(error);
    }
}
function writeProjectMetadata(root, input) {
    try {
        (0, projectMetadata_1.validateMetadata)(input.kind, input.source);
    }
    catch (error) {
        return metadataFailure(error);
    }
    const target = metadataPath(root, input.kind);
    if (!target.ok) {
        return target;
    }
    const current = readProjectMetadata(root, input.kind);
    if (!current.ok) {
        return current;
    }
    if (current.value.source !== input.base) {
        return (0, result_1.err)({ code: 'conflict', message: 'Project settings changed. Reload before saving.' });
    }
    try {
        fs.mkdirSync(path.dirname(target.value), { recursive: true });
    }
    catch (error) {
        return metadataFailure(error);
    }
    const host = (0, documentWrites_1.documentHost)();
    if (input.base === undefined) {
        const created = host.documents.create(target.value, input.source);
        if (!created.ok) {
            return created;
        }
    }
    else {
        const checksum = (0, brand_1.toDigest)((0, node_crypto_1.createHash)('sha256').update(input.base).digest('hex'));
        const report = host.documents.writeText(target.value, input.source, checksum);
        if (report.tag !== 'applied') {
            return (0, result_1.err)({ code: 'write-failed', message: (0, documentWrites_1.describeWriteReport)(target.value, report) });
        }
    }
    // Migrate legacy local exclusions before these project settings are committed.
    (0, projectExclusions_1.ensureExcluded)(root);
    host.noteWrite(target.value);
    const saved = readProjectMetadata(root, input.kind);
    if (saved.ok && saved.value.source !== input.source) {
        return (0, result_1.err)({
            code: 'write-race',
            message: 'Project settings changed during save. Reload to inspect them.',
        });
    }
    return saved;
}
function metadataPath(root, kind) {
    try {
        const canonical = fs.realpathSync(root);
        const directory = path.join(canonical, '.stacki');
        const target = path.join(canonical, projectMetadata_1.METADATA_FILES[kind]);
        for (const candidate of [directory, target]) {
            if (fs.existsSync(candidate)) {
                if (fs.lstatSync(candidate).isSymbolicLink()) {
                    return (0, result_1.err)({
                        code: 'invalid-path',
                        message: 'Project settings cannot be symbolic links.',
                    });
                }
            }
        }
        return (0, result_1.ok)(target);
    }
    catch (error) {
        return metadataFailure(error);
    }
}
function metadataFailure(error) {
    return (0, result_1.err)({
        code: 'metadata',
        message: error instanceof Error ? error.message : 'Could not access project settings.',
    });
}
