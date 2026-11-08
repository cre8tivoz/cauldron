import type { Result } from '../core/result';
export declare const COMMIT_DIFF_LIMITS: {
    readonly charactersMax: 500000;
    readonly linesMax: 10000;
};
export type CommitDiffResult = Result<string, string>;
export interface CommitDiffRequest {
    readonly projectPath: string;
    readonly commit: string;
    readonly path: string;
    readonly from: string | undefined;
}
export declare function parseCommitDiffRequest(input: unknown): CommitDiffRequest;
export declare function parseCommitDiffResult(input: unknown): CommitDiffResult;
