export declare function isRank(value: unknown): value is string;
/** A rank strictly between two (either may be absent, at an end of the list). */
export declare function rankBetween(after: string | undefined, before: string | undefined): string;
