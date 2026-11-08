import type { Result } from '../../shared/core/result';
import type { FieldSettings, NewFieldKind, SettingsChange, SettingsField } from '../../shared/properties/collectionSettings';
/** What reading a collection found: its fields, and where its glob folder is named. */
export interface SchemaRead {
    readonly fields: readonly SettingsField[];
    readonly source: string | undefined;
}
/** A change's new config text, and the folder a renamed glob collection moves to. */
export interface SchemaEdit {
    readonly text: string;
    readonly move: {
        readonly from: string;
        readonly to: string;
    } | undefined;
}
export declare function readCollectionSchema(source: string, collection: string): Result<SchemaRead, string>;
/** The config with `change` made to `collection`'s schema, or why it cannot be. */
export declare function editCollectionSchema(source: string, collection: string, change: SettingsChange): Result<SchemaEdit, string>;
/** A new field's schema with its settings written in, as an existing field's would be. */
export declare function settledFieldText(kind: NewFieldKind, target: string, settings: FieldSettings): string;
/** The schema a new field of `kind` is written as. */
export declare function newFieldText(kind: NewFieldKind, target: string): string;
