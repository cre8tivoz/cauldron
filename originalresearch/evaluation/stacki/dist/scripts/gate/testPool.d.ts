export interface TestCommand {
    readonly name: string;
    /** A package script (run in a shell), or an executable when arguments are given. */
    readonly command: string;
    /** Arguments for a direct spawn; absent means `command` is a shell line. */
    readonly argumentsList?: readonly string[];
}
export interface TestOutcome {
    readonly name: string;
    readonly passed: boolean;
    readonly durationMs: number;
    /** The command's combined stdout and stderr, tail-truncated at the limit. */
    readonly output: string;
}
export interface PoolOptions {
    readonly jobs: number;
    readonly cwd: string;
    readonly environment: NodeJS.ProcessEnv;
}
export declare const POOL_LIMITS: {
    /** More concurrent test processes than this only adds contention. */
    readonly jobsMax: 16;
    /** Output kept per command; a failure's cause is almost always at the end. */
    readonly outputBytesMax: number;
};
/** Stop every command still running (the runner calls this on SIGINT). */
export declare function stopTestPool(): void;
/** Run `commands` with at most `options.jobs` at once. Outcomes come back in
 * input order; `onDone` hears each one as it finishes. */
export declare function runTestPool(commands: readonly TestCommand[], options: PoolOptions, onDone: (outcome: TestOutcome) => void): Promise<readonly TestOutcome[]>;
export declare function runTestCommand(command: TestCommand, options: PoolOptions): Promise<TestOutcome>;
/** Parse a job count from `--jobs=<n>`; absent means one fewer than the CPUs. */
export declare function parseJobs(flag: string | undefined, cpus: number): number;
