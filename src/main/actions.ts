import path from 'node:path';
import fs from 'node:fs';
import {
  applyEdit,
  findTag,
  findClosingTag,
  decodeEntities,
  escapeText,
  type EditOperation,
} from './edit';
import { hashOf, isInside, readFile, writeFileAtomic } from './files';

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
  | { action: 'createPage'; page: string; title: string };

export type ActionOk = { ok: true; [key: string]: unknown };
export type ActionProblem = {
  ok: false;
  problem: string;
  clash?: { file: string; diskText?: string };
};
export type ActionResult = ActionOk | ActionProblem;

const TEXT_FILES = /\.(astro|md|mdx|html|css|ts|tsx|js)$/;

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
  ].map((match) => ({
    level: Number(match[1].slice(1)),
    text: match[3]
      .replace(/<[^>]+>/g, '')
      .trim()
      .slice(0, 120),
  }));
  return {
    ok: true,
    page,
    file: path.relative(root, file),
    headings,
    hash: hashOf(text),
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
      name: 'editElementText',
      what: 'Change the text of one element, given its file and position.',
    },
    { name: 'editElementAttribute', what: 'Change one setting on an element.' },
    { name: 'editElementStyle', what: 'Change inline styles on one element.' },
    { name: 'editCssRule', what: 'Set one declaration inside a CSS rule.' },
    { name: 'createPage', what: 'Create a new page in the site.' },
  ];
}

export { TEXT_FILES };
