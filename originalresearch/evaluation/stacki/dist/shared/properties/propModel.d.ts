import { type PropDefault, type PropFieldUsage, type PropUnion } from './propSchema';
export declare const PROP_MODEL_LIMITS: {
    readonly propNestingDepthMax: 4;
    readonly propVariantsMax: 32;
    readonly propsMax: 512;
    readonly optionsMax: 256;
    readonly unionsMax: 64;
    readonly typeTextCharsMax: 8192;
    readonly textCharsMax: 8192;
    readonly docCharsMax: number;
};
/** One option of a Choice; `expression` options are written `flag={true}`, `cols={3}`. */
export interface ChoiceOption {
    readonly value: string;
    readonly written: 'string' | 'expression';
}
/** Why a prop's value can only be given in code. */
export declare const CODE_REASONS: readonly ["untyped", "unrecognized", "opaque", "tuple", "nestingDepth"];
export type CodeReason = (typeof CODE_REASONS)[number];
export type PropControl = {
    readonly kind: 'text';
} | {
    readonly kind: 'number';
    readonly min: number | undefined;
    readonly max: number | undefined;
    readonly minExclusive: boolean;
    readonly maxExclusive: boolean;
    readonly step: number | undefined;
    readonly decimals: number | undefined;
} | {
    readonly kind: 'switch';
    readonly onLabel: string | undefined;
    readonly offLabel: string | undefined;
} | {
    readonly kind: 'choice';
    readonly options: readonly ChoiceOption[];
    readonly numeric: boolean;
} | {
    readonly kind: 'attributes';
    readonly tag: string | undefined;
} | {
    readonly kind: 'list';
    readonly item: PropControl;
} | {
    readonly kind: 'group';
    readonly fields: readonly PropMember[];
} | {
    readonly kind: 'callback';
    readonly signature: string;
} | {
    readonly kind: 'code';
    readonly reason: CodeReason;
};
export type PropControlKind = PropControl['kind'];
export declare const PROP_CONTROL_KINDS: readonly ["text", "number", "switch", "choice", "attributes", "list", "group", "callback", "code"];
/** A member of a group: the part of a prop that nests. */
export interface PropMember {
    readonly name: string;
    readonly typeText: string;
    readonly control: PropControl;
    readonly presence: 'required' | 'optional';
}
/** What a prop is when an instance leaves it unset. */
export type PropFallback = {
    readonly kind: 'none';
} | {
    readonly kind: 'literal';
    readonly value: PropDefault;
    readonly source: 'destructure' | 'nullish' | 'doc';
} | {
    readonly kind: 'expression';
    readonly code: string;
} | {
    readonly kind: 'hint';
    readonly hint: string;
};
/** Why a prop has its control (plan §4: strong usage, medium type, weak name). */
export type Recognition = {
    readonly source: 'type';
} | {
    readonly source: 'usage';
    readonly evidence: string;
} | {
    readonly source: 'name';
    readonly evidence: string;
} | {
    readonly source: 'tag';
    readonly tag: string;
} | {
    readonly source: 'fallback';
};
/** Whether the component reads the prop: `unknown` when the props object escapes whole. */
export declare const PROP_USAGES: readonly ["read", "unread", "unknown"];
export type PropUsage = PropFieldUsage;
export interface PropModel extends PropMember {
    readonly declared: boolean;
    readonly nullable: boolean;
    readonly fallback: PropFallback;
    readonly documentation: string;
    readonly tooltip: string;
    readonly group: string | undefined;
    readonly deprecated: string | undefined;
    readonly format: string | undefined;
    readonly recognition: Recognition;
    readonly usage: PropUsage;
}
/** How a component types its props. */
export declare const PROPS_DECLARATIONS: readonly ["interface", "type", "annotation", "assertion", "none"];
export type PropsDeclaration = (typeof PROPS_DECLARATIONS)[number];
export interface ComponentPropModel {
    readonly declaration: PropsDeclaration;
    readonly props: readonly PropModel[];
    readonly unions: readonly PropUnion[];
}
/** A component's prop model, parsed: every bound and every variant checked. */
export declare function parsePropModel(input: unknown): ComponentPropModel;
