import type { SanityDocumentSchema, SanityPreview } from './sanitySchema';
import { type RemoteCollection, type RemoteDocument, type RemoteDocumentList, type RemoteReferenceOption, type RemoteWrite } from '../../shared/properties/cmsRemote';
export declare const SANITY_API_VERSION = "v2025-02-19";
export declare const SANITY_TIMEOUT_MS = 15000;
export interface SanityDataset {
    readonly projectId: string;
    readonly dataset: string;
    readonly token: string;
}
export declare function sanityCollections(target: SanityDataset): Promise<RemoteCollection[]>;
export declare function sanityDocuments(target: SanityDataset, type: string, preview?: SanityPreview, columns?: readonly string[]): Promise<RemoteDocumentList>;
export declare function sanityDocument(target: SanityDataset, id: string, schemaOf: (type: string) => SanityDocumentSchema | undefined): Promise<RemoteDocument>;
/** A type's fields with no values: what a new document is edited as before it is created. */
export declare function sanityTemplate(type: string, schemaOf: (type: string) => SanityDocumentSchema | undefined): RemoteDocument;
/** Sets one field on the document's draft, or removes it; the draft is made when needed. */
export declare function sanityWriteDraft(target: SanityDataset, write: RemoteWrite): Promise<void>;
/** Published documents of these types, to pick one for a reference. */
export declare function sanityReferenceOptions(target: SanityDataset, types: readonly string[], mediaOf?: (type: string) => string | undefined): Promise<RemoteReferenceOption[]>;
export declare function sanityQuery(target: SanityDataset, query: string, params: Readonly<Record<string, string | number | readonly string[]>>, perspective: 'raw' | 'published'): Promise<unknown>;
export declare function sanityRequest(target: SanityDataset, path: string, body: object): Promise<unknown>;
/** A GET against the dataset's API (history), its answer as text; NDJSON is the caller's. */
export declare function sanityGet(target: SanityDataset, url: string): Promise<string>;
