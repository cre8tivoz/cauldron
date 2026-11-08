import type { ConflictPart } from './conflicts';
import type { Git } from './git';
export interface MergeClash {
    readonly path: string;
    readonly ours: string | undefined;
    readonly theirs: string | undefined;
    readonly parts: readonly ConflictPart[] | undefined;
}
export type MergeOutcome = {
    readonly ok: true;
    readonly into: string | undefined;
    readonly changed: boolean;
    readonly resolved?: number;
} | {
    readonly ok: false;
    readonly conflicted: true;
    readonly from: string | undefined;
    readonly branch: string;
    readonly files: readonly MergeClash[];
} | {
    readonly ok: false;
    readonly dirty: true;
    readonly from: string | undefined;
    readonly branch: string;
    readonly files: readonly string[];
};
/**
 * Finish a merge that clashed, with the user's choice for each file.
 *
 * Choices select whole files, individual changes, or exact reviewed text.
 * The merge is run again here
 * rather than having been left open while the user decided, so the files never
 * sit on disk with conflict markers in them where the editor would try to
 * parse them as markup.
 *
 * What comes out is an ordinary merge commit with two parents — nothing about
 * it is special afterwards, and nothing about it needs undoing differently.
 */
declare function resolveMerge(git: Git, { projectPath, branch, choices, }: {
    readonly projectPath: string;
    readonly branch: string;
    readonly choices?: Record<string, unknown>;
}): Promise<MergeOutcome>;
/**
 * Fold `branch` into the branch currently checked out.
 *
 * Named for the argument git takes, so "merge home-test" means what
 * `git merge home-test` means — the direction is never something to work out
 * from where a button sits.
 *
 * `changed` is false for a merge that moved nothing: reporting "merged" there
 * would suggest work arrived that was already present.
 */
declare function mergeBranch(git: Git, { projectPath, branch }: {
    readonly projectPath: string;
    readonly branch: string;
}): Promise<MergeOutcome>;
export type DeleteOutcome = {
    readonly ok: true;
} | {
    readonly ok: false;
    readonly unmerged: true;
    readonly message: string;
};
/**
 * Delete `branch`.
 *
 * `-d` is git's safe form: it refuses a branch holding commits that exist
 * nowhere else, which is the one refusal that is a question rather than an
 * error. That one comes back as `{ ok: false, unmerged: true, message }` for
 * the UI to ask about — returned rather than thrown, because a rejection
 * crossing IPC arrives as a bare string with nothing to branch on. Forcing past
 * it is a second, separately asked-for call with `force`.
 */
declare function deleteBranch(git: Git, { projectPath, branch, force, allowTrunk, }: {
    readonly projectPath: string;
    readonly branch: string;
    readonly force?: boolean;
    readonly allowTrunk?: boolean;
}): Promise<DeleteOutcome>;
export type SwitchOutcome = {
    readonly ok: true;
    readonly from: string;
    readonly parked: boolean;
} | {
    readonly ok: false;
    readonly blocked: true;
    readonly from: string;
    readonly branch: string;
    readonly files: readonly string[];
};
/**
 * Move to another branch.
 *
 * Existing branches have separate unfinished work. Park before switching even
 * when Git could carry edits across, so previews do not contain another branch's
 * edits. Creating a branch intentionally carries the current work onto it.
 * The caller restores the destination's own parked work after a successful switch.
 */
declare function switchBranch(git: Git, { projectPath, branch, create, park, unpark, }: {
    readonly projectPath: string;
    readonly branch: string;
    readonly create?: boolean;
    readonly park: (branch: string) => Promise<boolean>;
    readonly unpark: (branch: string) => Promise<unknown>;
}): Promise<SwitchOutcome>;
export { mergeBranch, deleteBranch, switchBranch, resolveMerge };
