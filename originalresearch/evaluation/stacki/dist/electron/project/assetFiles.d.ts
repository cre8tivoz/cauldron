import type { AssetEntry } from '../lib/mainTypes';
export declare const publicDirectoryOf: (projectPath: string) => string;
export declare const ASSET_ROOTS: string[];
export declare const MEDIA_EXT: RegExp;
export declare const rootOfRel: (rel: string) => string;
export declare function assetAbs(projectPath: string, rel: string): string;
export declare function uniqueTarget(directory: string, name: string): string;
export declare function imageSizeOf(abs: string): {
    w: number;
    h: number;
} | undefined;
export declare function listAssetTree(root: string, rel: string, options: {
    readonly mediaOnly: boolean;
}): AssetEntry[];
export declare function webpImageSize(buf: Buffer): {
    w: number;
    h: number;
} | undefined;
