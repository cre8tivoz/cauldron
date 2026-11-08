import type { CodeKind, PropDefault, PropShapeField, PropUnion } from './propSchema';
import type { ComponentPropModel, PropControl, PropUsage } from './propModel';
/** The schema's own word for each kind of value a field takes. */
export type SchemaFieldType = 'enum' | 'attrs' | 'code' | 'string' | 'number' | 'boolean' | 'other';
/** One schema field, as made from the model. */
export interface ModelSchemaField {
    readonly name: string;
    readonly type: SchemaFieldType;
    readonly optional: boolean;
    readonly default: PropDefault | undefined;
    readonly defaultExpr?: boolean;
    readonly hint?: string;
    readonly options?: readonly string[] | undefined;
    readonly numeric?: boolean | undefined;
    readonly expressionOptions?: readonly string[];
    readonly codeKind?: CodeKind;
    readonly typeText?: string;
    readonly doc?: string | undefined;
    readonly min?: number;
    readonly max?: number;
    readonly step?: number;
    readonly minExclusive?: boolean;
    readonly maxExclusive?: boolean;
    readonly shape?: readonly PropShapeField[];
    readonly shapeIsList?: boolean;
    readonly unions?: readonly PropUnion[] | undefined;
    readonly deprecated?: string;
    readonly usage?: PropUsage;
}
/** The schema fields of a component's model, in the model's order. */
export declare function schemaFieldsOf(model: ComponentPropModel): ModelSchemaField[];
/** The schema type and code kind a control is shown as. */
export declare function schemaTypeOf(control: PropControl): {
    readonly type: SchemaFieldType;
    readonly codeKind: CodeKind | undefined;
};
/** A type's text as the panel shows it beside a value set in code: one line, bounded. */
export declare function shownTypeText(typeText: string): string;
