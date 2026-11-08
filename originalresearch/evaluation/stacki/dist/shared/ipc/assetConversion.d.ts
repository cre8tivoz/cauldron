export type ImageFormat = 'webp' | 'avif';
export declare const IMAGE_BATCH_MAX = 100;
export declare function parseImageFormat(input: unknown): ImageFormat;
export declare function parseImagePath(input: unknown): string;
export declare const parseConversionResult: import("../core/boundary").Parser<{
    readonly rel: string;
    readonly references: number;
    readonly bytesBefore: number;
    readonly bytesAfter: number;
} & {}>;
export type ConversionResult = ReturnType<typeof parseConversionResult>;
