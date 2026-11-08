import type { SpanMapping } from './mapSpan';
import type { AnchorRef, NodeKind, StructuralPath } from '../page/ref';
import { type Result } from '../core/result';
import type { RejectionReason } from './intent';
import type { Snapshot } from '../page/snapshot';
import type { ProjectedNode, Projection } from '../page/sourceProjection';
import { type ByteSpan, type ByteString } from '../core/span';
export type SpanMapper = (span: ByteSpan) => SpanMapping;
export type ValidProjection = Extract<Projection, {
    tag: 'valid';
}>;
/** The two snapshots an intent is planned between, and how spans of the first
 * reach the second. */
export interface PlanContext {
    readonly authored: Snapshot;
    readonly current: Snapshot;
    readonly mapSpan: SpanMapper;
}
/** A node the anchor named, found again in the bytes on disk now. `shift` is
 * how far its identity region moved: every span inside that region moved by
 * exactly as much, because a resolved region is kept whole. */
export interface Target {
    readonly authored: ProjectedNode;
    readonly current: ProjectedNode;
    readonly shift: number;
}
/** Both projections, when both parse; a visual intent needs both. */
export declare function validProjections(context: PlanContext): Result<{
    readonly authored: ValidProjection;
    readonly current: ValidProjection;
}, RejectionReason>;
/** Resolve a node anchor in the authored bytes, then find the same node in the
 * current bytes through its identity region. Every rejection of resolution is
 * decided here, so each operation starts from a node known to be the one the
 * intent named. Capabilities are the operation's to check. */
export declare function resolveTarget(context: PlanContext, anchor: AnchorRef): Result<Target, RejectionReason>;
/** Whether a node is written as a tag: an element, component or raw block of
 * markup. A Markdown block has no tag — a paragraph, a heading, a list — and
 * the attributes Markdown writes (an image's alt) are its own syntax. */
export declare function writtenAsTag(node: ProjectedNode): boolean;
/** For a tag with attributes, the name through the end of the last one; for
 * anything else — a bare tag included — the whole node. A bare tag's name is
 * shared by every tag of that name (`p`), so alone it identifies nothing; its
 * bytes with its content usually do, at the price of refusing a stale intent
 * whose node someone edited inside. The first byte of a tag is its `<`. A
 * Markdown block is its whole node: it has no name to start from. */
export declare function identityRegion(bytes: ByteString, node: ProjectedNode): ByteSpan;
export declare function isTagKind(kind: NodeKind): boolean;
/** One past the tag name: the name runs to the first whitespace, `/` or `>`.
 * A shorthand fragment `<>` has none: its name ends where it starts. */
export declare function tagNameEnd(bytes: ByteString, node: ProjectedNode): number;
/** One past the `>` that ends a tag's opening, and whether it closes itself. */
export declare function openTagEnd(bytes: ByteString, node: ProjectedNode): {
    readonly end: number;
    readonly selfClosing: boolean;
};
/** Where a paired tag's closing tag starts: the last `</` inside the node. */
export declare function closeTagStart(bytes: ByteString, node: ProjectedNode, from: number): number | undefined;
export declare function nodeAtPath(projection: ValidProjection, path: StructuralPath): ProjectedNode | undefined;
/** A node's parent path; the root list's is empty. */
export declare function parentPath(path: StructuralPath): StructuralPath;
/** Whether a node is a text node of whitespace alone: the parser keeps the
 * line breaks between root nodes as text, and they separate, not content. */
export declare function blankText(bytes: ByteString, node: ProjectedNode): boolean;
/** The node's siblings in document order, itself included. */
export declare function siblingsOf(projection: ValidProjection, node: ProjectedNode): readonly ProjectedNode[];
/** The nodes of the subtree rooted at `node`, itself first, in document order. */
export declare function subtreeOf(projection: ValidProjection, node: ProjectedNode): readonly ProjectedNode[];
/** Proper ancestors, outermost first. */
export declare function ancestorsOf(projection: ValidProjection, path: StructuralPath): readonly ProjectedNode[];
export declare function startsWith(path: StructuralPath, prefix: StructuralPath): boolean;
export declare function samePath(left: StructuralPath, right: StructuralPath): boolean;
export declare function sameSpan(left: ByteSpan, right: ByteSpan): boolean;
export declare function slice(bytes: ByteString, span: ByteSpan): ByteString;
/** The node's bytes are the ones it was authored with: a remove or a move
 * takes the whole node, so a change anywhere inside it is someone else's. */
export declare function nodeUnchanged(context: PlanContext, target: Target): boolean;
/** The text of a span. Spans come from the parser's code-point boundaries, so
 * the slice is valid UTF-8 whenever the file is. */
export declare function textOf(bytes: ByteString, span: ByteSpan): string;
/** Byte offsets, relative to the text's start, of ascending UTF-16 offsets. */
export declare function byteOffsetsIn(text: string, offsets: readonly number[]): readonly number[];
export declare function isWhitespace(byte: number): boolean;
/** Where the run of whitespace ending at `end` starts, no earlier than `floor`. */
export declare function whitespaceBefore(bytes: ByteString, end: number, floor: number): number;
/** Where the run of whitespace starting at `start` ends, no later than `ceiling`. */
export declare function whitespaceAfter(bytes: ByteString, start: number, ceiling: number): number;
export declare function containsNewline(bytes: ByteString, span: ByteSpan): boolean;
/** The indentation of the line holding `offset`: its leading spaces and tabs. */
export declare function lineIndent(bytes: ByteString, offset: number): string;
/** Whether a node may be taken out, put back or stood beside whole. Its own
 * content may be code the editor does not read (an expression, a `<style>`,
 * `set:html`); the list it sits in is still plain markup. A node a loop
 * repeats, or one assembled from another file, is not. */
export declare function nodePlaceable(node: ProjectedNode): boolean;
/** Whether visual intents may edit this node. A node repeated by a loop is
 * one source node shown many times (plan §6): since step 7 the canvas addresses
 * that source node, and an edit of it changes every copy. Only a move may take
 * one out of its loop (planTree.ts); nothing is placed beside it. */
export declare function nodeEditable(node: ProjectedNode): boolean;
/** A replacement changes only hunks proven to belong to one source node, so
 * it can safely carry visual edits through syntax whose contents stay opaque. */
export declare function nodeRewriteable(node: ProjectedNode): boolean;
