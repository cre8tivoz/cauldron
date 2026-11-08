export declare const PREFLIGHT_LIMITS: {
    /** Tracked files in the repository. About 2,700 today. */
    readonly trackedFilesMax: 50000;
    /** Bytes of one source file the scans read; larger files are generated. */
    readonly sourceBytesMax: number;
    /** Relative specifiers in one file. */
    readonly specifiersPerFileMax: 2000;
    /** Interactions in one probe that the settle scan examines. */
    readonly interactionsPerFileMax: 500;
    /** Bytes of a file's head read for its shebang. */
    readonly shebangBytesMax: 256;
};
export interface Finding {
    readonly file: string;
    /** 1-based; 0 when the finding is about the whole file. */
    readonly line: number;
    readonly message: string;
}
/** The tracked files as Linux sees them: exact paths, and the same folded to
 * lower case, which is what a case-insensitive macOS volume matches. */
export interface TrackedTree {
    readonly exact: ReadonlySet<string>;
    readonly folded: ReadonlyMap<string, readonly string[]>;
}
export declare function trackedTree(files: readonly string[]): TrackedTree;
/** Tracked paths that differ only in case. A macOS checkout holds one of them. */
export declare function caseCollisions(tree: TrackedTree): readonly Finding[];
export interface Specifier {
    readonly specifier: string;
    readonly line: number;
}
export declare function relativeSpecifiers(text: string): readonly Specifier[];
export type Resolution = {
    readonly kind: 'exact';
} | {
    readonly kind: 'case';
    readonly actual: string;
} | {
    readonly kind: 'missing';
};
/** How `specifier`, written in `importer`, resolves among the tracked files. */
export declare function resolveSpecifier(tree: TrackedTree, importer: string, specifier: string): Resolution;
/** Specifiers that resolve on macOS only because its filesystem ignores case.
 * A specifier that resolves to nothing tracked is not reported: probes build
 * code in template strings, and generated files are not tracked. */
export declare function caseMismatches(tree: TrackedTree, file: string, text: string): readonly Finding[];
export declare function configPathMismatches(tree: TrackedTree, file: string, text: string): readonly Finding[];
export interface TrackedEntry {
    readonly file: string;
    /** Git's mode: 100644 for a plain file, 100755 for an executable one. */
    readonly mode: string;
    /** The file's first bytes, read as latin1 (at most shebangBytesMax). */
    readonly head: string;
}
/** Shebang and mode problems. `executed` lists the files something runs
 * directly (git hooks, `./path` steps), which need the executable bit. */
export declare function shebangFindings(entries: readonly TrackedEntry[], executed: ReadonlySet<string>): readonly Finding[];
/** `./path` commands in workflow steps that name tracked files. */
export declare function directlyExecutedPaths(tree: TrackedTree, workflowText: string): readonly string[];
/** Interactions followed by a layout read after a fixed sleep, with nothing
 * that waits for the transition between them and the next interaction. On a
 * hidden window on the Linux runner, animation frames arrive late, so a popup
 * can still be in its opening phase when the sleep ends. */
export declare function unsettledMeasurements(file: string, text: string): readonly Finding[];
/** Tracked text that names a git-ignored file. A clean CI checkout lacks it,
 * which is how propModelParity failed 1.0.4 on every platform. */
export declare function ignoredReferences(ignored: readonly string[], file: string, text: string): readonly Finding[];
/** Problems in package.json `build.linux`. `iconHeader` is the icon's first
 * 24 bytes, or undefined when the icon is not tracked. */
export declare function linuxBuildFindings(build: unknown, tree: TrackedTree, iconHeader: Buffer | undefined): readonly Finding[];
/** The 1-based line of a character offset. */
export declare function lineAt(text: string, offset: number): number;
