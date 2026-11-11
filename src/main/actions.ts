import path from 'node:path';
import fs from 'node:fs';
import {
  applyEdit,
  findTag,
  findClosingTag,
  parseTag,
  decodeEntities,
  escapeText,
  type EditOperation,
} from './edit';
import {
  createFileAtomic,
  hashOf,
  isInside,
  readFile,
  writeFileAtomic,
} from './files';

/**
 * One set of actions for everything that changes a site: the visual controls,
 * the agent panel, and outside agents through the local connection (plan 2.1).
 * Every write states the version it was based on, and an out-of-date write is
 * refused with a reason rather than applied.
 */

export type Target = {
  file: string;
  line: number;
  column: number;
  name: string;
};

export type ActionRequest =
  | { action: 'listPages' }
  | { action: 'readPageOutline'; page: string }
  | {
      action: 'editElementText';
      target: Target;
      value: string;
      baseHash: string;
      expected?: { text?: string; attributes?: Record<string, string> };
    }
  | {
      action: 'editElementAttribute';
      target: Target;
      name: string;
      value: string | null;
      baseHash: string;
      expected?: { text?: string; attributes?: Record<string, string> };
    }
  | {
      action: 'editElementStyle';
      target: Target;
      properties: Record<string, string>;
      baseHash: string;
      expected?: { text?: string; attributes?: Record<string, string> };
    }
  | {
      action: 'editCssRule';
      file: string;
      selector: string;
      property: string;
      value: string;
      baseHash: string;
      expected?: { text?: string; attributes?: Record<string, string> };
    }
  | { action: 'createPage'; page: string; title: string }
  | { action: 'readSource'; file: string }
  | {
      action: 'writeSource';
      file: string;
      content: string;
      baseHash: string | null;
    }
  | { action: 'readPageSections'; page: string }
  | {
      action: 'reorderPageSections';
      page: string;
      fromIndex: number;
      toIndex: number;
      baseHash?: string;
    }
  | {
      action: 'deletePageSection';
      page: string;
      sectionIndex: number;
      baseHash?: string;
    }
  | {
      action: 'setPageSectionAnchor';
      page: string;
      sectionIndex: number;
      anchorId: string;
      baseHash?: string;
    }
  | {
      action: 'duplicatePageSection';
      page: string;
      sectionIndex: number;
      baseHash?: string;
    }
  | {
      action: 'insertPageSection';
      page: string;
      afterIndex: number;
      sectionCode: string;
      baseHash?: string;
    };

export type ActionOk = { ok: true; [key: string]: unknown };
export type ActionProblem = {
  ok: false;
  problem: string;
  clash?: { file: string; diskText?: string };
};
export type ActionResult = ActionOk | ActionProblem;

/** Where an element edit may land: files that hold markup. */
const MARKUP_FILES = /\.(astro|html|md|mdx)$/i;
/** Where a CSS rule edit may land. */
const STYLE_FILES = /\.(css|astro)$/i;

/**
 * Whole-site briefs need to write page, layout and component markup, plus the
 * design stylesheet. That is deliberately narrower than a filesystem tool: only
 * these roots, only these extensions, never package files, scripts or assets.
 */
const SOURCE_PATHS =
  /^(?:src\/(?:pages|layouts|components)\/(?:[^/]+\/)*[^/]+\.astro|src\/styles\/(?:[^/]+\/)*[^/]+\.css)$/;

/** A whole source file, bigger than any real Astro page, is refused. */
const MAX_SOURCE_BYTES = 512 * 1024;

function sourceAt(
  root: string,
  file: string,
): { full: string } | { problem: string } {
  if (typeof file !== 'string' || file.trim() === '')
    return { problem: 'Give a file path relative to the site.' };
  if (path.isAbsolute(file))
    return {
      problem: 'Use a path relative to the site, not an absolute path.',
    };
  if (file.includes('\\'))
    return { problem: 'Use forward slashes in the file path.' };
  const parts = file.split('/');
  if (
    parts.some(
      (part) =>
        part === '' || part === '.' || part === '..' || part.startsWith('.'),
    )
  )
    return { problem: 'That path is not a plain file inside the site.' };
  if (!SOURCE_PATHS.test(file))
    return {
      problem:
        'Only .astro files under src/pages, src/layouts or src/components, and .css files under src/styles, can be read or written.',
    };
  const full = path.join(root, ...parts);
  if (!isInside(root, full))
    return { problem: 'That file is not inside the open site.' };
  if (fs.existsSync(full)) {
    const stat = fs.lstatSync(full);
    if (stat.isSymbolicLink())
      return { problem: 'A symlinked source file cannot be read or written.' };
    if (!stat.isFile()) return { problem: 'That path is not a file.' };
  }
  return { full };
}

/** The exact text of one allowed source file, plus the hash a write must state. */
export function readSource(root: string, file: string): ActionResult {
  const checked = sourceAt(root, file);
  if ('problem' in checked) return { ok: false, problem: checked.problem };
  const { full } = checked;
  if (!fs.existsSync(full))
    // Missing is not an error: it is the explicit creation case. The null hash
    // is what writeSource requires before it will create the file.
    return { ok: true, file, exists: false, content: null, hash: null };
  const disk = readFile(full);
  if (Buffer.byteLength(disk.text, 'utf8') > MAX_SOURCE_BYTES)
    return { ok: false, problem: 'That file is too large to read as source.' };
  return { ok: true, file, exists: true, content: disk.text, hash: disk.hash };
}

/**
 * Replaces a whole source file exactly as provided. An existing file needs its
 * exact current hash; a new file needs an explicit null hash and is created
 * without ever clobbering a file that appeared in the meantime.
 */
export function writeSource(
  root: string,
  file: string,
  content: string,
  baseHash: string | null,
): ActionResult {
  const checked = sourceAt(root, file);
  if ('problem' in checked) return { ok: false, problem: checked.problem };
  if (typeof content !== 'string')
    return { ok: false, problem: 'The new source must be text.' };
  if (Buffer.byteLength(content, 'utf8') > MAX_SOURCE_BYTES)
    return { ok: false, problem: 'That source is too large to write.' };
  const { full } = checked;

  if (!fs.existsSync(full)) {
    if (baseHash !== null)
      return {
        ok: false,
        problem:
          'That file does not exist. Read it again; to create a new file, baseHash must be null.',
      };
    fs.mkdirSync(path.dirname(full), { recursive: true });
    // Parents may have resolved through a changed ancestor; re-check before publishing.
    const afterMkdir = sourceAt(root, file);
    if ('problem' in afterMkdir)
      return { ok: false, problem: afterMkdir.problem };
    try {
      // Atomic and exclusive: a file that appeared after the check above is never overwritten.
      createFileAtomic(full, content);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'EEXIST')
        return {
          ok: false,
          problem:
            'A file appeared there while this was being saved. Nothing was overwritten.',
        };
      throw error;
    }
    return { ok: true, file, hash: hashOf(content), created: true };
  }

  if (typeof baseHash !== 'string')
    return {
      ok: false,
      problem:
        'That file already exists. Read it and pass its exact hash; a null hash is only for creating a new file.',
    };
  const disk = readFile(full);
  if (disk.hash !== baseHash)
    return {
      ok: false,
      problem:
        'That file changed since it was read. Read it again before writing.',
      clash: { file, diskText: disk.text },
    };
  writeFileAtomic(full, content);
  return { ok: true, file, hash: hashOf(content), created: false };
}

export function listPages(root: string): Array<{ page: string; file: string }> {
  const pagesDir = path.join(root, 'src/pages');
  const found: Array<{ page: string; file: string }> = [];
  const walk = (dir: string) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
        continue;
      }
      if (!entry.name.endsWith('.astro')) continue;
      const relative = path.relative(pagesDir, full).replace(/\.astro$/, '');
      const page =
        `/${relative.replace(/(^|\/)index$/, '$1').replace(/\/$/, '')}/`.replace(
          /\/+/g,
          '/',
        );
      found.push({ page, file: path.relative(root, full) });
    }
  };
  if (fs.existsSync(pagesDir)) walk(pagesDir);
  return found.sort((a, b) => a.page.localeCompare(b.page));
}

/** A plain outline of a page's headings, for the agent to reason about. */
export function readPageOutline(root: string, page: string): ActionResult {
  const relative = page.replace(/^\/+/, '');
  const candidates = [
    path.join(root, 'src/pages', `${relative}.astro`),
    path.join(root, 'src/pages', relative, 'index.astro'),
    path.join(root, 'src/pages', `${relative.replace(/\/$/, '')}.astro`),
  ];
  const file = candidates.find(
    (candidate) => isInside(root, candidate) && fs.existsSync(candidate),
  );
  if (!file) return { ok: false, problem: `No page file for ${page}.` };
  const text = fs.readFileSync(file, 'utf8');
  const headings = [
    ...text.matchAll(/<(h[1-6])([^>]*)>([\s\S]*?)<\/\1>/gi),
  ].map((match) => {
    // Where the tag starts, so an outside agent can use the same edit actions
    // the interface uses without guessing a position.
    const index = match.index ?? 0;
    const before = text.slice(0, index);
    return {
      level: Number(match[1].slice(1)),
      text: match[3]
        .replace(/<[^>]+>/g, '')
        .trim()
        .slice(0, 120),
      line: before.split('\n').length,
      column: index - before.lastIndexOf('\n'),
    };
  });
  return {
    ok: true,
    page,
    file: path.relative(root, file),
    headings,
    hash: hashOf(text),
  };
}

export type PageSection = {
  index: number;
  tag: string;
  name: string;
  anchorId: string | null;
  line: number;
  preview: string;
};

type InternalSectionBlock = PageSection & {
  start: number;
  end: number;
};

const CONTAINER_TAGS = new Set([
  'base',
  'layout',
  'html',
  'body',
  'main',
  'slot',
  'head',
]);

function resolvePageFile(root: string, page: string): string | null {
  const relative = page.replace(/^\/+/, '');
  const candidates = [
    path.join(root, 'src/pages', `${relative}.astro`),
    path.join(root, 'src/pages', relative, 'index.astro'),
    path.join(root, 'src/pages', `${relative.replace(/\/$/, '')}.astro`),
  ];
  return (
    candidates.find(
      (candidate) => isInside(root, candidate) && fs.existsSync(candidate),
    ) ?? null
  );
}

/** Index just after the quote that closes the string opened at `start`, or -1. */
function endOfString(text: string, start: number): number {
  const quote = text[start];
  for (let i = start + 1; i < text.length; i++) {
    const ch = text[i];
    if (ch === '\\') i++;
    else if (ch === quote) return i + 1;
    // Only a template literal may span lines. A lone ' or " on a line is
    // text (an apostrophe), not the start of a string.
    else if (ch === '\n' && quote !== '`') return -1;
  }
  return -1;
}

/** Returns the index just after the `}` that closes the `{` at `start`. */
function skipBraces(text: string, start: number): number {
  let depth = 0;
  for (let i = start; i < text.length; i++) {
    const ch = text[i];
    if (ch === '"' || ch === "'" || ch === '`') {
      const end = endOfString(text, i);
      if (end !== -1) i = end - 1;
    } else if (ch === '{') depth++;
    else if (ch === '}' && --depth === 0) return i + 1;
  }
  return text.length;
}

function findSectionBlocks(text: string): InternalSectionBlock[] {
  let searchStart = 0;
  // The front matter fence may use Windows line endings.
  const frontMatter = /^---\r?\n[\s\S]*?\r?\n---[ \t]*(?:\r?\n|$)/.exec(text);
  if (frontMatter) searchStart = frontMatter[0].length;

  const blocks: InternalSectionBlock[] = [];
  let index = searchStart;
  let sectionIndex = 0;

  while (index < text.length) {
    const nextTagStart = text.indexOf('<', index);
    if (nextTagStart === -1) break;

    // A `{ ... }` expression (a loop or condition) is code, not a section:
    // skip it whole so components inside it are never listed.
    const braceStart = text.indexOf('{', index);
    if (braceStart !== -1 && braceStart < nextTagStart) {
      index = skipBraces(text, braceStart);
      continue;
    }

    // Check if it's a closing tag or comment
    if (text[nextTagStart + 1] === '/') {
      const endClose = text.indexOf('>', nextTagStart);
      index = endClose === -1 ? text.length : endClose + 1;
      continue;
    }
    if (text.startsWith('<!--', nextTagStart)) {
      const endComment = text.indexOf('-->', nextTagStart);
      index = endComment === -1 ? text.length : endComment + 3;
      continue;
    }

    const tag = parseTag(text, nextTagStart);
    if (!tag) {
      index = nextTagStart + 1;
      continue;
    }

    const lower = tag.name.toLowerCase();
    if (CONTAINER_TAGS.has(lower)) {
      // Step inside container without capturing it as a section
      index = tag.tagEnd;
      continue;
    }

    if (lower === 'script' || lower === 'style') {
      const closing = findClosingTag(text, tag);
      index = closing ? closing.end : tag.tagEnd;
      continue;
    }

    const isSection =
      lower === 'section' || lower === 'article' || /^[A-Z]/.test(tag.name);
    if (!isSection) {
      if (!tag.selfClosing) {
        const closing = findClosingTag(text, tag);
        index = closing ? closing.end : tag.tagEnd;
      } else {
        index = tag.tagEnd;
      }
      continue;
    }

    // Determine start and end of this block
    const blockStart = tag.start;
    let blockEnd = tag.tagEnd;
    let innerText = '';

    if (!tag.selfClosing) {
      const closing = findClosingTag(text, tag);
      if (closing) {
        blockEnd = closing.end;
        innerText = text.slice(tag.tagEnd, closing.start);
      }
    }

    const anchorAttr = tag.attributes.find((a) => a.name === 'id');
    const anchorId = anchorAttr?.value
      ? decodeEntities(anchorAttr.value)
      : null;

    let name = tag.name;
    if (/^[A-Z]/.test(tag.name)) {
      name = tag.name.replace(/([A-Z])/g, ' $1').trim();
    } else if (anchorId) {
      name = `${tag.name} #${anchorId}`;
    } else {
      const classAttr = tag.attributes.find((a) => a.name === 'class');
      if (classAttr?.value) {
        name = `${tag.name}.${classAttr.value.split(/\s+/)[0]}`;
      } else {
        name = `${tag.name} ${sectionIndex + 1}`;
      }
    }

    const before = text.slice(0, blockStart);
    const line = before.split('\n').length;
    const preview = innerText
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 80);

    blocks.push({
      index: sectionIndex++,
      tag: tag.name,
      name,
      anchorId,
      line,
      preview,
      start: blockStart,
      end: blockEnd,
    });

    index = blockEnd;
  }

  return blocks;
}

export function readPageSections(
  root: string,
  page: string,
): ActionResult & { sections?: PageSection[] } {
  const file = resolvePageFile(root, page);
  if (!file) return { ok: false, problem: `No page file for ${page}.` };

  const text = fs.readFileSync(file, 'utf8');
  const blocks = findSectionBlocks(text).map(
    ({ start: _s, end: _e, ...rest }) => rest,
  );
  return {
    ok: true,
    file: path.relative(root, file),
    sections: blocks,
    hash: hashOf(text),
  };
}

export function reorderPageSections(
  root: string,
  page: string,
  fromIndex: number,
  toIndex: number,
  baseHash?: string,
): ActionResult & { sections?: PageSection[]; hash?: string } {
  const file = resolvePageFile(root, page);
  if (!file) return { ok: false, problem: `No page file for ${page}.` };

  const disk = readFile(file);
  if (baseHash && disk.hash !== baseHash) {
    return {
      ok: false,
      problem:
        'That file changed since this action was prepared. Read it again before editing.',
    };
  }

  const text = disk.text;
  const blocks = findSectionBlocks(text);
  if (
    fromIndex < 0 ||
    fromIndex >= blocks.length ||
    toIndex < 0 ||
    toIndex >= blocks.length ||
    fromIndex === toIndex
  ) {
    return { ok: false, problem: 'Invalid section indices to reorder.' };
  }

  const i = Math.min(fromIndex, toIndex);
  const j = Math.max(fromIndex, toIndex);
  const blockA = blocks[i];
  const blockB = blocks[j];

  const textBefore = text.slice(0, blockA.start);
  const sliceA = text.slice(blockA.start, blockA.end);
  const textBetween = text.slice(blockA.end, blockB.start);
  const sliceB = text.slice(blockB.start, blockB.end);
  const textAfter = text.slice(blockB.end);

  const newText = textBefore + sliceB + textBetween + sliceA + textAfter;
  writeFileAtomic(file, newText);

  const updated = findSectionBlocks(newText).map(
    ({ start: _s, end: _e, ...rest }) => rest,
  );
  return {
    ok: true,
    file: path.relative(root, file),
    sections: updated,
    hash: hashOf(newText),
  };
}

export function deletePageSection(
  root: string,
  page: string,
  sectionIndex: number,
  baseHash?: string,
): ActionResult & { sections?: PageSection[]; hash?: string } {
  const file = resolvePageFile(root, page);
  if (!file) return { ok: false, problem: `No page file for ${page}.` };

  const disk = readFile(file);
  if (baseHash && disk.hash !== baseHash) {
    return {
      ok: false,
      problem:
        'That file changed since this action was prepared. Read it again before editing.',
    };
  }

  const text = disk.text;
  const blocks = findSectionBlocks(text);
  if (sectionIndex < 0 || sectionIndex >= blocks.length) {
    return { ok: false, problem: 'Invalid section index to delete.' };
  }

  const target = blocks[sectionIndex];
  let delEnd = target.end;
  if (text[delEnd] === '\r') delEnd++;
  if (text[delEnd] === '\n') delEnd++;

  const newText = text.slice(0, target.start) + text.slice(delEnd);
  writeFileAtomic(file, newText);

  const updated = findSectionBlocks(newText).map(
    ({ start: _s, end: _e, ...rest }) => rest,
  );
  return {
    ok: true,
    file: path.relative(root, file),
    sections: updated,
    hash: hashOf(newText),
  };
}

export function setPageSectionAnchor(
  root: string,
  page: string,
  sectionIndex: number,
  anchorId: string,
  baseHash?: string,
): ActionResult & { sections?: PageSection[]; hash?: string } {
  const file = resolvePageFile(root, page);
  if (!file) return { ok: false, problem: `No page file for ${page}.` };

  const disk = readFile(file);
  if (baseHash && disk.hash !== baseHash) {
    return {
      ok: false,
      problem:
        'That file changed since this action was prepared. Read it again before editing.',
    };
  }

  const text = disk.text;
  const blocks = findSectionBlocks(text);
  if (sectionIndex < 0 || sectionIndex >= blocks.length) {
    return { ok: false, problem: 'Invalid section index.' };
  }

  const target = blocks[sectionIndex];
  const cleanAnchor = anchorId.replace(/^#+/, '').trim();
  // The anchor is written into markup, so only a plain id is accepted.
  if (!/^[A-Za-z][A-Za-z0-9_-]*$/.test(cleanAnchor)) {
    return {
      ok: false,
      problem:
        'An anchor starts with a letter and uses only letters, numbers, dashes and underscores.',
    };
  }

  // Only the section's own opening tag is touched: an id (or data-id) on
  // something inside the section is never the section's anchor.
  const tag = parseTag(text, target.start);
  if (!tag) return { ok: false, problem: 'That section could not be read.' };
  const existing = tag.attributes.find((attribute) => attribute.name === 'id');
  if (existing && !existing.quote && existing.value?.startsWith('{')) {
    return {
      ok: false,
      problem:
        'This section sets its id with an Astro expression. Edit its source instead.',
    };
  }
  let newText: string;
  if (existing) {
    const quote = existing.quote || '"';
    newText =
      text.slice(0, existing.start) +
      `id=${quote}${cleanAnchor}${quote}` +
      text.slice(existing.end);
  } else {
    const insertAt = tag.start + 1 + tag.name.length;
    newText =
      text.slice(0, insertAt) + ` id="${cleanAnchor}"` + text.slice(insertAt);
  }
  writeFileAtomic(file, newText);

  const updated = findSectionBlocks(newText).map(
    ({ start: _s, end: _e, ...rest }) => rest,
  );
  return {
    ok: true,
    file: path.relative(root, file),
    sections: updated,
    hash: hashOf(newText),
  };
}

export function duplicatePageSection(
  root: string,
  page: string,
  sectionIndex: number,
  baseHash?: string,
): ActionResult & { sections?: PageSection[]; hash?: string } {
  const file = resolvePageFile(root, page);
  if (!file) return { ok: false, problem: `No page file for ${page}.` };

  const disk = readFile(file);
  if (baseHash && disk.hash !== baseHash) {
    return {
      ok: false,
      problem:
        'That file changed since this action was prepared. Read it again before editing.',
    };
  }

  const text = disk.text;
  const blocks = findSectionBlocks(text);
  if (sectionIndex < 0 || sectionIndex >= blocks.length) {
    return { ok: false, problem: 'Invalid section index to duplicate.' };
  }

  const target = blocks[sectionIndex];
  const sectionText = text.slice(target.start, target.end);

  const newText =
    text.slice(0, target.end) + '\n' + sectionText + text.slice(target.end);
  writeFileAtomic(file, newText);

  const updated = findSectionBlocks(newText).map(
    ({ start: _s, end: _e, ...rest }) => rest,
  );
  return {
    ok: true,
    file: path.relative(root, file),
    sections: updated,
    hash: hashOf(newText),
  };
}

export function insertPageSection(
  root: string,
  page: string,
  afterIndex: number,
  sectionCode: string,
  baseHash?: string,
): ActionResult & { sections?: PageSection[]; hash?: string } {
  const file = resolvePageFile(root, page);
  if (!file) return { ok: false, problem: `No page file for ${page}.` };

  const disk = readFile(file);
  if (baseHash && disk.hash !== baseHash) {
    return {
      ok: false,
      problem:
        'That file changed since this action was prepared. Read it again before editing.',
    };
  }

  const text = disk.text;
  const blocks = findSectionBlocks(text);
  const code = sectionCode.trim();

  let newText: string;
  if (afterIndex === -1) {
    if (blocks.length > 0) {
      const insertPos = blocks[0].start;
      newText = text.slice(0, insertPos) + code + '\n' + text.slice(insertPos);
    } else {
      const mainClose = text.indexOf('</main>');
      const bodyClose = text.indexOf('</body>');
      const insertPos =
        mainClose !== -1
          ? mainClose
          : bodyClose !== -1
            ? bodyClose
            : text.length;
      newText = text.slice(0, insertPos) + code + '\n' + text.slice(insertPos);
    }
  } else if (afterIndex >= 0 && afterIndex < blocks.length) {
    const insertPos = blocks[afterIndex].end;
    const separator =
      text[insertPos] === '\n' || text[insertPos] === '\r' ? '' : '\n';
    newText =
      text.slice(0, insertPos) +
      '\n' +
      code +
      separator +
      text.slice(insertPos);
  } else {
    return { ok: false, problem: 'Invalid section index to insert after.' };
  }

  writeFileAtomic(file, newText);

  const updated = findSectionBlocks(newText).map(
    ({ start: _s, end: _e, ...rest }) => rest,
  );
  return {
    ok: true,
    file: path.relative(root, file),
    sections: updated,
    hash: hashOf(newText),
  };
}

function insideSite(root: string, file: string): string | null {
  const full = path.isAbsolute(file) ? file : path.join(root, file);
  return isInside(root, full) ? full : null;
}

function writeChecked(
  root: string,
  file: string,
  baseHash: string,
  operation: EditOperation,
  target: Target,
  expected: { text?: string; attributes?: Record<string, string> },
  hasOriginal = false,
): ActionResult {
  const full = insideSite(root, file);
  if (!full)
    return { ok: false, problem: 'That file is not inside the open site.' };
  if (!MARKUP_FILES.test(full))
    return {
      ok: false,
      problem:
        'Elements can only be edited in .astro, .html, .md or .mdx files.',
    };
  if (!fs.existsSync(full))
    return { ok: false, problem: 'That file no longer exists.' };

  const disk = readFile(full);
  if (disk.hash !== baseHash && !hasOriginal) {
    // A hash alone cannot prove which element was unchanged. Never manufacture
    // an expected value from the new disk version and call that a safe merge.
    return {
      ok: false,
      problem:
        'That file changed since this action was prepared. Read it again before editing.',
      clash: { file, diskText: disk.text },
    };
  }

  const result = applyEdit(
    disk.text,
    { ...target, file: full },
    operation,
    expected,
  );
  if (!result.ok) {
    return {
      ok: false,
      problem: result.reason,
      clash: { file, diskText: disk.text },
    };
  }
  writeFileAtomic(full, result.text);
  return { ok: true, file, hash: result.hash, text: result.text };
}

/**
 * Sets one declaration inside a CSS rule, leaving the rest of the stylesheet as written.
 */
export function editCssRule(
  root: string,
  file: string,
  selector: string,
  property: string,
  value: string,
  baseHash: string,
): ActionResult {
  const full = insideSite(root, file);
  if (!full)
    return { ok: false, problem: 'That file is not inside the open site.' };
  // A CSS rule belongs in a stylesheet, or in a page or component that
  // carries its own <style>. Anything else (package.json, config, scripts)
  // would be corrupted by one.
  if (!STYLE_FILES.test(full))
    return {
      ok: false,
      problem: 'CSS rules can only be edited in .css or .astro files.',
    };
  if (!fs.existsSync(full))
    return { ok: false, problem: 'That file no longer exists.' };
  const disk = readFile(full);
  if (disk.hash !== baseHash) {
    return {
      ok: false,
      problem: 'That stylesheet changed since this edit was prepared.',
      clash: { file, diskText: disk.text },
    };
  }

  const text = disk.text;
  const rulePattern = new RegExp(
    `(${selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*\\{)`,
    'm',
  );
  const match = rulePattern.exec(text);
  const declaration = `${property}: ${value};`;

  if (match) {
    const bodyStart = match.index + match[1].length;
    const bodyEnd = text.indexOf('}', bodyStart);
    if (bodyEnd === -1)
      return { ok: false, problem: 'That rule is not closed.' };
    const body = text.slice(bodyStart, bodyEnd);
    const propertyPattern = new RegExp(
      `(^|[;{]\\s*)${property}\\s*:[^;]*;`,
      'm',
    );
    const nextBody = propertyPattern.test(body)
      ? body.replace(propertyPattern, `$1${declaration}`)
      : `${body.trimEnd()}${body.trimEnd().length > 0 ? '\n  ' : '\n  '}${declaration}\n`;
    const next = text.slice(0, bodyStart) + nextBody + text.slice(bodyEnd);
    writeFileAtomic(full, next);
    return { ok: true, file, hash: hashOf(next) };
  }

  // No such rule yet: add it at the end of the file, which is where style blocks live.
  const addition = `\n${selector} {\n  ${declaration}\n}\n`;
  const next = text.replace(/\s*$/, '') + addition;
  writeFileAtomic(full, next);
  return { ok: true, file, hash: hashOf(next), created: true };
}

/** Attributes as they exist in the file right now, for a checked write. */
function expectedFor(
  file: string,
  target: Target,
): { text?: string; attributes?: Record<string, string> } {
  const text = fs.readFileSync(file, 'utf8');
  const tag = findTag(text, { ...target, file });
  if (!tag) return {};
  const attributes: Record<string, string> = {};
  for (const attribute of tag.attributes) {
    if (attribute.value !== null) attributes[attribute.name] = attribute.value;
  }
  const close = findClosingTag(text, tag);
  const inner = close ? text.slice(tag.tagEnd, close.start) : '';
  return {
    text: /<[a-zA-Z]/.test(inner) ? undefined : decodeEntities(inner.trim()),
    attributes,
  };
}

export function runAction(root: string, request: ActionRequest): ActionResult {
  switch (request.action) {
    case 'listPages':
      return { ok: true, pages: listPages(root) };

    case 'readPageOutline':
      return readPageOutline(root, request.page);

    case 'editElementText': {
      const full = insideSite(root, request.target.file);
      if (!full)
        return { ok: false, problem: 'That file is not inside the open site.' };
      return writeChecked(
        root,
        request.target.file,
        request.baseHash,
        { kind: 'text', value: request.value },
        request.target,
        request.expected ?? expectedFor(full, request.target),
        Boolean(request.expected),
      );
    }

    case 'editElementAttribute': {
      const full = insideSite(root, request.target.file);
      if (!full)
        return { ok: false, problem: 'That file is not inside the open site.' };
      return writeChecked(
        root,
        request.target.file,
        request.baseHash,
        { kind: 'attribute', name: request.name, value: request.value },
        request.target,
        request.expected ?? expectedFor(full, request.target),
        Boolean(request.expected),
      );
    }

    case 'editElementStyle': {
      const full = insideSite(root, request.target.file);
      if (!full)
        return { ok: false, problem: 'That file is not inside the open site.' };
      return writeChecked(
        root,
        request.target.file,
        request.baseHash,
        { kind: 'style', properties: request.properties },
        request.target,
        request.expected ?? expectedFor(full, request.target),
        Boolean(request.expected),
      );
    }

    case 'editCssRule':
      return editCssRule(
        root,
        request.file,
        request.selector,
        request.property,
        request.value,
        request.baseHash,
      );

    case 'createPage': {
      const clean = request.page.replace(/^\/+/, '').replace(/\.astro$/, '');
      if (!/^[a-z0-9][a-z0-9\-/]*$/.test(clean)) {
        return {
          ok: false,
          problem: 'Page addresses use lowercase letters, numbers and dashes.',
        };
      }
      const file = path.join(root, 'src/pages', `${clean}.astro`);
      if (!isInside(root, file))
        return { ok: false, problem: 'That page would sit outside the site.' };
      if (fs.existsSync(file))
        return { ok: false, problem: 'A page already exists there.' };
      fs.mkdirSync(path.dirname(file), { recursive: true });
      const title = escapeText(request.title.trim() || clean);
      const body = `---\n---\n<!doctype html>\n<html lang="en-AU">\n  <head>\n    <meta charset="utf-8" />\n    <meta name="viewport" content="width=device-width, initial-scale=1" />\n    <title>${title}</title>\n  </head>\n  <body>\n    <h1>${title}</h1>\n  </body>\n</html>\n`;
      fs.writeFileSync(file, body, 'utf8');
      return { ok: true, file: path.relative(root, file) };
    }

    case 'readSource':
      return readSource(root, request.file);

    case 'writeSource':
      return writeSource(root, request.file, request.content, request.baseHash);

    case 'readPageSections':
      return readPageSections(root, request.page);

    case 'reorderPageSections':
      return reorderPageSections(
        root,
        request.page,
        request.fromIndex,
        request.toIndex,
        request.baseHash,
      );

    case 'deletePageSection':
      return deletePageSection(
        root,
        request.page,
        request.sectionIndex,
        request.baseHash,
      );

    case 'setPageSectionAnchor':
      return setPageSectionAnchor(
        root,
        request.page,
        request.sectionIndex,
        request.anchorId,
        request.baseHash,
      );

    case 'duplicatePageSection':
      return duplicatePageSection(
        root,
        request.page,
        request.sectionIndex,
        request.baseHash,
      );

    case 'insertPageSection':
      return insertPageSection(
        root,
        request.page,
        request.afterIndex,
        request.sectionCode,
        request.baseHash,
      );

    default:
      return { ok: false, problem: 'Unknown action.' };
  }
}

/** The catalogue the agent is given, so it uses the same actions as the interface. */
export function actionCatalogue(): Array<{ name: string; what: string }> {
  return [
    { name: 'listPages', what: "List the site's pages and their files." },
    { name: 'readPageOutline', what: 'Read the headings of one page.' },
    {
      name: 'readPageSections',
      what: 'Read the top-level sections and components of one page.',
    },
    {
      name: 'reorderPageSections',
      what: 'Reorder sections on a page by swapping positions.',
    },
    {
      name: 'deletePageSection',
      what: 'Delete a section from a page by index.',
    },
    {
      name: 'setPageSectionAnchor',
      what: 'Set or update an anchor ID on a page section.',
    },
    {
      name: 'duplicatePageSection',
      what: 'Duplicate an existing section on a page by index.',
    },
    {
      name: 'insertPageSection',
      what: 'Insert markup for a new section on a page after a given section index (-1 for start of page).',
    },
    {
      name: 'editElementText',
      what: 'Change the text of one element, given its file and position.',
    },
    { name: 'editElementAttribute', what: 'Change one setting on an element.' },
    { name: 'editElementStyle', what: 'Change inline styles on one element.' },
    { name: 'editCssRule', what: 'Set one declaration inside a CSS rule.' },
    { name: 'createPage', what: 'Create a new page in the site.' },
    {
      name: 'readSource',
      what: 'Read the exact text and hash of one .astro page, layout or component, or one .css file under src/styles. A file that does not exist returns a null hash, ready for creation.',
    },
    {
      name: 'writeSource',
      what: 'Replace a whole allowed source file. baseHash must be the exact hash readSource returned; pass null only to create a file that does not exist. A stale hash is refused and no file is overwritten.',
    },
  ];
}
