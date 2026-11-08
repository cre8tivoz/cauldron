import { type PublishAccount, type PublishProject } from '../../shared/properties/publishDiscovery';
export declare function cloudflareAccounts(root: string): Promise<readonly PublishAccount[]>;
export declare function cloudflareProjects(root: string, account: string): Promise<readonly PublishProject[]>;
export declare function parseCloudflareProject(input: unknown, account: string): PublishProject;
export declare function cloudflareHeaders(credentials: Record<string, unknown>): Readonly<Record<string, string>>;
export declare function cloudflareRequest(url: string, headers: Readonly<Record<string, string>>): Promise<unknown>;
export declare function cloudflareWorkers(root: string, account: string): Promise<readonly PublishProject[]>;
