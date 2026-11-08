import { type StyleKeepList } from '../../shared/properties/styleKeepList';
import { type SelectorNote, type SelectorReport } from '../../shared/properties/selectorUsage';
import { type MentionHits, type MentionInterest } from './selectorMentions';
import { type AstroSheet, type RuleSelector } from './selectorSheets';
export interface ProjectText {
    readonly rel: string;
    readonly text: string;
}
/** What searching installed packages found, or why it could not finish. */
export type PackageScan = {
    readonly kind: 'complete';
    readonly hits: MentionHits;
}
/** Answered from earlier searches only; `unanswered` is what no search has looked for yet. */
 | {
    readonly kind: 'pending';
    readonly hits: MentionHits;
    readonly unanswered: MentionInterest;
} | {
    readonly kind: 'incomplete';
    readonly reason: string;
};
export interface UsageInput {
    /** Plain stylesheet files, by project-relative path. */
    readonly stylesheets: readonly ProjectText[];
    readonly astro: readonly AstroSheet[];
    /** Every other project text: scripts, data, content, HTML. */
    readonly others: readonly ProjectText[];
    readonly keepList: StyleKeepList;
    /** Project files that could not be read; each makes the proof incomplete. */
    readonly unreadable: readonly SelectorNote[];
}
/** The report plus what a cleanup needs to edit: the rule positions behind each entry. */
export interface UsageAnalysis {
    readonly report: SelectorReport;
    readonly selectors: ReadonlyMap<string, RuleSelector>;
    /** The file text each analysed region came from. */
    readonly sources: ReadonlyMap<string, string>;
}
export declare function analyzeSelectorUsage(input: UsageInput, scanPackages: (interest: MentionInterest) => Promise<PackageScan>): Promise<UsageAnalysis>;
export declare function digestOf(text: string): import("../../shared/core/brand").Digest;
