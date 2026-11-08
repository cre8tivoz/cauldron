import type { Operation, RejectionReason } from './intent';
import type { Plan } from './planner';
import { type PlanContext } from './planSupport';
import type { AnchorRef } from '../page/ref';
import { type Result } from '../core/result';
/** A loop rename (multi-span): every site holds the old name, as a whole
 * identifier, inside the loop the anchor resolves to. */
export declare function planRenameBinding(context: PlanContext, anchor: AnchorRef, operation: Extract<Operation, {
    tag: 'rename-binding';
}>): Result<Plan, RejectionReason>;
/** A node rewrite (step 9): hunks inside one node, stated against its authored
 * bytes. The node is found again through its identity region and must hold
 * exactly the bytes it was authored with — the hunks were computed from the
 * whole node's text, so any change inside it is someone else's edit, refused
 * rather than merged — and then every hunk moved with it. */
export declare function planRewriteNode(context: PlanContext, anchor: AnchorRef, operation: Extract<Operation, {
    tag: 'rewrite-node';
}>): Result<Plan, RejectionReason>;
/** A frontmatter slot: the fenced block must be the one authored, found again
 * whole, and the slot inside it holds the authored bytes. */
export declare function planFrontmatterSlot(context: PlanContext, anchor: AnchorRef, operation: Extract<Operation, {
    tag: 'edit-frontmatter-slot';
}>): Result<Plan, RejectionReason>;
/** `insert-frontmatter` (step 10): the block of a page that has none, at its
 * top — after a byte-order mark, which opens the file, not the block. A block
 * in either version means the edit that stated a new one is not about this
 * file any more: refused. */
export declare function planInsertFrontmatter(context: PlanContext, anchor: AnchorRef, operation: Extract<Operation, {
    tag: 'insert-frontmatter';
}>): Result<Plan, RejectionReason>;
/** A code patch (the code editor from step 8; a stylesheet rule at step 6):
 * text may leave the file invalid (plan §3.6); a stale hunk that cannot be
 * found whole is a merge conflict. */
export declare function planCodePatch(context: PlanContext, anchor: AnchorRef, operation: Extract<Operation, {
    tag: 'apply-code-patch';
}>): Result<Plan, RejectionReason>;
/** Undo's inverse (plan §11 step 6): the hunks restore bytes an applied intent
 * replaced. They were authored against the bytes that intent left, so an
 * outside edit since maps through the diff or rejects — it is never reverted.
 * A file that parsed when the intent applied must still parse after. */
export declare function planRevertSplices(context: PlanContext, anchor: AnchorRef, operation: Extract<Operation, {
    tag: 'revert-splices';
}>): Result<Plan, RejectionReason>;
/** `rewrite-text` (step 10, replacing the whole-file `replace-source`): a
 * program's change to a file's text as hunks of the bytes it read — a
 * stylesheet rule, a CMS entry, a property batch. It never maps: its witness
 * is the authored checksum itself, so any change since it was read is a
 * rejection, and every hunk is written at its own range with its authored
 * bytes as the witness. The result may not parse — a raw page, a stylesheet —
 * so the candidate is not required to. Agrees exactly with the step-1
 * reference (test/simulator/referencePlanner.ts). */
export declare function planRewriteText(context: PlanContext, anchor: AnchorRef, operation: Extract<Operation, {
    tag: 'rewrite-text';
}>): Result<Plan, RejectionReason>;
