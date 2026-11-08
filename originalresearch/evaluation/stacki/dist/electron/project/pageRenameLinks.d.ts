import { type PageRename } from '../../shared/properties/pageRename';
export interface LinkRenameContext {
    readonly change: PageRename;
    readonly origins: readonly string[];
    readonly file: string;
    readonly relative?: 'url';
}
/** Rewrite literal links without interpreting project JavaScript or changing external sites. */
export declare function renamePageLinks(source: string, context: LinkRenameContext): string;
export declare function renamePageLink(value: string, context: LinkRenameContext): string;
/** Preserve relative and aliased module references when either end of the import moves. */
export declare function renamePageImports(source: string, file: string, relocated: ReadonlyMap<string, string>, aliases?: readonly (readonly [string, readonly string[]])[]): string;
