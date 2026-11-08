import type { Attr, AttrSpan } from '../../shared/page/pageNode';
import type { ParserNode } from './astroParserTypes';
export { HTML_VOID_TAGS as VOID_ELEMENTS } from '../../shared/page/htmlTags';
export declare const RAW_ELEMENTS: Set<string>;
export declare const makeId: () => string;
export declare function assignPathIds(nodes: readonly ParserNode[], prefix: string, depth: number): void;
export declare function parseAttrs(attrString: string): Record<string, Attr>;
export declare function attrsAsWritten(node: ParserNode): string | undefined;
export declare function tagProps(attrs: string, attrsAt: number | undefined): {
    props: Record<string, Attr>;
    attrOrder?: string[];
    attrSpans?: AttrSpan[];
};
export declare function serializeAttrs(props: Readonly<Record<string, Attr>> | undefined, order?: readonly string[]): string;
export declare function required<T>(value: T | undefined, message: string): T;
