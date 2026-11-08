"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PUBLISH_LIMITS = exports.DEFAULT_PUBLISH_CONFIG = void 0;
exports.parsePublishTarget = parsePublishTarget;
exports.parsePublishCommitMessage = parsePublishCommitMessage;
exports.parsePublishConfig = parsePublishConfig;
exports.parsePublishSource = parsePublishSource;
const boundary_1 = require("../core/boundary");
const publishSite_1 = require("./publishSite");
const publishReview_1 = require("./publishReview");
exports.DEFAULT_PUBLISH_CONFIG = {
    version: 1,
    defaultTarget: 'all',
    githubAccount: '',
    hosting: { provider: 'none' },
    buildScript: 'build',
    beforePublish: [],
    afterPublish: [],
};
exports.PUBLISH_LIMITS = {
    sourceCharsMax: 16_384,
    hooksMax: 8,
    identifierCharsMax: 100,
    commandTimeoutMs: 600_000,
    outputBytesMax: 1_048_576,
    filesMax: 10_000,
    snapshotBytesMax: 268_435_456,
};
function parsePublishTarget(input) {
    if (input === 'all' || input === 'github' || input === 'hosting') {
        return input;
    }
    throw new Error('Choose all, github, or hosting as the publish target.');
}
function parsePublishCommitMessage(input) {
    const message = (0, boundary_1.text)(input).trim();
    if (message.length === 0 || message.length > 4000) {
        throw new Error('Enter a commit message between 1 and 4000 characters.');
    }
    return message;
}
function parsePublishConfig(input) {
    const value = (0, boundary_1.record)(input);
    if (value['version'] !== 1) {
        throw new Error('Unsupported publish settings version.');
    }
    const githubAccount = (0, boundary_1.text)(value['githubAccount']);
    if (githubAccount !== '') {
        identifier(githubAccount);
        if (!/^[a-zA-Z0-9][a-zA-Z0-9-]{0,38}$/.test(githubAccount)) {
            throw new Error('Enter a GitHub username, not a token or email.');
        }
    }
    return {
        version: 1,
        ...(value['publishedSite'] === undefined ? {} : { publishedSite: parsePublishedSite(value['publishedSite']) }),
        ...(value['githubWorkflow'] === undefined
            ? {}
            : {
                githubWorkflow: (0, publishReview_1.parseGitHubWorkflow)(value['githubWorkflow']),
            }),
        defaultTarget: value['defaultTarget'] === undefined ? 'all' : parsePublishTarget(value['defaultTarget']),
        githubAccount,
        hosting: parseHosting(value['hosting']),
        buildScript: identifier(value['buildScript']),
        beforePublish: scripts(value['beforePublish']),
        afterPublish: scripts(value['afterPublish']),
    };
}
function parsePublishedSite(input) {
    const value = (0, boundary_1.record)(input);
    const hosting = parseHosting(value['hosting']);
    if (hosting.provider === 'none') {
        throw new Error('Published site must belong to a hosting destination.');
    }
    const source = value['source'];
    if (source !== 'manual') {
        if (source !== 'discovered') {
            throw new Error('Invalid published site source.');
        }
    }
    return { hosting, source, url: (0, publishSite_1.parsePublishedSiteURL)(value['url']) };
}
function parsePublishSource(source) {
    if (source === undefined) {
        return exports.DEFAULT_PUBLISH_CONFIG;
    }
    if (source.length > exports.PUBLISH_LIMITS.sourceCharsMax) {
        throw new Error('Publish settings exceed 16 KiB.');
    }
    const value = JSON.parse(source);
    return parsePublishConfig(value);
}
function parseHosting(input) {
    const value = (0, boundary_1.record)(input);
    switch (value['provider']) {
        case 'none':
            return { provider: 'none' };
        case 'cloudflare':
            return {
                provider: 'cloudflare',
                accountId: identifier(value['accountId']),
                project: identifier(value['project']),
                branch: branchName(value['branch']),
                directory: outputDirectory(value['directory']),
            };
        case 'cloudflare-workers':
            return {
                provider: 'cloudflare-workers',
                accountId: identifier(value['accountId']),
                project: identifier(value['project']),
            };
        case 'vercel':
            return {
                provider: 'vercel',
                organizationId: identifier(value['organizationId']),
                projectId: identifier(value['projectId']),
            };
        default:
            throw new Error('Choose Cloudflare Pages, Cloudflare Workers, Vercel, or no hosting.');
    }
}
function identifier(input) {
    const value = (0, boundary_1.text)(input);
    if (value.length > exports.PUBLISH_LIMITS.identifierCharsMax) {
        throw new Error('Publish identifier exceeds 100 characters.');
    }
    if (!/^[a-zA-Z0-9][a-zA-Z0-9_:.-]*$/.test(value)) {
        throw new Error('Publish identifiers must be nonempty names, not commands.');
    }
    return value;
}
function scripts(input) {
    const values = (0, boundary_1.list)(identifier)(input);
    if (values.length > exports.PUBLISH_LIMITS.hooksMax) {
        throw new Error('Use at most eight scripts per publish hook.');
    }
    return values;
}
function branchName(input) {
    const value = (0, boundary_1.text)(input);
    if (!/^[a-zA-Z0-9][a-zA-Z0-9/_.-]{0,99}$/.test(value)) {
        throw new Error('Invalid hosting production branch.');
    }
    return value;
}
function outputDirectory(input) {
    const value = (0, boundary_1.text)(input);
    if (!/^[a-zA-Z0-9_.-]+(?:\/[a-zA-Z0-9_.-]+)*$/.test(value)) {
        throw new Error('Build output must be a relative project directory.');
    }
    if (value.length > 256 || value.split('/').some((part) => part === '..' || part === '.')) {
        throw new Error('Build output must stay inside the project.');
    }
    return value;
}
