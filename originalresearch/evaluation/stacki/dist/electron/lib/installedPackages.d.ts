/** Whether `file` lies inside a node_modules folder, at any depth. The match
 * is a whole path segment, so `node_modules.astro` or `my_node_modules/` are
 * the user's own; case is ignored, as macOS and Windows ignore it. */
export declare function isInstalledFile(file: string): boolean;
/** The package an installed file belongs to, when it is inside one. */
export declare function packageOf(file: unknown): string | undefined;
