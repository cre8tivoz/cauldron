import { type RemoteSchemaField } from '../../shared/properties/cmsRemoteSchema';
import type { Entry } from './contentEntries';
/** One collection's entries, as the inference reads them. */
export interface RecordCollection {
    readonly name: string;
    readonly entries: readonly Entry[];
    /** The project file of a record's picture, which a choice of its records shows. */
    readonly imageOf?: ((entry: Entry) => string | undefined) | undefined;
}
/**
 * The fields of collection `own`, with each undeclared reference given its
 * target's entries as options. A field that already offers options, names an
 * image, or holds values matching no single collection is returned as it was.
 */
export declare function withInferredReferences(fields: readonly RemoteSchemaField[], own: RecordCollection, collections: readonly RecordCollection[]): readonly RemoteSchemaField[];
/**
 * An image path as Astro resolves it, relative to the project: beside the
 * entry's file (`./`, `../`, or a bare name), or from the root (`/`). Astro
 * imports the path through Vite, which looks for a root path in public/ first
 * and then from the project root, so `/src/assets/a.png` names a file too.
 * A link elsewhere, or a path that climbs out of the project, has no file here.
 */
export declare function projectImage(projectPath: string, entryFile: string, value: string): string | undefined;
/** An entry's picture: the project file its image field names, if it names one. */
export declare function entryImage(projectPath: string, entry: Entry, imageField: string | undefined): string | undefined;
