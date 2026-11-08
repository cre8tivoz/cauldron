import type { Git } from './git';
/**
 * Save a version.
 *
 * `paths` absent means everything, which is what the button has always done
 * and still does by default — picking is the opt-in. Given a list, only those
 * files are saved and everything else stays changed on disk exactly as it was.
 */
declare function commit(git: Git, { projectPath, message, paths, }: {
    readonly projectPath: string;
    readonly message?: string;
    readonly paths?: readonly unknown[];
}): Promise<{
    ok: true;
    files: number | undefined;
}>;
/**
 * Put one file back to how it was at `ref`.
 *
 * Deliberately the least dramatic thing that works: the old contents land as
 * an ordinary uncommitted change. Nothing is committed, no history moves, and
 * undoing it is the same as undoing any other edit. A file that did not exist
 * at that commit is a question this cannot answer by writing something, so it
 * says so instead.
 */
declare function restoreFile(git: Git, { projectPath, ref, path: filePath }: {
    readonly projectPath: string;
    readonly ref: string;
    readonly path: string;
}): Promise<{
    ok: boolean;
    missing?: boolean;
    message?: string;
}>;
/**
 * Put the whole project back to how it was at `ref`.
 *
 * The tree is moved, not the branch: this lands as a set of uncommitted
 * changes on the branch you are on, which the user can look at, keep, or
 * abandon. The alternative — moving the branch itself — would silently
 * discard every commit made since, and there would be nothing on screen to
 * say it had happened.
 *
 * `park` is passed in (it lives in gitParking.ts, over the stash) and is called
 * first whenever there is anything to lose. Without that, restoring over
 * uncommitted work would destroy it with no way back.
 */
declare function restoreProject(git: Git, { projectPath, ref, park }: {
    readonly projectPath: string;
    readonly ref: string;
    readonly park?: () => Promise<boolean>;
}): Promise<{
    ok: boolean;
    parked: boolean;
}>;
export { commit, restoreFile, restoreProject };
