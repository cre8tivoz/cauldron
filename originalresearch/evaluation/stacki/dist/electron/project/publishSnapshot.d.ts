import { type Result } from '../../shared/core/result';
import { type PublishPurpose } from './publishSize';
export interface PublishSource {
    readonly tree: string;
    readonly head: string | undefined;
    readonly index: string;
    readonly temporary: string;
}
export interface PublishSnapshot extends PublishSource {
    readonly root: string;
}
export declare function readPublishTree(root: string): Promise<Result<string>>;
export declare function createPublishSource(root: string, purpose: PublishPurpose): Promise<Result<PublishSource>>;
export declare function createPublishSnapshot(root: string): Promise<Result<PublishSnapshot>>;
export declare function publishTree(root: string, index: string): Promise<Result<string>>;
