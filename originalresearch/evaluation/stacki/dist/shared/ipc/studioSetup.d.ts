export declare const STUDIO_LAUNCH_COMMAND = "npm run dev -- --config node_modules/.avb/astro.config.mjs";
export type StudioStatus = {
    readonly kind: 'missing';
    readonly desktopVersion: string;
} | {
    readonly kind: 'installed';
    readonly desktopVersion: string;
    readonly version: string;
} | {
    readonly kind: 'blocked';
    readonly desktopVersion: string;
    readonly message: string;
};
export type StudioInstallResult = {
    readonly kind: 'installed';
    readonly version: string;
} | {
    readonly kind: 'canceled';
} | {
    readonly kind: 'error';
    readonly message: string;
};
export declare function parseStudioSource(input: unknown): 'published' | 'file';
export declare function parseStudioStatus(input: unknown): StudioStatus;
export declare function parseStudioInstallResult(input: unknown): StudioInstallResult;
