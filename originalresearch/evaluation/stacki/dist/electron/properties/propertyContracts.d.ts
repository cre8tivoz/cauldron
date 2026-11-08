import ts from 'typescript';
import type { PropertyEditing } from '../../shared/properties/propertyEditing';
import type { PropertySyntax } from './propertySyntax';
export interface PropertyContracts {
    readonly names: ReadonlySet<string>;
    readonly editable: ReadonlyMap<string, ts.PropertySignature>;
    readonly editing: (name: string) => PropertyEditing;
    readonly conditions: (name: string) => readonly string[];
}
export declare function readPropertyContracts(document: PropertySyntax): PropertyContracts;
