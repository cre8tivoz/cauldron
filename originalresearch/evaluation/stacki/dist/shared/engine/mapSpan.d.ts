import { type ByteDiff, type DiffBudget } from './diff';
import { type ByteSpan, type ByteString } from '../core/span';
export type SpanMapping = {
    readonly tag: 'resolved';
    readonly span: ByteSpan;
} | {
    readonly tag: 'ambiguous';
} | {
    readonly tag: 'gone';
} | {
    readonly tag: 'too-costly';
};
/** Diff, then map. For several spans through one pair of files, diff once with
 * `diffBytes` and call `mapSpanThroughDiff` per span. */
export declare function mapSpan(source: ByteString, target: ByteString, span: ByteSpan, budget: DiffBudget): SpanMapping;
/** Map a non-empty span. Zero-width insertion points are not mapped here: an
 * insertion between two runs has no byte of its own to anchor, and step 6
 * (insert-node) brings its own rule for them. */
export declare function mapSpanThroughDiff(diff: ByteDiff, span: ByteSpan): SpanMapping;
