import type { Digest } from '../core/brand';
import type { CodeHunk } from './codePatch';
import type { AttributeValue, Placement, SourceEdit, StyleDeclaration } from './intent';
import { type PageModel, type PageNode } from '../page/pageNode';
import { type NodeKind } from '../page/ref';
import { type Utf16Span } from '../core/span';
/** A node of the parse the request was authored against. */
export interface NodeRef {
    readonly path: readonly number[];
    readonly kind: NodeKind;
    readonly span: Utf16Span;
}
/** What goes in: new nodes main prints, or a copy of a node's own bytes (a
 * duplicate is its source, never a reprint). */
export type InsertContent = {
    readonly tag: 'nodes';
    readonly nodes: readonly PageNode[];
} | {
    readonly tag: 'copy';
    readonly source: NodeRef;
};
export type Edit = {
    readonly tag: 'set-attribute';
    readonly target: NodeRef;
    readonly name: string;
    readonly value: AttributeValue;
} | {
    readonly tag: 'remove-attribute';
    readonly target: NodeRef;
    readonly name: string;
} | {
    readonly tag: 'set-inline-style';
    readonly target: NodeRef;
    readonly property: string;
    readonly declaration: StyleDeclaration;
} | {
    readonly tag: 'insert-node';
    readonly target: NodeRef;
    readonly placement: Placement;
    readonly content: InsertContent;
} | {
    readonly tag: 'remove-node';
    readonly target: NodeRef;
} | {
    readonly tag: 'move-node';
    readonly target: NodeRef;
    readonly destination: NodeRef;
    readonly placement: Placement;
} | {
    readonly tag: 'rename-binding';
    readonly target: NodeRef;
    readonly from: string;
    readonly to: string;
}
/** Step 9: a tag's name, in its opening and closing tags. */
 | {
    readonly tag: 'rename-tag';
    readonly target: NodeRef;
    readonly to: string;
}
/** Step 9: one attribute's name, in place. */
 | {
    readonly tag: 'rename-attribute';
    readonly target: NodeRef;
    readonly from: string;
    readonly to: string;
}
/** Step 9: the node as it should now read. Main prints the old and the new
 * node, and writes only what the printer says changed, placed on the node's
 * own bytes (a `rewrite-node` intent) — never a reprint of the node. */
 | {
    readonly tag: 'replace-node';
    readonly target: NodeRef;
    readonly node: PageNode;
}
/** Step 9: the siblings from `target` through `last` put inside a new
 * `<name>` tag (a layout picked for a page without one). */
 | {
    readonly tag: 'wrap-nodes';
    readonly target: NodeRef;
    readonly last: NodeRef;
    readonly name: string;
}
/** Step 9: a tag taken away, its children left where they are (a layout
 * removed from a page). */
 | {
    readonly tag: 'unwrap-node';
    readonly target: NodeRef;
}
/** Step 9: the first nodes of a page whose body is empty — nothing to stand
 * beside. Main prints them at the end of the file. */
 | {
    readonly tag: 'append-body';
    readonly nodes: readonly PageNode[];
}
/** The frontmatter the page model now describes; main prints it and writes
 * only the slot that differs (an edit-frontmatter-slot intent). */
 | {
    readonly tag: 'set-frontmatter';
    readonly model: PageModel;
}
/** A visual gesture whose specialized syntax is unavailable. Main compares
 * the old and new printed models, maps only their semantic hunks onto the
 * authored bytes, and never replaces formatting-only regions. */
 | {
    readonly tag: 'replace-page';
    readonly model: PageModel;
}
/** Undo and redo: byte hunks a previous reply handed back, against the
 * checksum that reply named. */
 | {
    readonly tag: 'revert';
    readonly hunks: readonly SourceEdit[];
}
/** The code editor (step 8): the byte diff from the text of the named
 * checksum to the editor's text (shared/engine/codePatch.ts). Each hunk names the
 * bytes it replaces, and main checks them against that checksum's bytes.
 * The result may not parse (plan §3.6). */
 | {
    readonly tag: 'code-patch';
    readonly hunks: readonly CodeHunk[];
};
export type EditTag = Edit['tag'];
export interface EditRequest {
    readonly pagePath: string;
    /** The checksum of the bytes the renderer's parse was read from. */
    readonly authoredChecksum: Digest;
    readonly edit: Edit;
}
/** Several edits of one gesture, written as one (page:editBatch). Sent one at
 * a time they were separate writes, and the dev server could render the page
 * between them: a loop reading a query its declaration had not reached yet. */
export interface EditBatchRequest {
    readonly pagePath: string;
    /** The checksum of the bytes every edit's references were read from. */
    readonly authoredChecksum: Digest;
    readonly edits: readonly Edit[];
}
/** A gesture composes a handful of edits (a loop, its query, its imports);
 * sixteen leaves room for every composition the editor makes, and a batch is
 * planned in memory edit by edit, so its length bounds that work. */
export declare const EDIT_BATCH_EDITS_MAX = 16;
export declare function parseEditRequest(input: unknown): EditRequest;
export declare function parseEditBatchRequest(input: unknown): EditBatchRequest;
export declare function parseEdit(input: unknown): Edit;
export declare function parseNodeRef(input: unknown, where: string): NodeRef;
