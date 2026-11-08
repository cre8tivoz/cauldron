import type { PageNode, PageNodeList, PageModel, ParsePageResult } from './pageNodeTypes';
export { assertTreeInvariants } from './pageTreeInvariants';
export type * from './pageNodeTypes';
export declare function parseMapBodyParts(input: unknown, children: unknown): readonly string[];
interface ParseContext {
    nodes: number;
}
export declare const LOOP_FRAGMENTS: readonly ["<>", "Fragment"];
/** Parse one node subtree. Throws on any violation — boundary code decides
 * whether to let that propagate or convert it to a Result. */
export declare function parsePageNode(input: unknown, where?: string, depth?: number, context?: ParseContext): PageNode;
/** Parse a whole tree (a page model's nodes array). */
export declare function parsePageTree(input: unknown): PageNodeList;
/** Parse a full page model, including the source slots used to preserve imports. */
export declare function parsePageModel(input: unknown): PageModel;
/** Parse the parsePage result envelope: not-editable is data, not an error. */
export declare function parsePageResult(input: unknown): ParsePageResult;
/** Parse the page:read envelope: the parse result plus the source text. */
export declare function parsePageReadResult(input: unknown): ParsePageResult & {
    readonly source: string;
};
