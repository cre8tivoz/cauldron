export interface PageRename {
    readonly kind: 'page' | 'folder';
    /** Source identities are relative to src/pages, never display labels. */
    readonly from: string;
    readonly to: string;
}
export declare function parsePageRename(input: unknown): PageRename;
export declare function renamePath(input: unknown): string;
export declare function renamedPagePath(file: string, change: PageRename): string;
export declare function pageURLPath(file: string): string;
