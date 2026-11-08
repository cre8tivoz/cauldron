"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.discoverPublishing = discoverPublishing;
const publishRepositories_1 = require("./publishRepositories");
const boundary_1 = require("../../shared/core/boundary");
const publishDiscovery_1 = require("../../shared/properties/publishDiscovery");
const publishDiscoveryCommand_1 = require("./publishDiscoveryCommand");
const publishDiscoveryCloudflare_1 = require("./publishDiscoveryCloudflare");
const publishDiscoveryVercel_1 = require("./publishDiscoveryVercel");
const publishLinkedProject_1 = require("./publishLinkedProject");
/** This boundary returns sanitized failures, never CLI output that could contain credentials. */
async function discoverPublishing(root, input) {
    const request = (0, publishDiscovery_1.parseDiscoveryRequest)(input);
    try {
        return (0, publishDiscovery_1.parsePublishDiscovery)(await discoverProvider(root, request));
    }
    catch {
        const tool = {
            cloudflare: 'wrangler',
            'cloudflare-workers': 'wrangler',
            linked: 'hosting CLI',
            vercel: 'vercel',
            github: 'gh auth',
        }[request.provider];
        return {
            kind: 'failed',
            message: `Could not discover ${request.provider} projects or accounts. ` +
                `Install the latest CLI, run ${tool} login on this machine, then retry. ` +
                'Check your connection and account permissions, or use manual configuration.',
        };
    }
}
async function discoverProvider(root, request) {
    if (request.provider === 'linked') {
        const results = await Promise.allSettled(['linked', 'vercel'].map((provider) => (0, publishLinkedProject_1.linkedPublishProject)(root, provider)));
        return {
            kind: 'ready',
            accounts: [],
            projects: results.flatMap((result) => (result.status === 'fulfilled' ? result.value : [])),
        };
    }
    if (request.provider === 'github') {
        const status = (0, boundary_1.record)(await (0, publishDiscoveryCommand_1.discoveryCommand)(root, 'gh', ['auth', 'status', '--hostname', 'github.com', '--json', 'hosts']));
        const entries = (0, publishDiscovery_1.discoveryList)((0, boundary_1.record)(status['hosts'])['github.com'] ?? []);
        const connected = await (0, publishRepositories_1.repositoryState)(root).catch(() => undefined);
        const owner = connected?.connected.split('/')[0];
        const accounts = entries
            .map(boundary_1.record)
            .filter((value) => value['state'] === 'success')
            .sort((left, right) => Number(right['login'] === owner) - Number(left['login'] === owner))
            .map((value) => {
            const id = (0, publishDiscovery_1.discoveryIdentifier)(value['login']);
            return { id, name: id };
        });
        return { kind: 'ready', accounts, projects: [] };
    }
    if (request.account) {
        const projects = request.provider === 'cloudflare'
            ? await (0, publishDiscoveryCloudflare_1.cloudflareProjects)(root, request.account)
            : request.provider === 'cloudflare-workers'
                ? await (0, publishDiscoveryCloudflare_1.cloudflareWorkers)(root, request.account)
                : await (0, publishDiscoveryVercel_1.vercelProjects)(root, request.account);
        return { kind: 'ready', accounts: [], projects };
    }
    return discoverHosting(root, request.provider);
}
async function discoverHosting(root, provider) {
    const [linked, connected] = await Promise.allSettled([
        (0, publishLinkedProject_1.linkedPublishProject)(root, provider),
        provider === 'vercel' ? (0, publishDiscoveryVercel_1.vercelAccounts)(root) : (0, publishDiscoveryCloudflare_1.cloudflareAccounts)(root),
    ]);
    const linkedProjects = linked.status === 'fulfilled' ? linked.value : [];
    if (connected.status === 'rejected' && linkedProjects.length === 0) {
        throw new Error('No accessible provider connection.');
    }
    const accounts = connected.status === 'fulfilled' ? connected.value : [];
    if (accounts.length > 20) {
        throw new Error('Discovery supports at most twenty accounts per provider.');
    }
    const requests = accounts.flatMap((account) => {
        switch (provider) {
            case 'cloudflare':
                return [(0, publishDiscoveryCloudflare_1.cloudflareProjects)(root, account.id), (0, publishDiscoveryCloudflare_1.cloudflareWorkers)(root, account.id)];
            case 'cloudflare-workers':
                return [(0, publishDiscoveryCloudflare_1.cloudflareWorkers)(root, account.id)];
            case 'vercel':
                return [(0, publishDiscoveryVercel_1.vercelProjects)(root, account.id)];
        }
    });
    const results = await Promise.allSettled(requests);
    const projects = results.flatMap((result) => (result.status === 'fulfilled' ? result.value : []));
    (0, publishDiscovery_1.discoveryList)(projects);
    const unique = new Map(projects.map((project) => [discoveryProjectKey(project), project]));
    for (const project of linkedProjects) {
        unique.set(discoveryProjectKey(project), project);
    }
    return {
        kind: 'ready',
        accounts,
        projects: [...unique.values()],
        ...(connected.status === 'rejected' || results.some((result) => result.status === 'rejected')
            ? { notice: 'Some accounts could not be loaded. Refresh to retry.' }
            : {}),
    };
}
function discoveryProjectKey(project) {
    const hosting = project.hosting;
    switch (hosting.provider) {
        case 'none':
            return 'none';
        case 'cloudflare':
        case 'cloudflare-workers':
            return `${hosting.provider}/${hosting.accountId}/${hosting.project}`;
        case 'vercel':
            return `vercel/${hosting.organizationId}/${hosting.projectId}`;
    }
}
