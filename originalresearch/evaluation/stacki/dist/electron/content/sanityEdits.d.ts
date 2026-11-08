import type { RemoteDocumentAction, RemoteDocumentSummary, RemoteMove } from '../../shared/properties/cmsRemote';
import { type SanityDataset } from './sanityContent';
export declare function sanityCreateDraft(target: SanityDataset, type: string, ordered: {
    readonly orderable: boolean;
}): Promise<RemoteDocumentSummary>;
export declare function sanityDelete(target: SanityDataset, ids: readonly string[]): Promise<number>;
export declare function sanityMove(target: SanityDataset, move: RemoteMove): Promise<void>;
/**
 * Publish, discard or unpublish, with Sanity's own actions — what the Studio's
 * Publish button and its menu do. Publishing needs a draft; discarding a draft
 * that was never published removes the document; unpublishing keeps its
 * content as a draft.
 */
export declare function sanityAct(target: SanityDataset, id: string, action: RemoteDocumentAction): Promise<void>;
