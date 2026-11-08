"use strict";
// The pure half of the page handlers: a page's source parsed by its format,
// write and edit failures in their wire shapes, page routes filled with
// params, and the trail a copied selection carries.
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
exports.resolvePagesDirectory = exports.isMdx = exports.isMarkdownPage = exports.PAGE_MD_RE = void 0;
exports.parsePageSource = parsePageSource;
exports.pageWriteFailure = pageWriteFailure;
exports.pageEditError = pageEditError;
exports.fillRoute = fillRoute;
exports.selectionTrail = selectionTrail;
const documentWrites_1 = require("./documentWrites");
const platform_1 = require("../lib/platform");
const intent_1 = require("../../shared/engine/intent");
const path = __importStar(require("path"));
const astroParser_1 = require("../parse/astroParser");
const markdownParser_1 = require("../parse/markdownParser");
const mainHelpers_1 = require("../lib/mainHelpers");
// The page formats Astro routes from a file: .astro, plus markdown when the
// project has the integration for it (.md always, .mdx via @astrojs/mdx).
// Kept as one place so discovery, routing and reading can't drift apart.
exports.PAGE_MD_RE = /\.mdx?$/i;
const isMarkdownPage = (filePath) => exports.PAGE_MD_RE.test(filePath);
exports.isMarkdownPage = isMarkdownPage;
const isMdx = (filePath) => /\.mdx$/i.test(filePath);
exports.isMdx = isMdx;
// ---------------------------------------------------------------------------
// HTML chunks — resolution lives in astroParser so the dev server's marker
// config can reuse it (see writeMarkerConfig). The page editor shows a
// chunk's markup in the navigator and never writes it: no page save is a whole
// model any more (step 9), and a chunk file has no node intents of its own
// yet — its content is edited in code (src/editor/nodeCapability.ts).
// ---------------------------------------------------------------------------
// ---------------------------------------------------------------------------
// Page IPC
// ---------------------------------------------------------------------------
function parsePageSource(pagePath, source) {
    if ((0, exports.isMarkdownPage)(pagePath)) {
        return { ...(0, markdownParser_1.parseMarkdownPage)(source, { mdx: (0, exports.isMdx)(pagePath) }), source };
    }
    const parsed = (0, astroParser_1.parsePage)(source, { locs: true });
    if (parsed.editable) {
        (0, astroParser_1.resolveChunks)(parsed.model, pagePath, { locs: true });
    }
    return { ...parsed, source };
}
// What a write that did not happen, or may have, means to the renderer's save
// state (plan §7). A refusal is the edit's own (`rejected`, pageEditError).
function pageWriteFailure(file, report) {
    const name = path.basename(file);
    switch (report.tag) {
        case 'uncertain':
            return {
                code: 'uncertain',
                message: `${name} may not have been saved (${report.reconciliation ?? 'unreadable'}).`,
            };
        case 'backpressured':
            return { code: 'backpressured', message: (0, documentWrites_1.describeWriteReport)(name, report) };
        default: {
            const exhaustive = report;
            return exhaustive;
        }
    }
}
function pageEditError(file, report) {
    if (report.tag === 'rejected') {
        const { reason, diskChecksum } = report;
        const message = report.message === '' ? (0, intent_1.describeRejection)(reason) : report.message;
        // A disk failure says nothing about whether the gesture is supported. Keep
        // it queued for the next save instead of withdrawing the user's text.
        if (reason === 'write-failed') {
            return { code: 'filesystem', message };
        }
        if (reason === 'write-race') {
            return { code: 'write-race', message };
        }
        return { code: 'rejected', reason, message, diskChecksum };
    }
    return pageWriteFailure(file, report);
}
// Folder management under src/pages. Renames are same-parent only (from the
// UI), so contained files keep their relative-import depth.
const resolvePagesDirectory = (projectPath, rel) => {
    const pagesDirectory = path.join(projectPath, 'src', 'pages');
    const full = path.resolve(pagesDirectory, rel);
    if (!(0, platform_1.isPathWithin)(pagesDirectory, full)) {
        throw new Error('Invalid folder.');
    }
    return full;
};
exports.resolvePagesDirectory = resolvePagesDirectory;
// Fill a route pattern in with one entry's params: /posts/[slug] + {slug:'a'}
// → /posts/a. A rest param ([...path]) holds a whole segment run, and an
// undefined one collapses rather than writing "undefined" into the URL.
function fillRoute(pattern, params) {
    const filled = pattern.replace(/\[(\.\.\.)?([^\]]+)\]/g, (_match, _rest, name) => {
        // Dev-server JSON writes null for a missing param, as absent as undefined.
        const value = params?.[name];
        if (value === undefined) {
            return '';
        }
        if (value === null) {
            return '';
        }
        return String(value)
            .split('/')
            .map((segment) => encodeURIComponent(segment))
            .join('/');
    });
    // A dropped rest param leaves a double slash or a trailing one behind.
    return filled.replace(/\/{2,}/g, '/').replace(/(.)\/$/, '$1');
}
// ---------------------------------------------------------------------------
// Copy Selection (⇧⌘C)
//
// What the canvas has selected, as the editing-hierarchy trail that leads to
// it: the page, then the instance of each component drilled into, then the
// node itself — each entry a `<file>:<lines>` pointer. Pasted into an AI chat
// that can read the project, that trail is the one thing it can't work out for
// itself.
//
// Resolved on demand from the keys the renderer hands over, so nothing is
// stored here and nothing is written to the user's project.
// ---------------------------------------------------------------------------
// Turns "<file>#<path>" node keys into "<file>:<line>" / "<file>:<from>-<to>"
// pointers, project-relative. Returns undefined when there's nothing to point at.
function selectionTrail(state) {
    if (!state || !state.projectPath || !Array.isArray(state.keys)) {
        return undefined;
    }
    const root = path.resolve(state.projectPath);
    const trail = [];
    for (const key of state.keys) {
        const hash = typeof key === 'string' ? key.indexOf('#') : -1;
        if (hash === -1) {
            continue;
        }
        // The key's file half is renderer input; keep it inside the project.
        const abs = path.resolve(root, key.slice(0, hash));
        if (!(0, platform_1.isPathWithin)(root, abs)) {
            continue;
        }
        const at = (0, astroParser_1.locateSelection)(abs, key.slice(hash + 1));
        if (!at) {
            continue;
        }
        const file = (0, mainHelpers_1.toPosix)(path.relative(root, at.file));
        if (!('startLine' in at)) {
            trail.push(file);
        }
        else if (at.startLine === at.endLine) {
            trail.push(`${file}:${at.startLine}`);
        }
        else {
            trail.push(`${file}:${at.startLine}-${at.endLine}`);
        }
    }
    return trail.length ? trail : undefined;
}
