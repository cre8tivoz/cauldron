import type { Edit } from '../../shared/engine/editRequest';
import type { BuiltEdit, EditBase, IntentDraft } from './documentActors';
import type { RejectionReason } from '../../shared/engine/intent';
import { type Result } from '../../shared/core/result';
import type { Snapshot } from '../../shared/page/snapshot';
/** The intent an edit is. Every edit is built against the snapshot it names,
 * except a frontmatter request after the app's own commits: it states the
 * whole block the model now describes, and that model already holds what
 * those commits did, so it is compared with the block on disk now — against
 * the authored block it would do their part a second time. */
export declare function buildEdit(edit: Edit, base: EditBase): Result<BuiltEdit, RejectionReason>;
/** The intent an edit is, against the snapshot it names. */
export declare function buildEditIntent(edit: Edit, snapshot: Snapshot): Result<IntentDraft, RejectionReason>;
