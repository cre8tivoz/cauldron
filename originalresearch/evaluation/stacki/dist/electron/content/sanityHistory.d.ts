import { type RemoteRevision } from '../../shared/properties/cmsRemote';
import { type SanityDataset } from './sanityContent';
export declare function sanityRevisions(target: SanityDataset, id: string): Promise<RemoteRevision[]>;
export declare function sanityRestore(target: SanityDataset, id: string, revision: string): Promise<void>;
