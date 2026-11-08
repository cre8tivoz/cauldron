import { type ByteSpan, type ByteString } from '../core/span';
export interface DiffBudget {
    readonly workMax: number;
    readonly distanceMax: number;
}
/** The production budget. Tests pass smaller ones to reach exhaustion cheaply. */
export declare const DIFF_BUDGET: DiffBudget;
/** A computed diff. The frontiers stay inside the closures: callers read
 * distances, never the typed arrays that hold them. */
export interface ByteDiff {
    readonly source: ByteString;
    readonly target: ByteString;
    /** Bytes deleted plus bytes inserted by every minimum edit script. */
    readonly distance: number;
    readonly budget: DiffBudget;
    /** Work units the diff spent; mappings through it may spend the rest. */
    readonly workSpent: number;
    /** Edit distance between `source[0, x)` and `target[0, y)`, or undefined
     * when it exceeds `distance` — such a point lies on no minimum script. */
    readonly distanceBefore: (x: number, y: number) => number | undefined;
    /** Edit distance between `source[x, end)` and `target[y, end)`, or undefined
     * when it exceeds `distance`. */
    readonly distanceAfter: (x: number, y: number) => number | undefined;
}
export type DiffOutcome = {
    readonly tag: 'computed';
    readonly diff: ByteDiff;
} | {
    readonly tag: 'too-costly';
};
/** One region a minimum edit script replaces: `source` bytes out, `target` in. */
export interface Hunk {
    readonly source: ByteSpan;
    readonly target: ByteSpan;
}
export declare function diffBytes(source: ByteString, target: ByteString, budget: DiffBudget): DiffOutcome;
/** One minimum edit script as hunks, ascending — the forward traceback. Where
 * several scripts tie, this is one of them; the mapper never relies on which. */
export declare function diffHunks(diff: ByteDiff): readonly Hunk[];
