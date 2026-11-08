"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UNKNOWN_PUBLISH_AVAILABILITY = void 0;
exports.parsePublishAvailability = parsePublishAvailability;
exports.parseGitHubPush = parseGitHubPush;
exports.parseDesktopPublishProgress = parseDesktopPublishProgress;
exports.parseDesktopPublishState = parseDesktopPublishState;
const boundary_1 = require("../core/boundary");
const assert_1 = require("../core/assert");
const publishReview_1 = require("./publishReview");
exports.UNKNOWN_PUBLISH_AVAILABILITY = {
    github: 'unknown',
    hosting: 'unknown',
};
function parsePublishAvailability(input) {
    const value = (0, boundary_1.object)({
        github: parseDestinationState,
        hosting: parseDestinationState,
        githubPush: (0, boundary_1.optional)(parseGitHubPush),
    })(input);
    (0, assert_1.assert)(value.github !== 'unconfigured', 'GitHub is always a publishing destination');
    if (value.github === 'current') {
        if (value.githubPush !== undefined) {
            (0, assert_1.assert)(value.githubPush.commits === 0, 'Current GitHub status cannot have commits to push');
        }
    }
    return { ...value, github: value.github };
}
function parseGitHubPush(input) {
    const value = (0, boundary_1.object)({ commits: boundary_1.count, repositoryUrl: boundary_1.text })(input);
    (0, assert_1.assert)(value.commits <= 1_000_000, 'GitHub push commit count exceeds limit');
    (0, assert_1.assert)(/^https:\/\/github\.com\/[\w.-]+\/[\w.-]+$/.test(value.repositoryUrl), 'GitHub repository link must be a repository on github.com');
    return value;
}
function parseDestinationState(input) {
    (0, assert_1.assert)(typeof input === 'string', 'Publish destination state must be a string');
    switch (input) {
        case 'current':
        case 'pending':
        case 'unknown':
        case 'unconfigured':
            return input;
        default:
            throw new Error('Invalid publish destination state.');
    }
}
function parseDesktopPublishProgress(input) {
    const value = (0, boundary_1.object)({ completed: boundary_1.count, total: boundary_1.count })(input);
    (0, assert_1.assert)(value.total >= 3, 'Publish progress must have at least 3 stages');
    (0, assert_1.assert)(value.total <= 5, 'Publish progress cannot exceed 5 stages');
    (0, assert_1.assert)(value.completed < value.total, 'Running publish progress must be incomplete');
    return value;
}
function parseDesktopPublishState(input) {
    const value = (0, boundary_1.record)(input);
    switch (value['kind']) {
        case 'review-open':
            return { kind: 'review-open', ...(0, publishReview_1.parseReviewReceipt)(value) };
        case 'idle':
            return { kind: 'idle' };
        case 'running':
            return {
                kind: 'running',
                ...(0, boundary_1.object)({ step: boundary_1.text, progress: (0, boundary_1.optional)(parseDesktopPublishProgress) })(value),
            };
        case 'done':
            return { kind: 'done', ...(0, boundary_1.object)({ github: boundary_1.boolean, hosting: boundary_1.boolean })(value) };
        case 'failed':
            return {
                kind: 'failed',
                ...(0, boundary_1.object)({ message: boundary_1.text, github: boundary_1.boolean, hosting: boundary_1.boolean })(value),
            };
        default:
            throw new Error('Invalid publish status.');
    }
}
