import { type Result } from '../../shared/core/result';
export declare const ATOMIC_DIRECTORY: string;
interface AtomicDirectoryError {
    readonly code: 'filesystem';
    readonly message: string;
}
export declare function atomicDirectoryOf(file: string): string;
/** Validate both levels separately so a linked .stacki cannot redirect staging. */
export declare function prepareAtomicDirectory(file: string): Result<string, AtomicDirectoryError>;
export {};
