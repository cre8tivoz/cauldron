import { type Result } from '../../shared/core/result';
import type { SelectorFileChange, SelectorFileDigest } from '../../shared/properties/selectorUsage';
import type { UsageAnalysis } from './selectorUsage';
/** The new text of every file the removal touches. */
export declare function planSelectorRemoval(analysis: UsageAnalysis, ids: readonly string[], expected: readonly SelectorFileDigest[]): Result<readonly SelectorFileChange[]>;
