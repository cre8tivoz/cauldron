import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { hashOf, isInside, writeFileAtomic } from './files';
import type {
  ResponsiveBreakpoint,
  ResponsiveStyleMap,
} from '../responsive-layer';

export const RESPONSIVE_CSS_REL = 'cauldron/responsive.css';
const HEADER_COMMENT =
  '/* Managed by Cauldron responsive layer edits. Plain CSS; safe to edit or keep without Cauldron. */';
const MANAGED_START = '/* cauldron:responsive:start */';
const MANAGED_END = '/* cauldron:responsive:end */';

const BREAKPOINT_WIDTHS: Record<ResponsiveBreakpoint, number> = {
  tablet: 768,
  phone: 375,
};

const VALID_ID = /^r-[a-z0-9_-]{4,24}$/i;
const VALID_PROP = /^[a-z][a-z0-9-]*$/;
const UNSAFE_VALUE = /[;{}\r\n]|\/\*|\*\/|\burl\s*\(/i;

export type ResponsiveRuleSet = Record<
  ResponsiveBreakpoint,
  Record<string, Record<string, string>>
>;

/** Deterministic, human-readable identifier for targeting an element in CSS. */
export function createResponsiveId(
  relativeFile: string,
  line: number,
  column: number,
  name: string,
): string {
  const digest = crypto
    .createHash('sha256')
    .update(`${relativeFile}:${line}:${column}:${name}`)
    .digest('hex')
    .slice(0, 8);
  return `r-${digest}`;
}

export function isValidResponsiveId(id: string): boolean {
  return VALID_ID.test(id);
}

/**
 * Allocates a unique responsive ID that will not collide with any existing
 * `data-cauldron-r` attribute in the file or any selector already present in
 * `cauldron/responsive.css` (even after sections move to an earlier line).
 */
export function allocateResponsiveId(
  siteRoot: string,
  sourceText: string,
  relativeFile: string,
  line: number,
  column: number,
  name: string,
): string {
  const used = new Set<string>();
  const attrPattern = /\bdata-cauldron-r\s*=\s*["']([^"']+)["']/gi;
  let match: RegExpExecArray | null;
  while ((match = attrPattern.exec(sourceText)) !== null) {
    used.add(match[1]);
  }
  const cssFile = path.join(siteRoot, RESPONSIVE_CSS_REL);
  if (isInside(siteRoot, cssFile) && fs.existsSync(cssFile)) {
    const parsed = parseResponsiveCss(fs.readFileSync(cssFile, 'utf8'));
    for (const id of Object.keys(parsed.tablet)) used.add(id);
    for (const id of Object.keys(parsed.phone)) used.add(id);
  }

  let candidate = createResponsiveId(relativeFile, line, column, name);
  while (used.has(candidate)) {
    candidate = `r-${crypto.randomBytes(4).toString('hex')}`;
  }
  return candidate;
}

/** Finds the matching closing brace for the `{` at `openBraceIndex`. */
function findMatchingBrace(text: string, openBraceIndex: number): number {
  let depth = 0;
  let inComment = false;
  let quote: string | null = null;
  for (let i = openBraceIndex; i < text.length; i += 1) {
    const ch = text[i];
    const next = text[i + 1];
    if (inComment) {
      if (ch === '*' && next === '/') {
        inComment = false;
        i += 1;
      }
      continue;
    }
    if (quote) {
      if (ch === '\\') {
        i += 1;
      } else if (ch === quote) {
        quote = null;
      }
      continue;
    }
    if (ch === '/' && next === '*') {
      inComment = true;
      i += 1;
      continue;
    }
    if (ch === '"' || ch === "'") {
      quote = ch;
      continue;
    }
    if (ch === '{') {
      depth += 1;
    } else if (ch === '}') {
      depth -= 1;
      if (depth === 0) return i;
    }
  }
  return -1;
}

/**
 * Extracts Cauldron-managed `[data-cauldron-r="..."]` rules inside the two
 * managed breakpoints (`768px` and `375px`) while preserving any custom CSS
 * rules or extra media queries byte-for-byte.
 */
function extractManagedAndPreserved(css: string): {
  rules: ResponsiveRuleSet;
  preserved: string;
} {
  const rules: ResponsiveRuleSet = { tablet: {}, phone: {} };
  const preservedChunks: string[] = [];
  const mediaStartPattern =
    /@media\s*\(\s*max-width\s*:\s*(768|375)px\s*\)\s*\{/g;
  let cursor = 0;

  while (cursor < css.length) {
    mediaStartPattern.lastIndex = cursor;
    const match = mediaStartPattern.exec(css);
    if (!match) {
      preservedChunks.push(css.slice(cursor));
      break;
    }
    const blockStart = match.index;
    const openBrace = blockStart + match[0].length - 1;
    const closeBrace = findMatchingBrace(css, openBrace);
    if (closeBrace === -1) {
      preservedChunks.push(css.slice(cursor));
      break;
    }

    preservedChunks.push(css.slice(cursor, blockStart));
    const bp: ResponsiveBreakpoint = match[1] === '768' ? 'tablet' : 'phone';
    const body = css.slice(openBrace + 1, closeBrace);

    const rulePattern =
      /\[data-cauldron-r="([a-z0-9_-]+)"\]\s*\{([\s\S]*?)\}/gi;
    let bodyCursor = 0;
    const customInsideBody: string[] = [];
    let ruleMatch: RegExpExecArray | null;
    while ((ruleMatch = rulePattern.exec(body)) !== null) {
      customInsideBody.push(body.slice(bodyCursor, ruleMatch.index));
      bodyCursor = ruleMatch.index + ruleMatch[0].length;
      const id = ruleMatch[1];
      const declarations: Record<string, string> = {};
      for (const line of ruleMatch[2].split(';')) {
        const idx = line.indexOf(':');
        if (idx === -1) continue;
        const prop = line.slice(0, idx).trim().toLowerCase();
        const rawVal = line
          .slice(idx + 1)
          .replace(/!important\s*$/i, '')
          .trim();
        if (prop && rawVal) declarations[prop] = rawVal;
      }
      if (Object.keys(declarations).length > 0) {
        rules[bp][id] = { ...rules[bp][id], ...declarations };
      }
    }
    customInsideBody.push(body.slice(bodyCursor));
    const customRemainder = customInsideBody.join('').trim();
    if (customRemainder !== '') {
      preservedChunks.push(
        `@media (max-width: ${BREAKPOINT_WIDTHS[bp]}px) {\n  ${customRemainder}\n}`,
      );
    }

    cursor = closeBrace + 1;
  }

  const preserved = preservedChunks
    .join('')
    .replace(HEADER_COMMENT, '')
    .replace(MANAGED_START, '')
    .replace(MANAGED_END, '')
    .trim();

  return { rules, preserved };
}

/** Parses Cauldron's plain-CSS responsive override file into per-breakpoint rules. */
export function parseResponsiveCss(css: string): ResponsiveRuleSet {
  return extractManagedAndPreserved(css).rules;
}

function serialiseManagedBlocks(rules: ResponsiveRuleSet): string {
  const blocks: string[] = [];
  for (const bp of ['tablet', 'phone'] as const) {
    const ids = Object.keys(rules[bp])
      .filter((id) => Object.keys(rules[bp][id]).length > 0)
      .sort();
    if (ids.length === 0) continue;
    const idBlocks = ids.map((id) => {
      const props = Object.entries(rules[bp][id])
        .filter(([, val]) => val.trim() !== '')
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([prop, val]) => `    ${prop}: ${val} !important;`)
        .join('\n');
      return `  [data-cauldron-r="${id}"] {\n${props}\n  }`;
    });
    blocks.push(
      `@media (max-width: ${BREAKPOINT_WIDTHS[bp]}px) {\n${idBlocks.join('\n\n')}\n}`,
    );
  }
  if (blocks.length === 0) {
    return `${MANAGED_START}\n${MANAGED_END}`;
  }
  return `${MANAGED_START}\n${blocks.join('\n\n')}\n${MANAGED_END}`;
}

/** Serialises per-breakpoint overrides as plain CSS, tablet before phone. */
export function serialiseResponsiveCss(rules: ResponsiveRuleSet): string {
  return `${HEADER_COMMENT}\n\n${serialiseManagedBlocks(rules)}\n`;
}

/**
 * Updates only the Cauldron-managed section of `cauldron/responsive.css` while
 * preserving any custom CSS added outside (or alongside) managed rules.
 */
function mergeResponsiveCss(before: string, rules: ResponsiveRuleSet): string {
  const managedBlock = serialiseManagedBlocks(rules);
  if (before.trim() === '') {
    return `${HEADER_COMMENT}\n\n${managedBlock}\n`;
  }

  const startIdx = before.indexOf(MANAGED_START);
  const endIdx =
    startIdx !== -1
      ? before.indexOf(MANAGED_END, startIdx + MANAGED_START.length)
      : -1;

  if (startIdx !== -1 && endIdx !== -1) {
    const prefix = before.slice(0, startIdx).trimEnd();
    const inside = before.slice(startIdx + MANAGED_START.length, endIdx);
    const suffix = before.slice(endIdx + MANAGED_END.length).trimStart();
    const { preserved: customInside } = extractManagedAndPreserved(inside);
    const parts: string[] = [];
    if (prefix) parts.push(prefix);
    if (customInside) parts.push(customInside);
    parts.push(managedBlock);
    if (suffix) parts.push(suffix.trimEnd());
    return `${parts.join('\n\n')}\n`;
  }

  const { preserved } = extractManagedAndPreserved(before);
  if (preserved === '') {
    return `${HEADER_COMMENT}\n\n${managedBlock}\n`;
  }
  return `${HEADER_COMMENT}\n\n${preserved}\n\n${managedBlock}\n`;
}

export function readResponsiveStyles(
  siteRoot: string,
  responsiveId: string | null | undefined,
): ResponsiveStyleMap {
  if (!responsiveId || !VALID_ID.test(responsiveId)) {
    return { tablet: {}, phone: {} };
  }
  const file = path.join(siteRoot, RESPONSIVE_CSS_REL);
  if (!isInside(siteRoot, file) || !fs.existsSync(file)) {
    return { tablet: {}, phone: {} };
  }
  const parsed = parseResponsiveCss(fs.readFileSync(file, 'utf8'));
  return {
    tablet: { ...parsed.tablet[responsiveId] },
    phone: { ...parsed.phone[responsiveId] },
  };
}

export type ResponsiveFileWrite = {
  file: string;
  before: string;
  after: string;
  beforeHash: string;
  afterHash: string;
  created: boolean;
};

function relativeCssImportPath(fromAstroFile: string, cssFile: string): string {
  const rel = path
    .relative(path.dirname(fromAstroFile), cssFile)
    .split(path.sep)
    .join('/');
  return rel.startsWith('.') ? rel : `./${rel}`;
}

function astroFrontmatter(source: string): string {
  if (!source.startsWith('---')) return '';
  const closeIdx = source.indexOf('\n---', 3);
  return closeIdx === -1 ? '' : source.slice(3, closeIdx);
}

function importedLocalAstroFiles(
  siteRoot: string,
  astroFile: string,
  source: string,
): string[] {
  const fm = astroFrontmatter(source);
  if (!fm) return [];
  const results: string[] = [];
  const importPattern =
    /import\s+[^'"]*?from\s+['"](\.[^'"]+\.astro)['"]\s*;?/g;
  let match: RegExpExecArray | null;
  while ((match = importPattern.exec(fm)) !== null) {
    const resolved = path.resolve(path.dirname(astroFile), match[1]);
    if (isInside(siteRoot, resolved) && fs.existsSync(resolved)) {
      results.push(resolved);
    }
  }
  return results;
}

function isLikelyLayoutFile(siteRoot: string, file: string): boolean {
  const rel = path.relative(siteRoot, file).split(path.sep).join('/');
  if (/(?:^|\/)layouts\//i.test(rel)) return true;
  if (/(?:^|\/)(?:Base|Layout|MainLayout|SiteLayout)\.astro$/i.test(rel)) {
    return true;
  }
  try {
    const text = fs.readFileSync(file, 'utf8');
    return /<!doctype\s+html|<head[\s>]/i.test(text);
  } catch {
    return false;
  }
}

function isStandalonePageFile(
  siteRoot: string,
  file: string,
  source: string,
): boolean {
  const rel = path.relative(siteRoot, file).split(path.sep).join('/');
  return (
    rel.startsWith('src/pages/') || /<!doctype\s+html|<head[\s>]/i.test(source)
  );
}

function insertResponsiveCssImport(
  astroFile: string,
  cssFile: string,
): ResponsiveFileWrite | null {
  const before = fs.readFileSync(astroFile, 'utf8');
  if (before.includes('cauldron/responsive.css')) return null;

  const importLine = `import '${relativeCssImportPath(astroFile, cssFile)}';`;
  let after: string;
  const tokenImport = /import\s+['"][^'"]*cauldron\/tokens\.css['"];?/;
  if (tokenImport.test(before)) {
    after = before.replace(tokenImport, (match) => `${match}\n${importLine}`);
  } else if (before.startsWith('---')) {
    const closeIdx = before.indexOf('\n---', 3);
    if (closeIdx === -1) return null;
    after = `${before.slice(0, closeIdx)}\n${importLine}${before.slice(closeIdx)}`;
  } else {
    after = `---\n${importLine}\n---\n${before}`;
  }
  writeFileAtomic(astroFile, after);
  return {
    file: astroFile,
    before,
    after,
    beforeHash: hashOf(before),
    afterHash: hashOf(after),
    created: false,
  };
}

/**
 * Resolves the `.astro` file that should import `cauldron/responsive.css`:
 * - Returns `{ kind: 'already-imported' }` if the target or an imported layout
 *   already imports it.
 * - Returns `{ kind: 'wire', file }` for the layout (or standalone page) to add
 *   the import to.
 * - Returns `{ kind: 'unsupported', problem }` if no layout or standalone page
 *   can be wired so callers visibly refuse instead of writing an unused file.
 */
function resolveResponsiveImportTarget(
  siteRoot: string,
  targetFile?: string,
):
  | { kind: 'already-imported' }
  | { kind: 'wire'; file: string }
  | { kind: 'unsupported'; problem: string } {
  const baseLayout = path.join(siteRoot, 'src', 'layouts', 'Base.astro');
  const hasBaseLayout =
    isInside(siteRoot, baseLayout) && fs.existsSync(baseLayout);

  if (targetFile) {
    if (
      !isInside(siteRoot, targetFile) ||
      !fs.existsSync(targetFile) ||
      !targetFile.endsWith('.astro')
    ) {
      return {
        kind: 'unsupported',
        problem:
          'Responsive overrides can only be wired into an Astro page or layout inside this site.',
      };
    }
    const source = fs.readFileSync(targetFile, 'utf8');
    if (source.includes('cauldron/responsive.css')) {
      return { kind: 'already-imported' };
    }

    const imported = importedLocalAstroFiles(siteRoot, targetFile, source);
    for (const candidate of imported) {
      const candidateText = fs.readFileSync(candidate, 'utf8');
      if (candidateText.includes('cauldron/responsive.css')) {
        return { kind: 'already-imported' };
      }
      // Check one further layout hop (e.g. Page -> PostLayout -> BaseLayout).
      for (const nested of importedLocalAstroFiles(
        siteRoot,
        candidate,
        candidateText,
      )) {
        if (
          fs.readFileSync(nested, 'utf8').includes('cauldron/responsive.css')
        ) {
          return { kind: 'already-imported' };
        }
      }
    }

    const importedLayout = imported.find((candidate) =>
      isLikelyLayoutFile(siteRoot, candidate),
    );
    if (importedLayout) {
      return { kind: 'wire', file: importedLayout };
    }

    if (isStandalonePageFile(siteRoot, targetFile, source)) {
      return { kind: 'wire', file: targetFile };
    }

    if (hasBaseLayout) {
      const baseText = fs.readFileSync(baseLayout, 'utf8');
      if (baseText.includes('cauldron/responsive.css')) {
        return { kind: 'already-imported' };
      }
      return { kind: 'wire', file: baseLayout };
    }

    return {
      kind: 'unsupported',
      problem:
        'Could not find a layout importing cauldron/responsive.css for this file. Import cauldron/responsive.css in your site layout first.',
    };
  }

  if (hasBaseLayout) {
    const baseText = fs.readFileSync(baseLayout, 'utf8');
    if (baseText.includes('cauldron/responsive.css')) {
      return { kind: 'already-imported' };
    }
    return { kind: 'wire', file: baseLayout };
  }

  return {
    kind: 'unsupported',
    problem:
      'Could not find src/layouts/Base.astro to import cauldron/responsive.css. Pass the target page or import cauldron/responsive.css in your layout first.',
  };
}

/**
 * Updates breakpoint-specific token styles for one element in
 * `cauldron/responsive.css`. Passing an empty string for a property removes
 * that override cleanly. Preserves any unrecognized custom CSS in the file,
 * and visibly refuses when the site has no wireable layout or page.
 */
export function writeResponsiveStyle(
  siteRoot: string,
  responsiveId: string,
  layer: ResponsiveBreakpoint,
  properties: Record<string, string>,
  options?: { targetFile?: string },
):
  | {
      ok: true;
      styles: ResponsiveStyleMap;
      writes: ResponsiveFileWrite[];
    }
  | { ok: false; problem: string } {
  if (!VALID_ID.test(responsiveId)) {
    return { ok: false, problem: 'Invalid responsive target identifier.' };
  }
  for (const [rawProp, rawVal] of Object.entries(properties)) {
    const prop = rawProp.trim().toLowerCase();
    const val = rawVal.trim();
    if (!VALID_PROP.test(prop)) {
      return { ok: false, problem: `Invalid CSS property name: ${rawProp}` };
    }
    if (val !== '' && UNSAFE_VALUE.test(val)) {
      return {
        ok: false,
        problem: `Refusing unsafe CSS value for ${prop}.`,
      };
    }
  }

  const file = path.join(siteRoot, RESPONSIVE_CSS_REL);
  if (!isInside(siteRoot, file)) {
    return {
      ok: false,
      problem: 'Responsive stylesheet path is outside the site.',
    };
  }

  const wiring = resolveResponsiveImportTarget(siteRoot, options?.targetFile);
  if (wiring.kind === 'unsupported') {
    return { ok: false, problem: wiring.problem };
  }

  const existed = fs.existsSync(file);
  const before = existed ? fs.readFileSync(file, 'utf8') : '';
  const parsed = existed
    ? parseResponsiveCss(before)
    : { tablet: {}, phone: {} };

  const current = { ...parsed[layer][responsiveId] };
  for (const [rawProp, rawVal] of Object.entries(properties)) {
    const prop = rawProp.trim().toLowerCase();
    const val = rawVal.trim();
    if (val === '') delete current[prop];
    else current[prop] = val;
  }
  if (Object.keys(current).length === 0) {
    delete parsed[layer][responsiveId];
  } else {
    parsed[layer][responsiveId] = current;
  }

  const after = mergeResponsiveCss(before, parsed);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  writeFileAtomic(file, after);

  const writes: ResponsiveFileWrite[] = [
    {
      file,
      before,
      after,
      beforeHash: hashOf(before),
      afterHash: hashOf(after),
      created: !existed,
    },
  ];

  if (wiring.kind === 'wire') {
    const layoutWrite = insertResponsiveCssImport(wiring.file, file);
    if (layoutWrite) writes.push(layoutWrite);
  }

  return {
    ok: true,
    styles: {
      tablet: { ...parsed.tablet[responsiveId] },
      phone: { ...parsed.phone[responsiveId] },
    },
    writes,
  };
}
