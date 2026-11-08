"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cloudflareAccounts = cloudflareAccounts;
exports.cloudflareProjects = cloudflareProjects;
exports.parseCloudflareProject = parseCloudflareProject;
exports.cloudflareHeaders = cloudflareHeaders;
exports.cloudflareRequest = cloudflareRequest;
exports.cloudflareWorkers = cloudflareWorkers;
const boundary_1 = require("../../shared/core/boundary");
const publishDiscovery_1 = require("../../shared/properties/publishDiscovery");
const publishDiscoveryCommand_1 = require("./publishDiscoveryCommand");
// Pages uses ten entries per page, matching Wrangler's own project listing.
const PROJECTS_PER_PAGE = 10;
const PROJECT_PAGES_MAX = Math.ceil(publishDiscovery_1.DISCOVERY_LIMITS.itemsMax / PROJECTS_PER_PAGE);
async function cloudflareAccounts(root) {
    const user = (0, boundary_1.record)(await (0, publishDiscoveryCommand_1.discoveryCommand)(root, 'wrangler', ['whoami', '--json']));
    return (0, publishDiscovery_1.discoveryList)(user['accounts']).map((entry) => {
        const value = (0, boundary_1.record)(entry);
        return { id: (0, publishDiscovery_1.discoveryIdentifier)(value['id']), name: (0, publishDiscovery_1.discoveryLabel)(value['name']) };
    });
}
async function cloudflareProjects(root, account) {
    const credentials = (0, boundary_1.record)(await (0, publishDiscoveryCommand_1.discoveryCommand)(root, 'wrangler', ['auth', 'token', '--json']));
    const headers = cloudflareHeaders(credentials);
    const projects = [];
    for (let page = 1; page <= PROJECT_PAGES_MAX; page++) {
        const endpoint = `https://api.cloudflare.com/client/v4/accounts/${account}/pages/projects`;
        const result = (0, boundary_1.record)(await cloudflareRequest(`${endpoint}?per_page=${PROJECTS_PER_PAGE}&page=${page}`, headers));
        if (result['success'] !== true) {
            throw new Error('Cloudflare could not list Pages projects. Check account permissions.');
        }
        const values = (0, publishDiscovery_1.discoveryList)(result['result']);
        projects.push(...values.map((value) => parseCloudflareProject(value, account)));
        (0, publishDiscovery_1.discoveryList)(projects);
        const info = result['result_info'];
        if (info !== undefined) {
            const pages = (0, boundary_1.record)(info)['total_pages'];
            if (typeof pages === 'number' && Number.isSafeInteger(pages) && pages <= page) {
                return projects;
            }
        }
        if (values.length < PROJECTS_PER_PAGE) {
            return projects;
        }
    }
    throw new Error('Cloudflare has too many projects to list. Use manual configuration.');
}
function parseCloudflareProject(input, account) {
    const value = (0, boundary_1.record)(input);
    const name = (0, publishDiscovery_1.discoveryIdentifier)(value['name']);
    const build = (0, boundary_1.record)(value['build_config'] ?? {});
    return {
        name,
        hosting: {
            provider: 'cloudflare',
            accountId: (0, publishDiscovery_1.discoveryIdentifier)(account),
            project: name,
            branch: (0, boundary_1.text)(value['production_branch']),
            directory: (0, boundary_1.text)(build['destination_dir'] || 'dist').replace(/^\.\//, ''),
        },
    };
}
function cloudflareHeaders(credentials) {
    if (credentials['type'] === 'api_key') {
        return {
            'X-Auth-Key': credential(credentials['key']),
            'X-Auth-Email': credential(credentials['email']),
        };
    }
    if (credentials['type'] !== 'oauth' && credentials['type'] !== 'api_token') {
        throw new Error('Unsupported Cloudflare authentication. Sign in with wrangler login.');
    }
    return { Authorization: `Bearer ${credential(credentials['token'])}` };
}
function credential(input) {
    const value = (0, boundary_1.text)(input);
    if (!/^[\x21-\x7e]{1,8192}$/.test(value)) {
        throw new Error('Invalid Cloudflare credential. Sign in again.');
    }
    return value;
}
async function cloudflareRequest(url, headers) {
    const response = await fetch(url, {
        method: 'GET',
        headers,
        redirect: 'error',
        signal: AbortSignal.timeout(publishDiscovery_1.DISCOVERY_LIMITS.timeoutMs),
    });
    if (!response.ok || !response.body) {
        throw new Error('Cloudflare could not list projects. Check your sign-in and connection.');
    }
    const reader = response.body.getReader();
    const chunks = [];
    let bytes = 0;
    try {
        for (let count = 0; count < 8192; count++) {
            const part = await reader.read();
            if (part.done) {
                const value = JSON.parse(Buffer.concat(chunks).toString('utf8'));
                return value;
            }
            const chunk = part.value;
            if (!(chunk instanceof Uint8Array)) {
                throw new Error('Invalid Cloudflare response stream.');
            }
            bytes += chunk.byteLength;
            if (bytes > 1_048_576) {
                throw new Error('Cloudflare response exceeds 1 MiB.');
            }
            chunks.push(chunk);
        }
        throw new Error('Cloudflare response exceeds the stream limit.');
    }
    finally {
        await reader.cancel();
    }
}
async function cloudflareWorkers(root, account) {
    const credentials = (0, boundary_1.record)(await (0, publishDiscoveryCommand_1.discoveryCommand)(root, 'wrangler', ['auth', 'token', '--json']));
    const result = (0, boundary_1.record)(await cloudflareRequest(`https://api.cloudflare.com/client/v4/accounts/${account}/workers/scripts`, cloudflareHeaders(credentials)));
    if (result['success'] !== true) {
        throw new Error('Cloudflare could not list Workers. Check account permissions.');
    }
    return (0, publishDiscovery_1.discoveryList)(result['result']).map((input) => {
        const name = (0, publishDiscovery_1.discoveryIdentifier)((0, boundary_1.record)(input)['id']);
        return { name, hosting: { provider: 'cloudflare-workers', accountId: account, project: name } };
    });
}
