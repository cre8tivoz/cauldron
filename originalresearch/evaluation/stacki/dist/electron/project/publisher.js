"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DesktopPublisher = void 0;
const promises_1 = require("node:fs/promises");
const publishReview_1 = require("./publishReview");
const assert_1 = require("../../shared/core/assert");
const result_1 = require("../../shared/core/result");
const publishConfig_1 = require("./publishConfig");
const nodeTools_1 = require("../lib/nodeTools");
const publishConfig_2 = require("../../shared/properties/publishConfig");
const publishState_1 = require("../../shared/properties/publishState");
const publishCommands_1 = require("./publishCommands");
const publishSnapshot_1 = require("./publishSnapshot");
const publishGitHub_1 = require("./publishGitHub");
const publishReceipt_1 = require("./publishReceipt");
const publishGitCommand_1 = require("./publishGitCommand");
const publishCommit_1 = require("./publishCommit");
// One job per desktop process bounds concurrency and prevents overlapping commits and pushes.
class DesktopPublisher {
    project = '';
    current = { kind: 'idle' };
    state(root) {
        return this.project === root ? this.current : { kind: 'idle' };
    }
    start(root, target, commitMessage) {
        if (this.current.kind === 'running') {
            if (this.project === root) {
                return this.current;
            }
            throw new Error('Another project is publishing. Wait for it to finish.');
        }
        const message = commitMessage === undefined ? undefined : (0, publishConfig_2.parsePublishCommitMessage)(commitMessage);
        this.project = root;
        this.current = { kind: 'running', step: 'Preparing publish…' };
        void this.publish(root, target, message);
        return this.current;
    }
    async publish(root, target, message) {
        (0, nodeTools_1.ensureToolPath)();
        const prepared = await preparePublishJob(root, target, message);
        if (!prepared.ok) {
            this.fail(prepared.error.message, { github: false, hosting: false });
            return;
        }
        const job = prepared.value;
        const captured = job.plan.kind === 'github' ? await (0, publishSnapshot_1.createPublishSource)(job.root, 'github') : await (0, publishSnapshot_1.createPublishSnapshot)(job.root);
        if (!captured.ok) {
            this.fail(captured.error.message, { github: false, hosting: false });
            return;
        }
        try {
            if (job.config.githubWorkflow?.kind === 'pull-request') {
                (0, assert_1.assert)(job.plan.repository !== undefined, 'Review submission has a repository');
                const review = await (0, publishReview_1.submitPublishReview)(job.root, captured.value, job.plan.repository);
                if (review.ok) {
                    this.current = { kind: 'review-open', ...review.value };
                }
                else {
                    this.fail(review.error.message, { github: false, hosting: false });
                }
                return;
            }
            if (job.plan.kind === 'github') {
                const pushed = await this.push(job, captured.value, job.plan.repository);
                if (!pushed.ok) {
                    this.fail(pushed.error.message, { github: false, hosting: false });
                }
                else if (pushed.value.warning !== undefined) {
                    this.fail(pushed.value.warning, { github: true, hosting: false });
                }
                else {
                    this.current = { kind: 'done', github: true, hosting: false };
                }
            }
            else {
                (0, assert_1.assert)('root' in captured.value, 'Hosting owns a materialized snapshot');
                (0, assert_1.assert)(typeof captured.value.root === 'string', 'Hosting snapshot has a directory');
                await this.deploy(job, { ...captured.value, root: captured.value.root });
            }
        }
        finally {
            const cleanup = await (0, promises_1.rm)(captured.value.temporary, { recursive: true, force: true }).then(result_1.ok, publishGitCommand_1.publishFilesystemFailure);
            if (!cleanup.ok) {
                const completed = this.current;
                (0, assert_1.assert)(completed.kind === 'done' || completed.kind === 'failed' || completed.kind === 'review-open', 'Cleanup follows publishing');
                const message = completed.kind === 'failed' ? `${completed.message} ` : '';
                this.fail(`${message}Temporary publish files could not be removed.`, completed.kind === 'review-open' ? { github: false, hosting: false } : completed);
            }
        }
    }
    async push(job, source, repository) {
        const message = await (0, publishCommit_1.requirePublishMessage)(job.root, source, job.message);
        if (!message.ok) {
            return message;
        }
        const total = job.plan.kind === 'github' ? 3 : 5;
        this.current = runningState('Checking GitHub for incoming changes…', 1, total);
        const incoming = await (0, publishCommit_1.checkPublishIncoming)(job.root, repository, source.head);
        if (!incoming.ok) {
            return incoming;
        }
        this.current = runningState('Committing and pushing to GitHub…', 2, total);
        const committed = await (0, publishCommit_1.commitPublishSource)(job.root, source, repository.branch, job.message);
        if (!committed.ok) {
            return committed;
        }
        const pushed = await (0, publishGitCommand_1.runPublishGit)(job.root, ['push', repository.remote, `${committed.value}:refs/heads/${repository.branch}`], {
            env: repository.environment,
            timeout: 120_000,
        });
        if (!pushed.ok) {
            return pushed;
        }
        // A bookkeeping failure must not pretend the external push failed or retry that push.
        const recorded = await (0, publishGitHub_1.recordPublishedGitHub)(job.root, repository.branch, committed.value).then(result_1.ok, publishGitCommand_1.publishFilesystemFailure);
        return (0, result_1.ok)({
            warning: recorded.ok ? undefined : 'Saved to GitHub, but local push status could not be updated. Refresh Git.',
        });
    }
    async deploy(job, snapshot) {
        const completed = { github: false, hosting: false };
        const repository = job.plan.repository;
        if (repository !== undefined) {
            const message = await (0, publishCommit_1.requirePublishMessage)(job.root, snapshot, job.message);
            if (!message.ok) {
                this.fail(message.error.message, completed);
                return;
            }
        }
        this.current = runningState('Running hooks and building website…', 1, 5);
        const built = await buildPublishSnapshot(job, snapshot);
        if (!built.ok) {
            this.fail(built.error.message, completed);
            return;
        }
        if (repository !== undefined) {
            const pushed = await this.push(job, snapshot, repository);
            if (!pushed.ok) {
                this.fail(pushed.error.message, completed);
                return;
            }
            completed.github = true;
            if (pushed.value.warning !== undefined) {
                this.fail(pushed.value.warning, completed);
                return;
            }
        }
        this.current = runningState(`Deploying to ${job.config.hosting.provider}…`, 3, 5);
        const deployed = await (0, publishCommands_1.deployHosting)(snapshot.root, job.config).then(result_1.ok, publishGitCommand_1.publishFilesystemFailure);
        if (!deployed.ok) {
            this.fail(deployed.error.message, completed);
            return;
        }
        completed.hosting = true;
        const recorded = await (0, publishReceipt_1.recordDeployment)(job.root, {
            version: 1,
            tree: snapshot.tree,
            configuration: (0, publishReceipt_1.deploymentConfiguration)(job.config),
        }).then(result_1.ok, publishGitCommand_1.publishFilesystemFailure);
        if (!recorded.ok) {
            this.fail(recorded.error.message, completed);
            return;
        }
        this.current = runningState('Running after-publish scripts…', 4, 5);
        const after = await (0, publishCommands_1.runPublishScripts)(snapshot.root, job.config.afterPublish, {
            STACKI_PUBLISH_TARGET: job.target,
        }).then(result_1.ok, publishGitCommand_1.publishFilesystemFailure);
        if (!after.ok) {
            this.fail(after.error.message, completed);
            return;
        }
        this.current = { kind: 'done', ...completed };
    }
    fail(message, completed) {
        this.current = {
            kind: 'failed',
            message,
            github: completed.github,
            hosting: completed.hosting,
        };
    }
}
exports.DesktopPublisher = DesktopPublisher;
function runningState(step, completed, total) {
    return { kind: 'running', step, progress: (0, publishState_1.parseDesktopPublishProgress)({ completed, total }) };
}
async function preparePublishJob(root, target, message) {
    const canonical = await (0, promises_1.realpath)(root).then(result_1.ok, publishGitCommand_1.publishFilesystemFailure);
    if (!canonical.ok) {
        return canonical;
    }
    // Settings are untrusted file input; parser failures belong to this boundary.
    let config;
    try {
        config = (0, publishConfig_1.readPublishConfig)(canonical.value);
    }
    catch (error) {
        return (0, publishGitCommand_1.publishFilesystemFailure)(error);
    }
    if (target === 'hosting') {
        if (config.githubWorkflow?.kind === 'pull-request') {
            return (0, result_1.err)({
                code: 'review-required',
                message: 'Submit changes for review and deploy the merged branch ' + 'through your repository workflow.',
            });
        }
        if (config.hosting.provider === 'none') {
            return (0, result_1.err)({
                code: 'hosting-required',
                message: 'Choose a hosting provider in Publish settings.',
            });
        }
        return (0, result_1.ok)({
            root: canonical.value,
            target,
            config,
            message,
            plan: { kind: 'hosting', repository: undefined },
        });
    }
    const repository = await preparePublishRepository(canonical.value, config);
    if (!repository.ok) {
        return repository;
    }
    const kind = target === 'github' || config.hosting.provider === 'none' || config.githubWorkflow?.kind === 'pull-request' ? 'github' : 'hosting';
    return (0, result_1.ok)({
        root: canonical.value,
        target,
        config,
        message,
        plan: { kind, repository: repository.value },
    });
}
async function preparePublishRepository(root, config) {
    const remote = await (0, publishGitHub_1.publishingGitRemote)(root, config).then(result_1.ok, publishGitCommand_1.publishFilesystemFailure);
    if (!remote.ok) {
        return remote;
    }
    const environment = await (0, publishGitHub_1.publishingGitEnvironment)(root, config).then(result_1.ok, publishGitCommand_1.publishFilesystemFailure);
    if (!environment.ok) {
        return environment;
    }
    const branch = await (0, publishGitCommand_1.runPublishGit)(root, ['symbolic-ref', '--short', 'HEAD']);
    if (!branch.ok) {
        return (0, result_1.err)({ code: 'detached-head', message: 'Choose a branch before publishing to GitHub.' });
    }
    return (0, result_1.ok)({ branch: branch.value.trim(), remote: remote.value, environment: environment.value });
}
async function buildPublishSnapshot(job, snapshot) {
    const before = await (0, publishCommands_1.runPublishScripts)(snapshot.root, job.config.beforePublish, {
        STACKI_PUBLISH_TARGET: job.target,
    }).then(result_1.ok, publishGitCommand_1.publishFilesystemFailure);
    if (!before.ok) {
        return before;
    }
    return (0, publishCommands_1.runPublishScripts)(snapshot.root, [job.config.buildScript]).then(result_1.ok, publishGitCommand_1.publishFilesystemFailure);
}
