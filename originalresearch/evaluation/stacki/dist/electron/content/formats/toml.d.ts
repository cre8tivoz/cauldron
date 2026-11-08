declare const parseData: (text: string) => unknown;
declare const DELETE: unique symbol;
export interface Edit {
    readonly path: readonly (string | number)[];
    readonly value?: unknown;
    readonly rename?: string;
}
/**
 * Applies { path, value } edits to TOML source, replacing only the value text
 * each path names. Paths reach into inline tables. A key the file does not have
 * is appended to its table; a table the file does not have is added at the end.
 */
declare function applyEdits(text: string, edits: readonly Edit[]): string;
export { parseData, applyEdits, DELETE };
