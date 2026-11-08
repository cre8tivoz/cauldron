import { type RemoteOption, type RemoteSchemaField } from '../../shared/properties/cmsRemoteSchema';
/** Each collection's entries as a reference to it offers them: id and title. */
export type ReferenceTargets = ReadonlyMap<string, readonly RemoteOption[]>;
/** A collection schema's top-level fields, in their declared order. */
export declare function astroSchemaFields(schema: unknown, targets: ReferenceTargets): readonly RemoteSchemaField[];
/** The collections a schema's references point at, so their entries can be offered. */
export declare function referencedCollections(schema: unknown): readonly string[];
/** A key as a label: `publishDate` → "Publish date". */
export declare function labelize(key: string): string;
