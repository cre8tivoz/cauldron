import path from 'node:path';
import fs from 'node:fs';
import { ensureTokensImport, inlineLibraryPiece } from './library';
import { toolsFor } from './mcp';
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
      baseHash: string;
    }
  | {
      action: 'deletePageSection';
      page: string;
      sectionIndex: number;
      baseHash: string;
    }
  | {
      action: 'setPageSectionAnchor';
      page: string;
      sectionIndex: number;
      anchorId: string;
      baseHash: string;
    }
  | {
      action: 'duplicatePageSection';
      page: string;
      sectionIndex: number;
      baseHash: string;
    }
  | {
      action: 'insertPageSection';
      page: string;
      afterIndex: number;
      sectionCode?: string;
      pieceId?: string;
      baseHash: string;
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

export function resolvePageFile(root: string, page: string): string | null {
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

/** Validates and resolves the target path for a newly created page. */
export function resolveNewPageTarget(
  root: string,
  page: string,
): { ok: true; clean: string; file: string } | { ok: false; problem: string } {
  const clean = page
    .trim()
    .replace(/^\/+|\/+$/g, '')
    .replace(/\.astro$/, '');
  const segments = clean.split('/');
  if (
    !clean ||
    !segments.every((segment) => /^[a-z0-9][a-z0-9-]*$/.test(segment))
  ) {
    return {
      ok: false,
      problem: 'Page addresses use lowercase letters, numbers and dashes.',
    };
  }
  const file = path.join(root, 'src/pages', `${clean}.astro`);
  if (!isInside(root, file)) {
    return { ok: false, problem: 'That page would sit outside the site.' };
  }
  return { ok: true, clean, file };
}

/** Creates a new Astro page atomically without ever overwriting an existing file. */
export function createPageFile(
  root: string,
  page: string,
  rawTitle: string,
): ActionResult & { clean?: string } {
  const target = resolveNewPageTarget(root, page);
  if (!target.ok) return target;
  if (fs.existsSync(target.file)) {
    return { ok: false, problem: 'A page already exists at that address.' };
  }
  fs.mkdirSync(path.dirname(target.file), { recursive: true });
  if (!isInside(root, target.file)) {
    return { ok: false, problem: 'That page would sit outside the site.' };
  }
  const title = escapeText(rawTitle.trim() || target.clean);
  const body = `---\n---\n<!doctype html>\n<html lang="en-AU">\n  <head>\n    <meta charset="utf-8" />\n    <meta name="viewport" content="width=device-width, initial-scale=1" />\n    <title>${title}</title>\n  </head>\n  <body>\n    <h1>${title}</h1>\n  </body>\n</html>\n`;
  try {
    createFileAtomic(target.file, body);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'EEXIST') {
      return { ok: false, problem: 'A page already exists at that address.' };
    }
    throw error;
  }
  return {
    ok: true,
    file: path.relative(root, target.file),
    clean: target.clean,
  };
}

function requirePageForEdit(
  root: string,
  page: string,
  baseHash: string | undefined,
):
  | { ok: true; file: string; disk: { text: string; hash: string } }
  | { ok: false; problem: string } {
  const file = resolvePageFile(root, page);
  if (!file) return { ok: false, problem: `No page file for ${page}.` };
  if (!baseHash) {
    return {
      ok: false,
      problem:
        'A baseHash is required before editing this page. Read the page first.',
    };
  }
  const disk = readFile(file);
  if (disk.hash !== baseHash) {
    return {
      ok: false,
      problem:
        'That file changed since this action was prepared. Read it again before editing.',
    };
  }
  return { ok: true, file, disk };
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
  baseHash: string,
): ActionResult & { sections?: PageSection[]; hash?: string } {
  const checked = requirePageForEdit(root, page, baseHash);
  if (!checked.ok) return checked;
  const { file, disk } = checked;

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
  baseHash: string,
): ActionResult & { sections?: PageSection[]; hash?: string } {
  const checked = requirePageForEdit(root, page, baseHash);
  if (!checked.ok) return checked;
  const { file, disk } = checked;

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
  baseHash: string,
): ActionResult & { sections?: PageSection[]; hash?: string } {
  const checked = requirePageForEdit(root, page, baseHash);
  if (!checked.ok) return checked;
  const { file, disk } = checked;

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
  baseHash: string,
): ActionResult & { sections?: PageSection[]; hash?: string } {
  const checked = requirePageForEdit(root, page, baseHash);
  if (!checked.ok) return checked;
  const { file, disk } = checked;

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
  sectionInput: string | { sectionCode?: string; pieceId?: string },
  baseHash: string,
): ActionResult & { sections?: PageSection[]; hash?: string } {
  const checked = requirePageForEdit(root, page, baseHash);
  if (!checked.ok) return checked;
  const { file, disk } = checked;

  const pieceId =
    typeof sectionInput === 'object' && sectionInput !== null
      ? sectionInput.pieceId
      : undefined;
  const rawCode =
    typeof sectionInput === 'string'
      ? sectionInput
      : (sectionInput?.sectionCode ?? '');

  let code = rawCode.trim();
  let pieceStyle: { styleCss: string; markerClass: string } | null = null;
  if (pieceId) {
    const piece = inlineLibraryPiece(pieceId);
    if (!piece) {
      return { ok: false, problem: 'That piece is not in the starter set.' };
    }
    code = piece.sectionHtml;
    pieceStyle = { styleCss: piece.styleCss, markerClass: piece.markerClass };
  }
  if (!code) {
    return { ok: false, problem: 'Provide section markup or a library piece.' };
  }

  const text = disk.text;
  const alreadyStyled = pieceStyle
    ? new RegExp(`\\.${pieceStyle.markerClass}\\b`).test(text)
    : false;
  const blocks = findSectionBlocks(text);

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

  if (pieceStyle) {
    newText = ensureTokensImport(root, file, newText);
    if (!alreadyStyled && pieceStyle.styleCss) {
      newText = `${newText.replace(/\s*$/, '')}\n\n<style>\n${pieceStyle.styleCss}\n</style>\n`;
    }
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

function skipCssStringOrComment(source: string, i: number): number {
  const ch = source[i];
  if (ch === '/' && source[i + 1] === '*') {
    const close = source.indexOf('*/', i + 2);
    return close === -1 ? source.length : close + 2;
  }
  if (ch === '"' || ch === "'") {
    let j = i + 1;
    while (j < source.length) {
      if (source[j] === '\\') {
        j += 2;
        continue;
      }
      if (source[j] === ch) return j + 1;
      j += 1;
    }
    return source.length;
  }
  return -1;
}

function stripCssComments(text: string): string {
  let out = '';
  for (let i = 0; i < text.length;) {
    if (text[i] === '/' && text[i + 1] === '*') {
      const close = text.indexOf('*/', i + 2);
      i = close === -1 ? text.length : close + 2;
      continue;
    }
    if (text[i] === '"' || text[i] === "'") {
      const end = skipCssStringOrComment(text, i);
      out += text.slice(i, end);
      i = end;
      continue;
    }
    out += text[i++];
  }
  return out;
}

function normalizeCssSelector(selector: string): string {
  return stripCssComments(selector)
    .replace(/\s+/g, ' ')
    .replace(/\s*,\s*/g, ', ')
    .trim();
}

function findMatchingCssRule(
  text: string,
  regionStart: number,
  regionEnd: number,
  normalizedTarget: string,
): { bodyStart: number; bodyEnd: number } | null {
  const stack: Array<{
    selectorNorm: string;
    bodyStart: number;
    ignoreChildren: boolean;
  }> = [];
  let stmtStart = regionStart;
  let parenDepth = 0;

  for (let i = regionStart; i < regionEnd;) {
    const skipped = skipCssStringOrComment(text, i);
    if (skipped !== -1) {
      i = Math.min(skipped, regionEnd);
      continue;
    }
    const ch = text[i];
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
      const preludeRaw = text.slice(stmtStart, i);
      const selectorNorm = normalizeCssSelector(preludeRaw);
      const isKeyframes = /^@(?:-[a-z-]+-)?keyframes\b/i.test(selectorNorm);
      stack.push({
        selectorNorm,
        bodyStart: i + 1,
        ignoreChildren: Boolean(parent?.ignoreChildren) || isKeyframes,
      });
      stmtStart = i + 1;
      i += 1;
      continue;
    }
    if (ch === '}') {
      const frame = stack.pop();
      if (
        frame &&
        !frame.ignoreChildren &&
        !frame.selectorNorm.startsWith('@') &&
        frame.selectorNorm === normalizedTarget
      ) {
        return { bodyStart: frame.bodyStart, bodyEnd: i };
      }
      stmtStart = i + 1;
      i += 1;
      continue;
    }
    i += 1;
  }
  return null;
}

function updateRuleBodyDeclaration(
  body: string,
  property: string,
  value: string,
): string {
  const declaration = `${property}: ${value};`;
  const isCustomProp = property.startsWith('--');
  const targetPropLower = property.toLowerCase();

  type MatchSpan = {
    propStart: number;
    end: number;
    stmtStart: number;
  };
  const matches: MatchSpan[] = [];
  let lastNonWsOutsideNest = -1;
  let stmtStart = 0;
  let parenDepth = 0;
  let braceDepth = 0;

  const inspectStatement = (
    start: number,
    end: number,
    hasSemicolon: boolean,
  ) => {
    const raw = body.slice(start, end);
    let idx = 0;
    while (idx < raw.length) {
      if (/\s/.test(raw[idx])) {
        idx += 1;
        continue;
      }
      if (raw[idx] === '/' && raw[idx + 1] === '*') {
        const close = raw.indexOf('*/', idx + 2);
        idx = close === -1 ? raw.length : close + 2;
        continue;
      }
      break;
    }
    const propRelStart = idx;
    let colonRel = -1;
    let localParen = 0;
    for (let k = idx; k < raw.length; k++) {
      const sk = skipCssStringOrComment(raw, k);
      if (sk !== -1) {
        k = sk - 1;
        continue;
      }
      const c = raw[k];
      if (c === '(' || c === '[') localParen += 1;
      else if ((c === ')' || c === ']') && localParen > 0) localParen -= 1;
      else if (c === '{' || c === '}') return;
      else if (c === ':' && localParen === 0) {
        colonRel = k;
        break;
      }
    }
    if (colonRel === -1) return;
    const propName = stripCssComments(raw.slice(propRelStart, colonRel)).trim();
    const matchesProperty = isCustomProp
      ? propName === property
      : propName.toLowerCase() === targetPropLower;
    if (!matchesProperty) return;
    const stmtEnd = hasSemicolon
      ? end + 1
      : start + raw.replace(/\s+$/, '').length;
    matches.push({
      propStart: start + propRelStart,
      end: stmtEnd,
      stmtStart: start,
    });
  };

  for (let i = 0; i < body.length;) {
    const skipped = skipCssStringOrComment(body, i);
    if (skipped !== -1) {
      if (braceDepth === 0 && (body[i] === '"' || body[i] === "'")) {
        lastNonWsOutsideNest = skipped - 1;
      }
      i = skipped;
      continue;
    }
    const ch = body[i];
    if (ch === '{') {
      braceDepth += 1;
      i += 1;
      continue;
    }
    if (ch === '}') {
      if (braceDepth > 0) braceDepth -= 1;
      if (braceDepth === 0) stmtStart = i + 1;
      i += 1;
      continue;
    }
    if (braceDepth > 0) {
      i += 1;
      continue;
    }
    if (!/\s/.test(ch)) lastNonWsOutsideNest = i;
    if (ch === '(' || ch === '[') parenDepth += 1;
    else if ((ch === ')' || ch === ']') && parenDepth > 0) parenDepth -= 1;
    else if (ch === ';' && parenDepth === 0) {
      inspectStatement(stmtStart, i, true);
      stmtStart = i + 1;
    }
    i += 1;
  }
  if (braceDepth === 0 && stmtStart < body.length) {
    inspectStatement(stmtStart, body.length, false);
  }

  if (matches.length > 0) {
    // Replace the first declaration and drop any pre-existing duplicate lines.
    const edits = matches
      .map((m, idx) =>
        idx === 0
          ? { start: m.propStart, end: m.end, text: declaration }
          : { start: m.stmtStart, end: m.end, text: '' },
      )
      .sort((a, b) => b.start - a.start);
    let next = body;
    for (const edit of edits) {
      next = next.slice(0, edit.start) + edit.text + next.slice(edit.end);
    }
    return next;
  }

  if (lastNonWsOutsideNest >= 0) {
    const tailChar = body[lastNonWsOutsideNest];
    if (tailChar !== ';' && tailChar !== '}') {
      const patched =
        body.slice(0, lastNonWsOutsideNest + 1) +
        ';' +
        body.slice(lastNonWsOutsideNest + 1);
      return `${patched.trimEnd()}\n  ${declaration}\n`;
    }
  }
  return `${body.trimEnd()}\n  ${declaration}\n`;
}

function astroStyleRegions(
  text: string,
): Array<{ start: number; end: number }> {
  const regions: Array<{ start: number; end: number }> = [];
  const pattern = /<style\b[^>]*>([\s\S]*?)<\/style>/gi;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(text))) {
    const innerStart = match.index + match[0].indexOf('>') + 1;
    const innerEnd = innerStart + match[1].length;
    regions.push({ start: innerStart, end: innerEnd });
  }
  return regions;
}

function hasUnquotedCssDelimiter(value: string): boolean {
  for (let i = 0; i < value.length;) {
    const skipped = skipCssStringOrComment(value, i);
    if (skipped !== -1) {
      i = skipped;
      continue;
    }
    const ch = value[i];
    if (ch === '{' || ch === '}' || ch === ';') return true;
    i += 1;
  }
  return false;
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

  const cleanProp = property.trim();
  const cleanValue = value.trim();
  const normalizedTarget = normalizeCssSelector(selector);
  if (!normalizedTarget) {
    return { ok: false, problem: 'Choose a valid CSS selector.' };
  }
  if (!/^(?:--[A-Za-z0-9_-]+|[A-Za-z][A-Za-z0-9-]*)$/.test(cleanProp)) {
    return { ok: false, problem: 'Choose a valid CSS property name.' };
  }
  if (
    !cleanValue ||
    hasUnquotedCssDelimiter(cleanValue) ||
    /<\/style>/i.test(cleanValue)
  ) {
    return {
      ok: false,
      problem:
        'CSS declaration values cannot contain unquoted braces, semicolons, or closing style tags.',
    };
  }

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
  const isAstro = full.toLowerCase().endsWith('.astro');
  const regions = isAstro
    ? astroStyleRegions(text)
    : [{ start: 0, end: text.length }];

  for (const region of regions) {
    const match = findMatchingCssRule(
      text,
      region.start,
      region.end,
      normalizedTarget,
    );
    if (match) {
      const body = text.slice(match.bodyStart, match.bodyEnd);
      const nextBody = updateRuleBodyDeclaration(body, cleanProp, cleanValue);
      const next =
        text.slice(0, match.bodyStart) + nextBody + text.slice(match.bodyEnd);
      writeFileAtomic(full, next);
      return { ok: true, file, hash: hashOf(next) };
    }
  }

  const declaration = `${cleanProp}: ${cleanValue};`;
  const addition = `${normalizedTarget} {\n  ${declaration}\n}\n`;
  let next: string;
  if (isAstro) {
    if (regions.length > 0) {
      const last = regions[regions.length - 1];
      const beforeClose = text.slice(0, last.end).replace(/\s*$/, '');
      const prefix = beforeClose.length > last.start ? '\n' : '\n';
      next = `${beforeClose}${prefix}${addition}${text.slice(last.end)}`;
    } else {
      next = `${text.replace(/\s*$/, '')}\n\n<style>\n${addition}</style>\n`;
    }
  } else {
    const trimmed = text.replace(/\s*$/, '');
    next = trimmed ? `${trimmed}\n\n${addition}` : addition;
  }
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

    case 'createPage':
      return createPageFile(root, request.page, request.title);

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
        { sectionCode: request.sectionCode, pieceId: request.pieceId },
        request.baseHash,
      );

    default:
      return { ok: false, problem: 'Unknown action.' };
  }
}

const READ_ONLY_ACTIONS = new Set<ActionRequest['action']>([
  'listPages',
  'readPageOutline',
  'readPageSections',
  'readSource',
]);

/** Read-only actions never mutate files and must not claim ownership on an active agent run. */
export function isReadOnlyAction(action: ActionRequest['action']): boolean {
  return READ_ONLY_ACTIONS.has(action);
}

/**
 * The catalogue the agent is given, generated from the exact MCP tool
 * definitions served by the local connection.
 */
export function actionCatalogue(
  siteName = 'this site',
): Array<{ name: string; what: string }> {
  return toolsFor(siteName).map((tool) => ({
    name: tool.name,
    what: tool.description,
  }));
}
