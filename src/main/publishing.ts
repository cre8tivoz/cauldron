import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
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
  const push = await runGit(
    root,
    upstream.status === 0
      ? ['push']
      : ['push', '--set-upstream', remote!, state.branch],
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
  const push = git(
    root,
    upstream.status === 0
      ? ['push']
      : ['push', '--set-upstream', remote!, state.branch],
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

/** The unsigned Mac build, ready to hand over (plan 5.2). */
export function macBuildInfo(root: string): {
  zip: string | null;
  instructions: string;
} {
  const outDir = path.join(root, 'out/make/zip/darwin/arm64');
  let zip: string | null = null;
  if (fs.existsSync(outDir)) {
    const found = fs
      .readdirSync(outDir)
      .filter((name) => name.endsWith('.zip'));
    if (found.length > 0) zip = path.join(outDir, found[found.length - 1]);
  }
  return {
    zip,
    instructions: [
      'Cauldron is not signed with an Apple Developer certificate yet.',
      '1. Unzip the download and drag Cauldron to Applications.',
      '2. Right-click Cauldron and choose Open, then Open again in the dialog.',
      '3. After the first launch it opens normally.',
      'If macOS says the app is damaged, run: xattr -dr com.apple.quarantine /Applications/Cauldron.app',
    ].join('\n'),
  };
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

function prepareCloudflareDeployStep(
  root: string,
  build: { ok: boolean; log: string; dist: string },
  projectName?: string,
  options: { writeWranglerConfig?: boolean } = {},
):
  | { ok: false; result: CloudflareDeployResult }
  | {
      ok: true;
      cmd: string;
      args: string[];
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
  const wranglerBin = resolveToolPath('wrangler');
  const npxBin = resolveToolPath('npx') ?? 'npx';
  const cmd = wranglerBin ?? npxBin;
  const args = wranglerBin
    ? ['pages', 'deploy', outRel, '--project-name', slug]
    : [
        '--no-install',
        'wrangler',
        'pages',
        'deploy',
        outRel,
        '--project-name',
        slug,
      ];

  return { ok: true, cmd, args, env, createdFiles, buildLog: build.log };
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

export function deployCloudflarePages(
  root: string,
  projectName?: string,
  options: { writeWranglerConfig?: boolean } = {},
): CloudflareDeployResult {
  const build = buildSite(root);
  const step = prepareCloudflareDeployStep(root, build, projectName, options);
  if (!step.ok) return step.result;

  let deployResult: CommandOutput | null = null;
  try {
    const res = spawnSync(step.cmd, step.args, {
      cwd: root,
      env: step.env,
      encoding: 'utf8',
      timeout: 120000,
    });
    deployResult = {
      status: res.status,
      stdout: res.stdout ?? '',
      stderr: res.stderr ?? '',
      error: res.error,
    };
  } catch (err) {
    console.error('[publishing] Cloudflare deployment process failed:', err);
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
  const deployResult = await runner(step.cmd, step.args, {
    cwd: root,
    env: step.env,
    timeoutMs: 120000,
  });
  return finalizeCloudflareDeploy(
    deployResult,
    step.createdFiles,
    step.buildLog,
  );
}
