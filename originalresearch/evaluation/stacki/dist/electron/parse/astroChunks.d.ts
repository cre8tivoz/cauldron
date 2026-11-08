import type { ParserPageModel } from './astroParserTypes';
export declare function resolveChunks(model: ParserPageModel, pagePath: string, options?: {
    readonly locs?: boolean;
}): void;
export declare function chunkImportMarks(model: ParserPageModel): Map<string, {
    path: string;
    group: boolean;
}>;
export declare function markChunkHtml(source: string, prefix: string, { group }: {
    readonly group: boolean;
}): string | undefined;
