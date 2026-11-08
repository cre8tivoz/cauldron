"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.readPublishAvailability = readPublishAvailability;
const publishState_1 = require("../../shared/properties/publishState");
const nodeTools_1 = require("../lib/nodeTools");
const publishConfig_1 = require("./publishConfig");
const publishGitHub_1 = require("./publishGitHub");
const publishReceipt_1 = require("./publishReceipt");
const publishSnapshot_1 = require("./publishSnapshot");
async function readPublishAvailability(root) {
    await (0, nodeTools_1.ensureToolPath)();
    let config;
    try {
        config = (0, publishConfig_1.readPublishConfig)(root);
    }
    catch {
        // Invalid or unreadable settings must remain actionable through the setup dialog.
        return publishState_1.UNKNOWN_PUBLISH_AVAILABILITY;
    }
    const [github, hosting] = await Promise.all([
        githubAvailability(root, config).catch(() => ({ github: 'unknown' })),
        hostingAvailability(root, config).catch(() => 'unknown'),
    ]);
    return { ...github, hosting };
}
async function githubAvailability(root, config) {
    const remoteUrl = await (0, publishGitHub_1.publishingGitRemote)(root, config);
    const branch = (await (0, nodeTools_1.git)(root, ['symbolic-ref', '--short', 'HEAD'])).stdout.trim();
    const head = await (0, nodeTools_1.git)(root, ['rev-parse', '--verify', 'HEAD'])
        .then((result) => result.stdout.trim())
        .catch(() => undefined);
    const remote = await (0, nodeTools_1.git)(root, ['rev-parse', '--verify', `refs/remotes/origin/${branch}`])
        .then((result) => result.stdout.trim())
        .catch(() => undefined);
    const count = head === undefined ? '0' : (await (0, nodeTools_1.git)(root, ['rev-list', '--count', remote === undefined ? head : `${remote}..${head}`])).stdout.trim();
    const headTree = head === undefined ? undefined : (await (0, nodeTools_1.git)(root, ['rev-parse', `${head}^{tree}`])).stdout.trim();
    // Publish stages the complete worktree, so staged-only differences must not add a
    // phantom commit. Its isolated index compares exactly the snapshot Publish will use.
    const source = await (0, publishSnapshot_1.readPublishTree)(root);
    if (!source.ok) {
        return { github: 'unknown' };
    }
    const dirty = headTree !== source.value;
    const githubPush = (0, publishState_1.parseGitHubPush)({
        commits: Number(count) + (dirty ? 1 : 0),
        repositoryUrl: remoteUrl.replace(/^git@github\.com:/, 'https://github.com/').replace(/\.git$/, ''),
    });
    return { github: !dirty && head === remote ? 'current' : 'pending', githubPush };
}
async function hostingAvailability(root, config) {
    if (config.hosting.provider === 'none') {
        return 'unconfigured';
    }
    const receipt = await (0, publishReceipt_1.readDeploymentReceipt)(root);
    if (receipt === undefined) {
        return 'pending';
    }
    if (receipt.configuration !== (0, publishReceipt_1.deploymentConfiguration)(config)) {
        return 'pending';
    }
    // Compare the actual deploy input, including uncommitted and untracked files.
    // A hosting-only deployment need not create a Git commit to become current.
    const source = await (0, publishSnapshot_1.readPublishTree)(root);
    if (!source.ok) {
        return 'unknown';
    }
    return receipt.tree === source.value ? 'current' : 'pending';
}
