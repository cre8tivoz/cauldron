import ts from 'typescript';
import type { PropertyOrigin } from '../../shared/properties/propertyEditing';
import type { PropertySyntax } from './propertySyntax';
export interface PropertyOrigins {
    readonly members: ReadonlyMap<string, readonly ts.PropertySignature[]>;
    readonly origin: (name: string, binding: ts.BindingElement | undefined) => PropertyOrigin;
}
export declare function readPropertyOrigins(document: PropertySyntax): PropertyOrigins;
