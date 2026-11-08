import { type Result } from '../../shared/core/result';
import type { SelectorFileChange, SelectorFileDigest, SelectorRemoval } from '../../shared/properties/selectorUsage';
import type { StyleKeepList } from '../../shared/properties/styleKeepList';
import { checkSelectorUsage } from './selectorUsageFiles';
export { checkSelectorUsage };
export declare function removeUnusedSelectors(root: string, keepList: StyleKeepList, request: {
    readonly ids: readonly string[];
    readonly files: readonly SelectorFileDigest[];
}): Promise<Result<SelectorRemoval>>;
/** Undo (`to: 'before'`) or redo (`to: 'after'`) a cleanup, if its files are as it left them. */
export declare function restoreSelectorFiles(root: string, changes: readonly SelectorFileChange[], to: 'before' | 'after'): Result<SelectorRemoval>;
