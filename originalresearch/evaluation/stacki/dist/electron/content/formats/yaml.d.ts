import * as YAML from 'yaml';
declare const parseData: (text: string) => unknown;
declare const parseDocument: (text: string) => YAML.Document;
declare const DELETE: unique symbol;
export interface Edit {
    readonly path: readonly (string | number)[];
    readonly value?: unknown;
    readonly rename?: string;
}
/**
 * Applies { path, value } edits to YAML source text. `DELETE` removes the key.
 */
declare function applyEdits(text: string, edits: readonly Edit[]): string;
/**
 * True when this text survives a parse and re-emit unchanged. Everything the
 * editor writes goes through the document model, so a file that does not round
 * trip cleanly would pick up unrelated changes on its first save — better to
 * know that before writing than to explain the diff afterwards.
 */
declare function roundTrips(text: string): boolean;
export { parseData, parseDocument, applyEdits, roundTrips, DELETE, YAML };
