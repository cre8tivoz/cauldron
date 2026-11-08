import { type Digest } from '../../shared/core/brand';
import { type Result } from '../../shared/core/result';
/** Why a write did not happen, or did without a durability promise. */
export type AtomicWriteError = {
    readonly code: 'filesystem';
    readonly message: string;
} | {
    readonly code: 'exists';
    readonly message: string;
} | {
    readonly code: 'not-durable';
    readonly message: string;
};
export declare const LOCK_PREFIX = ".stacki-lock-";
export declare const LOCK_SUFFIX = ".lock";
/** SHA-256 of the exact bytes, the only constructor of a Digest outside the
 * wire parser. A string is hashed as its UTF-8 encoding. */
export declare function digestOf(bytes: Uint8Array | string): Digest;
/** True for the temporary and lock files the write protocol creates, so the
 * project watcher can ignore them instead of reporting an outside edit. */
export declare function isAtomicTemporary(name: string): boolean;
/** Where a write to `file` lands: the file a symlink names, or the path itself
 * for a regular or missing file. A dangling symlink is refused (see header). */
export declare function writeTargetOf(file: string): Result<string, AtomicWriteError>;
/** Replace the existing `file` with `bytes` atomically. The caller verifies
 * what the file holds afterwards; this reports only what it did. */
export declare function replaceFileAtomic(file: string, bytes: Uint8Array): Result<void, AtomicWriteError>;
/** Create `file` with `bytes`, failing with `exists` if anything is there: a
 * creation can never overwrite. A crash mid-creation can leave a partial new
 * file; no existing bytes are ever at risk. */
export declare function createFileExclusive(file: string, bytes: Uint8Array): Result<void, AtomicWriteError>;
export declare function isMissing(error: unknown): boolean;
export declare function errorCode(error: unknown): string | undefined;
export declare function errorMessage(error: unknown): string;
