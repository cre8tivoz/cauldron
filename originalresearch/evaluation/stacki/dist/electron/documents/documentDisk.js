"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LOCK_OWNER_CHARS_MAX = exports.NODE_PROJECTOR = exports.NodeDocumentDisk = exports.LOCK_STALE_MS = void 0;
exports.projectDocument = projectDocument;
exports.readLockOwner = readLockOwner;
// The document actor's real disk (plan §5.2), and the only module that writes
// a page, chunk or stylesheet: it implements shared/engine/documentActor.ts's
// DocumentDisk over node:fs, through the primitives in atomicWrite.ts.
//
// - Reads are bounded by LIMITS.sourceBytesMax before and after the read.
// - The advisory lock (§5.2 step 7) is a lock file in the target's stable hidden
//   save directory, created exclusively and naming its owner (process, host, token).
//   It excludes only cooperating writers — another Stacki window or process. A lock whose owner
//   process is gone (a crash) is broken by the next writer; any lock is broken
//   once it is older than LOCK_STALE_MS. Node has
//   no portable flock, so a lock file is the "where available" of the plan.
// - Canonical paths: one actor per file, whatever spelling reaches it. The key
//   is the directory's identity (device and inode — directories are never
//   replaced by a save, so it is stable) plus the name, case-folded where the
//   directory is case-insensitive. Only a real probe decides that: `stat` the
//   name with its case swapped and compare identities. Without one (a missing
//   file, a name without letters) the platform default holds until a probe in
//   the same directory decides.
// - Installed code: a file inside node_modules is never locked, replaced or
//   created (electron/lib/installedPackages.ts). The check is on where the
//   write would land, folder links and file links resolved, so no spelling of
//   the path slips past it — pnpm's hard-linked `file:` dependencies live under
//   the project's own node_modules, and a write there reached the package's
//   source.
const node_crypto_1 = require("node:crypto");
const node_fs_1 = __importDefault(require("node:fs"));
const node_os_1 = __importDefault(require("node:os"));
const node_path_1 = __importDefault(require("node:path"));
const assert_1 = require("../../shared/core/assert");
const brand_1 = require("../../shared/core/brand");
const pageNode_1 = require("../../shared/page/pageNode");
const markdownParser_1 = require("../parse/markdownParser");
const projectionPatch_1 = require("../../shared/engine/projectionPatch");
const record_1 = require("../../shared/core/record");
const result_1 = require("../../shared/core/result");
const snapshot_1 = require("../../shared/page/snapshot");
const sourceProjection_1 = require("../../shared/page/sourceProjection");
const span_1 = require("../../shared/core/span");
const astroParser_1 = require("../parse/astroParser");
const atomicWrite_1 = require("./atomicWrite");
const mainLimits_1 = require("../lib/mainLimits");
const installedPackages_1 = require("../lib/installedPackages");
const atomicDirectory_1 = require("./atomicDirectory");
/** A lock older than this whose owner cannot be asked is abandoned: no save
 * holds its lock for more than one read, one write and one read-back. */
exports.LOCK_STALE_MS = 10_000;
/** Directories whose case sensitivity a probe has settled, kept per process. */
const CASE_PROBES_MAX = 4_096;
class NodeDocumentDisk {
    #held = new Set();
    #caseInsensitive = new Map();
    #reads = 0;
    read(file) {
        let bytes;
        try {
            bytes = (0, mainLimits_1.readSourceBytes)(file);
        }
        catch (error) {
            const code = (0, atomicWrite_1.errorCode)(error) === 'ENOENT' ? 'missing' : 'failed';
            return (0, result_1.err)({ code, message: `Could not read ${file}: ${(0, atomicWrite_1.errorMessage)(error)}` });
        }
        this.#reads += 1;
        (0, assert_1.assert)(Number.isSafeInteger(this.#reads), 'The read stamp stays a safe integer');
        return (0, result_1.ok)({ bytes: (0, span_1.toByteString)(bytes), generation: this.#reads });
    }
    lock(file) {
        const target = (0, atomicWrite_1.writeTargetOf)(file);
        if (!target.ok) {
            return (0, result_1.err)({ code: 'failed', message: target.error.message });
        }
        const installed = refuseInstalled(target.value);
        if (!installed.ok) {
            return installed;
        }
        const directory = (0, atomicDirectory_1.prepareAtomicDirectory)(target.value);
        if (!directory.ok) {
            return (0, result_1.err)({ code: 'failed', message: directory.error.message });
        }
        const location = lockFileOf(target.value);
        if (!location.ok) {
            return location;
        }
        const lockFile = location.value;
        const first = this.#tryLock(file, lockFile);
        if (first.ok || first.error.code === 'failed') {
            return first;
        }
        // Held. Break it only if its owner is provably gone, then try once more.
        if (!this.#breakIfStale(lockFile)) {
            return first;
        }
        return this.#tryLock(file, lockFile);
    }
    unlock(lock) {
        (0, assert_1.assert)(this.#held.has(lock.token), 'Only a lock this disk holds is released');
        this.#held.delete(lock.token);
        const target = (0, atomicWrite_1.writeTargetOf)(lock.path);
        if (!target.ok) {
            return (0, result_1.err)({ code: 'failed', message: target.error.message });
        }
        const location = lockFileOf(target.value);
        if (!location.ok) {
            return location;
        }
        const lockFile = location.value;
        const owner = readLockOwner(lockFile);
        if (owner?.token !== lock.token) {
            return (0, result_1.err)({ code: 'failed', message: `The lock on ${lock.path} was taken over` });
        }
        try {
            node_fs_1.default.rmSync(lockFile);
        }
        catch (error) {
            return (0, result_1.err)({ code: 'failed', message: (0, atomicWrite_1.errorMessage)(error) });
        }
        return (0, result_1.ok)(undefined);
    }
    replace(file, bytes) {
        // Checked again under the lock: a folder can become a link in between.
        const installed = refuseInstalled(file);
        if (!installed.ok) {
            return installed;
        }
        const replaced = (0, atomicWrite_1.replaceFileAtomic)(file, bytes);
        if (replaced.ok) {
            return replaced;
        }
        return (0, result_1.err)(replaceError(replaced.error));
    }
    /** Create a new document; never overwrites (atomicWrite.ts). Creation is not
     * an intent — there are no authored bytes to witness — so the host calls it
     * directly and the actor adopts the file on its next read. */
    create(file, bytes) {
        const installed = refuseInstalled(file);
        if (!installed.ok) {
            return installed;
        }
        const created = (0, atomicWrite_1.createFileExclusive)(file, bytes);
        if (created.ok) {
            return created;
        }
        const code = created.error.code === 'exists' ? 'exists' : 'failed';
        return (0, result_1.err)({ code, message: created.error.message });
    }
    /** The actor's path and identity key for `file` (see header). */
    canonical(file) {
        // Check the authored path before canonicalization loses a workspace package link.
        const installed = refuseInstalled(file);
        if (!installed.ok) {
            return (0, result_1.err)(installed.error.message);
        }
        const target = (0, atomicWrite_1.writeTargetOf)(file);
        if (!target.ok) {
            return (0, result_1.err)(target.error.message);
        }
        const name = node_path_1.default.basename(target.value);
        let directory;
        let identity;
        try {
            directory = node_fs_1.default.realpathSync.native(node_path_1.default.dirname(target.value));
            identity = node_fs_1.default.statSync(directory);
        }
        catch (error) {
            return (0, result_1.err)(`The folder of ${file} is not available: ${(0, atomicWrite_1.errorMessage)(error)}`);
        }
        const directoryKey = `${identity.dev}:${identity.ino}`;
        const folded = this.#caseInsensitiveAt(directoryKey, node_path_1.default.join(directory, name));
        const key = `${directoryKey}/${folded ? foldCase(name) : name}`;
        return (0, result_1.ok)({ path: (0, brand_1.toFilePath)(node_path_1.default.join(directory, name)), key });
    }
    #tryLock(file, lockFile) {
        const token = (0, node_crypto_1.randomUUID)();
        const owner = JSON.stringify({ pid: process.pid, host: node_os_1.default.hostname(), token });
        let descriptor;
        try {
            descriptor = node_fs_1.default.openSync(lockFile, 'wx', 0o644);
            node_fs_1.default.writeFileSync(descriptor, owner);
        }
        catch (error) {
            if ((0, atomicWrite_1.errorCode)(error) === 'EEXIST') {
                return (0, result_1.err)({ code: 'held', message: `${file} is being saved by another program` });
            }
            return (0, result_1.err)({ code: 'failed', message: `Could not lock ${file}: ${(0, atomicWrite_1.errorMessage)(error)}` });
        }
        finally {
            if (descriptor !== undefined) {
                node_fs_1.default.closeSync(descriptor);
            }
        }
        this.#held.add(token);
        return (0, result_1.ok)({ path: file, token });
    }
    // Move a stale lock aside under a unique name, and delete it only if it is
    // still the stale one: another process may have broken it and locked since,
    // and that fresh lock goes back where it was.
    #breakIfStale(lockFile) {
        const owner = readLockOwner(lockFile);
        if (!this.#stale(lockFile, owner)) {
            return false;
        }
        const aside = node_path_1.default.join(node_path_1.default.dirname(lockFile), `${atomicWrite_1.LOCK_PREFIX}broken-${(0, node_crypto_1.randomUUID)()}${atomicWrite_1.LOCK_SUFFIX}`);
        try {
            node_fs_1.default.renameSync(lockFile, aside);
        }
        catch (error) {
            return (0, atomicWrite_1.errorCode)(error) === 'ENOENT'; // Somebody else broke it first.
        }
        const moved = readLockOwner(aside);
        if (moved?.token !== owner?.token) {
            try {
                node_fs_1.default.linkSync(aside, lockFile); // Put the live lock back, unless one exists.
            }
            catch {
                /* A newer lock is in place, or links are unsupported: theirs stands. */
            }
            node_fs_1.default.rmSync(aside, { force: true });
            return false;
        }
        node_fs_1.default.rmSync(aside, { force: true });
        return true;
    }
    // Stale: leaked by this process, owned by a process that is gone, or older
    // than any save takes — which also covers another host, an unreadable lock
    // and a crashed owner whose process id was reused.
    #stale(lockFile, owner) {
        if (owner !== undefined) {
            if (owner.host === node_os_1.default.hostname()) {
                if (owner.pid === process.pid) {
                    return !this.#held.has(owner.token);
                }
                if (!processAlive(owner.pid)) {
                    return true;
                }
            }
        }
        try {
            return Date.now() - node_fs_1.default.statSync(lockFile).mtimeMs > exports.LOCK_STALE_MS;
        }
        catch {
            // A failed observation is not proof of abandonment. The previous lock
            // can disappear and a fresh writer can acquire the same pathname before
            // recovery renames it, opening a gap where a second writer could enter.
            return false;
        }
    }
    #caseInsensitiveAt(directoryKey, file) {
        const probed = probeCaseInsensitive(file);
        if (probed !== undefined) {
            if (this.#caseInsensitive.size < CASE_PROBES_MAX) {
                this.#caseInsensitive.set(directoryKey, probed);
            }
            return probed;
        }
        return this.#caseInsensitive.get(directoryKey) ?? platformCaseInsensitive();
    }
}
exports.NodeDocumentDisk = NodeDocumentDisk;
// --- Projection ------------------------------------------------------------------
/** Bytes → projection, through the real parser (plan §2 layer 1). `.astro`
 * pages get a page projection, and so — since step 10 — do Markdown and MDX
 * pages, through the Markdown parser; every other document — a chunk, a
 * stylesheet — is opaque (plan §6). Invalid UTF-8 is a parse-error
 * projection, never a lossy decode (plan §3.2). */
function projectDocument(file, bytes) {
    const decoded = (0, span_1.decodeUtf8)(bytes);
    if (!decoded.ok) {
        const diagnostic = { message: decoded.error.message, near: undefined };
        return { tag: 'parse-error', byteLength: bytes.length, diagnostics: [diagnostic] };
    }
    const text = decoded.value;
    const projection = projectText(file, text);
    (0, assert_1.assert)(projection.byteLength === bytes.length, 'The projection measures the bytes it read');
    return projection;
}
function projectText(file, text) {
    if (/\.astro$/i.test(file)) {
        return (0, sourceProjection_1.projectPage)(text, (0, pageNode_1.parsePageResult)((0, astroParser_1.parsePage)(text, { locs: true })));
    }
    if (/\.mdx?$/i.test(file)) {
        const mdx = /\.mdx$/i.test(file);
        return (0, sourceProjection_1.projectPage)(text, (0, pageNode_1.parsePageResult)((0, markdownParser_1.parseMarkdownPage)(text, { mdx })));
    }
    return (0, sourceProjection_1.projectOpaqueDocument)(text);
}
const hashBytes = (bytes) => (0, atomicWrite_1.digestOf)(bytes);
/** The actor's projector in the app. Snapshots derive their projection when
 * first read (shared/page/snapshot.ts, createLazySnapshot), so a save that only
 * replaces the whole file parses nothing it does not use. A single value
 * splice derives its candidate from the base projection
 * (shared/engine/projectionPatch.ts); the simulator holds that patch to a full
 * reparse on every candidate (plan §10). */
exports.NODE_PROJECTOR = {
    hash: hashBytes,
    snapshot: (file, bytes) => (0, snapshot_1.createLazySnapshot)({ path: file, bytes }, (own) => projectDocument(file, own), hashBytes),
    candidate: (file, base, plan, bytes) => {
        const [splice, ...others] = plan.splices;
        if (splice !== undefined && others.length === 0) {
            if (plan.candidate === 'must-parse') {
                const patched = (0, projectionPatch_1.projectValueSplice)(base.projection, base.bytes, splice);
                if (patched !== undefined) {
                    return (0, snapshot_1.createSnapshot)({ path: file, bytes, projection: patched }, hashBytes);
                }
            }
        }
        return (0, snapshot_1.createLazySnapshot)({ path: file, bytes }, (own) => projectDocument(file, own), hashBytes);
    },
};
/** Directory identity and a folded filename distinguish equal basenames while
 * making aliases of the same target contend for one lock in shared staging. */
function lockFileOf(target) {
    try {
        const directory = node_fs_1.default.statSync(node_path_1.default.dirname(target));
        const identity = `${directory.dev}:${directory.ino}/${foldCase(node_path_1.default.basename(target))}`;
        const name = (0, atomicWrite_1.digestOf)(identity);
        return (0, result_1.ok)(node_path_1.default.join((0, atomicDirectory_1.atomicDirectoryOf)(target), `${atomicWrite_1.LOCK_PREFIX}${name}${atomicWrite_1.LOCK_SUFFIX}`));
    }
    catch (error) {
        return (0, result_1.err)({ code: 'failed', message: `Could not locate lock: ${(0, atomicWrite_1.errorMessage)(error)}` });
    }
}
// A lock file is written by another process: parse it, never trust it. Its
// size is checked before the read, so a huge foreign file is never loaded, and
// its text after, since the file can grow in between.
function readLockOwner(lockFile) {
    let raw;
    try {
        if (node_fs_1.default.statSync(lockFile).size > exports.LOCK_OWNER_CHARS_MAX) {
            return undefined;
        }
        raw = node_fs_1.default.readFileSync(lockFile, 'utf8');
    }
    catch {
        return undefined;
    }
    if (raw.length > exports.LOCK_OWNER_CHARS_MAX) {
        return undefined;
    }
    let input;
    try {
        const parsed = JSON.parse(raw);
        input = parsed;
    }
    catch {
        return undefined;
    }
    const record = (0, record_1.toRecord)(input);
    if (record === undefined) {
        return undefined;
    }
    const pid = record['pid'];
    const host = record['host'];
    const token = record['token'];
    if (typeof pid === 'number' && Number.isSafeInteger(pid)) {
        if (typeof host === 'string' && typeof token === 'string') {
            return { pid, host, token };
        }
    }
    return undefined;
}
exports.LOCK_OWNER_CHARS_MAX = 1_024;
function processAlive(pid) {
    try {
        process.kill(pid, 0);
        return true;
    }
    catch (error) {
        return (0, atomicWrite_1.errorCode)(error) === 'EPERM'; // It exists; it belongs to another user.
    }
}
/** Whether the directory holding `file` ignores case, when `file` can tell. */
function probeCaseInsensitive(file) {
    const name = node_path_1.default.basename(file);
    const swapped = swapCase(name);
    if (swapped === name) {
        return undefined; // No letters: the name has no other spelling.
    }
    let original;
    try {
        original = node_fs_1.default.statSync(file);
    }
    catch {
        return undefined; // Missing: nothing to compare with.
    }
    try {
        const other = node_fs_1.default.statSync(node_path_1.default.join(node_path_1.default.dirname(file), swapped));
        if (other.dev === original.dev) {
            return other.ino === original.ino;
        }
        return false;
    }
    catch {
        return false;
    }
}
// macOS and Windows format case-insensitive by default; everything else here
// is case-sensitive unless a probe in the directory says otherwise.
function platformCaseInsensitive() {
    if (process.platform === 'darwin') {
        return true;
    }
    return process.platform === 'win32';
}
function foldCase(name) {
    return name.toLocaleLowerCase('en-US');
}
function swapCase(name) {
    return [...name]
        .map((character) => {
        const lower = character.toLocaleLowerCase('en-US');
        return lower === character ? character.toLocaleUpperCase('en-US') : lower;
    })
        .join('');
}
/** Refuse a write that would land inside node_modules (see header). */
function refuseInstalled(file) {
    const landing = landingOf(file);
    (0, assert_1.assert)(node_path_1.default.isAbsolute(landing), 'A landing path is absolute');
    if ((0, installedPackages_1.isInstalledFile)(file) || (0, installedPackages_1.isInstalledFile)(landing)) {
        const owner = (0, installedPackages_1.packageOf)(landing);
        const what = owner === undefined ? 'is inside node_modules' : `belongs to the installed package ${owner}`;
        return (0, result_1.err)({
            code: 'failed',
            message: `${node_path_1.default.basename(landing)} ${what}, so Stacki will not save it: the next install ` +
                `would replace the change, and the package may be shared with other projects. ` +
                `Edit the package's own source instead.`,
        });
    }
    return (0, result_1.ok)(undefined);
}
// Where a write to `file` lands: its link followed (atomicWrite.ts), then its
// folder's links. A dangling link or a missing folder keeps the path as
// given; the write itself reports those.
function landingOf(file) {
    const target = (0, atomicWrite_1.writeTargetOf)(file);
    const resolved = target.ok ? target.value : node_path_1.default.resolve(file);
    try {
        return node_path_1.default.join(node_fs_1.default.realpathSync.native(node_path_1.default.dirname(resolved)), node_path_1.default.basename(resolved));
    }
    catch {
        return resolved;
    }
}
function replaceError(error) {
    switch (error.code) {
        case 'filesystem':
        case 'exists':
            return { code: 'failed', message: error.message };
        case 'not-durable':
            return { code: 'not-durable', message: error.message };
        default: {
            const exhaustive = error;
            return exhaustive;
        }
    }
}
