import { type Digest } from '../core/brand';
import { type Result } from '../core/result';
/** Comment data that opens a stamp. The node markers are `avb-s:` and `avb-e:`. */
export declare const PREVIEW_STAMP_PREFIX = "avb-d:";
export declare const PREVIEW_STAMP_ATTRIBUTE = "data-avb-d";
export interface PreviewStamp {
    /** Project-relative, `/`-separated: `src/components/Card.astro`. */
    readonly file: string;
    /** SHA-256 of the bytes the dev plugin marked. */
    readonly checksum: Digest;
}
/** One rendering as the frame announces it: the manifest and its token. */
export interface PreviewRender {
    readonly token: Digest;
    /** Sorted by `file` in code-unit order, one entry per file. */
    readonly stamps: readonly PreviewStamp[];
}
export declare const PREVIEW_STALE_REASONS: readonly ["no-render", "superseded", "token-mismatch", "file-changed", "file-missing", "unstamped-file", "shown-page-differs"];
export type PreviewStaleReason = (typeof PREVIEW_STALE_REASONS)[number];
/** What main found on disk for one stamped file. */
export type StampedFileState = {
    readonly tag: 'present';
    readonly checksum: Digest;
} | {
    readonly tag: 'missing';
}
/** Past `sourceBytesMax`: the dev plugin never stamps such a file, so it has
 * changed since its stamp — and main does not read it to prove so. */
 | {
    readonly tag: 'over-limit';
};
export type PreviewVerdict = {
    readonly tag: 'current';
} | {
    readonly tag: 'stale';
    readonly reason: PreviewStaleReason;
    readonly file: string | undefined;
};
/** Why a stamp path is not one: every stamp is written by the dev plugin, but
 * page code can forge a comment, so the frame and main both check. */
export declare function stampPathProblem(file: string): string | undefined;
/** The comment the dev plugin writes for one marked file. */
export declare function stampData(stamp: PreviewStamp): string;
export declare function stampComment(stamp: PreviewStamp): string;
/** The stamp a comment's data holds, or undefined when it is not one. Comments
 * come from page code, so a malformed one is ignored, never trusted. */
export declare function parseStampData(data: string): PreviewStamp | undefined;
export type ManifestProblem = 'too-many-files' | 'conflicting-stamps';
/** The manifest of one rendering: its stamps sorted by path, one per file.
 * Every rendered copy of a component stamps the same entry; two different
 * checksums for one file mean the rendering mixes versions of it, which no
 * token can name. */
export declare function manifestOf(stamps: readonly PreviewStamp[]): Result<readonly PreviewStamp[], ManifestProblem>;
/** The text the token digests: one `<checksum> <file>` line per entry, in
 * manifest order. The frame builds the same text (electron/preload/preload.ts); the
 * contract test pins the two to each other. */
export declare function canonicalManifest(stamps: readonly PreviewStamp[]): string;
/** Boundary parser for a rendering announced by the frame (via the renderer). */
export declare function parsePreviewRender(input: unknown): PreviewRender;
/** Whether an event's token names the frame's latest rendering. */
export declare function judgeEventToken(eventToken: Digest | undefined, render: PreviewRender | undefined): PreviewVerdict;
/** Whether the open file rendered from the bytes the editor shows. `shown` is
 * undefined when the editor shows no disk version (unsaved structure). */
export declare function judgeShownFile(render: PreviewRender, file: string, shown: Digest | undefined): PreviewVerdict;
/** Main's half: the token is the manifest's digest, and every stamped file on
 * disk still holds the stamped bytes. `current` has an entry for every stamp. */
export declare function judgePreviewRender(render: PreviewRender, current: ReadonlyMap<string, StampedFileState>, tokenOf: (canonical: string) => Digest): PreviewVerdict;
/** Boundary parser for main's answer to `preview:check`. */
export declare function parsePreviewVerdict(input: unknown): PreviewVerdict;
/** The notice for a refused canvas event: it names why, and never implies
 * anything was lost — the click simply did not select. */
export declare function describePreviewStale(reason: PreviewStaleReason): string;
