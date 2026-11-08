import type { Operation, RejectionReason } from './intent';
import type { Plan } from './planner';
import { type PlanContext, type ValidProjection } from './planSupport';
import { type AnchorRef } from '../page/ref';
import { type Result } from '../core/result';
import type { ProjectedNode } from '../page/sourceProjection';
import { type ByteSpan, type ByteString } from '../core/span';
export declare function planRemoveNode(context: PlanContext, anchor: AnchorRef): Result<Plan, RejectionReason>;
export declare function planInsertNode(context: PlanContext, anchor: AnchorRef, operation: Extract<Operation, {
    tag: 'insert-node';
}>): Result<Plan, RejectionReason>;
/** `wrap-nodes` (step 9): a run of siblings, the anchor through `last`, put
 * inside a new tag — its opening before the first, its closing after the
 * last. Both ends are resolved like any anchor; what lies between them is
 * kept whole, whoever wrote it, and nothing is re-indented. Siblings of one
 * list only, in order, and never code a loop or a condition owns. */
export declare function planWrapNodes(context: PlanContext, anchor: AnchorRef, operation: Extract<Operation, {
    tag: 'wrap-nodes';
}>): Result<Plan, RejectionReason>;
/** `append-body` (step 9): the first node of a page whose body is empty — no
 * node to stand beside, so the anchor is the document. It goes at the end of
 * the file, on a line of its own. A body that gained a node since was written
 * by someone else; the insertion is refused, to be stated beside a node. */
export declare function planAppendBody(context: PlanContext, anchor: AnchorRef, operation: Extract<Operation, {
    tag: 'append-body';
}>): Result<Plan, RejectionReason>;
export declare function planMoveNode(context: PlanContext, anchor: AnchorRef, operation: Extract<Operation, {
    tag: 'move-node';
}>): Result<Plan, RejectionReason>;
/** What a removal takes: the node and its preceding whitespace-only separator;
 * otherwise the whitespace after
 * it through the first line break, so no blank line is left; otherwise the
 * node alone (it sat inline). The runs never cross a sibling or the parent. */
export declare function removalRange(bytes: ByteString, projection: ValidProjection, node: ProjectedNode): ByteSpan;
