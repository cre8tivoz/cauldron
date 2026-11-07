import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { spawnSync } from 'node:child_process';
import { BrowserWindow, app } from 'electron';
import type { DesignDirection } from './directions';
import { measureTaste } from './taste-check';

/**
 * Quality checks on the built site (plan 4.4): layout overflow, keyboard use,
 * automated accessibility basics, broken links, speed, and how closely the page
 * follows the site's own design direction. Measured results are kept separate
 * from opinion.
 */

export type Finding = {
  id: string;
  label: string;
  status: 'pass' | 'fail' | 'unknown';
  detail: string;
  page?: string;
  width?: number;
};

export type Report = {
  built: boolean;
  builtAt: string;
  findings: Finding[];
  measured: Array<{ label: string; value: string }>;
  buildLog: string;
};

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

export function buildSite(root: string): {
  ok: boolean;
  log: string;
  dist: string;
} {
  const dist = path.join(root, 'dist');
  const result = spawnSync('npm', ['run', 'build'], {
    cwd: root,
    encoding: 'utf8',
    timeout: 300000,
    env: { ...process.env, CI: '1' },
  });
  const log = `${result.stdout ?? ''}\n${result.stderr ?? ''}`
    .trim()
    .slice(-2000);
  return { ok: result.status === 0 && fs.existsSync(dist), log, dist };
}

/** Serves the built output, so checks run against what actually ships. */
export function serveDist(
  dist: string,
): Promise<{ url: string; close: () => void }> {
  const server = http.createServer((request, response) => {
    const url = new URL(request.url ?? '/', 'http://127.0.0.1');
    let file = path.join(dist, decodeURIComponent(url.pathname));
    if (!file.startsWith(dist)) {
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
  await document.fonts.ready;
  const result = {};

  const text = (el) => (el.textContent || '').replace(/\\s+/g, ' ').trim();
  const visible = (el) => {
    const style = getComputedStyle(el);
    return style.display !== 'none' && style.visibility !== 'hidden' && el.getBoundingClientRect().width > 0;
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

  // Contrast of the text people actually read
  const parse = (value) => {
    const match = /rgba?\\(([^)]+)\\)/.exec(value || '');
    if (!match) return null;
    const parts = match[1].split(',').map((n) => Number(n.trim()));
    return { r: parts[0], g: parts[1], b: parts[2], a: parts.length > 3 ? parts[3] : 1 };
  };
  const lum = (c) => {
    const channel = (v) => {
      const s = v / 255;
      return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
    };
    return 0.2126 * channel(c.r) + 0.7152 * channel(c.g) + 0.0722 * channel(c.b);
  };
  const backgroundOf = (el) => {
    let node = el;
    while (node) {
      const colour = parse(getComputedStyle(node).backgroundColor);
      if (colour && colour.a > 0.5) return colour;
      node = node.parentElement;
    }
    return { r: 255, g: 255, b: 255, a: 1 };
  };
  const ratio = (a, b) => {
    const la = lum(a);
    const lb = lum(b);
    const light = Math.max(la, lb);
    const dark = Math.min(la, lb);
    return (light + 0.05) / (dark + 0.05);
  };
  const readable = [...document.querySelectorAll('p, li, h1, h2, h3, a, button, span')]
    .filter((el) => visible(el) && text(el).length > 12)
    .slice(0, 60);
  result.contrast = readable.map((el) => {
    const style = getComputedStyle(el);
    const colour = parse(style.color);
    if (!colour) return null;
    const size = Number.parseFloat(style.fontSize);
    const bold = Number(style.fontWeight) >= 700;
    const large = size >= 24 || (bold && size >= 18.66);
    return {
      where: el.tagName.toLowerCase() + (typeof el.className === 'string' && el.className ? '.' + el.className.split(' ')[0] : ''),
      ratio: Math.round(ratio(colour, backgroundOf(el)) * 100) / 100,
      required: large ? 3 : 4.5,
    };
  }).filter(Boolean);

  // Type and colour, to compare with the site's direction
  result.type = [...new Set([...document.querySelectorAll('h1, h2, h3, p, button, a')]
    .filter(visible)
    .map((el) => Math.round(Number.parseFloat(getComputedStyle(el).fontSize) * 100) / 100))].sort((a, b) => a - b);
  result.families = [...new Set([...document.querySelectorAll('h1, h2, h3, p, button')]
    .filter(visible)
    .map((el) => getComputedStyle(el).fontFamily.split(',')[0].replace(/["']/g, '').trim()))];
  result.colours = [...new Set([...document.querySelectorAll('body *')]
    .filter((el) => visible(el))
    .map((el) => getComputedStyle(el).color + '|' + getComputedStyle(el).backgroundColor))].slice(0, 80);

  // Keyboard: every control reachable, and visible when focused
  const focusables = [...document.querySelectorAll('a[href], button, input, select, textarea, [tabindex]:not([tabindex="-1"])')]
    .filter((el) => visible(el) && !el.hasAttribute('disabled'));
  result.focusableCount = focusables.length;
  const noIndicator = [];
  for (const el of focusables.slice(0, 40)) {
    const before = getComputedStyle(el);
    const beforeOutline = before.outlineStyle + before.outlineWidth + before.boxShadow;
    el.focus();
    const after = getComputedStyle(el);
    const afterOutline = after.outlineStyle + after.outlineWidth + after.boxShadow;
    if (beforeOutline === afterOutline) noIndicator.push(el.tagName.toLowerCase());
  }
  result.focusWithoutIndicator = noIndicator;

  // Spacing rhythm and hierarchy, for the taste checks
  const spacingValues = new Set();
  for (const el of [...document.querySelectorAll('body *')].slice(0, 400)) {
    if (!visible(el)) continue;
    const style = getComputedStyle(el);
    for (const value of [
      style.marginTop, style.marginBottom, style.marginLeft, style.marginRight,
      style.paddingTop, style.paddingBottom, style.paddingLeft, style.paddingRight,
      style.rowGap, style.columnGap,
    ]) {
      const number = Math.round(Number.parseFloat(value));
      if (number > 0) spacingValues.add(number);
    }
  }
  result.spacing = [...spacingValues].sort((a, b) => a - b);

  const headingSizes = {};
  for (const heading of headings) {
    const size = Math.round(Number.parseFloat(getComputedStyle(heading).fontSize) * 10) / 10;
    const key = 'h' + heading.tagName[1];
    headingSizes[key] = Math.max(headingSizes[key] ?? 0, size);
  }
  const paragraphs = [...document.querySelectorAll('p')].filter(visible);
  const bodySize = paragraphs.length
    ? Math.max(...paragraphs.map((p) => Number.parseFloat(getComputedStyle(p).fontSize)))
    : 0;
  result.hierarchy = { headingSizes, bodySize };

  // The taste anti-patterns, checked rather than assumed
  const all = [...document.querySelectorAll('body *')].filter(visible);
  result.pureBlack = all.filter((el) => {
    const background = getComputedStyle(el).backgroundColor;
    return background === 'rgb(0, 0, 0)' || getComputedStyle(el).color === 'rgb(0, 0, 0)';
  }).length;

  const cardLike = (el) => {
    const style = getComputedStyle(el);
    const radius = Number.parseFloat(style.borderTopLeftRadius) || 0;
    const background = style.backgroundColor;
    const hasBackground = background !== 'rgba(0, 0, 0, 0)' && background !== 'transparent';
    const hasBorder = Number.parseFloat(style.borderTopWidth) > 0;
    return (hasBackground || hasBorder) && radius > 0;
  };
  result.cardsInCards = all.filter((el) => cardLike(el) && el.parentElement && cardLike(el.parentElement)).length;

  const gradientTrouble = [];
  for (const el of all.slice(0, 300)) {
    const image = getComputedStyle(el).backgroundImage;
    if (!image || !image.includes('gradient')) continue;
    const stops = [...image.matchAll(/rgba?(([^)]+))/g)].map((m) => m[1].split(',').map(Number));
    const blue = stops.filter(([, , b]) => b > 120);
    const reddish = stops.filter(([r, , b]) => r > 90 && b > 90);
    if (blue.length >= 2 && reddish.length >= 1) {
      const hues = stops.map(([r, g, b]) => ({ r, g, b }));
      const purple = hues.filter(({ r, g, b }) => b > 110 && r > 60 && r < 150 && g < 110);
      if (purple.length >= 1) {
        gradientTrouble.push(el.tagName.toLowerCase());
      }
    }
  }
  result.bluePurpleGradients = gradientTrouble.length;

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
  const candidates = [
    path.join(app.getAppPath(), 'node_modules/axe-core/axe.min.js'),
    path.join(process.cwd(), 'node_modules/axe-core/axe.min.js'),
  ];
  for (const file of candidates) {
    try {
      if (fs.existsSync(file)) return fs.readFileSync(file, 'utf8');
    } catch {
      // Try the next place.
    }
  }
  return null;
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
  } catch {
    return null;
  }
}

/** Loads a page in a headless window, for tests that need to look at the built site. */
export function inspectionWindow(): BrowserWindow {
  return new BrowserWindow({
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
  onProgress?: (message: string) => void;
}): Promise<Report> {
  const findings: Finding[] = [];
  const measured: Array<{ label: string; value: string }> = [];

  options.onProgress?.('Building the site…');
  const built = buildSite(options.root);
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
          detail: built.log.slice(-600) || 'The build failed.',
        },
      ],
    };
  }

  const server = await serveDist(built.dist);
  const window = new BrowserWindow({
    show: false,
    width: 1280,
    height: 900,
    webPreferences: {
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  try {
    for (const page of options.pages) {
      const url = new URL(page.replace(/^\/+/, ''), server.url).href;
      for (const width of WIDTHS) {
        options.onProgress?.(`Checking ${page} at ${width}px…`);
        const data = await probe(window, url, width);
        if (!data) {
          findings.push({
            id: `load-${page}-${width}`,
            label: 'The page loads',
            status: 'unknown',
            detail: 'The page did not respond.',
            page,
            width,
          });
          continue;
        }

        const overflow = data.overflow as {
          scrollWidth: number;
          clientWidth: number;
          offenders: string[];
        };
        findings.push({
          id: `overflow-${page}-${width}`,
          label: 'No horizontal overflow',
          status:
            overflow.scrollWidth > overflow.clientWidth + 2 ? 'fail' : 'pass',
          detail:
            overflow.scrollWidth > overflow.clientWidth + 2
              ? `Page is ${overflow.scrollWidth - overflow.clientWidth}px wider than the window. ${overflow.offenders.join(', ')}`
              : 'Fits the window.',
          page,
          width,
        });

        if (width === 1280) {
          const imagesWithoutAlt = data.imagesWithoutAlt as number;
          findings.push({
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
          findings.push({
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
          findings.push({
            id: `headings-${page}`,
            label: 'Headings are in order',
            status: h1Count === 1 && !skipped ? 'pass' : 'fail',
            detail: `${h1Count} h1, ${headings.length} headings${skipped ? ', with a level skipped' : ''}.`,
            page,
          });

          findings.push({
            id: `lang-${page}`,
            label: 'The page says what language it is',
            status: data.hasLang && data.hasMain ? 'pass' : 'fail',
            detail: `${data.hasLang ? 'lang set' : 'no lang'}, ${data.hasMain ? 'main landmark' : 'no main landmark'}.`,
            page,
          });

          const controlsWithoutName = data.controlsWithoutName as number;
          findings.push({
            id: `names-${page}`,
            label: 'Buttons and links say what they do',
            status: controlsWithoutName === 0 ? 'pass' : 'fail',
            detail:
              controlsWithoutName === 0
                ? 'Every control has a name.'
                : `${controlsWithoutName} control(s) have no accessible name.`,
            page,
          });

          const contrast = data.contrast as Array<{
            where: string;
            ratio: number;
            required: number;
          }>;
          const failing = contrast.filter((item) => item.ratio < item.required);
          findings.push({
            id: `contrast-${page}`,
            label: 'Text has enough contrast',
            status: failing.length === 0 ? 'pass' : 'fail',
            detail:
              failing.length === 0
                ? `Checked ${contrast.length} pieces of text.`
                : failing
                    .slice(0, 4)
                    .map(
                      (item) =>
                        `${item.where} ${item.ratio}:1 (needs ${item.required}:1)`,
                    )
                    .join('; '),
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
            findings.push({
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

          const axe = await runAxe(window);
          if (!axe)
            findings.push({
              id: `axe-${page}`,
              label: 'Automated accessibility (axe)',
              status: 'unknown',
              detail: 'axe could not run; accessibility is not verified.',
              page,
            });
          if (axe) {
            findings.push({
              id: `axe-${page}`,
              label: 'Automated accessibility (axe)',
              status: axe.length === 0 ? 'pass' : 'fail',
              detail:
                axe.length === 0
                  ? 'No axe violations against WCAG 2.1 A and AA.'
                  : `${axe.length} rule(s) failed: ${axe
                      .slice(0, 5)
                      .map(
                        (violation) => `${violation.id} (${violation.nodes}×)`,
                      )
                      .join(', ')}`,
              page,
            });
          }

          measured.push({
            label: `Load (${page})`,
            value: `${(data.timing as { load: number } | null)?.load ?? 0}ms`,
          });
          measured.push({
            label: `Scripts (${page})`,
            value: String(data.scripts),
          });
          measured.push({
            label: `HTML size (${page})`,
            value: `${Math.round((data.htmlBytes as number) / 1024)}kb`,
          });

          if (options.direction) {
            try {
              findings.push(
                ...(await measureTaste(window, options.direction, page)),
              );
            } catch (error) {
              findings.push({
                id: `taste-${page}`,
                label: 'Taste checks',
                status: 'unknown',
                detail: String(error),
                page,
              });
            }
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
          findings.push({
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
      }
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
