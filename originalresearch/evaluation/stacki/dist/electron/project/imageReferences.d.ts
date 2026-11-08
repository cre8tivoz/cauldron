export type ImageAliases = readonly (readonly [string, readonly string[]])[];
export interface ImageReferenceEdit {
    readonly file: string;
    readonly before: string;
    readonly after: string;
}
export declare function planImageReferences(projectPath: string, from: string, to: string, aliases: ImageAliases): ImageReferenceEdit[];
export declare function rewriteImageReferences(source: string, file: string, projectPath: string, from: string, to: string, aliases?: ImageAliases): string;
export declare function imageReferenceDigest(source: string): import("../../shared/core/brand").Digest;
