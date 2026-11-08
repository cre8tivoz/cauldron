import { type FilePath } from '../../shared/core/brand';
import type { DiskError, DiskLock, DiskRead, DocumentDisk, LockError, Projector, ReplaceError } from '../../shared/engine/documentActor';
import { type Result } from '../../shared/core/result';
import { type Projection } from '../../shared/page/sourceProjection';
import { type ByteString } from '../../shared/core/span';
/** A lock older than this whose owner cannot be asked is abandoned: no save
 * holds its lock for more than one read, one write and one read-back. */
export declare const LOCK_STALE_MS = 10000;
export interface CanonicalDocument {
    /** The path the actor reads and writes. */
    readonly path: FilePath;
    /** One key per file, whatever spelling reached it. */
    readonly key: string;
}
export interface CreateError {
    readonly code: 'exists' | 'failed';
    readonly message: string;
}
export declare class NodeDocumentDisk implements DocumentDisk {
    #private;
    read(file: FilePath): Result<DiskRead, DiskError>;
    lock(file: FilePath): Result<DiskLock, LockError>;
    unlock(lock: DiskLock): Result<void, DiskError>;
    replace(file: FilePath, bytes: ByteString): Result<void, ReplaceError>;
    /** Create a new document; never overwrites (atomicWrite.ts). Creation is not
     * an intent — there are no authored bytes to witness — so the host calls it
     * directly and the actor adopts the file on its next read. */
    create(file: FilePath, bytes: ByteString): Result<void, CreateError>;
    /** The actor's path and identity key for `file` (see header). */
    canonical(file: string): Result<CanonicalDocument, string>;
}
/** Bytes → projection, through the real parser (plan §2 layer 1). `.astro`
 * pages get a page projection, and so — since step 10 — do Markdown and MDX
 * pages, through the Markdown parser; every other document — a chunk, a
 * stylesheet — is opaque (plan §6). Invalid UTF-8 is a parse-error
 * projection, never a lossy decode (plan §3.2). */
export declare function projectDocument(file: FilePath, bytes: ByteString): Projection;
/** The actor's projector in the app. Snapshots derive their projection when
 * first read (shared/page/snapshot.ts, createLazySnapshot), so a save that only
 * replaces the whole file parses nothing it does not use. A single value
 * splice derives its candidate from the base projection
 * (shared/engine/projectionPatch.ts); the simulator holds that patch to a full
 * reparse on every candidate (plan §10). */
export declare const NODE_PROJECTOR: Projector;
export interface LockOwner {
    readonly pid: number;
    readonly host: string;
    readonly token: string;
}
export declare function readLockOwner(lockFile: string): LockOwner | undefined;
export declare const LOCK_OWNER_CHARS_MAX = 1024;
