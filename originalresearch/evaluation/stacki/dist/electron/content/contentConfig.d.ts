/** Whether the project has a content config in any place Astro reads one from. */
export declare function hasContentConfig(projectPath: string): boolean;
declare function configPathOf(projectPath: string): {
    abs: string;
    rel: string;
} | undefined;
declare function stopService(projectPath: string): void;
export type ContentConfigResult = {
    readonly missing: true;
    readonly collections: unknown[];
} | {
    readonly collections: unknown;
    readonly configPath: string;
} | {
    readonly collections: unknown[];
    readonly configPath: string;
    readonly error: string;
};
/**
 * { collections: [...] } for a project, { missing: true } when it has no
 * content config, or { error } when the config could not be read.
 */
declare function readContentConfig(projectPath: string, { force }?: {
    readonly force?: boolean;
}): Promise<ContentConfigResult>;
/**
 * Parses an entry's data with the collection's real schema, and reports what
 * zod says — including the rules that look at the whole entry rather than one
 * field, which are the ones a form cannot check on its own.
 */
declare function validateEntry(projectPath: string, { collection, data }: {
    readonly collection: string;
    readonly data: unknown;
}): Promise<Record<string, unknown>>;
declare const stopAllServices: () => void;
export { readContentConfig, validateEntry, configPathOf, stopService, stopAllServices };
