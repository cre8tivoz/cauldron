import { type RemoteCollection, type RemoteDocument, type RemoteDocumentList, type RemoteDocumentSummary, type RemoteWrite } from '../../shared/properties/cmsRemote';
import type { CollectionSettings, SettingsChange } from '../../shared/properties/collectionSettings';
import { projectImage } from './astroRecordReferences';
export { projectImage };
import { type ContentCollection } from './contentEntries';
export interface AstroRemoteService {
    readonly collections: () => Promise<RemoteCollection[]>;
    /** One collection's entries, each with the `columns` fields' values to show beside it. */
    readonly documents: (collection: string, columns?: readonly string[]) => Promise<RemoteDocumentList>;
    readonly document: (id: string) => Promise<RemoteDocument>;
    /** A collection's fields with no values, edited before a new entry is created. */
    readonly template: (collection: string) => Promise<RemoteDocument>;
    readonly write: (write: RemoteWrite) => Promise<RemoteDocument>;
    /** Renames an entry's id to `slug` in its folder, with every reference and getEntry() call to it. */
    readonly rename: (id: string, slug: string) => Promise<RemoteDocument>;
    readonly create: (collection: string) => Promise<RemoteDocumentSummary>;
    readonly remove: (ids: readonly string[]) => Promise<number>;
    readonly createCollection: (name: string) => Promise<RemoteCollection>;
    /** A collection's settings (astroCollectionSettings.ts), and a change to them. */
    readonly settings: (name: string) => Promise<CollectionSettings>;
    readonly changeSettings: (name: string, change: SettingsChange) => Promise<CollectionSettings>;
}
/**
 * What the host supplies: the content config as its boundary parsed it, read
 * afresh on every call so a config edit shows at once, and what becomes of a
 * deleted entry's file (Desktop moves it to the Trash).
 */
export interface AstroRemoteHost {
    readonly readConfig: () => Promise<AstroContentConfig>;
    readonly trash: (file: string) => Promise<void>;
}
export interface AstroContentConfig {
    readonly collections: readonly ContentCollection[];
    readonly error?: string | undefined;
}
type Collection = ContentCollection;
/** The field a Markdown entry's body is edited as, below its frontmatter. */
export declare const BODY_FIELD = "body";
export declare function astroRemoteService(projectPath: string, host: AstroRemoteHost): AstroRemoteService;
/** An entry's remote id: its collection, then a short hash of its Astro id. */
export declare function documentId(collection: string, entryId: string): string;
/** The collection's first image field: its entries' picture in lists and choices. */
export declare function firstImageField(collection: Collection): string | undefined;
