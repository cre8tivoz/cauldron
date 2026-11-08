import type { CollectionSettings, SettingsChange } from '../../shared/properties/collectionSettings';
import type { AstroRemoteHost } from './astroRemoteService';
/** A collection's settings as the config states them. */
export declare function readCollectionSettings(projectPath: string, name: string): CollectionSettings;
/** Makes `change` to the collection, its entries and the code that names it. */
export declare function changeCollectionSettings(projectPath: string, host: AstroRemoteHost, request: {
    readonly name: string;
    readonly change: SettingsChange;
}): Promise<CollectionSettings>;
/**
 * Code reading a deleted collection given nothing to read, so the site still
 * builds: its list calls an empty list, an entry call no entry, its entry type any.
 * A call whose arguments hold parentheses (a filter function) is left as written.
 */
export declare function unlinkCollectionIn(source: string, name: string): string;
/** Code naming collection `from` by its name, renamed to `to`. */
export declare function renameCollectionIn(source: string, from: string, to: string): string;
/**
 * Code fetching entry `from` of `collection` by its id, renamed to `to`:
 * `getEntry('stats', 'old')` and its siblings, and `{ collection: 'stats', id: 'old' }`.
 * A reference field's value is an entry's own data, renamed with the entry (contentRefs.ts).
 */
export declare function renameEntryIn(source: string, rename: {
    readonly collection: string;
    readonly from: string;
    readonly to: string;
}): string;
/** Renames entry `from` of `collection` in every code file under src; how many files changed. */
export declare function renameEntryInSources(projectPath: string, rename: {
    readonly collection: string;
    readonly from: string;
    readonly to: string;
}): number;
/** Whether code reads collection `name`, so its field reads can be renamed. */
export declare function namesCollection(source: string, name: string): boolean;
/** A field's reads renamed: `.data.old`, `data["old"]`, and `["old"]` where it is quoted. */
export declare function renameFieldIn(source: string, from: string, to: string): string;
