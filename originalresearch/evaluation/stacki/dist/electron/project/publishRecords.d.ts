import { type Result } from '../../shared/core/result';
export declare const PUBLISH_RECORD_LIMITS: {
    readonly recordBytesMax: 16384;
    readonly chunkBytesMax: 1048576;
    readonly chunksMax: 1000000;
    readonly recordsMax: 100000;
    readonly timeoutMs: 600000;
    readonly diagnosticsBytesMax: 1048576;
};
export declare class PublishRecords {
    private pending;
    private count;
    accept(input: unknown): Result<readonly string[]>;
    finish(): Result<void>;
}
/** The host supplies PATH; await each visitor so filesystem work cannot build a queue. */
export declare function readPublishRecords(root: string, argumentsList: readonly string[], environment: NodeJS.ProcessEnv, visit: (record: string) => Promise<Result<void>>): Promise<Result<void>>;
