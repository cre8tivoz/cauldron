"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.linkedPublishProject = linkedPublishProject;
exports.configuredWorkerSiteURL = configuredWorkerSiteURL;
const promises_1 = require("node:fs/promises");
const node_path_1 = __importDefault(require("node:path"));
const smol_toml_1 = require("smol-toml");
const typescript_1 = require("typescript");
const boundary_1 = require("../../shared/core/boundary");
const publishSite_1 = require("../../shared/properties/publishSite");
const publishDiscovery_1 = require("../../shared/properties/publishDiscovery");
const publishDiscoveryCloudflare_1 = require("./publishDiscoveryCloudflare");
// Read existing links only: discovery never creates or relinks a remote project.
async function linkedPublishProject(root, provider) {
    if (provider === 'vercel') {
        const source = await linkedSource(root, '.vercel/project.json');
        if (source === undefined) {
            return [];
        }
        const input = JSON.parse(source);
        const value = (0, boundary_1.record)(input);
        return [
            {
                name: 'Linked Vercel project',
                hosting: {
                    provider: 'vercel',
                    organizationId: (0, publishDiscovery_1.discoveryIdentifier)(value['orgId']),
                    projectId: (0, publishDiscovery_1.discoveryIdentifier)(value['projectId']),
                },
            },
        ];
    }
    if (provider === 'cloudflare' || provider === 'cloudflare-workers' || provider === 'linked') {
        const value = await linkedWranglerConfig(root);
        if (value !== undefined) {
            const projects = await linkedCloudflare(root, value);
            return provider === 'linked' || provider === 'cloudflare' ? projects : projects.filter((project) => project.hosting.provider === provider);
        }
    }
    return [];
}
// Explicit custom domains are usable without provider API credentials. Match the complete
// destination so a saved hosting change cannot open an unrelated Wrangler project's site.
async function configuredWorkerSiteURL(root, hosting) {
    const value = await linkedWranglerConfig(root);
    if (value === undefined) {
        return undefined;
    }
    if (value['name'] !== hosting.project) {
        return undefined;
    }
    if (value['account_id'] !== hosting.accountId) {
        return undefined;
    }
    const routes = value['routes'] ?? (value['route'] === undefined ? [] : [value['route']]);
    const domains = (0, publishDiscovery_1.discoveryList)(routes).flatMap((route) => {
        if (typeof route === 'string') {
            return [];
        }
        const entry = (0, boundary_1.record)(route);
        if (entry['custom_domain'] !== true) {
            return [];
        }
        if (typeof entry['pattern'] !== 'string') {
            return [];
        }
        // Route patterns and paths are not origins; only literal custom domains qualify.
        try {
            return [(0, publishSite_1.parsePublishedSiteURL)(`https://${entry['pattern'].toLowerCase()}`)];
        }
        catch {
            return [];
        }
    });
    return domains.sort()[0];
}
async function linkedWranglerConfig(root) {
    for (const filename of ['wrangler.json', 'wrangler.jsonc', 'wrangler.toml']) {
        const source = await linkedSource(root, filename);
        if (source !== undefined) {
            // Parse data only: discovering a link must never execute project code.
            const parsed = filename.endsWith('.toml') ? { config: (0, smol_toml_1.parse)(source), error: undefined } : (0, typescript_1.parseConfigFileTextToJson)(filename, source);
            if (parsed.error) {
                throw new Error('Cannot read existing Wrangler configuration.');
            }
            return (0, boundary_1.record)(parsed.config);
        }
    }
    return undefined;
}
async function linkedCloudflare(root, value) {
    if (!value['name']) {
        return [];
    }
    const name = (0, publishDiscovery_1.discoveryIdentifier)(value['name']);
    if (!value['pages_build_output_dir']) {
        const accountId = value['account_id'] ? (0, publishDiscovery_1.discoveryIdentifier)(value['account_id']) : await linkedWorkerAccount(root, name);
        return [{ name, hosting: { provider: 'cloudflare-workers', accountId, project: name } }];
    }
    const account = value['account_id'] ? (0, publishDiscovery_1.discoveryIdentifier)(value['account_id']) : await singleCloudflareAccount(root);
    if (!account) {
        return [];
    }
    const pages = value['pages_build_output_dir'];
    const projects = await (0, publishDiscoveryCloudflare_1.cloudflareProjects)(root, account);
    const project = projects.find((item) => item.name === name);
    if (!project) {
        return [];
    }
    if (project.hosting.provider === 'cloudflare') {
        return [
            {
                ...project,
                hosting: {
                    ...project.hosting,
                    directory: discoveryDirectory(pages),
                },
            },
        ];
    }
    return [project];
}
async function linkedSource(root, filename) {
    const file = node_path_1.default.join(root, filename);
    try {
        const metadata = await (0, promises_1.stat)(file);
        if (metadata.size > 65_536) {
            throw new Error('Provider configuration exceeds 64 KiB.');
        }
        const source = await (0, promises_1.readFile)(file, 'utf8');
        if (source.length > 65_536) {
            throw new Error('Provider configuration exceeds 64 KiB.');
        }
        return source;
    }
    catch (error) {
        if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
            return undefined;
        }
        throw error;
    }
}
async function singleCloudflareAccount(root) {
    const accounts = await (0, publishDiscoveryCloudflare_1.cloudflareAccounts)(root);
    // Never guess between accounts: require an explicit account_id when more than one is available.
    return accounts.length === 1 ? accounts[0]?.id : undefined;
}
function discoveryDirectory(input) {
    if (typeof input !== 'string') {
        throw new Error('Wrangler output directory must be a string.');
    }
    return input.replace(/^\.\//, '');
}
async function linkedWorkerAccount(root, name) {
    try {
        const accounts = await (0, publishDiscoveryCloudflare_1.cloudflareAccounts)(root);
        if (accounts.length > 5) {
            return '';
        }
        const matches = await Promise.allSettled(accounts.map(async (account) => {
            const workers = await (0, publishDiscoveryCloudflare_1.cloudflareWorkers)(root, account.id);
            return workers.some((worker) => worker.name === name) ? account.id : undefined;
        }));
        const found = matches.flatMap((match) => (match.status === 'fulfilled' && match.value ? [match.value] : []));
        return found.length === 1 ? (found[0] ?? '') : '';
    }
    catch {
        return '';
    }
}
