/**
 * What a run changed on the page (plan 2.2): a snapshot of every source
 * location before and after, compared without guessing.
 *
 * The comparison is deliberately plain data in, plain data out: the caller
 * captures the page and knows which files the run owns, and this module decides
 * what changed, what was removed, and what belongs to the person instead.
 */

export type PageElement = {
  /** Source file exactly as the page reports it (absolute or site-relative). */
  file: string;
  /** The element's location inside that file. */
  loc: string;
  tag: string;
  /** The element's own text, not its descendants'. */
  text: string;
  /** Every attribute except the source annotations, sorted for stability. */
  attributes: string;
  class: string;
  style: string;
};

export type RemovedElement = {
  file: string;
  loc: string;
  tag: string;
  label: string;
};

export type Comparison = {
  /** Elements to outline: text, attribute or style changes, and new elements. */
  changed: PageElement[];
  /** Elements that are no longer on the page, so there is no node to outline. */
  removed: RemovedElement[];
  /** How many changes were left alone because the run does not own their file. */
  excluded: number;
};

const clean = (file: string): string =>
  file.replace(/\\/g, '/').replace(/^\.\//, '').replace(/^\//, '');

/** The file as a person reads it: `src/pages/index.astro`, not the full path. */
export function sourceLabel(file: string): string {
  const cleanFile = clean(file);
  const marker = cleanFile.lastIndexOf('/src/');
  return marker === -1 ? cleanFile : cleanFile.slice(marker + 1);
}

/**
 * Ownership comes from the run's own file list (batch 1): a page attribute may
 * carry an absolute path while the run records site-relative ones, so a file
 * counts as owned when the two paths are equal or one ends with the other.
 */
function ownedBy(file: string, ownedFiles: string[]): boolean {
  const value = clean(file);
  return ownedFiles.some((owned) => {
    const other = clean(owned);
    return other !== '' && (value === other || value.endsWith(`/${other}`));
  });
}

const differs = (before: PageElement, after: PageElement): boolean =>
  before.text !== after.text ||
  before.attributes !== after.attributes ||
  before.class !== after.class ||
  before.style !== after.style;

/** What an element looked like, without where the file happens to place it. */
const signatureOf = (element: PageElement): string =>
  [
    element.tag,
    element.text,
    element.attributes,
    element.class,
    element.style,
  ].join('\u0000');

function byFile(elements: PageElement[]): Map<string, PageElement[]> {
  const files = new Map<string, PageElement[]>();
  for (const element of elements) {
    const list = files.get(element.file);
    if (list) list.push(element);
    else files.set(element.file, [element]);
  }
  return files;
}

/**
 * The elements that look the same in both versions, matched in page order.
 * A location is a line number, so adding or removing one line shifts every
 * element after it; matching on what the element looks like keeps an unrelated
 * shift from being reported as the whole page being rewritten.
 */
function align(
  before: PageElement[],
  after: PageElement[],
  shapeOf: (element: PageElement) => string = signatureOf,
): Array<[number, number]> {
  const rows = before.length;
  const columns = after.length;
  const lengths: number[][] = Array.from({ length: rows + 1 }, () =>
    Array.from<number>({ length: columns + 1 }).fill(0),
  );
  for (let row = rows - 1; row >= 0; row -= 1) {
    for (let column = columns - 1; column >= 0; column -= 1) {
      lengths[row][column] =
        shapeOf(before[row]) === shapeOf(after[column])
          ? lengths[row + 1][column + 1] + 1
          : Math.max(lengths[row + 1][column], lengths[row][column + 1]);
    }
  }
  const pairs: Array<[number, number]> = [];
  let row = 0;
  let column = 0;
  while (row < rows && column < columns) {
    if (shapeOf(before[row]) === shapeOf(after[column])) {
      pairs.push([row, column]);
      row += 1;
      column += 1;
    } else if (lengths[row + 1][column] >= lengths[row][column + 1]) row += 1;
    else column += 1;
  }
  return pairs;
}

/**
 * Everything the run itself is responsible for, file by file. Elements the run
 * did not write are counted and left out, so the person's own edit during the
 * run is never shown as the run's work.
 */
export function compareSnapshots(
  before: PageElement[],
  after: PageElement[],
  ownedFiles: string[],
): Comparison {
  const was = byFile(before);
  const now = byFile(after);
  const changed: PageElement[] = [];
  const removed: RemovedElement[] = [];
  let excluded = 0;

  for (const file of new Set([...was.keys(), ...now.keys()])) {
    const previous = was.get(file) ?? [];
    const current = now.get(file) ?? [];
    if (!ownedBy(file, ownedFiles)) {
      excluded += Math.max(previous.length, current.length);
      continue;
    }

    const pairs = align(previous, current);
    let beforeIndex = 0;
    let afterIndex = 0;
    const settle = (endBefore: number, endAfter: number): void => {
      const gapBefore = previous.slice(beforeIndex, endBefore);
      const gapAfter = current.slice(afterIndex, endAfter);
      const matches = align(gapBefore, gapAfter, (element) => element.tag);
      let oldOffset = 0;
      let newOffset = 0;
      const addRemoved = (element: PageElement): void => {
        removed.push({
          file: element.file,
          loc: element.loc,
          tag: element.tag,
          label: `Removed: ${element.tag} at ${sourceLabel(element.file)}:${element.loc}`,
        });
      };
      for (const [oldIndex, newIndex] of [
        ...matches,
        [gapBefore.length, gapAfter.length],
      ]) {
        for (; oldOffset < oldIndex; oldOffset += 1)
          addRemoved(gapBefore[oldOffset]);
        for (; newOffset < newIndex; newOffset += 1)
          changed.push(gapAfter[newOffset]);
        const oldElement = gapBefore[oldIndex];
        const newElement = gapAfter[newIndex];
        if (oldElement && newElement && differs(oldElement, newElement))
          changed.push(newElement);
        oldOffset = oldIndex + 1;
        newOffset = newIndex + 1;
      }
    };

    for (const [row, column] of [...pairs, [previous.length, current.length]]) {
      settle(row, column);
      beforeIndex = row + 1;
      afterIndex = column + 1;
    }
  }

  return { changed, removed, excluded };
}

/**
 * Everything the run itself is responsible for. A source location can appear
 * more than once (a component used twice), so repeats are compared in order
 * rather than collapsed into one.
 */

/** One entry per part of the page a run changed, ready for the Before/After toggle. */
export type HighlightedPart = {
  file: string;
  loc: string;
  text: string;
  label: string;
  removed?: boolean;
};

export function highlightsFor(comparison: Comparison): HighlightedPart[] {
  return [
    ...comparison.changed.map((element) => ({
      file: element.file,
      loc: element.loc,
      text: element.text,
      label: `Changed: ${element.tag} at ${sourceLabel(element.file)}:${element.loc}`,
    })),
    ...comparison.removed.map((element) => ({
      file: element.file,
      loc: element.loc,
      text: '',
      label: element.label,
      removed: true,
    })),
  ];
}

export type CssRuleChange = {
  file: string;
  selector: string;
  status: 'added' | 'changed' | 'removed';
  label: string;
};

export type ChangedPage = {
  file: string;
  page: string;
};

function skipCssStringOrComment(text: string, index: number): number {
  const ch = text[index];
  if (ch === "'" || ch === '"') {
    let cursor = index + 1;
    while (cursor < text.length) {
      if (text[cursor] === '\\') {
        cursor += 2;
        continue;
      }
      if (text[cursor] === ch) return cursor + 1;
      cursor += 1;
    }
    return text.length;
  }
  if (ch === '/' && text[index + 1] === '*') {
    const close = text.indexOf('*/', index + 2);
    return close === -1 ? text.length : close + 2;
  }
  return -1;
}

function stripCssComments(text: string): string {
  let out = '';
  for (let i = 0; i < text.length;) {
    const ch = text[i];
    if (ch === "'" || ch === '"') {
      const end = skipCssStringOrComment(text, i);
      out += text.slice(i, end);
      i = end;
      continue;
    }
    if (ch === '/' && text[i + 1] === '*') {
      const close = text.indexOf('*/', i + 2);
      i = close === -1 ? text.length : close + 2;
      continue;
    }
    out += ch;
    i += 1;
  }
  return out;
}

const normalizeCssText = (value: string): string =>
  stripCssComments(value)
    .replace(/\s+/g, ' ')
    .replace(/\s*([,:;{}])\s*/g, '$1')
    .trim();

const normalizeSelectorText = (value: string): string =>
  stripCssComments(value)
    .replace(/\s+/g, ' ')
    .replace(/\s*,\s*/g, ', ')
    .trim();

function extractCssRuleMap(css: string): Map<string, string[]> {
  const rules = new Map<string, string[]>();
  const stack: Array<{
    selectorNorm: string;
    bodyStart: number;
    cursor: number;
    declChunks: string[];
    isKeyframes: boolean;
    ignoreChildren: boolean;
  }> = [];
  let stmtStart = 0;
  let parenDepth = 0;

  for (let i = 0; i < css.length;) {
    const skipped = skipCssStringOrComment(css, i);
    if (skipped !== -1) {
      i = skipped;
      continue;
    }
    const ch = css[i];
    if (ch === '(' || ch === '[') {
      parenDepth += 1;
      i += 1;
      continue;
    }
    if (ch === ')' || ch === ']') {
      if (parenDepth > 0) parenDepth -= 1;
      i += 1;
      continue;
    }
    if (parenDepth > 0) {
      i += 1;
      continue;
    }
    if (ch === ';') {
      stmtStart = i + 1;
      i += 1;
      continue;
    }
    if (ch === '{') {
      const parent = stack[stack.length - 1];
      if (parent && !parent.ignoreChildren) {
        parent.declChunks.push(css.slice(parent.cursor, stmtStart));
      }
      const selectorNorm = normalizeSelectorText(css.slice(stmtStart, i));
      const isKeyframes = /^@(?:-[a-z-]+-)?keyframes\b/i.test(selectorNorm);
      stack.push({
        selectorNorm,
        bodyStart: i + 1,
        cursor: i + 1,
        declChunks: [],
        isKeyframes,
        ignoreChildren: Boolean(parent?.ignoreChildren) || isKeyframes,
      });
      stmtStart = i + 1;
      i += 1;
      continue;
    }
    if (ch === '}') {
      const frame = stack.pop();
      const parent = stack[stack.length - 1];
      if (parent) parent.cursor = i + 1;
      if (
        frame &&
        frame.selectorNorm !== '' &&
        !(frame.ignoreChildren && !frame.isKeyframes)
      ) {
        const body = frame.isKeyframes
          ? normalizeCssText(css.slice(frame.bodyStart, i))
          : normalizeCssText(
              [...frame.declChunks, css.slice(frame.cursor, i)].join(' '),
            );
        const hadNoChildren = frame.declChunks.length === 0;
        if (
          body !== '' ||
          (hadNoChildren && !frame.selectorNorm.startsWith('@'))
        ) {
          const parentSelectors = stack
            .map((item) => item.selectorNorm)
            .filter(Boolean);
          const fullSelector =
            parentSelectors.length > 0
              ? `${parentSelectors.join(' > ')} > ${frame.selectorNorm}`
              : frame.selectorNorm;
          const list = rules.get(fullSelector) ?? [];
          list.push(body);
          rules.set(fullSelector, list);
        }
      }
      stmtStart = i + 1;
      i += 1;
      continue;
    }
    i += 1;
  }

  return rules;
}

function extractCssFromSource(file: string, source: string | null): string {
  if (!source) return '';
  const cleanFile = clean(file).toLowerCase();
  if (/\.(css|pcss|scss)$/.test(cleanFile)) return source;
  if (!cleanFile.endsWith('.astro')) return '';
  let template = source;
  if (source.startsWith('---')) {
    const endFence = source.indexOf('\n---', 3);
    if (endFence !== -1) template = source.slice(endFence + 4);
  }
  const chunks: string[] = [];
  for (const match of template.matchAll(
    /<style\b[^>]*>([\s\S]*?)<\/style>/gi,
  )) {
    chunks.push(match[1]);
  }
  return chunks.join('\n');
}

const sameBodies = (a: string[] = [], b: string[] = []): boolean =>
  a.length === b.length && a.every((item, index) => item === b[index]);

/** Compares CSS rules inside a stylesheet or Astro `<style>` block before and after a run. */
export function compareCssRules(
  file: string,
  beforeSource: string | null,
  afterSource: string | null,
): CssRuleChange[] {
  const beforeCss = extractCssFromSource(file, beforeSource);
  const afterCss = extractCssFromSource(file, afterSource);
  if (beforeCss === '' && afterCss === '') return [];
  const beforeRules = extractCssRuleMap(beforeCss);
  const afterRules = extractCssRuleMap(afterCss);
  const changes: CssRuleChange[] = [];
  const labelFile = sourceLabel(file);

  for (const selector of new Set([
    ...beforeRules.keys(),
    ...afterRules.keys(),
  ])) {
    const was = beforeRules.get(selector);
    const now = afterRules.get(selector);
    if (was && now && sameBodies(was, now)) continue;
    const status: CssRuleChange['status'] = !was
      ? 'added'
      : !now
        ? 'removed'
        : 'changed';
    const verb =
      status === 'added'
        ? 'Added rule'
        : status === 'removed'
          ? 'Removed rule'
          : 'Changed rule';
    changes.push({
      file: labelFile,
      selector,
      status,
      label: `${verb}: ${selector} in ${labelFile}`,
    });
  }

  return changes;
}

export function collectCssRuleChanges(
  files: Array<{ file: string; before: string | null; after: string | null }>,
): CssRuleChange[] {
  return files.flatMap((entry) =>
    compareCssRules(entry.file, entry.before, entry.after),
  );
}

/** Canonicalises a preview route (`/about/` or `/index.html` -> `/about` or `/`). */
export function normalizePageRoute(route: string): string {
  const cleanPath = route
    .split(/[?#]/)[0]
    .replace(/\/index\.html$/i, '')
    .replace(/\/+$/, '');
  return cleanPath === ''
    ? '/'
    : cleanPath.startsWith('/')
      ? cleanPath
      : `/${cleanPath}`;
}

export function pageRouteFromFile(file: string): string | null {
  const cleanFile = clean(file);
  if (!cleanFile.startsWith('src/pages/')) return null;
  if (!/\.(astro|mdx?|html)$/i.test(cleanFile)) return null;
  if (/\[[^\]]+\]/.test(cleanFile)) return null;
  const rel = cleanFile
    .slice('src/pages/'.length)
    .replace(/\.(astro|mdx?|html)$/i, '');
  const withoutIndex = rel === 'index' ? '' : rel.replace(/\/index$/i, '');
  return withoutIndex === '' ? '/' : `/${withoutIndex}`;
}

/** Changed non-deleted pages other than the page currently open in the preview. */
export function otherChangedPages(
  files: Array<{ file: string; status: 'added' | 'changed' | 'removed' }>,
  currentPreviewUrl: string | null,
): ChangedPage[] {
  let currentRoute = '/';
  if (currentPreviewUrl) {
    try {
      currentRoute = normalizePageRoute(new URL(currentPreviewUrl).pathname);
    } catch {
      currentRoute = normalizePageRoute(currentPreviewUrl);
    }
  }
  const seen = new Set<string>();
  const out: ChangedPage[] = [];
  for (const item of files) {
    if (item.status === 'removed') continue;
    const page = pageRouteFromFile(item.file);
    if (!page || page === currentRoute || seen.has(page)) continue;
    seen.add(page);
    out.push({ file: item.file, page });
  }
  return out.sort((a, b) => a.page.localeCompare(b.page));
}
