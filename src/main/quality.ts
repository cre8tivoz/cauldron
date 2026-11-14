import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { spawn, spawnSync } from 'node:child_process';
import type { BrowserWindow } from 'electron';
import electron from 'electron';

const ElectronBrowserWindow =
  (
    electron as unknown as {
      BrowserWindow?: new (options: unknown) => BrowserWindow;
      default?: { BrowserWindow?: new (options: unknown) => BrowserWindow };
    }
  ).BrowserWindow ??
  (
    electron as unknown as {
      default?: { BrowserWindow?: new (options: unknown) => BrowserWindow };
    }
  ).default?.BrowserWindow;
import { childEnvForTools, resolveToolPath } from './runtime';
import { detectDependencySetup } from './dependencies';
import { isInside } from './files';
// The accessibility engine is bundled at build time: the packaged app has no
// node_modules on disk, so reading it from there never worked outside development.
import axeScript from 'axe-core/axe.min.js?raw';
import type { DesignDirection } from './directions';
import { isVisuallyHidden, measureTaste } from './taste-check';
import {
  BUTTON_CONTRAST,
  contrastRatio,
  round1,
  textContrastRequired,
} from './contrast';
import {
  changedPages,
  changedSelectors,
  changedStyleText,
  checkTasteOfCss,
  type ChangedText,
} from './taste-change';

/**
 * Quality checks on the built site (plan 4.4): layout overflow, keyboard use,
 * automated accessibility basics, broken links, speed, and how closely the page
 * follows the site's own design direction. Measured results are kept separate
 * from check execution failures and from design opinion.
 */

export type Finding = {
  id: string;
  label: string;
  /** Measured checks pass or fail; info is a judgement, not a measurement. */
  status: 'pass' | 'fail' | 'unknown' | 'info';
  /** Measured result, a check that could not run, or a design opinion. */
  kind: 'measured' | 'failure' | 'opinion';
  detail: string;
  page?: string;
  width?: number;
  /**
   * `site` is a whole-site diagnostic; `change` judges only what an agent run
   * added or changed (design/camillo/taste-tests.md).
   */
  scope?: 'site' | 'change';
};

export type Report = {
  built: boolean;
  builtAt: string;
  findings: Finding[];
  measured: Array<{ label: string; value: string }>;
  buildLog: string;
};

export type ContrastNode = {
  where: string;
  color: string;
  background: string;
  fontSize: number;
  fontWeight: number;
};

export type ButtonNode = {
  where: string;
  name: string;
  color: string;
  background: string;
};

/** Every text node is judged, at 4.5:1, or 3:1 for large text. */
export function summariseTextContrast(nodes: ContrastNode[]): {
  checked: number;
  failures: Array<{ where: string; ratio: number; required: number }>;
  lowest: number;
} {
  const judged = nodes.map((node) => ({
    where: node.where,
    ratio: round1(contrastRatio(node.color, node.background)),
    required: textContrastRequired(node.fontSize, node.fontWeight),
  }));
  return {
    checked: judged.length,
    failures: judged.filter((node) => node.ratio < node.required),
    lowest: judged.length
      ? round1(Math.min(...judged.map((node) => node.ratio)))
      : 0,
  };
}

/** Button text is held to 4.5:1 whatever its size. */
export function summariseButtonContrast(nodes: ButtonNode[]): {
  checked: number;
  failures: Array<{ where: string; name: string; ratio: number }>;
  lowest: number;
} {
  const judged = nodes.map((node) => ({
    where: node.where,
    name: node.name,
    ratio: round1(contrastRatio(node.color, node.background)),
  }));
  return {
    checked: judged.length,
    failures: judged.filter((node) => node.ratio < BUTTON_CONTRAST),
    lowest: judged.length
      ? round1(Math.min(...judged.map((node) => node.ratio)))
      : 0,
  };
}

const WIDTHS = [375, 768, 1280];

function typeFor(file: string): string {
  const ext = path.extname(file).toLowerCase();
  return (
    {
      '.html': 'text/html',
      '.css': 'text/css',
      '.js': 'text/javascript',
      '.mjs': 'text/javascript',
      '.svg': 'image/svg+xml',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.webp': 'image/webp',
      '.avif': 'image/avif',
      '.woff2': 'font/woff2',
      '.json': 'application/json',
    }[ext] ?? 'application/octet-stream'
  );
}

const PROTECTED_OUT_DIRS = new Set([
  'src',
  'public',
  '.git',
  'node_modules',
  '.astro',
  '.cauldron',
]);

function isProtectedOutDir(root: string, candidate: string): boolean {
  const rel = path.relative(root, candidate);
  if (!rel || rel === '.' || rel.startsWith('..')) return true;
  const topSegment = rel.split(path.sep)[0];
  return PROTECTED_OUT_DIRS.has(topSegment);
}

/**
 * Extract the top-level object body from `export default { ... }`,
 * `export default defineConfig({ ... })`, or `module.exports = ...` without
 * matching branches inside conditional expressions like `cond ? { outDir: ... } : {}`.
 */
function extractTopLevelConfigLiteral(raw: string): string | null {
  const exportMatch = raw.match(
    /(?:export\s+default|module\.exports\s*=)\s*(?:defineConfig\s*\(\s*)?/,
  );
  if (!exportMatch || exportMatch.index === undefined) return null;
  let i = exportMatch.index + exportMatch[0].length;
  while (i < raw.length && /\s/.test(raw[i])) i++;
  if (raw[i] !== '{') return null;

  let depth = 0;
  let quote: string | null = null;
  let escaped = false;
  let topLevel = '';
  for (; i < raw.length; i++) {
    const ch = raw[i];
    if (quote) {
      if (depth === 1) topLevel += ch;
      if (escaped) {
        escaped = false;
      } else if (ch === '\\') {
        escaped = true;
      } else if (ch === quote) {
        quote = null;
      }
      continue;
    }
    if (ch === '"' || ch === "'" || ch === '`') {
      quote = ch;
      if (depth === 1) topLevel += ch;
      continue;
    }
    if (ch === '{' || ch === '[') {
      depth++;
      continue;
    }
    if (ch === '}' || ch === ']') {
      depth--;
      if (depth <= 0) break;
      continue;
    }
    if (depth === 1) topLevel += ch;
  }
  return topLevel;
}

function resolveAstroOutDirInfo(root: string): {
  dist: string;
  canClean: boolean;
} {
  const defaultDist = path.join(root, 'dist');
  for (const ext of ['mjs', 'ts', 'js', 'cjs', 'mts']) {
    const configPath = path.join(root, `astro.config.${ext}`);
    if (!fs.existsSync(configPath)) continue;
    try {
      const raw = fs
        .readFileSync(configPath, 'utf8')
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/(?<!:)\/\/.*$/gm, '');
      const mentionsOutDir = /\boutDir\b/.test(raw);
      const topLevel = extractTopLevelConfigLiteral(raw);
      if (topLevel) {
        const matches = [
          ...topLevel.matchAll(
            /\boutDir\s*:\s*(['"`])([^'"`]+)\1(?=\s*[,}\n;]|$)/g,
          ),
        ];
        if (matches.length === 1) {
          const candidate = path.resolve(root, matches[0][2].trim());
          if (
            isInside(root, candidate) &&
            candidate !== path.resolve(root) &&
            !isProtectedOutDir(root, candidate)
          ) {
            return { dist: candidate, canClean: true };
          }
          return { dist: defaultDist, canClean: false };
        }
      }
      // If `outDir` appears conditionally, dynamically, or multiple times, fall
      // back to default `dist/` and refuse pre-build recursive deletion.
      if (mentionsOutDir) {
        return { dist: defaultDist, canClean: false };
      }
      return { dist: defaultDist, canClean: true };
    } catch {
      return { dist: defaultDist, canClean: false };
    }
  }
  return { dist: defaultDist, canClean: true };
}

/**
 * Resolve Astro's configured output directory from `astro.config.*`, defaulting
 * to `dist/` and refusing protected source paths, conditional configs, or
 * paths outside the site root.
 */
export function resolveAstroOutDir(root: string): string {
  return resolveAstroOutDirInfo(root).dist;
}

export function resolveSiteBuildConfig(
  root: string,
  resolveToolOverride?: (tool: string) => string | null,
): {
  dist: string;
  canCleanDist: boolean;
  manager: 'npm' | 'pnpm' | 'yarn';
  cmd: string;
  args: string[];
  env: NodeJS.ProcessEnv;
} {
  const { dist, canClean } = resolveAstroOutDirInfo(root);
  const setup = detectDependencySetup(root);
  const resolveTool = resolveToolOverride ?? resolveToolPath;
  const preferred = resolveTool(setup.manager);
  const fallbackNpm = setup.manager === 'pnpm' ? resolveTool('npm') : null;
  const manager: 'npm' | 'pnpm' | 'yarn' = preferred
    ? setup.manager
    : fallbackNpm
      ? 'npm'
      : setup.manager;
  const cmd = preferred ?? fallbackNpm ?? manager;
  const env = childEnvForTools({ ...process.env, CI: '1' });
  return {
    dist,
    canCleanDist: canClean,
    manager,
    cmd,
    args: ['run', 'build'],
    env,
  };
}

function prepareSiteBuild(root: string): {
  dist: string;
  cmd: string;
  args: string[];
  env: NodeJS.ProcessEnv;
} {
  const config = resolveSiteBuildConfig(root);
  try {
    if (
      config.canCleanDist &&
      config.dist !== path.resolve(root) &&
      isInside(root, config.dist) &&
      !isProtectedOutDir(root, config.dist) &&
      fs.existsSync(config.dist)
    ) {
      fs.rmSync(config.dist, { recursive: true, force: true });
    }
  } catch {
    // Stale output removal best effort
  }
  return config;
}

function formatBuildResult(
  dist: string,
  status: number | null,
  stdout: string,
  stderr: string,
  error?: Error | null,
): { ok: boolean; log: string; dist: string } {
  const errorMsg = error ? `${error.message}\n` : '';
  const log = `${errorMsg}${stdout}\n${stderr}`.trim().slice(-2000);
  return {
    ok: status === 0 && !error && fs.existsSync(dist),
    log,
    dist,
  };
}

export function buildSite(root: string): {
  ok: boolean;
  log: string;
  dist: string;
} {
  const { dist, cmd, args, env } = prepareSiteBuild(root);
  const result = spawnSync(cmd, args, {
    cwd: root,
    encoding: 'utf8',
    timeout: 300000,
    env,
  });
  return formatBuildResult(
    dist,
    result.status,
    result.stdout ?? '',
    result.stderr ?? '',
    result.error,
  );
}

/**
 * Runs the site's package-manager build script asynchronously so background
 * health verification and quality checks never freeze the Electron main process.
 */
export function buildSiteAsync(root: string): Promise<{
  ok: boolean;
  log: string;
  dist: string;
}> {
  const { dist, cmd, args, env } = prepareSiteBuild(root);
  return new Promise((resolve) => {
    const child = spawn(cmd, args, {
      cwd: root,
      env,
      stdio: ['ignore', 'pipe', 'pipe'],
      detached: process.platform !== 'win32',
    });
    let stdout = '';
    let stderr = '';
    let spawnError: Error | null = null;
    let settled = false;

    const finish = (status: number | null) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(formatBuildResult(dist, status, stdout, stderr, spawnError));
    };

    const timer = setTimeout(() => {
      spawnError = new Error('Site build timed out after 300 s.');
      try {
        if (process.platform !== 'win32' && child.pid) {
          process.kill(-child.pid, 'SIGTERM');
        } else {
          child.kill('SIGTERM');
        }
      } catch {
        child.kill('SIGTERM');
      }
      setTimeout(() => {
        try {
          if (process.platform !== 'win32' && child.pid) {
            process.kill(-child.pid, 'SIGKILL');
          } else if (child.exitCode === null) {
            child.kill('SIGKILL');
          }
        } catch {
          // Process already exited.
        }
        child.stdout?.destroy();
        child.stderr?.destroy();
        finish(child.exitCode);
      }, 2000).unref();
    }, 300000);
    timer.unref();

    child.stdout?.setEncoding('utf8');
    child.stdout?.on('data', (chunk: string) => {
      stdout = (stdout + chunk).slice(-8000);
    });
    child.stderr?.setEncoding('utf8');
    child.stderr?.on('data', (chunk: string) => {
      stderr = (stderr + chunk).slice(-8000);
    });
    child.on('error', (error) => {
      spawnError = error;
    });
    child.on('close', (code) => {
      finish(code);
    });
  });
}

/** Serves the built output, so checks run against what actually ships. */
export function serveDist(
  dist: string,
): Promise<{ url: string; close: () => void }> {
  const server = http.createServer((request, response) => {
    let file: string;
    try {
      const url = new URL(request.url ?? '/', 'http://127.0.0.1');
      file = path.join(dist, decodeURIComponent(url.pathname));
    } catch {
      response
        .writeHead(400, { 'content-type': 'text/plain' })
        .end('Bad address');
      return;
    }
    if (file !== dist && !file.startsWith(dist + path.sep)) {
      response.writeHead(403).end();
      return;
    }
    if (fs.existsSync(file) && fs.statSync(file).isDirectory()) {
      file = path.join(file, 'index.html');
    }
    if (!fs.existsSync(file)) {
      response
        .writeHead(404, { 'content-type': 'text/plain' })
        .end('Not found');
      return;
    }
    response.writeHead(200, { 'content-type': typeFor(file) });
    fs.createReadStream(file).pipe(response);
  });

  return new Promise((resolve, reject) => {
    server.on('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      const port = typeof address === 'object' && address ? address.port : 0;
      resolve({
        url: `http://127.0.0.1:${port}/`,
        close: () => server.close(),
      });
    });
  });
}

/** Everything a page can tell us about itself, measured in a real browser. */
const PAGE_PROBE = `(async () => {
  await Promise.race([
    document.fonts.ready,
    new Promise((resolve) => setTimeout(resolve, 5000)),
  ]);
  const result = {};
  result.fontsReady = document.fonts.status === 'loaded';

  const text = (el) => (el.textContent || '').replace(/\\s+/g, ' ').trim();
  const visible = (el) => {
    const style = getComputedStyle(el);
    return style.display !== 'none' && style.visibility !== 'hidden' && el.getBoundingClientRect().width > 0 &&
      // content-visibility:hidden (e.g. a closed <details> disclosure) keeps
      // layout boxes but shows nothing, so it is not visible to the person
      // using the page (ticket 29: closed mobile-menu links were measured).
      (el.checkVisibility ? el.checkVisibility() : true);
  };

  // Layout overflow
  result.overflow = {
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
    offenders: [...document.querySelectorAll('body *')]
      .filter((el) => visible(el) && el.getBoundingClientRect().right > document.documentElement.clientWidth + 2)
      .slice(0, 5)
      .map((el) => el.tagName.toLowerCase() + (el.className && typeof el.className === 'string' ? '.' + el.className.split(' ')[0] : '')),
  };

  // Accessibility basics
  const images = [...document.querySelectorAll('img')].filter(visible);
  result.imagesWithoutAlt = images.filter((img) => !img.hasAttribute('alt')).length;
  const fields = [...document.querySelectorAll('input, select, textarea')].filter(visible);
  result.unlabelledFields = fields.filter((field) => {
    if (field.getAttribute('aria-label') || field.getAttribute('aria-labelledby')) return false;
    if (field.id && document.querySelector('label[for="' + CSS.escape(field.id) + '"]')) return false;
    return !field.closest('label');
  }).length;
  const headings = [...document.querySelectorAll('h1, h2, h3, h4, h5, h6')].filter(visible);
  result.headings = headings.map((h) => ({ level: Number(h.tagName[1]), text: text(h).slice(0, 80) }));
  result.h1Count = headings.filter((h) => h.tagName === 'H1').length;
  result.hasLang = Boolean(document.documentElement.getAttribute('lang'));
  result.hasMain = Boolean(document.querySelector('main'));
  const nameless = [...document.querySelectorAll('a, button')].filter((el) => {
    if (!visible(el)) return false;
    const name = (el.getAttribute('aria-label') || text(el) || '').trim();
    return name === '';
  });
  result.controlsWithoutName = nameless.length;

  // Contrast inputs, collected as computed colours. The approved thresholds
  // (4.5:1 text, 4.5:1 buttons, 3:1 focus) are applied in the main process so
  // they can be tested without a browser.
  const parse = (value) => {
    const match = /rgba?\\(([^)]+)\\)/.exec(value || '');
    if (!match) return null;
    const parts = match[1].split(',').map((n) => Number(n.trim()));
    return { r: parts[0], g: parts[1], b: parts[2], a: parts.length > 3 ? parts[3] : 1 };
  };
  const backgroundOf = (el) => {
    let node = el;
    while (node) {
      const colour = parse(getComputedStyle(node).backgroundColor);
      if (colour && colour.a > 0.5) return getComputedStyle(node).backgroundColor;
      node = node.parentElement;
    }
    return 'rgb(255, 255, 255)';
  };
  const label = (el) =>
    el.tagName.toLowerCase() +
    (typeof el.className === 'string' && el.className
      ? '.' + el.className.split(' ')[0]
      : '');
  const ownText = (el) =>
    [...el.childNodes].some(
      (node) => node.nodeType === 3 && node.textContent.trim(),
    );
  const textElements = [...document.querySelectorAll('body *')].filter(
    (el) => visible(el) && ownText(el),
  );
  result.textNodeCount = textElements.length;
  result.textNodes = textElements.slice(0, 800).map((el) => {
    const style = getComputedStyle(el);
    return {
      where: label(el),
      color: style.color,
      background: backgroundOf(el),
      fontSize: Number.parseFloat(style.fontSize) || 0,
      fontWeight: Number(style.fontWeight) || 400,
    };
  });

  const buttons = [
    ...document.querySelectorAll(
      'button, [role="button"], input[type="submit"], input[type="button"], a[class*="button"], a[class*="btn"]',
    ),
  ].filter(visible);
  result.buttonNodes = buttons.map((el) => {
    const style = getComputedStyle(el);
    return {
      where: label(el),
      name: (el.getAttribute('aria-label') || text(el) || el.value || '').slice(0, 40),
      color: style.color,
      background: backgroundOf(el),
    };
  });

  // Keyboard reachability and focus contrast are measured with real Tab key
  // events in taste-check.ts, because programmatic focus cannot see
  // :focus-visible. Nothing is sampled for them here.

  // Hierarchy, for the taste checks
  const headingSizes = {};
  // The hierarchy check compares visible sizes. A heading whose only text is
  // visually hidden (screen-reader-only span, or an SVG wordmark whose glyphs
  // are drawn, not typed) has no visible type size and must not force the
  // smallest-heading comparison (ticket 29: the PeNtA h1 carries a hidden
  // "PeNtA" span and a full-width SVG wordmark).
  const headingHasVisibleText = (heading) =>
    [heading, ...heading.querySelectorAll('*')].some((node) =>
      [...node.childNodes].some(
        (n) =>
          n.nodeType === 3 &&
          n.textContent.trim() &&
          !n.parentElement.closest('svg') &&
          !(${isVisuallyHidden.toString()})(getComputedStyle(n.parentElement), n.parentElement.getBoundingClientRect()),
      ),
    );
  for (const heading of headings.filter(headingHasVisibleText)) {
    const size = Math.round(Number.parseFloat(getComputedStyle(heading).fontSize) * 10) / 10;
    const key = 'h' + heading.tagName[1];
    headingSizes[key] = Math.max(headingSizes[key] ?? 0, size);
  }
  const paragraphs = [...document.querySelectorAll('p')].filter(visible);
  // Body size is the size body copy actually uses — the most common paragraph
  // size — not the largest. A single display-size statement paragraph (an
  // ordinary editorial pattern) is not body copy, and taking the max made the
  // hierarchy check fail every page that has one (ticket 29).
  const sizeCounts = new Map();
  for (const p of paragraphs) {
    const size = Math.round(Number.parseFloat(getComputedStyle(p).fontSize) * 10) / 10;
    sizeCounts.set(size, (sizeCounts.get(size) ?? 0) + 1);
  }
  const bodySize = paragraphs.length
    ? [...sizeCounts.entries()].sort((a, b) => b[1] - a[1] || a[0] - b[0])[0][0]
    : 0;
  result.hierarchy = { headingSizes, bodySize };

  // Links
  result.links = [...document.querySelectorAll('a[href]')].map((a) => a.getAttribute('href')).filter(Boolean);

  // Speed, as the browser measured it
  const nav = performance.getEntriesByType('navigation')[0];
  result.timing = nav ? {
    domContentLoaded: Math.round(nav.domContentLoadedEventEnd),
    load: Math.round(nav.loadEventEnd),
    transferSize: nav.transferSize || 0,
  } : null;
  result.scripts = document.querySelectorAll('script[src]').length;
  result.htmlBytes = new Blob([document.documentElement.outerHTML]).size;

  return result;
})()`;

/** axe-core, the accessibility engine the taste tests name (plan 4.3 tests). */
function axeSource(): string | null {
  return axeScript || null;
}

type AxeViolation = {
  id: string;
  impact: string;
  help: string;
  nodes: number;
  where: string[];
};

export async function runAxe(
  window: BrowserWindow,
  context = 'document',
): Promise<AxeViolation[] | null> {
  const source = axeSource();
  if (!source) return null;
  try {
    await window.webContents.executeJavaScript(`(async () => {
      await document.fonts.ready;
      await Promise.race([
        Promise.allSettled(document.getAnimations().filter(animation => Number.isFinite(animation.effect.getComputedTiming().endTime)).map(animation => animation.finished)),
        new Promise(resolve => setTimeout(resolve, 2000))
      ]);
    })()`);
    await window.webContents.executeJavaScript(
      `${source}\n;Boolean(window.axe)`,
    );
    return (await window.webContents.executeJavaScript(
      `window.axe.run(${context}, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] } })
        .then((report) => report.violations.map((v) => ({
          id: v.id,
          impact: v.impact,
          help: v.help,
          nodes: v.nodes.length,
          where: v.nodes.slice(0, 6).map((n) => n.target.join(' ') + ' — ' + (n.any[0]?.message ?? '')),
        })))`,
    )) as AxeViolation[];
  } catch (error) {
    const message = `The accessibility check could not run: ${
      error instanceof Error ? error.message : String(error)
    }`;
    console.error(message);
    throw new Error(message);
  }
}

/** Loads a page in a headless window, for tests that need to look at the built site. */
export function inspectionWindow(): BrowserWindow {
  if (!ElectronBrowserWindow) {
    throw new Error('BrowserWindow is only available inside Electron.');
  }
  return new ElectronBrowserWindow({
    show: false,
    width: 1280,
    height: 900,
    webPreferences: {
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
}

async function probe(
  window: BrowserWindow,
  url: string,
  width: number,
): Promise<Record<string, unknown> | null> {
  window.setContentSize(width, 900);
  await window.loadURL(url);
  await new Promise((resolve) => setTimeout(resolve, 350));
  try {
    return (await window.webContents.executeJavaScript(PAGE_PROBE)) as Record<
      string,
      unknown
    >;
  } catch {
    return null;
  }
}

export async function checkSite(options: {
  root: string;
  direction: DesignDirection | null;
  pages: string[];
  /** The files the last agent run changed, for judging its output alone. */
  changed?: ChangedText[];
  onProgress?: (message: string) => void;
}): Promise<Report> {
  const findings: Finding[] = [];
  const measured: Array<{ label: string; value: string }> = [];
  const add = (finding: Omit<Finding, 'kind'> & { kind?: Finding['kind'] }) =>
    findings.push({ kind: 'measured', ...finding });

  options.onProgress?.('Building the site…');
  const built = await buildSiteAsync(options.root);
  if (!built.ok) {
    return {
      built: false,
      builtAt: new Date().toISOString(),
      buildLog: built.log,
      measured,
      findings: [
        {
          id: 'build',
          label: 'The site builds',
          status: 'fail',
          kind: 'measured',
          detail: built.log.slice(-600) || 'The build failed.',
        },
      ],
    };
  }

  const server = await serveDist(built.dist);
  const window = inspectionWindow();

  try {
    for (const page of options.pages) {
      const url = new URL(page.replace(/^\/+/, ''), server.url).href;
      // The desktop pass fills this in; page-wide checks that cannot change with
      // the viewport (structure, links) use it after the widths are done.
      let desktop: Record<string, unknown> | null = null;

      for (const width of WIDTHS) {
        options.onProgress?.(`Checking ${page} at ${width}px…`);
        const data = await probe(window, url, width);
        if (!data) {
          add({
            id: `load-${page}-${width}`,
            label: 'The page loads',
            status: 'unknown',
            kind: 'failure',
            detail: 'The page did not respond, so nothing on it was measured.',
            page,
            width,
          });
          continue;
        }
        if (width === 1280) desktop = data;

        const overflow = data.overflow as {
          scrollWidth: number;
          clientWidth: number;
          offenders: string[];
        };
        const overflowing = overflow.scrollWidth > overflow.clientWidth + 2;
        add({
          id: `overflow-${page}-${width}`,
          label: 'No horizontal overflow',
          status: overflowing ? 'fail' : 'pass',
          detail: overflowing
            ? `Page is ${overflow.scrollWidth - overflow.clientWidth}px wider than the window. ${overflow.offenders.join(', ')}`
            : 'Fits the window.',
          page,
          width,
        });

        if (width === 1280) {
          const fontsReady = Boolean(data.fontsReady);
          add({
            id: `fonts-${page}`,
            label: 'Fonts were ready before measuring',
            status: fontsReady ? 'pass' : 'unknown',
            kind: fontsReady ? 'measured' : 'failure',
            detail: fontsReady
              ? 'The page reported its fonts loaded before any measurement.'
              : 'The fonts did not finish loading within five seconds, so text size, spacing and contrast may have been measured on a fallback font.',
            page,
          });
        }

        const text = summariseTextContrast(data.textNodes as ContrastNode[]);
        const totalText = Number(data.textNodeCount ?? text.checked);
        add({
          id: `contrast-${page}-${width}`,
          label: 'Text has enough contrast',
          status: text.failures.length === 0 ? 'pass' : 'fail',
          detail:
            text.failures.length === 0
              ? `Checked ${text.checked}${
                  totalText > text.checked ? ` of ${totalText}` : ''
                } text nodes; lowest ${text.lowest}:1.`
              : `${text.failures.length} of ${text.checked} text nodes are under their threshold: ${text.failures
                  .slice(0, 4)
                  .map(
                    (failure) =>
                      `${failure.where} ${failure.ratio}:1 (needs ${failure.required}:1)`,
                  )
                  .join('; ')}`,
          page,
          width,
        });

        const buttons = summariseButtonContrast(
          data.buttonNodes as ButtonNode[],
        );
        add({
          id: `buttons-${page}-${width}`,
          label: 'Button text has enough contrast',
          status: buttons.failures.length === 0 ? 'pass' : 'fail',
          detail:
            buttons.checked === 0
              ? 'No buttons on this page.'
              : buttons.failures.length === 0
                ? `Checked ${buttons.checked} button(s) at 4.5:1; lowest ${buttons.lowest}:1.`
                : `${buttons.failures.length} of ${buttons.checked} button(s) are under 4.5:1: ${buttons.failures
                    .slice(0, 4)
                    .map(
                      (failure) =>
                        `${failure.name || failure.where} ${failure.ratio}:1`,
                    )
                    .join('; ')}`,
          page,
          width,
        });

        let axe: AxeViolation[] | null = null;
        let axeProblem = '';
        try {
          axe = await runAxe(window);
        } catch (error) {
          axeProblem = error instanceof Error ? error.message : String(error);
        }
        if (axeProblem) {
          add({
            id: `axe-${page}-${width}`,
            label: 'Automated accessibility (axe)',
            status: 'unknown',
            kind: 'failure',
            detail: `${axeProblem} Accessibility is not verified.`,
            page,
            width,
          });
        } else if (!axe) {
          add({
            id: `axe-${page}-${width}`,
            label: 'Automated accessibility (axe)',
            status: 'unknown',
            kind: 'failure',
            detail: 'axe could not run; accessibility is not verified.',
            page,
            width,
          });
        } else {
          add({
            id: `axe-${page}-${width}`,
            label: 'Automated accessibility (axe)',
            status: axe.length === 0 ? 'pass' : 'fail',
            detail:
              axe.length === 0
                ? 'No axe violations against WCAG 2.1 A and AA.'
                : `${axe.length} rule(s) failed: ${axe
                    .slice(0, 5)
                    .map((violation) => `${violation.id} (${violation.nodes}×)`)
                    .join(', ')}`,
            page,
            width,
          });
        }

        measured.push({
          label: `Load (${page} at ${width}px)`,
          value: `${(data.timing as { load: number } | null)?.load ?? 0}ms`,
        });
        measured.push({
          label: `Scripts (${page} at ${width}px)`,
          value: String(data.scripts),
        });
        measured.push({
          label: `HTML size (${page} at ${width}px)`,
          value: `${Math.round((data.htmlBytes as number) / 1024)}kb`,
        });

        if (options.direction) {
          try {
            findings.push(
              ...(await measureTaste(window, options.direction, page, {
                scope: 'body',
                width,
                kind: 'site',
              })),
            );
          } catch (error) {
            add({
              id: `taste-${page}-${width}`,
              label: 'Taste checks',
              status: 'unknown',
              kind: 'failure',
              detail: `The taste checks could not run: ${
                error instanceof Error ? error.message : String(error)
              }`,
              page,
              width,
            });
          }
        }
      }

      const data = desktop;
      if (!data) continue;

      const imagesWithoutAlt = data.imagesWithoutAlt as number;
      add({
        id: `alt-${page}`,
        label: 'Images have alternative text',
        status: imagesWithoutAlt === 0 ? 'pass' : 'fail',
        detail:
          imagesWithoutAlt === 0
            ? 'Every image has an alt.'
            : `${imagesWithoutAlt} image(s) have no alt.`,
        page,
      });

      const unlabelled = data.unlabelledFields as number;
      add({
        id: `labels-${page}`,
        label: 'Form fields are labelled',
        status: unlabelled === 0 ? 'pass' : 'fail',
        detail:
          unlabelled === 0
            ? 'Every field has a label.'
            : `${unlabelled} field(s) have no label.`,
        page,
      });

      const h1Count = data.h1Count as number;
      const headings = data.headings as Array<{ level: number }>;
      const skipped = headings.some((heading, index) =>
        index > 0 ? heading.level - headings[index - 1].level > 1 : false,
      );
      add({
        id: `headings-${page}`,
        label: 'Headings are in order',
        status: h1Count === 1 && !skipped ? 'pass' : 'fail',
        detail: `${h1Count} h1, ${headings.length} headings${skipped ? ', with a level skipped' : ''}.`,
        page,
      });

      add({
        id: `lang-${page}`,
        label: 'The page says what language it is',
        status: data.hasLang && data.hasMain ? 'pass' : 'fail',
        detail: `${data.hasLang ? 'lang set' : 'no lang'}, ${data.hasMain ? 'main landmark' : 'no main landmark'}.`,
        page,
      });

      const controlsWithoutName = data.controlsWithoutName as number;
      add({
        id: `names-${page}`,
        label: 'Buttons and links say what they do',
        status: controlsWithoutName === 0 ? 'pass' : 'fail',
        detail:
          controlsWithoutName === 0
            ? 'Every control has a name.'
            : `${controlsWithoutName} control(s) have no accessible name.`,
        page,
      });

      if (options.direction) {
        const hierarchy = data.hierarchy as {
          headingSizes: Record<string, number>;
          bodySize: number;
        };
        const levels = [1, 2, 3, 4, 5, 6]
          .map((level) => hierarchy.headingSizes[`h${level}`])
          .filter((size): size is number => typeof size === 'number');
        const outOfOrder = levels.some(
          (size, index) => index > 0 && size >= levels[index - 1],
        );
        const headingsLargerThanBody =
          levels.length === 0 ||
          hierarchy.bodySize === 0 ||
          levels[levels.length - 1] > hierarchy.bodySize;
        add({
          id: `hierarchy-${page}`,
          label: 'The hierarchy is clear',
          status: !outOfOrder && headingsLargerThanBody ? 'pass' : 'fail',
          detail: outOfOrder
            ? `Headings do not step down in size: ${levels.join('px, ')}px`
            : headingsLargerThanBody
              ? `Headings ${levels.join('/')}px, body ${hierarchy.bodySize}px.`
              : `Body text (${hierarchy.bodySize}px) is not smaller than the smallest heading.`,
          page,
        });
      }

      const links = data.links as string[];
      const internal = links
        .map((href) => {
          try {
            return new URL(href, url);
          } catch {
            return null;
          }
        })
        .filter(
          (link): link is URL =>
            Boolean(link) && link!.origin === new URL(server.url).origin,
        )
        .map((link) => link.pathname + link.search + link.hash);
      const broken: string[] = [];
      for (const href of [...new Set(internal)].slice(0, 60)) {
        try {
          const response = await fetch(new URL(href, server.url).href);
          if (response.status >= 400)
            broken.push(`${href} (${response.status})`);
        } catch {
          broken.push(href);
        }
      }
      add({
        id: `links-${page}`,
        label: 'Internal links work',
        status: broken.length === 0 ? 'pass' : 'fail',
        detail:
          broken.length === 0
            ? `Checked ${internal.length} internal links.`
            : `Broken: ${broken.slice(0, 5).join(', ')}`,
        page,
      });
    }

    // The approved taste test that cannot be automated (4.1 #13) stays a
    // person's judgement, and is shown as opinion rather than a measurement.
    findings.push({
      id: 'opinion-ai-look',
      label: 'The overall “AI look” is a person’s call',
      status: 'info',
      kind: 'opinion',
      detail:
        'No automatic measurement can decide whether a page feels generic. Look at the built page yourself and decide.',
    });
    // The run's own output, judged against the site's tokens (ticket 24). The
    // whole-site findings above stay as diagnostics; these are the ones that
    // describe what the agent actually wrote.
    if (options.direction && options.changed && options.changed.length > 0) {
      const direction = options.direction;
      const touched = changedPages(options.changed);
      const chosen =
        touched.pages.length > 0
          ? touched.shared
            ? [...new Set([...touched.pages, ...options.pages])]
            : touched.pages
          : options.pages;
      const pages = chosen.filter((page) => !page.includes('[')).slice(0, 4);
      const selectors = changedSelectors(options.changed);
      const scope = selectors.join(', ');
      const label = pages[0] ?? '/';

      options.onProgress?.("Judging the agent's own changes…");
      for (const { file, css } of changedStyleText(options.changed)) {
        if (!css.trim()) continue;
        findings.push(...checkTasteOfCss(css, direction, `${label} (${file})`));
      }

      if (selectors.length === 0) {
        findings.push({
          id: 'change-scope',
          label: 'Agent changes: the run’s output was found in the built page',
          status: 'unknown',
          kind: 'failure',
          detail: `${options.changed.length} file(s) changed, but none added a class, id or style rule that the built page can be narrowed to. Nothing was judged as the agent's own work.`,
          scope: 'change',
        });
      }
      let matched = 0;
      for (const page of selectors.length === 0 ? [] : pages) {
        const url = new URL(page.replace(/^\/+/, ''), server.url).href;
        for (const width of WIDTHS) {
          options.onProgress?.(
            `Judging the agent's changes on ${page} at ${width}px…`,
          );
          const loaded = await probe(window, url, width);
          if (!loaded) {
            findings.push({
              id: `change-taste-${page}-${width}`,
              label: 'Agent changes: the page loads',
              status: 'unknown',
              kind: 'failure',
              detail:
                'The page did not respond, so the changes were not judged.',
              page,
              width,
              scope: 'change',
            });
            continue;
          }
          // A page that does not carry the change has nothing to judge.
          const found = (await window.webContents.executeJavaScript(
            `document.querySelectorAll(${JSON.stringify(scope)}).length`,
          )) as number;
          if (!found) continue;
          matched += found;
          try {
            findings.push(
              ...(await measureTaste(window, direction, page, {
                scope,
                declarations: false,
                width,
                kind: 'change',
              })),
            );
          } catch (error) {
            findings.push({
              id: `change-taste-${page}-${width}`,
              label: 'Agent changes: taste checks',
              status: 'unknown',
              kind: 'failure',
              detail: `${String(error)} (selectors: ${selectors.slice(0, 6).join(', ')})`,
              page,
              width,
              scope: 'change',
            });
          }
        }
      }
      if (selectors.length > 0 && matched === 0)
        findings.push({
          id: 'change-scope',
          label: 'Agent changes: the run’s output was found in the built page',
          status: 'unknown',
          kind: 'failure',
          detail: `The run added ${selectors.slice(0, 6).join(', ')}, but nothing on the built pages carried it, so its output was not judged.`,
          scope: 'change',
        });
    }
  } finally {
    server.close();
    if (!window.isDestroyed()) window.destroy();
  }

  return {
    built: true,
    builtAt: new Date().toISOString(),
    buildLog: built.log,
    findings,
    measured,
  };
}
