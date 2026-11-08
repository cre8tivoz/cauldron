export declare const NAMED_COLORS: Set<string>;
export declare const COLOR_FUNCTION: RegExp;
export declare function resolveValue(value: unknown, map: Map<string, string>, depth?: number): string;
export declare function colorOf(resolved: unknown): string | undefined;
export declare const isUncomputableColor: (resolved: unknown) => boolean;
export declare const FONT_WORDS: RegExp;
export declare function kindOf(value: unknown, resolved: unknown): string;
