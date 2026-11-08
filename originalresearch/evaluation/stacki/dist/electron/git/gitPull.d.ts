import type { Git } from './git';
import type { MergeOutcome } from './gitBranches';
/** Discover incoming commits without changing the index or working files. */
export declare function readIncomingCommits(git: Git, options: {
    readonly projectPath: string;
    readonly branch: string;
}): Promise<number>;
/** Fetch explicitly so pull conflicts use the editor's existing merge review. */
export declare function pullBranch(git: Git, options: {
    readonly projectPath: string;
    readonly branch: string;
}): Promise<MergeOutcome>;
