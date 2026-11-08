"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PropertyUndoStore = void 0;
exports.inverseBatch = inverseBatch;
exports.revertComponentProperties = revertComponentProperties;
exports.loadComponentProperties = loadComponentProperties;
exports.updateComponentProperties = updateComponentProperties;
const propertyConsumers_1 = require("./propertyConsumers");
// Plan against exact source revisions, then commit as one synchronous batch.
// Failed writes restore earlier files so a rename cannot leave half the site on the old API.
//
// From step 5 the batch runs through the document actors (plan §3.3): their
// actors are leased in sorted canonical-path order, each file is witnessed by
// the checksum of its `before` text, and every write — rollback included — is
// the file's diff from those bytes (a `rewrite-text`, step 10), so an outside
// edit is refused, never overwritten.
const node_crypto_1 = require("node:crypto");
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
const assert_1 = require("../../shared/core/assert");
const limits_1 = require("../../shared/core/limits");
const propertyEditing_1 = require("../../shared/properties/propertyEditing");
const result_1 = require("../../shared/core/result");
const propertyOptions_1 = require("../../shared/properties/propertyOptions");
const platform_1 = require("../lib/platform");
const atomicWrite_1 = require("../documents/atomicWrite");
const propertyDefinitions_1 = require("./propertyDefinitions");
const propertyRename_1 = require("./propertyRename");
/** A batch's inverse (plan §3.3, §11 step 6): each file back from what the
 * batch wrote to what it replaced. Applied as a batch of its own — every file
 * checked against the bytes the batch left before any is written, the checked
 * rollback on a failure — so a file changed since refuses the whole undo,
 * naming it, and a half-undone rename cannot happen. */
function inverseBatch(changes) {
    (0, assert_1.assert)(changes.length <= propertyEditing_1.PROPERTY_LIMITS.filesMax, 'A batch is bounded');
    return changes.map((change) => ({
        file: change.file,
        before: change.after,
        after: change.before,
    }));
}
/** Inverse batches waiting for Undo, kept in main so the renderer holds a
 * token, never a writable batch: the channel that applies one can write only
 * what a property edit wrote. Bounded by LIMITS.undoEntriesMax, oldest first
 * out; an expired token is refused. */
class PropertyUndoStore {
    #batches = new Map();
    record(changes) {
        const token = (0, node_crypto_1.randomUUID)();
        this.#batches.set(token, changes);
        for (const oldest of this.#batches.keys()) {
            if (this.#batches.size <= limits_1.LIMITS.undoEntriesMax) {
                break;
            }
            this.#batches.delete(oldest);
        }
        (0, assert_1.assert)(this.#batches.size <= limits_1.LIMITS.undoEntriesMax, 'Undo batches are bounded');
        return token;
    }
    take(token) {
        const changes = this.#batches.get(token);
        this.#batches.delete(token);
        return changes;
    }
}
exports.PropertyUndoStore = PropertyUndoStore;
/** Apply a recorded inverse batch; the batch undoing it is recorded in turn
 * (Redo), and its token returned. */
function revertComponentProperties(token, store, writer) {
    const changes = store.take(token);
    if (changes === undefined) {
        return (0, result_1.err)({ code: 'expired', message: 'This property change can no longer be undone.' });
    }
    const committed = commitPropertyChanges(changes, writer);
    if (!committed.ok) {
        return committed;
    }
    return (0, result_1.ok)({ undo: store.record(inverseBatch(changes)) });
}
function loadComponentProperties(location) {
    const target = validateLocation(location);
    if (!target.ok) {
        return target;
    }
    const source = (0, propertyConsumers_1.readBoundedSource)(target.value.file);
    if (!source.ok) {
        return source;
    }
    return (0, result_1.ok)((0, propertyDefinitions_1.readComponentProperties)(source.value));
}
function updateComponentProperties(request, writer) {
    const target = validateLocation(request);
    if (!target.ok) {
        return target;
    }
    const source = (0, propertyConsumers_1.readBoundedSource)(target.value.file);
    if (!source.ok) {
        return source;
    }
    if (source.value !== request.source) {
        return (0, result_1.err)({
            code: 'conflict',
            message: 'This component changed on disk. Reload before saving.',
        });
    }
    const changed = (0, propertyDefinitions_1.editPropertyDefinition)(source.value, request.change);
    if (!changed.ok) {
        return changed;
    }
    const plan = planPropertyChanges({ ...request, ...target.value }, changed.value);
    if (!plan.ok) {
        return plan;
    }
    const result = commitPropertyChanges(plan.value, writer);
    if (!result.ok) {
        return result;
    }
    writer.onCommitted?.(plan.value);
    const updated = plan.value.find((entry) => (0, platform_1.sameFilesystemPath)(entry.file, target.value.file));
    (0, assert_1.assert)(updated !== undefined, 'Property transaction includes the component');
    return (0, result_1.ok)((0, propertyDefinitions_1.readComponentProperties)(updated.after));
}
function validateLocation(location) {
    let root;
    let file;
    try {
        root = node_fs_1.default.realpathSync(node_path_1.default.join(location.projectPath, 'src'));
        file = node_fs_1.default.realpathSync(location.file);
    }
    catch (error) {
        return (0, propertyConsumers_1.filesystemError)(error);
    }
    const relative = node_path_1.default.relative(root, file);
    if (relative.startsWith('..') || node_path_1.default.isAbsolute(relative) || !file.endsWith('.astro')) {
        return (0, result_1.err)({
            code: 'path',
            message: 'Select an Astro component inside this project’s src folder.',
        });
    }
    return (0, result_1.ok)({ projectPath: node_path_1.default.dirname(root), file });
}
function planPropertyChanges(request, source) {
    const change = request.change;
    const first = { file: request.file, before: request.source, after: source };
    if (change.kind === 'remove') {
        return planPropertyRemoval(request, first, change.name);
    }
    const propertyRename = propertyRenameForChange(change);
    const optionRenames = change.kind === 'save' ? (change.optionRenames ?? []) : [];
    if (!propertyRename && optionRenames.length === 0) {
        return (0, result_1.ok)([first]);
    }
    if (change.kind !== 'save' || !change.originalName) {
        return (0, result_1.err)({
            code: 'option',
            message: 'Only an existing property can rename options.',
        });
    }
    const valid = validateOptionRenames(request.source, source, change, optionRenames);
    if (!valid.ok) {
        return valid;
    }
    const consumers = (0, propertyConsumers_1.readPropertyConsumers)(request);
    if (!consumers.ok) {
        return consumers;
    }
    const changes = [];
    for (const consumer of consumers.value) {
        const { file, names } = consumer;
        const own = (0, platform_1.sameFilesystemPath)(file, request.file);
        const original = own ? source : consumer.source;
        const owner = own ? 'definition' : 'consumer';
        const changed = planConsumerChange(original, names, change, propertyRename, optionRenames, owner);
        if (!changed.ok) {
            return (0, result_1.err)({
                code: changed.error.code,
                message: `${node_path_1.default.relative(request.projectPath, file)}: ${changed.error.message}`,
            });
        }
        if (own || changed.value !== original) {
            changes.push({
                file,
                before: own ? request.source : original,
                after: changed.value,
            });
        }
    }
    (0, assert_1.assert)(changes.some((entry) => (0, platform_1.sameFilesystemPath)(entry.file, request.file)), 'Rename plan includes the definition');
    return (0, result_1.ok)(changes);
}
function propertyRenameForChange(change) {
    if (change.kind !== 'save' || !change.originalName) {
        return undefined;
    }
    return change.originalName === change.property.name ? undefined : { from: change.originalName, to: change.property.name };
}
function planConsumerChange(source, names, change, propertyRename, optionRenames, owner) {
    const renamed = propertyRename ? (0, propertyRename_1.renameComponentReferences)(source, names, propertyRename, owner) : (0, result_1.ok)(source);
    if (!renamed.ok || optionRenames.length === 0) {
        return renamed;
    }
    return (0, propertyRename_1.renameComponentOptionValues)(renamed.value, names, change.property.name, optionRenames);
}
function validateOptionRenames(beforeSource, afterSource, change, renames) {
    if (renames.length === 0) {
        return (0, result_1.ok)(undefined);
    }
    const before = (0, propertyDefinitions_1.readComponentProperties)(beforeSource).properties.find((property) => property.name === change.originalName);
    const after = (0, propertyDefinitions_1.readComponentProperties)(afterSource).properties.find((property) => property.name === change.property.name);
    const beforeOptions = before ? (0, propertyOptions_1.literalOptions)(before.type) : undefined;
    const afterOptions = after ? (0, propertyOptions_1.literalOptions)(after.type) : undefined;
    if (!beforeOptions || !afterOptions) {
        return (0, result_1.err)({
            code: 'option',
            message: 'Option renames require an editable literal union.',
        });
    }
    for (const rename of renames) {
        if (!beforeOptions.includes(rename.from) || !afterOptions.includes(rename.to)) {
            return (0, result_1.err)({
                code: 'option',
                message: 'An option rename does not match the saved union.',
            });
        }
    }
    return (0, result_1.ok)(undefined);
}
function commitPropertyChanges(changes, writer) {
    (0, assert_1.assert)(changes.length <= propertyEditing_1.PROPERTY_LIMITS.filesMax, 'Property transaction is bounded');
    (0, assert_1.assert)(new Set(changes.map((change) => change.file)).size === changes.length, 'Property transaction writes each file once');
    const leased = writer.documents.withLeases(changes, (ordered) => commitLeased(ordered, writer));
    if (!leased.ok) {
        return (0, result_1.err)({ code: 'filesystem', message: leased.error });
    }
    return leased.value;
}
// Holding every actor of the batch: check all, then write each in order.
function commitLeased(changes, writer) {
    for (const change of changes) {
        const current = writer.documents.current(change.file);
        if (!current.ok) {
            return (0, result_1.err)({ code: 'filesystem', message: current.error.message });
        }
        if (current.value.checksum !== (0, atomicWrite_1.digestOf)(change.before)) {
            return (0, result_1.err)({
                code: 'conflict',
                message: `${change.file} changed during the rename. Try again.`,
            });
        }
    }
    const written = [];
    for (const change of changes) {
        writer.noteWrite(change.file);
        const report = writer.documents.writeText(change.file, change.after, (0, atomicWrite_1.digestOf)(change.before));
        if (report.tag !== 'applied') {
            // An uncertain write may hold the batch's bytes; the rollback's witness
            // restores it only if it does. A refused one was never written.
            const mine = report.tag === 'uncertain' ? [...written, change] : written;
            return rollbackPropertyChanges(mine, failureOf(change.file, report), writer);
        }
        (0, assert_1.assert)(report.checksum === (0, atomicWrite_1.digestOf)(change.after), 'Property write reports the planned bytes');
        written.push(change);
    }
    return (0, result_1.ok)(undefined);
}
function failureOf(file, report) {
    switch (report.tag) {
        case 'rejected':
            switch (report.reason) {
                case 'region-externally-modified':
                    return { code: 'conflict', message: `${file} changed during the rename.` };
                case 'write-race':
                    return {
                        code: 'write-race',
                        message: report.message || `${file} was changed by another writer during the save`,
                    };
                case 'anchor-moved':
                case 'anchor-ambiguous':
                case 'source-invalid':
                case 'unsupported-operation':
                case 'resource-limit':
                case 'write-failed':
                case 'merge-conflict':
                    return { code: 'filesystem', message: report.message || `Could not save ${file}` };
                default: {
                    const exhaustive = report.reason;
                    return exhaustive;
                }
            }
        case 'uncertain':
            return { code: 'filesystem', message: `${file} may not have been saved. ${report.message}` };
        case 'backpressured':
            throw new Error('Assertion failed: a leased actor holds no other intent to push back with');
        default: {
            const exhaustive = report;
            return exhaustive;
        }
    }
}
// Best-effort, not atomic (plan §3.3): each file is restored only while it
// still holds exactly the bytes this batch wrote — the restore is an intent
// witnessed by their checksum. A file somebody changed since is theirs now;
// restoring it would destroy their edit, so it is named instead.
function rollbackPropertyChanges(written, cause, writer) {
    (0, assert_1.assert)(written.length <= propertyEditing_1.PROPERTY_LIMITS.filesMax, 'Rollback is bounded by the batch');
    const failed = [];
    const changed = [];
    for (const change of [...written].reverse()) {
        const restored = restorePropertyFile(change, writer);
        if (restored === 'changed') {
            changed.push(change.file);
        }
        else if (restored === 'failed') {
            failed.push(change.file);
        }
    }
    if (failed.length > 0 || changed.length > 0) {
        const parts = [
            failed.length > 0 ? `recovery failed for: ${failed.join(', ')}` : '',
            changed.length > 0 ? `changed by another program, left as is: ${changed.join(', ')}` : '',
        ].filter((part) => part !== '');
        return (0, result_1.err)({
            code: 'rollback',
            message: `Save failed and ${parts.join('; ')}. ${cause.message}`,
        });
    }
    return (0, result_1.err)({ code: cause.code, message: `Save failed; changes restored. ${cause.message}` });
}
function restorePropertyFile(change, writer) {
    writer.noteWrite(change.file);
    const report = writer.documents.writeText(change.file, change.before, (0, atomicWrite_1.digestOf)(change.after));
    switch (report.tag) {
        case 'applied':
            return 'restored';
        case 'rejected':
            return report.reason === 'region-externally-modified' ? 'changed' : 'failed';
        case 'uncertain':
        case 'backpressured':
            return 'failed';
        default: {
            const exhaustive = report;
            return exhaustive;
        }
    }
}
function planPropertyRemoval(request, change, name) {
    const consumers = (0, propertyConsumers_1.readPropertyConsumers)(request);
    if (!consumers.ok) {
        return consumers;
    }
    for (const consumer of consumers.value) {
        const result = (0, propertyRename_1.renameComponentReferences)(consumer.source, consumer.names, { from: name, to: '_stackiDeletedProperty' }, 'consumer');
        if (!result.ok) {
            return result;
        }
        if (result.value !== consumer.source) {
            return (0, result_1.err)({
                code: 'in-use',
                message: `${consumer.file} still passes ${name}. ` + 'Remove that instance value before deleting the prop.',
            });
        }
    }
    return (0, result_1.ok)([change]);
}
