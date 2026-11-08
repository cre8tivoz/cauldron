"use strict";
// The files behind the CMS panel: collection folders, an entry's
// frontmatter, its asset imports, and the panel's own field metadata.
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
exports.collectionOf = exports.cmsMetaPath = exports.isAstroRel = exports.PAGE_SCAN = exports.CMS_SKIP = void 0;
exports.frontmatterSpan = frontmatterSpan;
exports.frontmatterOf = frontmatterOf;
exports.splitCmsRel = splitCmsRel;
exports.cmsAbs = cmsAbs;
exports.assetOfImport = assetOfImport;
exports.readCmsMeta = readCmsMeta;
exports.readCmsSource = readCmsSource;
exports.readCmsJson = readCmsJson;
const mainLimits_1 = require("../lib/mainLimits");
const platform_1 = require("../lib/platform");
const mainValidation_1 = require("../app/mainValidation");
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const jsCollections_1 = require("../content/jsCollections");
const assetRefs_1 = require("../project/assetRefs");
const contentConfig_1 = require("../content/contentConfig");
const mainHelpers_1 = require("../lib/mainHelpers");
const importPaths_1 = require("../properties/importPaths");
const assetFiles_1 = require("../project/assetFiles");
// ---------------------------------------------------------------------------
// CMS — JSON data files under src/ edited as collections
// ---------------------------------------------------------------------------
// Config files that happen to live in src/ aren't content.
exports.CMS_SKIP = /^(tsconfig|jsconfig|package|package-lock|env\.d)\.json$/i;
// How a page's frontmatter is scanned: no exports there, and a list of plain
// strings is the content itself rather than a constant.
exports.PAGE_SCAN = { requireExport: false, allowPlainLists: true };
const isAstroRel = (rel) => /\.astro$/i.test(String(rel || ''));
exports.isAstroRel = isAstroRel;
// The frontmatter's own span, so a page's data can be read and written without
// the scanners ever seeing its markup.
function frontmatterSpan(source) {
    const open = /^---[ \t]*\r?\n/.exec(source);
    if (!open) {
        return undefined;
    }
    const start = open[0].length;
    const close = source.slice(start).search(/\r?\n---[ \t]*(\r?\n|$)/);
    if (close === -1) {
        return undefined;
    }
    return { start, end: start + close };
}
function frontmatterOf(source) {
    const span = frontmatterSpan(source);
    return span ? source.slice(span.start, span.end) : undefined;
}
// A JS/TS collection is addressed as `path/to/file.ts#EXPORT_NAME` — the file
// holds several, so the export name picks which one. A page's frontmatter uses
// the same form: `pages/index.astro#rotatingWords`.
function splitCmsRel(rel) {
    const at = String(rel || '').lastIndexOf('#');
    return at === -1 ? { fileRel: String(rel || ''), exportName: undefined } : { fileRel: String(rel).slice(0, at), exportName: String(rel).slice(at + 1) };
}
// Refuses paths that escape src/.
function cmsAbs(projectPath, rel) {
    const root = path.resolve(projectPath, 'src');
    const abs = path.resolve(root, rel || '');
    if (!(0, platform_1.isPathWithin)(root, abs)) {
        throw new Error('Invalid data path');
    }
    return abs;
}
// What a name in a data file is bound to, when it is bound to a picture: the
// project-relative file, or undefined for anything else. Only imports are read —
// `image: dailyDevotionals` says nothing on its own, and the import above it
// says everything.
function assetOfImport(projectPath, abs, source) {
    const imports = (0, assetRefs_1.defaultImports)(source);
    return (name) => {
        const imp = imports.find((i) => i.name === name);
        if (!imp) {
            return undefined;
        }
        const target = (0, importPaths_1.resolveImportPath)(projectPath, abs, imp.spec);
        if (!target || !assetFiles_1.MEDIA_EXT.test(target)) {
            return undefined;
        }
        const rel = (0, mainHelpers_1.toPosix)(path.relative(projectPath, target));
        return rel && !rel.startsWith('..') ? rel : undefined;
    };
}
// A field's type is inferred from its values, which can't tell a phone number
// from a line of text — or anything at all from an empty field. Types the user
// picked explicitly are remembered here, keyed by collection and field path.
const cmsMetaPath = (projectPath) => path.join(projectPath, '.stacki', 'cms.json');
exports.cmsMetaPath = cmsMetaPath;
function readCmsMeta(projectPath) {
    try {
        return (0, mainHelpers_1.parseRecord)((0, mainHelpers_1.parseData)((0, mainHelpers_1.readJson)((0, exports.cmsMetaPath)(projectPath))));
    }
    catch {
        return {};
    }
}
// One collection's entries: where each one lives, what it holds, and what
// identifies it. A collection whose loader builds its entries has none to give.
const collectionOf = async (projectPath, name) => {
    const config = (0, mainValidation_1.parseContentConfig)(await (0, contentConfig_1.readContentConfig)(projectPath));
    const collection = (config.collections || []).find((candidate) => candidate.name === name);
    if (!collection) {
        throw new Error(`${name} is not a collection in this project.`);
    }
    return { config, collection };
};
exports.collectionOf = collectionOf;
// A file's single values go by the file's own name: they are what the file is.
const fileName = (rel) => rel.slice(rel.lastIndexOf('/') + 1);
function readCmsSource(full, entryRel, options) {
    let source;
    try {
        if (fs.statSync(full).size > mainLimits_1.MAIN_LIMITS.cmsFileBytesMax) {
            return [];
        }
        source = (0, mainLimits_1.readSource)(full);
    }
    catch {
        return [];
    }
    if (options.page) {
        const body = frontmatterOf(source);
        if (!body) {
            return [];
        }
        source = body;
    }
    const scan = options.page ? exports.PAGE_SCAN : undefined;
    const collections = (0, jsCollections_1.findCollections)(source, scan);
    // Source files outside recognized settings locations need an exported record list before
    // they count as CMS content. Otherwise every constants module in the project
    // would appear as a content file merely because it exports a string.
    if (!options.page) {
        if (!options.includeGeneralOnly) {
            if (collections.length === 0) {
                return [];
            }
        }
    }
    const metadata = {
        dir: entryRel,
        abs: full,
        fromFile: true,
        ...(options.page ? { fromPage: true } : {}),
    };
    const general = (0, jsCollections_1.readGeneral)(source, scan);
    const files = general ? [{ ...metadata, rel: `${entryRel}#${jsCollections_1.GENERAL}`, name: fileName(entryRel), data: general }] : [];
    for (const collection of collections) {
        if (collection.data) {
            files.push({
                ...metadata,
                rel: `${entryRel}#${collection.name}`,
                name: collection.name,
                data: collection.data,
            });
        }
    }
    return files;
}
function readCmsJson(full, entryRel, rel, name) {
    let file = { rel: entryRel, name, dir: rel, abs: full };
    try {
        const stat = fs.statSync(full);
        file = { ...file, size: stat.size };
        if (stat.size > mainLimits_1.MAIN_LIMITS.cmsFileBytesMax) {
            return { ...file, error: 'This file is too large to edit here (over 2 MB).' };
        }
        return { ...file, data: (0, mainHelpers_1.parseData)((0, mainHelpers_1.readJson)(full)) };
    }
    catch (error) {
        return {
            ...file,
            error: `Not valid JSON — ${(0, mainHelpers_1.errorMessage)(error).replace(/\s+in JSON.*$/, '')}`,
        };
    }
}
