export declare function projectAliases(projectPath: string): readonly (readonly [string, readonly string[]])[];
export declare const SOURCE_EXTENSIONS: string[];
export declare function firstExisting(base: string): string | undefined;
export declare function resolveImportPath(projectPath: string, fromFile: string, spec: string): string | undefined;
export declare function declarationLine(text: string, name: string): number;
export declare function parseAliases(input: unknown): readonly (readonly [string, readonly string[]])[];
