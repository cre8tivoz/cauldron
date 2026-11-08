"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.publishedProjectSiteURL = publishedProjectSiteURL;
exports.publishedSiteURL = publishedSiteURL;
exports.preferredSiteDomain = preferredSiteDomain;
const boundary_1 = require("../../shared/core/boundary");
const publishConfig_1 = require("../../shared/properties/publishConfig");
const publishDiscovery_1 = require("./publishDiscovery");
const publishLinkedProject_1 = require("./publishLinkedProject");
const publishDiscovery_2 = require("../../shared/properties/publishDiscovery");
const publishSite_1 = require("../../shared/properties/publishSite");
const publishDiscoveryCloudflare_1 = require("./publishDiscoveryCloudflare");
const publishDiscoveryCommand_1 = require("./publishDiscoveryCommand");
const publishDiscoveryVercel_1 = require("./publishDiscoveryVercel");
async function publishedProjectSiteURL(root, source) {
    const config = (0, publishConfig_1.parsePublishSource)(source);
    if (source !== undefined) {
        return publishedSiteURL(root, config.hosting);
    }
    // The menu detects existing provider links before settings are saved. URL discovery
    // must use that same destination without creating settings or guessing between projects.
    const result = await (0, publishDiscovery_1.discoverPublishing)(root, { provider: 'linked', account: '' });
    if (result.kind !== 'ready') {
        return undefined;
    }
    if (result.projects.length !== 1) {
        return undefined;
    }
    const project = result.projects[0];
    return project === undefined ? undefined : publishedSiteURL(root, project.hosting);
}
async function publishedSiteURL(root, hosting) {
    if (hosting.provider === 'cloudflare-workers') {
        const configured = await (0, publishLinkedProject_1.configuredWorkerSiteURL)(root, hosting);
        if (configured !== undefined) {
            return configured;
        }
    }
    switch (hosting.provider) {
        case 'none':
            return undefined;
        case 'vercel':
            return vercelSiteURL(root, hosting);
        case 'cloudflare':
        case 'cloudflare-workers': {
            const credentials = (0, boundary_1.record)(await (0, publishDiscoveryCommand_1.discoveryCommand)(root, 'wrangler', ['auth', 'token', '--json']));
            const headers = (0, publishDiscoveryCloudflare_1.cloudflareHeaders)(credentials);
            const endpoint = `https://api.cloudflare.com/client/v4/accounts/${hosting.accountId}`;
            const read = async (suffix) => {
                const value = (0, boundary_1.record)(await (0, publishDiscoveryCloudflare_1.cloudflareRequest)(`${endpoint}${suffix}`, headers));
                if (value['success'] !== true) {
                    throw new Error('Could not discover the published site.');
                }
                return value['result'];
            };
            if (hosting.provider === 'cloudflare') {
                const project = (0, boundary_1.record)(await read(`/pages/projects/${hosting.project}`));
                return preferredSiteDomain([...(0, publishDiscovery_2.discoveryList)(project['domains'] ?? []), ...(project['subdomain'] === undefined ? [] : [project['subdomain']])]);
            }
            return workerSiteURL(hosting.project, read);
        }
    }
}
async function workerSiteURL(project, read) {
    // Domain permissions can be narrower than Worker permissions; still try workers.dev.
    const domains = await read(`/workers/domains?service=${project}&environment=production`)
        .then((input) => (0, publishDiscovery_2.discoveryList)(input).flatMap((entry) => {
        const value = (0, boundary_1.record)(entry);
        if (value['service'] !== project) {
            return [];
        }
        if (value['environment'] !== 'production') {
            return [];
        }
        // Older API responses omit enabled; those domains were always routable.
        const enabled = value['enabled'] === undefined ? true : (0, boundary_1.boolean)(value['enabled']);
        return enabled ? [value['hostname']] : [];
    }))
        .catch(() => []);
    const custom = preferredSiteDomain(domains);
    if (custom !== undefined) {
        return custom;
    }
    const enabled = (0, boundary_1.record)(await read(`/workers/scripts/${project}/subdomain`));
    if (enabled['enabled'] !== true) {
        return undefined;
    }
    const account = (0, boundary_1.record)(await read('/workers/subdomain'));
    return preferredSiteDomain([`${project}.${(0, boundary_1.text)(account['subdomain'])}.workers.dev`]);
}
async function vercelSiteURL(root, hosting) {
    const entries = await (0, publishDiscoveryVercel_1.vercelPages)(root, `/v9/projects/${hosting.projectId}/domains`, 'domains', hosting.organizationId);
    const domains = entries.flatMap((entry) => {
        const value = (0, boundary_1.record)(entry);
        if (value['verified'] !== true) {
            return [];
        }
        if (value['gitBranch']) {
            return [];
        }
        // A redirect is an alias, not the project's canonical public domain.
        return value['redirect'] ? [] : [value['name']];
    });
    return preferredSiteDomain(domains);
}
function preferredSiteDomain(input) {
    const domains = (0, publishDiscovery_2.discoveryList)(input).map((entry) => {
        const domain = (0, boundary_1.text)(entry).toLowerCase();
        if (domain.length > 253) {
            throw new Error('Published domain exceeds limit.');
        }
        if (!/^[a-z0-9.-]+$/.test(domain)) {
            throw new Error('Invalid published domain.');
        }
        return (0, publishSite_1.parsePublishedSiteURL)(`https://${domain}`);
    });
    const ordered = [...domains].sort((left, right) => {
        const rank = (url) => Number(['.workers.dev', '.pages.dev', '.vercel.app'].some((suffix) => url.endsWith(suffix)));
        return rank(left) - rank(right) || left.localeCompare(right);
    });
    return ordered[0];
}
