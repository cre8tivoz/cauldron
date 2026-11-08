"use strict";
// Branch work the git panel does beyond the plain git commands: parking
// uncommitted changes when switching branches, the log, and the identity
// commits are made under.
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
exports.parkTag = void 0;
exports.isDirty = isDirty;
exports.parkedRef = parkedRef;
exports.parkBranch = parkBranch;
exports.unparkBranch = unparkBranch;
exports.currentBranch = currentBranch;
exports.readGitLog = readGitLog;
exports.readGitIdentity = readGitIdentity;
exports.readGitParked = readGitParked;
const boundary_1 = require("../../shared/core/boundary");
const gitHistory = __importStar(require("./gitHistory"));
const nodeTools_1 = require("../lib/nodeTools");
const projectExclusions_1 = require("../lib/projectExclusions");
// Work in progress, set aside under the branch it belongs to.
//
// Git will not switch branches over changes it would have to overwrite, and
// the usual advice — commit first — asks for a commit that only exists to
// make git cooperate. So the changes are put away against the branch being
// left, and taken back out when that branch is next opened. They are never
// lost and never travel to a branch they were not written on.
//
// The tag is what makes this safe: only a stash Stacki wrote is ever restored,
// so someone's own `git stash` is left alone.
// Tags already in people's stash lists name a detached HEAD `null`; the
// spelling stays so those are still found.
const parkTag = (branch) => `stacki:park:${branch ?? 'null'}`;
exports.parkTag = parkTag;
async function isDirty(projectPath) {
    const { stdout } = await (0, nodeTools_1.git)(projectPath, ['status', '--porcelain']);
    return stdout.trim().length > 0;
}
// The most recent parking for this branch, as a ref that is still valid right
// now — stash indices shift as entries come and go, so this is resolved
// immediately before it is used.
async function parkedRef(projectPath, branch) {
    const { stdout } = await (0, nodeTools_1.git)(projectPath, ['stash', 'list', '--format=%gd%x09%gs']);
    const tag = (0, exports.parkTag)(branch);
    for (const line of stdout.split('\n')) {
        const [ref, subject] = line.split('\t');
        if (ref && subject && subject.trim().endsWith(tag)) {
            return ref.trim();
        }
    }
    return undefined;
}
async function parkBranch(projectPath, branch) {
    await preserveIgnoredPaths(projectPath);
    if (!(await isDirty(projectPath))) {
        return false;
    }
    await (0, nodeTools_1.git)(projectPath, ['stash', 'push', '--include-untracked', '-m', (0, exports.parkTag)(branch)]);
    return true;
}
// Branches can disagree about .gitignore. Keep existing generated files ignored
// locally so a return trip cannot stash the other branch's runtime dependencies.
async function preserveIgnoredPaths(projectPath) {
    const { stdout } = await (0, nodeTools_1.git)(projectPath, ['ls-files', '--others', '--ignored', '--exclude-standard', '--directory', '-z']);
    const paths = stdout.split('\0').filter(Boolean);
    if (paths.length > 4096) {
        throw new Error('Too many ignored paths to preserve while switching branches');
    }
    // Shared Stacki metadata must remain versioned; only its known generated
    // directories belong in the local exclusions maintained by ensureExcluded.
    const ignoredPaths = paths.filter((entry) => !entry.startsWith('.stacki/'));
    if (!(0, projectExclusions_1.ensureExcluded)(projectPath, { ignoredPaths })) {
        throw new Error('Could not preserve generated files before switching branches');
    }
}
async function unparkBranch(projectPath, branch) {
    const ref = await parkedRef(projectPath, branch);
    if (!ref) {
        return { restored: false };
    }
    // Another tool may have edited the destination. Never apply or unwind a stash
    // over those edits: the recovery below is only safe on an initially clean tree.
    if (await isDirty(projectPath)) {
        return {
            restored: false,
            error: `Your work on "${branch}" is still parked because this branch has local changes.`,
        };
    }
    try {
        await (0, nodeTools_1.git)(projectPath, ['stash', 'pop', '--index', ref]);
        return { restored: true };
    }
    catch {
        // A pop that cannot apply leaves conflict markers in the files. That is a
        // reasonable state for someone at a terminal and a bad one for an editor
        // that will parse those files a moment later — the page would read as
        // broken markup. The tree goes back to the branch as committed, and the
        // work stays parked, which is the state it was already in. Safe because
        // the switch left the tree clean, so there is nothing else here to lose.
        try {
            await (0, nodeTools_1.git)(projectPath, ['reset', '--hard', 'HEAD']);
            await (0, nodeTools_1.git)(projectPath, ['clean', '-fd']);
        }
        catch {
            /* nothing better to try */
        }
        return {
            restored: false,
            error: `Your work on "${branch}" is still parked — it could not be put back automatically ` +
                'because the branch has changed underneath it. ' +
                'It is safe: recover it with `git stash list` and `git stash pop`.',
        };
    }
}
async function currentBranch(projectPath) {
    try {
        return (await (0, nodeTools_1.git)(projectPath, ['rev-parse', '--abbrev-ref', 'HEAD'])).stdout.trim();
    }
    catch {
        return undefined;
    }
}
// --- Reading history -------------------------------------------------------
//
// The panel gets files already described (see describeFile): "Home" rather
// than "src/pages/index.astro". Done here rather than in the renderer because
// this is the side that knows the project's shape, and because it keeps the
// panel about drawing rather than about interpreting paths.
async function readGitLog(payload) {
    const result = await gitHistory.log(nodeTools_1.git, (0, boundary_1.definedFields)(payload));
    const commits = result.commits.map((commit) => ({
        ...commit,
        files: commit.files === undefined ? undefined : gitHistory.describeFiles(commit.files),
    }));
    return { ...result, commits };
}
async function readGitIdentity(projectPath) {
    const identity = {
        branch: '',
        head: undefined,
        userEmail: undefined,
    };
    try {
        identity.branch = (await (0, nodeTools_1.git)(projectPath, ['rev-parse', '--abbrev-ref', 'HEAD'])).stdout.trim();
    }
    catch {
        identity.branch = '(no commits yet)';
    }
    try {
        // What HEAD actually points at. The history panel reloads when this moves,
        // which is how a commit made from the chip shows up in the timeline
        // without the panel having to know the chip exists.
        identity.head = (await (0, nodeTools_1.git)(projectPath, ['rev-parse', 'HEAD'])).stdout.trim();
    }
    catch {
        identity.head = undefined; // no commits yet
    }
    try {
        // Whose commits are "yours". Git records an author on every commit, and on
        // your own machine that is nearly always you — "Timothy Ricks changed the
        // hero" reads oddly about yourself.
        identity.userEmail = (await (0, nodeTools_1.git)(projectPath, ['config', 'user.email'])).stdout.trim() || undefined;
    }
    catch {
        identity.userEmail = undefined;
    }
    return identity;
}
async function readGitParked(projectPath) {
    try {
        const { stdout } = await (0, nodeTools_1.git)(projectPath, ['stash', 'list', '--format=%gs']);
        const tag = /stacki:park:(.+)$/;
        return [
            ...new Set(stdout
                .split('\n')
                .map((line) => (line.match(tag) || [])[1])
                .filter((branch) => branch !== undefined)
                .map((branch) => branch.trim())),
        ];
    }
    catch {
        return []; // No stashes, or not a repository yet.
    }
}
