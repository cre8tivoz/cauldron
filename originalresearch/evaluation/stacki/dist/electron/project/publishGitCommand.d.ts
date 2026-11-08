import type { ExecFileOptions } from 'node:child_process';
import { type Result } from '../../shared/core/result';
export interface PublishGitError {
    readonly code: 'git';
    readonly message: string;
    readonly exitCode: number | undefined;
}
/** Convert only child-process failures; invariant checks execute outside this boundary. */
export declare function runPublishGit(root: string, argumentsList: readonly string[], options?: ExecFileOptions): Promise<Result<string, PublishGitError>>;
export declare function readPublishHead(root: string): Promise<Result<string | undefined>>;
export declare function parsePublishObject(value: string): Result<string>;
export declare function publishFilesystemFailure(error: unknown): Result<never>;
