"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseGitHubWorkflow = parseGitHubWorkflow;
exports.parseReviewReceipt = parseReviewReceipt;
exports.reviewBranch = reviewBranch;
// Review submissions are not published revisions. Their receipt never authorizes
// production deployment, asset cleanup, or advancing a draft's synchronization base.
const boundary_1 = require("../core/boundary");
function parseGitHubWorkflow(input) {
    const value = (0, boundary_1.object)({ kind: boundary_1.text })(input);
    if (value.kind === 'direct' || value.kind === 'pull-request') {
        return { kind: value.kind };
    }
    throw new Error('Choose direct publishing or pull request review.');
}
function parseReviewReceipt(input) {
    const value = (0, boundary_1.object)({ sha: boundary_1.text, branch: boundary_1.text, url: boundary_1.text })(input);
    if (!/^[a-f0-9]{40}$/.test(value.sha)) {
        throw new Error('Invalid review commit.');
    }
    if (!/^stacki\/review-[a-f0-9]{40}-[a-f0-9]{40}$/.test(value.branch)) {
        throw new Error('Invalid review branch.');
    }
    if (!/^https:\/\/github\.com\/[\w.-]+\/[\w.-]+\/pull\/[1-9]\d{0,9}$/.test(value.url)) {
        throw new Error('Invalid pull request URL.');
    }
    return value;
}
function reviewBranch(parent, tree) {
    if (!/^[a-f0-9]{40}$/.test(parent) || !/^[a-f0-9]{40}$/.test(tree)) {
        throw new Error('Review requires validated Git objects.');
    }
    return `stacki/review-${parent}-${tree}`;
}
