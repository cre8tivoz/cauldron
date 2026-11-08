import ts from 'typescript';
import type { ComponentProperty } from '../../shared/properties/propertyEditing';
import type { SourceEdit } from './propertySyntax';
/** The comment a member's tooltip lives in, as a range of the frontmatter. */
export interface MemberComment {
    readonly start: number;
    readonly end: number;
    readonly kind: 'jsdoc' | 'lines';
    readonly description: string;
}
/** The parts of a property that its declaration in a type states. */
export type DeclaredFields = Pick<ComponentProperty, 'name' | 'type' | 'required' | 'readonly' | 'description'>;
/** Whether two properties state the same source: what a save compares before writing anything. */
export declare function sameProperty(left: ComponentProperty, right: ComponentProperty): boolean;
/** Whether two properties state the same declaration (everything but the default). */
export declare function sameDeclaration(left: DeclaredFields, right: DeclaredFields): boolean;
/** The doc comment directly above a member, or undefined when it has none. */
export declare function memberComment(frontmatter: string, member: ts.PropertySignature): MemberComment | undefined;
/**
 * The edits that turn `member` (read as `previous`) into `property`: one for
 * its doc comment, modifiers, name and question mark (they sit together before
 * the type), one for its type. Nothing else in the member is touched.
 */
export declare function memberEdits(frontmatter: string, member: ts.PropertySignature, previous: DeclaredFields, property: DeclaredFields): readonly SourceEdit[];
/**
 * The edits that turn a destructure entry (read as `previous`) into
 * `property`: the key on a rename, the default on a default change. The local
 * name the markup reads is kept, so a rename never touches the template here.
 */
export declare function bindingEdits(binding: ts.BindingElement, previous: Pick<ComponentProperty, 'name' | 'defaultValue'>, property: ComponentProperty): readonly SourceEdit[];
/** A tooltip as a JSDoc comment: one line when it fits on one and was one, else a block at the member's indent. */
export declare function renderComment(description: string, indent: string, layout: {
    readonly multiline: boolean;
}): string;
