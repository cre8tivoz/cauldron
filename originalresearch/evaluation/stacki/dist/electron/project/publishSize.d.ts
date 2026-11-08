import { type Result } from '../../shared/core/result';
export type PublishPurpose = 'github' | 'hosting';
export declare const PUBLISH_GIT_LIMITS: {
    readonly filesMax: 100000;
    readonly bytesMax: number;
};
export declare function checkPublishWorkingSize(root: string, index: string, purpose: PublishPurpose): Promise<Result<void>>;
/** Measure the captured blobs: working-file sizes can change and clean filters can expand them. */
export declare function checkPublishTreeSize(root: string, tree: string, purpose: PublishPurpose): Promise<Result<void>>;
export declare function parsePublishTreeEntry(record: string): Result<number>;
