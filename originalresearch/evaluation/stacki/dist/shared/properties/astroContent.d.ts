import type { CmsConnection } from './cmsConnections';
import { type CollectionSettings, type SettingsChange } from './collectionSettings';
import { type RemoteCollection, type RemoteDocument, type RemoteDocumentList, type RemoteDocumentSummary, type RemoteWrite } from './cmsRemote';
/** The Astro source's id: a UUID, as every connection id is, that none is ever given. */
export declare const ASTRO_CONTENT_ID = "00000000-0000-4000-8000-00000a57c0de";
export declare const ASTRO_CONTENT_LIMITS: {
    readonly collectionNameCharsMax: 64;
    readonly collectionLabelCharsMax: 80;
};
export interface AstroContentSource {
    readonly kind: 'astro';
    readonly id: typeof ASTRO_CONTENT_ID;
    readonly label: string;
}
export declare const ASTRO_CONTENT_SOURCE: AstroContentSource;
/** Where the CMS panel's remote views read from: a saved connection, or the project's files. */
export type CmsSource = CmsConnection | AstroContentSource;
/** What the panel reads from the project's content collections. */
export type AstroRemoteRead = {
    readonly operation: 'collections';
} | {
    readonly operation: 'documents';
    readonly collection: string;
    readonly columns: readonly string[];
} | {
    readonly operation: 'document';
    readonly id: string;
} | {
    readonly operation: 'template';
    readonly collection: string;
} | {
    readonly operation: 'settings';
    readonly collection: string;
};
/** What a read answers: the collections, one collection's entries, or one entry. */
export type AstroRemoteReadAnswer = readonly RemoteCollection[] | RemoteDocumentList | RemoteDocument | CollectionSettings;
/** What an edit answers: the entry written, the entry made, how many went, the new collection. */
export type AstroRemoteEditAnswer = RemoteDocument | RemoteDocumentSummary | number | RemoteCollection | CollectionSettings;
/** What the panel changes in them: a field, a new or removed entry, a new collection. */
export type AstroRemoteEdit = {
    readonly operation: 'write';
    readonly write: RemoteWrite;
}
/** A new slug for an entry's id: its file, or its key in a data file, and every reference to it. */
 | {
    readonly operation: 'rename';
    readonly id: string;
    readonly slug: string;
} | {
    readonly operation: 'create';
    readonly collection: string;
} | {
    readonly operation: 'delete';
    readonly ids: readonly string[];
} | {
    readonly operation: 'createCollection';
    readonly name: string;
} | {
    readonly operation: 'settings';
    readonly collection: string;
    readonly change: SettingsChange;
};
export declare function parseAstroRemoteRead(input: unknown): AstroRemoteRead;
export declare function parseAstroRemoteEdit(input: unknown): AstroRemoteEdit;
/**
 * A collection name as typed ("Blog posts") made into the identifier Astro
 * names it by (`blogPosts`): words joined in camel case, letters and digits
 * only, starting with a letter. A name that leaves nothing, starts with a
 * digit, or is a reserved word is refused rather than silently altered further.
 */
export declare function parseAstroCollectionName(input: unknown): string;
/** Whether `source` is the project's own content collections rather than a saved connection. */
export declare function isAstroContent(source: CmsSource): source is AstroContentSource;
