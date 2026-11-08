import { type FieldChecks, type FieldDefault } from './fieldChecks';
export declare const COLLECTION_SETTINGS_LIMITS: {
    readonly fieldsMax: 200;
    readonly descriptionCharsMax: 500;
    readonly fieldNameCharsMax: 64;
};
/**
 * The kinds of field a collection's settings know, as a CMS names them. Each is
 * a zod schema in the content config (astroSchemaEdit.ts): text is a string,
 * a link a `.url()` string, an option a `z.enum`, an image `image()`, a
 * reference `reference('collection')`, and their lists `z.array(…)`; a group
 * is a nested `z.object`, key–value pairs a `z.record`, a constant a
 * `z.literal`, and any value `z.unknown()`. Rich text,
 * a phone number and a file are strings too, so once written they read back as
 * plain text.
 */
export declare const SETTINGS_FIELD_KINDS: readonly ["text", "richText", "image", "multiImage", "videoLink", "link", "email", "phone", "number", "date", "switch", "color", "option", "file", "reference", "multiReference", "list", "group", "keyValue", "constant", "any", "other"];
export type SettingsFieldKind = (typeof SETTINGS_FIELD_KINDS)[number];
/** The kinds a new field may be: every kind but one written by hand. */
export type NewFieldKind = Exclude<SettingsFieldKind, 'other'>;
/** The kinds that point at another collection, and so name it when added. */
export declare function pointsAtCollection(kind: SettingsFieldKind): boolean;
export interface SettingsField {
    readonly name: string;
    readonly kind: SettingsFieldKind;
    readonly description: string | undefined;
    readonly required: boolean;
    /** Its zod checks (fieldChecks.ts): lengths, ranges, a pattern and the like. */
    readonly checks: FieldChecks;
    /** An option field's values (`z.enum([…])`); absent for every other kind. */
    readonly options: readonly string[] | undefined;
    /** Its `.default(…)`, filled in when an entry leaves it out. */
    readonly defaultValue: FieldDefault | undefined;
    /**
     * Its settings can be written back. Every field written as `name: schema`
     * (or shorthand) can; one written as a method or accessor cannot.
     */
    readonly editable: boolean;
    /** The collection a reference points at; absent for every other kind. */
    readonly target?: string | undefined;
}
export interface CollectionSettings {
    readonly name: string;
    /** Where its entries live, as its loader says (`src/content/blog`, `src/data/team.json`). */
    readonly source: string | undefined;
    readonly fields: readonly SettingsField[];
}
/** A field's settings as the form saves them, apart from its name. */
export interface FieldSettings {
    readonly description: string | undefined;
    readonly required: boolean;
    readonly checks: FieldChecks;
    readonly options: readonly string[] | undefined;
    readonly defaultValue: FieldDefault | undefined;
}
/** An existing field's settings as the form saves them. */
export interface FieldUpdate extends FieldSettings {
    readonly name: string;
}
export type SettingsChange = {
    readonly kind: 'renameCollection';
    readonly to: string;
} | {
    readonly kind: 'reorder';
    readonly order: readonly string[];
} | {
    readonly kind: 'renameField';
    readonly from: string;
    readonly to: string;
} | {
    readonly kind: 'updateField';
    readonly update: FieldUpdate;
} | {
    readonly kind: 'addField';
    readonly name: string;
    readonly fieldKind: NewFieldKind;
    /** The collection a reference points at; absent for every other kind. */
    readonly target: string | undefined;
    /** Its settings, written with it: help text, checks, required, a default. */
    readonly settings: FieldSettings;
} | {
    readonly kind: 'removeField';
    readonly name: string;
} | {
    readonly kind: 'deleteCollection';
};
/** A new field's settings until the form says otherwise: optional, with nothing else set. */
export declare function newFieldSettings(kind: NewFieldKind): FieldSettings;
/** A field's name as typed: letters, digits, `-` and `_`, starting with a letter. */
export declare function parseSettingsFieldName(input: unknown): string;
export declare function parseSettingsChange(input: unknown): SettingsChange;
export declare function parseFieldUpdate(input: unknown): FieldUpdate;
export declare function parseFieldSettings(input: unknown): FieldSettings;
export declare function parseCollectionSettings(input: unknown): CollectionSettings;
/**
 * A collection's new name as typed: kept as written when it is already a name
 * (`team`, `staffMembers`, `staff-members`); otherwise its words joined with
 * dashes in lowercase, as the content folders and data files are named.
 */
export declare function parseCollectionRename(input: unknown): string;
