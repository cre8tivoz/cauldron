import { type Result } from '../../shared/core/result';
import { type ReviewReceipt } from '../../shared/properties/publishReview';
export interface ReviewRequest {
    readonly repository: string;
    readonly token: string;
    readonly base: string;
    readonly branch: string;
    readonly sha: string;
}
export declare function openPublishReview(input: ReviewRequest, transport?: typeof fetch): Promise<Result<ReviewReceipt>>;
