"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requirePublishMessage = requirePublishMessage;
exports.checkPublishIncoming = checkPublishIncoming;
exports.commitPublishSource = commitPublishSource;
const assert_1 = require("../../shared/core/assert");
const result_1 = require("../../shared/core/result");
const publishSnapshot_1 = require("./publishSnapshot");
const publishSize_1 = require("./publishSize");
const publishGitCommand_1 = require("./publishGitCommand");
async function requirePublishMessage(root, source, message) {
    if (source.head !== undefined) {
        const headTree = await (0, publishGitCommand_1.runPublishGit)(root, ['rev-parse', `${source.head}^{tree}`]);
        if (!headTree.ok) {
            return headTree;
        }
        if (headTree.value.trim() === source.tree) {
            return (0, result_1.ok)(undefined);
        }
    }
    return message === undefined
        ? (0, result_1.err)({
            code: 'message-required',
            message: 'Enter a commit message before publishing changes to GitHub.',
        })
        : (0, result_1.ok)(undefined);
}
/** Fetch objects without moving refs or working files; the existing Pull flow owns merges. */
async function checkPublishIncoming(root, repository, head) {
    const reference = `refs/heads/${repository.branch}`;
    const options = { env: repository.environment, timeout: 120_000 };
    const advertised = await (0, publishGitCommand_1.runPublishGit)(root, ['ls-remote', '--refs', repository.remote, reference], options);
    if (!advertised.ok) {
        return advertised;
    }
    if (advertised.value === '') {
        return (0, result_1.ok)(undefined);
    }
    const [commit, remoteReference] = advertised.value.trim().split('\t');
    if (remoteReference !== reference || commit === undefined) {
        return (0, result_1.err)({ code: 'git-output', message: 'Git returned a different remote branch.' });
    }
    const parsed = (0, publishGitCommand_1.parsePublishObject)(commit);
    if (!parsed.ok) {
        return parsed;
    }
    if (head === undefined) {
        return incomingChanges();
    }
    const fetched = await (0, publishGitCommand_1.runPublishGit)(root, ['fetch', '--no-tags', '--no-write-fetch-head', repository.remote, commit], options);
    if (!fetched.ok) {
        return fetched;
    }
    const ancestor = await (0, publishGitCommand_1.runPublishGit)(root, ['merge-base', '--is-ancestor', commit, head]);
    if (ancestor.ok) {
        return (0, result_1.ok)(undefined);
    }
    return ancestor.error.exitCode === 1 ? incomingChanges() : ancestor;
}
async function commitPublishSource(root, source, branch, message) {
    (0, assert_1.assert)((0, publishGitCommand_1.parsePublishObject)(source.tree).ok, 'Publish source carries a valid tree');
    (0, assert_1.assert)(branch.length > 0, 'Publish commits belong to a named branch');
    const stable = await checkPublishIdentity(root, source, branch);
    if (!stable.ok) {
        return stable;
    }
    const bounded = await (0, publishSize_1.checkPublishWorkingSize)(root, source.index, 'github');
    if (!bounded.ok) {
        return bounded;
    }
    const current = await (0, publishSnapshot_1.publishTree)(root, source.index);
    if (!current.ok) {
        return current;
    }
    if (current.value !== source.tree) {
        return changedProject();
    }
    const staged = await (0, publishGitCommand_1.runPublishGit)(root, ['add', '--all', '--', '.'], { timeout: 600_000 });
    if (!staged.ok) {
        return staged;
    }
    const stagedTree = await (0, publishGitCommand_1.runPublishGit)(root, ['write-tree']);
    if (!stagedTree.ok) {
        return stagedTree;
    }
    if (stagedTree.value.trim() !== source.tree) {
        return changedProject();
    }
    const identity = await checkPublishIdentity(root, source, branch);
    if (!identity.ok) {
        return identity;
    }
    const committed = await commitPublishChanges(root, source, message);
    if (!committed.ok) {
        return committed;
    }
    return verifyPublishCommit(root, source.tree, branch);
}
async function commitPublishChanges(root, source, message) {
    if (source.head !== undefined) {
        const headTree = await (0, publishGitCommand_1.runPublishGit)(root, ['rev-parse', `${source.head}^{tree}`]);
        if (!headTree.ok) {
            return headTree;
        }
        if (headTree.value.trim() === source.tree) {
            return (0, result_1.ok)(undefined);
        }
    }
    // The message is required before staging; reaching this branch without it is a caller defect.
    (0, assert_1.assert)(message !== undefined, 'Changed publish source has a commit message');
    (0, assert_1.assert)(message.length > 0, 'Publish commit message is nonempty');
    const result = await (0, publishGitCommand_1.runPublishGit)(root, ['commit', '--quiet', '--message', message]);
    return result.ok ? (0, result_1.ok)(undefined) : result;
}
async function checkPublishIdentity(root, source, branch) {
    const currentBranch = await (0, publishGitCommand_1.runPublishGit)(root, ['symbolic-ref', '--short', 'HEAD']);
    if (!currentBranch.ok) {
        return currentBranch;
    }
    if (currentBranch.value.trim() !== branch) {
        return changedProject();
    }
    const head = await (0, publishGitCommand_1.readPublishHead)(root);
    if (!head.ok) {
        return head;
    }
    return head.value === source.head ? (0, result_1.ok)(undefined) : changedProject();
}
async function verifyPublishCommit(root, tree, branch) {
    const head = await (0, publishGitCommand_1.readPublishHead)(root);
    if (!head.ok) {
        return head;
    }
    if (head.value === undefined) {
        return changedProject();
    }
    const identity = await (0, publishGitCommand_1.runPublishGit)(root, ['symbolic-ref', '--short', 'HEAD']);
    if (!identity.ok) {
        return identity;
    }
    if (identity.value.trim() !== branch) {
        return changedProject();
    }
    const committedTree = await (0, publishGitCommand_1.runPublishGit)(root, ['rev-parse', `${head.value}^{tree}`]);
    if (!committedTree.ok) {
        return committedTree;
    }
    return committedTree.value.trim() === tree
        ? (0, result_1.ok)(head.value)
        : (0, result_1.err)({
            code: 'commit-changed',
            message: 'Commit hooks changed the publish source. Review it and publish again.',
        });
}
function changedProject() {
    return (0, result_1.err)({
        code: 'source-changed',
        message: 'Project or branch changed while publishing. Publish again to include the latest edits.',
    });
}
function incomingChanges() {
    return (0, result_1.err)({
        code: 'incoming',
        message: 'GitHub has incoming changes. Use Pull from GitHub in the branch menu, then publish again.',
    });
}
