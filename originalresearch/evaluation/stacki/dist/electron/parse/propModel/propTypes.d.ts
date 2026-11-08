import ts from 'typescript';
import type { PropControl } from '../../../shared/properties/propModel';
/** A declaration a type may name, with the file it was read from (the component, or an imported file). */
export type TypeDeclaration = {
    readonly kind: 'alias';
    readonly node: ts.TypeAliasDeclaration;
    readonly file: ts.SourceFile;
} | {
    readonly kind: 'interface';
    readonly node: ts.InterfaceDeclaration;
    readonly file: ts.SourceFile;
};
/** A frontmatter `const X = [literals]` or `{ key: literal }`, `as const` or not. */
export interface ConstList {
    readonly kind: 'array' | 'object';
    readonly asConst: boolean;
    readonly entries: readonly (readonly [key: string, literal: LiteralPart])[];
}
/** Everything a type may refer to locally. */
export interface TypeScope {
    readonly declarations: ReadonlyMap<string, TypeDeclaration>;
    readonly constLists: ReadonlyMap<string, ConstList>;
}
/** A literal a union is made of, as written. */
export type LiteralPart = {
    readonly form: 'string';
    readonly value: string;
    readonly text: string;
} | {
    readonly form: 'number';
    readonly text: string;
} | {
    readonly form: 'boolean';
    readonly text: 'true' | 'false';
};
/** One member of a flattened union: a type node, or a literal an `as const` list stands for. */
export type TypePart = {
    readonly kind: 'type';
    readonly node: ts.TypeNode;
    readonly file: ts.SourceFile;
    readonly aliases: readonly string[];
} | {
    readonly kind: 'literal';
    readonly literal: LiteralPart;
};
export declare const PROP_TYPE_LIMITS: {
    readonly aliasDepthMax: 12;
    readonly partsMax: number;
    readonly constListsMax: 64;
};
/** The scope of the component's frontmatter, with the declarations a prelude (imported types) adds beneath it. */
export declare function typeScope(files: readonly ts.SourceFile[]): TypeScope;
/** The local alias or interface a reference names, when it names one without type arguments. */
export declare function referencedDeclaration(node: ts.TypeNode, scope: TypeScope): TypeDeclaration | undefined;
/**
 * A type's union members, flattened: parentheses and nested unions opened,
 * aliases that stand for a union of values (no object braces) followed, and
 * `(typeof X)[number]`, `(typeof X)[keyof typeof X]` and `keyof typeof X` over
 * an `as const` list replaced by its literals.
 */
export declare function flattenParts(node: ts.TypeNode, file: ts.SourceFile, scope: TypeScope, followed?: readonly string[]): readonly TypePart[];
/** A part's text as written. */
export declare function partText(part: TypePart): string;
/** The literal a part is, when it is one: `'sm'`, `3`, `-1`, `true`. */
export declare function literalOf(part: TypePart): LiteralPart | undefined;
/** Whether a part is `undefined` or `null`, which say a prop may be absent, not what it holds. */
export declare function isNullish(part: TypePart): boolean;
/** Whether a part is `null` itself. */
export declare function isNull(part: TypePart): boolean;
export declare function isNever(part: TypePart): boolean;
/**
 * Where a type is read from: `depth` counts the lists and groups above it
 * (past PROP_MODEL_LIMITS.propNestingDepthMax a nested object is code), and
 * `aliases` the local aliases and interfaces being followed, so a type that
 * names itself (`type A = readonly A`) ends instead of looping.
 */
export interface TypeWalk {
    readonly depth: number;
    readonly aliases: readonly string[];
}
export declare const TOP_WALK: TypeWalk;
/** The control for a type made of these union parts. */
export declare function controlOfParts(parts: readonly TypePart[], scope: TypeScope, walk: TypeWalk): PropControl;
/** The control for one type node, with its own unions flattened. */
export declare function controlOfType(node: ts.TypeNode, file: ts.SourceFile, scope: TypeScope, walk: TypeWalk): PropControl;
/** The control a local alias or interface stands for. */
export declare function declarationControl(declaration: TypeDeclaration, scope: TypeScope, walk: TypeWalk): PropControl;
export interface FiledSignature {
    readonly member: ts.PropertySignature;
    readonly file: ts.SourceFile;
}
/** An interface's members with those of the local interfaces and aliases it extends, extended ones first. */
export declare function interfaceMembers(declaration: Extract<TypeDeclaration, {
    kind: 'interface';
}>, scope: TypeScope, seen: readonly string[]): readonly FiledSignature[];
/** A member's name as a prop is called: an identifier, or a quoted name such as `'data-id'`. */
export declare function memberKey(name: ts.PropertyName | ts.BindingName): string | undefined;
/** A type text cut to the model's bound. */
export declare function boundedText(text: string): string;
export declare function constListOf(declaration: ts.VariableDeclaration): ConstList | undefined;
/** The value a literal stands for: `'info'` is info, `3` is 3, `true` is true. */
export declare function literalPartValue(literal: LiteralPart): string | number | boolean;
/** A literal expression (`'sm'`, `3`, `-1`, `true`) as the type literal it stands for. */
export declare function expressionLiteral(node: ts.Expression): LiteralPart | undefined;
