import { type Result } from '../../shared/core/result';
import { type PageRename } from '../../shared/properties/pageRename';
import { type RenameFile } from './pageRenameInventory';
export interface RenameText {
    readonly file: string;
    readonly before: string;
    readonly after: string;
}
export interface PageRenamePlan {
    readonly root: string;
    readonly change: PageRename;
    readonly texts: readonly RenameText[];
    readonly witnesses: readonly RenameFile[];
    readonly relocated: ReadonlyMap<string, string>;
}
export declare function planPageRename(root: string, change: PageRename, projectAliases?: readonly (readonly [string, readonly string[]])[]): Result<PageRenamePlan>;
