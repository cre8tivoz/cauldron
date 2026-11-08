import type { Result } from '../core/result';
export declare const PROPERTY_LIMITS: {
    readonly fieldsMax: 512;
    readonly sourceCharsMax: number;
    readonly textCharsMax: 32768;
    readonly nameCharsMax: 128;
    readonly filesMax: 10000;
    readonly totalCharsMax: number;
    readonly nodesMax: 200000;
};
export interface ComponentProperty {
    readonly name: string;
    readonly type: string;
    readonly required: boolean;
    readonly readonly: boolean;
    readonly defaultValue: string;
    readonly description: string;
    readonly origin?: PropertyOrigin;
    readonly editing?: PropertyEditing;
    readonly conditions?: readonly string[];
}
export type PropertyEditing = {
    readonly kind: 'editable';
} | {
    readonly kind: 'override';
    readonly reason: string;
} | {
    readonly kind: 'restricted';
    readonly reason: string;
};
export interface PropertySource {
    readonly label: string;
    readonly expression: string;
    readonly line: number;
}
export interface PropertyOrigin {
    readonly declarations: readonly PropertySource[];
    readonly defaultValue?: PropertySource;
}
export interface ComponentProperties {
    readonly source: string;
    readonly properties: readonly ComponentProperty[];
    readonly frontmatter: string;
    readonly advanced: boolean;
}
export interface PropertyOptionRename {
    readonly from: string;
    readonly to: string;
}
export type PropertyChange = {
    readonly kind: 'save';
    readonly originalName: string;
    readonly property: ComponentProperty;
    readonly optionRenames?: readonly PropertyOptionRename[];
} | {
    readonly kind: 'remove';
    readonly name: string;
} | {
    readonly kind: 'order';
    readonly names: readonly string[];
} | {
    readonly kind: 'options';
    readonly name: string;
    readonly type: string;
} | {
    readonly kind: 'source';
    readonly frontmatter: string;
};
export declare function propertyText(input: unknown): string;
export declare function propertySource(input: unknown): string;
export declare function propertyName(input: unknown): string;
export declare function parseComponentProperty(input: unknown): ComponentProperty;
export declare function propertyList<T>(input: unknown, parse: (input: unknown) => T): readonly T[];
export declare function parsePropertyChange(input: unknown): PropertyChange;
export declare function parseComponentProperties(input: unknown): ComponentProperties;
export declare function parsePropertiesResult<T>(input: unknown, parse: (value: unknown) => T): Result<T>;
