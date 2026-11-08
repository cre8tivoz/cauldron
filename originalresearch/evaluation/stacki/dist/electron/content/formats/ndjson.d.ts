declare const parseData: (text: string) => unknown[];
declare const DELETE: unique symbol;
export interface Edit {
    readonly path: readonly (string | number)[];
    readonly value?: unknown;
}
/**
 * Edits are { path: [recordIndex, ...rest], value }, indexed over the records
 * the file holds rather than its lines — blank lines and comments are neither.
 */
declare function applyEdits(text: string, edits: readonly Edit[]): string;
export { parseData, applyEdits, DELETE };
