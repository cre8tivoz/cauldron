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

export function loadDrafts(siteRoot: string): Draft[] {
  const target = fileFor(siteRoot);
  try {
    const parsed = JSON.parse(fs.readFileSync(target, 'utf8')) as {
      drafts?: Draft[];
    };
    return Array.isArray(parsed.drafts) ? parsed.drafts : [];
  } catch {
    return [];
  }
}

export function clearDrafts(siteRoot: string): void {
  fs.rmSync(fileFor(siteRoot), { force: true });
}
