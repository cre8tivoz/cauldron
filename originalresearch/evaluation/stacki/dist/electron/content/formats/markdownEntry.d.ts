import * as yaml from './yaml';
export interface ParsedFrontmatter {
    readonly data: unknown;
    readonly frontmatter: string | undefined;
    readonly body: string;
    readonly offset: number;
}
/** { data, body, frontmatter } — data is undefined when the file has no frontmatter. */
declare function parse(text: string): ParsedFrontmatter;
declare const parseData: (text: string) => unknown;
/**
 * Applies edits to the frontmatter, and replaces the body when `body` is given.
 * A file with no frontmatter grows one; a file whose body is not passed keeps
 * the bytes it had.
 */
declare function applyEdits(text: string, edits: readonly yaml.Edit[], { body }?: {
    readonly body?: string | undefined;
}): string;
export { parse, parseData, applyEdits };
export declare const DELETE: symbol;
