import type { Placement } from './intent';
import { type ValidProjection } from './planSupport';
import { type ByteSpan, type ByteString } from '../core/span';
import type { ProjectedNode } from '../page/sourceProjection';
/** Bytes a Markdown edit replaces, and what it writes there. */
export interface MarkdownSplice {
    readonly range: ByteSpan;
    readonly text: string;
}
/** An insertion's splice; `anchorPath` is where the anchor sits once it is in. */
export interface MarkdownInsertion extends MarkdownSplice {
    readonly anchorPath: readonly number[];
}
/** What a removal of `node` takes out of the tree: the node, or — the only
 * item of a list — the list. */
export declare function markdownRemoved(projection: ValidProjection, node: ProjectedNode): ProjectedNode;
/** What removing a Markdown block or item writes: the node and the gap before
 * it, or the gap after it, whichever leaves its neighbours separated; between
 * two blocks that no remaining gap separates, a blank line in their place.
 * Undefined when that blank line has no prefix to be written with. */
export declare function markdownRemoval(bytes: ByteString, projection: ValidProjection, node: ProjectedNode): MarkdownSplice | undefined;
/** The sibling a Markdown insertion stands beside, and on which side: `node`
 * itself, or for an insertion inside it, its first or last child. Undefined
 * when there is none — an empty item or quote gives the new block no line to
 * take its prefix from. */
export declare function markdownBeside(projection: ValidProjection, node: ProjectedNode, placement: Placement): {
    readonly node: ProjectedNode;
    readonly side: 'before' | 'after';
} | undefined;
/** A block or item beside `beside`, separated as it is from its neighbour:
 * a zero-width splice, or — a block going into a gap that does not separate
 * blocks — the gap rewritten with a blank line on each side of it. */
export declare function markdownInsertion(bytes: ByteString, projection: ValidProjection, beside: {
    readonly node: ProjectedNode;
    readonly side: 'before' | 'after';
}, anchorPath: readonly number[], text: string): MarkdownInsertion | undefined;
/** The moved node's text for a new place: its lines after the first carry the
 * destination's prefix instead of its own. Undefined when a line carries
 * neither its container's prefix nor, blank, that prefix's visible part — a
 * lazy continuation line, whose meaning is its place. */
export declare function reprefixed(bytes: ByteString, node: ProjectedNode, destination: string): string | undefined;
/** How an item's marker is written: its bullet character, or the character
 * closing its number. Items of one list share it; an item carrying another
 * starts a new list. */
export declare function itemMarker(bytes: ByteString, item: ProjectedNode): string;
/** The file's line break, as its first line ends. */
export declare function lineBreakOf(bytes: ByteString): string;
