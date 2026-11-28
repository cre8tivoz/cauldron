import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import net from 'node:net';

export function hashOf(text: string): string {
  return crypto.createHash('sha256').update(text, 'utf8').digest('hex');
}

export function readFile(file: string): { text: string; hash: string } {
  const text = fs.readFileSync(file, 'utf8');
  return { text, hash: hashOf(text) };
}

/** Writes through a unique exclusive temporary file in the same folder, so a half-written file is never left behind and pre-existing symlinks cannot redirect the write. */
export function writeFileAtomic(
  file: string,
  content: string | Uint8Array,
): string {
  const dir = path.dirname(file);
  const base = path.basename(file);
  let temp = '';
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const candidate = path.join(
      dir,
      `.${base}.cauldron-${process.pid}-${crypto.randomBytes(6).toString('hex')}`,
    );
    try {
      if (typeof content === 'string') {
        fs.writeFileSync(candidate, content, { encoding: 'utf8', flag: 'wx' });
      } else {
        fs.writeFileSync(candidate, content, { flag: 'wx' });
      }
      temp = candidate;
      break;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'EEXIST') continue;
      throw error;
    }
  }
  if (!temp) {
    throw new Error(`Could not create unique temporary file for ${base}.`);
  }
  try {
    fs.renameSync(temp, file);
  } catch (error) {
    try {
      fs.unlinkSync(temp);
    } catch {
      // Best-effort cleanup if rename failed.
    }
    throw error;
  }
  return typeof content === 'string'
    ? hashOf(content)
    : crypto.createHash('sha256').update(content).digest('hex');
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
  // Resolve existing ancestors as well as the target, including dangling symlinks
  // and files not created yet.
  const real = (file: string, depth = 0): string => {
    if (depth > 40) throw new Error('Symlink loop detected.');
    const absolute = path.resolve(file);
    try {
      return fs.realpathSync(absolute);
    } catch {
      // fs.existsSync returns false for dangling symlinks; inspect with lstatSync
      // so a dangling symlink pointing outside root can never pass containment.
      let resolvedTarget: string | null = null;
      try {
        const stat = fs.lstatSync(absolute);
        if (stat.isSymbolicLink()) {
          const linkTarget = fs.readlinkSync(absolute);
          resolvedTarget = path.resolve(path.dirname(absolute), linkTarget);
        }
      } catch {
        // Truly absent; resolve its parent chain instead.
      }
      if (resolvedTarget !== null) {
        return real(resolvedTarget, depth + 1);
      }
      const parent = path.dirname(absolute);
      return parent === absolute
        ? absolute
        : path.join(real(parent, depth + 1), path.basename(absolute));
    }
  };
  try {
    const relative = path.relative(real(root), real(target));
    return (
      relative !== '' &&
      relative !== '..' &&
      !relative.startsWith(`..${path.sep}`) &&
      !path.isAbsolute(relative)
    );
  } catch {
    return false;
  }
}

/** Returns true if an IPv4/IPv6 address is loopback, private, link-local, or otherwise non-public. */
export function isPrivateOrLocalIp(ip: string): boolean {
  const clean = ip.replace(/^\[|\]$/g, '').toLowerCase();
  if (clean.startsWith('::ffff:')) {
    return isPrivateOrLocalIp(clean.slice('::ffff:'.length));
  }
  const version = net.isIP(clean);
  if (version === 4) {
    const parts = clean.split('.').map(Number);
    if (parts.length !== 4 || parts.some((n) => Number.isNaN(n))) return true;
    const [a, b] = parts;
    return (
      a === 0 ||
      a === 10 ||
      a === 127 ||
      (a === 100 && b >= 64 && b <= 127) ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      a >= 224
    );
  }
  if (version === 6) {
    return (
      clean === '::' ||
      clean === '::1' ||
      clean.startsWith('fc') ||
      clean.startsWith('fd') ||
      clean.startsWith('fe8') ||
      clean.startsWith('fe9') ||
      clean.startsWith('fea') ||
      clean.startsWith('feb') ||
      clean.startsWith('ff')
    );
  }
  return false;
}

/** Rejects loopback/internal hostnames and private IP literals before outbound fetches or loads. */
export function isBlockedRemoteHostname(hostname: string): boolean {
  const host = hostname
    .replace(/^\[|\]$/g, '')
    .toLowerCase()
    .replace(/\.$/, '');
  if (
    !host ||
    host === 'localhost' ||
    host.endsWith('.localhost') ||
    host.endsWith('.local') ||
    host.endsWith('.internal')
  ) {
    return true;
  }
  if (net.isIP(host)) return isPrivateOrLocalIp(host);
  return false;
}
