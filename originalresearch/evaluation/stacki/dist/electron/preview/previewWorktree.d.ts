import { ensureExcluded } from '../lib/projectExclusions';
import type { Git } from '../git/git';
/** Where the preview checkout lives, and the directory git must not see. */
declare const PREVIEW_DIRECTORY: string;
declare const previewPath: (projectPath: string) => string;
/**
 * A checkout of `ref`, ready to run a dev server against.
 *
 * Created on first use and moved on every use after, so browsing history costs
 * one checkout rather than one per commit. Returns the path.
 */
declare function ensureWorktree(git: Git, { projectPath, ref }: {
    readonly projectPath: string;
    readonly ref: string;
}): Promise<string>;
/**
 * Take the preview checkout away.
 *
 * Called when the project closes. Forced, because the checkout is disposable
 * by definition — nothing in it was ever the user's work, so there is nothing
 * in it to protect.
 */
declare function removeWorktree(git: Git, { projectPath }: {
    readonly projectPath: string;
}): Promise<{
    ok: boolean;
}>;
export { ensureWorktree, removeWorktree, ensureExcluded, previewPath, PREVIEW_DIRECTORY };
