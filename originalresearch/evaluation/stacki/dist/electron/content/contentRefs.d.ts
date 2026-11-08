import type { Entry as ListedEntry } from './contentEntries';
export type SchemaPath = readonly (string | number)[];
type SchemaNode = Record<string, unknown>;
type MatchPredicate = (node: SchemaNode, value: unknown) => boolean;
/**
 * Every place inside one entry's data where a reference to `target` sits, as a
 * path. Walking the schema and the data together is what keeps this honest: a
 * plain string that happens to read like an id is not a reference, and a
 * reference nested inside the third member of a union inside an array is.
 */
declare function referencePaths(schema: unknown, data: unknown, target: string, options?: {
    readonly root?: unknown;
    readonly depth?: number;
    readonly path?: (string | number)[];
}): SchemaPath[];
/**
 * Every path in an entry where the schema node and the value both satisfy
 * `match`. One walker for two questions — which fields point at another entry,
 * and which hold an image — because both have to follow the same awkward route
 * through arrays, unions and recursion to find them.
 */
declare function matchingPaths(schema: unknown, data: unknown, match: MatchPredicate, { root, depth, path: at }?: {
    readonly root?: unknown;
    readonly depth?: number;
    readonly path?: (string | number)[];
}): SchemaPath[];
declare function mentions(schema: unknown, target: string, seen?: Set<unknown>, depth?: number): boolean;
/**
 * An image path rewritten for a file that has moved. The value is relative to
 * the entry that holds it — which is the whole point of it, and the reason a
 * post moved one folder up stops finding its own hero image.
 */
declare function rewriteRelative(value: string, sourceDirectory: string, targetDirectory: string): string;
interface CollectionLike {
    readonly name: string;
    readonly editable?: boolean;
    readonly schema?: unknown;
    readonly loader: {
        readonly kind: string;
        readonly generateId?: unknown;
    };
}
type Move = {
    readonly kind: 'generated';
    readonly note: string;
} | {
    readonly kind: 'unknown';
    readonly note: string;
} | {
    readonly kind: 'file';
    readonly from: string;
    readonly to: string;
} | {
    readonly kind: 'key';
    readonly file: string;
    readonly locator: readonly (string | number)[];
} | {
    readonly kind: 'field';
    readonly file: string;
    readonly locator: readonly (string | number)[];
};
export interface Pointer {
    readonly collection: string;
    readonly entryId: string;
    readonly entryTitle: string;
    readonly file: string;
    readonly path: SchemaPath;
    readonly entry: {
        readonly file: string;
        readonly locator: readonly (string | number)[];
    };
}
export interface ImageEdit {
    readonly path: SchemaPath;
    readonly from: unknown;
    readonly value: string;
}
export interface RenamePlan {
    readonly collection: string;
    readonly from: string;
    readonly to: string;
    readonly entry: ListedEntry;
    readonly move: Move;
    readonly pointers: readonly Pointer[];
    readonly imageEdits: readonly ImageEdit[];
}
/**
 * What renaming an entry would touch: the entry itself, and every field
 * anywhere in the project that points at it.
 */
declare function planRename(projectPath: string, collections: readonly CollectionLike[], { collection: name, from, to }: {
    readonly collection: string;
    readonly from: string;
    readonly to: string;
}): RenamePlan;
/**
 * Why an entry's id cannot be renamed here, or nothing when it can: a loader
 * that builds ids in code, a parser between the file and the entry, or a
 * record that does not write its id down.
 */
declare function entryRenameLock(collection: CollectionLike & {
    readonly loader: {
        readonly parser?: unknown;
    };
}, entry: ListedEntry): string | undefined;
/**
 * Carries out a plan. The pointers are rewritten first: an entry that has been
 * renamed but not yet pointed at is a broken link, and the shorter that window
 * is the better.
 */
declare function applyRename(projectPath: string, plan: RenamePlan): {
    renamed: boolean;
    pointers: number;
    files: string[];
};
export { planRename, applyRename, entryRenameLock, referencePaths, matchingPaths, rewriteRelative, mentions };
