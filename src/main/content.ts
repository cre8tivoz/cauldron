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
  if (/z\.number\(/.test(definition)) return 'number';
  if (/z\.boolean\(/.test(definition)) return 'boolean';
  if (/z\.date\(/.test(definition)) return 'date';
  if (/z\.enum\(/.test(definition)) return 'list';
  if (/z\.array\(/.test(definition)) return 'list';
  if (/z\.string\(/.test(definition)) return 'text';
  return 'unknown';
}

/** Reads the field definitions out of a collection's z.object, keeping its order. */
function parseFields(schemaText: string): ContentField[] {
  const objectStart = schemaText.indexOf('z.object({');
  if (objectStart === -1) return [];
  let depth = 0;
  let end = objectStart + 'z.object('.length;
  for (let index = end; index < schemaText.length; index += 1) {
    const character = schemaText[index];
    if (character === '{') depth += 1;
    if (character === '}') {
      depth -= 1;
      if (depth === 0) {
        end = index;
        break;
      }
    }
  }
  const body = schemaText.slice(objectStart + 'z.object({'.length, end);

  const fields: ContentField[] = [];
  for (const rawLine of body.split('\n')) {
    const line = rawLine.replace(/\/\/.*$/, '').trim();
    const match = /^([A-Za-z_][\w]*)\s*:\s*(.+?),?$/.exec(line);
    if (!match) continue;
    const definition = match[2];
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

function collectionNames(schemaText: string): string[] {
  return [
    ...schemaText.matchAll(
      /^const\s+([A-Za-z_][\w]*)\s*=\s*defineCollection/gm,
    ),
  ].map((match) => match[1]);
}

function frontmatterFields(file: string): ContentField[] {
  const text = fs.readFileSync(file, 'utf8');
  const match = /^---\n([\s\S]*?)\n---/.exec(text);
  if (!match) return [];
  return match[1]
    .split('\n')
    .map((line) => /^([A-Za-z_][\w]*)\s*:\s*(.*)$/.exec(line))
    .filter((item): item is RegExpExecArray => item !== null)
    .map((item) => ({
      name: item[1],
      type: /^[-\d.]+$/.test(item[2]) ? 'number' : 'text',
      optional: item[2].trim() === '',
    }));
}

const CONTENT_FILE = /\.(md|mdx|json|yaml|yml)$/;

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

    const blockStart = schemaText.indexOf(`const ${name} = defineCollection`);
    const block =
      blockStart === -1
        ? ''
        : schemaText.slice(
            blockStart,
            Math.min(schemaText.length, blockStart + 2000),
          );

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
};

function parseFrontmatter(text: string): Record<string, string> {
  const match = /^---\n([\s\S]*?)\n---/.exec(text);
  const values: Record<string, string> = {};
  if (!match) return values;
  for (const line of match[1].split('\n')) {
    const item = /^([A-Za-z_][\w]*)\s*:\s*(.*)$/.exec(line);
    if (!item) continue;
    values[item[1]] = item[2].replace(/^['"]|['"]$/g, '');
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
  };
}

/** Saves one field, or the whole file when using the plain-text fallback. */
export function saveEntry(
  root: string,
  file: string,
  baseHash: string,
  change: { field?: string; value?: string; text?: string },
): { ok: boolean; problem?: string; hash?: string } {
  const full = path.join(root, file);
  if (!isInside(root, full))
    return { ok: false, problem: 'That file is outside the site.' };
  const disk = readFile(full);
  if (disk.hash !== baseHash) {
    return {
      ok: false,
      problem:
        'That entry changed since the form was opened. Nothing was overwritten.',
    };
  }

  if (change.text !== undefined) {
    writeFileAtomic(full, change.text);
    return { ok: true, hash: hashOf(change.text) };
  }

  const field = change.field ?? '';
  const value = change.value ?? '';
  const match = /^---\n([\s\S]*?)\n---/.exec(disk.text);
  if (!match)
    return { ok: false, problem: 'This entry has no frontmatter to edit.' };

  const body = match[1];
  const linePattern = new RegExp(`^${field}\\s*:.*$`, 'm');
  const line = `${field}: ${value}`;
  const nextBody = linePattern.test(body)
    ? body.replace(linePattern, line)
    : `${body}\n${line}`;
  const next = disk.text.replace(match[0], `---\n${nextBody}\n---`);
  writeFileAtomic(full, next);
  return { ok: true, hash: hashOf(next) };
}
