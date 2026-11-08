import type { PropertyChange } from '../../shared/properties/propertyEditing';
import { type Result } from '../../shared/core/result';
interface PropertyLocation {
    readonly projectPath: string;
    readonly file: string;
}
interface PropertyEditRequest extends PropertyLocation {
    readonly source: string;
    readonly change: PropertyChange;
}
export interface FileChange {
    readonly file: string;
    readonly before: string;
    readonly after: string;
}
export declare function planPropertyChanges(request: PropertyEditRequest, source: string): Result<readonly FileChange[]>;
export {};
