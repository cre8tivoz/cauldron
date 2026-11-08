import type { git } from '../lib/nodeTools';
import type { Result } from '../../shared/core/result';
export declare function connectRepository(execute: typeof git, options: {
    readonly projectPath: string;
    readonly repository: string;
}): Promise<Result<{
    readonly url: string;
    readonly output: string;
}, string>>;
