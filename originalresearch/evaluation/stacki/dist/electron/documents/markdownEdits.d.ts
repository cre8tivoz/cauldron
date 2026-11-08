import type { Edit } from '../../shared/engine/editRequest';
import type { RejectionReason } from '../../shared/engine/intent';
import { type PageNode } from '../../shared/page/pageNode';
import { type Result } from '../../shared/core/result';
import type { IntentDraft } from './documentActors';
import { type Authored } from './editAnchors';
type Drafted = Result<IntentDraft, RejectionReason> | undefined;
/** The intent a Markdown page's edit is, or undefined when it names markup or
 * is an operation the planner places alike (editRequests.ts drafts those). */
export declare function markdownEditDraft(edit: Edit, authored: Authored): Drafted;
/** The Markdown parse of the authored text: the nodes the projection indexes. */
export declare function markdownPageNodes(authored: Authored): readonly PageNode[] | undefined;
export {};
