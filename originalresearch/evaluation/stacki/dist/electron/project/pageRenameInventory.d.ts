export interface RenameFile {
    readonly file: string;
    readonly source: string;
}
export interface PageRenameInventory {
    readonly pages: readonly string[];
    readonly folders: readonly string[];
    readonly files: readonly string[];
    readonly texts: readonly RenameFile[];
}
/** Inventory authored files once; never follow links into dependencies or another project. */
export declare function pageRenameInventory(root: string): PageRenameInventory;
