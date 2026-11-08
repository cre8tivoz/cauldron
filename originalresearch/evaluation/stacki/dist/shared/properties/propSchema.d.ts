export type PropDefault = string | number | boolean;
export interface DefaultRule {
    readonly prop: string;
    readonly is: string;
    readonly then: string;
    readonly otherwise: string;
}
export interface UnionBranch {
    readonly forbids: readonly string[];
    readonly pins: Readonly<Record<string, readonly string[]>>;
    readonly defaults: Readonly<Record<string, string | number>>;
    readonly rules: Readonly<Record<string, DefaultRule>>;
    readonly docs: Readonly<Record<string, string>>;
}
export interface PropUnion {
    readonly names: readonly string[];
    readonly branches: readonly UnionBranch[];
}
export interface PropShapeField {
    readonly name: string;
    readonly type: string;
}
export declare const CODE_KINDS: readonly ["object", "function", "opaque"];
export type CodeKind = (typeof CODE_KINDS)[number];
export interface PropField {
    readonly name: string;
    readonly type: string;
    readonly optional: boolean;
    readonly options?: readonly string[];
    readonly numeric?: boolean;
    readonly expressionOptions?: readonly string[];
    readonly codeKind?: CodeKind;
    readonly typeText?: string;
    readonly default?: PropDefault | undefined;
    readonly defaultExpr?: boolean;
    readonly defaultAsset?: string;
    readonly hint?: string;
    readonly doc?: string;
    readonly min?: number;
    readonly max?: number;
    readonly step?: number;
    readonly minExclusive?: boolean;
    readonly maxExclusive?: boolean;
    readonly shape?: readonly PropShapeField[];
    readonly shapeIsList?: boolean;
    readonly unions?: readonly PropUnion[];
    readonly deprecated?: string;
    readonly usage?: PropFieldUsage;
}
/** Whether a component reads a prop, as the prop model states it (propModel.ts PROP_USAGES). */
export declare const PROP_FIELD_USAGES: readonly ["read", "unread", "unknown"];
export type PropFieldUsage = (typeof PROP_FIELD_USAGES)[number];
export type PropSchema = ReadonlyMap<string, PropField>;
export declare function parseField(input: unknown, where: string): PropField;
export declare function parsePropSchema(input: unknown): PropSchema;
