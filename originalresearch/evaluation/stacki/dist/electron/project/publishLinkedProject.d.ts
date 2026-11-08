import type { Hosting } from '../../shared/properties/publishConfig';
import { type DiscoveryProvider, type PublishProject } from '../../shared/properties/publishDiscovery';
export declare function linkedPublishProject(root: string, provider: DiscoveryProvider): Promise<readonly PublishProject[]>;
export declare function configuredWorkerSiteURL(root: string, hosting: Extract<Hosting, {
    readonly provider: 'cloudflare-workers';
}>): Promise<string | undefined>;
