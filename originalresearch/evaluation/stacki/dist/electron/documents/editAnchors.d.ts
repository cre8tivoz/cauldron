import type { NodeRef } from '../../shared/engine/editRequest';
import type { RejectionReason, SourceEdit } from '../../shared/engine/intent';
import { type ValidProjection } from '../../shared/engine/planSupport';
import { type AnchorRef } from '../../shared/page/ref';
import { type Result } from '../../shared/core/result';
import type { Snapshot } from '../../shared/page/snapshot';
import type { ProjectedNode } from '../../shared/page/sourceProjection';
import { type ByteSpan } from '../../shared/core/span';
/** How a page is written: its file's extension decides the parser. */
export type PageFormat = 'astro' | 'md' | 'mdx';
/** The snapshot an edit was authored against, decoded and parsed. */
export interface Authored {
    readonly snapshot: Snapshot;
    readonly text: string;
    readonly projection: ValidProjection;
    readonly format: PageFormat;
}
/** A node reference checked against the projection: the anchor an intent
 * carries, and the projected node it names. */
export interface Resolved {
    readonly anchor: AnchorRef;
    readonly node: ProjectedNode;
}
export declare function pageFormat(file: string): PageFormat;
/** The renderer's node reference, checked against the projection of the same
 * bytes: the node at that path must have that kind and that range. */
export declare function resolveRef(authored: Authored, ref: NodeRef): Result<Resolved, RejectionReason>;
/** UTF-16 offsets from the wire: inside the text and on code-point
 * boundaries, or no span at all. */
export declare function byteSpanOf(text: string, start: number, end: number): ByteSpan | undefined;
/** Whether a UTF-16 offset falls between the halves of a surrogate pair. */
export declare function splitsPair(text: string, offset: number): boolean;
/** The printer's change from `before` to `after`, as hunks of `own` — the
 * node's bytes. Equal renderings mean the printer and the bytes agree, and
 * the change applies as it is; otherwise each hunk is placed on `own` through
 * the diff from `before`, and a hunk the formatting itself changed has no
 * place: refused, never reprinted. */
export declare function placedHunks(before: string, after: string, own: string): Result<readonly SourceEdit[], RejectionReason>;
/** Hunks of a node's own text moved to the file: shifted by where the node
 * starts. */
export declare function shiftedHunks(hunks: readonly SourceEdit[], start: number): readonly SourceEdit[];
/** A frontmatter block's new text as the slot where it differs from the block
 * on disk: the common start and end are kept, whole code points only. */
export declare function frontmatterSlot(block: ByteSpan, before: string, printed: string): {
    readonly slot: ByteSpan;
    readonly text: string;
};
