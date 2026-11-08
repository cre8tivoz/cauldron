import { type ChildProcessWithoutNullStreams } from 'node:child_process';
import { type AccountRequest, type AccountState } from '../../shared/ipc/publishAccount';
import { type PackageManager } from '../../shared/properties/packageManager';
export type LaunchStep = {
    readonly kind: 'installing';
    readonly packageManager: PackageManager;
} | {
    readonly kind: 'starting';
};
type Launch = (root: string, provider: 'github' | 'cloudflare', step: LaunchStep) => ChildProcessWithoutNullStreams;
export declare class PublishingAccount {
    private readonly launch;
    private readonly hasWrangler;
    private readonly packageManager;
    private session;
    constructor(launch?: Launch, hasWrangler?: (root: string) => boolean, packageManager?: (root: string) => PackageManager);
    request(root: string, input: AccountRequest): AccountState;
    private busy;
    private start;
    private expire;
    private watch;
    private closed;
    private read;
    private finish;
}
export declare function wranglerInstallArguments(manager: PackageManager): readonly string[];
export {};
