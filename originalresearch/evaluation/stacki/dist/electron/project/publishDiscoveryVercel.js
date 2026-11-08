"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.vercelAccounts = vercelAccounts;
exports.vercelProjects = vercelProjects;
exports.vercelPages = vercelPages;
const boundary_1 = require("../../shared/core/boundary");
const publishDiscovery_1 = require("../../shared/properties/publishDiscovery");
const publishDiscoveryCommand_1 = require("./publishDiscoveryCommand");
async function vercelAccounts(root) {
    const teams = await vercelPages(root, '/v2/teams', 'teams', '');
    return teams.map((entry) => {
        const team = (0, boundary_1.record)(entry);
        return { id: (0, publishDiscovery_1.discoveryIdentifier)(team['id']), name: (0, publishDiscovery_1.discoveryLabel)(team['name']) };
    });
}
async function vercelProjects(root, account) {
    const values = await vercelPages(root, '/v9/projects', 'projects', account);
    return values.map((entry) => {
        const value = (0, boundary_1.record)(entry);
        const organizationId = (0, publishDiscovery_1.discoveryIdentifier)(value['accountId']);
        if (organizationId !== account) {
            throw new Error('Vercel returned a project from a different account.');
        }
        return {
            name: (0, publishDiscovery_1.discoveryLabel)(value['name']),
            hosting: { provider: 'vercel', organizationId, projectId: (0, publishDiscovery_1.discoveryIdentifier)(value['id']) },
        };
    });
}
async function vercelPages(root, endpoint, field, account) {
    const values = [];
    let cursor = '';
    for (let page = 0; page < publishDiscovery_1.DISCOVERY_LIMITS.pagesMax; page++) {
        const args = ['api', `${endpoint}?limit=100${cursor}`, '--method', 'GET', '--raw'];
        if (account) {
            args.push('--scope', account);
        }
        const data = (0, boundary_1.record)(await (0, publishDiscoveryCommand_1.discoveryCommand)(root, 'vercel', args));
        values.push(...(0, publishDiscovery_1.discoveryList)(data[field]));
        (0, publishDiscovery_1.discoveryList)(values);
        const pagination = (0, boundary_1.record)(data['pagination']);
        const next = pagination['next'];
        // Vercel uses JSON null for the end cursor; keep it out of the application model.
        if (next === null || next === undefined) {
            return values;
        }
        if (typeof next !== 'number' || !Number.isSafeInteger(next) || next < 0) {
            throw new Error('Invalid Vercel pagination cursor.');
        }
        const following = `&until=${next}`;
        if (following === cursor) {
            throw new Error('Vercel pagination did not advance.');
        }
        cursor = following;
    }
    throw new Error('Vercel has too many entries to list. Use manual configuration.');
}
