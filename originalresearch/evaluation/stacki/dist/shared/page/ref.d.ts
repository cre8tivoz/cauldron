import type { Brand } from '../core/brand';
import { type ByteSpan } from '../core/span';
export declare const NODE_KINDS: readonly ["component", "element", "raw", "text", "expr", "raw-line", "comment", "map", "cond", "branch", "chunk-group"];
export type NodeKind = (typeof NODE_KINDS)[number];
/** Regions an anchor may name besides a node: the frontmatter body, and the
 * whole file (code patches, program rewrites, reverts, a new frontmatter
 * block). */
export declare const ANCHOR_KINDS: readonly ["component", "element", "raw", "text", "expr", "raw-line", "comment", "map", "cond", "branch", "chunk-group", "frontmatter", "document"];
export type AnchorKind = (typeof ANCHOR_KINDS)[number];
/** A 0-based child position within one parent (AGENTS.md §14). */
export type ChildIndex = Brand<number, 'ChildIndex'>;
/** Child indexes from the root list down to the node. Empty exactly for the
 * frontmatter and document anchors, which are not tree nodes. */
export type StructuralPath = readonly ChildIndex[];
export interface AnchorRef {
    readonly span: ByteSpan;
    readonly path: StructuralPath;
    readonly expectedKind: AnchorKind;
}
/** One step deeper than the deepest tree: the root list is step one. */
export declare const STRUCTURAL_PATH_STEPS_MAX: number;
export declare function toChildIndex(value: number): ChildIndex;
export declare function isNodeKind(kind: AnchorKind): kind is NodeKind;
/** The validated constructor: the path length and the kind must agree, and a
 * document anchor starts at the first byte. */
export declare function toAnchorRef(input: AnchorRef): AnchorRef;
export declare function parseAnchorKind(input: unknown, where: string): AnchorKind;
export declare function parseAnchorRef(input: unknown, where: string): AnchorRef;
