import type { SettingsFieldKind } from './collectionSettings';
export declare const FIELD_CHECK_LIMITS: {
    readonly textCharsMax: 500;
    readonly optionsMax: 100;
    readonly optionCharsMax: 200;
};
/** Every check, with the kind of value it takes. */
export declare const FIELD_CHECKS: {
    readonly min: "number";
    readonly max: "number";
    readonly length: "number";
    readonly gt: "number";
    readonly lt: "number";
    readonly multipleOf: "number";
    readonly integer: "flag";
    readonly sign: "sign";
    readonly pattern: "text";
    readonly startsWith: "text";
    readonly endsWith: "text";
    readonly includes: "text";
    readonly trim: "flag";
    readonly letterCase: "case";
    readonly minDate: "date";
    readonly maxDate: "date";
    readonly minWidth: "number";
    readonly maxWidth: "number";
    readonly minHeight: "number";
    readonly maxHeight: "number";
    readonly nullable: "flag";
};
export type FieldCheckKey = keyof typeof FIELD_CHECKS;
export type NumberSign = 'positive' | 'negative' | 'nonnegative' | 'nonpositive';
export type LetterCase = 'lower' | 'upper';
type CheckValue<K extends FieldCheckKey> = {
    readonly number: number;
    readonly flag: boolean;
    readonly sign: NumberSign;
    readonly text: string;
    readonly case: LetterCase;
    readonly date: string;
}[(typeof FIELD_CHECKS)[K]];
/** A field's checks: each one set, or absent. */
export type FieldChecks = {
    readonly [K in FieldCheckKey]?: CheckValue<K>;
};
/** A default as a config can write it: text, a number, or a switch's state. */
export type FieldDefault = string | number | boolean;
/** The checks a field of `kind` offers, in the order its settings show them. */
export declare function checksFor(kind: SettingsFieldKind): readonly FieldCheckKey[];
/** A field's checks from the wire: known keys, values of their kinds, ranges in order. */
export declare function parseFieldChecks(input: unknown): FieldChecks;
/** An option field's values: a few, each a short line, none twice. */
export declare function parseFieldOptions(input: unknown): readonly string[] | undefined;
export declare function parseFieldDefault(input: unknown): FieldDefault | undefined;
export {};
