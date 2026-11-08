export interface MarkedSource {
    /** The marked template Vite compiles in place of the file. */
    readonly code: string;
    /** The file's own text, for the dev plugin's style-block comparison. */
    readonly source: string;
    /** A page under src/pages: it also gets the canvas patcher. */
    readonly page: boolean;
}
/** The marked copy of `file`, or undefined when it is not a project .astro file the
 * parser can mark — Vite then loads it unchanged, with no markers and no stamp,
 * and nothing on the canvas can address a node inside it. */
export declare function markSourceFile(file: string, projectDirectories: readonly string[]): MarkedSource | undefined;
/** The marked copy of a chunk imported as `?raw` (see serializePageMarked's
 * chunk marks), or undefined when it cannot be marked. A `group` chunk also
 * gets a marker pair of its own, since nothing in the page wraps it. */
export declare function markChunkFile(file: string, prefix: string, { group }: {
    readonly group: boolean;
}): string | undefined;
