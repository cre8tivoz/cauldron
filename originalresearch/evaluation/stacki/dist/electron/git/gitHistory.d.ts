import type { Git } from './git';
export interface FileChange {
    readonly status: string;
    readonly path: string;
    readonly from?: string;
}
export interface CommitInfo {
    readonly files: FileChange[] | undefined;
    readonly hash: string | undefined;
    readonly shortHash: string | undefined;
    readonly author: string | undefined;
    readonly email: string | undefined;
    readonly when: string | undefined;
    readonly subject: string | undefined;
    readonly parents: readonly string[];
    readonly refs: readonly string[];
    readonly isMerge: boolean;
}
/**
 * Commits in child-before-parent order, across branches unless a ref is selected.
 *
 * `limit`/`skip` page it — the panel scrolls rather than loading a history
 * that can be tens of thousands of commits long.
 */
declare function log(git: Git, { projectPath, ref, limit, skip, withFiles, }: {
    readonly projectPath: string;
    readonly ref?: string;
    readonly limit?: number;
    readonly skip?: number;
    readonly withFiles?: boolean;
}): Promise<{
    commits: CommitInfo[];
    atEnd: boolean;
}>;
declare function parseNameStatus(stdout: string): FileChange[];
export interface StatusFile {
    readonly path: string;
    readonly from: string | undefined;
    readonly status: string;
    readonly staged: boolean;
    readonly untracked: boolean;
}
/**
 * Everything changed right now, for the file picker — the whole list, with
 * what happened to each file. `git:info` keeps its own capped summary for the
 * chip; this is the one that has to be complete, because a file missing from
 * it is a file that silently cannot be committed.
 */
declare function status(git: Git, { projectPath }: {
    readonly projectPath: string;
}): Promise<StatusFile[]>;
export interface ProjectFile {
    readonly path: string;
    readonly status: string | undefined;
    readonly staged: boolean;
}
/**
 * Every file in the project, with what has happened to each.
 *
 * `git ls-files --cached --others --exclude-standard` is the right list and a
 * walk of the directory is not: it is what git tracks plus what it would track
 * if asked, and nothing that is ignored. So node_modules, dist and .stacki are
 * absent for free, without this code having to know what any of them are, and
 * a project with its own unusual .gitignore is respected rather than
 * second-guessed.
 *
 * Status comes from the same porcelain the file picker reads, so a file cannot
 * appear as changed in one place and clean in another.
 */
declare function allFiles(git: Git, { projectPath }: {
    readonly projectPath: string;
}): Promise<ProjectFile[]>;
export interface WorktreeInfo {
    readonly path: string;
    readonly head: string | undefined;
    readonly branch: string | undefined;
    readonly detached: boolean;
    readonly bare: boolean;
}
/** Every worktree of this repository, the main one first. */
declare function worktrees(git: Git, { projectPath }: {
    readonly projectPath: string;
}): Promise<WorktreeInfo[]>;
export type FileKind = 'page' | 'component' | 'layout' | 'content' | 'asset' | 'style' | 'config' | 'script' | 'doc' | 'file';
export interface FileDescription {
    readonly path: string;
    readonly kind: FileKind;
    readonly label: string;
}
/**
 * `{ path, kind, label }` for one repo-relative path.
 *
 * `kind` is for the icon, `label` is what the row says. A path this knows
 * nothing about keeps its own name rather than being forced into a category —
 * a wrong label is worse than a plain one.
 */
declare function describeFile(relPath: unknown): FileDescription;
/** Every file in a list, described. Renames keep where they came from. */
declare const describeFiles: <T extends {
    readonly path: string;
    readonly from?: string | undefined;
}>(files: readonly T[] | undefined) => (T & FileDescription & {
    readonly from: string | undefined;
})[];
export { allFiles, log, status, worktrees, parseNameStatus, describeFile, describeFiles };
