import type ts from 'typescript';
import type { DefaultRule } from '../../../shared/properties/propSchema';
import type { NumberRules } from '../astroParserTypes';
export interface StatedDefault {
    readonly value?: string | number;
    readonly hint?: string;
    readonly when?: DefaultRule;
}
/**
 * The doc of the member that starts at `position`: the comments right above it,
 * as one line of text. A blank line ends a comment's reach, so a note about the
 * interface itself does not land on whatever prop comes next. Block comments
 * lose their `/*`, `*\/` and leading `*`; line comments their `//`.
 */
export declare function commentDocumentation(text: string, position: number, ranges: readonly ts.CommentRange[]): string;
export declare function statedDefault(documentation: string | undefined): StatedDefault;
export declare function numberRules(documentation: string | undefined): NumberRules;
/**
 * What every branch of a union says about each prop it documents differently:
 * their common opening, to the last sentence they share. Where they part is
 * the per-branch fallback, which the field answers for the branch in force.
 */
export declare function sharedDocumentation(branchDocs: readonly Readonly<Record<string, string>>[]): ReadonlyMap<string, string>;
