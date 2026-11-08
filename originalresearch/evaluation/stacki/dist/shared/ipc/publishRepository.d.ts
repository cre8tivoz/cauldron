import type { Result } from '../core/result';
export type RepositoryRequest = {
    readonly action: 'list';
    readonly account: string;
} | {
    readonly action: 'connect';
    readonly account: string;
    readonly repository: string;
    readonly revision: string;
} | {
    readonly action: 'create';
    readonly account: string;
    readonly name: string;
    readonly private: boolean;
};
export interface PublishingRepositories {
    readonly connected: string;
    readonly revision: string;
    readonly repositories: readonly string[];
    readonly mode: 'editable' | 'managed';
    readonly notice: string;
}
export type RepositoryResult = Result<PublishingRepositories, string>;
export declare const REPOSITORIES_MAX = 500;
export declare function parseRepositoryRequest(input: unknown): RepositoryRequest;
export declare function parseRepositoryResult(input: unknown): RepositoryResult;
