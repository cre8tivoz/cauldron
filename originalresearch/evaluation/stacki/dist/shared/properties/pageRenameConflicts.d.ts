import { type Result } from '../core/result';
import { type PageRename } from './pageRename';
export interface RenameInventory {
    readonly pages: readonly string[];
    readonly folders: readonly string[];
}
export declare function pageRenameConflicts(change: PageRename, inventory: RenameInventory): Result<void>;
/** Folder inventories include empty directories, which also reserve rename destinations. */
export declare function parseRenameFolders(input: unknown): readonly string[];
