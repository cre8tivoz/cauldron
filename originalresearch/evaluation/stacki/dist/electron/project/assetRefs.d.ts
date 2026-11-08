interface DefaultImport {
    readonly name: string;
    readonly spec: string;
    readonly start: number;
    readonly end: number;
}
/** Every `import name from 'spec'` in the source, in the order written. */
declare function defaultImports(source: string): DefaultImport[];
/** The name an import binds, or undefined when nothing imports it. */
declare function importedAs(source: string, name: string): DefaultImport | undefined;
declare function importInsertAt(source: string): number;
/** The source with `import name from 'spec';` written into it. */
declare function addImport(source: string, name: string, spec: string): string;
declare function importName(fileRel: string, taken?: readonly string[]): string;
interface ImportSpecContext {
    readonly imports?: readonly DefaultImport[];
    readonly srcRelative?: string;
    readonly relative: string;
}
declare function importSpecFor({ imports, srcRelative: pathInSourceFolder, relative }: ImportSpecContext): string;
declare function withAssets(value: unknown, resolve: (name: string) => string | undefined): unknown;
export { defaultImports, importedAs, importInsertAt, addImport, importName, importSpecFor, withAssets };
export type { DefaultImport, ImportSpecContext };
