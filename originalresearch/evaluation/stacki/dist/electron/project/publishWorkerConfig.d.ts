/** A sibling config preserves asset paths while overriding Wrangler's account precedence. */
export declare function withWorkerAccount(root: string, accountId: string, deploy: (configuration: string) => Promise<void>): Promise<void>;
export declare function workerConfigParse(filename: string, source: string): Record<string, unknown>;
