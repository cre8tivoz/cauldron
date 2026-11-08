export declare function parseGitHubRepository(input: unknown): string;
export declare function parseGitHubRepositories(input: unknown): readonly string[];
export declare function parseCloneResult(input: unknown): {
    canceled: true;
    error?: never;
    projectPath?: never;
} | {
    canceled: false;
    error: string;
    projectPath?: never;
} | {
    canceled: false;
    projectPath: string;
    error?: never;
};
