import fs from 'node:fs';
import path from 'node:path';
import { listPages } from './actions';
import { readCollections } from './content';
import { decodeEntities, parseTag } from './edit';
import { hashOf, isInside, readFile, writeFileAtomic } from './files';

function escapeAttribute(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * Files-truth SEO reader & writer (WDL-266).
 *
 * Reads and writes the five v1 per-page SEO fields (`title`, `description`,
 * `image`, `imageAlt`, `noindex`) directly in the site's own Astro / Markdown
 * files — never a hidden store. Every write verifies `baseHash`, and values
 * hard-coded in a shared layout are refused with `set by code in <file>:<line>`
 * rather than silently mutating every page.
 */

export const SEO_TITLE_MAX = 60;
export const SEO_DESCRIPTION_MAX = 160;

export type SeoField =
  | 'title'
  | 'description'
  | 'image'
  | 'imageAlt'
  | 'noindex';

export type SeoValues = {
  title: string;
  description: string;
  image: string;
  imageAlt: string;
  noindex: boolean;
};

export type SeoStringFieldState = {
  value: string;
  inherited?: string;
  locked?: string;
};

export type SeoBooleanFieldState = {
  value: boolean;
  inherited?: boolean;
  locked?: string;
};

export type SeoEntrySummary = {
  id: string;
  kind: 'page' | 'content';
  label: string;
  route: string | null;
  file: string;
  title: string;
  description: string;
  image: string;
  imageAlt: string;
  noindex: boolean;
  issues: string[];
};

export type SeoEntryDetail = {
  id: string;
  kind: 'page' | 'content';
  label: string;
  route: string | null;
  file: string;
  storage: 'layout-props' | 'page-head' | 'frontmatter';
  layoutFile: string | null;
  hash: string;
  fields: {
    title: SeoStringFieldState;
    description: SeoStringFieldState;
    image: SeoStringFieldState;
    imageAlt: SeoStringFieldState;
    noindex: SeoBooleanFieldState;
  };
};

export type SeoFileWrite = {
  file: string;
  before: string;
  after: string;
  beforeHash: string;
  afterHash: string;
};

export type SeoWriteResult =
  | {
      ok: true;
      entry: SeoEntryDetail;
      writes: SeoFileWrite[];
    }
  | {
      ok: false;
      problem: string;
      conflict?: boolean;
    };

type HeadTagMatch = {
  kind: 'literal' | 'dynamic';
  value: string;
  line: number;
  start: number;
  end: number;
};

type HeadInspection = {
  title: HeadTagMatch | null;
  description: HeadTagMatch | null;
  image: HeadTagMatch | null;
  imageAlt: HeadTagMatch | null;
  noindex: HeadTagMatch | null;
};

const IMAGE_EXTENSIONS = new Set([
  '.png',
  '.jpg',
  '.jpeg',
  '.webp',
  '.avif',
  '.gif',
  '.svg',
]);

function lineAt(text: string, offset: number): number {
  return text.slice(0, Math.max(0, offset)).split('\n').length;
}

function astroFrontmatterBounds(
  text: string,
): { start: number; end: number; bodyStart: number; content: string } | null {
  const match = /^---\r?\n([\s\S]*?)\r?\n---[ \t]*(?:\r?\n|$)/.exec(text);
  if (!match) return null;
  return {
    start: 0,
    end: match[0].length,
    bodyStart: match[0].length,
    content: match[1],
  };
}

function isSafeImageRef(raw: string): boolean {
  const trimmed = raw.trim();
  if (trimmed === '') return true;
  if (/[\r\n\0]/.test(trimmed)) return false;
  if (trimmed.startsWith('/')) return !trimmed.startsWith('//');
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
}

function sanitiseSingleLine(value: string): string {
  return value.replace(/[\r\n]+/g, ' ').trim();
}

function parseYamlScalar(raw: string): string {
  const trimmed = raw.trim();
  if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
    try {
      return String(JSON.parse(trimmed));
    } catch {
      return trimmed.slice(1, -1);
    }
  }
  if (trimmed.startsWith("'") && trimmed.endsWith("'")) {
    return trimmed.slice(1, -1).replace(/''/g, "'");
  }
  return trimmed;
}

function parseMarkdownFrontmatter(text: string): Record<string, string> {
  const bounds = astroFrontmatterBounds(text);
  if (!bounds) return {};
  const values: Record<string, string> = {};
  for (const line of bounds.content.split(/\r?\n/)) {
    const item = /^([A-Za-z_][\w]*)\s*:\s*(.*)$/.exec(line);
    if (!item) continue;
    values[item[1]] = parseYamlScalar(item[2]);
  }
  return values;
}

function updateMarkdownFrontmatter(
  text: string,
  changes: Partial<SeoValues>,
): string {
  const bounds = astroFrontmatterBounds(text);
  const existingLines = bounds ? bounds.content.split(/\r?\n/) : [];
  const body = bounds ? text.slice(bounds.bodyStart) : text;

  const keyMap: Record<SeoField, string[]> = {
    title: ['title'],
    description: ['description'],
    image: ['image', 'ogImage'],
    imageAlt: ['imageAlt', 'ogImageAlt'],
    noindex: ['noindex'],
  };

  const lines = [...existingLines];

  const setKey = (field: SeoField, rawVal: string | boolean) => {
    const aliases = keyMap[field];
    const existingIdx = lines.findIndex((line) =>
      aliases.some((alias) => new RegExp(`^${alias}\\s*:`).test(line)),
    );
    const chosenKey =
      existingIdx !== -1
        ? (lines[existingIdx].match(/^([A-Za-z_][\w]*)\s*:/)?.[1] ?? aliases[0])
        : aliases[0];

    if (field === 'noindex') {
      const boolVal = Boolean(rawVal);
      if (!boolVal) {
        if (existingIdx !== -1) lines.splice(existingIdx, 1);
      } else {
        const nextLine = `${chosenKey}: true`;
        if (existingIdx !== -1) lines[existingIdx] = nextLine;
        else lines.push(nextLine);
      }
      return;
    }

    const strVal = sanitiseSingleLine(String(rawVal));
    if (strVal === '') {
      if (existingIdx !== -1) lines.splice(existingIdx, 1);
      return;
    }
    const nextLine = `${chosenKey}: ${JSON.stringify(strVal)}`;
    if (existingIdx !== -1) lines[existingIdx] = nextLine;
    else lines.push(nextLine);
  };

  if (changes.title !== undefined) setKey('title', changes.title);
  if (changes.description !== undefined) {
    setKey('description', changes.description);
  }
  if (changes.image !== undefined) setKey('image', changes.image);
  if (changes.imageAlt !== undefined) setKey('imageAlt', changes.imageAlt);
  if (changes.noindex !== undefined) setKey('noindex', changes.noindex);

  const cleanLines = lines.filter((line, idx) =>
    idx === lines.length - 1 ? line.trim() !== '' || lines.length > 1 : true,
  );
  const fmText =
    cleanLines.length > 0 ? `---\n${cleanLines.join('\n')}\n---\n` : '';
  return `${fmText}${body}`;
}

/** Finds `<head>...</head>` bounds if present in an Astro file. */
function findHeadBounds(
  text: string,
): { openEnd: number; closeStart: number; content: string } | null {
  const fm = astroFrontmatterBounds(text);
  const offset = fm ? fm.bodyStart : 0;
  const openMatch = /<head\b[^>]*>/i.exec(text.slice(offset));
  if (!openMatch) return null;
  const openEnd = offset + openMatch.index + openMatch[0].length;
  const closeIdx = text.slice(openEnd).search(/<\/head\s*>/i);
  if (closeIdx === -1) return null;
  const closeStart = openEnd + closeIdx;
  return {
    openEnd,
    closeStart,
    content: text.slice(openEnd, closeStart),
  };
}

/** Returns true when `offset` inside `headContent` sits inside a `{ ... }` Astro expression. */
function isInsideBraceExpression(
  text: string,
  start: number,
  offset: number,
): boolean {
  let depth = 0;
  let quote: string | null = null;
  for (let i = start; i < offset; i += 1) {
    const ch = text[i];
    if (quote) {
      if (ch === '\\') i += 1;
      else if (ch === quote) quote = null;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === '`') {
      quote = ch;
      continue;
    }
    if (ch === '{') depth += 1;
    else if (ch === '}' && depth > 0) depth -= 1;
  }
  return depth > 0;
}

/** Inspects `<title>` and SEO `<meta>` tags inside an Astro file's `<head>`. */
function inspectHead(text: string): HeadInspection {
  const empty: HeadInspection = {
    title: null,
    description: null,
    image: null,
    imageAlt: null,
    noindex: null,
  };
  const head = findHeadBounds(text);
  if (!head) return empty;

  const titleMatch = /<title\b[^>]*>([\s\S]*?)<\/title\s*>/i.exec(head.content);
  if (titleMatch) {
    const rawInner = titleMatch[1].trim();
    const absStart = head.openEnd + titleMatch.index;
    const absEnd = absStart + titleMatch[0].length;
    const isDynamic =
      (rawInner.includes('{') && rawInner.includes('}')) ||
      isInsideBraceExpression(text, head.openEnd, absStart);
    empty.title = {
      kind: isDynamic ? 'dynamic' : 'literal',
      value: isDynamic ? rawInner : decodeEntities(rawInner),
      line: lineAt(text, absStart),
      start: absStart,
      end: absEnd,
    };
  }

  let cursor = head.openEnd;
  while (cursor < head.closeStart) {
    const nextMeta = text.slice(cursor, head.closeStart).search(/<meta\b/i);
    if (nextMeta === -1) break;
    const tagStart = cursor + nextMeta;
    const parsed = parseTag(text, tagStart);
    if (!parsed) {
      cursor = tagStart + 5;
      continue;
    }
    cursor = parsed.tagEnd;

    const nameAttr = parsed.attributes.find(
      (attr) => attr.name.toLowerCase() === 'name',
    );
    const propAttr = parsed.attributes.find(
      (attr) => attr.name.toLowerCase() === 'property',
    );
    const contentAttr = parsed.attributes.find(
      (attr) => attr.name.toLowerCase() === 'content',
    );
    if (!contentAttr) continue;

    const key = (nameAttr?.value ?? propAttr?.value ?? '').toLowerCase();
    const isDynamic =
      (!contentAttr.quote && (contentAttr.value ?? '').startsWith('{')) ||
      isInsideBraceExpression(text, head.openEnd, parsed.start);
    const decodedValue = isDynamic
      ? (contentAttr.value ?? '')
      : decodeEntities(contentAttr.value ?? '');
    const record: HeadTagMatch = {
      kind: isDynamic ? 'dynamic' : 'literal',
      value: decodedValue,
      line: lineAt(text, parsed.start),
      start: parsed.start,
      end: parsed.tagEnd,
    };

    if (key === 'description') empty.description = record;
    else if (key === 'og:image') empty.image = record;
    else if (key === 'og:image:alt') empty.imageAlt = record;
    else if (key === 'robots') empty.noindex = record;
  }

  return empty;
}

type LayoutUsage = {
  tagName: string;
  layoutFile: string;
  layoutRel: string;
  tag: NonNullable<ReturnType<typeof parseTag>>;
};

/** Resolves the imported layout component and its opening tag in an Astro page. */
function findLayoutUsage(
  siteRoot: string,
  pageFile: string,
  pageText: string,
): LayoutUsage | null {
  const fm = astroFrontmatterBounds(pageText);
  if (!fm) return null;

  const imports: Array<{ name: string; resolved: string }> = [];
  const importPattern =
    /import\s+([A-Z][A-Za-z0-9_]*)\s+from\s+['"](\.[^'"]+\.astro)['"]\s*;?/g;
  let match: RegExpExecArray | null;
  while ((match = importPattern.exec(fm.content)) !== null) {
    const resolved = path.resolve(path.dirname(pageFile), match[2]);
    if (isInside(siteRoot, resolved) && fs.existsSync(resolved)) {
      imports.push({ name: match[1], resolved });
    }
  }
  if (imports.length === 0) return null;

  const body = pageText.slice(fm.bodyStart);
  for (const imp of imports) {
    const layoutText = fs.readFileSync(imp.resolved, 'utf8');
    if (!/<head\b/i.test(layoutText) && !/<!doctype\s+html/i.test(layoutText)) {
      continue;
    }
    const tagRegex = new RegExp(`<${imp.name}(?=[\\s/>])`);
    const tagMatch = tagRegex.exec(body);
    if (!tagMatch) continue;
    const parsed = parseTag(pageText, fm.bodyStart + tagMatch.index);
    if (!parsed) continue;
    return {
      tagName: imp.name,
      layoutFile: imp.resolved,
      layoutRel: path
        .relative(siteRoot, imp.resolved)
        .split(path.sep)
        .join('/'),
      tag: parsed,
    };
  }
  return null;
}

function readTagProp(
  pageText: string,
  pageRel: string,
  tag: NonNullable<ReturnType<typeof parseTag>>,
  names: string[],
): {
  present: boolean;
  value: string;
  boolValue: boolean;
  locked?: string;
} {
  const attr = tag.attributes.find((a) => names.includes(a.name));
  if (!attr) {
    return { present: false, value: '', boolValue: false };
  }
  if (attr.value === null) {
    // Boolean shorthand attribute like `<Base noindex>`
    return { present: true, value: 'true', boolValue: true };
  }
  if (!attr.quote && attr.value.startsWith('{')) {
    const inner = attr.value.slice(1, -1).trim();
    if (inner === 'true' || inner === 'false') {
      return {
        present: true,
        value: inner,
        boolValue: inner === 'true',
      };
    }
    if (
      (inner.startsWith('"') && inner.endsWith('"')) ||
      (inner.startsWith("'") && inner.endsWith("'"))
    ) {
      const unquoted = inner.slice(1, -1);
      return {
        present: true,
        value: unquoted,
        boolValue: unquoted === 'true',
      };
    }
    return {
      present: true,
      value: '',
      boolValue: false,
      locked: `set by code in ${pageRel}:${lineAt(pageText, attr.start)}`,
    };
  }
  const decoded = decodeEntities(attr.value);
  return {
    present: true,
    value: decoded,
    boolValue: decoded === 'true',
  };
}

function setLayoutTagProps(
  pageText: string,
  tagName: string,
  tagOffset: number,
  changes: Partial<SeoValues>,
): string {
  const updates: Array<{
    names: string[];
    primary: string;
    value: string | boolean;
  }> = [];
  if (changes.title !== undefined) {
    updates.push({ names: ['title'], primary: 'title', value: changes.title });
  }
  if (changes.description !== undefined) {
    updates.push({
      names: ['description'],
      primary: 'description',
      value: changes.description,
    });
  }
  if (changes.image !== undefined) {
    updates.push({
      names: ['image', 'ogImage'],
      primary: 'image',
      value: changes.image,
    });
  }
  if (changes.imageAlt !== undefined) {
    updates.push({
      names: ['imageAlt', 'ogImageAlt'],
      primary: 'imageAlt',
      value: changes.imageAlt,
    });
  }
  if (changes.noindex !== undefined) {
    updates.push({
      names: ['noindex'],
      primary: 'noindex',
      value: changes.noindex,
    });
  }

  let next = pageText;
  for (const update of updates) {
    const parsed = parseTag(next, tagOffset);
    if (!parsed || parsed.name !== tagName) break;

    const existing = parsed.attributes.find((a) =>
      update.names.includes(a.name),
    );
    const propName = existing?.name ?? update.primary;

    if (typeof update.value === 'boolean') {
      if (!update.value) {
        if (existing) {
          let cutStart = existing.start;
          while (cutStart > parsed.start && /[ \t]/.test(next[cutStart - 1])) {
            cutStart -= 1;
          }
          next = next.slice(0, cutStart) + next.slice(existing.end);
        }
      } else {
        const rendered = `${propName}={true}`;
        if (existing) {
          next =
            next.slice(0, existing.start) + rendered + next.slice(existing.end);
        } else {
          const insertAt = parsed.selfClosing
            ? parsed.tagEnd - 2
            : parsed.tagEnd - 1;
          next = `${next.slice(0, insertAt)} ${rendered}${next.slice(insertAt)}`;
        }
      }
      continue;
    }

    const cleanVal = sanitiseSingleLine(update.value);
    if (cleanVal === '') {
      if (existing) {
        let cutStart = existing.start;
        while (cutStart > parsed.start && /[ \t]/.test(next[cutStart - 1])) {
          cutStart -= 1;
        }
        next = next.slice(0, cutStart) + next.slice(existing.end);
      }
      continue;
    }

    const rendered = `${propName}="${escapeAttribute(cleanVal)}"`;
    if (existing) {
      next =
        next.slice(0, existing.start) + rendered + next.slice(existing.end);
    } else {
      const insertAt = parsed.selfClosing
        ? parsed.tagEnd - 2
        : parsed.tagEnd - 1;
      next = `${next.slice(0, insertAt)} ${rendered}${next.slice(insertAt)}`;
    }
  }

  return next;
}

/**
 * Ensures a layout file (such as `src/layouts/Base.astro`) declares the SEO
 * `Props`, destructures them from `Astro.props`, and renders the matching
 * `<head>` tags once when those fields are edited for the first time.
 */
function ensureLayoutSupportsSeoProps(
  layoutText: string,
  neededFields: SeoField[],
): string {
  if (neededFields.length === 0) return layoutText;
  let next = layoutText;

  const propDefs: Record<SeoField, string> = {
    title: 'title: string;',
    description: 'description?: string;',
    image: 'image?: string;',
    imageAlt: 'imageAlt?: string;',
    noindex: 'noindex?: boolean;',
  };

  // 1. Update `interface Props { ... }` if present, or add one inside frontmatter.
  const fm = astroFrontmatterBounds(next);
  if (fm) {
    let fmText = fm.content;
    const ifaceMatch = /interface\s+Props\s*\{([\s\S]*?)\}/.exec(fmText);
    if (ifaceMatch) {
      let body = ifaceMatch[1];
      const missingDefs = neededFields.filter(
        (field) => !new RegExp(`\\b${field}\\b\\s*\\??:`).test(body),
      );
      if (missingDefs.length > 0) {
        const additions = missingDefs
          .map((field) => `  ${propDefs[field]}`)
          .join('\n');
        const trimmedEnd = body.replace(/[ \t]*$/, '');
        body = `${trimmedEnd}${trimmedEnd.endsWith('\n') ? '' : '\n'}${additions}\n`;
        fmText =
          fmText.slice(0, ifaceMatch.index) +
          `interface Props {${body}}` +
          fmText.slice(ifaceMatch.index + ifaceMatch[0].length);
      }
    } else {
      const allDefs = [...new Set<SeoField>(['title', ...neededFields])]
        .map((field) => `  ${propDefs[field]}`)
        .join('\n');
      fmText = `${fmText.trimEnd()}\n\ninterface Props {\n${allDefs}\n}\n`;
    }

    // 2. Update `const { ... } = Astro.props;` destructuring.
    const destructureMatch = /const\s*\{([^}]*)\}\s*=\s*Astro\.props\s*;?/.exec(
      fmText,
    );
    if (destructureMatch) {
      const existingNames = destructureMatch[1]
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);
      const present = new Set(
        existingNames.map((entry) => entry.split(/[:=]/)[0].trim()),
      );
      const toAdd = neededFields.filter((field) => !present.has(field));
      if (toAdd.length > 0) {
        const merged = [...existingNames, ...toAdd].join(', ');
        fmText =
          fmText.slice(0, destructureMatch.index) +
          `const { ${merged} } = Astro.props;` +
          fmText.slice(destructureMatch.index + destructureMatch[0].length);
      }
    } else {
      const allNames = [...new Set<SeoField>(['title', ...neededFields])].join(
        ', ',
      );
      fmText = `${fmText.trimEnd()}\nconst { ${allNames} } = Astro.props;\n`;
    }

    next = `---\n${fmText.trim()}\n---\n${next.slice(fm.bodyStart)}`;
  }

  // 3. Ensure matching `<head>` tags exist once.
  const head = findHeadBounds(next);
  if (!head) return next;

  const headContent = head.content;
  const tagsToInsert: string[] = [];

  if (neededFields.includes('title') && !/<title\b/i.test(headContent)) {
    tagsToInsert.push('    <title>{title}</title>');
  }
  if (
    neededFields.includes('description') &&
    !/<meta\b[^>]*name=["']description["']/i.test(headContent)
  ) {
    tagsToInsert.push(
      '    {description && <meta name="description" content={description} />}',
    );
  }
  if (
    (neededFields.includes('title') || neededFields.includes('image')) &&
    !/<meta\b[^>]*property=["']og:title["']/i.test(headContent) &&
    /<title\b[^>]*>\{title\}<\/title>/i.test(headContent)
  ) {
    tagsToInsert.push(
      '    {title && <meta property="og:title" content={title} />}',
    );
  }
  if (
    neededFields.includes('description') &&
    !/<meta\b[^>]*property=["']og:description["']/i.test(headContent)
  ) {
    tagsToInsert.push(
      '    {description && <meta property="og:description" content={description} />}',
    );
  }
  if (
    neededFields.includes('image') &&
    !/<meta\b[^>]*property=["']og:image["']/i.test(headContent)
  ) {
    tagsToInsert.push(
      '    {image && <meta property="og:image" content={new URL(image, Astro.site ?? Astro.url).href} />}',
    );
  }
  if (
    neededFields.includes('imageAlt') &&
    !/<meta\b[^>]*property=["']og:image:alt["']/i.test(headContent)
  ) {
    tagsToInsert.push(
      '    {imageAlt && <meta property="og:image:alt" content={imageAlt} />}',
    );
  }
  if (
    neededFields.includes('noindex') &&
    !/<meta\b[^>]*name=["']robots["']/i.test(headContent)
  ) {
    tagsToInsert.push(
      '    {noindex && <meta name="robots" content="noindex, nofollow" />}',
    );
  }

  if (tagsToInsert.length === 0) return next;

  const titleCloseMatch = /<\/title\s*>/i.exec(headContent);
  if (titleCloseMatch) {
    const insertAt =
      head.openEnd + titleCloseMatch.index + titleCloseMatch[0].length;
    return `${next.slice(0, insertAt)}\n${tagsToInsert.join('\n')}${next.slice(insertAt)}`;
  }

  return `${next.slice(0, head.closeStart)}${tagsToInsert.join('\n')}\n  ${next.slice(head.closeStart)}`;
}

/** Updates or inserts literal `<title>` / `<meta>` tags in a standalone page's `<head>`. */
function updateStandaloneHead(
  pageText: string,
  changes: Partial<SeoValues>,
): string {
  let next = pageText;
  if (!findHeadBounds(next)) {
    const fm = astroFrontmatterBounds(next);
    const insertAt = fm ? fm.bodyStart : 0;
    next = `${next.slice(0, insertAt)}<head>\n</head>\n${next.slice(insertAt)}`;
  }

  const replaceOrInsertMeta = (
    attrKind: 'name' | 'property',
    attrName: string,
    value: string | null,
  ) => {
    const head = findHeadBounds(next);
    if (!head) return;
    const inspected = inspectHead(next);
    const existing =
      attrName === 'description'
        ? inspected.description
        : attrName === 'og:image'
          ? inspected.image
          : attrName === 'og:image:alt'
            ? inspected.imageAlt
            : attrName === 'robots'
              ? inspected.noindex
              : null;

    if (!value) {
      if (existing) {
        let start = existing.start;
        while (start > 0 && /[ \t]/.test(next[start - 1])) start -= 1;
        let end = existing.end;
        if (next[end] === '\r') end += 1;
        if (next[end] === '\n') end += 1;
        next = next.slice(0, start) + next.slice(end);
      }
      return;
    }

    const rendered = `<meta ${attrKind}="${attrName}" content="${escapeAttribute(value)}" />`;
    if (existing) {
      next =
        next.slice(0, existing.start) + rendered + next.slice(existing.end);
    } else {
      const insertAt = head.closeStart;
      const prefix = insertAt > 0 && next[insertAt - 1] !== '\n' ? '\n' : '';
      next = `${next.slice(0, insertAt)}${prefix}    ${rendered}\n  ${next.slice(insertAt)}`;
    }
  };

  if (changes.title !== undefined) {
    const clean = sanitiseSingleLine(changes.title);
    const head = findHeadBounds(next);
    if (head) {
      const inspected = inspectHead(next);
      if (clean === '') {
        if (inspected.title) {
          next =
            next.slice(0, inspected.title.start) +
            '<title></title>' +
            next.slice(inspected.title.end);
        }
      } else {
        const safeTitle = clean
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;');
        const rendered = `<title>${safeTitle}</title>`;
        if (inspected.title) {
          next =
            next.slice(0, inspected.title.start) +
            rendered +
            next.slice(inspected.title.end);
        } else {
          const prefix =
            head.closeStart > 0 && next[head.closeStart - 1] !== '\n'
              ? '\n'
              : '';
          next = `${next.slice(0, head.closeStart)}${prefix}    ${rendered}\n  ${next.slice(head.closeStart)}`;
        }
      }
    }
  }

  if (changes.description !== undefined) {
    const clean = sanitiseSingleLine(changes.description);
    replaceOrInsertMeta('name', 'description', clean || null);
  }
  if (changes.image !== undefined) {
    const clean = sanitiseSingleLine(changes.image);
    replaceOrInsertMeta('property', 'og:image', clean || null);
  }
  if (changes.imageAlt !== undefined) {
    const clean = sanitiseSingleLine(changes.imageAlt);
    replaceOrInsertMeta('property', 'og:image:alt', clean || null);
  }
  if (changes.noindex !== undefined) {
    replaceOrInsertMeta(
      'name',
      'robots',
      changes.noindex ? 'noindex, nofollow' : null,
    );
  }

  return next;
}

function issuesForSeoValues(values: SeoValues): string[] {
  const issues: string[] = [];
  if (values.title.trim() === '') issues.push('Missing title');
  else if (values.title.trim().length > SEO_TITLE_MAX) {
    issues.push(`Title over ${SEO_TITLE_MAX} chars`);
  }
  if (values.description.trim() === '') issues.push('Missing description');
  else if (values.description.trim().length > SEO_DESCRIPTION_MAX) {
    issues.push(`Description over ${SEO_DESCRIPTION_MAX} chars`);
  }
  if (values.image.trim() !== '' && values.imageAlt.trim() === '') {
    issues.push('Share image missing alt text');
  }
  return issues;
}

/** Reads the SEO fields directly from one page or content file (and its layout if any). */
export function readPageSeo(
  siteRoot: string,
  relFile: string,
  meta?: { kind?: 'page' | 'content'; route?: string | null; label?: string },
): SeoEntryDetail | { problem: string } {
  const normalizedRel = relFile.replace(/\\/g, '/').replace(/^\/+/, '');
  const full = path.join(siteRoot, normalizedRel);
  if (!isInside(siteRoot, full)) {
    return { problem: 'That file is outside the open site.' };
  }
  if (!fs.existsSync(full)) {
    return { problem: `That file does not exist: ${normalizedRel}` };
  }

  const disk = readFile(full);
  const ext = path.extname(normalizedRel).toLowerCase();
  const kind: 'page' | 'content' =
    meta?.kind ??
    (normalizedRel.startsWith('src/content/') ? 'content' : 'page');
  const route =
    meta?.route !== undefined
      ? meta.route
      : kind === 'page'
        ? (listPages(siteRoot).find(
            (p) => p.file.replace(/\\/g, '/') === normalizedRel,
          )?.page ?? null)
        : null;
  const label = meta?.label ?? route ?? normalizedRel;

  if (ext === '.md' || ext === '.mdx') {
    const fm = parseMarkdownFrontmatter(disk.text);
    return {
      id: normalizedRel,
      kind,
      label,
      route,
      file: normalizedRel,
      storage: 'frontmatter',
      layoutFile: null,
      hash: disk.hash,
      fields: {
        title: { value: fm.title ?? '' },
        description: { value: fm.description ?? '' },
        image: { value: fm.image ?? fm.ogImage ?? '' },
        imageAlt: { value: fm.imageAlt ?? fm.ogImageAlt ?? '' },
        noindex: { value: fm.noindex === 'true' },
      },
    };
  }

  const layout = findLayoutUsage(siteRoot, full, disk.text);
  if (layout) {
    const layoutText = fs.readFileSync(layout.layoutFile, 'utf8');
    const layoutHead = inspectHead(layoutText);

    const resolveStringField = (
      propNames: string[],
      headTag: HeadTagMatch | null,
    ): SeoStringFieldState => {
      const prop = readTagProp(disk.text, normalizedRel, layout.tag, propNames);
      if (headTag && headTag.kind === 'literal') {
        return {
          value: prop.value,
          inherited: headTag.value,
          locked: `set by code in ${layout.layoutRel}:${headTag.line}`,
        };
      }
      return {
        value: prop.value,
        ...(prop.locked ? { locked: prop.locked } : {}),
      };
    };

    const resolveNoindex = (): SeoBooleanFieldState => {
      const prop = readTagProp(disk.text, normalizedRel, layout.tag, [
        'noindex',
      ]);
      if (layoutHead.noindex && layoutHead.noindex.kind === 'literal') {
        const inheritedNoindex = /\bnoindex\b/i.test(layoutHead.noindex.value);
        return {
          value: prop.boolValue,
          inherited: inheritedNoindex,
          locked: `set by code in ${layout.layoutRel}:${layoutHead.noindex.line}`,
        };
      }
      return {
        value: prop.boolValue,
        ...(prop.locked ? { locked: prop.locked } : {}),
      };
    };

    return {
      id: normalizedRel,
      kind,
      label,
      route,
      file: normalizedRel,
      storage: 'layout-props',
      layoutFile: layout.layoutRel,
      hash: disk.hash,
      fields: {
        title: resolveStringField(['title'], layoutHead.title),
        description: resolveStringField(
          ['description'],
          layoutHead.description,
        ),
        image: resolveStringField(['image', 'ogImage'], layoutHead.image),
        imageAlt: resolveStringField(
          ['imageAlt', 'ogImageAlt'],
          layoutHead.imageAlt,
        ),
        noindex: resolveNoindex(),
      },
    };
  }

  // Standalone Astro page without an imported layout: read literal tags in `<head>`.
  const head = inspectHead(disk.text);
  const fromHeadTag = (tag: HeadTagMatch | null): SeoStringFieldState => {
    if (!tag) return { value: '' };
    if (tag.kind === 'dynamic') {
      return {
        value: '',
        locked: `set by code in ${normalizedRel}:${tag.line}`,
      };
    }
    return { value: tag.value };
  };
  const noindexState: SeoBooleanFieldState = head.noindex
    ? head.noindex.kind === 'dynamic'
      ? {
          value: false,
          locked: `set by code in ${normalizedRel}:${head.noindex.line}`,
        }
      : { value: /\bnoindex\b/i.test(head.noindex.value) }
    : { value: false };

  return {
    id: normalizedRel,
    kind,
    label,
    route,
    file: normalizedRel,
    storage: 'page-head',
    layoutFile: null,
    hash: disk.hash,
    fields: {
      title: fromHeadTag(head.title),
      description: fromHeadTag(head.description),
      image: fromHeadTag(head.image),
      imageAlt: fromHeadTag(head.imageAlt),
      noindex: noindexState,
    },
  };
}

/** Lists all static pages and content entries with their current SEO audit state. */
export function listSeoEntries(siteRoot: string): SeoEntrySummary[] {
  const entries: SeoEntrySummary[] = [];
  const seenFiles = new Set<string>();

  for (const page of listPages(siteRoot)) {
    if (page.page.includes('[')) continue;
    const rel = page.file.replace(/\\/g, '/');
    seenFiles.add(rel);
    const detail = readPageSeo(siteRoot, rel, {
      kind: 'page',
      route: page.page,
      label: page.page,
    });
    if ('problem' in detail) continue;
    const effective: SeoValues = {
      title: detail.fields.title.value || detail.fields.title.inherited || '',
      description:
        detail.fields.description.value ||
        detail.fields.description.inherited ||
        '',
      image: detail.fields.image.value || detail.fields.image.inherited || '',
      imageAlt:
        detail.fields.imageAlt.value || detail.fields.imageAlt.inherited || '',
      noindex: Boolean(
        detail.fields.noindex.value || detail.fields.noindex.inherited,
      ),
    };
    entries.push({
      id: detail.id,
      kind: 'page',
      label: detail.label,
      route: detail.route,
      file: detail.file,
      ...effective,
      issues: issuesForSeoValues(effective),
    });
  }

  for (const collection of readCollections(siteRoot)) {
    for (const item of collection.entries) {
      const rel = item.file.replace(/\\/g, '/');
      if (seenFiles.has(rel)) continue;
      const ext = path.extname(rel).toLowerCase();
      if (ext !== '.md' && ext !== '.mdx') continue;
      seenFiles.add(rel);
      const detail = readPageSeo(siteRoot, rel, {
        kind: 'content',
        route: null,
        label: `${collection.name}/${item.id}`,
      });
      if ('problem' in detail) continue;
      const effective: SeoValues = {
        title: detail.fields.title.value,
        description: detail.fields.description.value,
        image: detail.fields.image.value,
        imageAlt: detail.fields.imageAlt.value,
        noindex: detail.fields.noindex.value,
      };
      entries.push({
        id: detail.id,
        kind: 'content',
        label: detail.label,
        route: null,
        file: detail.file,
        ...effective,
        issues: issuesForSeoValues(effective),
      });
    }
  }

  return entries;
}

/** Lists existing public images under `public/` so the SEO panel can suggest share images. */
export function listPublicImages(siteRoot: string): string[] {
  const publicDir = path.join(siteRoot, 'public');
  if (!isInside(siteRoot, publicDir) || !fs.existsSync(publicDir)) return [];
  const found: string[] = [];
  const walk = (dir: string) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.name.startsWith('.')) continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else if (
        entry.isFile() &&
        IMAGE_EXTENSIONS.has(path.extname(entry.name).toLowerCase())
      ) {
        const rel = path.relative(publicDir, full).split(path.sep).join('/');
        found.push(`/${rel}`);
      }
    }
  };
  try {
    walk(publicDir);
  } catch {
    return [];
  }
  return found.sort();
}

/**
 * Writes SEO edits to a page or content file using strict `baseHash` checking.
 * Refuses fields hard-coded in a shared layout with `set by code in <file>:<line>`.
 */
export function writePageSeo(
  siteRoot: string,
  relFile: string,
  baseHash: string,
  changes: Partial<SeoValues>,
): SeoWriteResult {
  const normalizedRel = relFile.replace(/\\/g, '/').replace(/^\/+/, '');
  const full = path.join(siteRoot, normalizedRel);
  if (!isInside(siteRoot, full)) {
    return { ok: false, problem: 'That file is outside the open site.' };
  }
  if (!fs.existsSync(full)) {
    return { ok: false, problem: `That file does not exist: ${normalizedRel}` };
  }
  if (!baseHash) {
    return {
      ok: false,
      problem: 'Read the page before saving SEO changes.',
    };
  }

  const disk = readFile(full);
  if (disk.hash !== baseHash) {
    return {
      ok: false,
      conflict: true,
      problem:
        'That file changed on disk since SEO was opened. Reload to see the latest version.',
    };
  }

  if (changes.image !== undefined && !isSafeImageRef(changes.image)) {
    return {
      ok: false,
      problem:
        'Share image must be a site path starting with / or an http(s) URL.',
    };
  }

  const current = readPageSeo(siteRoot, normalizedRel);
  if ('problem' in current) {
    return { ok: false, problem: current.problem };
  }

  const touchedFields = (Object.keys(changes) as SeoField[]).filter(
    (field) => changes[field] !== undefined,
  );
  if (touchedFields.length === 0) {
    return { ok: true, entry: current, writes: [] };
  }

  for (const field of touchedFields) {
    const locked = current.fields[field].locked;
    if (locked) {
      return {
        ok: false,
        problem: `Cannot edit ${field}: ${locked}.`,
      };
    }
  }

  const writes: SeoFileWrite[] = [];

  if (current.storage === 'frontmatter') {
    const nextText = updateMarkdownFrontmatter(disk.text, changes);
    if (nextText !== disk.text) {
      writeFileAtomic(full, nextText);
      writes.push({
        file: full,
        before: disk.text,
        after: nextText,
        beforeHash: disk.hash,
        afterHash: hashOf(nextText),
      });
    }
  } else if (current.storage === 'layout-props') {
    const layout = findLayoutUsage(siteRoot, full, disk.text);
    if (!layout) {
      return {
        ok: false,
        problem: 'The page layout tag could not be located.',
      };
    }
    const layoutDisk = readFile(layout.layoutFile);
    const neededLayoutFields = touchedFields.filter((field) => {
      if (field === 'noindex') return Boolean(changes.noindex);
      return sanitiseSingleLine(String(changes[field] ?? '')) !== '';
    });
    const nextLayoutText = ensureLayoutSupportsSeoProps(
      layoutDisk.text,
      neededLayoutFields,
    );
    const nextPageText = setLayoutTagProps(
      disk.text,
      layout.tagName,
      layout.tag.start,
      changes,
    );

    if (nextLayoutText !== layoutDisk.text) {
      writeFileAtomic(layout.layoutFile, nextLayoutText);
      writes.push({
        file: layout.layoutFile,
        before: layoutDisk.text,
        after: nextLayoutText,
        beforeHash: layoutDisk.hash,
        afterHash: hashOf(nextLayoutText),
      });
    }
    if (nextPageText !== disk.text) {
      writeFileAtomic(full, nextPageText);
      writes.push({
        file: full,
        before: disk.text,
        after: nextPageText,
        beforeHash: disk.hash,
        afterHash: hashOf(nextPageText),
      });
    }
  } else {
    const nextText = updateStandaloneHead(disk.text, changes);
    if (nextText !== disk.text) {
      writeFileAtomic(full, nextText);
      writes.push({
        file: full,
        before: disk.text,
        after: nextText,
        beforeHash: disk.hash,
        afterHash: hashOf(nextText),
      });
    }
  }

  const updated = readPageSeo(siteRoot, normalizedRel, {
    kind: current.kind,
    route: current.route,
    label: current.label,
  });
  if ('problem' in updated) {
    return { ok: false, problem: updated.problem };
  }
  return { ok: true, entry: updated, writes };
}

export type SeoMeasuredPage = {
  page: string;
  title: string;
  description: string;
  ogImage: string;
  ogImageAlt: string;
};

export type SeoFinding = {
  id: string;
  label: string;
  status: 'pass' | 'fail';
  kind: 'measured';
  detail: string;
};

/**
 * Produces the three site-wide measured SEO findings for Quality checks:
 * - every page has a non-empty `<title>`
 * - every page has a meta description between 1 and 160 characters
 * - every share image (`og:image`) has alt text (`og:image:alt`)
 */
export function summariseSeoChecks(pages: SeoMeasuredPage[]): SeoFinding[] {
  if (pages.length === 0) return [];

  const missingTitle = pages
    .filter((p) => p.title.trim() === '')
    .map((p) => p.page);
  const badDescription = pages
    .filter((p) => {
      const len = p.description.trim().length;
      return len === 0 || len > SEO_DESCRIPTION_MAX;
    })
    .map((p) => {
      const len = p.description.trim().length;
      return len === 0
        ? `${p.page} (missing)`
        : `${p.page} (${len} chars, max ${SEO_DESCRIPTION_MAX})`;
    });
  const pagesWithShareImage = pages.filter((p) => p.ogImage.trim() !== '');
  const missingShareAlt = pagesWithShareImage
    .filter((p) => p.ogImageAlt.trim() === '')
    .map((p) => p.page);

  return [
    {
      id: 'seo-title',
      label: 'Every page has a title',
      status: missingTitle.length === 0 ? 'pass' : 'fail',
      kind: 'measured',
      detail:
        missingTitle.length === 0
          ? `All ${pages.length} page${pages.length === 1 ? '' : 's'} have a <title>.`
          : `Missing <title> on: ${missingTitle.join(', ')}.`,
    },
    {
      id: 'seo-description',
      label: `Every page has a description (1–${SEO_DESCRIPTION_MAX} characters)`,
      status: badDescription.length === 0 ? 'pass' : 'fail',
      kind: 'measured',
      detail:
        badDescription.length === 0
          ? `All ${pages.length} page${pages.length === 1 ? '' : 's'} have a 1–${SEO_DESCRIPTION_MAX} character meta description.`
          : `Fix meta description on: ${badDescription.join(', ')}.`,
    },
    {
      id: 'seo-share-image-alt',
      label: 'Share images have alternative text',
      status: missingShareAlt.length === 0 ? 'pass' : 'fail',
      kind: 'measured',
      detail:
        pagesWithShareImage.length === 0
          ? 'No pages set an og:image share image yet.'
          : missingShareAlt.length === 0
            ? `All ${pagesWithShareImage.length} share image${pagesWithShareImage.length === 1 ? '' : 's'} have og:image:alt text.`
            : `Missing og:image:alt on: ${missingShareAlt.join(', ')}.`,
    },
  ];
}
