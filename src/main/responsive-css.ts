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

/** Parses Cauldron's plain-CSS responsive override file into per-breakpoint rules. */
export function parseResponsiveCss(css: string): ResponsiveRuleSet {
  const rules: ResponsiveRuleSet = { tablet: {}, phone: {} };
  const mediaPattern =
    /@media\s*\(\s*max-width\s*:\s*(768|375)px\s*\)\s*\{([\s\S]*?)\n\}/g;
  let mediaMatch: RegExpExecArray | null;
  while ((mediaMatch = mediaPattern.exec(css)) !== null) {
    const bp: ResponsiveBreakpoint =
      mediaMatch[1] === '768' ? 'tablet' : 'phone';
    const body = mediaMatch[2];
    const rulePattern =
      /\[data-cauldron-r="([a-z0-9_-]+)"\]\s*\{([\s\S]*?)\}/gi;
    let ruleMatch: RegExpExecArray | null;
    while ((ruleMatch = rulePattern.exec(body)) !== null) {
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
  }
  return rules;
}

/** Serialises per-breakpoint overrides as plain CSS, tablet before phone. */
export function serialiseResponsiveCss(rules: ResponsiveRuleSet): string {
  const sections: string[] = [HEADER_COMMENT];
  for (const bp of ['tablet', 'phone'] as const) {
    const ids = Object.keys(rules[bp])
      .filter((id) => Object.keys(rules[bp][id]).length > 0)
      .sort();
    if (ids.length === 0) continue;
    const blocks = ids.map((id) => {
      const props = Object.entries(rules[bp][id])
        .filter(([, val]) => val.trim() !== '')
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([prop, val]) => `    ${prop}: ${val} !important;`)
        .join('\n');
      return `  [data-cauldron-r="${id}"] {\n${props}\n  }`;
    });
    sections.push(
      `@media (max-width: ${BREAKPOINT_WIDTHS[bp]}px) {\n${blocks.join('\n\n')}\n}`,
    );
  }
  return `${sections.join('\n\n')}\n`;
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

/**
 * Ensures `src/layouts/Base.astro` imports `../../cauldron/responsive.css`
 * right after `tokens.css` (or inside frontmatter) when responsive overrides
 * are written for the first time.
 */
function ensureLayoutImportsResponsiveCss(
  siteRoot: string,
): ResponsiveFileWrite | null {
  const layout = path.join(siteRoot, 'src', 'layouts', 'Base.astro');
  if (!isInside(siteRoot, layout) || !fs.existsSync(layout)) return null;
  const before = fs.readFileSync(layout, 'utf8');
  if (before.includes('cauldron/responsive.css')) return null;

  const importLine = "import '../../cauldron/responsive.css';";
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
  writeFileAtomic(layout, after);
  return {
    file: layout,
    before,
    after,
    beforeHash: hashOf(before),
    afterHash: hashOf(after),
    created: false,
  };
}

/**
 * Updates breakpoint-specific token styles for one element in
 * `cauldron/responsive.css`. Passing an empty string for a property removes
 * that override cleanly.
 */
export function writeResponsiveStyle(
  siteRoot: string,
  responsiveId: string,
  layer: ResponsiveBreakpoint,
  properties: Record<string, string>,
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

  const after = serialiseResponsiveCss(parsed);
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

  const layoutWrite = ensureLayoutImportsResponsiveCss(siteRoot);
  if (layoutWrite) writes.push(layoutWrite);

  return {
    ok: true,
    styles: {
      tablet: { ...parsed.tablet[responsiveId] },
      phone: { ...parsed.phone[responsiveId] },
    },
    writes,
  };
}
