import { type Result } from '../../shared/core/result';
import { type PublishSource } from './publishSnapshot';
export interface PublishRepository {
    readonly branch: string;
    readonly remote: string;
    readonly environment: NodeJS.ProcessEnv;
}
export declare function requirePublishMessage(root: string, source: PublishSource, message: string | undefined): Promise<Result<void>>;
/** Fetch objects without moving refs or working files; the existing Pull flow owns merges. */
export declare function checkPublishIncoming(root: string, repository: PublishRepository, head: string | undefined): Promise<Result<void>>;
export declare function commitPublishSource(root: string, source: PublishSource, branch: string, message: string | undefined): Promise<Result<string>>;
