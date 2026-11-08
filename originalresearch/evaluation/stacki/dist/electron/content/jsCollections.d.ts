/**
 * How a value that isn't a literal travels through the CMS: `{ __expr: "…" }`
 * holding the declaration's own source. The editor shows it in a code field
 * and writes it back verbatim, so `const year = new Date().getFullYear()`
 * stays computed instead of being flattened into whatever it evaluated to
 * once. The key is exported so the renderer can recognise one.
 */
declare const EXPR = "__expr";
interface ExprMarker {
    readonly __expr: string;
}
declare const isExpr: (value: unknown) => value is ExprMarker;
/**
 * Options both scanners take:
 *   requireExport — only `export const` counts. A page's frontmatter has no
 *     exports, so scanning one passes false.
 *   allowPlainLists — a list of strings or numbers counts as a collection too.
 *     In a data file that's one of its settings, shown as a list field in
 *     General; in a page's frontmatter (`const rotatingWords = ["found.", …]`)
 *     it's exactly what's being edited.
 */
interface ScanOptions {
    readonly requireExport?: boolean;
    readonly allowPlainLists?: boolean;
}
export interface Collection {
    readonly name: string;
    readonly data: unknown[] | undefined;
    readonly start: number;
    readonly end: number;
    readonly reason?: string;
}
/**
 * Every `export const NAME = [ … ]` whose array holds object literals.
 * Returns {name, data, start, end} where start/end bound the array text.
 * A collection whose contents aren't plain literals is returned with
 * `data: undefined` and a `reason`, so the UI can show it as read-only.
 */
declare function findCollections(source: string, options?: ScanOptions): Collection[];
/** The array literal text for `data`, indented to sit at column 0 of a statement. */
declare function serializeCollection(data: readonly unknown[], indent?: string): string;
/** Replace one collection's array in `source`, leaving everything else alone. */
declare function replaceCollection(source: string, name: string, data: readonly unknown[], options?: ScanOptions): string | undefined;
/** The address suffix for a file's non-repeating exports. Not a valid
 *  identifier, so it can never collide with a real export name. */
declare const GENERAL = "*general";
interface ScalarExport {
    readonly name: string;
    readonly value: unknown;
    readonly start: number;
    readonly end: number;
    readonly code?: boolean;
}
/**
 * Every `export const NAME = <literal>` whose value is a single value rather
 * than a list of records — site name, url, a count. These have no rows to
 * repeat, so the CMS shows them together as one "General" record.
 */
declare function findScalarExports(source: string, options?: ScanOptions): ScalarExport[];
/** A file's single values as one record, or undefined when it has none. */
declare function readGeneral(source: string, options?: ScanOptions): Record<string, unknown> | undefined;
/**
 * Write changed single values back. Only the values that actually differ are
 * rewritten, and each is replaced in place — so an untouched export keeps its
 * exact formatting, including a string the file wrapped onto its own line.
 */
declare function writeGeneral(source: string, data: Record<string, unknown>, options?: ScanOptions): string;
export { EXPR, isExpr, findCollections, replaceCollection, serializeCollection, findScalarExports, readGeneral, writeGeneral, GENERAL };
