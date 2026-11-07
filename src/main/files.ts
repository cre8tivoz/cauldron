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

/**
 * Creates a new file atomically without ever overwriting an existing one.
 * The content lands in a unique temporary sibling first; publishing it with a
 * hard link fails with EEXIST if the destination appeared in the meantime.
 * The temporary file is removed on every path, including a failed write.
 */
export function createFileAtomic(file: string, text: string): string {
  const temp = path.join(
    path.dirname(file),
    `.${path.basename(file)}.cauldron-${process.pid}-${crypto
      .randomBytes(6)
      .toString('hex')}`,
  );
  let tempIsOurs = true;
  try {
    try {
      fs.writeFileSync(temp, text, { encoding: 'utf8', flag: 'wx' });
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'EEXIST')
        tempIsOurs = false;
      throw error;
    }
    fs.linkSync(temp, file);
  } finally {
    if (tempIsOurs) {
      try {
        fs.unlinkSync(temp);
      } catch {
        // Already gone, or never fully created; nothing else to clean up.
      }
    }
  }
  return hashOf(text);
}

export function isInside(root: string, target: string): boolean {
  // Resolve existing ancestors as well as the target, including files not created yet.
  const real = (file: string): string => {
    const absolute = path.resolve(file);
    if (fs.existsSync(absolute)) return fs.realpathSync(absolute);
    const parent = path.dirname(absolute);
    return parent === absolute
      ? absolute
      : path.join(real(parent), path.basename(absolute));
  };
  const relative = path.relative(real(root), real(target));
  return (
    relative !== '' &&
    relative !== '..' &&
    !relative.startsWith(`..${path.sep}`) &&
    !path.isAbsolute(relative)
  );
}
