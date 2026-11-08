import type { Result } from '../core/result';
export declare const METADATA_FILES: {
    readonly componentSources: ".stacki/component-sources.json";
    readonly components: ".stacki/components.json";
    readonly guide: ".stacki/guide.json";
    readonly pages: ".stacki/pages.json";
    readonly publish: ".stacki/publish.json";
    readonly styles: ".stacki/styles.json";
};
export type MetadataKind = keyof typeof METADATA_FILES;
export interface MetadataFile {
    readonly source?: string;
}
export declare function metadataKind(input: unknown): MetadataKind;
export declare function metadataSource(input: unknown): string;
export declare const parseMetadataFile: import("../core/boundary").Parser<{} & {
    readonly source?: string;
}>;
export declare const parseMetadataWrite: import("../core/boundary").Parser<{
    readonly kind: "pages" | "publish" | "components" | "componentSources" | "guide" | "styles";
    readonly source: string;
} & {
    readonly base?: string;
}>;
export declare function parseMetadataResult(input: unknown): Result<MetadataFile>;
export declare function validateMetadata(kind: MetadataKind, source: string): void;
