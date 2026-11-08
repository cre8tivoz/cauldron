import { type MarkdownNodeList, type PrintNode, type MarkdownLayout, splitFrontmatter, layoutFromFrontmatter } from './markdownLines';
export { type PrintNode, type MarkdownLayout } from './markdownLines';
/** How one item's marker is written: the list's marker character, the item's
 * number in an ordered list, and the list's own indentation. */
interface ItemMarker {
    readonly marker: string;
    readonly number: number | undefined;
    readonly indent: string;
}
export interface MarkdownModel {
    readonly format: 'md' | 'mdx';
    readonly imports: readonly {
        readonly name: string;
        readonly path: string;
    }[];
    readonly extraFrontmatter: string;
    readonly frontmatterLang: 'yaml';
    readonly layoutPath: string | undefined;
    readonly nodes: MarkdownNodeList;
    readonly mdEol: string;
    readonly mdEndsWithNewline: boolean;
    readonly mdHasFrontmatter: boolean;
    /** Where the body starts, after the byte-order mark and the frontmatter. */
    readonly bodyStart: number;
}
export type MarkdownParse = {
    readonly editable: true;
    readonly model: MarkdownModel;
} | {
    readonly editable: false;
    readonly reason: string;
    readonly bail: undefined;
};
/** Parse a Markdown or MDX page. Every node has its source range; a page whose
 * tree exceeds the wire model's bounds is not editable (the code panel still
 * is), never cut short. */
declare function parseMarkdownPage(source: string, { mdx }?: {
    readonly mdx?: boolean;
}): MarkdownParse;
/** The page printed whole, from its model: the round-trip oracle the tests
 * hold the parser and printer to. Never a write path (plan §11 step 10): a
 * Markdown page reaches disk only as splices; the lint fence keeps this
 * printer to this module and the tests. */
declare function serializeMarkdownPage(model: Pick<MarkdownModel, 'extraFrontmatter' | 'mdHasFrontmatter' | 'mdEol' | 'mdEndsWithNewline'> & {
    readonly nodes: readonly PrintNode[];
}): string;
/** A block, or the text of one, written at its place: the bytes its range
 * holds when it was parsed there and not edited since. A list item needs its
 * list's marker: printMarkdownItem. */
declare function printMarkdownNode(node: PrintNode, layout: MarkdownLayout): string;
/** A list item written at its place: from its marker (the list's indentation
 * belongs to the list) to its last line. */
declare function printMarkdownItem(item: PrintNode, at: Pick<ItemMarker, 'marker' | 'number'> & {
    readonly indent: string;
}, layout: MarkdownLayout): string;
/** The frontmatter block a model describes, as it is written: `---`, the YAML,
 * `---`, in the file's line breaks, without the break after the closing
 * fence. */
declare function printMarkdownFrontmatter(yaml: string, eol: string): string;
export { layoutFromFrontmatter, parseMarkdownPage, printMarkdownFrontmatter, printMarkdownItem, printMarkdownNode, serializeMarkdownPage, splitFrontmatter };
