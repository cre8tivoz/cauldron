export interface ReviewReceipt {
    readonly sha: string;
    readonly branch: string;
    readonly url: string;
}
export type GitHubWorkflow = {
    readonly kind: 'direct';
} | {
    readonly kind: 'pull-request';
};
export declare function parseGitHubWorkflow(input: unknown): GitHubWorkflow;
export declare function parseReviewReceipt(input: unknown): ReviewReceipt;
export declare function reviewBranch(parent: string, tree: string): string;
