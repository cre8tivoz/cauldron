import { type GitHubWorkflow } from './publishReview';
export type PublishTarget = 'all' | 'github' | 'hosting';
export type Hosting = {
    readonly provider: 'none';
} | {
    readonly provider: 'cloudflare';
    readonly accountId: string;
    readonly project: string;
    readonly branch: string;
    readonly directory: string;
} | {
    readonly provider: 'cloudflare-workers';
    readonly accountId: string;
    readonly project: string;
} | {
    readonly provider: 'vercel';
    readonly organizationId: string;
    readonly projectId: string;
};
export interface PublishConfig {
    readonly publishedSite?: PublishedSite;
    readonly githubWorkflow?: GitHubWorkflow;
    readonly version: 1;
    readonly defaultTarget: PublishTarget;
    readonly githubAccount: string;
    readonly hosting: Hosting;
    readonly buildScript: string;
    readonly beforePublish: readonly string[];
    readonly afterPublish: readonly string[];
}
export interface PublishedSite {
    readonly hosting: Exclude<Hosting, {
        readonly provider: 'none';
    }>;
    readonly url: string;
    readonly source: 'manual' | 'discovered';
}
export declare const DEFAULT_PUBLISH_CONFIG: PublishConfig;
export declare const PUBLISH_LIMITS: {
    readonly sourceCharsMax: 16384;
    readonly hooksMax: 8;
    readonly identifierCharsMax: 100;
    readonly commandTimeoutMs: 600000;
    readonly outputBytesMax: 1048576;
    readonly filesMax: 10000;
    readonly snapshotBytesMax: 268435456;
};
export declare function parsePublishTarget(input: unknown): PublishTarget;
export declare function parsePublishCommitMessage(input: unknown): string;
export declare function parsePublishConfig(input: unknown): PublishConfig;
export declare function parsePublishSource(source: string | undefined): PublishConfig;
