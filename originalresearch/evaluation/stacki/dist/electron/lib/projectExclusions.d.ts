/**
 * Keep generated preview checkouts, defaults canvases and save staging out of project commits.
 *
 * Without this the preview checkout shows up as an untracked folder in the
 * user's own project — in the file picker, in the commit box, in every status
 * the app reads — and the first thing they would do is commit it.
 */
export declare function ensureExcluded(projectPath: string, options?: {
    readonly ignoredPaths: readonly string[];
}): boolean;
