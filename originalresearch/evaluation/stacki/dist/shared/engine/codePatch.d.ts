import { type Result } from '../core/result';
import { type ByteSpan } from '../core/span';
/** Replace the baseline bytes at `span`, which hold `expected`, with `text`. */
export interface CodeHunk {
    readonly span: ByteSpan;
    readonly expected: string;
    readonly text: string;
}
/** The patch from `baseline` to `next`, as ascending, disjoint hunks of the
 * baseline on code-point boundaries. Empty when the texts are equal. */
export declare function diffCodePatch(baseline: string, next: string): Result<readonly CodeHunk[], 'resource-limit'>;
/** UTF-8 bytes a patch writes: the payload its intent carries. */
export declare function codePatchBytes(hunks: readonly CodeHunk[]): number;
/** The baseline with every hunk applied. Each hunk's witness must hold. */
export declare function applyCodePatch(baseline: string, hunks: readonly CodeHunk[]): string;
/** Three-way merge of two texts that both descend from `base` (plan §7). The
 * code editor's text `ours` kept changing while a save was on its way; the
 * disk now holds `theirs` — the saved text plus what the host merged into it
 * (an outside edit mapped through, an earlier visual edit rebased). Changes
 * that touch or overlap cannot be ordered and are a `merge-conflict`: the
 * user decides, the app never picks a side. */
export declare function mergeTyping(base: string, ours: string, theirs: string): Result<string, 'merge-conflict' | 'resource-limit'>;
