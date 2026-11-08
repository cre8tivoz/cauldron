import { type Result } from '../../shared/core/result';
import { type MetadataFile, type MetadataKind } from '../../shared/properties/projectMetadata';
export declare function readProjectMetadata(root: string, kind: MetadataKind): Result<MetadataFile>;
export declare function writeProjectMetadata(root: string, input: {
    readonly kind: MetadataKind;
    readonly source: string;
    readonly base?: string;
}): Result<MetadataFile>;
