"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.submitPublishReview = submitPublishReview;
// Capture a review commit without staging, committing, or switching the user's branch.
// The branch name identifies its exact parent and tree, making retries idempotent.
const nodeTools_1 = require("../lib/nodeTools");
const result_1 = require("../../shared/core/result");
const publishReview_1 = require("../../shared/properties/publishReview");
const publishGitCommand_1 = require("./publishGitCommand");
const publishReviewRequest_1 = require("./publishReviewRequest");
async function submitPublishReview(root, source, repository, transport = fetch) {
    const match = /^(?:https:\/\/github\.com\/|git@github\.com:)([\w.-]+\/[\w.-]+?)(?:\.git)?$/.exec(repository.remote);
    const name = match?.[1];
    if (!name) {
        return (0, result_1.err)({ code: 'review', message: 'Reviews require a GitHub repository.' });
    }
    const parent = await reviewBase(root, source, repository);
    if (!parent.ok) {
        return parent;
    }
    const branch = (0, publishReview_1.reviewBranch)(parent.value, source.tree);
    const commit = await reviewCommit(root, source.tree, parent.value, branch, repository);
    if (!commit.ok) {
        return commit;
    }
    const credential = await reviewCredential(root, repository.environment);
    if (!credential.ok) {
        return credential;
    }
    return (0, publishReviewRequest_1.openPublishReview)({
        repository: name,
        token: credential.value,
        base: repository.branch,
        branch,
        sha: commit.value,
    }, transport);
}
async function reviewBase(root, source, repository) {
    const options = { env: repository.environment, timeout: 120000 };
    const advertised = await (0, publishGitCommand_1.runPublishGit)(root, ['ls-remote', '--refs', repository.remote, 'refs/heads/' + repository.branch], options);
    if (!advertised.ok) {
        return advertised;
    }
    const parent = (0, publishGitCommand_1.parsePublishObject)(advertised.value.split('\t')[0] ?? '');
    if (!parent.ok) {
        return (0, result_1.err)({
            code: 'review-base',
            message: 'Push an initial base branch before opening a review.',
        });
    }
    const fetched = await (0, publishGitCommand_1.runPublishGit)(root, ['fetch', '--no-tags', '--no-write-fetch-head', repository.remote, parent.value], options);
    if (!fetched.ok) {
        return fetched;
    }
    if (source.head === undefined) {
        return (0, result_1.err)({ code: 'review-base', message: 'Reviews require a committed local base.' });
    }
    const ancestor = await (0, publishGitCommand_1.runPublishGit)(root, ['merge-base', '--is-ancestor', parent.value, source.head]);
    if (!ancestor.ok) {
        return (0, result_1.err)({
            code: 'review-base',
            message: 'Pull the latest base branch before submitting a review.',
        });
    }
    const original = await (0, publishGitCommand_1.runPublishGit)(root, ['rev-parse', parent.value + '^{tree}']);
    if (!original.ok) {
        return original;
    }
    if (original.value.trim() === source.tree) {
        return (0, result_1.err)({ code: 'review-empty', message: 'There are no changes to submit for review.' });
    }
    return parent;
}
async function reviewCommit(root, tree, parent, branch, repository) {
    const options = { env: repository.environment, timeout: 120000 };
    const existing = await (0, publishGitCommand_1.runPublishGit)(root, ['ls-remote', '--refs', repository.remote, 'refs/heads/' + branch], options);
    if (!existing.ok) {
        return existing;
    }
    if (existing.value.trim() !== '') {
        const commit = (0, publishGitCommand_1.parsePublishObject)(existing.value.split('\t')[0] ?? '');
        if (!commit.ok) {
            return commit;
        }
        const fetched = await (0, publishGitCommand_1.runPublishGit)(root, ['fetch', '--no-tags', '--no-write-fetch-head', repository.remote, commit.value], options);
        if (!fetched.ok) {
            return fetched;
        }
        const identity = await (0, publishGitCommand_1.runPublishGit)(root, ['show', '--no-patch', '--format=%T %P', commit.value]);
        if (!identity.ok) {
            return identity;
        }
        return identity.value.trim() === `${tree} ${parent}`
            ? commit
            : (0, result_1.err)({
                code: 'review-changed',
                message: 'The review branch was changed externally. Review it on GitHub before retrying.',
            });
    }
    const created = await (0, publishGitCommand_1.runPublishGit)(root, ['commit-tree', tree, '-p', parent, '-m', 'Submit website changes for review']);
    if (!created.ok) {
        return created;
    }
    const commit = (0, publishGitCommand_1.parsePublishObject)(created.value.trim());
    if (!commit.ok) {
        return commit;
    }
    const pushed = await (0, publishGitCommand_1.runPublishGit)(root, ['push', repository.remote, `${commit.value}:refs/heads/${branch}`], options);
    return pushed.ok ? commit : pushed;
}
async function reviewCredential(root, environment) {
    const configured = environment['GH_TOKEN'];
    if (configured !== undefined) {
        return /^[\w-]{10,512}$/.test(configured) ? (0, result_1.ok)(configured) : (0, result_1.err)({ code: 'review-auth', message: 'Invalid GitHub review credential.' });
    }
    const response = await (0, nodeTools_1.run)('gh', ['auth', 'token', '--hostname', 'github.com'], root, {
        env: environment,
        timeout: 30000,
    }).then(result_1.ok, publishGitCommand_1.publishFilesystemFailure);
    if (!response.ok) {
        return response;
    }
    const token = environment['GH_TOKEN'] ?? response.value.stdout.trim();
    return /^[\w-]{10,512}$/.test(token) ? (0, result_1.ok)(token) : (0, result_1.err)({ code: 'review-auth', message: 'Sign in to GitHub before opening a review.' });
}
