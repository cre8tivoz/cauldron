import type { RemoteSchemaField } from '../../shared/properties/cmsRemoteSchema';
import { type Entry } from './contentEntries';
/** Where a new record went: its Astro id. */
export interface AddedRecord {
    readonly id: string;
}
/**
 * Adds a record to the data file the collection's entries live in, seeded with
 * a value for every required field so the collection still parses. Throws, with
 * the reason, when the file's shape or format cannot take one.
 */
export declare function addDataRecord(projectPath: string, context: {
    /** The data file, relative to the project (the loader's `file`). */
    readonly file: string;
    readonly entries: readonly Entry[];
    readonly fields: readonly RemoteSchemaField[];
}): AddedRecord;
/** Removes records from their data file, the last first, so earlier places hold. */
export declare function removeDataRecords(projectPath: string, entries: readonly Entry[]): number;
