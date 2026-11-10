import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { loadDrafts } from './recovery';
import { buildSite } from './quality';
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

function git(root: string, args: string[]) {
  return spawnSync('git', args, {
    cwd: root,
    encoding: 'utf8',
    timeout: 60000,
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

/** The remote a push would use (see RepoState.remote). */
function pushRemote(
  root: string,
  branch: string,
  remotes: string[],
): string | null {
  // Git's own order for where a push goes: the branch's pushRemote, then
  // remote.pushDefault, then the branch's upstream remote.
  const keys =
    branch && branch !== 'HEAD'
      ? [
          `branch.${branch}.pushRemote`,
          'remote.pushDefault',
          `branch.${branch}.remote`,
        ]
      : ['remote.pushDefault'];
  for (const key of keys) {
    const configured = git(root, ['config', key]);
    const name = (configured.stdout ?? '').trim();
    if (configured.status === 0 && remotes.includes(name)) return name;
  }
  if (remotes.includes('origin')) return 'origin';
  return remotes.length === 1 ? remotes[0] : null;
}

export function repoState(root: string): RepoState {
  const inside = git(root, ['rev-parse', '--is-inside-work-tree']);
  const top = git(root, ['rev-parse', '--show-toplevel']);
  if (
    inside.status !== 0 ||
    !top.stdout ||
    fs.realpathSync(top.stdout.trim()) !== fs.realpathSync(root)
  ) {
    return {
      isRepo: false,
      branch: '',
      changes: [],
      hasRemote: false,
      remote: null,
      lastCommit: '',
      unpushed: 0,
    };
  }
  const status = git(root, ['status', '--porcelain', '-z']);
  const changes = parseStatus(status.stdout ?? '');

  const branch = (
    git(root, ['rev-parse', '--abbrev-ref', 'HEAD']).stdout ?? ''
  ).trim();
  const remotes = (git(root, ['remote']).stdout ?? '').trim();
  const remoteList = remotes.split('\n').filter(Boolean);
  const lastCommit = (
    git(root, ['log', '-1', '--pretty=%s']).stdout ?? ''
  ).trim();

  // A commit whose upload failed is invisible to `git status`, so it has to be
  // counted from the branch or a retry can never be offered (plan 5.1).
  let unpushed = 0;
  const upstream = git(root, [
    'rev-parse',
    '--abbrev-ref',
    '--symbolic-full-name',
    '@{u}',
  ]);
  if (upstream.status === 0) {
    const ahead = git(root, ['rev-list', '--count', '@{u}..HEAD']);
    const counted = Number.parseInt((ahead.stdout ?? '').trim(), 10);
    if (ahead.status === 0 && Number.isFinite(counted)) unpushed = counted;
  } else if (remotes !== '' && branch !== 'HEAD') {
    const all = git(root, ['rev-list', '--count', 'HEAD']);
    const counted = Number.parseInt((all.stdout ?? '').trim(), 10);
    if (all.status === 0 && Number.isFinite(counted)) unpushed = counted;
  }

  return {
    isRepo: true,
    branch,
    changes,
    hasRemote: remotes !== '',
    remote: pushRemote(root, branch, remoteList),
    lastCommit,
    unpushed,
  };
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

export function publish(
  root: string,
  options: { message: string; push: boolean; unsavedBuffers?: number },
): PublishResult {
  if (!repoState(root).isRepo) {
    return {
      ok: false,
      problem:
        'This site is not a Git repository, so there is nothing to publish to.',
    };
  }

  // Edits still being typed in the window have not reached recovery storage yet,
  // so they are as unsaved as the drafts that did (plan 5.1).
  const unsaved = options.unsavedBuffers ?? 0;
  if (unsaved > 0) {
    return {
      ok: false,
      problem: `There ${unsaved === 1 ? 'is' : 'are'} ${unsaved} unsaved edit${unsaved === 1 ? '' : 's'} still in the editor. Save or discard ${unsaved === 1 ? 'it' : 'them'} first.`,
    };
  }

  // No publishing with edits still being typed.
  const drafts = loadDrafts(root);
  if (drafts.problem) return { ok: false, problem: drafts.problem };
  if (drafts.drafts.length > 0) {
    return {
      ok: false,
      problem: `There ${drafts.drafts.length === 1 ? 'is' : 'are'} ${drafts.drafts.length} unsaved edit${drafts.drafts.length === 1 ? '' : 's'}. Save or discard them first.`,
    };
  }

  const state = repoState(root);
  if (state.changes.length === 0 && state.unpushed === 0) {
    return { ok: false, problem: 'Nothing has changed since the last commit.' };
  }

  let committed = 0;
  if (state.changes.length > 0) {
    const message = options.message.trim();
    if (message === '') {
      return {
        ok: false,
        problem: 'A commit needs a message describing the change.',
      };
    }

    const add = git(root, ['add', '-A']);
    if (add.status !== 0) {
      return {
        ok: false,
        problem: 'The changed files could not be staged.',
        details: add.stderr ?? '',
      };
    }

    const commit = git(root, ['commit', '-m', message]);
    if (commit.status !== 0) {
      return {
        ok: false,
        problem: 'The commit did not go through.',
        details: `${commit.stdout ?? ''}${commit.stderr ?? ''}`
          .trim()
          .slice(-600),
      };
    }
    committed = state.changes.length;
  }

  const commitSummary =
    committed > 0
      ? `Committed ${committed} file(s) locally.`
      : state.unpushed > 0
        ? `${state.unpushed} commit(s) were already made locally; nothing new to commit.`
        : 'Nothing new to commit.';

  if (!options.push) {
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

  if (!state.hasRemote) {
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

  const upstream = git(root, [
    'rev-parse',
    '--abbrev-ref',
    '--symbolic-full-name',
    '@{u}',
  ]);
  const remote = state.remote;
  if (upstream.status !== 0 && (!remote || state.branch === 'HEAD'))
    return {
      ok: false,
      problem:
        'Committed locally. Choose a remote and branch in Git before pushing.',
      committed,
    };
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
      details: `${push.stdout ?? ''}${push.stderr ?? ''}`.trim().slice(-600),
      committed,
    };
  }

  const upload = `Uploaded to ${(upstream.stdout ?? '').trim() || `${remote}/${state.branch}`}.`;
  return {
    ok: true,
    committed,
    pushed: true,
    commit: commitSummary,
    upload,
    message: `${commitSummary} ${upload}`,
  };
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

export function exportStaticSite(root: string): {
  ok: boolean;
  distPath?: string;
  problem?: string;
  log?: string;
} {
  const build = buildSite(root);
  const dist = path.join(root, 'dist');
  if (!build.ok || !fs.existsSync(dist)) {
    return {
      ok: false,
      problem: 'Static build failed.',
      log: build.log,
    };
  }
  return {
    ok: true,
    distPath: dist,
    log: build.log,
  };
}

export function deployCloudflarePages(
  root: string,
  projectName?: string,
): {
  ok: boolean;
  url?: string;
  problem?: string;
  log?: string;
} {
  const build = buildSite(root);
  if (!build.ok) {
    return {
      ok: false,
      problem: 'Static build failed before Cloudflare deployment.',
      log: build.log,
    };
  }

  const indexHtml = path.join(root, 'dist/index.html');
  if (!fs.existsSync(indexHtml)) {
    return {
      ok: false,
      problem: 'Build output missing dist/index.html.',
      log: build.log,
    };
  }

  let slug = projectName
    ? packageSlug(projectName)
    : path
        .basename(root)
        .toLowerCase()
        .replace(/[^a-z0-9-]/g, '-');
  if (!slug) slug = 'cauldron-site';

  const wranglerFile = path.join(root, 'wrangler.toml');
  if (!fs.existsSync(wranglerFile)) {
    try {
      fs.writeFileSync(
        wranglerFile,
        `name = "${slug}"\ncompatibility_date = "2026-11-09"\npages_build_output_dir = "dist"\n`,
        'utf8',
      );
    } catch (err) {
      console.error('[publishing] Failed to write wrangler.toml:', err);
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

  let deployResult: ReturnType<typeof spawnSync> | null = null;
  try {
    if (wranglerBin) {
      deployResult = spawnSync(
        wranglerBin,
        ['pages', 'deploy', 'dist', '--project-name', slug],
        { cwd: root, env, encoding: 'utf8', timeout: 120000 },
      );
    } else {
      deployResult = spawnSync(
        npxBin,
        [
          '--no-install',
          'wrangler',
          'pages',
          'deploy',
          'dist',
          '--project-name',
          slug,
        ],
        { cwd: root, env, encoding: 'utf8', timeout: 120000 },
      );
    }
  } catch (err) {
    console.error('[publishing] Cloudflare deployment process failed:', err);
  }

  const output =
    `${deployResult?.stdout ?? ''}\n${deployResult?.stderr ?? ''}`.trim();

  if (!deployResult || deployResult.status !== 0) {
    const errorDetails = output ? `\n${output}` : '';
    console.error(
      `[publishing] Cloudflare Pages deployment failed:${errorDetails}`,
    );
    return {
      ok: false,
      problem:
        'Cloudflare Pages deployment requires Wrangler authentication or CLOUDFLARE_API_TOKEN. Static site was built to dist/.',
      log: `${build.log}\n${output}`.trim(),
    };
  }

  const urlMatch = output.match(/https:\/\/[a-z0-9._-]+\.pages\.dev/i);
  const liveUrl = urlMatch ? urlMatch[0] : `https://${slug}.pages.dev`;

  return {
    ok: true,
    url: liveUrl,
    log: output || `Site deployed to Cloudflare Pages: ${liveUrl}`,
  };
}
