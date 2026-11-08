import type { Result } from '../../shared/core/result';
import type { ConversionResult, ImageFormat } from '../../shared/ipc/assetConversion';
import type { ImageAliases } from './imageReferences';
export declare function convertImage(options: {
    readonly projectPath: string;
    readonly rel: string;
    readonly format: ImageFormat;
    readonly aliases?: ImageAliases;
    readonly trash: (file: string) => Promise<void>;
}): Promise<Result<ConversionResult, string>>;
