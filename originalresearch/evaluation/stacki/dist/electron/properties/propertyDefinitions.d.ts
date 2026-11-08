import type { ComponentProperties, PropertyChange } from '../../shared/properties/propertyEditing';
import { type Result } from '../../shared/core/result';
export declare function readComponentProperties(source: string): ComponentProperties;
export declare function editPropertyDefinition(source: string, change: PropertyChange): Result<string>;
