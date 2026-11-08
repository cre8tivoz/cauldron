"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.readPublishTree = readPublishTree;
exports.createPublishSource = createPublishSource;
exports.createPublishSnapshot = createPublishSnapshot;
exports.publishTree = publishTree;
const promises_1 = require("node:fs/promises");
const node_os_1 = require("node:os");
const node_path_1 = __importDefault(require("node:path"));
const result_1 = require("../../shared/core/result");
const publishSize_1 = require("./publishSize");
const publishGitCommand_1 = require("./publishGitCommand");
async function readPublishTree(root) {
    const source = await createPublishSource(root, 'github');
    if (!source.ok) {
        return source;
    }
    const cleanup = await (0, promises_1.rm)(source.value.temporary, { recursive: true, force: true }).then(result_1.ok, publishGitCommand_1.publishFilesystemFailure);
    return cleanup.ok ? (0, result_1.ok)(source.value.tree) : cleanup;
}
async function createPublishSource(root, purpose) {
    const temporary = await (0, promises_1.mkdtemp)(node_path_1.default.join((0, node_os_1.tmpdir)(), 'stacki-publish-')).then(result_1.ok, publishGitCommand_1.publishFilesystemFailure);
    if (!temporary.ok) {
        return temporary;
    }
    // Ownership transfers only on success; failures, including assertions, still clean up the index.
    let retained = false;
    let result;
    let cleanup = (0, result_1.ok)(undefined);
    try {
        result = await capturePublishSource(root, temporary.value, purpose);
        retained = result.ok;
    }
    finally {
        if (!retained) {
            cleanup = await (0, promises_1.rm)(temporary.value, { recursive: true, force: true }).then(result_1.ok, publishGitCommand_1.publishFilesystemFailure);
        }
    }
    return cleanup.ok ? result : cleanup;
}
async function createPublishSnapshot(root) {
    const source = await createPublishSource(root, 'hosting');
    if (!source.ok) {
        return source;
    }
    let retained = false;
    let result;
    let cleanup = (0, result_1.ok)(undefined);
    try {
        result = await materializePublishSource(root, source.value);
        retained = result.ok;
    }
    finally {
        if (!retained) {
            cleanup = await (0, promises_1.rm)(source.value.temporary, { recursive: true, force: true }).then(result_1.ok, publishGitCommand_1.publishFilesystemFailure);
        }
    }
    return cleanup.ok ? result : cleanup;
}
async function publishTree(root, index) {
    const options = { env: { ...process.env, GIT_INDEX_FILE: index }, timeout: 600_000 };
    // A private index captures tracked and unignored files without disturbing staged changes.
    const staged = await (0, publishGitCommand_1.runPublishGit)(root, ['add', '--all', '--', '.'], options);
    if (!staged.ok) {
        return staged;
    }
    const tree = await (0, publishGitCommand_1.runPublishGit)(root, ['write-tree'], options);
    return tree.ok ? (0, publishGitCommand_1.parsePublishObject)(tree.value.trim()) : tree;
}
async function capturePublishSource(root, temporary, purpose) {
    const index = node_path_1.default.join(temporary, 'index');
    const head = await (0, publishGitCommand_1.readPublishHead)(root);
    if (!head.ok) {
        return head;
    }
    const initialized = await (0, publishGitCommand_1.runPublishGit)(root, ['read-tree', head.value ?? '--empty'], {
        env: { ...process.env, GIT_INDEX_FILE: index },
    });
    if (!initialized.ok) {
        return initialized;
    }
    const working = await (0, publishSize_1.checkPublishWorkingSize)(root, index, purpose);
    if (!working.ok) {
        return working;
    }
    const tree = await publishTree(root, index);
    if (!tree.ok) {
        return tree;
    }
    const captured = await (0, publishSize_1.checkPublishTreeSize)(root, tree.value, purpose);
    return captured.ok ? (0, result_1.ok)({ tree: tree.value, head: head.value, index, temporary }) : captured;
}
async function materializePublishSource(root, source) {
    const snapshot = node_path_1.default.join(source.temporary, 'site');
    const directory = await (0, promises_1.mkdir)(snapshot).then(result_1.ok, publishGitCommand_1.publishFilesystemFailure);
    if (!directory.ok) {
        return directory;
    }
    const checkout = await (0, publishGitCommand_1.runPublishGit)(root, ['checkout-index', '--all', `--prefix=${snapshot}${node_path_1.default.sep}`], {
        env: { ...process.env, GIT_INDEX_FILE: source.index },
    });
    if (!checkout.ok) {
        return checkout;
    }
    const dependencies = await (0, promises_1.realpath)(node_path_1.default.join(root, 'node_modules')).then(result_1.ok, publishGitCommand_1.publishFilesystemFailure);
    if (!dependencies.ok) {
        return dependencies;
    }
    const linked = await (0, promises_1.symlink)(dependencies.value, node_path_1.default.join(snapshot, 'node_modules'), process.platform === 'win32' ? 'junction' : 'dir').then(result_1.ok, publishGitCommand_1.publishFilesystemFailure);
    return linked.ok ? (0, result_1.ok)({ ...source, root: snapshot }) : linked;
}
