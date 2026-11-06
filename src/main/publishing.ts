import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { loadDrafts } from './recovery';

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
  lastCommit: string;
};

function git(root: string, args: string[]) {
  return spawnSync('git', args, {
    cwd: root,
    encoding: 'utf8',
    timeout: 60000,
    env: { ...process.env, GIT_TERMINAL_PROMPT: '0' },
  });
}

export function repoState(root: string): RepoState {
  const inside = git(root, ['rev-parse', '--is-inside-work-tree']);
  if (inside.status !== 0) {
    return {
      isRepo: false,
      branch: '',
      changes: [],
      hasRemote: false,
      lastCommit: '',
    };
  }
  const status = git(root, ['status', '--porcelain']);
  const changes: Change[] = (status.stdout ?? '')
    .split('\n')
    .filter((line) => line.trim() !== '')
    .map((line) => ({ status: line.slice(0, 2).trim(), file: line.slice(3) }));

  const branch = (
    git(root, ['rev-parse', '--abbrev-ref', 'HEAD']).stdout ?? ''
  ).trim();
  const remotes = (git(root, ['remote']).stdout ?? '').trim();
  const lastCommit = (
    git(root, ['log', '-1', '--pretty=%s']).stdout ?? ''
  ).trim();
  return {
    isRepo: true,
    branch,
    changes,
    hasRemote: remotes !== '',
    lastCommit,
  };
}

export type PublishResult =
  | { ok: true; committed: number; pushed: boolean; message: string }
  | { ok: false; problem: string; details?: string };

export function publish(
  root: string,
  options: { message: string; push: boolean },
): PublishResult {
  if (git(root, ['rev-parse', '--is-inside-work-tree']).status !== 0) {
    return {
      ok: false,
      problem:
        'This site is not a Git repository, so there is nothing to publish to.',
    };
  }

  // No publishing with edits still being typed.
  const drafts = loadDrafts(root);
  if (drafts.length > 0) {
    return {
      ok: false,
      problem: `There ${drafts.length === 1 ? 'is' : 'are'} ${drafts.length} unsaved edit${drafts.length === 1 ? '' : 's'}. Save or discard them first.`,
    };
  }

  const state = repoState(root);
  if (state.changes.length === 0) {
    return { ok: false, problem: 'Nothing has changed since the last commit.' };
  }

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

  let pushed = false;
  if (options.push) {
    if (!state.hasRemote) {
      return {
        ok: true,
        committed: state.changes.length,
        pushed: false,
        message:
          'Committed locally. This site has no remote, so nothing was pushed.',
      };
    }
    const push = git(root, ['push']);
    if (push.status !== 0) {
      return {
        ok: false,
        problem: 'The commit is in place, but the push failed.',
        details: `${push.stdout ?? ''}${push.stderr ?? ''}`.trim().slice(-600),
      };
    }
    pushed = true;
  }

  return {
    ok: true,
    committed: state.changes.length,
    pushed,
    message: 'Published.',
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
