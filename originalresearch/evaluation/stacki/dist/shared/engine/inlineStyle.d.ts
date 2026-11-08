import type { StyleDeclaration } from './intent';
/** A replacement inside the style text, in UTF-16 offsets of that text. */
export interface StyleTextEdit {
    readonly start: number;
    readonly end: number;
    readonly text: string;
}
export type StyleEditResult = {
    readonly tag: 'edited';
    readonly edits: readonly StyleTextEdit[];
    readonly text: string;
}
/** The property is declared twice: which one the browser uses is a
 * cascade question, and editing either is a guess. */
 | {
    readonly tag: 'ambiguous';
}
/** The text is not a plain declaration list (unbalanced brackets, a
 * declaration without a colon): edit it as a whole attribute instead. */
 | {
    readonly tag: 'unreadable';
};
/** Set or remove one property. Removing an absent property changes nothing. */
export declare function editInlineStyle(text: string, property: string, declaration: StyleDeclaration): StyleEditResult;
/** The one declaration that turns `before` into `after` — set to a value, or
 * removed — when there is exactly one and editInlineStyle writes exactly
 * `after` for it; undefined for anything else (several changes, a reordered
 * or reformatted list), which is then a whole-attribute edit. */
export declare function singleDeclarationChange(before: string, after: string): {
    readonly property: string;
    readonly declaration: StyleDeclaration;
} | undefined;
export declare function applyStyleEdits(text: string, edits: readonly StyleTextEdit[]): string;
