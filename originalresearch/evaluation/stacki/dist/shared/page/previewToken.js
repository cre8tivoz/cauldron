"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PREVIEW_STALE_REASONS = exports.PREVIEW_STAMP_ATTRIBUTE = exports.PREVIEW_STAMP_PREFIX = void 0;
exports.stampPathProblem = stampPathProblem;
exports.stampData = stampData;
exports.stampComment = stampComment;
exports.parseStampData = parseStampData;
exports.manifestOf = manifestOf;
exports.canonicalManifest = canonicalManifest;
exports.parsePreviewRender = parsePreviewRender;
exports.judgeEventToken = judgeEventToken;
exports.judgeShownFile = judgeShownFile;
exports.judgePreviewRender = judgePreviewRender;
exports.parsePreviewVerdict = parsePreviewVerdict;
exports.describePreviewStale = describePreviewStale;
// The preview token (plan §9, step 7): which source state a canvas rendering
// came from, so an event from a stale rendering is refused instead of being
// applied to whatever node now sits at the path it names.
//
// A rendering is the page plus every file that rendered into it — layouts and
// components. The dev plugin marks each .astro file in memory as it loads it
// (electron/previewServer/previewMarkers.ts), and every file it marks also carries one stamp
// comment, `<!--avb-d:<checksum>:<file>-->`, the SHA-256 of the exact bytes it
// marked and its project-relative path. A file's stamp is part of that file's
// own compiled module, so it changes exactly when the dev server re-loads the
// file: a component edit restamps the component, and the page's rendering then
// carries the new stamp even though the page's bytes never changed.
//
// The frame collects the stamps of the rendering it shows into a manifest —
// sorted by path, one entry per file — and its token is the SHA-256 of the
// manifest's canonical text. Every located event carries the token. An event is
// accepted only while (1) its token is the frame's latest, (2) the open file's
// stamp is the bytes the editor shows, and (3) every stamped file on disk still
// holds the bytes its stamp names — a component change fails (3), an unrelated
// page's change does not appear in the manifest at all.
//
// Pure: the hash is injected (the frame has only Web Crypto, main has
// node:crypto), and main supplies the current checksums it read from disk.
const assert_1 = require("../core/assert");
const brand_1 = require("../core/brand");
const limits_1 = require("../core/limits");
const result_1 = require("../core/result");
/** Comment data that opens a stamp. The node markers are `avb-s:` and `avb-e:`. */
exports.PREVIEW_STAMP_PREFIX = 'avb-d:';
exports.PREVIEW_STAMP_ATTRIBUTE = 'data-avb-d';
exports.PREVIEW_STALE_REASONS = [
    /** The frame has announced no rendering, or the event carried no token. */
    'no-render',
    /** The frame has rendered again since the event's rendering. */
    'superseded',
    /** The token is not the digest of the manifest it came with. */
    'token-mismatch',
    /** A file that rendered no longer holds the bytes its stamp names. */
    'file-changed',
    /** A file that rendered is gone, or lies outside the project. */
    'file-missing',
    /** The open file carries no stamp: nothing ties the rendering to it. */
    'unstamped-file',
    /** The open file rendered from bytes other than the ones the editor shows. */
    'shown-page-differs',
];
/** Why a stamp path is not one: every stamp is written by the dev plugin, but
 * page code can forge a comment, so the frame and main both check. */
function stampPathProblem(file) {
    if (file.length === 0) {
        return 'empty';
    }
    if (limits_1.LIMITS.previewStampPathCharsMax < file.length) {
        return 'too long';
    }
    if (/[\0\\\r\n]/.test(file) || file.includes('-->')) {
        return 'forbidden character';
    }
    if (file.startsWith('/') || /^[A-Za-z]:/.test(file)) {
        return 'absolute';
    }
    if (file.split('/').some((segment) => segment === '..' || segment === '.' || segment === '')) {
        return 'not normalized';
    }
    return undefined;
}
/** The comment the dev plugin writes for one marked file. */
function stampData(stamp) {
    const problem = stampPathProblem(stamp.file);
    (0, assert_1.assert)(problem === undefined, `A stamped path is a project-relative path (${problem})`);
    return `${exports.PREVIEW_STAMP_PREFIX}${stamp.checksum}:${stamp.file}`;
}
function stampComment(stamp) {
    return `<!--${stampData(stamp)}-->`;
}
/** The stamp a comment's data holds, or undefined when it is not one. Comments
 * come from page code, so a malformed one is ignored, never trusted. */
function parseStampData(data) {
    if (!data.startsWith(exports.PREVIEW_STAMP_PREFIX)) {
        return undefined;
    }
    const rest = data.slice(exports.PREVIEW_STAMP_PREFIX.length);
    const colon = rest.indexOf(':');
    if (colon !== 64) {
        return undefined;
    }
    const checksum = rest.slice(0, colon);
    const file = rest.slice(colon + 1);
    if (!/^[0-9a-f]{64}$/.test(checksum)) {
        return undefined;
    }
    if (stampPathProblem(file) !== undefined) {
        return undefined;
    }
    return { file, checksum: (0, brand_1.toDigest)(checksum) };
}
/** The manifest of one rendering: its stamps sorted by path, one per file.
 * Every rendered copy of a component stamps the same entry; two different
 * checksums for one file mean the rendering mixes versions of it, which no
 * token can name. */
function manifestOf(stamps) {
    if (limits_1.LIMITS.previewMarkersMax < stamps.length) {
        return (0, result_1.err)('too-many-files');
    }
    const byFile = new Map();
    for (const stamp of stamps) {
        const seen = byFile.get(stamp.file);
        if (seen === undefined) {
            byFile.set(stamp.file, stamp.checksum);
        }
        else if (seen !== stamp.checksum) {
            return (0, result_1.err)('conflicting-stamps');
        }
    }
    if (limits_1.LIMITS.previewManifestFilesMax < byFile.size) {
        return (0, result_1.err)('too-many-files');
    }
    const files = [...byFile.keys()].sort(compareCodeUnits);
    const manifest = files.map((file) => {
        const checksum = byFile.get(file);
        (0, assert_1.assert)(checksum !== undefined, 'A sorted file came from the map');
        return { file, checksum };
    });
    (0, assert_1.assert)(manifest.length === byFile.size, 'One manifest entry per stamped file');
    return (0, result_1.ok)(manifest);
}
/** The text the token digests: one `<checksum> <file>` line per entry, in
 * manifest order. The frame builds the same text (electron/preload/preload.ts); the
 * contract test pins the two to each other. */
function canonicalManifest(stamps) {
    (0, assert_1.assert)(manifestSorted(stamps), 'A canonical manifest is sorted with one entry per file');
    return stamps.map((stamp) => `${stamp.checksum} ${stamp.file}\n`).join('');
}
/** Boundary parser for a rendering announced by the frame (via the renderer). */
function parsePreviewRender(input) {
    if (typeof input !== 'object' || input === null || Array.isArray(input)) {
        throw new Error('PreviewRender: expected object');
    }
    const token = 'token' in input ? input.token : undefined;
    const stamps = 'stamps' in input ? input.stamps : undefined;
    if (typeof token !== 'string') {
        throw new Error('PreviewRender.token: expected digest');
    }
    if (!Array.isArray(stamps)) {
        throw new Error('PreviewRender.stamps: expected list');
    }
    if (limits_1.LIMITS.previewManifestFilesMax < stamps.length) {
        throw new Error('PreviewRender.stamps: exceeds limit');
    }
    const parsed = stamps.map(parseStamp);
    if (!manifestSorted(parsed)) {
        throw new Error('PreviewRender.stamps: expected sorted, one per file');
    }
    return { token: (0, brand_1.toDigest)(token), stamps: parsed };
}
/** Whether an event's token names the frame's latest rendering. */
function judgeEventToken(eventToken, render) {
    if (render === undefined) {
        return stale('no-render', undefined);
    }
    if (eventToken === undefined) {
        return stale('no-render', undefined);
    }
    return eventToken === render.token ? CURRENT : stale('superseded', undefined);
}
/** Whether the open file rendered from the bytes the editor shows. `shown` is
 * undefined when the editor shows no disk version (unsaved structure). */
function judgeShownFile(render, file, shown) {
    const stamp = render.stamps.find((entry) => entry.file === file);
    if (stamp === undefined) {
        return stale('unstamped-file', file);
    }
    if (shown === undefined) {
        return stale('shown-page-differs', file);
    }
    return stamp.checksum === shown ? CURRENT : stale('shown-page-differs', file);
}
/** Main's half: the token is the manifest's digest, and every stamped file on
 * disk still holds the stamped bytes. `current` has an entry for every stamp. */
function judgePreviewRender(render, current, tokenOf) {
    if (tokenOf(canonicalManifest(render.stamps)) !== render.token) {
        return stale('token-mismatch', undefined);
    }
    for (const stamp of render.stamps) {
        const now = current.get(stamp.file);
        (0, assert_1.assert)(now !== undefined, 'Main read every stamped file');
        switch (now.tag) {
            case 'present':
                if (now.checksum !== stamp.checksum) {
                    return stale('file-changed', stamp.file);
                }
                break;
            case 'missing':
                return stale('file-missing', stamp.file);
            case 'over-limit':
                return stale('file-changed', stamp.file);
            default: {
                const exhaustive = now;
                return exhaustive;
            }
        }
    }
    return CURRENT;
}
/** Boundary parser for main's answer to `preview:check`. */
function parsePreviewVerdict(input) {
    if (typeof input !== 'object' || input === null || Array.isArray(input)) {
        throw new Error('PreviewVerdict: expected object');
    }
    const tag = 'tag' in input ? input.tag : undefined;
    if (tag === 'current') {
        return CURRENT;
    }
    if (tag !== 'stale') {
        throw new Error('PreviewVerdict.tag: unknown value');
    }
    const reason = 'reason' in input ? input.reason : undefined;
    const found = exports.PREVIEW_STALE_REASONS.find((known) => known === reason);
    if (found === undefined) {
        throw new Error('PreviewVerdict.reason: unknown value');
    }
    const file = 'file' in input ? input.file : undefined;
    if (file === undefined) {
        return stale(found, undefined);
    }
    if (typeof file !== 'string' || stampPathProblem(file) !== undefined) {
        throw new Error('PreviewVerdict.file: expected a project-relative path');
    }
    return stale(found, file);
}
/** The notice for a refused canvas event: it names why, and never implies
 * anything was lost — the click simply did not select. */
function describePreviewStale(reason) {
    switch (reason) {
        case 'no-render':
            return 'The canvas is still loading.';
        case 'superseded':
            return 'The canvas changed under the click.';
        case 'token-mismatch':
            return 'The canvas sent a rendering it could not vouch for.';
        case 'file-changed':
            return 'A file on this page changed since the canvas rendered it.';
        case 'file-missing':
            return 'A file on this page is gone since the canvas rendered it.';
        case 'unstamped-file':
            return 'The canvas does not show the file open for editing.';
        case 'shown-page-differs':
            return 'The canvas has not caught up with your latest edit.';
        default: {
            const exhaustive = reason;
            return exhaustive;
        }
    }
}
// --- Internal ----------------------------------------------------------------
const CURRENT = { tag: 'current' };
function stale(reason, file) {
    return { tag: 'stale', reason, file };
}
function parseStamp(input) {
    if (typeof input !== 'object' || input === null || Array.isArray(input)) {
        throw new Error('PreviewStamp: expected object');
    }
    const file = 'file' in input ? input.file : undefined;
    const checksum = 'checksum' in input ? input.checksum : undefined;
    if (typeof file !== 'string') {
        throw new Error('PreviewStamp.file: expected string');
    }
    const problem = stampPathProblem(file);
    if (problem !== undefined) {
        throw new Error(`PreviewStamp.file: ${problem}`);
    }
    if (typeof checksum !== 'string') {
        throw new Error('PreviewStamp.checksum: expected digest');
    }
    return { file, checksum: (0, brand_1.toDigest)(checksum) };
}
// Code-unit order, not locale order: the frame and main must sort alike.
function compareCodeUnits(left, right) {
    if (left < right) {
        return -1;
    }
    return left === right ? 0 : 1;
}
function manifestSorted(stamps) {
    for (let index = 1; index < stamps.length; index++) {
        const previous = stamps[index - 1];
        const stamp = stamps[index];
        (0, assert_1.assert)(previous !== undefined, 'The previous index lies inside the list');
        (0, assert_1.assert)(stamp !== undefined, 'The index lies inside the list');
        if (compareCodeUnits(previous.file, stamp.file) >= 0) {
            return false;
        }
    }
    return true;
}
