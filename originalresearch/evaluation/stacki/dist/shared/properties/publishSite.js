"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.hostingSiteKey = hostingSiteKey;
exports.savedPublishedSite = savedPublishedSite;
exports.parsePublishedSiteURL = parsePublishedSiteURL;
const assert_1 = require("../core/assert");
const boundary_1 = require("../core/boundary");
/** A remembered domain belongs to one provider account and project, never its replacement. */
function hostingSiteKey(hosting) {
    switch (hosting.provider) {
        case 'none':
            return 'none';
        case 'cloudflare':
        case 'cloudflare-workers':
            return JSON.stringify([hosting.provider, hosting.accountId, hosting.project]);
        case 'vercel':
            return JSON.stringify([hosting.provider, hosting.organizationId, hosting.projectId]);
    }
}
function savedPublishedSite(config) {
    const saved = config.publishedSite;
    if (saved === undefined) {
        return undefined;
    }
    return hostingSiteKey(saved.hosting) === hostingSiteKey(config.hosting) ? saved : undefined;
}
/** Publishing links are HTTPS origins, never executable URLs or credential-bearing links. */
function parsePublishedSiteURL(input) {
    const value = (0, boundary_1.text)(input);
    (0, assert_1.assert)(value.length <= 2048, 'Published site URL exceeds limit');
    const url = new URL(value);
    (0, assert_1.assert)(url.protocol === 'https:', 'Published site URL must use HTTPS');
    (0, assert_1.assert)(url.username === '', 'Published site URL cannot contain a username');
    (0, assert_1.assert)(url.password === '', 'Published site URL cannot contain a password');
    (0, assert_1.assert)(url.hostname.length <= 253, 'Published site domain exceeds limit');
    (0, assert_1.assert)(/^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(url.hostname), 'Published site URL must have a domain');
    (0, assert_1.assert)(url.port === '', 'Published site URL cannot contain a port');
    (0, assert_1.assert)(url.pathname === '/', 'Published site URL must be an origin');
    (0, assert_1.assert)(url.search === '', 'Published site URL cannot contain a query');
    (0, assert_1.assert)(url.hash === '', 'Published site URL cannot contain a fragment');
    (0, assert_1.assert)(value === url.origin, 'Published site URL must be a canonical origin');
    return value;
}
