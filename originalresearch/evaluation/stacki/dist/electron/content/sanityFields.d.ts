import type { RemoteDocumentField } from '../../shared/properties/cmsRemote';
import { type RemoteType, type RemoteValue } from '../../shared/properties/cmsRemoteSchema';
import type { SanityDocumentSchema } from './sanitySchema';
export declare function documentFields(document: object, schema: SanityDocumentSchema | undefined): RemoteDocumentField[];
/** A type for a value no schema describes, read from the value's own shape. */
export declare function inferType(value: RemoteValue | undefined, depth?: number): RemoteType;
/** Every asset a value points at (`image-…`, `file-…` refs), for their addresses. */
export declare function assetRefs(value: RemoteValue | undefined): string[];
