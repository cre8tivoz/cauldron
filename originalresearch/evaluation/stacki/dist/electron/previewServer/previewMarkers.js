"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.markSourceFile = markSourceFile;
exports.markChunkFile = markChunkFile;
// The dev preview's source markers, made in memory (plan §9, step 7).
//
// The generated preview config (preview/markerConfig.ts, MARKER_CONFIG_PARTS) hands Astro a
// marked copy of every .astro file under src as Vite loads it: each node sits
// between <!--avb-s:path--> / <!--avb-e:path--> comments, and each file carries
// one stamp, <!--avb-d:<checksum>:<file>-->, naming the exact bytes it was
// marked from (shared/page/previewToken.ts). The marked text exists only as the
// module Vite compiles. This module reads project files and returns strings; it
// never writes, and nothing that writes project text imports it — so no marker
// can change what the project itself builds or serves. The single-writer
// contract test holds both halves.
//
// It runs inside the project's dev server, a plain Node process, so it is
// unpacked beside the archive (package.json build.asarUnpack) and requires only
// modules that are.
const node_crypto_1 = require("node:crypto");
const node_fs_1 = require("node:fs");
const node_path_1 = __importDefault(require("node:path"));
const assert_1 = require("../../shared/core/assert");
const defaultsCanvas_1 = require("../../shared/properties/defaultsCanvas");
const brand_1 = require("../../shared/core/brand");
const limits_1 = require("../../shared/core/limits");
const previewToken_1 = require("../../shared/page/previewToken");
const astroParser_1 = require("../parse/astroParser");
const scopeCapture_1 = require("./scopeCapture");
/** The marked copy of `file`, or undefined when it is not a project .astro file the
 * parser can mark — Vite then loads it unchanged, with no markers and no stamp,
 * and nothing on the canvas can address a node inside it. */
function markSourceFile(file, projectDirectories) {
    if (!file.endsWith('.astro')) {
        return undefined;
    }
    // Pages mark with bare paths; every other .astro under src — components and
    // layouts — with its own namespace, so selecting inside one outlines too.
    const projectFile = projectDirectories
        .map((directory) => ({
        directory,
        relative: node_path_1.default.relative(directory, file).split(node_path_1.default.sep).join('/'),
    }))
        .find(({ relative }) => relative.startsWith('src/') || (0, defaultsCanvas_1.isDefaultsCanvas)(relative));
    if (projectFile === undefined) {
        return undefined;
    }
    const bytes = (0, node_fs_1.readFileSync)(file);
    if (limits_1.LIMITS.sourceBytesMax < bytes.length) {
        return undefined; // Past the file bound: the editor shows it as code, not nodes.
    }
    const source = bytes.toString('utf8');
    const parsed = (0, astroParser_1.parsePage)(source);
    if (!parsed.editable) {
        return undefined;
    }
    (0, astroParser_1.resolveChunks)(parsed.model, file);
    const relativePath = projectFile.relative;
    (0, assert_1.assert)((0, previewToken_1.stampPathProblem)(relativePath) === undefined, 'A file under src has a project-relative path');
    const page = relativePath.startsWith('src/pages/') || (0, defaultsCanvas_1.isDefaultsCanvas)(relativePath);
    const checksum = (0, brand_1.toDigest)((0, node_crypto_1.createHash)('sha256').update(bytes).digest('hex'));
    const stamp = { file: relativePath, checksum };
    const marked = page ? (0, astroParser_1.serializePageMarked)(parsed.model, '', stamp) : (0, astroParser_1.serializePageMarked)(parsed.model, `${relativePath}|`, stamp);
    (0, assert_1.assert)(marked.endsWith('\n'), 'The marked serializer ends on a line of its own');
    // The frontmatter files what it computed under this path as it finishes, so
    // the binding picker can show a loop's real items (scopeCapture.ts).
    const captured = (0, scopeCapture_1.withScopeCapture)(marked, relativePath);
    (0, assert_1.assert)(captured.endsWith('\n'), 'The scope capture keeps the template’s last line');
    // Last, at the top level of the file's template, where the compiler keeps a
    // plain comment: after `</html>` for a page, which leaves the doctype alone.
    return { code: `${captured}${(0, previewToken_1.stampComment)(stamp)}\n`, source, page };
}
/** The marked copy of a chunk imported as `?raw` (see serializePageMarked's
 * chunk marks), or undefined when it cannot be marked. A `group` chunk also
 * gets a marker pair of its own, since nothing in the page wraps it. */
function markChunkFile(file, prefix, { group }) {
    const bytes = (0, node_fs_1.readFileSync)(file);
    if (limits_1.LIMITS.sourceBytesMax < bytes.length) {
        return undefined;
    }
    return (0, astroParser_1.markChunkHtml)(bytes.toString('utf8'), prefix, { group });
}
