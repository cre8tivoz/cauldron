"use strict";
// An Astro content entry's slug: the editable part of its id, as the CMS
// panel's Slug field shows it, and the one rule both sides apply to it.
//
// An entry's id is what `reference()` fields and `getEntry()` calls hold, so a
// renamed id must be one the site can still use in a URL: lower case letters,
// digits and single hyphens, no hyphen at either end. What is typed is
// normalised to that and the field says so; a slug that is empty, too long, or
// already another entry's in the same folder is refused, on every keystroke in
// the panel and again when the rename reaches the main process.
//
// A glob entry's id carries its folder (`blog/first-post`). Only the last
// segment is the slug; the folder is kept, so a rename never moves an entry to
// another folder.
Object.defineProperty(exports, "__esModule", { value: true });
exports.ENTRY_SLUG_LIMITS = void 0;
exports.slugWords = slugWords;
exports.slugify = slugify;
exports.checkEntrySlug = checkEntrySlug;
exports.slugProblem = slugProblem;
exports.slugNote = slugNote;
exports.splitEntryId = splitEntryId;
exports.parseEntrySlugText = parseEntrySlugText;
exports.parseEntrySlug = parseEntrySlug;
const boundary_1 = require("../core/boundary");
const assert_1 = require("../core/assert");
exports.ENTRY_SLUG_LIMITS = {
    /** Sanity's own slug default, and a URL segment anyone can still read. */
    charsMax: 96,
    /** Sibling slugs a document carries for the duplicate check; a collection past it is checked on rename. */
    takenMax: 2000,
    /** A folder prefix as long as a project path may be. */
    folderCharsMax: 512,
    reasonCharsMax: 400,
};
/** Typed text as slug words, uncut: "61.4%" → "61-4", "Héllo & World" → "hello-and-world". */
function slugWords(typed) {
    const words = typed
        .normalize('NFKD')
        .replace(/[̀-ͯ]/g, '')
        .toLowerCase()
        .replace(/&/g, ' and ')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
    (0, assert_1.assert)(!words.startsWith('-'), 'A slug never starts with a hyphen');
    (0, assert_1.assert)(!words.endsWith('-'), 'A slug never ends with a hyphen');
    return words;
}
/** A name made into a slug within the bound, cut at a word where it can be. */
function slugify(typed) {
    const words = slugWords(typed);
    const slug = cut(words, exports.ENTRY_SLUG_LIMITS.charsMax);
    (0, assert_1.assert)(slug.length <= exports.ENTRY_SLUG_LIMITS.charsMax, 'A slug stays within its bound');
    (0, assert_1.assert)(!slug.startsWith('-'), 'A slug never starts with a hyphen');
    return slug;
}
/** Typed text checked as an entry's slug against the other slugs in its folder. */
function checkEntrySlug(typed, context) {
    const slug = slugWords(typed);
    if (slug === '') {
        return { kind: 'empty' };
    }
    if (slug.length > exports.ENTRY_SLUG_LIMITS.charsMax) {
        return { kind: 'tooLong', slug };
    }
    const normalised = slug !== typed;
    if (context.taken.includes(slug)) {
        return { kind: 'taken', slug, normalised };
    }
    (0, assert_1.assert)(slug.length > 0, 'A saved slug is never empty');
    return { kind: 'ok', slug, normalised };
}
/** What stops a slug being saved, said under the field; nothing when it can be. */
function slugProblem(check) {
    switch (check.kind) {
        case 'ok':
            return undefined;
        case 'empty':
            return 'A slug needs at least one letter or number';
        case 'tooLong':
            return `At most ${exports.ENTRY_SLUG_LIMITS.charsMax} characters`;
        case 'taken':
            return 'Another item already uses this slug';
        default: {
            const exhaustive = check;
            return exhaustive;
        }
    }
}
/** The slug typed text is saved as, when that differs from what was typed. */
function slugNote(check) {
    switch (check.kind) {
        case 'ok':
        case 'taken':
            return check.normalised ? `Saved as “${check.slug}”` : undefined;
        case 'empty':
        case 'tooLong':
            return undefined;
        default: {
            const exhaustive = check;
            return exhaustive;
        }
    }
}
/** An id split into its folder and its slug: `blog/first-post` → `blog/`, `first-post`. */
function splitEntryId(id) {
    const slash = id.lastIndexOf('/');
    const folder = slash < 0 ? '' : id.slice(0, slash + 1);
    const value = id.slice(folder.length);
    (0, assert_1.assert)(`${folder}${value}` === id, 'A split id joins back to itself');
    return { folder, value };
}
/** A rename's new slug, at the boundary: already normalised, never empty, within the bound. */
function parseEntrySlugText(input) {
    const slug = (0, boundary_1.text)(input);
    if (slug.length === 0) {
        throw new Error('A slug cannot be empty.');
    }
    if (slug.length > exports.ENTRY_SLUG_LIMITS.charsMax) {
        throw new Error('The slug is too long.');
    }
    if (slugWords(slug) !== slug) {
        throw new Error('A slug is lower case letters, numbers and single hyphens.');
    }
    (0, assert_1.assert)(!slug.includes('/'), 'A slug never names a folder');
    return slug;
}
/** A document's Slug field, from the wire. */
function parseEntrySlug(input) {
    const value = (0, boundary_1.record)(input);
    const folder = (0, boundary_1.text)(value['folder']);
    if (folder.length > exports.ENTRY_SLUG_LIMITS.folderCharsMax) {
        throw new Error('The entry folder is too long.');
    }
    if (folder !== '' && !folder.endsWith('/')) {
        throw new Error('An entry folder ends with a slash.');
    }
    const stored = (0, boundary_1.text)(value['value']);
    if (stored.length > exports.ENTRY_SLUG_LIMITS.folderCharsMax || stored.includes('/')) {
        throw new Error('Invalid entry slug.');
    }
    const taken = value['taken'];
    if (!Array.isArray(taken) || taken.length > exports.ENTRY_SLUG_LIMITS.takenMax) {
        throw new Error('Expected the slugs already taken, within the bound.');
    }
    const slugs = taken.map((each) => (0, boundary_1.text)(each));
    (0, assert_1.assert)(slugs.length <= exports.ENTRY_SLUG_LIMITS.takenMax, 'Taken slugs are bounded');
    return { folder, value: stored, taken: slugs, rename: parseRename(value['rename']) };
}
function parseRename(input) {
    const value = (0, boundary_1.record)(input);
    if (value['kind'] === 'editable') {
        return { kind: 'editable' };
    }
    if (value['kind'] !== 'locked') {
        throw new Error('Expected whether the slug can be renamed.');
    }
    const reason = (0, boundary_1.text)(value['reason']);
    if (reason.length === 0 || reason.length > exports.ENTRY_SLUG_LIMITS.reasonCharsMax) {
        throw new Error('A locked slug says why, briefly.');
    }
    return { kind: 'locked', reason };
}
// Cut at the last hyphen before the bound, so a long name loses whole words.
function cut(slug, max) {
    if (slug.length <= max) {
        return slug;
    }
    const head = slug.slice(0, max);
    const lastHyphen = head.lastIndexOf('-');
    return (lastHyphen > 0 ? head.slice(0, lastHyphen) : head).replace(/-+$/, '');
}
