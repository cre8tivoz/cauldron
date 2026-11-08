import { type Digest } from '../../shared/core/brand';
import type { Edit } from '../../shared/engine/editRequest';
import { type RejectionReason, type SourceEdit } from '../../shared/engine/intent';
import { type Result } from '../../shared/core/result';
import type { ByteString } from '../../shared/core/span';
export interface EditPreviewed {
    readonly bytes: ByteString;
    readonly checksum: Digest;
    /** What Undo would submit had it been written — kept so a preview reply has
     * the same shape as a write's. */
    readonly inverse: readonly SourceEdit[];
}
/** The bytes `edit` would leave, planned against `bytes` as the file at
 * `authoredChecksum`. A rejection is the planner's own, as `page:edit` would
 * have answered it over unchanged bytes. */
export declare function previewEdit(file: string, bytes: ByteString, authoredChecksum: Digest, edit: Edit): Result<EditPreviewed, RejectionReason>;
/** The bytes a batch of edits leaves, planned one after another in memory
 * against `bytes` as the file at `authoredChecksum`, so the batch can be
 * written once (page:editBatch). Two writes of one gesture let the dev server
 * render the page between them: a loop that reads `teamEntries` before the
 * declaration of `teamEntries` lands. Each edit is built and rebased exactly
 * as the actor would build and rebase it after the ones before it had been
 * committed, and its candidate is checked as a write would check it, so a
 * batch accepts nothing its edits would be refused alone. The first refusal
 * refuses the batch; nothing is written. */
export declare function previewEdits(file: string, bytes: ByteString, authoredChecksum: Digest, edits: readonly Edit[]): Result<{
    readonly bytes: ByteString;
    readonly checksum: Digest;
}, RejectionReason>;
