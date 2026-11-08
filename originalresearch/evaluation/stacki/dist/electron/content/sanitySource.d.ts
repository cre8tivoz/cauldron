/** The string literal value of this object's own `key`, if it is one. */
export declare function ownString(body: string, key: string): string | undefined;
/** The body of this object's own `key` when its value is a bracketed literal. */
export declare function ownBracketed(body: string, key: string, open: '[' | '{'): string | undefined;
/** The source text of this object's own `key` value, up to the next own comma. */
export declare function ownSource(body: string, key: string): string | undefined;
export declare function entryObject(entry: string): string;
export declare function entries(list: string): string[];
export declare function ownKey(body: string, key: string): number | undefined;
export declare function closing(text: string, open: number): number | undefined;
export declare function walk(text: string, visit: (index: number, depth: number) => boolean): void;
