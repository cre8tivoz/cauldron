"use strict";
// The git panel's IPC: the repository's state, branches with parked changes,
// history, commits, restores, and publishing to GitHub.
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerGitHandlers = registerGitHandlers;
const boundary_1 = require("../../shared/core/boundary");
const publishConfig_1 = require("../project/publishConfig");
const publishGitHub_1 = require("../project/publishGitHub");
const gitBranches_1 = require("../git/gitBranches");
const gitPull_1 = require("../git/gitPull");
const gitHistory = __importStar(require("../git/gitHistory"));
const gitCommitDiff_1 = require("../git/gitCommitDiff");
const gitSnapshot = __importStar(require("../git/gitSnapshot"));
const mainHelpers_1 = require("../lib/mainHelpers");
const nodeTools_1 = require("../lib/nodeTools");
const gitParking_1 = require("../git/gitParking");
function registerGitHandlers(host) {
    registerGitInfoHandler(host);
    registerGitGhStatusHandlers(host);
    registerGitUnparkHandlers(host);
    registerGitPublishHandler(host);
    registerGitPullHandler(host);
}
function registerGitInfoHandler({ ipcMain }) {
    ipcMain.handle('git:info', async (_event, projectPath) => {
        try {
            await (0, nodeTools_1.git)(projectPath, ['rev-parse', '--is-inside-work-tree']);
        }
        catch {
            return { isRepo: false };
        }
        const info = {
            isRepo: true,
            branch: '',
            branches: [],
            remote: undefined,
            dirty: false,
            ahead: 0,
            // Branches holding work that was left behind on the way out, so the
            // switcher can say where it is rather than making it a thing you have to
            // remember.
            parked: [],
        };
        info.parked = await (0, gitParking_1.readGitParked)(projectPath);
        Object.assign(info, await (0, gitParking_1.readGitIdentity)(projectPath));
        try {
            const listed = (await (0, nodeTools_1.git)(projectPath, ['branch', '--format=%(refname:short)'])).stdout
                .split('\n')
                .map((branch) => branch.trim())
                .filter(Boolean);
            // Git lists branches alphabetically, which puts the trunk wherever its
            // name happens to fall. But the trunk is not one branch among many — it
            // is the one you came from and the one you go back to, so it goes first
            // and the rest keep the order git gave them.
            const trunk = ['main', 'master'].find((branch) => listed.includes(branch));
            info.branches = trunk ? [trunk, ...listed.filter((branch) => branch !== trunk)] : listed;
            // Named as well as ordered. Git will delete the trunk as readily as any
            // other branch — `git branch -d main` succeeds the moment main is merged
            // into whatever you are standing on — and the branch everything comes back
            // to is not one to lose to a stray click.
            info.trunk = trunk || undefined;
        }
        catch {
            /* empty repo */
        }
        try {
            info.remote = (await (0, nodeTools_1.git)(projectPath, ['remote', 'get-url', 'origin'])).stdout.trim() || undefined;
        }
        catch {
            info.remote = undefined;
        }
        try {
            const out = (await (0, nodeTools_1.git)(projectPath, ['status', '--porcelain'])).stdout;
            // Porcelain v1 is "XY path" — two status columns, a space, then the path
            // (renames as "old -> new"). Don't trim the line before slicing: the
            // first column is a space for worktree-only changes.
            const lines = out.split('\n').filter((line) => line.trim());
            info.dirty = lines.length > 0;
            info.dirtyFiles = lines.slice(0, 50).map((line) => {
                const filePath = line.slice(3);
                const arrow = filePath.lastIndexOf(' -> ');
                return (arrow === -1 ? filePath : filePath.slice(arrow + 4)).replace(/^"|"$/g, '');
            });
        }
        catch {
            /* ignore */
        }
        // Without an upstream there's no count to give — and "0 ahead" would read
        // as "nothing to push" when in fact the branch has never been pushed at
        // all, so the two cases have to stay distinguishable.
        try {
            await (0, nodeTools_1.git)(projectPath, ['rev-parse', '--abbrev-ref', '@{upstream}']);
            info.hasUpstream = true;
        }
        catch {
            info.hasUpstream = false;
        }
        if (info.hasUpstream) {
            try {
                const counts = (await (0, nodeTools_1.git)(projectPath, ['rev-list', '--count', '--left-only', 'HEAD...@{upstream}'])).stdout.trim();
                info.ahead = parseInt(counts, 10) || 0;
            }
            catch {
                info.ahead = 0;
            }
        }
        return info;
    });
}
function registerGitGhStatusHandlers({ ipcMain }) {
    // Is the GitHub CLI usable? Checked when the publish dialog opens so a
    // missing or logged-out `gh` is stated up front, instead of surfacing as a
    // failure after the user has filled the form in.
    ipcMain.handle('git:ghStatus', async (_event, projectPath) => {
        try {
            await (0, nodeTools_1.run)('gh', ['--version'], projectPath);
        }
        catch {
            return { installed: false, authed: false };
        }
        try {
            // Writes its report to stderr and exits non-zero when logged out.
            const config = (0, publishConfig_1.readPublishConfig)(projectPath);
            const environment = await (0, publishGitHub_1.publishingGitEnvironment)(projectPath, config);
            const result = await (0, nodeTools_1.run)('gh', ['auth', 'status'], projectPath, { env: environment });
            const out = `${result.stdout}${result.stderr}`;
            const match = out.match(/(?:account|as)\s+([\w-]+)/i);
            return {
                installed: true,
                authed: true,
                user: config.githubAccount || (match ? (0, mainHelpers_1.capture)(match, 1) : undefined),
            };
        }
        catch {
            return { installed: true, authed: false };
        }
    });
    ipcMain.handle('git:init', async (_event, projectPath) => {
        await (0, nodeTools_1.git)(projectPath, ['init', '-b', 'main']);
        return { ok: true };
    });
    // Keep drafts on their original branches, including edits Git could carry across.
    ipcMain.handle('git:checkout', async (_event, { projectPath, branch, create }) => {
        const result = await (0, gitBranches_1.switchBranch)(nodeTools_1.git, {
            projectPath,
            branch,
            ...(0, boundary_1.definedFields)({ create }),
            park: (from) => (0, gitParking_1.parkBranch)(projectPath, from),
            unpark: (from) => (0, gitParking_1.unparkBranch)(projectPath, from),
        });
        if (!result.ok) {
            return result;
        }
        if (create || result.from === branch) {
            return { ...result, parkedFrom: undefined, restored: false };
        }
        // Only this destination's drafts come back; the source branch stays parked.
        const back = await (0, gitParking_1.unparkBranch)(projectPath, branch);
        return { ...result, parkedFrom: result.parked ? result.from : undefined, ...back };
    });
    ipcMain.handle('git:log', async (_event, payload) => (0, gitParking_1.readGitLog)(payload));
    ipcMain.handle('git:commitDiff', async (_event, payload) => (0, gitCommitDiff_1.readCommitDiff)(nodeTools_1.git, payload));
    // Every file in the project, with what has happened to each — the file
    // browser's list, and the same status the commit picker reads.
    ipcMain.handle('git:allFiles', async (_event, { projectPath }) => gitHistory.describeFiles(await gitHistory.allFiles(nodeTools_1.git, { projectPath })));
    ipcMain.handle('git:status', async (_event, { projectPath }) => gitHistory.describeFiles(await gitHistory.status(nodeTools_1.git, { projectPath })));
    ipcMain.handle('git:worktrees', async (_event, { projectPath }) => gitHistory.worktrees(nodeTools_1.git, { projectPath }));
    // Setting work aside and picking it back up, on their own. The switch has done
    // this internally for a while; a merge that finds unsaved work in its way needs
    // the same two steps, and the user is the one deciding to take them.
    ipcMain.handle('git:park', async (_event, { projectPath }) => {
        const branch = await (0, gitParking_1.currentBranch)(projectPath);
        const parked = await (0, gitParking_1.parkBranch)(projectPath, branch);
        return { ok: true, parked, branch: branch ?? undefined };
    });
}
function registerGitUnparkHandlers({ ipcMain }) {
    ipcMain.handle('git:unpark', async (_event, { projectPath }) => {
        const branch = await (0, gitParking_1.currentBranch)(projectPath);
        return (0, gitParking_1.unparkBranch)(projectPath, branch);
    });
    ipcMain.handle('git:merge', async (_event, { projectPath, branch }) => (0, gitBranches_1.mergeBranch)(nodeTools_1.git, { projectPath, branch }));
    // Finishing a merge the user has chosen their way through. The conflicting
    // files come back from git:merge with both versions; this applies the answers.
    ipcMain.handle('git:resolveMerge', async (_event, { projectPath, branch, choices }) => (0, gitBranches_1.resolveMerge)(nodeTools_1.git, (0, boundary_1.definedFields)({ projectPath, branch, choices })));
    ipcMain.handle('git:deleteBranch', async (_event, { projectPath, branch, force }) => (0, gitBranches_1.deleteBranch)(nodeTools_1.git, (0, boundary_1.definedFields)({ projectPath, branch, force })));
    ipcMain.handle('git:commit', async (_event, { projectPath, message, paths }) => gitSnapshot.commit(nodeTools_1.git, (0, boundary_1.definedFields)({ projectPath, message, paths })));
    ipcMain.handle('git:restoreFile', async (_event, { projectPath, ref, path: filePath }) => gitSnapshot.restoreFile(nodeTools_1.git, { projectPath, ref, path: filePath }));
    // `park` is handed in rather than imported: it lives here, over the stash, and
    // is the reason going back to an old version cannot lose what is on disk now.
    ipcMain.handle('git:restoreProject', async (_event, { projectPath, ref }) => {
        const branch = await (0, gitParking_1.currentBranch)(projectPath);
        return gitSnapshot.restoreProject(nodeTools_1.git, {
            projectPath,
            ref,
            park: () => (0, gitParking_1.parkBranch)(projectPath, branch),
        });
    });
    ipcMain.handle('git:push', async (_event, { projectPath, branch }) => {
        const environment = await (0, publishGitHub_1.publishingGitEnvironment)(projectPath, (0, publishConfig_1.readPublishConfig)(projectPath));
        await (0, nodeTools_1.git)(projectPath, ['push', '-u', 'origin', branch], {
            timeout: 120000,
            env: environment,
        });
        return { ok: true };
    });
}
function registerGitPullHandler({ ipcMain }) {
    ipcMain.handle('git:incoming', async (_event, payload) => {
        const environment = await (0, publishGitHub_1.publishingGitEnvironment)(payload.projectPath, (0, publishConfig_1.readPublishConfig)(payload.projectPath));
        return (0, gitPull_1.readIncomingCommits)((projectPath, args) => (0, nodeTools_1.git)(projectPath, args, { timeout: 30000, env: environment }), payload);
    });
    ipcMain.handle('git:pull', async (_event, payload) => {
        const environment = await (0, publishGitHub_1.publishingGitEnvironment)(payload.projectPath, (0, publishConfig_1.readPublishConfig)(payload.projectPath));
        return (0, gitPull_1.pullBranch)((projectPath, args) => (0, nodeTools_1.git)(projectPath, args, { timeout: 120000, env: environment }), payload);
    });
}
function registerGitPublishHandler({ ipcMain }) {
    ipcMain.handle('git:publish', async (_event, { projectPath, repoName, isPrivate }) => {
        try {
            await (0, nodeTools_1.run)('gh', ['--version'], projectPath);
        }
        catch {
            throw new Error('GitHub CLI (gh) is not installed. Install it from https://cli.github.com ' + 'and run `gh auth login`.');
        }
        const args = ['repo', 'create', repoName, isPrivate ? '--private' : '--public', '--source', '.', '--remote', 'origin', '--push'];
        const environment = await (0, publishGitHub_1.publishingGitEnvironment)(projectPath, (0, publishConfig_1.readPublishConfig)(projectPath));
        const result = await (0, nodeTools_1.run)('gh', args, projectPath, { timeout: 180000, env: environment });
        const output = result.stdout + result.stderr;
        // `gh` prints the new repo's URL; fall back to the remote it just set.
        let url = (output.match(/https:\/\/github\.com\/[^\s"']+/) || [])[0] || undefined;
        if (!url) {
            try {
                url = (await (0, nodeTools_1.git)(projectPath, ['remote', 'get-url', 'origin'])).stdout.trim() || undefined;
            }
            catch {
                /* no remote — caller just won't get a link */
            }
        }
        if (url) {
            url = url.replace(/[.,)]+$/, '').replace(/\.git$/, '');
        }
        return { ok: true, url, output };
    });
}
