import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { app } from 'electron';

export type Draft = {
  key: string;
  file: string;
  line: number;
  column: number;
  name: string;
  field: string;
  value: string;
  baseHash?: string;
  schemaHash?: string;
  savedAt: number;
};

function recoveryDir(): string {
  // Outside the site, so a crash can never leave Cauldron's working files in someone's repo.
  const dir = path.join(app.getPath('userData'), 'recovery');
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function fileFor(siteRoot: string): string {
  const id = crypto
    .createHash('sha256')
    .update(siteRoot)
    .digest('hex')
    .slice(0, 16);
  return path.join(recoveryDir(), `${id}.json`);
}

export function saveDrafts(siteRoot: string, drafts: Draft[]): void {
  const target = fileFor(siteRoot);
  if (drafts.length === 0) {
    fs.rmSync(target, { force: true });
    return;
  }
  fs.writeFileSync(
    target,
    JSON.stringify({ root: siteRoot, drafts }, null, 2),
    'utf8',
  );
}

export type DraftsRead = { drafts: Draft[]; problem: string | null };

function problemFor(action: string, target: string, error: unknown): string {
  const problem = `${action} could not be read from ${target}: ${
    error instanceof Error ? error.message : String(error)
  }`;
  console.error(problem);
  return problem;
}

/**
 * Missing recovery data means there were no saved edits. Damaged recovery data
 * is reported, never passed off as "nothing to recover" (plan 1.6).
 */
export function loadDrafts(siteRoot: string): DraftsRead {
  const target = fileFor(siteRoot);
  let text: string;
  try {
    text = fs.readFileSync(target, 'utf8');
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT')
      return { drafts: [], problem: null };
    return {
      drafts: [],
      problem: problemFor('Saved edits', target, error),
    };
  }
  try {
    const parsed = JSON.parse(text) as { drafts?: Draft[] };
    if (!Array.isArray(parsed.drafts))
      return {
        drafts: [],
        problem: problemFor(
          'Saved edits',
          target,
          new Error('it does not list any edits'),
        ),
      };
    return { drafts: parsed.drafts, problem: null };
  } catch (error) {
    return { drafts: [], problem: problemFor('Saved edits', target, error) };
  }
}

export function clearDrafts(siteRoot: string): void {
  fs.rmSync(fileFor(siteRoot), { force: true });
}
