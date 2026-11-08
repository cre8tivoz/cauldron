interface FormatEdit {
    readonly path: readonly (string | number)[];
    readonly value?: unknown;
    readonly rename?: string;
}
interface FormatModule {
    readonly parseData: (text: string) => unknown;
    readonly applyEdits: (text: string, edits: readonly FormatEdit[], opts?: {
        readonly body?: string;
    }) => string;
    readonly DELETE: symbol;
}
declare const formatFor: (file: string) => FormatModule | undefined;
declare const formatName: (file: string) => string;
declare function globToRegExp(pattern: string): RegExp;
export interface LoaderInfo {
    readonly kind?: string;
    readonly base?: string;
    readonly pattern?: string | readonly string[];
    readonly file?: string;
    readonly generateId?: unknown;
    readonly parser?: unknown;
}
export interface ContentCollection {
    readonly name: string;
    readonly loader?: LoaderInfo;
    readonly editable?: boolean;
    readonly schema?: unknown;
}
export interface Entry {
    readonly id: string;
    readonly file: string;
    readonly format: string;
    /** The path to the record inside its file; empty for one file per entry. */
    readonly locator: readonly (string | number)[];
    readonly data: unknown;
    readonly title: string;
    readonly body?: string;
    readonly hasBody?: boolean;
    readonly error?: string;
    readonly keyed?: boolean;
}
export interface EntryEdit {
    readonly path: readonly (string | number)[];
    readonly value?: unknown;
    readonly rename?: string;
}
export interface ListResult {
    readonly entries: Entry[];
    readonly readOnly: boolean;
    readonly reason?: string | undefined;
    readonly idsAreGuesses?: boolean;
    readonly idNote?: string | undefined;
    readonly shape?: string;
    readonly parsed?: boolean;
    readonly parserNote?: string | undefined;
}
/**
 * Every entry of one collection, as { id, file, format, locator, data, body }.
 */
declare function listEntries(projectPath: string, collection: ContentCollection): ListResult;
interface RawRecord {
    readonly id: string;
    readonly idKey: string | undefined;
    readonly keyed?: boolean;
    readonly locator: readonly (string | number)[];
    readonly record: Record<string, unknown>;
}
declare function locateRecords(data: unknown): {
    shape: string;
    records: RawRecord[];
};
/**
 * Applies edits to one entry. `edits` are { path, value } against the entry's
 * own data — the locator that puts it inside its file is added here — plus an
 * optional `body` for the formats that have one.
 */
declare function writeEntry(projectPath: string, entry: {
    readonly file: string;
    readonly locator?: readonly (string | number)[];
}, edits: readonly EntryEdit[], { body, expected, }?: {
    readonly body?: string;
    readonly expected?: {
        readonly data?: unknown;
        readonly body?: string | undefined;
    };
}): {
    ok: true;
    changed: boolean;
};
/**
 * How many entries a collection has, without reading them. The panel shows a
 * count next to every collection, and parsing a hundred markdown files to draw
 * a number is a cost with nothing to show for it.
 */
declare function countEntries(projectPath: string, collection: ContentCollection): number;
/**
 * The files a content collection already owns. They are edited through their
 * schema, not as loose JSON, so the file-based editor leaves them alone rather
 * than offering a second way in with different rules.
 */
declare function coveredPaths(projectPath: string, collections: readonly ContentCollection[]): {
    files: string[];
    dirs: string[];
};
export { listEntries, writeEntry, countEntries, coveredPaths, locateRecords, globToRegExp, formatFor, formatName };
