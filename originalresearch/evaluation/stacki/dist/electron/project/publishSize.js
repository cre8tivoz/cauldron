"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PUBLISH_GIT_LIMITS = void 0;
exports.checkPublishWorkingSize = checkPublishWorkingSize;
exports.checkPublishTreeSize = checkPublishTreeSize;
exports.parsePublishTreeEntry = parsePublishTreeEntry;
const nodeTools_1 = require("../lib/nodeTools");
const promises_1 = require("node:fs/promises");
const node_path_1 = __importDefault(require("node:path"));
const result_1 = require("../../shared/core/result");
const publishConfig_1 = require("../../shared/properties/publishConfig");
const publishRecords_1 = require("./publishRecords");
const publishGitCommand_1 = require("./publishGitCommand");
// Git can hash a larger source without duplicating it. These are inspection, not checkout, budgets.
exports.PUBLISH_GIT_LIMITS = { filesMax: 100_000, bytesMax: 8 * 1024 * 1024 * 1024 };
async function checkPublishWorkingSize(root, index, purpose) {
    (0, nodeTools_1.ensureToolPath)();
    let files = 0;
    let bytes = 0;
    return (0, publishRecords_1.readPublishRecords)(root, ['ls-files', '--cached', '--others', '--exclude-standard', '--deduplicate', '-z'], { ...process.env, GIT_INDEX_FILE: index }, async (file) => {
        const parsed = parsePublishPath(file);
        if (!parsed.ok) {
            return parsed;
        }
        const stats = await (0, promises_1.lstat)(node_path_1.default.join(root, file)).then(result_1.ok, (error) => {
            if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
                return (0, result_1.ok)(undefined);
            }
            return (0, publishGitCommand_1.publishFilesystemFailure)(error);
        });
        if (!stats.ok) {
            return stats;
        }
        // Deleted tracked paths still appear in the old index but will not enter the new tree.
        if (stats.value === undefined) {
            return (0, result_1.ok)(undefined);
        }
        files += 1;
        bytes += stats.value.size;
        return checkPublishSize(files, bytes, purpose);
    });
}
/** Measure the captured blobs: working-file sizes can change and clean filters can expand them. */
async function checkPublishTreeSize(root, tree, purpose) {
    (0, nodeTools_1.ensureToolPath)();
    let files = 0;
    let bytes = 0;
    return (0, publishRecords_1.readPublishRecords)(root, ['ls-tree', '-r', '-l', '-z', tree], process.env, (record) => {
        const entry = parsePublishTreeEntry(record);
        if (!entry.ok) {
            return Promise.resolve(entry);
        }
        files += 1;
        bytes += entry.value;
        return Promise.resolve(checkPublishSize(files, bytes, purpose));
    });
}
function parsePublishTreeEntry(record) {
    const match = /^(?:100644|100755|120000) blob (?:[a-f0-9]{40}|[a-f0-9]{64}) +([0-9]+)\t([\s\S]+)$/.exec(record);
    if (match?.[1] === undefined || match[2] === undefined) {
        return (0, result_1.err)({ code: 'git-output', message: 'Unsupported or malformed Git tree entry.' });
    }
    const file = parsePublishPath(match[2]);
    if (!file.ok) {
        return file;
    }
    const size = Number(match[1]);
    if (!Number.isSafeInteger(size) || size < 0) {
        return (0, result_1.err)({ code: 'git-output', message: 'Git returned an invalid file size.' });
    }
    return (0, result_1.ok)(size);
}
function parsePublishPath(file) {
    if (node_path_1.default.isAbsolute(file) || file.split('/').some((part) => part === '..' || part === '')) {
        return (0, result_1.err)({ code: 'git-output', message: 'Git returned a path outside the project.' });
    }
    return (0, result_1.ok)(file);
}
function checkPublishSize(files, bytes, purpose) {
    if (purpose === 'hosting') {
        if (files > publishConfig_1.PUBLISH_LIMITS.filesMax) {
            return (0, result_1.err)({
                code: 'snapshot-limit',
                message: 'Publish exceeds the 10,000-file snapshot limit.',
            });
        }
        if (bytes > publishConfig_1.PUBLISH_LIMITS.snapshotBytesMax) {
            return (0, result_1.err)({
                code: 'snapshot-limit',
                message: 'Publish exceeds the 256 MiB snapshot limit.',
            });
        }
    }
    else {
        if (files > exports.PUBLISH_GIT_LIMITS.filesMax) {
            return (0, result_1.err)({ code: 'git-limit', message: 'Git inspection exceeds the 100,000-file limit.' });
        }
        if (bytes > exports.PUBLISH_GIT_LIMITS.bytesMax) {
            return (0, result_1.err)({ code: 'git-limit', message: 'Git inspection exceeds the 8 GiB source limit.' });
        }
    }
    return (0, result_1.ok)(undefined);
}
