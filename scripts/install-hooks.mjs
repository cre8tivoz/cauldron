#!/usr/bin/env node
// Installs the tracked pre-commit hook for this checkout only.
// Nothing calls this automatically: a contributor opts in once with
// `npm run hooks:install` (see CONTRIBUTING.md).
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
);
const hookFile = path.join(repoRoot, '.githooks', 'pre-commit');
const hookPath = '.githooks';

const git = (...args) =>
  spawnSync('git', args, { cwd: repoRoot, encoding: 'utf8' });

if (!existsSync(hookFile)) {
  console.error(`Cannot install hooks: ${hookFile} is missing.`);
  process.exit(1);
}

const insideWorkTree = git('rev-parse', '--is-inside-work-tree');
if (insideWorkTree.status !== 0 || insideWorkTree.stdout.trim() !== 'true') {
  console.error(
    `Cannot install hooks: ${repoRoot} is not inside a git work tree.`,
  );
  process.exit(1);
}

const set = git('config', 'core.hooksPath', hookPath);
if (set.status !== 0) {
  console.error(`Could not set core.hooksPath: ${set.stderr.trim()}`);
  process.exit(1);
}

const verify = git('config', '--get', 'core.hooksPath');
if (verify.status !== 0 || verify.stdout.trim() !== hookPath) {
  console.error('Could not confirm core.hooksPath was set.');
  process.exit(1);
}

console.log(`Installed local commit hook for ${repoRoot}`);
console.log(`  git config core.hooksPath ${hookPath}`);
console.log('  pre-commit runs: npm run check, then npm run smoke');
console.log(
  'Bypass is possible with git commit --no-verify; do not use it for failing work.',
);
