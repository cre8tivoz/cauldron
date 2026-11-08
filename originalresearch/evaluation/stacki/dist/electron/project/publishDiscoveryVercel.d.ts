import { type PublishAccount, type PublishProject } from '../../shared/properties/publishDiscovery';
export declare function vercelAccounts(root: string): Promise<readonly PublishAccount[]>;
export declare function vercelProjects(root: string, account: string): Promise<readonly PublishProject[]>;
export declare function vercelPages(root: string, endpoint: string, field: string, account: string): Promise<unknown[]>;
