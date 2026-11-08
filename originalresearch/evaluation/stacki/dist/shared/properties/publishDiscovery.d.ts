import { type Hosting } from './publishConfig';
export type DiscoveryProvider = 'cloudflare' | 'cloudflare-workers' | 'vercel' | 'github' | 'linked';
export interface DiscoveryRequest {
    readonly provider: DiscoveryProvider;
    readonly account: string;
}
export interface PublishAccount {
    readonly id: string;
    readonly name: string;
}
export interface PublishProject {
    readonly name: string;
    readonly hosting: Hosting;
}
export type PublishDiscovery = {
    readonly kind: 'ready';
    readonly accounts: readonly PublishAccount[];
    readonly projects: readonly PublishProject[];
    readonly notice?: string;
} | {
    readonly kind: 'failed';
    readonly message: string;
};
export declare const DISCOVERY_LIMITS: {
    readonly itemsMax: 500;
    readonly pagesMax: 5;
    readonly timeoutMs: 30000;
};
export declare function parseDiscoveryRequest(input: unknown): DiscoveryRequest;
export declare function parsePublishDiscovery(input: unknown): PublishDiscovery;
export declare function discoveryList(input: unknown): readonly unknown[];
export declare function discoveryIdentifier(input: unknown): string;
export declare function discoveryLabel(input: unknown): string;
