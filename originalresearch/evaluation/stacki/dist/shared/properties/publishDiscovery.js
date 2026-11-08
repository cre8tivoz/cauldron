"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DISCOVERY_LIMITS = void 0;
exports.parseDiscoveryRequest = parseDiscoveryRequest;
exports.parsePublishDiscovery = parsePublishDiscovery;
exports.discoveryList = discoveryList;
exports.discoveryIdentifier = discoveryIdentifier;
exports.discoveryLabel = discoveryLabel;
const assert_1 = require("../core/assert");
const boundary_1 = require("../core/boundary");
const publishConfig_1 = require("./publishConfig");
exports.DISCOVERY_LIMITS = { itemsMax: 500, pagesMax: 5, timeoutMs: 30_000 };
function parseDiscoveryRequest(input) {
    const value = (0, boundary_1.record)(input);
    const provider = value['provider'];
    if (provider !== 'cloudflare' && provider !== 'cloudflare-workers' && provider !== 'vercel' && provider !== 'github' && provider !== 'linked') {
        throw new Error('Unknown publishing provider.');
    }
    const account = (0, boundary_1.text)(value['account']);
    if (account !== '') {
        discoveryIdentifier(account);
    }
    return { provider, account };
}
function parsePublishDiscovery(input) {
    const value = (0, boundary_1.record)(input);
    if (value['kind'] === 'failed') {
        return { kind: 'failed', message: discoveryLabel(value['message']) };
    }
    if (value['kind'] !== 'ready') {
        throw new Error('Invalid publishing discovery result.');
    }
    return {
        kind: 'ready',
        ...(value['notice'] === undefined ? {} : { notice: discoveryLabel(value['notice']) }),
        accounts: discoveryList(value['accounts']).map((item) => {
            const account = (0, boundary_1.record)(item);
            return { id: discoveryIdentifier(account['id']), name: discoveryLabel(account['name']) };
        }),
        projects: discoveryList(value['projects']).map((item) => {
            const project = (0, boundary_1.record)(item);
            return {
                name: discoveryLabel(project['name']),
                hosting: parseDiscoveredHosting(project['hosting']),
            };
        }),
    };
}
function discoveryList(input) {
    const values = (0, boundary_1.list)((value) => value)(input);
    if (values.length > exports.DISCOVERY_LIMITS.itemsMax) {
        throw new Error('Discovery exceeds 500 entries. Use manual configuration.');
    }
    return values;
}
function discoveryIdentifier(input) {
    const value = (0, boundary_1.text)(input);
    if (!/^[a-zA-Z0-9][a-zA-Z0-9_.-]{0,99}$/.test(value)) {
        throw new Error('Invalid provider identifier.');
    }
    return value;
}
function discoveryLabel(input) {
    const value = (0, boundary_1.text)(input);
    if (value.length === 0 || value.length > 512) {
        throw new Error('Provider label must contain 1–512 characters.');
    }
    return value;
}
function parseDiscoveredHosting(input) {
    const value = (0, boundary_1.record)(input);
    if (value['provider'] === 'cloudflare-workers' && value['accountId'] === '') {
        // A local Wrangler name is useful before login; saving still requires a resolved account.
        const parsed = (0, publishConfig_1.parsePublishConfig)({
            ...publishConfig_1.DEFAULT_PUBLISH_CONFIG,
            hosting: { ...value, accountId: 'unresolved' },
        }).hosting;
        (0, assert_1.assert)(parsed.provider === 'cloudflare-workers', 'Discovery preserves the Worker provider');
        (0, assert_1.assert)(parsed.accountId === 'unresolved', 'Discovery replaces only the unresolved account');
        return { ...parsed, accountId: '' };
    }
    return (0, publishConfig_1.parsePublishConfig)({ ...publishConfig_1.DEFAULT_PUBLISH_CONFIG, hosting: input }).hosting;
}
