export declare const ENTRY_SLUG_LIMITS: {
    /** Sanity's own slug default, and a URL segment anyone can still read. */
    readonly charsMax: 96;
    /** Sibling slugs a document carries for the duplicate check; a collection past it is checked on rename. */
    readonly takenMax: 2000;
    /** A folder prefix as long as a project path may be. */
    readonly folderCharsMax: 512;
    readonly reasonCharsMax: 400;
};
/** Whether an entry's id can be renamed here, and why not when it cannot. */
export type EntrySlugRename = {
    readonly kind: 'editable';
} | {
    readonly kind: 'locked';
    readonly reason: string;
};
/** What the Slug field edits: the id's last segment, its folder, and the slugs beside it. */
export interface EntrySlug {
    /** The id before its last segment, with its trailing slash; empty at the collection's root. */
    readonly folder: string;
    /** The id's last segment, as stored. */
    readonly value: string;
    /** The other entries' slugs in the same folder. */
    readonly taken: readonly string[];
    readonly rename: EntrySlugRename;
}
/** What typed text makes as a slug, and whether it can be saved. */
export type SlugCheck = {
    readonly kind: 'ok';
    readonly slug: string;
    readonly normalised: boolean;
} | {
    readonly kind: 'empty';
} | {
    readonly kind: 'tooLong';
    readonly slug: string;
} | {
    readonly kind: 'taken';
    readonly slug: string;
    readonly normalised: boolean;
};
/** Typed text as slug words, uncut: "61.4%" → "61-4", "Héllo & World" → "hello-and-world". */
export declare function slugWords(typed: string): string;
/** A name made into a slug within the bound, cut at a word where it can be. */
export declare function slugify(typed: string): string;
/** Typed text checked as an entry's slug against the other slugs in its folder. */
export declare function checkEntrySlug(typed: string, context: {
    readonly taken: readonly string[];
}): SlugCheck;
/** What stops a slug being saved, said under the field; nothing when it can be. */
export declare function slugProblem(check: SlugCheck): string | undefined;
/** The slug typed text is saved as, when that differs from what was typed. */
export declare function slugNote(check: SlugCheck): string | undefined;
/** An id split into its folder and its slug: `blog/first-post` → `blog/`, `first-post`. */
export declare function splitEntryId(id: string): {
    readonly folder: string;
    readonly value: string;
};
/** A rename's new slug, at the boundary: already normalised, never empty, within the bound. */
export declare function parseEntrySlugText(input: unknown): string;
/** A document's Slug field, from the wire. */
export declare function parseEntrySlug(input: unknown): EntrySlug;
