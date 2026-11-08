export declare const RELEASE_BYTES_MAX = 32000000;
export declare const RELEASE_FILES_MAX = 1500;
export interface StudioRelease {
    readonly format: 1;
    readonly version: string;
    readonly files: readonly ReleaseFile[];
}
export interface ReleaseFile {
    readonly path: string;
    readonly content: string;
}
export declare function releaseVersion(value: unknown): string;
export declare function isNewerRelease(candidate: string, current: string): boolean;
export declare function retainedPath(file: string): boolean;
export declare function releasePath(value: unknown): string;
export declare function parseRelease(input: unknown): StudioRelease;
