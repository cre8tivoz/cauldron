import { type ReviewReceipt } from './publishReview';
export type PublishDestinationState = 'current' | 'pending' | 'unknown' | 'unconfigured';
export interface PublishAvailability {
    readonly github: Exclude<PublishDestinationState, 'unconfigured'>;
    readonly hosting: PublishDestinationState;
    readonly githubPush?: GitHubPush;
}
export interface GitHubPush {
    readonly commits: number;
    readonly repositoryUrl: string;
}
export declare const UNKNOWN_PUBLISH_AVAILABILITY: PublishAvailability;
export declare function parsePublishAvailability(input: unknown): PublishAvailability;
export declare function parseGitHubPush(input: unknown): GitHubPush;
export type DesktopPublishState = ({
    readonly kind: 'review-open';
} & ReviewReceipt) | {
    readonly kind: 'idle';
} | {
    readonly kind: 'running';
    readonly step: string;
    readonly progress?: DesktopPublishProgress;
} | {
    readonly kind: 'done';
    readonly github: boolean;
    readonly hosting: boolean;
} | {
    readonly kind: 'failed';
    readonly message: string;
    readonly github: boolean;
    readonly hosting: boolean;
};
export interface DesktopPublishProgress {
    readonly completed: number;
    readonly total: number;
}
export declare function parseDesktopPublishProgress(input: unknown): DesktopPublishProgress;
export declare function parseDesktopPublishState(input: unknown): DesktopPublishState;
