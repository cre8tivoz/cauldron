import type { ImageFormat } from '../../shared/ipc/assetConversion';
import type { Result } from '../../shared/core/result';
export declare const IMAGE_BYTES_MAX: number;
export declare function encodeImage(bytes: Buffer, format: ImageFormat): Promise<Result<Buffer, string>>;
