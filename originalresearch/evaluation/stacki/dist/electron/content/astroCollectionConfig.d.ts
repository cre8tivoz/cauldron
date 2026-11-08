import type { Result } from '../../shared/core/result';
/** Where a project with no content config gets one (Astro 5 and later). */
export declare const CONTENT_CONFIG_PATH = "src/content.config.ts";
export interface CollectionPatch {
    readonly text: string;
    /** The folder its entries live in, relative to the project. */
    readonly folder: string;
}
/**
 * The config with collection `name` added, or why it cannot be. `source` is
 * the config's text, or undefined when the project has none yet.
 */
export declare function addCollectionToConfig(source: string | undefined, name: string): Result<CollectionPatch, string>;
/**
 * Adds collection `name` to the project's content config, creating the config
 * when there is none, and makes its folder. Throws, with the reason, when the
 * config cannot be patched.
 */
export declare function createAstroCollection(projectPath: string, name: string): CollectionPatch;
