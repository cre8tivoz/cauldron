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
exports.isStudioDirectory = isStudioDirectory;
// Whether a folder is an installed Astro Studio. Studio's own source (and the
// Stacki editor it vendors) lives inside the website as `studio/`, but its
// styles and code belong to the editor, never to the site. Its package identity
// is checked, so an unrelated website folder named studio is still the site's.
const fs = __importStar(require("node:fs"));
const path = __importStar(require("node:path"));
function isStudioDirectory(directory, name) {
    if (name !== 'studio') {
        return false;
    }
    const manifestBytesMax = 64 * 1024;
    try {
        const file = path.join(directory, 'package.json');
        if (fs.statSync(file).size > manifestBytesMax) {
            return false;
        }
        const bytes = fs.readFileSync(file);
        if (bytes.length > manifestBytesMax) {
            return false;
        }
        const manifest = JSON.parse(bytes.toString('utf8'));
        if (typeof manifest !== 'object') {
            return false;
        }
        if (manifest === null) {
            return false;
        }
        if ('name' in manifest) {
            return manifest.name === '@stacki/studio';
        }
        return false;
    }
    catch {
        // Missing, unreadable or malformed metadata does not identify an editor installation.
        return false;
    }
}
