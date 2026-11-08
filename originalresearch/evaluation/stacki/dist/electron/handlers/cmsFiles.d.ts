import type { CmsFile } from '../lib/mainTypes';
export declare const CMS_SKIP: RegExp;
export declare const PAGE_SCAN: {
    requireExport: boolean;
    allowPlainLists: boolean;
};
export declare const isAstroRel: (rel: string) => boolean;
export declare function frontmatterSpan(source: string): {
    start: number;
    end: number;
} | undefined;
export declare function frontmatterOf(source: string): string | undefined;
export declare function splitCmsRel(rel: string): {
    fileRel: string;
    exportName: undefined;
} | {
    fileRel: string;
    exportName: string;
};
export declare function cmsAbs(projectPath: string, rel: string): string;
export declare function assetOfImport(projectPath: string, abs: string, source: string): (name: string) => string | undefined;
export declare const cmsMetaPath: (projectPath: string) => string;
export declare function readCmsMeta(projectPath: string): Record<string, unknown>;
export declare const collectionOf: (projectPath: string, name: string) => Promise<{
    config: import("../app/mainValidation").ContentConfig;
    collection: import("../app/mainValidation").Collection;
}>;
export declare function readCmsSource(full: string, entryRel: string, options: {
    readonly page: boolean;
    readonly includeGeneralOnly?: boolean;
}): CmsFile[];
export declare function readCmsJson(full: string, entryRel: string, rel: string, name: string): CmsFile;
