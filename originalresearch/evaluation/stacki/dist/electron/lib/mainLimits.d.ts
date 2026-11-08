export declare const MAIN_LIMITS: {
    readonly directoryEntriesMax: 100000;
    readonly directoryDepthMax: 64;
    readonly portAttemptsMax: 100;
    readonly fileNameAttemptsMax: 10000;
    readonly previewServersMax: 16;
    readonly logChunkCharsMax: 64000;
    /** One JSON line from the content-config runner. Sized as one IPC field: a
     * reply longer than that could never reach the renderer, so the runner is
     * stopped instead of buffering toward it. */
    readonly runnerLineCharsMax: 10000000;
    /** The runner's stderr tail kept for an error message. */
    readonly runnerStderrCharsMax: 4000;
    /** One content-collection entry file. An entry is a page's worth of data. */
    readonly contentEntryBytesMax: number;
    /**
     * One data file holding a whole content collection (Astro's `file()` loader):
     * every entry at once, so a few hundred sermons with transcripts run past 10 MB.
     * Matches Studio's bound on a whole CMS scan, which must hold the file too.
     */
    readonly contentDataFileBytesMax: number;
    /** One JSON data file edited as a CMS collection. */
    readonly cmsFileBytesMax: number;
    /** One stylesheet scanned for CSS variables. */
    readonly cssVariableFileBytesMax: number;
    /** One text asset opened in the floating code window. */
    readonly editableFileBytesMax: number;
    /** Output one command (git, the package manager, astro) may print before it
     * is killed. Node's own default, stated so no call relies on it. */
    readonly commandOutputBytesMax: number;
};
export declare function readSource(file: string): string;
/** The exact bytes of a source file, bounded before and after the read. A
 * checksum must be taken over these bytes, never over decoded text. */
export declare function readSourceBytes(file: string): Buffer;
export declare function directoryBudget(root: string): (directory: string, entries: number) => void;
