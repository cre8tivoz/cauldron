import { type Digest, type FilePath, type IntentId } from '../core/brand';
import { type AnchorRef } from '../page/ref';
import { type ByteSpan } from '../core/span';
export type AttributeValue = {
    readonly type: 'string';
    readonly value: string;
} | {
    readonly type: 'expr';
    readonly value: string;
} | {
    readonly type: 'bare';
};
export declare const PLACEMENTS: readonly ["before", "after", "first-child", "last-child"];
export type Placement = (typeof PLACEMENTS)[number];
/** Replace the authored bytes at `span` with `text`. */
export interface SourceEdit {
    readonly span: ByteSpan;
    readonly text: string;
}
export type StyleDeclaration = {
    readonly tag: 'set';
    readonly value: string;
} | {
    readonly tag: 'remove';
};
/** The closed operation set (plan §3.3). New operations extend this union; they
 * never extend a writer.
 *
 * Added at step 6: `remove-node` (the plan's "insert/remove" gesture needs a
 * removal, which the initial list lacked) and `revert-splices`, the inverse of
 * an applied outcome that Undo submits (plan §11 step 6). A revert is not a
 * code patch: a code patch is text the user wrote and may leave the file
 * invalid (§3.6); a revert restores bytes an applied intent replaced, keeps a
 * parsing file parsing, and a stale one is a moved region, not a merge.
 *
 * Added at step 9, so the gestures that only a whole-model save could carry
 * reach disk as splices: `rename-tag` (the name in the opening and closing
 * tags), `rename-attribute` (one attribute's name, in place) and
 * `rewrite-node` (hunks inside one node the node's own bytes witness, for an
 * edit the printer states as the node's new text — a note reworded, a text
 * set, a branch added). None of them ever writes outside its node. And
 * `wrap-nodes`, a run of siblings put inside a new tag (a layout picked for a
 * page without one): its opening before the first, its closing after the
 * last, every byte of the run kept. And `append-body`: the first node of a
 * page whose body is empty, which has no node to stand beside.
 *
 * Added at step 10: `insert-frontmatter`, the frontmatter block of a page that
 * has none, written at its top (a layout picked for a Markdown post without
 * one). An edit of an existing block stays a slot. And `rewrite-text`, which
 * replaced the migration-only `replace-source`, the whole-file replacement the
 * legacy saves submitted from step 5: a program's change to a file's text — a
 * stylesheet rule, a CMS entry, a property batch — stated as the hunks where
 * the new text differs from the bytes it read, and written only while the file
 * holds exactly those bytes. No operation replaces a whole file. */
export type Operation = {
    readonly tag: 'set-attribute';
    readonly name: string;
    readonly value: AttributeValue;
} | {
    readonly tag: 'remove-attribute';
    readonly name: string;
} | {
    readonly tag: 'insert-node';
    readonly placement: Placement;
    readonly source: string;
} | {
    readonly tag: 'remove-node';
} | {
    readonly tag: 'move-node';
    readonly destination: AnchorRef;
    readonly placement: Placement;
} | {
    readonly tag: 'rename-binding';
    readonly from: string;
    readonly to: string;
    readonly sites: readonly ByteSpan[];
} | {
    readonly tag: 'set-inline-style';
    readonly property: string;
    readonly declaration: StyleDeclaration;
} | {
    readonly tag: 'apply-code-patch';
    readonly hunks: readonly SourceEdit[];
} | {
    readonly tag: 'edit-frontmatter-slot';
    readonly slot: ByteSpan;
    readonly text: string;
} | {
    readonly tag: 'revert-splices';
    readonly hunks: readonly SourceEdit[];
} | {
    readonly tag: 'rename-tag';
    readonly from: string;
    readonly to: string;
} | {
    readonly tag: 'rename-attribute';
    readonly from: string;
    readonly to: string;
} | {
    readonly tag: 'rewrite-node';
    readonly hunks: readonly SourceEdit[];
} | {
    readonly tag: 'append-body';
    readonly source: string;
} | {
    readonly tag: 'insert-frontmatter';
    readonly source: string;
} | {
    readonly tag: 'wrap-nodes';
    readonly last: AnchorRef;
    readonly open: string;
    readonly close: string;
} | {
    readonly tag: 'rewrite-text';
    readonly hunks: readonly SourceEdit[];
};
export type OperationTag = Operation['tag'];
export interface Intent {
    readonly id: IntentId;
    /** Canonical path; the actor is per file, so one intent touches one file. */
    readonly file: FilePath;
    /** The checksum of the bytes the anchor and every span were authored against. */
    readonly authoredChecksum: Digest;
    readonly anchor: AnchorRef;
    readonly operation: Operation;
}
export type SubmissionResult = {
    readonly tag: 'accepted';
    readonly intentId: IntentId;
} | {
    readonly tag: 'backpressured';
};
export declare const REJECTION_REASONS: readonly ["anchor-moved", "anchor-ambiguous", "region-externally-modified", "source-invalid", "unsupported-operation", "resource-limit", "write-failed", "write-race", "merge-conflict"];
export type RejectionReason = (typeof REJECTION_REASONS)[number];
/** Every accepted intent reaches exactly one of these (plan §3.5). `uncertain`
 * is the crash window between the atomic replace and the verifying read; its
 * candidate checksum lets a reconnect compare instead of guess. */
export type Outcome = {
    readonly tag: 'applied';
    readonly intentId: IntentId;
    readonly changedRanges: readonly ByteSpan[];
    readonly checksum: Digest;
} | {
    readonly tag: 'rejected';
    readonly intentId: IntentId;
    readonly reason: RejectionReason;
} | {
    readonly tag: 'uncertain';
    readonly intentId: IntentId;
    readonly candidateChecksum: Digest | undefined;
};
/** A tag or component name as the parser reads one: a letter, then name
 * characters — `div`, `my-card`, `Card`, `Icons.Arrow`, `svg:path`. */
export declare const TAG_NAME_RE: RegExp;
/** The notice text for a rejection (plan §7): names the reason, never blames
 * the user, and never implies their input is gone. */
export declare function describeRejection(reason: RejectionReason): string;
export declare function parseRejectionReason(input: unknown, where: string): RejectionReason;
/** UTF-8 bytes of every string the intent carries, summed (LIMITS.intentPayloadBytesMax). */
export declare function intentPayloadBytes(operation: Operation): number;
/** The validated constructor: every cross-field rule between the anchor and the
 * operation is checked here, so a parsed Intent is one the planner may trust. */
export declare function toIntent(input: Intent): Intent;
export declare function parseIntent(input: unknown): Intent;
export declare function parseSubmissionResult(input: unknown): SubmissionResult;
export declare function parseOutcome(input: unknown): Outcome;
