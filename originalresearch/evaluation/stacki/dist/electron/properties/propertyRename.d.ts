import type { PropertyOptionRename } from '../../shared/properties/propertyEditing';
import { type Result } from '../../shared/core/result';
export interface PropertyRename {
    readonly from: string;
    readonly to: string;
}
export declare function renameComponentReferences(source: string, names: ReadonlySet<string>, rename: PropertyRename, owner: 'definition' | 'consumer'): Result<string>;
export declare function renameComponentOptionValues(source: string, names: ReadonlySet<string>, propertyName: string, renames: readonly PropertyOptionRename[]): Result<string>;
export declare function bindComponentDefault(source: string, name: string, binding: string): Result<string>;
