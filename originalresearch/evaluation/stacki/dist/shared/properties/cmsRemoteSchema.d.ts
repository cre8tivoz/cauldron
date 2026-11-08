export declare const REMOTE_SCHEMA_LIMITS: {
    readonly typeDepthMax: 8;
    readonly fieldsMax: 120;
    readonly membersMax: 24;
    readonly rulesMax: 16;
    readonly optionsMax: 200;
    readonly nameCharsMax: 128;
    readonly titleCharsMax: 200;
    readonly descriptionCharsMax: 1000;
    readonly valueDepthMax: 12;
    readonly valueNodesMax: 20000;
    readonly valueCharsMax: 100000;
};
export type RemoteScalarKind = 'string' | 'text' | 'url' | 'email' | 'number' | 'boolean' | 'date' | 'datetime' | 'slug';
export type RemoteType = {
    readonly kind: RemoteScalarKind;
    readonly options: readonly RemoteOption[];
    /** A string that names a project file of this kind: an Astro `image()` path. */
    readonly asset?: 'image';
} | {
    readonly kind: 'geopoint';
} | {
    readonly kind: 'object';
    readonly name: string;
    readonly fields: readonly RemoteSchemaField[];
    /** How one shows as a list row, from its schema's `preview` (paths into it). */
    readonly preview?: RemoteRowPreview;
    /** Fields side by side, from `options: { columns }` (2 to 4). */
    readonly columns?: number;
} | {
    readonly kind: 'image';
    readonly fields: readonly RemoteSchemaField[];
} | {
    readonly kind: 'file';
} | {
    readonly kind: 'reference';
    readonly to: readonly string[];
} | {
    readonly kind: 'array';
    readonly of: readonly RemoteType[];
} | {
    readonly kind: 'richText';
};
/** A row's title path and the paths its subtitle joins, in order (`campus.name`). */
export interface RemoteRowPreview {
    readonly title: string | undefined;
    readonly parts: readonly string[];
}
/** A choice a string field offers instead of free text (`options.list`). */
export interface RemoteOption {
    readonly title: string;
    readonly value: string;
    /** The picture of the record it names, as a project file (an Astro entry's first image). */
    readonly imageFile?: string;
}
export interface RemoteSchemaField {
    readonly name: string;
    readonly title: string;
    readonly description: string;
    /** The Studio refuses to publish without it (`validation: (rule) => rule.required()`). */
    readonly required: boolean;
    /** The checks its schema states that can be read without running code. */
    readonly rules: readonly RemoteRule[];
    readonly type: RemoteType;
    /** Shown but not edited, as the Studio locks it; absent where it can be edited. */
    readonly readOnly?: RemoteReadOnly;
}
/**
 * When the Studio refuses edits to a field: `always` (`readOnly: true`), or
 * `when-set`, once it holds a value (`readOnly: ({ value }) => value !== undefined`),
 * so a choice made once is kept. A rule that asks who is signed in is the
 * Studio's own code, so that field stays editable.
 */
export type RemoteReadOnly = 'always' | 'when-set';
/** Whether a field takes no edit while it holds `value`. */
export declare function isLocked(field: Pick<RemoteSchemaField, 'readOnly'>, value: RemoteValue | undefined): boolean;
/**
 * One validation check from a schema's `validation: (rule) => rule.…` chain.
 * An `error` blocks publishing, as in the Studio; a `warning` only says so.
 */
export type RemoteRule = {
    readonly level: 'error' | 'warning';
} & ({
    readonly kind: 'required' | 'email' | 'unique' | 'integer' | 'positive';
} | {
    readonly kind: 'min' | 'max' | 'length';
    readonly limit: number;
} | {
    readonly kind: 'uri';
    readonly schemes: readonly string[];
    readonly relative: boolean;
});
export declare function parseRemoteRule(input: unknown): RemoteRule;
/** A JSON value as a CMS stores it. Absence is `undefined`; JSON's null is dropped. */
export type RemoteValue = string | number | boolean | readonly RemoteValue[] | {
    readonly [key: string]: RemoteValue;
};
export declare function parseRemoteType(input: unknown, depth?: number): RemoteType;
export declare function parseRemoteSchemaField(input: unknown, depth?: number): RemoteSchemaField;
/** A stored value: JSON, bounded in depth, size and string length; nulls dropped. */
export declare function parseRemoteValue(input: unknown): RemoteValue | undefined;
/** A path inside the project: relative, forward slashes, never climbing out of it. */
export declare function parseProjectFile(input: unknown): string;
/** The plain-object view of a value, or undefined when it is not one. */
export declare function remoteObject(value: RemoteValue | undefined): {
    readonly [key: string]: RemoteValue;
} | undefined;
/** The list view of a value, or undefined when it is not one. */
export declare function remoteList(value: RemoteValue | undefined): readonly RemoteValue[] | undefined;
