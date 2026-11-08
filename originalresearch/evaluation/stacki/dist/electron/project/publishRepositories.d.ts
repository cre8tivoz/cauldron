import { type RepositoryRequest, type RepositoryResult, type PublishingRepositories } from '../../shared/ipc/publishRepository';
/** Repository setup never commits, pulls, or pushes project files. */
export declare function publishingRepositories(root: string, input: RepositoryRequest): Promise<RepositoryResult>;
export declare function repositoryState(root: string): Promise<PublishingRepositories>;
export declare function connectPublishingRepository(root: string, request: Extract<RepositoryRequest, {
    readonly action: 'connect';
}>): Promise<RepositoryResult>;
