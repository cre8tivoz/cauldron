import { parseConnectionId } from './cmsConnections';
import { type EntrySlug } from './entrySlug';
import { type RemoteSchemaField, type RemoteValue } from './cmsRemoteSchema';
export declare const CMS_REMOTE_LIMITS: {
    readonly collectionsMax: 200;
    readonly documentsMax: 500;
    /** Fields a list shows as columns beside each item's name. */
    readonly columnsMax: 12;
    /** How far into a value a column looks for its line: a list of named things. */
    readonly cellDepthMax: 2;
    readonly fieldsMax: 200;
    readonly assetsMax: 500;
    readonly revisionsMax: 100;
    readonly referenceTypesMax: 24;
    readonly previewCharsMax: 200;
    /** Tabs a document's fields are split into (Sanity's `groups`). */
    readonly fieldGroupsMax: 24;
};
export interface RemoteCollection {
    readonly name: string;
    readonly count: number;
    /** The `@sanity/icons` symbol its schema names (`user`), when it names one. */
    readonly icon: string | undefined;
}
/** A field's value as a list's column shows it: a line of text, a number, or a switch. */
export type RemoteCell = string | number | boolean;
export type RemoteStatus = 'draft' | 'published' | 'changed';
export interface RemoteDocumentSummary {
    /** The published id, which names the document whether or not it has a draft. */
    readonly id: string;
    readonly title: string;
    /** The line under its title in a list, as the CMS's own list shows it. */
    readonly subtitle: string | undefined;
    /** Its picture in a list, when its type shows one. */
    readonly imageURL: string | undefined;
    /** Its picture as a project file (an Astro entry's first image), relative to the project. */
    readonly imageFile?: string;
    /** The fields a list shows as columns, by name, each as a short value to read and sort by. */
    readonly cells?: Readonly<Record<string, RemoteCell>>;
    readonly status: RemoteStatus;
    readonly updatedAt: string;
}
/**
 * One collection's documents, in the CMS's own order where it keeps one. In
 * Sanity that is the orderable-document-list plugin's `orderRank`: a collection
 * whose documents all carry one is `orderable`, listed in that order, and can be
 * dragged into a new one.
 */
export interface RemoteDocumentList {
    readonly documents: readonly RemoteDocumentSummary[];
    readonly orderable: boolean;
}
/** A drag: `id` lands between `after` and `before`; either is absent at an end. */
export interface RemoteMove {
    readonly collection: string;
    readonly id: string;
    readonly after: string | undefined;
    readonly before: string | undefined;
}
/** A document's field: its schema, and the document's value for it, if any. */
export interface RemoteDocumentField extends RemoteSchemaField {
    readonly value: RemoteValue | undefined;
    /** The tabs it shows under besides all fields (its schema's `group`); absent shows it under all fields only. */
    readonly groups?: readonly string[];
}
/** One tab of a document's fields, from its schema's `groups`, as Sanity Studio shows it. */
export interface RemoteFieldGroup {
    readonly name: string;
    readonly title: string;
}
/** A stored image or file a document points at, by its asset id. */
export interface RemoteAsset {
    readonly id: string;
    readonly url: string;
    readonly filename: string;
}
/** One saved change in a document's history, newest first in a list. */
export interface RemoteRevision {
    /** The transaction that made it; the document as it stood after it can be restored. */
    readonly id: string;
    readonly timestamp: string;
    readonly author: string;
}
/**
 * What the item header does to a whole document, as Sanity Studio's own
 * buttons do: publish its draft, discard its draft, or take it off the site.
 */
export type RemoteDocumentAction = 'publish' | 'discard' | 'unpublish';
/** A document a reference field may point at. */
export interface RemoteReferenceOption {
    readonly id: string;
    readonly type: string;
    readonly title: string;
    /** Its picture, from its type's preview `media`, as the Studio's reference row shows it. */
    readonly imageURL: string | undefined;
}
export interface RemoteDocument {
    readonly id: string;
    readonly type: string;
    readonly status: RemoteStatus;
    readonly fields: readonly RemoteDocumentField[];
    /** The images and files its fields point at, with their addresses. */
    readonly assets: readonly RemoteAsset[];
    /** When its unpublished draft was last edited; absent when it has no draft. */
    readonly editedAt: string | undefined;
    /** When the published document last changed; absent when it was never published. */
    readonly publishedAt: string | undefined;
    /** Where the document opens in the CMS's own editor, when that is known. */
    readonly editURL: string | undefined;
    /**
     * The tabs its fields are split into, when its schema groups them: each
     * group that holds a field, in schema order. All fields always come first.
     */
    readonly fieldGroups?: readonly RemoteFieldGroup[];
    /**
     * The project file it is stored in, relative to the project, when it is one
     * (an Astro content entry): its image paths are relative to that file's folder.
     */
    readonly file?: string;
    /** An Astro content entry's id, as its Slug field edits it (entrySlug.ts); a CMS document has none. */
    readonly slug?: EntrySlug;
}
export type RemoteResult<T> = {
    readonly ok: true;
    readonly value: T;
} | {
    readonly ok: false;
    readonly message: string;
};
/** One top-level field's new value; `undefined` removes the field. */
export interface RemoteWrite {
    readonly id: string;
    readonly field: string;
    readonly value: RemoteValue | undefined;
}
/**
 * The id of a collection's template: its fields with no values, edited before
 * an item is created. No stored document has it; creating gives the real one.
 */
export declare const REMOTE_TEMPLATE_ID = "new-item";
export declare function parseRemoteCollectionName(input: unknown): string;
/** A published document id: never a draft or version id, which the server derives. */
export declare function parseRemoteDocumentId(input: unknown): string;
export declare function parseRemoteFieldName(input: unknown): string;
export declare function parseRemoteWrite(input: unknown): RemoteWrite;
export declare const parseRemoteConnection: typeof parseConnectionId;
export declare function parseRemoteResult<T>(input: unknown, parseValue: (value: unknown) => T): RemoteResult<T>;
export declare function parseRemoteCollections(input: unknown): RemoteCollection[];
export declare function parseRemoteDocuments(input: unknown): RemoteDocumentSummary[];
/** The fields a list asks to show as columns: field names, a few, no repeats. */
export declare function parseRemoteColumns(input: unknown): readonly string[];
/**
 * A stored value as a column shows it: text and numbers as they are, a switch
 * as one, a slug or a referenced document by its name, a list by its items'
 * names. Anything else — an image, a nested group — has no line to show.
 */
export declare function remoteCell(value: unknown, depth?: number): RemoteCell | undefined;
export declare function parseRemoteDocument(input: unknown): RemoteDocument;
export declare function parseRemoteFieldGroups(input: unknown): RemoteFieldGroup[];
export declare function parseRemoteAsset(input: unknown): RemoteAsset;
export declare function parseRemoteAssets(input: unknown): RemoteAsset[];
export declare function parseRemoteReferenceOptions(input: unknown): RemoteReferenceOption[];
/** The document types a reference may point at: a few names, at least one. */
export declare function parseRemoteTypes(input: unknown): readonly string[];
export type RemoteAssetKind = 'image' | 'file';
export declare function parseRemoteDocumentAction(input: unknown): RemoteDocumentAction;
/** A history transaction id: Sanity's are short, letters, digits and dashes. */
export declare function parseRemoteRevisionId(input: unknown): string;
export declare function parseRemoteRevisions(input: unknown): RemoteRevision[];
/** An action's result: the document as it now stands, or none when the action removed it. */
export declare function parseRemoteActedDocument(input: unknown): RemoteDocument | undefined;
export declare function parseRemoteAssetKind(input: unknown): RemoteAssetKind;
export declare function parseRemoteDocumentList(input: unknown): RemoteDocumentList;
/** The documents a delete names: published ids, at most a page of them, no repeats. */
export declare function parseRemoteIds(input: unknown): readonly string[];
export declare function parseRemoteMove(input: unknown): RemoteMove;
