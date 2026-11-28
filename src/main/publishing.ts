import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { loadDrafts } from './recovery';
import { buildSite, buildSiteAsync } from './quality';
import { packageSlug } from './projects';
import { childEnvForTools, resolveToolPath } from './runtime';

/**
 * Publishing (plan 5.1): show what changed, commit through the site's own Git
 * repository when asked, never automatically, and never while edits are pending.
 */

export type Change = { status: string; file: string };

export type RepoState = {
  isRepo: boolean;
  branch: string;
  changes: Change[];
  hasRemote: boolean;
  /**
   * The remote a push would go to: the branch's own upstream remote, else
   * "origin", else the only remote. Null when there is none, or several and
   * none chosen. Configured is not the same as reachable.
   */
  remote: string | null;
  lastCommit: string;
  /** Commits made locally that the upstream does not have yet. */
  unpushed: number;
};

type CommandOutput = {
  status: number | null;
  stdout: string;
  stderr: string;
  timedOut?: boolean;
  error?: Error;
};

function runCommandAsync(
  cmd: string,
  args: string[],
  options: { cwd: string; env: NodeJS.ProcessEnv; timeoutMs: number },
): Promise<CommandOutput> {
  return new Promise((resolve) => {
    const child = spawn(cmd, args, {
      cwd: options.cwd,
      env: options.env,
      stdio: ['ignore', 'pipe', 'pipe'],
      detached: process.platform !== 'win32',
    });
    let stdout = '';
    let stderr = '';
    let settled = false;
    let timedOut = false;
    let spawnError: Error | undefined;

    const finish = (status: number | null) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      child.stdout?.destroy();
      child.stderr?.destroy();
      resolve({ status, stdout, stderr, timedOut, error: spawnError });
    };

    const timer = setTimeout(() => {
      timedOut = true;
      try {
        if (process.platform !== 'win32' && child.pid) {
          process.kill(-child.pid, 'SIGTERM');
        } else {
          child.kill('SIGTERM');
        }
      } catch {
        child.kill('SIGTERM');
      }
      setTimeout(() => {
        try {
          if (process.platform !== 'win32' && child.pid) {
            process.kill(-child.pid, 'SIGKILL');
          } else if (child.exitCode === null) {
            child.kill('SIGKILL');
          }
        } catch {
          // Process already exited.
        }
      }, 2000).unref();
      finish(null);
    }, options.timeoutMs);

    child.stdout?.on('data', (d: Buffer) => {
      stdout += d.toString('utf8');
    });
    child.stderr?.on('data', (d: Buffer) => {
      stderr += d.toString('utf8');
    });
    child.on('error', (err) => {
      spawnError = err;
      finish(null);
    });
    child.on('close', (code) => {
      finish(code);
    });
  });
}

function git(root: string, args: string[]): CommandOutput {
  const res = spawnSync('git', args, {
    cwd: root,
    encoding: 'utf8',
    timeout: 60000,
    env: { ...process.env, GIT_TERMINAL_PROMPT: '0' },
  });
  return {
    status: res.status,
    stdout: res.stdout ?? '',
    stderr: res.stderr ?? '',
    error: res.error,
  };
}

function gitAsync(root: string, args: string[]): Promise<CommandOutput> {
  return runCommandAsync('git', args, {
    cwd: root,
    timeoutMs: 60000,
    env: { ...process.env, GIT_TERMINAL_PROMPT: '0' },
  });
}

/**
 * Reads `git status --porcelain -z`. With -z Git never quotes names, so spaces
 * and non-ASCII names come through as they are, and a rename or copy is
 * followed by its original name as a separate entry.
 */
export function parseStatus(output: string): Change[] {
  const entries = output.split('\0');
  const changes: Change[] = [];
  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    if (entry.length < 4) continue;
    const status = entry.slice(0, 2);
    const file = entry.slice(3);
    if (status.includes('R') || status.includes('C')) {
      const from = entries[i + 1] ?? '';
      i++;
      changes.push({
        status: status.trim(),
        file: from ? `${from} → ${file}` : file,
      });
    } else {
      changes.push({ status: status.trim(), file });
    }
  }
  return changes;
}

function pushRemoteKeys(branch: string): string[] {
  return branch && branch !== 'HEAD'
    ? [
        `branch.${branch}.pushRemote`,
        'remote.pushDefault',
        `branch.${branch}.remote`,
      ]
    : ['remote.pushDefault'];
}

function pickRemoteFromConfigs(
  configuredNames: Array<string | null>,
  remotes: string[],
): string | null {
  for (const name of configuredNames) {
    if (name && remotes.includes(name)) return name;
  }
  if (remotes.includes('origin')) return 'origin';
  return remotes.length === 1 ? remotes[0] : null;
}

const EMPTY_REPO_STATE: RepoState = {
  isRepo: false,
  branch: '',
  changes: [],
  hasRemote: false,
  remote: null,
  lastCommit: '',
  unpushed: 0,
};

function isGitRootMatch(
  root: string,
  inside: CommandOutput,
  top: CommandOutput,
): boolean {
  return (
    inside.status === 0 &&
    Boolean(top.stdout) &&
    fs.realpathSync(top.stdout.trim()) === fs.realpathSync(root)
  );
}

/** The remote a push would use (see RepoState.remote). */
function pushRemote(
  root: string,
  branch: string,
  remotes: string[],
): string | null {
  const configuredNames = pushRemoteKeys(branch).map((key) => {
    const configured = git(root, ['config', key]);
    return configured.status === 0 ? configured.stdout.trim() : null;
  });
  return pickRemoteFromConfigs(configuredNames, remotes);
}

async function pushRemoteAsync(
  root: string,
  branch: string,
  remotes: string[],
): Promise<string | null> {
  const configuredNames: Array<string | null> = [];
  for (const key of pushRemoteKeys(branch)) {
    const configured = await gitAsync(root, ['config', key]);
    configuredNames.push(
      configured.status === 0 ? configured.stdout.trim() : null,
    );
  }
  return pickRemoteFromConfigs(configuredNames, remotes);
}

function assembleRepoState(
  statusOut: string,
  branchOut: string,
  remotesOut: string,
  lastCommitOut: string,
  aheadStatus: number | null,
  aheadStdout: string,
  remote: string | null,
): RepoState {
  const changes = parseStatus(statusOut);
  const branch = branchOut.trim();
  const remotes = remotesOut.trim();
  const lastCommit = lastCommitOut.trim();
  const counted = Number.parseInt(aheadStdout.trim(), 10);
  const unpushed = aheadStatus === 0 && Number.isFinite(counted) ? counted : 0;
  return {
    isRepo: true,
    branch,
    changes,
    hasRemote: remotes !== '',
    remote,
    lastCommit,
    unpushed,
  };
}

export function repoState(root: string): RepoState {
  const inside = git(root, ['rev-parse', '--is-inside-work-tree']);
  const top = git(root, ['rev-parse', '--show-toplevel']);
  if (!isGitRootMatch(root, inside, top)) return { ...EMPTY_REPO_STATE };

  const status = git(root, ['status', '--porcelain', '-z']);
  const branchRes = git(root, ['rev-parse', '--abbrev-ref', 'HEAD']);
  const branch = branchRes.stdout.trim();
  const remotesRes = git(root, ['remote']);
  const remoteList = remotesRes.stdout.trim().split('\n').filter(Boolean);
  const lastCommitRes = git(root, ['log', '-1', '--pretty=%s']);
  const upstream = git(root, [
    'rev-parse',
    '--abbrev-ref',
    '--symbolic-full-name',
    '@{u}',
  ]);
  const ahead =
    upstream.status === 0
      ? git(root, ['rev-list', '--count', '@{u}..HEAD'])
      : remoteList.length > 0 && branch !== 'HEAD'
        ? git(root, ['rev-list', '--count', 'HEAD'])
        : { status: 1, stdout: '', stderr: '' };

  return assembleRepoState(
    status.stdout,
    branchRes.stdout,
    remotesRes.stdout,
    lastCommitRes.stdout,
    ahead.status,
    ahead.stdout,
    pushRemote(root, branch, remoteList),
  );
}

export async function repoStateAsync(root: string): Promise<RepoState> {
  const [inside, top] = await Promise.all([
    gitAsync(root, ['rev-parse', '--is-inside-work-tree']),
    gitAsync(root, ['rev-parse', '--show-toplevel']),
  ]);
  if (!isGitRootMatch(root, inside, top)) return { ...EMPTY_REPO_STATE };

  const [status, branchRes, remotesRes, lastCommitRes, upstream] =
    await Promise.all([
      gitAsync(root, ['status', '--porcelain', '-z']),
      gitAsync(root, ['rev-parse', '--abbrev-ref', 'HEAD']),
      gitAsync(root, ['remote']),
      gitAsync(root, ['log', '-1', '--pretty=%s']),
      gitAsync(root, [
        'rev-parse',
        '--abbrev-ref',
        '--symbolic-full-name',
        '@{u}',
      ]),
    ]);
  const branch = branchRes.stdout.trim();
  const remoteList = remotesRes.stdout.trim().split('\n').filter(Boolean);
  const [ahead, resolvedRemote] = await Promise.all([
    upstream.status === 0
      ? gitAsync(root, ['rev-list', '--count', '@{u}..HEAD'])
      : remoteList.length > 0 && branch !== 'HEAD'
        ? gitAsync(root, ['rev-list', '--count', 'HEAD'])
        : Promise.resolve({ status: 1, stdout: '', stderr: '' }),
    pushRemoteAsync(root, branch, remoteList),
  ]);

  return assembleRepoState(
    status.stdout,
    branchRes.stdout,
    remotesRes.stdout,
    lastCommitRes.stdout,
    ahead.status,
    ahead.stdout,
    resolvedRemote,
  );
}

/** Rejects leading hyphens and whitespace/control chars so git remote/branch names cannot inject CLI flags. */
export function isSafeGitRefArg(value: string): boolean {
  if (!value || value.startsWith('-') || /\s/.test(value)) return false;
  for (let i = 0; i < value.length; i += 1) {
    const code = value.charCodeAt(i);
    if (code <= 0x1f || code === 0x7f) return false;
  }
  return true;
}

export type PublishResult =
  | {
      ok: true;
      committed: number;
      pushed: boolean;
      /** What happened to the local commit, on its own. */
      commit: string;
      /** What happened to the upload, on its own. */
      upload: string;
      message: string;
    }
  | {
      ok: false;
      problem: string;
      details?: string;
      /** Files committed before the upload failed, when that is the case. */
      committed?: number;
    };

type PublishPrecheck =
  | { ok: true; state: RepoState; commitMessage: string }
  | { ok: false; result: PublishResult };

function checkPublishPreconditions(
  root: string,
  state: RepoState,
  options: { message: string; unsavedBuffers?: number },
): PublishPrecheck {
  if (!state.isRepo) {
    return {
      ok: false,
      result: {
        ok: false,
        problem:
          'This site is not a Git repository, so there is nothing to publish to.',
      },
    };
  }
  const unsaved = options.unsavedBuffers ?? 0;
  if (unsaved > 0) {
    return {
      ok: false,
      result: {
        ok: false,
        problem: `There ${unsaved === 1 ? 'is' : 'are'} ${unsaved} unsaved edit${unsaved === 1 ? '' : 's'} still in the editor. Save or discard ${unsaved === 1 ? 'it' : 'them'} first.`,
      },
    };
  }
  const drafts = loadDrafts(root);
  if (drafts.problem) {
    return { ok: false, result: { ok: false, problem: drafts.problem } };
  }
  if (drafts.drafts.length > 0) {
    return {
      ok: false,
      result: {
        ok: false,
        problem: `There ${drafts.drafts.length === 1 ? 'is' : 'are'} ${drafts.drafts.length} unsaved edit${drafts.drafts.length === 1 ? '' : 's'}. Save or discard them first.`,
      },
    };
  }
  if (state.changes.length === 0 && state.unpushed === 0) {
    return {
      ok: false,
      result: {
        ok: false,
        problem: 'Nothing has changed since the last commit.',
      },
    };
  }
  const commitMessage = options.message.trim();
  if (state.changes.length > 0 && commitMessage === '') {
    return {
      ok: false,
      result: {
        ok: false,
        problem: 'A commit needs a message describing the change.',
      },
    };
  }
  return { ok: true, state, commitMessage };
}

function finalizePublishNoPush(
  committed: number,
  state: RepoState,
  pushRequested: boolean,
): PublishResult {
  const commitSummary =
    committed > 0
      ? `Committed ${committed} file(s) locally.`
      : state.unpushed > 0
        ? `${state.unpushed} commit(s) were already made locally; nothing new to commit.`
        : 'Nothing new to commit.';
  if (!pushRequested) {
    const upload =
      committed > 0 || state.unpushed > 0
        ? 'Not uploaded: you asked for a commit only.'
        : 'Not uploaded.';
    return {
      ok: true,
      committed,
      pushed: false,
      commit: commitSummary,
      upload,
      message: `${commitSummary} ${upload}`,
    };
  }
  const upload = 'Not uploaded: this site has no remote.';
  return {
    ok: true,
    committed,
    pushed: false,
    commit: commitSummary,
    upload,
    message: `${commitSummary} ${upload}`,
  };
}

function commitSummaryOf(committed: number, unpushed: number): string {
  if (committed > 0) return `Committed ${committed} file(s) locally.`;
  if (unpushed > 0)
    return `${unpushed} commit(s) were already made locally; nothing new to commit.`;
  return 'Nothing new to commit.';
}

async function runPublishWith(
  root: string,
  options: { message: string; push: boolean; unsavedBuffers?: number },
  getState: (r: string) => Promise<RepoState> | RepoState,
  runGit: (r: string, args: string[]) => Promise<CommandOutput> | CommandOutput,
): Promise<PublishResult> {
  const state = await getState(root);
  const precheck = checkPublishPreconditions(root, state, options);
  if (!precheck.ok) return precheck.result;

  let committed = 0;
  if (state.changes.length > 0) {
    const add = await runGit(root, ['add', '-A']);
    if (add.status !== 0) {
      return {
        ok: false,
        problem: 'The changed files could not be staged.',
        details: add.stderr,
      };
    }
    const commit = await runGit(root, ['commit', '-m', precheck.commitMessage]);
    if (commit.status !== 0) {
      return {
        ok: false,
        problem: 'The commit did not go through.',
        details: `${commit.stdout}${commit.stderr}`.trim().slice(-600),
      };
    }
    committed = state.changes.length;
  }

  if (!options.push || !state.hasRemote) {
    return finalizePublishNoPush(committed, state, options.push);
  }

  const upstream = await runGit(root, [
    'rev-parse',
    '--abbrev-ref',
    '--symbolic-full-name',
    '@{u}',
  ]);
  const remote = state.remote;
  if (upstream.status !== 0 && (!remote || state.branch === 'HEAD')) {
    return {
      ok: false,
      problem:
        'Committed locally. Choose a remote and branch in Git before pushing.',
      committed,
    };
  }
  if (
    upstream.status !== 0 &&
    (!isSafeGitRefArg(remote!) || !isSafeGitRefArg(state.branch))
  ) {
    return {
      ok: false,
      problem:
        'Committed locally. The configured Git remote or branch name is not safe to push automatically.',
      committed,
    };
  }
  const push = await runGit(
    root,
    upstream.status === 0
      ? ['push']
      : ['push', '--set-upstream', '--', remote!, state.branch],
  );
  if (push.status !== 0) {
    return {
      ok: false,
      problem:
        committed > 0
          ? 'The commit is in place locally, but the upload failed.'
          : 'The upload failed. The commit was already made earlier and is still local.',
      details: `${push.stdout}${push.stderr}`.trim().slice(-600),
      committed,
    };
  }

  const commitSummary = commitSummaryOf(committed, state.unpushed);
  const upload = `Uploaded to ${upstream.stdout.trim() || `${remote}/${state.branch}`}.`;
  return {
    ok: true,
    committed,
    pushed: true,
    commit: commitSummary,
    upload,
    message: `${commitSummary} ${upload}`,
  };
}

export function publish(
  root: string,
  options: { message: string; push: boolean; unsavedBuffers?: number },
): PublishResult {
  const state = repoState(root);
  const precheck = checkPublishPreconditions(root, state, options);
  if (!precheck.ok) return precheck.result;

  let committed = 0;
  if (state.changes.length > 0) {
    const add = git(root, ['add', '-A']);
    if (add.status !== 0) {
      return {
        ok: false,
        problem: 'The changed files could not be staged.',
        details: add.stderr,
      };
    }
    const commit = git(root, ['commit', '-m', precheck.commitMessage]);
    if (commit.status !== 0) {
      return {
        ok: false,
        problem: 'The commit did not go through.',
        details: `${commit.stdout}${commit.stderr}`.trim().slice(-600),
      };
    }
    committed = state.changes.length;
  }

  if (!options.push || !state.hasRemote) {
    return finalizePublishNoPush(committed, state, options.push);
  }

  const upstream = git(root, [
    'rev-parse',
    '--abbrev-ref',
    '--symbolic-full-name',
    '@{u}',
  ]);
  const remote = state.remote;
  if (upstream.status !== 0 && (!remote || state.branch === 'HEAD')) {
    return {
      ok: false,
      problem:
        'Committed locally. Choose a remote and branch in Git before pushing.',
      committed,
    };
  }
  if (
    upstream.status !== 0 &&
    (!isSafeGitRefArg(remote!) || !isSafeGitRefArg(state.branch))
  ) {
    return {
      ok: false,
      problem:
        'Committed locally. The configured Git remote or branch name is not safe to push automatically.',
      committed,
    };
  }
  const push = git(
    root,
    upstream.status === 0
      ? ['push']
      : ['push', '--set-upstream', '--', remote!, state.branch],
  );
  if (push.status !== 0) {
    return {
      ok: false,
      problem:
        committed > 0
          ? 'The commit is in place locally, but the upload failed.'
          : 'The upload failed. The commit was already made earlier and is still local.',
      details: `${push.stdout}${push.stderr}`.trim().slice(-600),
      committed,
    };
  }

  const commitSummary = commitSummaryOf(committed, state.unpushed);
  const upload = `Uploaded to ${upstream.stdout.trim() || `${remote}/${state.branch}`}.`;
  return {
    ok: true,
    committed,
    pushed: true,
    commit: commitSummary,
    upload,
    message: `${commitSummary} ${upload}`,
  };
}

export function publishAsync(
  root: string,
  options: { message: string; push: boolean; unsavedBuffers?: number },
): Promise<PublishResult> {
  return runPublishWith(root, options, repoStateAsync, gitAsync);
}

export type StaticExportResult = {
  ok: boolean;
  distPath?: string;
  problem?: string;
  log?: string;
};

function formatStaticExportResult(build: {
  ok: boolean;
  log: string;
  dist: string;
}): StaticExportResult {
  if (!build.ok || !fs.existsSync(build.dist)) {
    return {
      ok: false,
      problem: 'Static build failed.',
      log: build.log,
    };
  }
  return {
    ok: true,
    distPath: build.dist,
    log: build.log,
  };
}

export function exportStaticSite(root: string): StaticExportResult {
  return formatStaticExportResult(buildSite(root));
}

export async function exportStaticSiteAsync(
  root: string,
): Promise<StaticExportResult> {
  return formatStaticExportResult(await buildSiteAsync(root));
}

export type CloudflareDeployResult = {
  ok: boolean;
  url?: string;
  note?: string;
  isAuthError?: boolean;
  createdFiles?: string[];
  problem?: string;
  log?: string;
};

export function parseCloudflarePagesUrl(output: string): string | undefined {
  return output.match(
    /https:\/\/[a-z0-9.-]+\.pages\.dev(?:\/[^\s)'"`]*)?/i,
  )?.[0];
}

export function classifyWranglerFailure(
  output: string,
  status: number | null,
  timedOut?: boolean,
  error?: Error,
): { isAuthError: boolean; problem: string } {
  if (timedOut) {
    return {
      isAuthError: false,
      problem:
        'Cloudflare Pages deployment timed out before Wrangler finished.',
    };
  }
  const cleanOutput = output.trim();
  if (
    /CLOUDFLARE_API_TOKEN|wrangler login|not logged in|authentication error|unauthorized|invalid api token|missing entry for api token|did not find any accounts|\bcode:\s*10000\b/i.test(
      cleanOutput,
    )
  ) {
    return {
      isAuthError: true,
      problem:
        'Cloudflare Pages deployment requires Wrangler login (`npx wrangler login`) or a valid CLOUDFLARE_API_TOKEN.',
    };
  }
  if (
    (error as NodeJS.ErrnoException | undefined)?.code === 'ENOENT' ||
    /could not determine executable|wrangler: command not found|wrangler.*not found/i.test(
      cleanOutput,
    )
  ) {
    return {
      isAuthError: false,
      problem:
        'Wrangler CLI could not be found. Install wrangler before deploying to Cloudflare Pages.',
    };
  }

  const errorLines = cleanOutput
    .split('\n')
    .map((line) => line.replace(/^[\s✘✕*─]+/, '').trim())
    .filter((line) => line && !line.startsWith('🪵') && !line.startsWith('⛅'));
  const concise =
    errorLines.find((line) => /\[ERROR\]|^error[:\s]/i.test(line)) ??
    errorLines[errorLines.length - 1];
  const shortReason = concise ? concise.slice(0, 220) : '';
  return {
    isAuthError: false,
    problem: shortReason
      ? `Cloudflare Pages deployment failed: ${shortReason}`
      : `Cloudflare Pages deployment failed (exit code ${status ?? 'unknown'}).`,
  };
}

function isMissingCloudflareProjectError(output: string): boolean {
  return /project not found|cannot be run in a non-interactive context/i.test(
    output,
  );
}

function buildWranglerCommand(
  args: string[],
  env: NodeJS.ProcessEnv,
): { cmd: string; args: string[]; env: NodeJS.ProcessEnv } {
  const wranglerBin = resolveToolPath('wrangler');
  const npxBin = resolveToolPath('npx') ?? 'npx';
  return {
    cmd: wranglerBin ?? npxBin,
    args: wranglerBin ? args : ['--no-install', 'wrangler', ...args],
    env,
  };
}

function prepareCloudflareDeployStep(
  root: string,
  build: { ok: boolean; log: string; dist: string },
  projectName?: string,
  options: { writeWranglerConfig?: boolean } = {},
):
  | { ok: false; result: CloudflareDeployResult }
  | {
      ok: true;
      slug: string;
      cmd: string;
      args: string[];
      createCmd: string;
      createArgs: string[];
      env: NodeJS.ProcessEnv;
      createdFiles: string[];
      buildLog: string;
    } {
  if (!build.ok) {
    return {
      ok: false,
      result: {
        ok: false,
        problem: 'Static build failed before Cloudflare deployment.',
        log: build.log,
      },
    };
  }

  const outRel = path.relative(root, build.dist) || 'dist';
  const indexHtml = path.join(build.dist, 'index.html');
  if (!fs.existsSync(indexHtml)) {
    return {
      ok: false,
      result: {
        ok: false,
        problem: `Build output missing ${path.join(outRel, 'index.html')}.`,
        log: build.log,
      },
    };
  }

  let slug = projectName
    ? packageSlug(projectName)
    : path
        .basename(root)
        .toLowerCase()
        .replace(/[^a-z0-9-]/g, '-');
  if (!slug) slug = 'cauldron-site';

  const createdFiles: string[] = [];
  if (options.writeWranglerConfig) {
    const wranglerFile = path.join(root, 'wrangler.toml');
    if (!fs.existsSync(wranglerFile)) {
      try {
        fs.writeFileSync(
          wranglerFile,
          `name = "${slug}"\ncompatibility_date = "2026-11-09"\npages_build_output_dir = "${outRel.replace(/\\/g, '/')}"\n`,
          'utf8',
        );
        createdFiles.push('wrangler.toml');
      } catch (err) {
        console.error('[publishing] Failed to write wrangler.toml:', err);
      }
    }
  }

  const env = childEnvForTools({
    ...process.env,
    CI: '1',
    FORCE_COLOR: '0',
    NO_COLOR: '1',
  });
  const deployCmd = buildWranglerCommand(
    ['pages', 'deploy', outRel, '--project-name', slug, '--branch', 'main'],
    env,
  );
  const createCmd = buildWranglerCommand(
    ['pages', 'project', 'create', slug, '--production-branch', 'main'],
    env,
  );

  return {
    ok: true,
    slug,
    cmd: deployCmd.cmd,
    args: deployCmd.args,
    createCmd: createCmd.cmd,
    createArgs: createCmd.args,
    env,
    createdFiles,
    buildLog: build.log,
  };
}

function finalizeCloudflareDeploy(
  deployResult: CommandOutput | null,
  createdFiles: string[],
  buildLog: string,
): CloudflareDeployResult {
  const output =
    `${deployResult?.stdout ?? ''}\n${deployResult?.stderr ?? ''}`.trim();

  if (!deployResult || deployResult.status !== 0 || deployResult.error) {
    const details = output || deployResult?.error?.message || '';
    console.error(
      `[publishing] Cloudflare Pages deployment failed:${details ? `\n${details}` : ''}`,
    );
    const classified = classifyWranglerFailure(
      details,
      deployResult?.status ?? null,
      deployResult?.timedOut,
      deployResult?.error,
    );
    return {
      ok: false,
      isAuthError: classified.isAuthError,
      ...(createdFiles.length > 0 ? { createdFiles } : {}),
      problem: classified.problem,
      log: `${buildLog}\n${details}`.trim(),
    };
  }

  const url = parseCloudflarePagesUrl(output);
  if (!url) {
    return {
      ok: true,
      url: undefined,
      note: "Deployed, but Cloudflare didn't report the address — check your Cloudflare dashboard.",
      ...(createdFiles.length > 0 ? { createdFiles } : {}),
      log:
        output || 'Deployed to Cloudflare Pages (no URL in Wrangler output).',
    };
  }

  return {
    ok: true,
    url,
    ...(createdFiles.length > 0 ? { createdFiles } : {}),
    log: output || `Site deployed to Cloudflare Pages: ${url}`,
  };
}

function runSyncWrangler(
  cmd: string,
  args: string[],
  cwd: string,
  env: NodeJS.ProcessEnv,
): CommandOutput | null {
  try {
    const res = spawnSync(cmd, args, {
      cwd,
      env,
      encoding: 'utf8',
      timeout: 120000,
    });
    return {
      status: res.status,
      stdout: res.stdout ?? '',
      stderr: res.stderr ?? '',
      error: res.error,
    };
  } catch (err) {
    console.error('[publishing] Cloudflare deployment process failed:', err);
    return null;
  }
}

function shouldCreateCloudflareProject(result: CommandOutput | null): boolean {
  if (!result || (result.status === 0 && !result.error)) return false;
  const combined =
    `${result.stdout}\n${result.stderr}\n${result.error?.message ?? ''}`.trim();
  return isMissingCloudflareProjectError(combined);
}

export function deployCloudflarePages(
  root: string,
  projectName?: string,
  options: { writeWranglerConfig?: boolean } = {},
): CloudflareDeployResult {
  const build = buildSite(root);
  const step = prepareCloudflareDeployStep(root, build, projectName, options);
  if (!step.ok) return step.result;

  let deployResult = runSyncWrangler(step.cmd, step.args, root, step.env);
  if (shouldCreateCloudflareProject(deployResult)) {
    const createResult = runSyncWrangler(
      step.createCmd,
      step.createArgs,
      root,
      step.env,
    );
    if (createResult && createResult.status === 0 && !createResult.error) {
      deployResult = runSyncWrangler(step.cmd, step.args, root, step.env);
    } else if (createResult) {
      deployResult = createResult;
    }
  }
  return finalizeCloudflareDeploy(
    deployResult,
    step.createdFiles,
    step.buildLog,
  );
}

export async function deployCloudflarePagesAsync(
  root: string,
  projectName?: string,
  options: {
    writeWranglerConfig?: boolean;
    runner?: (
      cmd: string,
      args: string[],
      opts: { cwd: string; env: NodeJS.ProcessEnv; timeoutMs: number },
    ) => Promise<CommandOutput>;
  } = {},
): Promise<CloudflareDeployResult> {
  const build = await buildSiteAsync(root);
  const step = prepareCloudflareDeployStep(root, build, projectName, options);
  if (!step.ok) return step.result;

  const runner = options.runner ?? runCommandAsync;
  const runOpts = { cwd: root, env: step.env, timeoutMs: 120000 };
  let deployResult = await runner(step.cmd, step.args, runOpts);
  if (shouldCreateCloudflareProject(deployResult)) {
    const createResult = await runner(step.createCmd, step.createArgs, runOpts);
    if (createResult.status === 0 && !createResult.error) {
      deployResult = await runner(step.cmd, step.args, runOpts);
    } else {
      deployResult = createResult;
    }
  }
  return finalizeCloudflareDeploy(
    deployResult,
    step.createdFiles,
    step.buildLog,
  );
}

export type CommandRunner = (
  cmd: string,
  args: string[],
  opts: { cwd: string; env: NodeJS.ProcessEnv; timeoutMs: number },
) => Promise<CommandOutput>;

function slugForSite(root: string, projectName?: string): string {
  const raw = projectName
    ? packageSlug(projectName)
    : path
        .basename(root)
        .toLowerCase()
        .replace(/[^a-z0-9-]/g, '-');
  return raw || 'cauldron-site';
}

function validateBuiltDist(
  root: string,
  build: { ok: boolean; log: string; dist: string },
  hostLabel: string,
):
  | { ok: true; outRel: string }
  | { ok: false; result: CloudflareDeployResult } {
  if (!build.ok) {
    return {
      ok: false,
      result: {
        ok: false,
        problem: `Static build failed before ${hostLabel} deployment.`,
        log: build.log,
      },
    };
  }
  const outRel = path.relative(root, build.dist) || 'dist';
  if (!fs.existsSync(path.join(build.dist, 'index.html'))) {
    return {
      ok: false,
      result: {
        ok: false,
        problem: `Build output missing ${path.join(outRel, 'index.html')}.`,
        log: build.log,
      },
    };
  }
  return { ok: true, outRel };
}

function summarizeCliError(
  output: string,
  status: number | null,
  hostLabel: string,
): string {
  const errorLines = output
    .split('\n')
    .map((line) => line.replace(/^[\s✘✕*─!>]+/, '').trim())
    .filter(Boolean);
  const concise =
    errorLines.find((line) => /^error[:\s]/i.test(line)) ??
    errorLines[errorLines.length - 1];
  const shortReason = concise ? concise.slice(0, 220) : '';
  return shortReason
    ? `${hostLabel} deployment failed: ${shortReason}`
    : `${hostLabel} deployment failed (exit code ${status ?? 'unknown'}).`;
}

export function parseVercelUrl(output: string): string | undefined {
  const aliased = output.match(
    /Aliased\s+(https:\/\/[a-z0-9.-]+\.vercel\.app(?:\/[^\s)'"`]*)?)/i,
  )?.[1];
  if (aliased) return aliased;
  const production = output.match(
    /Production\s+(https:\/\/[a-z0-9.-]+\.vercel\.app(?:\/[^\s)'"`]*)?)/i,
  )?.[1];
  if (production) return production;
  return output.match(
    /https:\/\/[a-z0-9.-]+\.vercel\.app(?:\/[^\s)'"`]*)?/i,
  )?.[0];
}

export function classifyVercelFailure(
  output: string,
  status: number | null,
  timedOut?: boolean,
  error?: Error,
): { isAuthError: boolean; problem: string } {
  if (timedOut) {
    return {
      isAuthError: false,
      problem: 'Vercel deployment timed out before Vercel CLI finished.',
    };
  }
  const cleanOutput = output.trim();
  if (
    /no existing credentials|not logged in|vercel login|VERCEL_TOKEN|invalid token|not authorized|unauthorized/i.test(
      cleanOutput,
    )
  ) {
    return {
      isAuthError: true,
      problem:
        'Vercel deployment requires login (`npx vercel login`) or a valid VERCEL_TOKEN.',
    };
  }
  if (
    (error as NodeJS.ErrnoException | undefined)?.code === 'ENOENT' ||
    /could not determine executable|vercel: command not found|vercel.*not found/i.test(
      cleanOutput,
    )
  ) {
    return {
      isAuthError: false,
      problem:
        'Vercel CLI could not be found. Install vercel before deploying to Vercel.',
    };
  }
  return {
    isAuthError: false,
    problem: summarizeCliError(cleanOutput, status, 'Vercel'),
  };
}

export async function deployVercelAsync(
  root: string,
  projectName?: string,
  options: { runner?: CommandRunner } = {},
): Promise<CloudflareDeployResult> {
  const build = await buildSiteAsync(root);
  const valid = validateBuiltDist(root, build, 'Vercel');
  if (!valid.ok) return valid.result;

  const slug = slugForSite(root, projectName);
  const env = childEnvForTools({
    ...process.env,
    CI: '1',
    VERCEL_TELEMETRY_DISABLED: '1',
    FORCE_COLOR: '0',
    NO_COLOR: '1',
  });
  const vercelBin = resolveToolPath('vercel');
  const npxBin = resolveToolPath('npx') ?? 'npx';
  const runner = options.runner ?? runCommandAsync;

  const stagingParent = fs.mkdtempSync(
    path.join(os.tmpdir(), 'cauldron-vercel-'),
  );
  const stagingDir = path.join(stagingParent, slug);
  try {
    fs.cpSync(build.dist, stagingDir, { recursive: true });
    const deployArgs = ['deploy', stagingDir, '--prod', '--yes'];
    const cmd = vercelBin ?? npxBin;
    const args = vercelBin
      ? deployArgs
      : ['--no-install', 'vercel', ...deployArgs];
    const deployResult = await runner(cmd, args, {
      cwd: stagingParent,
      env,
      timeoutMs: 180000,
    });
    const output = `${deployResult.stdout}\n${deployResult.stderr}`.trim();
    if (deployResult.status !== 0 || deployResult.error) {
      const details = output || deployResult.error?.message || '';
      console.error(
        `[publishing] Vercel deployment failed:${details ? `\n${details}` : ''}`,
      );
      const classified = classifyVercelFailure(
        details,
        deployResult.status,
        deployResult.timedOut,
        deployResult.error,
      );
      return {
        ok: false,
        isAuthError: classified.isAuthError,
        problem: classified.problem,
        log: `${build.log}\n${details}`.trim(),
      };
    }

    const url = parseVercelUrl(output);
    return {
      ok: true,
      url,
      ...(url
        ? {}
        : {
            note: "Deployed, but Vercel didn't report the address — check your Vercel dashboard.",
          }),
      log:
        output ||
        (url ? `Site deployed to Vercel: ${url}` : 'Deployed to Vercel.'),
    };
  } finally {
    fs.rmSync(stagingParent, { recursive: true, force: true });
  }
}

export function parseGitHubRepoFromRemote(remoteUrl: string): string | null {
  const trimmed = remoteUrl.trim();
  const httpsMatch = trimmed.match(
    /^https?:\/\/github\.com\/([^/\s]+\/[^/\s]+?)(?:\.git)?\/?$/i,
  );
  if (httpsMatch) return httpsMatch[1];
  const sshMatch = trimmed.match(
    /^git@github\.com:([^/\s]+\/[^/\s]+?)(?:\.git)?$/i,
  );
  return sshMatch ? sshMatch[1] : null;
}

export function parseGitHubPagesUrl(output: string): string | undefined {
  return output.match(
    /https:\/\/[a-z0-9.-]+\.github\.io(?:\/[^\s)'"`]*)?/i,
  )?.[0];
}

export function classifyGitHubPagesFailure(
  output: string,
  status: number | null,
  timedOut?: boolean,
  error?: Error,
): { isAuthError: boolean; problem: string } {
  if (timedOut) {
    return {
      isAuthError: false,
      problem: 'GitHub Pages deployment timed out before completion.',
    };
  }
  const cleanOutput = output.trim();
  if (
    /not logged into any github hosts|gh auth login|authentication failed|could not read username|bad credentials|requires authentication|HTTP 401|HTTP 403/i.test(
      cleanOutput,
    )
  ) {
    return {
      isAuthError: true,
      problem:
        'GitHub Pages deployment requires GitHub CLI login (`gh auth login`).',
    };
  }
  if (
    (error as NodeJS.ErrnoException | undefined)?.code === 'ENOENT' ||
    /gh: command not found|gh.*not found/i.test(cleanOutput)
  ) {
    return {
      isAuthError: false,
      problem:
        'GitHub CLI (`gh`) could not be found. Install gh and run `gh auth login` before deploying to GitHub Pages.',
    };
  }
  return {
    isAuthError: false,
    problem: summarizeCliError(cleanOutput, status, 'GitHub Pages'),
  };
}

export function rewriteGitHubPagesBase(dir: string, basePrefix: string): void {
  const cleanPrefix = basePrefix.replace(/\/+$/, '');
  if (!cleanPrefix || cleanPrefix === '/') return;

  const prefixPath = (raw: string): string => {
    if (!raw.startsWith('/') || raw.startsWith('//')) return raw;
    if (raw === cleanPrefix || raw.startsWith(`${cleanPrefix}/`)) return raw;
    return raw === '/' ? `${cleanPrefix}/` : `${cleanPrefix}${raw}`;
  };

  const rewriteText = (text: string, isHtml: boolean): string => {
    let out = text.replace(
      /\burl\(\s*(['"]?)(\/[^)'"\s]*)\1\s*\)/gi,
      (_m, quote: string, p: string) => `url(${quote}${prefixPath(p)}${quote})`,
    );
    if (isHtml) {
      out = out.replace(
        /\b(href|src|action|poster)=(['"])(\/[^'"]*)\2/gi,
        (_m, attr: string, quote: string, p: string) =>
          `${attr}=${quote}${prefixPath(p)}${quote}`,
      );
      out = out.replace(
        /\bsrcset=(['"])([^'"]*)\1/gi,
        (_m, quote: string, value: string) => {
          const updated = value
            .split(',')
            .map((part) => {
              const trimmed = part.trim();
              if (!trimmed) return trimmed;
              const [urlPart, ...rest] = trimmed.split(/\s+/);
              return [prefixPath(urlPart), ...rest].join(' ');
            })
            .join(', ');
          return `srcset=${quote}${updated}${quote}`;
        },
      );
    }
    return out;
  };

  const walk = (current: string) => {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else if (entry.isFile() && /\.(html|css)$/i.test(entry.name)) {
        const original = fs.readFileSync(full, 'utf8');
        const next = rewriteText(original, /\.html$/i.test(entry.name));
        if (next !== original) fs.writeFileSync(full, next, 'utf8');
      }
    }
  };
  walk(dir);
}

export async function deployGitHubPagesAsync(
  root: string,
  repoName?: string,
  options: { runner?: CommandRunner } = {},
): Promise<CloudflareDeployResult> {
  const build = await buildSiteAsync(root);
  const valid = validateBuiltDist(root, build, 'GitHub Pages');
  if (!valid.ok) return valid.result;

  const runner = options.runner ?? runCommandAsync;
  const env = childEnvForTools({
    ...process.env,
    CI: '1',
    GIT_TERMINAL_PROMPT: '0',
    NO_COLOR: '1',
  });
  const ghBin = resolveToolPath('gh') ?? 'gh';
  const gitBin = resolveToolPath('git') ?? 'git';
  const logs: string[] = [build.log];

  const failStep = (res: CommandOutput) => {
    const details =
      `${res.stdout}\n${res.stderr}`.trim() || res.error?.message || '';
    const classified = classifyGitHubPagesFailure(
      details,
      res.status,
      res.timedOut,
      res.error,
    );
    return {
      ok: false as const,
      isAuthError: classified.isAuthError,
      problem: classified.problem,
      log: [...logs, details].filter(Boolean).join('\n'),
    };
  };

  // 1. Verify gh CLI authentication
  const authRes = await runner(ghBin, ['auth', 'status'], {
    cwd: root,
    env,
    timeoutMs: 15000,
  });
  if (authRes.status !== 0 || authRes.error) {
    return failStep(authRes);
  }

  // 2. Resolve target GitHub owner/repo (from existing GitHub origin remote or gh user + slug)
  let repoSlug: string | null = null;
  if (fs.existsSync(path.join(root, '.git'))) {
    const remoteRes = await runner(gitBin, ['remote', 'get-url', 'origin'], {
      cwd: root,
      env,
      timeoutMs: 10000,
    });
    if (remoteRes.status === 0) {
      repoSlug = parseGitHubRepoFromRemote(remoteRes.stdout);
    }
  }
  if (!repoSlug) {
    const userRes = await runner(ghBin, ['api', 'user', '--jq', '.login'], {
      cwd: root,
      env,
      timeoutMs: 15000,
    });
    if (userRes.status !== 0 || userRes.error || !userRes.stdout.trim()) {
      return failStep(userRes);
    }
    const owner = userRes.stdout.trim();
    const name = slugForSite(root, repoName);
    repoSlug = `${owner}/${name}`;
  }

  // 3. Ensure repository exists on GitHub
  const viewRes = await runner(
    ghBin,
    ['repo', 'view', repoSlug, '--json', 'nameWithOwner'],
    { cwd: root, env, timeoutMs: 15000 },
  );
  if (viewRes.status !== 0 || viewRes.error) {
    const createRes = await runner(
      ghBin,
      ['repo', 'create', repoSlug, '--public'],
      { cwd: root, env, timeoutMs: 30000 },
    );
    if (createRes.status !== 0 || createRes.error) {
      return failStep(createRes);
    }
    logs.push(createRes.stdout.trim());
  }

  // 4. Stage dist/, apply project base-path prefix if not a user/org root site or CNAME, and push to gh-pages
  const [repoOwner, repoShortName] = repoSlug.split('/');
  const isUserRootSite =
    repoShortName.toLowerCase() === `${repoOwner.toLowerCase()}.github.io`;
  const hasCname =
    fs.existsSync(path.join(build.dist, 'CNAME')) ||
    fs.existsSync(path.join(root, 'public/CNAME'));

  const stagingDir = fs.mkdtempSync(
    path.join(os.tmpdir(), 'cauldron-ghpages-'),
  );
  try {
    fs.cpSync(build.dist, stagingDir, { recursive: true });
    if (!isUserRootSite && !hasCname) {
      rewriteGitHubPagesBase(stagingDir, `/${repoShortName}`);
    }
    fs.writeFileSync(path.join(stagingDir, '.nojekyll'), '', 'utf8');

    const remoteUrl = `https://github.com/${repoSlug}.git`;
    const gitSteps: string[][] = [
      ['init', '-b', 'gh-pages'],
      ['config', 'user.name', 'Cauldron'],
      ['config', 'user.email', 'cauldron@users.noreply.github.com'],
      ['add', '-A'],
      ['commit', '-m', 'Deploy static site to GitHub Pages'],
      [
        '-c',
        'credential.helper=',
        '-c',
        `credential.helper=!${ghBin} auth git-credential`,
        'push',
        '--force',
        remoteUrl,
        'gh-pages',
      ],
    ];
    for (const args of gitSteps) {
      const stepRes = await runner(gitBin, args, {
        cwd: stagingDir,
        env,
        timeoutMs: 60000,
      });
      if (stepRes.status !== 0 || stepRes.error) {
        return failStep(stepRes);
      }
    }
  } finally {
    fs.rmSync(stagingDir, { recursive: true, force: true });
  }

  // 5. Verify/configure GitHub Pages source on gh-pages and fetch the real html_url
  const pagesGetRes = await runner(ghBin, ['api', `repos/${repoSlug}/pages`], {
    cwd: root,
    env,
    timeoutMs: 15000,
  });
  let url: string | undefined;
  if (pagesGetRes.status === 0 && !pagesGetRes.error) {
    let parsed: {
      html_url?: string;
      build_type?: string;
      source?: { branch?: string; path?: string };
    } | null = null;
    try {
      parsed = JSON.parse(pagesGetRes.stdout);
    } catch {
      // Fall back to regex URL parse if test mock or output is plain text
    }
    url = parsed?.html_url
      ? parseGitHubPagesUrl(parsed.html_url)
      : parseGitHubPagesUrl(pagesGetRes.stdout);
    const wrongSource =
      parsed !== null &&
      (parsed.build_type === 'workflow' ||
        parsed.source?.branch !== 'gh-pages' ||
        parsed.source?.path !== '/');
    if (wrongSource) {
      const updateRes = await runner(
        ghBin,
        [
          'api',
          '-X',
          'PUT',
          `repos/${repoSlug}/pages`,
          '-f',
          'build_type=legacy',
          '-f',
          'source[branch]=gh-pages',
          '-f',
          'source[path]=/',
        ],
        { cwd: root, env, timeoutMs: 20000 },
      );
      if (updateRes.status !== 0 || updateRes.error) {
        return failStep(updateRes);
      }
      url = parseGitHubPagesUrl(updateRes.stdout) ?? url;
    }
  } else {
    const pagesCreateRes = await runner(
      ghBin,
      [
        'api',
        '-X',
        'POST',
        `repos/${repoSlug}/pages`,
        '-f',
        'source[branch]=gh-pages',
        '-f',
        'source[path]=/',
        '--jq',
        '.html_url',
      ],
      { cwd: root, env, timeoutMs: 20000 },
    );
    const combined = `${pagesCreateRes.stdout}\n${pagesCreateRes.stderr}`;
    url = parseGitHubPagesUrl(combined);
    if (
      pagesCreateRes.status !== 0 &&
      !/already exists|already enabled|\b409\b/i.test(combined)
    ) {
      return failStep(pagesCreateRes);
    }
    if (!url) {
      const retryGet = await runner(
        ghBin,
        ['api', `repos/${repoSlug}/pages`, '--jq', '.html_url'],
        { cwd: root, env, timeoutMs: 15000 },
      );
      url = parseGitHubPagesUrl(retryGet.stdout);
    }
  }

  return {
    ok: true,
    url,
    ...(url
      ? {}
      : {
          note: "Pushed to gh-pages, but GitHub didn't report the Pages URL yet — check your repository Settings → Pages.",
        }),
    log: [
      ...logs,
      url ? `Site deployed to GitHub Pages: ${url}` : 'Pushed to gh-pages.',
    ]
      .filter(Boolean)
      .join('\n'),
  };
}
