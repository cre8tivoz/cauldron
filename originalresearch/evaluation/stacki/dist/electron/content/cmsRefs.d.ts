export interface Alias {
    readonly prefix: string;
    readonly wildcard: boolean;
    readonly targets: readonly string[];
}
declare function aliasMap(projectPath: string): Alias[];
declare function resolveSpec(spec: string, fromFile: string, aliases: readonly Alias[]): string[];
declare function boundNames(clause: string): string[];
export interface Importer {
    readonly file: string;
    readonly rel: string;
    readonly names: readonly string[];
    readonly next: string;
}
declare function importersOf(projectPath: string, targetAbs: string): Importer[];
declare function resolveImport(projectPath: string, fromFile: string, spec: string): string | undefined;
export { importersOf, boundNames, resolveSpec, resolveImport, aliasMap };
