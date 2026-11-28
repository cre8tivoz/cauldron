import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { isBlockedRemoteHostname, isInside } from './files';

const MAX_STOCK_PHOTO_BYTES = 25 * 1024 * 1024;
const DEFAULT_FETCH_TIMEOUT_MS = 30_000;

const IMAGE_MIME_TO_EXT: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/jpg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/avif': '.avif',
  'image/gif': '.gif',
};

export function extensionForImageMime(
  contentType: string | null | undefined,
): string | null {
  if (!contentType) return null;
  const mime = contentType.split(';')[0]?.trim().toLowerCase();
  if (!mime) return null;
  return IMAGE_MIME_TO_EXT[mime] ?? null;
}

/**
 * Write a new binary file only when `file` does not already exist, publishing
 * via an exclusive temp file + hard link so partial bytes never appear and
 * existing assets are never silently overwritten.
 */
function createBinaryFileAtomic(file: string, buffer: Buffer): void {
  const temp = path.join(
    path.dirname(file),
    `.${path.basename(file)}.cauldron-${process.pid}-${crypto
      .randomBytes(6)
      .toString('hex')}`,
  );
  let tempIsOurs = true;
  try {
    try {
      fs.writeFileSync(temp, buffer, { flag: 'wx' });
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'EEXIST') {
        tempIsOurs = false;
      }
      throw error;
    }
    fs.linkSync(temp, file);
  } finally {
    if (tempIsOurs) {
      try {
        fs.unlinkSync(temp);
      } catch {
        // Already gone, or never created.
      }
    }
  }
}

/**
 * Asset management: local asset storage and stock photography scaffolding.
 *
 * NOTE (WDL-189 / WDL-171): Unverified curated Unsplash placeholder entries and
 * photographer credits were removed. Live Unsplash & Pexels search stays
 * disabled ("COMING SOON") in the UI until backed by verified API integration.
 * Local image drag-and-drop and upload into `public/images/` remain active.
 */

export type StockPhoto = {
  id: string;
  title: string;
  photographer: string;
  source: 'Unsplash' | 'Pexels';
  sourceUrl: string;
  thumbUrl: string;
  fullUrl: string;
  directionId: string;
  category: string;
};

/** Emptied pending verified live API results under WDL-171. */
export const CURATED_STOCK_PHOTOS: StockPhoto[] = [];

/**
 * Returns curated starter photos matching the optional filter query or direction.
 * Note: This searches the static curated collection, not live external APIs.
 */
export function getCuratedPhotos(
  query?: string,
  directionId?: string,
): StockPhoto[] {
  let list = CURATED_STOCK_PHOTOS;
  if (directionId) {
    list = list.filter((p) => p.directionId === directionId);
    if (list.length === 0) list = CURATED_STOCK_PHOTOS;
  }
  if (query && query.trim()) {
    const q = query.toLowerCase().trim();
    list = list.filter(
      (p) =>
        p.title.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q) ||
        p.photographer.toLowerCase().includes(q),
    );
  }
  return list;
}

/**
 * Saves a local image buffer directly into the site's `public/images/` directory,
 * sanitizing the file name and ensuring it stays within the site root.
 */
export function saveAssetFile(
  root: string,
  fileName: string,
  buffer: Buffer,
  options: { onCollision?: 'rename' | 'refuse' } = {},
): { ok: true; relativePath: string } | { ok: false; problem: string } {
  const imagesDir = path.join(root, 'public/images');
  if (!isInside(root, imagesDir)) {
    return { ok: false, problem: 'Images path is outside the site.' };
  }
  if (
    fileName.includes('..') ||
    path.isAbsolute(fileName) ||
    fileName.startsWith('/') ||
    fileName.startsWith('\\')
  ) {
    return { ok: false, problem: 'Path traversal attempt rejected.' };
  }
  if (buffer.length === 0) {
    return { ok: false, problem: 'Image file is empty.' };
  }
  const onCollision = options.onCollision ?? 'rename';
  try {
    fs.mkdirSync(imagesDir, { recursive: true });
    // Sanitize filename and prevent dotfile creation.
    const cleanName = path
      .basename(fileName)
      .toLowerCase()
      .replace(/[^a-z0-9._-]/g, '-')
      .replace(/^\.+/, '');
    if (!cleanName) {
      return { ok: false, problem: 'Invalid file name.' };
    }
    const parsed = path.parse(cleanName);
    const baseStem = parsed.name || 'image';
    const ext = parsed.ext;

    for (let attempt = 1; attempt <= 1000; attempt += 1) {
      const candidateName =
        attempt === 1 ? `${baseStem}${ext}` : `${baseStem}-${attempt}${ext}`;
      const targetFile = path.join(imagesDir, candidateName);
      if (!isInside(imagesDir, targetFile)) {
        return {
          ok: false,
          problem: 'Target file is outside the images directory.',
        };
      }
      try {
        createBinaryFileAtomic(targetFile, buffer);
        return { ok: true, relativePath: `/images/${candidateName}` };
      } catch (err) {
        if ((err as NodeJS.ErrnoException).code === 'EEXIST') {
          if (onCollision === 'refuse') {
            return {
              ok: false,
              problem: `An image named ${cleanName} already exists in public/images/.`,
            };
          }
          continue;
        }
        throw err;
      }
    }
    return {
      ok: false,
      problem: `Too many existing copies of ${cleanName} in public/images/.`,
    };
  } catch (e) {
    return {
      ok: false,
      problem: `Could not save asset: ${e instanceof Error ? e.message : String(e)}`,
    };
  }
}

export async function downloadAndSaveStockPhoto(
  root: string,
  params: {
    photoId: string;
    url: string;
    fetchImpl?: typeof fetch;
    maxBytes?: number;
    timeoutMs?: number;
  },
): Promise<
  { ok: true; relativePath: string } | { ok: false; problem: string }
> {
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(params.url);
  } catch {
    return { ok: false, problem: 'Photo download address is not a valid URL.' };
  }
  if (parsedUrl.protocol !== 'https:') {
    return {
      ok: false,
      problem: 'Photo downloads require an https:// address.',
    };
  }
  if (isBlockedRemoteHostname(parsedUrl.hostname)) {
    return {
      ok: false,
      problem:
        'Photo downloads cannot target local or private network addresses.',
    };
  }

  const fetchFn = params.fetchImpl ?? globalThis.fetch;
  if (typeof fetchFn !== 'function') {
    return {
      ok: false,
      problem: 'Network fetch is unavailable in main process.',
    };
  }

  const maxBytes = params.maxBytes ?? MAX_STOCK_PHOTO_BYTES;
  const timeoutMs = params.timeoutMs ?? DEFAULT_FETCH_TIMEOUT_MS;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    let currentUrl = parsedUrl;
    let response: Response | null = null;
    for (let hop = 0; hop < 5; hop += 1) {
      const res = await fetchFn(currentUrl.toString(), {
        signal: controller.signal,
        redirect: 'manual',
      });
      if (res.status >= 300 && res.status < 400) {
        const location = res.headers.get('location');
        if (!location) {
          return {
            ok: false,
            problem: 'Photo download redirect had no destination.',
          };
        }
        let nextUrl: URL;
        try {
          nextUrl = new URL(location, currentUrl);
        } catch {
          return { ok: false, problem: 'Photo download redirect was invalid.' };
        }
        if (
          nextUrl.protocol !== 'https:' ||
          isBlockedRemoteHostname(nextUrl.hostname)
        ) {
          return {
            ok: false,
            problem:
              'Photo download redirected to an unsafe or private network address.',
          };
        }
        currentUrl = nextUrl;
        continue;
      }
      response = res;
      break;
    }
    if (!response) {
      return { ok: false, problem: 'Photo download exceeded redirect limit.' };
    }
    if (!response.ok) {
      return {
        ok: false,
        problem: `Download failed (HTTP ${response.status} ${response.statusText || 'Error'}).`,
      };
    }

    const contentType = response.headers.get('content-type');
    const ext = extensionForImageMime(contentType);
    if (!ext) {
      return {
        ok: false,
        problem: `Expected an image response, got ${contentType ?? 'no content type'}.`,
      };
    }

    const contentLengthHeader = response.headers.get('content-length');
    if (contentLengthHeader) {
      const declaredBytes = Number(contentLengthHeader);
      if (Number.isFinite(declaredBytes) && declaredBytes > maxBytes) {
        return {
          ok: false,
          problem: `Downloaded image exceeds the ${Math.round(maxBytes / (1024 * 1024))} MB limit.`,
        };
      }
    }

    let buffer: Buffer;
    if (response.body && typeof response.body.getReader === 'function') {
      const reader = response.body.getReader();
      const chunks: Buffer[] = [];
      let total = 0;
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) {
          total += value.byteLength;
          if (total > maxBytes) {
            await reader.cancel().catch(() => {});
            return {
              ok: false,
              problem: `Downloaded image exceeds the ${Math.round(maxBytes / (1024 * 1024))} MB limit.`,
            };
          }
          chunks.push(Buffer.from(value));
        }
      }
      buffer = Buffer.concat(chunks, total);
    } else {
      buffer = Buffer.from(await response.arrayBuffer());
    }
    if (buffer.length === 0) {
      return { ok: false, problem: 'Downloaded photo was empty.' };
    }
    if (buffer.length > maxBytes) {
      return {
        ok: false,
        problem: `Downloaded image exceeds the ${Math.round(maxBytes / (1024 * 1024))} MB limit.`,
      };
    }

    const rawStem =
      path.parse(params.photoId || 'stock-photo').name || 'stock-photo';
    return saveAssetFile(root, `${rawStem}${ext}`, buffer, {
      onCollision: 'rename',
    });
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      return { ok: false, problem: 'Photo download timed out.' };
    }
    return {
      ok: false,
      problem: `Download failed: ${err instanceof Error ? err.message : String(err)}`,
    };
  } finally {
    clearTimeout(timer);
  }
}
