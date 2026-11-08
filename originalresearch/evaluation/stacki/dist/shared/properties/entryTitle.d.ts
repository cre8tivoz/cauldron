/** The name fields Sanity's list query also reads, in its order. */
export declare const NAME_KEYS: readonly ["title", "name", "heading", "label"];
/** A name past this is cut, so a long field cannot stretch a list row. */
export declare const ENTRY_TITLE_CHARS_MAX = 200;
/** What gives an entry its name when it has none. */
export declare const UNTITLED = "untitled";
/** The fields a collection's schema declares, in order, and those that never hold a name. */
export interface TitleFields {
    readonly order: readonly string[];
    /** Images and references: their values are paths and ids, not names. */
    readonly skipped: readonly string[];
}
export declare const NO_TITLE_FIELDS: TitleFields;
/** The schema's declared fields as `entryTitleOf` reads them. */
export declare function titleFieldsOf(schema: unknown): TitleFields;
/** The name an entry shows by: a name field, its first short text field, its id, or "untitled". */
export declare function entryTitleOf(data: unknown, context: {
    readonly id: string;
    readonly fields: TitleFields;
}): string;
/** Steps 1 and 2 alone: the name an entry's own fields give it, or nothing (a new entry's slug follows it). */
export declare function entryNameOf(data: unknown, fields: TitleFields): string | undefined;
