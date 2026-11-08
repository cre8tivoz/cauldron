import type { Hosting, PublishConfig, PublishedSite } from './publishConfig';
/** A remembered domain belongs to one provider account and project, never its replacement. */
export declare function hostingSiteKey(hosting: Hosting): string;
export declare function savedPublishedSite(config: PublishConfig): PublishedSite | undefined;
/** Publishing links are HTTPS origins, never executable URLs or credential-bearing links. */
export declare function parsePublishedSiteURL(input: unknown): string;
