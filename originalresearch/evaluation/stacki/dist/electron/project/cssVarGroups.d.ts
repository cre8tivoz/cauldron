import { type Rule } from './cssVarRead';
export declare const titleize: (text: unknown) => string;
export declare function labelForRule(rule: Rule): string;
export declare function commonStem(labels: readonly string[]): string;
export declare const namesOf: (rule: Rule) => string[];
export declare const overlap: (left: readonly string[], right: readonly string[]) => number;
export declare const MERGE_THRESHOLD = 0.6;
export declare function groupRules(rules: readonly Rule[]): Rule[][];
export declare function splits(name: string): {
    prefix: string;
    suffix: string;
}[];
export interface Family {
    prefixes: string[];
    rows: string[];
    self: boolean;
}
/**
 * The tables hiding in a list of names.
 *
 * A family is a set of prefixes that declare exactly the same variables:
 * {h1, h2, …} each having {line-height, margin-top, …} and nothing else. Exact,
 * not "most": a table is only worth reading when every column fills every row.
 * Prefixes that merely overlap — a few names in common and the rest their own —
 * made tables that were mostly dashes, so they stay lists. A name that is only
 * the prefix (`--h1`) is the family's own value, and is the first row; either
 * every prefix has one or none does.
 */
export declare const FAMILIES_MAX = 25;
export declare function findFamilies(names: readonly string[]): {
    families: Family[];
    used: Set<string>;
};
export interface FamilySeed {
    readonly score: number;
    readonly prefixes: readonly string[];
    readonly rows: string[];
}
export declare function bestFamilySeed(bySuffix: ReadonlyMap<string, ReadonlySet<string>>, byPrefix: ReadonlyMap<string, readonly string[]>, nameSet: ReadonlySet<string>, used: ReadonlySet<string>): FamilySeed | undefined;
export declare function familyFrom(best: FamilySeed, names: readonly string[], nameSet: ReadonlySet<string>): Family;
export declare function prefixSections(names: readonly string[]): {
    loose: string[];
    sections: Map<string, string[]>;
};
