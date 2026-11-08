import type { RemoteAsset, RemoteAssetKind, RemoteCollection, RemoteDocument, RemoteDocumentAction, RemoteDocumentList, RemoteDocumentSummary, RemoteMove, RemoteReferenceOption, RemoteRevision, RemoteWrite } from '../../shared/properties/cmsRemote';
import { type SanityDataset } from './sanityContent';
export interface CmsRemoteService {
    readonly collections: () => Promise<RemoteCollection[]>;
    /** One collection's items, each with the `columns` fields' values to show beside it. */
    readonly documents: (collection: string, columns?: readonly string[]) => Promise<RemoteDocumentList>;
    readonly create: (collection: string) => Promise<RemoteDocumentSummary>;
    readonly remove: (ids: readonly string[]) => Promise<number>;
    readonly move: (move: RemoteMove) => Promise<RemoteDocumentList>;
    readonly document: (id: string) => Promise<RemoteDocument>;
    /** A collection's fields with no values, edited before a new item is created. */
    readonly template: (collection: string) => Promise<RemoteDocument>;
    readonly write: (write: RemoteWrite) => Promise<RemoteDocument>;
    readonly act: (id: string, action: RemoteDocumentAction) => Promise<RemoteDocument | undefined>;
    readonly history: (id: string) => Promise<RemoteRevision[]>;
    readonly restore: (id: string, revision: string) => Promise<RemoteDocument>;
    readonly references: (types: readonly string[]) => Promise<RemoteReferenceOption[]>;
    readonly upload: (kind: RemoteAssetKind, file: {
        readonly name: string;
        readonly bytes: Uint8Array;
    }) => Promise<RemoteAsset>;
}
export declare function cmsRemoteService(root: string, target: SanityDataset): CmsRemoteService;
/**
 * No network and a timed-out request read as what they are, not as fetch's own
 * words ("fetch failed"): Stacki works offline, and only the CMS waits for it.
 */
export declare function cmsFailureMessage(error: unknown): string;
