export declare const COMPONENT_SOURCE_FILE = ".stacki/component-sources.json";
export declare const COMPONENT_SOURCE_LIMITS: {
    readonly sourcesMax: 16;
    readonly filesMax: 10000;
    readonly directoriesMax: 1000;
    readonly sourceBytesMax: number;
    readonly sourceBytesTotalMax: number;
    readonly configBytesMax: 16384;
};
export interface PackageComponentSource {
    readonly kind: 'package';
    readonly package: string;
    readonly directory: string;
    readonly importPrefix: string;
}
export interface ComponentSources {
    readonly version: 1;
    readonly sources: readonly PackageComponentSource[];
}
export type ComponentOrigin = {
    readonly kind: 'local';
} | {
    readonly kind: 'package';
    readonly package: string;
    readonly importPath: string;
};
export declare function parseComponentSources(input: unknown): ComponentSources;
export declare function parseComponentOrigin(input: unknown): ComponentOrigin;
export declare function componentSourceRoot(source: PackageComponentSource): string;
export declare function componentImportPath(input: unknown): string;
