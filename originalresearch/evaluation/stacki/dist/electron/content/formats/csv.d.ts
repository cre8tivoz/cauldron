declare function parseData(text: string): Record<string, string>[];
declare const DELETE: unique symbol;
export interface Edit {
    readonly path: readonly (string | number)[];
    readonly value?: unknown;
}
/**
 * Edits are { path: [rowIndex, column], value }. A column the file does not
 * have cannot be written — CSV has no room for one without rewriting every
 * row's header, which is a schema change, not a content edit.
 */
declare function applyEdits(text: string, edits: readonly Edit[]): string;
export { parseData, applyEdits, DELETE };
