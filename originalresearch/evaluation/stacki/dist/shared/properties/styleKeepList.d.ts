export declare const STYLE_KEEP_LIMITS: {
    /** Patterns in one keep list. A design system's state classes fit in dozens. */
    readonly patternsMax: 1000;
    /** Characters in one pattern: a class name with room for a wildcard. */
    readonly patternCharsMax: 128;
};
export interface StyleKeepList {
    readonly version: 1;
    /** Class or id names, `*` matching any run of characters (`is-*`). */
    readonly keep: readonly string[];
}
export declare const EMPTY_KEEP_LIST: StyleKeepList;
export declare function parseStyleKeepList(input: unknown): StyleKeepList;
/** The keep list as JSON text, in the stable shape a diff reviews easily. */
export declare function serializeStyleKeepList(keepList: StyleKeepList): string;
/** A matcher for the keep list's patterns; exact names are a set lookup. */
export declare function keepMatcher(keepList: StyleKeepList): (name: string) => boolean;
