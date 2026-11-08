import { type Line, type MdNode, type MarkdownNodeList, type Joined } from './markdownLines';
/** A line as one container sees it: its text with the container's own syntax
 * taken off the front (a quote's `>`, an item's indentation), and where that
 * text starts in the file. */
export interface ParseEnv {
    readonly mdx: boolean;
    readonly imports: {
        name: string;
        path: string;
    }[];
    readonly esm: string[];
}
/** What one block reader consumed: its nodes, and the first line after them. */
export interface BlockRead {
    readonly nodes: readonly MdNode[];
    readonly next: number;
}
export declare function parseBlocks(lines: readonly Line[], env: ParseEnv, depth: number): MarkdownNodeList;
export declare function readBlock(lines: readonly Line[], index: number, env: ParseEnv, depth: number): BlockRead;
export declare function readEsm(lines: readonly Line[], index: number, env: ParseEnv): BlockRead | undefined;
export declare function readMarkup(lines: readonly Line[], index: number, env: ParseEnv): BlockRead | undefined;
export declare function readFence(lines: readonly Line[], index: number): BlockRead | undefined;
export declare function closingFence(lines: readonly Line[], from: number, marker: string): number | undefined;
export declare function readRule(lines: readonly Line[], index: number): BlockRead | undefined;
export declare function readHeading(lines: readonly Line[], index: number): BlockRead | undefined;
export declare function readQuote(lines: readonly Line[], index: number, env: ParseEnv, depth: number): BlockRead | undefined;
export declare function rawBlock(lines: readonly Line[], index: number, next: number): BlockRead;
/** One list's shape, read off its first line: what every item of it shares. */
export interface ListShape {
    readonly ordered: boolean;
    readonly indent: string;
    readonly marker: string;
}
export declare function readList(lines: readonly Line[], index: number, env: ParseEnv, depth: number): BlockRead | undefined;
/** One item's lines: the text after its marker, then what is indented under it. */
export interface ItemRead {
    readonly inner: readonly Line[];
    readonly gap: string;
    readonly number: number | undefined;
    readonly loose: boolean;
    /** The last line holding the item's content. */
    readonly last: number;
    readonly next: number;
}
export declare function readItem(lines: readonly Line[], index: number, shape: ListShape): ItemRead | undefined;
export declare function firstNonBlank(lines: readonly Line[], from: number): number | undefined;
export declare function itemNode(lines: readonly Line[], index: number, item: ItemRead, env: ParseEnv, depth: number): MdNode;
export declare function listNode(lines: readonly Line[], index: number, next: number, read: {
    readonly shape: ListShape;
    readonly items: MdNode[];
    readonly numbers: readonly number[];
}): MdNode;
export declare function readTable(lines: readonly Line[], index: number): BlockRead | undefined;
export declare function endsParagraph(text: string): boolean;
export declare function readParagraph(lines: readonly Line[], index: number): BlockRead;
export declare function imageNode(lines: readonly Line[], index: number, next: number, text: Joined): MdNode | undefined;
export declare function assignPathIds(roots: readonly MdNode[]): {
    nodes: number;
    depth: number;
};
