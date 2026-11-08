import { type DiscoveryRequest, type PublishDiscovery } from '../../shared/properties/publishDiscovery';
/** This boundary returns sanitized failures, never CLI output that could contain credentials. */
export declare function discoverPublishing(root: string, input: DiscoveryRequest): Promise<PublishDiscovery>;
