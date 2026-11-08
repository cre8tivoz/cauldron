import type { CommitDiffRequest, CommitDiffResult } from '../../shared/ipc/gitCommitDiff';
import type { Git } from './git';
export declare function readCommitDiff(git: Git, request: CommitDiffRequest): Promise<CommitDiffResult>;
