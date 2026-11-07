import fs from 'node:fs';
import path from 'node:path';
import { hashOf, isInside, readFile, writeFileAtomic } from './files';

/**
 * Content editing (plan 3.4): forms built from the site's own content definitions,
 * a warning when they are out of date, and plain-text editing as the fallback.
 * Nothing here rewrites a file it did not understand.
 */

export type ContentField = {
  name: string;
  type: 'text' | 'number' | 'boolean' | 'date' | 'list' | 'unknown';
  options?: string[];
  optional: boolean;
};

export type ContentCollection = {
  name: string;
  schemaHash: string;
  fields: ContentField[];
  entries: Array<{ id: string; file: string; hash: string }>;
};

function schemaFiles(root: string): string[] {
  return [
    'src/content.config.ts',
    'src/content/config.ts',
    'src/content.config.js',
  ].map((file) => path.join(root, file));
}

function fieldType(definition: string): ContentField['type'] {
  // A definition may span lines, so `z` and `.string()` can be split apart.
  const compact = definition.replace(/\s+/g, '');
  if (/z\.object\(/.test(compact)) return 'unknown';
  if (/z\.number\(/.test(compact)) return 'number';
  if (/z\.boolean\(/.test(compact)) return 'boolean';
  if (/z\.date\(/.test(compact)) return 'date';
  if (/z\.enum\(/.test(compact)) return 'list';
  if (/z\.array\(/.test(compact)) return 'list';
  if (/z\.string\(/.test(compact)) return 'text';
  return 'unknown';
}

/** The bracket that closes `character`, or null when it opens nothing. */
function closerFor(character: string): string | null {
  if (character === '{') return '}';
  if (character === '[') return ']';
  if (character === '(') return ')';
  return null;
}

/** Index of the bracket closing the one at `open`, or -1 when it never closes. */
function matchingBracket(text: string, open: number): number {
  const expected: string[] = [];
  let quote: string | null = null;
  for (let index = open; index < text.length; index += 1) {
    const character = text[index];
    if (quote) {
      if (character === '\\') index += 1;
      else if (character === quote) quote = null;
      continue;
    }
    if (character === '"' || character === "'" || character === '`') {
      quote = character;
      continue;
    }
    const closer = closerFor(character);
    if (closer) {
      expected.push(closer);
      continue;
    }
    if (expected.length > 0 && character === expected[expected.length - 1]) {
      expected.pop();
      if (expected.length === 0) return index;
    }
  }
  return -1;
}

/** Removes `//` comments that sit outside a string, keeping the line structure. */
function stripComments(text: string): string {
  return text
    .split('\n')
    .map((line) => {
      let quote: string | null = null;
      for (let index = 0; index < line.length; index += 1) {
        const character = line[index];
        if (quote) {
          if (character === '\\') index += 1;
          else if (character === quote) quote = null;
          continue;
        }
        if (character === '"' || character === "'" || character === '`') {
          quote = character;
          continue;
        }
        if (character === '/' && line[index + 1] === '/') {
          return line.slice(0, index);
        }
      }
      return line;
    })
    .join('\n');
}

/** Splits an object body into its own top-level members, so nested keys stay put. */
function splitMembers(body: string): string[] {
  const parts: string[] = [];
  const expected: string[] = [];
  let quote: string | null = null;
  let start = 0;
  for (let index = 0; index < body.length; index += 1) {
    const character = body[index];
    if (quote) {
      if (character === '\\') index += 1;
      else if (character === quote) quote = null;
      continue;
    }
    if (character === '"' || character === "'" || character === '`') {
      quote = character;
      continue;
    }
    const closer = closerFor(character);
    if (closer) {
      expected.push(closer);
      continue;
    }
    if (expected.length > 0 && character === expected[expected.length - 1]) {
      expected.pop();
      continue;
    }
    if (character === ',' && expected.length === 0) {
      parts.push(body.slice(start, index));
      start = index + 1;
    }
  }
  parts.push(body.slice(start));
  return parts;
}

/** Reads the top-level field definitions out of a collection's z.object. */
function parseFields(schemaText: string): ContentField[] {
  const objectStart = schemaText.indexOf('z.object(');
  if (objectStart === -1) return [];
  const openBrace = schemaText.indexOf('{', objectStart);
  if (openBrace === -1) return [];
  const closeBrace = matchingBracket(schemaText, openBrace);
  if (closeBrace === -1) return [];
  const body = stripComments(schemaText.slice(openBrace + 1, closeBrace));

  const fields: ContentField[] = [];
  for (const part of splitMembers(body)) {
    const match = /^\s*([A-Za-z_]\w*)\s*:\s*([\s\S]+)$/.exec(part);
    if (!match) continue;
    const definition = match[2].trim();
    const enumMatch = /z\.enum\(\[([^\]]*)\]\)/.exec(definition);
    const options = enumMatch
      ? [...enumMatch[1].matchAll(/['"`]([^'"`]+)['"`]/g)].map(
          (item) => item[1],
        )
      : undefined;
    fields.push({
      name: match[1],
      type: fieldType(definition),
      options,
      optional: /\.optional\(\)/.test(definition),
    });
  }
  return fields;
}

function frontmatterFields(file: string): ContentField[] {
  const text = fs.readFileSync(file, 'utf8');
  const match = /^---\n([\s\S]*?)\n---/.exec(text);
  if (!match) return [];
  const lines = match[1].split('\n');
  const fields: ContentField[] = [];
  for (let index = 0; index < lines.length; index += 1) {
    const item = /^([A-Za-z_]\w*)\s*:\s*(.*)$/.exec(lines[index]);
    if (!item) continue;
    const raw = item[2].trim();
    const next = lines[index + 1] ?? '';
    // A value that continues onto indented or `- item` lines holds a structure
    // this form cannot rewrite, so it stays available as plain text only.
    const continues = /^(?:\s+\S|-\s)/.test(next);
    const type: ContentField['type'] = /^[[{>|]/.test(raw)
      ? 'unknown'
      : raw === '' && continues
        ? 'unknown'
        : /^[-\d.]+$/.test(raw)
          ? 'number'
          : 'text';
    fields.push({ name: item[1], type, optional: raw === '' });
  }
  return fields;
}

const CONTENT_FILE = /\.(md|mdx|json|yaml|yml)$/;

/** That collection's own `defineCollection(...)` call, or '' when it has none. */
function collectionBlock(schemaText: string, name: string): string {
  const start = schemaText.indexOf(`const ${name} = defineCollection`);
  if (start === -1) return '';
  const call = schemaText.indexOf('defineCollection', start);
  if (call === -1) return '';
  const open = schemaText.indexOf('(', call);
  if (open === -1) return '';
  const close = matchingBracket(schemaText, open);
  return close === -1 ? '' : schemaText.slice(start, close + 1);
}

export function readCollections(root: string): ContentCollection[] {
  const schemaPath = schemaFiles(root).find((file) => fs.existsSync(file));
  const schemaText = schemaPath ? fs.readFileSync(schemaPath, 'utf8') : '';
  const contentDir = path.join(root, 'src/content');
  if (!fs.existsSync(contentDir)) return [];

  const names = fs
    .readdirSync(contentDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name);

  return names.map((name) => {
    const folder = path.join(contentDir, name);
    const entries: Array<{ id: string; file: string; hash: string }> = [];
    const walk = (dir: string) => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          walk(full);
          continue;
        }
        if (!CONTENT_FILE.test(entry.name)) continue;
        const relative = path.relative(root, full);
        entries.push({
          id: path.relative(folder, full).replace(CONTENT_FILE, ''),
          file: relative,
          hash: hashOf(fs.readFileSync(full, 'utf8')),
        });
      }
    };
    walk(folder);
    entries.sort((a, b) => a.id.localeCompare(b.id));

    const block = collectionBlock(schemaText, name);

    const definitions = parseFields(block);
    const sample = entries[0];
    const fields =
      definitions.length > 0
        ? definitions
        : sample
          ? frontmatterFields(path.join(root, sample.file))
          : [];

    return {
      name,
      schemaHash: schemaPath ? hashOf(fs.readFileSync(schemaPath, 'utf8')) : '',
      fields,
      entries,
    };
  });
}

export type ContentEntry = {
  file: string;
  hash: string;
  values: Record<string, string>;
  text: string;
  frontmatter: boolean;
  schemaHash: string;
};

function parseFrontmatter(text: string): Record<string, string> {
  const match = /^---\n([\s\S]*?)\n---/.exec(text);
  const values: Record<string, string> = {};
  if (!match) return values;
  for (const line of match[1].split('\n')) {
    const item = /^([A-Za-z_][\w]*)\s*:\s*(.*)$/.exec(line);
    if (!item) continue;
    const raw = item[2].trim();
    if (raw.startsWith('"')) {
      try {
        values[item[1]] = JSON.parse(raw) as string;
      } catch {
        values[item[1]] = raw;
      }
    } else if (raw.startsWith("'") && raw.endsWith("'")) {
      values[item[1]] = raw.slice(1, -1).replace(/''/g, "'");
    } else values[item[1]] = raw;
  }
  return values;
}

export function readEntry(
  root: string,
  file: string,
): ContentEntry | { problem: string } {
  const full = path.join(root, file);
  if (!isInside(root, full))
    return { problem: 'That file is outside the site.' };
  if (!fs.existsSync(full)) return { problem: 'That entry does not exist.' };
  const disk = readFile(full);
  const frontmatter = disk.text.startsWith('---\n');
  return {
    file,
    hash: disk.hash,
    values: frontmatter ? parseFrontmatter(disk.text) : {},
    text: disk.text,
    frontmatter,
    schemaHash: schemaFiles(root)
      .filter((file) => fs.existsSync(file))
      .map((file) => hashOf(fs.readFileSync(file, 'utf8')))
      .join(':'),
  };
}

/** Saves one field, or the whole file when using the plain-text fallback. */
export function saveEntry(
  root: string,
  file: string,
  baseHash: string,
  change: {
    field?: string;
    value?: string;
    text?: string;
    schemaHash?: string;
  },
): { ok: boolean; problem?: string; hash?: string; conflict?: boolean } {
  const full = path.join(root, file);
  if (!isInside(root, full))
    return { ok: false, problem: 'That file is outside the site.' };
  const disk = readFile(full);
  if (disk.hash !== baseHash) {
    // Both versions are kept: the person chooses keep mine or use the disk version (plan 1.4).
    return {
      ok: false,
      conflict: true,
      problem:
        'That entry changed since the form was opened. Nothing was overwritten.',
    };
  }

  if (change.text !== undefined) {
    writeFileAtomic(full, change.text);
    return { ok: true, hash: hashOf(change.text) };
  }

  const field = change.field ?? '';
  if (!/^[A-Za-z_][\w]*$/.test(field))
    return { ok: false, problem: 'Unknown field. Use plain-text editing.' };
  const schemaHash = schemaFiles(root)
    .filter((file) => fs.existsSync(file))
    .map((file) => hashOf(fs.readFileSync(file, 'utf8')))
    .join(':');
  if (change.schemaHash !== schemaHash)
    return {
      ok: false,
      problem: 'The content definition changed. Reload the form before saving.',
    };
  const definition = readCollections(root)
    .find((collection) =>
      collection.entries.some((entry) => entry.file === file),
    )
    ?.fields.find((item) => item.name === field);
  let value = JSON.stringify(change.value ?? '');
  if (definition?.type === 'number') {
    if (!/^-?\d+(\.\d+)?$/.test(change.value ?? ''))
      return { ok: false, problem: 'Enter a valid number.' };
    value = change.value!;
  } else if (definition?.type === 'boolean') {
    if (!/^(true|false)$/.test(change.value ?? ''))
      return { ok: false, problem: 'Enter true or false.' };
    value = change.value!;
  } else if (
    definition?.type === 'unknown' ||
    (definition?.type === 'list' && !definition.options)
  ) {
    return {
      ok: false,
      problem: 'This field needs plain-text editing to preserve its structure.',
    };
  } else if (
    definition?.options &&
    !definition.options.includes(change.value ?? '')
  ) {
    return { ok: false, problem: 'Choose one of the defined options.' };
  }
  const match = /^---\n([\s\S]*?)\n---/.exec(disk.text);
  if (!match)
    return { ok: false, problem: 'This entry has no frontmatter to edit.' };

  const body = match[1];
  const lines = body.split('\n');
  const keyLine = new RegExp(`^${field}\\s*:`);
  const defined = lines
    .map((line, index) => (keyLine.test(line) ? index : -1))
    .filter((index) => index !== -1);
  if (defined.length > 1)
    return {
      ok: false,
      problem: `"${field}" is set more than once in this file. Use plain-text editing.`,
    };
  if (defined.length === 1) {
    const at = defined[0];
    const inline = lines[at].replace(keyLine, '').trim();
    let continues = false;
    for (let next = at + 1; next < lines.length; next += 1) {
      if (!/^(?:\s+\S|-\s)/.test(lines[next])) break;
      continues = true;
    }
    if (continues || /^[[{>|]/.test(inline))
      return {
        ok: false,
        problem: `"${field}" holds more than one line. Use plain-text editing to keep its structure.`,
      };
    lines[at] = `${field}: ${value}`;
  } else {
    lines.push(`${field}: ${value}`);
  }
  const nextBody = lines.join('\n');
  // The frontmatter match starts the file; splice by position so `$` sequences
  // in a saved value are never read as replacement patterns.
  const next = `---\n${nextBody}\n---${disk.text.slice(match[0].length)}`;
  writeFileAtomic(full, next);
  return { ok: true, hash: hashOf(next) };
}
