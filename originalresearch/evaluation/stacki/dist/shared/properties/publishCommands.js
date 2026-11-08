"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.scriptCommand = scriptCommand;
exports.hostingCommand = hostingCommand;
const assert_1 = require("../core/assert");
function scriptCommand(script) {
    (0, assert_1.assert)(script.length > 0, 'Publish script must be named');
    (0, assert_1.assert)(!script.startsWith('-'), 'Publish script cannot be an option');
    return { executable: 'npm', arguments: ['run', script], environment: {} };
}
function hostingCommand(hosting) {
    switch (hosting.provider) {
        case 'cloudflare':
            return {
                executable: 'wrangler',
                arguments: ['pages', 'deploy', hosting.directory, '--project-name', hosting.project, '--branch', hosting.branch, '--commit-dirty=true'],
                environment: { CLOUDFLARE_ACCOUNT_ID: hosting.accountId },
            };
        case 'cloudflare-workers':
            return {
                executable: 'wrangler',
                arguments: ['deploy', '--name', hosting.project],
                environment: { CLOUDFLARE_ACCOUNT_ID: hosting.accountId },
            };
        case 'vercel':
            return {
                executable: 'vercel',
                arguments: ['deploy', '--prod', '--yes'],
                environment: {
                    VERCEL_ORG_ID: hosting.organizationId,
                    VERCEL_PROJECT_ID: hosting.projectId,
                },
            };
        default: {
            const exhaustive = hosting;
            return exhaustive;
        }
    }
}
