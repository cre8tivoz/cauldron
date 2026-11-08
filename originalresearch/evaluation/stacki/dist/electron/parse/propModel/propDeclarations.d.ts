import ts from 'typescript';
import { type PropsDeclaration } from '../../../shared/properties/propModel';
import type { PropUnion } from '../../../shared/properties/propSchema';
import { type FiledSignature, type TypeScope } from './propTypes';
/** The type that describes the props, and how the component wrote it. */
export interface PropsType {
    readonly declaration: PropsDeclaration;
    readonly blocks: readonly (readonly FiledSignature[])[];
    readonly unions: readonly PropUnion[];
}
/** A `const { … } = Astro.props` (or `= props`, a name that holds them) and its annotation. */
export interface PropsPattern {
    readonly pattern: ts.ObjectBindingPattern;
    readonly annotation: ts.TypeNode | undefined;
}
/** The props type of a component: frontmatter first, then the imported declarations. */
export declare function readPropsType(frontmatter: ts.SourceFile, prelude: ts.SourceFile, scope: TypeScope, patterns: readonly PropsPattern[]): PropsType;
/**
 * A member's doc comment: the comments right above it. A comment on the line
 * of the member before belongs to that member, not this one, unless this
 * member opens the line (`{ /** Tip. *\/ title: string }`).
 */
export declare function memberDocumentation(signature: FiledSignature): string;
/**
 * The props a union branch's doc promises a different fallback for in each
 * branch: there is no single answer for the field, so the field claims none
 * and the branch tables carry the per-branch answers.
 */
export declare function splitFallbacks(unions: readonly PropUnion[]): ReadonlySet<string>;
