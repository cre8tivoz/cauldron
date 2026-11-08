import { type Result } from '../../shared/core/result';
import { type ReviewReceipt } from '../../shared/properties/publishReview';
import type { PublishSource } from './publishSnapshot';
import type { PublishRepository } from './publishCommit';
export declare function submitPublishReview(root: string, source: PublishSource, repository: PublishRepository, transport?: typeof fetch): Promise<Result<ReviewReceipt>>;
