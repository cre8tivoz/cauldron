import type { Capability } from './capability';
import type { AttrSpan, PageNode, ParsePageResult } from './pageNode';
import { type NodeKind, type StructuralPath } from './ref';
import { type ByteSpan } from '../core/span';
export interface ProjectedAttribute {
    readonly name: string;
    readonly type: AttrSpan['type'];
    readonly span: ByteSpan;
    /** Absent on a spread, which has no name of its own. */
    readonly nameSpan: ByteSpan | undefined;
    /** Absent on a bare attribute, which has no value. */
    readonly valueSpan: ByteSpan | undefined;
    readonly capability: Capability;
}
/** How a node itself is written (step 10): as markup — a tag, text or code of
 * an .astro template, or JSX and HTML inside Markdown — or in Markdown's own
 * syntax, where a paragraph has no tag and an image no attribute names. */
export type NodeSyntax = 'markup' | 'markdown';
/** The list a node sits in, which decides what separates it from its
 * siblings (step 10): markup (whitespace), Markdown blocks (a blank line, and
 * the prefix of the container they are in), a Markdown list's items (a line
 * break), or the inline text of a Markdown block, which has no siblings to
 * place beside. */
export type NodeList = 'markup' | 'blocks' | 'items' | 'inline';
export interface ProjectedNode {
    readonly kind: NodeKind;
    readonly path: StructuralPath;
    readonly span: ByteSpan;
    readonly attributes: readonly ProjectedAttribute[];
    readonly capability: Capability;
    readonly syntax: NodeSyntax;
    readonly list: NodeList;
    /** Callback roots occupy separate JavaScript expressions, not a sibling list. */
    readonly callback?: true;
}
export interface Diagnostic {
    readonly message: string;
    /** The source text the parser stopped on, when it named one. */
    readonly near: string | undefined;
}
export type Projection = {
    readonly tag: 'valid';
    /** Length of the bytes this was derived from: the snapshot checks it. */
    readonly byteLength: number;
    /** UTF-16 code units of the same text. The parser bounds a page in these
     * (`ipcFieldCharsMax`), so a projection derived without reparsing
     * (projectionPatch.ts) carries them to stay inside the parser's bound. */
    readonly utf16Length: number;
    /** The fenced frontmatter block, `---` to `---` inclusive, when present. */
    readonly frontmatter: ByteSpan | undefined;
    /** Every node in document order (preorder). */
    readonly nodes: readonly ProjectedNode[];
} | {
    readonly tag: 'parse-error';
    readonly byteLength: number;
    readonly diagnostics: readonly Diagnostic[];
};
/** Whether visual intents can be planned against this projection at all. */
export declare function projectionAcceptsVisualIntents(projection: Projection): boolean;
/** Project one page. `result` is the validated output of the parser run on
 * exactly `text` with source offsets on: `parsePage(text, { locs })` for an
 * `.astro` page, `parseMarkdownPage(text)` for Markdown and MDX (step 10). */
export declare function projectPage(text: string, result: ParsePageResult): Projection;
/** Project a file the engine addresses only as a whole document — a stylesheet
 * written through its own actor (plan §3.3). Valid, with no nodes: document
 * anchors and code patches may target it, visual node intents may not. */
export declare function projectOpaqueDocument(text: string): Projection;
/** Plan §6: native elements, component invocations, text, comments, a page's
 * own `<style>` and the structural nodes are visually editable; opaque code is
 * not; anything inside a loop body is one source node rendered many times. */
export declare function classifyNode(node: PageNode, placement: {
    readonly repeated: boolean;
}): Capability;
