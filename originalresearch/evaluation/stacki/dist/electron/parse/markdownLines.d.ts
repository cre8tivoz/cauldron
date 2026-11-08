import type { Attr, AttrSpan } from '../../shared/page/pageNode';
export interface Line {
    readonly text: string;
    readonly start: number;
}
export interface MdNode {
    id?: string;
    kind: string;
    name?: string;
    value?: string;
    inner?: string;
    props?: Record<string, Attr> | undefined;
    children?: MdNode[] | undefined;
    start?: number;
    end?: number;
    attrSpans?: readonly AttrSpan[];
    mdBlanksBefore?: number;
    mdIndent?: string;
    mdFence?: string;
    mdInfo?: string;
    mdUnclosed?: boolean;
    mdRaw?: string;
    mdGap?: string;
    mdTrail?: string;
    mdSetext?: string;
    mdImage?: boolean;
    mdNumbers?: readonly number[];
    mdLoose?: boolean;
    mdMarker?: string;
    mdSource?: string;
    mdEsm?: boolean;
}
export type MarkdownNodeList = MdNode[] & {
    mdTrailingBlanks?: number;
};
/** What the printer reads: a parsed node, or a new one an edit adds. */
export interface PrintNode {
    readonly kind: string;
    readonly name?: string;
    readonly value?: string;
    readonly inner?: string;
    readonly props?: Readonly<Record<string, Attr>> | undefined;
    readonly children?: readonly PrintNode[] | undefined;
    readonly mdBlanksBefore?: number;
    readonly mdIndent?: string;
    readonly mdFence?: string;
    readonly mdInfo?: string;
    readonly mdUnclosed?: boolean;
    readonly mdRaw?: string;
    readonly mdGap?: string;
    readonly mdTrail?: string;
    readonly mdSetext?: string;
    readonly mdNumbers?: readonly number[];
    readonly mdMarker?: string;
    readonly mdSource?: string;
}
/** Where a node is written: the prefix every line after its first carries
 * (a quote's `> `, an item's indentation, both when nested) and the file's
 * line break. */
export interface MarkdownLayout {
    readonly prefix: string;
    readonly eol: string;
}
export declare const PENDING_ID = "n0";
export declare const ATX_RE: RegExp;
export declare const FENCE_RE: RegExp;
export declare const FENCE_CLOSE_RE: RegExp;
export declare const RULE_RE: RegExp;
export declare const BULLET_RE: RegExp;
export declare const ORDERED_RE: RegExp;
export declare const QUOTE_RE: RegExp;
export declare const SETEXT_RE: RegExp;
export declare const MARKUP_RE: RegExp;
export declare const LAZY_BREAK_RE: RegExp;
export declare const IMAGE_ONLY_RE: RegExp;
export declare const ESM_RE: RegExp;
export declare const MDX_IMPORT_RE: RegExp;
export declare const CONTAINER_DEPTH_MAX: number;
export declare function splitFrontmatter(source: string): {
    frontmatter: string | undefined;
    body: string;
    offset: number;
};
export declare function layoutFromFrontmatter(frontmatter: string | undefined): string | undefined;
export declare function splitLines(body: string, base: number): Line[];
export declare function lineAt(lines: readonly Line[], index: number): Line;
export declare function isBlank(line: Line): boolean;
export declare function lineEnd(line: Line): number;
export declare function nonBlankEnd(lines: readonly Line[], from: number): number;
export declare function placed(lines: readonly Line[], first: number, next: number): {
    id: string;
    start: number;
    end: number;
};
/** Lines joined with `\n`, as a block reads them, and the file offset of any
 * offset into that text: a position inside or at the end of a line is that
 * far into the line's own text in the file. */
export interface Joined {
    readonly text: string;
    readonly at: (offset: number) => number;
}
export declare function joinedLines(lines: readonly Line[]): Joined;
export declare function relocate(roots: readonly MdNode[], at: (offset: number) => number): void;
export declare function relocatedAttr(entry: AttrSpan, at: (offset: number) => number): AttrSpan;
export declare function markdownAttr(name: string, span: readonly [number, number], value: readonly [number, number]): AttrSpan;
