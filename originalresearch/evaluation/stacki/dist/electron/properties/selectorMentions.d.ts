export declare const MENTION_LIMITS: {
    /** Distinct names one scan asks about. Bounded by the report's entries. */
    readonly namesMax: 100000;
    /** Separator runs one name is split at for its pieces. */
    readonly piecesPerNameMax: 16;
};
/** What a scan looks for: the names, and the pieces code could build them from. */
export interface MentionInterest {
    /** Names made only of word characters, found by token lookup. */
    readonly words: ReadonlySet<string>;
    /** Names with other characters (`md:flex`, `w-1/2`), found by substring search. */
    readonly odd: readonly string[];
    /** Leading pieces that end in a separator: `btn-`. */
    readonly heads: ReadonlySet<string>;
    /** Leading pieces without their separator, joined with `+`: 'btn' + … */
    readonly bareHeads: ReadonlySet<string>;
    /** Trailing pieces that start with a separator: `-active`. */
    readonly tails: ReadonlySet<string>;
}
/** What a scan found. Sets only grow, so a scan can add into an earlier one. */
export interface MentionHits {
    readonly words: Set<string>;
    readonly heads: Set<string>;
    readonly tails: Set<string>;
}
export declare function mentionInterest(names: Iterable<string>): MentionInterest;
export declare function emptyHits(): MentionHits;
/** Add what `text` mentions to `hits`. Bare heads are recorded as heads. */
export declare function scanMentions(text: string, interest: MentionInterest, hits: MentionHits): void;
export declare function mergeHits(target: MentionHits, source: MentionHits): void;
/** The assembled piece that protects `name` in `hits`, if one does. */
export declare function assembledPiece(name: string, hits: MentionHits): string | undefined;
/** Whether `interest` still asks about `name` or any piece it could be built from. */
export declare function asksAbout(interest: MentionInterest, name: string): boolean;
/** The interest left after `hits`: what a further scan still has to find. */
export declare function remainingInterest(interest: MentionInterest, hits: MentionHits): MentionInterest;
export declare function interestIsEmpty(interest: MentionInterest): boolean;
