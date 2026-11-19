import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { canonicalProjectPath } from './projects';

/**
 * Cached preview snapshots and fallback theme palettes for project cards on
 * the Projects home screen (WDL-174). Stored inside Cauldron's own userData
 * folder so user project folders are never modified.
 */

export type ProjectThemePalette = {
  bg: string;
  surface: string;
  ink: string;
  primary: string;
  line: string;
};

const MAX_THUMBNAIL_BYTES = 512 * 1024;
const SAFE_COLOR =
  /^(?:#[0-9a-fA-F]{3,8}|rgba?\([0-9.,\s%]+\)|hsla?\([0-9.,\s%deg]+\))$/;

/** Deterministic cache path for a project's JPEG thumbnail inside thumbnailsDir. */
export function thumbnailFilePath(
  thumbnailsDir: string,
  projectPath: string,
): string {
  const canonical = canonicalProjectPath(projectPath);
  const hash = crypto
    .createHash('sha256')
    .update(canonical)
    .digest('hex')
    .slice(0, 24);
  return path.join(thumbnailsDir, `${hash}.jpg`);
}

/** Atomically writes a JPEG thumbnail buffer for the given project. */
export function saveProjectThumbnail(
  thumbnailsDir: string,
  projectPath: string,
  bytes: Buffer,
): boolean {
  if (!Buffer.isBuffer(bytes) || bytes.length === 0) return false;
  if (bytes.length > MAX_THUMBNAIL_BYTES) return false;
  const target = thumbnailFilePath(thumbnailsDir, projectPath);
  const temp = `${target}.${process.pid}.cauldron-tmp`;
  try {
    fs.mkdirSync(thumbnailsDir, { recursive: true });
    fs.writeFileSync(temp, bytes);
    fs.renameSync(temp, target);
    return true;
  } catch (error) {
    try {
      fs.rmSync(temp, { force: true });
    } catch {
      // Best-effort cleanup of temp file.
    }
    console.warn('[thumbnails] Failed to save project thumbnail:', error);
    return false;
  }
}

/** Reads a cached JPEG thumbnail as a data URL, or null when unavailable. */
export function readProjectThumbnailDataUrl(
  thumbnailsDir: string,
  projectPath: string,
): string | null {
  const target = thumbnailFilePath(thumbnailsDir, projectPath);
  try {
    const stat = fs.statSync(target);
    if (!stat.isFile() || stat.size <= 0 || stat.size > MAX_THUMBNAIL_BYTES) {
      return null;
    }
    const bytes = fs.readFileSync(target);
    return `data:image/jpeg;base64,${bytes.toString('base64')}`;
  } catch {
    return null;
  }
}

/** Removes a cached thumbnail when a project is removed from the recent list. */
export function removeProjectThumbnail(
  thumbnailsDir: string,
  projectPath: string,
): void {
  const target = thumbnailFilePath(thumbnailsDir, projectPath);
  try {
    fs.rmSync(target, { force: true });
  } catch {
    // Best effort; removing a recent entry never fails on cache cleanup.
  }
}

function extractCssColor(css: string, tokenName: string): string | null {
  const escaped = tokenName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = css.match(new RegExp(`${escaped}\\s*:\\s*([^;\\n}]+)`));
  if (!match) return null;
  const value = match[1].trim();
  return SAFE_COLOR.test(value) ? value : null;
}

/**
 * Reads the site's design colour tokens from `cauldron/tokens.css` so cards
 * without a captured snapshot still show a truthful site-palette preview.
 */
export function readProjectThemePalette(
  projectPath: string,
): ProjectThemePalette | null {
  const tokensFile = path.join(projectPath, 'cauldron', 'tokens.css');
  try {
    if (!fs.existsSync(tokensFile)) return null;
    const css = fs.readFileSync(tokensFile, 'utf8');
    const bg = extractCssColor(css, '--cauldron-c-bg');
    const ink = extractCssColor(css, '--cauldron-c-ink');
    if (!bg || !ink) return null;
    const surface = extractCssColor(css, '--cauldron-c-surface') ?? bg;
    const primary = extractCssColor(css, '--cauldron-c-primary') ?? ink;
    const line = extractCssColor(css, '--cauldron-c-line') ?? primary;
    return { bg, surface, ink, primary, line };
  } catch {
    return null;
  }
}

/** True when `urlString` points to the root/home page of `serverUrl`. */
export function isHomePreviewUrl(
  urlString: string,
  serverUrl: string,
): boolean {
  try {
    const current = new URL(urlString);
    const base = new URL(serverUrl);
    if (current.origin !== base.origin) return false;
    return current.pathname === '/' || current.pathname === '/index.html';
  } catch {
    return false;
  }
}
