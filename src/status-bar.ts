/**
 * Pure formatting and route helpers for the workspace status bar and preview
 * stage toolbar (WDL-267).
 */

/**
 * Strips the redundant "Preview running at <url>" status message when the
 * right side of the status bar already shows the live preview indicator, while
 * keeping any unsaved-draft suffix or other real status text intact.
 */
export function formatStatusMessage(
  message: string,
  running: boolean,
  url: string | null,
): string {
  const trimmed = message.trim();
  if (!trimmed) return 'Ready';
  if (!running || !url) return trimmed;
  const redundantPrefix = `Preview running at ${url}`;
  const withoutTrailingSlash = redundantPrefix.replace(/\/+$/, '');
  for (const prefix of [redundantPrefix, withoutTrailingSlash]) {
    if (trimmed === prefix || trimmed === `${prefix}/`) {
      return 'Ready';
    }
    const separator = ' · ';
    for (const candidate of [prefix, `${prefix}/`]) {
      if (trimmed.startsWith(`${candidate}${separator}`)) {
        const rest = trimmed.slice(candidate.length + separator.length).trim();
        return rest || 'Ready';
      }
    }
  }
  return trimmed;
}

/** Formats a local preview URL as host:port for the compact status indicator. */
export function formatPreviewHost(url: string | null): string {
  if (!url) return 'localhost:4321';
  try {
    return new URL(url).host;
  } catch {
    return url.replace(/^https?:\/\//, '').replace(/\/.*$/, '');
  }
}

/** Extracts a normalised site route ("/", "/menu") from a preview URL. */
export function previewRouteFromUrl(url: string | null): string {
  if (!url) return '/';
  try {
    const pathname = new URL(url).pathname;
    const cleaned = pathname.replace(/\/+$/, '');
    return cleaned === '' ? '/' : cleaned;
  } catch {
    return '/';
  }
}
