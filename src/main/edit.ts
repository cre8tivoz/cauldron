import { hashOf, readFile, writeFileAtomic } from './files';

export type Location = {
  file: string;
  line: number;
  column: number;
  name: string;
};

export type Attribute = {
  name: string;
  value: string | null;
  quote: string;
  valueStart: number;
  valueEnd: number;
  start: number;
  end: number;
};

export type Tag = {
  name: string;
  start: number;
  tagEnd: number;
  selfClosing: boolean;
  attributes: Attribute[];
};

/** Elements with no closing tag, so nesting arithmetic ignores them. */
const VOID_ELEMENTS = new Set([
  'area',
  'base',
  'br',
  'col',
  'embed',
  'hr',
  'img',
  'input',
  'link',
  'meta',
  'param',
  'source',
  'track',
  'wbr',
]);

const TAG_START = /<([a-zA-Z][\w:-]*)/g;

export function parseTag(text: string, start: number): Tag | null {
  const match = TAG_START.exec(text.slice(start, start + 80));
  TAG_START.lastIndex = 0;
  if (!match || start + match.index !== start) return null;

  const name = match[1];
  const attributes: Attribute[] = [];
  let index = start + match[0].length;
  let selfClosing = false;

  while (index < text.length) {
    while (index < text.length && /\s/.test(text[index])) index += 1;
    if (index >= text.length) return null;
    if (text[index] === '>') {
      index += 1;
      break;
    }
    if (text[index] === '/' && text[index + 1] === '>') {
      selfClosing = true;
      index += 2;
      break;
    }

    const attributeStart = index;
    if (text[index] === '{') {
      // A spread or expression: keep it as one opaque attribute.
      let depth = 0;
      while (index < text.length) {
        if (text[index] === '{') depth += 1;
        if (text[index] === '}') {
          depth -= 1;
          if (depth === 0) {
            index += 1;
            break;
          }
        }
        index += 1;
      }
      attributes.push({
        name: text.slice(attributeStart, index),
        value: null,
        quote: '',
        valueStart: index,
        valueEnd: index,
        start: attributeStart,
        end: index,
      });
      continue;
    }

    while (index < text.length && !/[\s=/>]/.test(text[index])) index += 1;
    const name_ = text.slice(attributeStart, index);
    if (!name_) {
      index += 1;
      continue;
    }

    let cursor = index;
    while (cursor < text.length && /\s/.test(text[cursor])) cursor += 1;
    if (text[cursor] !== '=') {
      attributes.push({
        name: name_,
        value: null,
        quote: '',
        valueStart: index,
        valueEnd: index,
        start: attributeStart,
        end: index,
      });
      continue;
    }

    cursor += 1;
    while (cursor < text.length && /\s/.test(text[cursor])) cursor += 1;
    const quote =
      text[cursor] === '"' || text[cursor] === "'" ? text[cursor] : '';
    if (quote) {
      const valueStart = cursor + 1;
      let valueEnd = valueStart;
      while (valueEnd < text.length && text[valueEnd] !== quote) valueEnd += 1;
      attributes.push({
        name: name_,
        value: text.slice(valueStart, valueEnd),
        quote,
        valueStart,
        valueEnd,
        start: attributeStart,
        end: valueEnd + 1,
      });
      index = valueEnd + 1;
    } else {
      const valueStart = cursor;
      let valueEnd = cursor;
      while (valueEnd < text.length && !/[\s>]/.test(text[valueEnd]))
        valueEnd += 1;
      attributes.push({
        name: name_,
        value: text.slice(valueStart, valueEnd),
        quote: '',
        valueStart,
        valueEnd,
        start: attributeStart,
        end: valueEnd,
      });
      index = valueEnd;
    }
  }

  return { name, start, tagEnd: index, selfClosing, attributes };
}

function lineStart(text: string, line: number): number {
  let offset = 0;
  for (let current = 1; current < line; current += 1) {
    const next = text.indexOf('\n', offset);
    if (next === -1) return text.length;
    offset = next + 1;
  }
  return offset;
}

/**
 * The rendered page says which file an element came from and where it sits in that file.
 * Astro's column points at the end of the opening tag, so we search back for the tag and
 * confirm its name before trusting it.
 */
export function findTag(text: string, location: Location): Tag | null {
  const start = lineStart(text, location.line);
  const offset = Math.min(
    start + Math.max(0, location.column - 1),
    text.length,
  );
  const pattern = new RegExp(`<${location.name}(?=[\\s/>])`, 'gi');

  let best: number | null = null;
  const windowStart = Math.max(0, offset - 600);
  const windowText = text.slice(
    windowStart,
    Math.min(text.length, offset + 40),
  );
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(windowText)) !== null) {
    const absolute = windowStart + match.index;
    if (absolute <= offset + 1) best = absolute;
  }
  if (best === null) {
    // Fall back to the start of the reported line.
    const lineText = text.slice(
      start,
      text.indexOf('\n', start) === -1
        ? text.length
        : text.indexOf('\n', start),
    );
    const local = new RegExp(`<${location.name}(?=[\\s/>])`, 'i').exec(
      lineText,
    );
    if (!local) return null;
    best = start + local.index;
  }

  const tag = parseTag(text, best);
  if (!tag || tag.name.toLowerCase() !== location.name.toLowerCase())
    return null;
  return tag;
}

export function findClosingTag(
  text: string,
  tag: Tag,
): { start: number; end: number } | null {
  if (tag.selfClosing || VOID_ELEMENTS.has(tag.name.toLowerCase())) return null;

  const open = new RegExp(`<(/?)${tag.name}(?=[\\s/>])`, 'gi');
  open.lastIndex = tag.tagEnd;
  let depth = 1;
  let match: RegExpExecArray | null;
  while ((match = open.exec(text)) !== null) {
    if (match[1] === '/') {
      depth -= 1;
      if (depth === 0) {
        const end = text.indexOf('>', match.index);
        return { start: match.index, end: end === -1 ? text.length : end + 1 };
      }
    } else {
      const nested = parseTag(text, match.index);
      if (
        nested &&
        !nested.selfClosing &&
        !VOID_ELEMENTS.has(nested.name.toLowerCase())
      ) {
        depth += 1;
      }
    }
  }
  return null;
}

export type ElementSnapshot = {
  text: string;
  textEditable: boolean;
  style: Record<string, string>;
  attributes: Array<{ name: string; value: string }>;
};

const NAMED_ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: '\u00a0',
  mdash: '\u2014',
  ndash: '\u2013',
  hellip: '\u2026',
  rsquo: '\u2019',
  lsquo: '\u2018',
};

export function decodeEntities(value: string): string {
  return value.replace(
    /&(#x?[0-9a-fA-F]+|[a-zA-Z]+);/g,
    (whole, body: string) => {
      if (body.startsWith('#x') || body.startsWith('#X')) {
        const code = Number.parseInt(body.slice(2), 16);
        return Number.isFinite(code) ? String.fromCodePoint(code) : whole;
      }
      if (body.startsWith('#')) {
        const code = Number.parseInt(body.slice(1), 10);
        return Number.isFinite(code) ? String.fromCodePoint(code) : whole;
      }
      return NAMED_ENTITIES[body.toLowerCase()] ?? whole;
    },
  );
}

export function escapeText(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export function parseStyle(style: string): Record<string, string> {
  const result: Record<string, string> = {};
  for (const part of style.split(';')) {
    const index = part.indexOf(':');
    if (index === -1) continue;
    const name = part.slice(0, index).trim();
    const value = part.slice(index + 1).trim();
    if (name && value) result[name] = value;
  }
  return result;
}

export function serialiseStyle(properties: Record<string, string>): string {
  return Object.entries(properties)
    .filter(([, value]) => value.trim() !== '')
    .map(([name, value]) => `${name}: ${value}`)
    .join('; ');
}

/** What the inspector shows, and what later edits are checked against. */
export function snapshotElement(
  text: string,
  location: Location,
): ElementSnapshot | null {
  const tag = findTag(text, location);
  if (!tag) return null;
  const close = findClosingTag(text, tag);
  const inner = close ? text.slice(tag.tagEnd, close.start) : '';
  const hasChildElements = /<[a-zA-Z]/.test(inner);
  const trimmed = inner.trim();
  const styleAttribute = tag.attributes.find(
    (attribute) => attribute.name === 'style',
  );

  return {
    text: hasChildElements ? '' : decodeEntities(trimmed),
    textEditable: Boolean(close) && !hasChildElements,
    style: parseStyle(styleAttribute?.value ?? ''),
    attributes: tag.attributes
      .filter(
        (attribute) =>
          !attribute.name.startsWith('data-astro-') &&
          !attribute.name.startsWith('{'),
      )
      .filter((attribute) => attribute.value !== null)
      .map((attribute) => ({
        name: attribute.name,
        value: attribute.value ?? '',
      })),
  };
}

export type EditOperation =
  | { kind: 'text'; value: string }
  | { kind: 'attribute'; name: string; value: string | null }
  | { kind: 'style'; properties: Record<string, string> };

export type EditResult =
  | { ok: true; text: string; hash: string; snapshot: ElementSnapshot }
  | { ok: false; reason: string; conflict?: { diskText: string } };

/**
 * Changes exactly one thing in the file and leaves every other byte alone.
 * If the same thing was changed on disk since the edit was started, it refuses
 * and hands back the disk version rather than overwriting it.
 */
export function applyEdit(
  diskText: string,
  location: Location,
  operation: EditOperation,
  expected: { text?: string; attributes?: Record<string, string> },
): EditResult {
  const tag = findTag(diskText, location);
  if (!tag) {
    return {
      ok: false,
      reason: 'The element could not be found in the file any more.',
    };
  }

  const close = findClosingTag(diskText, tag);
  const styleAttribute = tag.attributes.find(
    (attribute) => attribute.name === 'style',
  );

  if (operation.kind === 'text') {
    if (!close)
      return { ok: false, reason: 'This element has no closing tag to edit.' };
    const innerStart = tag.tagEnd;
    const inner = diskText.slice(innerStart, close.start);
    if (/<[a-zA-Z]/.test(inner)) {
      return {
        ok: false,
        reason:
          'This element holds other elements. Select the text itself, not the box around it.',
      };
    }
    const currentText = decodeEntities(inner.trim());
    if (expected.text !== undefined && currentText !== expected.text.trim()) {
      return {
        ok: false,
        reason: 'This text was changed on disk since you started editing it.',
        conflict: { diskText },
      };
    }
    const leading = inner.slice(0, inner.indexOf(inner.trim()));
    const trailing = inner.slice(inner.trim().length + leading.length);
    const next =
      diskText.slice(0, innerStart) +
      leading +
      escapeText(operation.value) +
      trailing +
      diskText.slice(close.start);
    return finish(diskText, next, location, operation);
  }

  if (operation.kind === 'attribute') {
    const existing = tag.attributes.find(
      (attribute) => attribute.name === operation.name,
    );
    if (expected.attributes && operation.name in expected.attributes) {
      const wanted = expected.attributes[operation.name];
      if ((existing?.value ?? '') !== wanted) {
        return {
          ok: false,
          reason: `The ${operation.name} setting was changed on disk since you started editing.`,
          conflict: { diskText },
        };
      }
    }

    if (operation.value === null) {
      if (!existing)
        return { ok: false, reason: 'That setting is not on this element.' };
      const next =
        diskText.slice(0, existing.start) + diskText.slice(existing.end);
      return finish(diskText, collapseSpaces(next), location, operation);
    }

    if (existing) {
      const quote = existing.quote || '"';
      const next =
        diskText.slice(0, existing.start) +
        `${operation.name}=${quote}${operation.value}${quote}` +
        diskText.slice(existing.end);
      return finish(diskText, next, location, operation);
    }

    const insertAt = tag.selfClosing ? tag.tagEnd - 2 : tag.tagEnd - 1;
    const next =
      diskText.slice(0, insertAt) +
      ` ${operation.name}="${operation.value}"` +
      diskText.slice(insertAt);
    return finish(diskText, next, location, operation);
  }

  // Style: kept on the element itself, so it lands in the real file.
  const wanted = { ...parseStyle(styleAttribute?.value ?? '') };
  for (const [name, value] of Object.entries(operation.properties)) {
    if (value.trim() === '') delete wanted[name];
    else wanted[name] = value.trim();
  }
  const serialised = serialiseStyle(wanted);

  if (expected.attributes && 'style' in expected.attributes) {
    if ((styleAttribute?.value ?? '') !== expected.attributes.style) {
      return {
        ok: false,
        reason:
          'The styles on this element were changed on disk since you started editing.',
        conflict: { diskText },
      };
    }
  }

  if (styleAttribute) {
    const quote = styleAttribute.quote || '"';
    const replacement =
      serialised === '' ? '' : `style=${quote}${serialised}${quote}`;
    const start =
      serialised === '' ? styleAttribute.start - 1 : styleAttribute.start;
    const next =
      diskText.slice(0, start) +
      replacement +
      diskText.slice(styleAttribute.end);
    return finish(collapseSpaces(next), next, location, operation);
  }

  if (serialised === '') {
    return {
      ok: false,
      reason: 'There are no styles on this element to remove.',
    };
  }
  const insertAt = tag.selfClosing ? tag.tagEnd - 2 : tag.tagEnd - 1;
  const next =
    diskText.slice(0, insertAt) +
    ` style="${serialised}"` +
    diskText.slice(insertAt);
  return finish(diskText, next, location, operation);
}

function collapseSpaces(text: string): string {
  return text.replace(/[ \t]{2,}(?=[^\S\n]*>)/g, ' ');
}

function finish(
  diskText: string,
  next: string,
  location: Location,
  _operation: EditOperation,
): EditResult {
  const snapshot = snapshotElement(next, location);
  if (!snapshot) {
    return {
      ok: false,
      reason: 'The change would have broken the element, so it was not saved.',
    };
  }
  const changed = differsOnlyOnce(diskText, next);
  if (!changed) {
    return {
      ok: false,
      reason:
        'The change would have altered more of the file than the element, so it was not saved.',
    };
  }
  return { ok: true, text: next, hash: hashOf(next), snapshot };
}

/**
 * A single edit touches one region: everything before it and everything after it is identical.
 * This is what keeps unknown code, comments and formatting exactly as written (plan item 1.5).
 */
function differsOnlyOnce(before: string, after: string): boolean {
  let start = 0;
  while (
    start < before.length &&
    start < after.length &&
    before[start] === after[start]
  ) {
    start += 1;
  }
  let endBefore = before.length - 1;
  let endAfter = after.length - 1;
  while (
    endBefore >= start &&
    endAfter >= start &&
    before[endBefore] === after[endAfter]
  ) {
    endBefore -= 1;
    endAfter -= 1;
  }
  return endBefore >= start - 1 && endAfter >= start - 1;
}

export { readFile, writeFileAtomic };
