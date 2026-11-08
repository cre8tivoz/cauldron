/** Collection names in the order the Studio's structure names them. */
export declare function sanityStructureOrder(projectRoot: string, types: readonly string[]): string[];
/** `names` sorted by a structure order; names it does not mention keep theirs, after. */
export declare function inStructureOrder(names: readonly string[], order: readonly string[]): string[];
/** The project's own source files whose text passes `test`, breadth first and bounded. */
export declare function projectSourceFiles(projectRoot: string, test: (text: string) => boolean): string[];
