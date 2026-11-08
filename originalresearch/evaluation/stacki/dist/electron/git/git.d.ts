export interface GitResult {
    readonly stdout: string;
    readonly stderr?: string;
}
export type Git = (projectPath: string, args: readonly string[]) => Promise<GitResult>;
/** stderr first, then the message — git's own wording leads. */
export declare function gitErrorDetail(error: unknown): string;
/** Both streams, stdout first — used where git reports conflicts on stdout. */
export declare function gitErrorFull(error: unknown): string;
