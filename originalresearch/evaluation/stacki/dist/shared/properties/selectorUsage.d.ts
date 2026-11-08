import type { Digest } from '../core/brand';
import { type Result } from '../core/result';
export declare const SELECTOR_USAGE_LIMITS: {
    /** Selector entries in one report. A large site holds a few thousand. */
    readonly entriesMax: 50000;
    /** Characters of one selector as reported; longer selectors are cut for display only. */
    readonly selectorCharsMax: 2048;
    /** Required names one entry lists. */
    readonly namesPerEntryMax: 64;
    /** Characters of one class or id name. */
    readonly nameCharsMax: 256;
    /** Project notes in one report: files that could not be read, and why. */
    readonly notesMax: 500;
    /** Stylesheet files one report or cleanup covers. */
    readonly filesMax: 5000;
    /** Selectors one cleanup may remove. */
    readonly removalsMax: 10000;
};
export type SelectorScope = 'global' | 'scoped';
export type SelectorVerdict = {
    readonly kind: 'used';
}
/** No class or id to check: element, attribute and universal selectors. */
 | {
    readonly kind: 'untracked';
}
/** Proven unused: nothing can produce `names`, which the selector requires. */
 | {
    readonly kind: 'unused';
    readonly names: readonly string[];
}
/** Would be unused, but the keep list protects `names`. */
 | {
    readonly kind: 'kept';
    readonly names: readonly string[];
} | {
    readonly kind: 'unknown';
    readonly names: readonly string[];
    readonly reason: string;
}
/** Not found in the project; installed packages are still being searched for `names`. */
 | {
    readonly kind: 'checking';
    readonly names: readonly string[];
};
export type SelectorVerdictKind = SelectorVerdict['kind'];
export interface SelectorEntry {
    /** Stable while the file's bytes are: file, block, rule offset, list index. */
    readonly id: string;
    readonly rel: string;
    /** 1-based line of the rule in its file. */
    readonly line: number;
    readonly selector: string;
    readonly scope: SelectorScope;
    readonly verdict: SelectorVerdict;
}
export interface SelectorNote {
    readonly rel: string;
    readonly message: string;
}
export interface SelectorFileDigest {
    readonly rel: string;
    readonly digest: Digest;
}
export interface SelectorReport {
    readonly entries: readonly SelectorEntry[];
    /** Files or project facts the verdicts depend on, worded for the user. */
    readonly notes: readonly SelectorNote[];
    /** The stylesheet bytes the verdicts were computed against. */
    readonly files: readonly SelectorFileDigest[];
}
/** One file a cleanup or its undo rewrote: `before` restores it, `after` redoes it. */
export interface SelectorFileChange {
    readonly rel: string;
    readonly before: string;
    readonly after: string;
}
export interface SelectorRemoval {
    readonly removed: number;
    readonly changes: readonly SelectorFileChange[];
}
export declare function parseSelectorReport(input: unknown): SelectorReport;
export declare function parseSelectorReportResult(input: unknown): Result<SelectorReport>;
export declare function parseSelectorRemovalResult(input: unknown): Result<SelectorRemoval>;
export declare function parseSelectorRemoval(input: unknown): SelectorRemoval;
export declare function parseSelectorFileChange(input: unknown): SelectorFileChange;
/** A cleanup request: which entries, against which stylesheet bytes. */
export declare function parseSelectorIds(input: unknown): readonly string[];
export declare function parseSelectorFileDigests(input: unknown): readonly SelectorFileDigest[];
export declare function parseSelectorFileChanges(input: unknown): readonly SelectorFileChange[];
/** The verdict's names, the ones a user can add to the keep list. */
export declare function verdictNames(verdict: SelectorVerdict): readonly string[];
/** Entry ids encode where the rule is, so a stale id can never name another rule. */
export declare function selectorEntryId(input: {
    readonly rel: string;
    readonly block: number;
    readonly offset: number;
    readonly index: number;
}): string;
