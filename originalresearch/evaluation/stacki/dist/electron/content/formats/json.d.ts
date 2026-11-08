export interface ScalarNode {
    readonly type: 'scalar';
    readonly start: number;
    readonly end: number;
}
export interface Member {
    readonly key: string;
    readonly keyStart: number;
    readonly keyEnd: number;
    readonly start: number;
    readonly end: number;
    readonly value: JsonNode;
}
export interface ObjectNode {
    readonly type: 'object';
    readonly start: number;
    readonly end: number;
    readonly members: Member[];
}
export interface ArrayNode {
    readonly type: 'array';
    readonly start: number;
    readonly end: number;
    readonly items: JsonNode[];
}
export type JsonNode = ScalarNode | ObjectNode | ArrayNode;
declare function parse(text: string): JsonNode;
declare const parseData: (text: string) => unknown;
declare function indentUnit(text: string): string;
declare const DELETE: unique symbol;
export interface Edit {
    readonly path: readonly (string | number)[];
    readonly value?: unknown;
    readonly rename?: string;
}
/**
 * Applies edits to JSON source text, changing only the spans that changed.
 * Each edit is { path: [key | index, ...], value } — `DELETE` as the value
 * removes the member. Paths that name something inside a value that does not
 * exist yet create the intermediate objects.
 */
declare function applyEdits(text: string, edits: readonly Edit[]): string;
export { parse, parseData, applyEdits, indentUnit, DELETE };
