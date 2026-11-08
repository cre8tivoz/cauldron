interface CommonRun {
    common: string[];
}
interface DiffRun {
    ours: string[];
    theirs: string[];
    base?: string[];
    changedBy?: 'ours' | 'theirs' | 'both';
}
type Run = CommonRun | DiffRun;
declare function lineDiff(left: readonly string[], right: readonly string[]): Run[];
/**
 * One of git's conflicts, split into the decisions it really contains.
 *
 * Comparing the two sides to each OTHER is not enough: when a heading was
 * edited on one branch and the paragraph beneath it on the other, every line
 * differs between the two sides and there is nothing common to split on. What
 * separates them is the ancestor — the version both started from. Against it,
 * the heading was changed only by one branch and the paragraph only by the
 * other, so they are two independent decisions and neither needs asking about.
 *
 * Returns runs: `{ common }` for text nothing touched, or
 * `{ ours, theirs, base, changedBy }` where `changedBy` is which side actually
 * moved — 'ours', 'theirs', or 'both' when they really do disagree.
 */
declare function threeWay(base: readonly string[], ours: readonly string[], theirs: readonly string[]): Run[];
/**
 * Two edits to the same lines that do not actually touch each other.
 *
 * A heading where one branch added a class and the other rewrote the words is
 * a single conflicted line, and answering it either way throws away one of the
 * two edits. But inside the line the changes are nowhere near each other — one
 * is in the attributes, one is in the text — so the same three-way split, run
 * over words instead of lines, separates them and both can be kept.
 *
 * Returns the combined text, or undefined when the edits really do overlap and
 * there is a genuine choice to make.
 */
declare function mergeInline(base: string | undefined, ours: string, theirs: string): string | undefined;
export type ConflictPart = {
    readonly kind: 'same';
    readonly text: string;
} | {
    readonly kind: 'clash';
    readonly ours: string;
    readonly theirs: string;
    readonly changedBy: 'ours' | 'theirs' | 'both';
    merged?: string;
};
/**
 * A conflicted file as a list of parts.
 *
 * Each part is either `{ kind: 'same', text }` — agreed text — or
 * `{ kind: 'clash', ours, theirs }`, one disagreement. Joining the `same`
 * parts with a chosen side of each `clash` rebuilds the file.
 *
 * A file with no markers comes back as a single `same` part, which is the
 * honest answer: there is nothing to choose.
 */
declare function parseConflict(text: unknown): ConflictPart[];
/** How many disagreements are in a parsed file. */
declare const clashCount: (parts: readonly ConflictPart[] | undefined) => number;
/**
 * Put the file back together, given one answer per disagreement.
 *
 * `picks` is an array in the order the clashes appear: `'ours'`, `'theirs'`,
 * or `'both'`. Missing or unrecognised answers keep `ours` — between silently
 * dropping the user's own work and silently dropping work they asked to merge
 * in, the first is worse, because the incoming version is still on its branch
 * and theirs may exist nowhere else.
 */
declare function renderResolved(parts: readonly ConflictPart[] | undefined, picks?: readonly unknown[]): string;
export { parseConflict, renderResolved, clashCount, threeWay, lineDiff, mergeInline };
