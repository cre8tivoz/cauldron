import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

export function hashOf(text: string): string {
  return crypto.createHash('sha256').update(text, 'utf8').digest('hex');
}

export function readFile(file: string): { text: string; hash: string } {
  const text = fs.readFileSync(file, 'utf8');
  return { text, hash: hashOf(text) };
}

/** Writes through a temporary file in the same folder, so a half-written file is never left behind. */
export function writeFileAtomic(file: string, text: string): string {
  const temp = path.join(
    path.dirname(file),
    `.${path.basename(file)}.cauldron-${process.pid}`,
  );
  fs.writeFileSync(temp, text, 'utf8');
  fs.renameSync(temp, file);
  return hashOf(text);
}

export function isInside(root: string, target: string): boolean {
  const relative = path.relative(root, target);
  return (
    relative !== '' && !relative.startsWith('..') && !path.isAbsolute(relative)
  );
}
