import { type Hosting } from '../../shared/properties/publishConfig';
export declare function publishedProjectSiteURL(root: string, source: string | undefined): Promise<string | undefined>;
export declare function publishedSiteURL(root: string, hosting: Hosting): Promise<string | undefined>;
export declare function preferredSiteDomain(input: readonly unknown[]): string | undefined;
