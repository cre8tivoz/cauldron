import { type Digest } from '../core/brand';
import { type RejectionReason, type SourceEdit } from '../engine/intent';
import { type ParsePageResult } from '../page/pageNode';
import { type Result } from '../core/result';
/** A page as read from (or just written to) disk. */
export type PageDiskRead = ParsePageResult & {
    readonly source: string;
    readonly checksum: Digest;
};
/** A write that did not happen, or may have: none of these is a refusal of
 * the edit's content, which is `rejected` (PageEditError). */
export type PageWriteFailure = {
    readonly code: 'missing';
    readonly message: string;
} | {
    readonly code: 'filesystem';
    readonly message: string;
} | {
    readonly code: 'write-race';
    readonly message: string;
}
/** The write may have landed; the file's actor could not verify it (§3.5). */
 | {
    readonly code: 'uncertain';
    readonly message: string;
}
/** The file's actor queue was full; the edit was never accepted (§7). */
 | {
    readonly code: 'backpressured';
    readonly message: string;
};
/** An applied visual edit (step 6): the page as written, and the inverse
 * hunks Undo submits against its checksum. */
export type PageEdited = PageDiskRead & {
    readonly inverse: readonly SourceEdit[];
};
/** Why a visual edit did not apply. A refusal names the actor's reason, for
 * the notice (plan §7), and what is on disk when it could be read. */
export type PageEditError = {
    readonly code: 'rejected';
    readonly reason: RejectionReason;
    readonly message: string;
    readonly diskChecksum: Digest | undefined;
} | PageWriteFailure;
export declare function parsePageEditResult(input: unknown): Result<PageEdited, PageEditError>;
export declare function parsePageDiskRead(input: unknown): PageDiskRead;
