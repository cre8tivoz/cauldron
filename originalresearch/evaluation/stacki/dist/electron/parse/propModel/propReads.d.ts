import ts from 'typescript';
import type { PropDefault } from '../../../shared/properties/propSchema';
import type { PropsPattern } from './propDeclarations';
/** One destructure entry: the prop it reads and its default, as written. */
export interface PropEntry {
    readonly name: string;
    readonly fallback: EntryFallback;
}
/** A destructure default: a literal is a value; anything else is kept as code. */
export type EntryFallback = {
    readonly kind: 'none';
} | {
    readonly kind: 'literal';
    readonly value: PropDefault;
} | {
    readonly kind: 'expression';
    readonly code: string;
    readonly shape: 'array' | 'object' | 'function' | 'other';
};
/** What the component's code says about reading its props. */
export interface PropReads {
    readonly patterns: readonly PropsPattern[];
    readonly entries: readonly PropEntry[];
    readonly direct: readonly string[];
    readonly escapes: boolean;
}
export declare function readProps(frontmatter: ts.SourceFile, template: string): PropReads;
/** What a default's code says: a literal is its value, anything else stays code. */
export declare function entryFallback(initializer: ts.Expression, file: ts.SourceFile): EntryFallback;
/**
 * A literal expression's value: a whole string (a template only when it has no
 * `${}`: `` `${SITE}:` `` is an expression), `true`/`false`, or a number in any
 * of the ways JS writes one (`-2`, `0.5`, `1e3`, `0x10`, `1_000`).
 */
export declare function literalValue(node: ts.Expression): PropDefault | undefined;
/**
 * The literals renamed props fall back to, by the name declared:
 * `const alt = altProp ?? ""`, `const year = Astro.props.year ?? 2026`. The
 * first such declaration of each name in the frontmatter; read once per file.
 */
export declare function nullishFallbacks(frontmatter: ts.SourceFile): ReadonlyMap<string, PropDefault>;
