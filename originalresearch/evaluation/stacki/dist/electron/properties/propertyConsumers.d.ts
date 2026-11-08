import { type Result } from '../../shared/core/result';
export interface PropertyConsumer {
    readonly file: string;
    readonly source: string;
    readonly names: ReadonlySet<string>;
}
export declare function readPropertyConsumers(location: {
    readonly projectPath: string;
    readonly file: string;
}): Result<readonly PropertyConsumer[]>;
export declare function readBoundedSource(file: string): Result<string>;
export declare function filesystemError(error: unknown): Result<never>;
