/** Only fixed read commands reach this runner; credentials never reach renderer diagnostics. */
export declare function discoveryCommand(root: string, executable: 'wrangler' | 'vercel' | 'gh', argumentsList: readonly string[]): Promise<unknown>;
