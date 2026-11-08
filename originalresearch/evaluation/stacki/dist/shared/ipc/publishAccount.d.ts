export interface AccountRequest {
    readonly provider?: 'github' | 'cloudflare';
    readonly action: 'start' | 'status' | 'cancel';
    readonly id: string;
}
export type AccountState = {
    readonly kind: 'installing';
} | {
    readonly kind: 'starting';
} | {
    readonly kind: 'waiting';
    readonly code: string;
} | {
    readonly kind: 'browser';
    readonly url: string;
} | {
    readonly kind: 'complete';
} | {
    readonly kind: 'cancelled';
} | {
    readonly kind: 'failed';
    readonly message: string;
};
export declare const ACCOUNT_SIGN_IN_TIMEOUT_MS: number;
export declare const ACCOUNT_INSTALL_TIMEOUT_MS: number;
export declare const GITHUB_DEVICE_URL = "https://github.com/login/device";
export declare function parseAccountRequest(input: unknown): AccountRequest;
export declare function parseAccountState(input: unknown): AccountState;
export declare function accountSignInPending(state: AccountState): boolean;
export declare function parseCloudflareSignInURL(input: unknown): string;
