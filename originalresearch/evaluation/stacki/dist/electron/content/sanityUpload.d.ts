import type { RemoteAsset, RemoteAssetKind } from '../../shared/properties/cmsRemote';
import { type SanityDataset } from './sanityContent';
export declare const IMAGE_EXTENSIONS: string[];
/** Uploads a file the system dialog picked (Desktop). */
export declare function sanityUpload(target: SanityDataset, kind: RemoteAssetKind, file: string): Promise<RemoteAsset>;
/** Uploads a file's bytes under its name (Desktop's dialog, or a browser in Studio). */
export declare function sanityUploadBytes(target: SanityDataset, kind: RemoteAssetKind, name: string, bytes: Uint8Array): Promise<RemoteAsset>;
/** The largest file the CMS panel uploads, for a host to bound a request body by. */
export declare const SANITY_UPLOAD_BYTES_MAX: number;
