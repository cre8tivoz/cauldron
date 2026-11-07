// Regression checks for the file-safety requirements in plan 1.3–1.5 and 2.1.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { registerHooks } from 'node:module';

registerHooks({
  load(url, context, next) {
    return next(url, {
      ...context,
      format: url.endsWith('.ts') ? 'module-typescript' : context.format,
    });
  },
  resolve(specifier, context, next) {
    if (specifier.startsWith('.') && !path.extname(specifier)) {
      return next(`${specifier}.ts`, context);
    }
    return next(specifier, context);
  },
});
const { runAction } = await import('../src/main/actions.ts');
const { History } = await import('../src/main/history.ts');
const { hashOf, isInside } = await import('../src/main/files.ts');
const root = fs.mkdtempSync(path.join(os.tmpdir(), 'cauldron-safety-'));
let failures = 0;
function test(name, run) {
  try {
    run();
    console.log(`PASS ${name}`);
  } catch (error) {
    failures++;
    console.error(`FAIL ${name}: ${error.message}`);
  }
}
try {
  fs.mkdirSync(path.join(root, 'src/pages'), { recursive: true });
  const file = path.join(root, 'src/pages/index.astro');
  const base = '<h1>Original</h1>\n<p>Untouched</p>\n';
  const target = {
    file: 'src/pages/index.astro',
    line: 1,
    column: 4,
    name: 'h1',
  };
  test('2.1 stale action cannot overwrite an outside edit', () => {
    fs.writeFileSync(file, '<h1>Outside edit</h1>\n<p>Untouched</p>\n');
    const disk = fs.readFileSync(file, 'utf8');
    const result = runAction(root, {
      action: 'editElementText',
      target,
      value: 'Overwrite',
      baseHash: hashOf(base),
    });
    assert.equal(result.ok, false);
    assert.equal(fs.readFileSync(file, 'utf8'), disk);
  });
  test('2.1 current action edits only its intended text', () => {
    fs.writeFileSync(file, base);
    const result = runAction(root, {
      action: 'editElementText',
      target,
      value: 'New',
      baseHash: hashOf(base),
    });
    assert.equal(result.ok, true);
    assert.equal(
      fs.readFileSync(file, 'utf8'),
      base.replace('Original', 'New'),
    );
  });
  test('1.3 undo and redo preserve an outside edit elsewhere', () => {
    const before = base;
    const after = base.replace('Original', 'New');
    fs.writeFileSync(file, after + '<!-- outside -->\n');
    const history = new History();
    history.record({
      file,
      location: { ...target, file },
      operation: { kind: 'text', value: 'New' },
      before,
      after,
      beforeHash: hashOf(before),
      afterHash: hashOf(after),
      label: 'Text',
    });
    assert.ok(!('problem' in history.undo()));
    assert.equal(fs.readFileSync(file, 'utf8'), before + '<!-- outside -->\n');
    assert.ok(!('problem' in history.redo()));
    assert.equal(fs.readFileSync(file, 'utf8'), after + '<!-- outside -->\n');
  });
  test('1.3 undo refuses an overlapping outside edit', () => {
    const after = base.replace('Original', 'New');
    const disk = base.replace('Original', 'Outside');
    fs.writeFileSync(file, disk);
    const history = new History();
    history.record({
      file,
      location: { ...target, file },
      operation: { kind: 'text', value: 'New' },
      before: base,
      after,
      beforeHash: hashOf(base),
      afterHash: hashOf(after),
      label: 'Text',
    });
    assert.ok('problem' in history.undo());
    assert.equal(fs.readFileSync(file, 'utf8'), disk);
  });
  test('1.8 symlink cannot escape the open site', () => {
    fs.symlinkSync(path.dirname(root), path.join(root, 'escape'));
    assert.equal(
      isInside(root, path.join(root, 'escape', 'outside.astro')),
      false,
    );
  });
  test('2.1 outline cannot read outside the site', () => {
    const result = runAction(root, {
      action: 'readPageOutline',
      page: '../../../outside',
    });
    assert.equal(result.ok, false);
  });
  const { applyEdit, snapshotElement } = await import('../src/main/edit.ts');
  test('1.5 dynamic attributes and unknown source stay byte-for-byte intact', () => {
    const source =
      '---\nconst untouched = { odd: "  >  " };\n---\n<h1 class={true ? "big heading" : "small"}>Original</h1>\n<div class="keep  spaces"  >Opaque</div>';
    const loc = { file, line: 4, column: 50, name: 'h1' };
    const result = applyEdit(
      source,
      loc,
      { kind: 'text', value: 'Changed' },
      { text: 'Original' },
    );
    assert.equal(result.ok, true);
    assert.equal(result.text, source.replace('>Original<', '>Changed<'));
  });
  test('1.5 generated Astro text is not replaced by a literal', () => {
    const source = '<h1>{title}</h1>';
    assert.equal(
      snapshotElement(source, { file, line: 1, column: 4, name: 'h1' })
        .textEditable,
      false,
    );
    assert.equal(
      applyEdit(
        source,
        { file, line: 1, column: 4, name: 'h1' },
        { kind: 'text', value: 'literal' },
        {},
      ).ok,
      false,
    );
  });
  test('1.5 literal braces and attribute quotes are escaped safely', () => {
    const source = '<h1 title="Original">Original</h1>';
    const loc = { file, line: 1, column: 4, name: 'h1' };
    const result = applyEdit(
      source,
      loc,
      { kind: 'attribute', name: 'title', value: 'A "quote" {literal}' },
      {},
    );
    assert.equal(result.ok, true);
    assert.equal(
      result.text,
      '<h1 title="A &quot;quote&quot; &#123;literal&#125;">Original</h1>',
    );
  });
  test('1.5 removing one attribute never reformats unrelated tags', () => {
    const source =
      '<h1 title="x">Original</h1>\n<div class="keep"   >Opaque</div>';
    const result = applyEdit(
      source,
      { file, line: 1, column: 4, name: 'h1' },
      { kind: 'attribute', name: 'title', value: null },
      {},
    );
    assert.equal(result.ok, true);
    assert.equal(result.text, source.replace('title="x"', ''));
  });
  const { addPiece } = await import('../src/main/library.ts');
  const { readCollections, readEntry, saveEntry } =
    await import('../src/main/content.ts');
  test('4.3 failed replacement leaves every existing file alone', () => {
    fs.writeFileSync(file, base);
    const result = addPiece(root, {
      pieceId: 'editorial-intro',
      page: '/',
      mode: 'replace',
      replaceSelector: 'Missing',
    });
    assert.equal(result.ok, false);
    assert.equal(fs.readFileSync(file, 'utf8'), base);
    assert.equal(
      fs.existsSync(path.join(root, 'src/components/Editorialintro.astro')),
      false,
    );
  });
  test('4.3 unknown page never silently changes the home page', () => {
    const result = addPiece(root, {
      pieceId: 'editorial-intro',
      page: '/missing/',
      mode: 'add',
    });
    assert.equal(result.ok, false);
    assert.equal(fs.readFileSync(file, 'utf8'), base);
  });
  test('4.3 nested page gets a correct import and re-add preserves component edits', () => {
    fs.mkdirSync(path.join(root, 'src/pages/nested'), { recursive: true });
    const nested = path.join(root, 'src/pages/nested/index.astro');
    fs.writeFileSync(nested, '<main></main>');
    const options = {
      pieceId: 'editorial-intro',
      page: '/nested/',
      mode: 'add',
    };
    assert.equal(addPiece(root, options).ok, true);
    assert.ok(
      fs
        .readFileSync(nested, 'utf8')
        .includes('../../components/Editorialintro.astro'),
    );
    const component = path.join(root, 'src/components/Editorialintro.astro');
    fs.appendFileSync(component, '\n<!-- owner edit -->');
    const edited = fs.readFileSync(component, 'utf8');
    assert.equal(addPiece(root, options).ok, true);
    assert.equal(fs.readFileSync(component, 'utf8'), edited);
  });
  test('3.4 a colon or newline in text cannot corrupt frontmatter', () => {
    fs.mkdirSync(path.join(root, 'src/content/posts'), { recursive: true });
    const entry = 'src/content/posts/test.md';
    const text = '---\ntitle: Original\n---\nBody stays exactly as written.\n';
    fs.writeFileSync(path.join(root, entry), text);
    const opened = readEntry(root, entry);
    const value = 'Title: value\nnot_a_new_field: yes';
    assert.equal(
      saveEntry(root, entry, opened.hash, {
        field: 'title',
        value,
        schemaHash: opened.schemaHash,
      }).ok,
      true,
    );
    assert.equal(readEntry(root, entry).values.title, value);
    assert.ok(
      fs
        .readFileSync(path.join(root, entry), 'utf8')
        .endsWith('Body stays exactly as written.\n'),
    );
  });
  test('3.4 changed content definition invalidates the form', () => {
    const entry = 'src/content/posts/test.md';
    const opened = readEntry(root, entry);
    fs.writeFileSync(
      path.join(root, 'src/content.config.ts'),
      '// schema changed',
    );
    assert.equal(
      saveEntry(root, entry, opened.hash, {
        field: 'title',
        value: 'No',
        schemaHash: opened.schemaHash,
      }).ok,
      false,
    );
  });

  // Each case below gets its own site so the checks above cannot leak in state.
  const freshSite = (label) => {
    const site = fs.mkdtempSync(path.join(root, `content-${label}-`));
    fs.mkdirSync(path.join(site, 'src/content/posts'), { recursive: true });
    return site;
  };

  test('3.4 a schema-less block list is refused and the rest of the file is intact', () => {
    const site = freshSite('block-list');
    const entry = 'src/content/posts/hello.md';
    const text = '---\ntitle: Hello\ntags:\n  - one\n  - two\n---\nBody\n';
    fs.writeFileSync(path.join(site, entry), text);

    const fields = readCollections(site).find(
      (collection) => collection.name === 'posts',
    ).fields;
    assert.deepEqual(
      fields.map((field) => [field.name, field.type]),
      [
        ['title', 'text'],
        ['tags', 'unknown'],
      ],
    );

    const opened = readEntry(site, entry);
    assert.equal(opened.hash, hashOf(text));
    const refused = saveEntry(site, entry, opened.hash, {
      field: 'tags',
      value: 'replacement',
      schemaHash: opened.schemaHash,
    });
    assert.equal(refused.ok, false);
    assert.match(refused.problem ?? '', /plain-text/);
    assert.equal(fs.readFileSync(path.join(site, entry), 'utf8'), text);

    const saved = saveEntry(site, entry, opened.hash, {
      field: 'title',
      value: 'Hello again',
      schemaHash: opened.schemaHash,
    });
    assert.equal(saved.ok, true);
    assert.equal(
      fs.readFileSync(path.join(site, entry), 'utf8'),
      '---\ntitle: "Hello again"\ntags:\n  - one\n  - two\n---\nBody\n',
    );
  });

  test('3.4 a block list is refused even when the definition calls it text', () => {
    const site = freshSite('block-list-text');
    fs.writeFileSync(
      path.join(site, 'src/content.config.ts'),
      [
        "import { defineCollection, z } from 'astro:content';",
        '',
        'const posts = defineCollection({',
        '  schema: z.object({',
        '    title: z.string(),',
        '    tags: z.string(),',
        '  }),',
        '});',
        '',
      ].join('\n'),
    );
    const entry = 'src/content/posts/hello.md';
    const text = '---\ntitle: Hello\ntags:\n  - one\n  - two\n---\nBody\n';
    fs.writeFileSync(path.join(site, entry), text);
    assert.equal(
      readCollections(site).find((collection) => collection.name === 'posts')
        .fields[1].type,
      'text',
    );

    const opened = readEntry(site, entry);
    const refused = saveEntry(site, entry, opened.hash, {
      field: 'tags',
      value: 'replacement',
      schemaHash: opened.schemaHash,
    });
    assert.equal(refused.ok, false);
    assert.match(refused.problem ?? '', /plain-text/);
    assert.equal(fs.readFileSync(path.join(site, entry), 'utf8'), text);
  });

  test('3.4 nested and multi-line definitions stay one field each', () => {
    const site = freshSite('nested');
    fs.writeFileSync(
      path.join(site, 'src/content.config.ts'),
      [
        "import { defineCollection, z } from 'astro:content';",
        '',
        'const posts = defineCollection({',
        '  schema: z.object({',
        '    title: z.string(),',
        '    slug: z',
        '      .string()',
        '      .optional(),',
        '    author: z.object({',
        '      name: z.string(),',
        '    }),',
        '  }),',
        '});',
        '',
      ].join('\n'),
    );
    const entry = 'src/content/posts/hello.md';
    const text = '---\ntitle: Hello\nauthor:\n  name: Ada\n---\nBody\n';
    fs.writeFileSync(path.join(site, entry), text);

    const fields = readCollections(site).find(
      (collection) => collection.name === 'posts',
    ).fields;
    assert.deepEqual(
      fields.map((field) => [field.name, field.type, field.optional]),
      [
        ['title', 'text', false],
        ['slug', 'text', true],
        ['author', 'unknown', false],
      ],
    );

    const opened = readEntry(site, entry);
    const refused = saveEntry(site, entry, opened.hash, {
      field: 'author',
      value: 'Ada',
      schemaHash: opened.schemaHash,
    });
    assert.equal(refused.ok, false);
    assert.match(refused.problem ?? '', /plain-text/);
    assert.equal(fs.readFileSync(path.join(site, entry), 'utf8'), text);
  });

  test('3.4 a collection without a schema does not take the next collection’s fields', () => {
    const site = freshSite('two-collections');
    fs.mkdirSync(path.join(site, 'src/content/notes'), { recursive: true });
    fs.writeFileSync(
      path.join(site, 'src/content.config.ts'),
      [
        "import { defineCollection, z } from 'astro:content';",
        "import { glob } from 'astro/loaders';",
        '',
        'const posts = defineCollection({',
        "  loader: glob({ pattern: '**/*.md', base: './src/content/posts' }),",
        '});',
        '',
        'const notes = defineCollection({',
        "  loader: glob({ pattern: '**/*.md', base: './src/content/notes' }),",
        '  schema: z.object({',
        '    note: z.string(),',
        '  }),',
        '});',
        '',
      ].join('\n'),
    );
    fs.writeFileSync(
      path.join(site, 'src/content/posts/hello.md'),
      '---\ntitle: Hello\n---\nBody\n',
    );
    fs.writeFileSync(
      path.join(site, 'src/content/notes/first.md'),
      '---\nnote: Keep\n---\nBody\n',
    );

    const collections = readCollections(site);
    const posts = collections.find((collection) => collection.name === 'posts');
    const notes = collections.find((collection) => collection.name === 'notes');
    assert.deepEqual(
      posts.fields.map((field) => field.name),
      ['title'],
    );
    assert.deepEqual(
      notes.fields.map((field) => field.name),
      ['note'],
    );
  });

  test('3.4 a field set twice is refused rather than half-rewritten', () => {
    const site = freshSite('duplicate-key');
    const entry = 'src/content/posts/hello.md';
    const text = '---\ntitle: One\ntitle: Two\n---\nBody\n';
    fs.writeFileSync(path.join(site, entry), text);
    const opened = readEntry(site, entry);

    const refused = saveEntry(site, entry, opened.hash, {
      field: 'title',
      value: 'Three',
      schemaHash: opened.schemaHash,
    });
    assert.equal(refused.ok, false);
    assert.match(refused.problem ?? '', /plain-text/);
    assert.equal(fs.readFileSync(path.join(site, entry), 'utf8'), text);
  });

  test('3.4 plain-text save refuses a stale disk edit', () => {
    const site = freshSite('stale-text');
    const entry = 'src/content/posts/hello.md';
    fs.writeFileSync(path.join(site, entry), '---\ntitle: Hello\n---\nBody\n');
    const opened = readEntry(site, entry);
    const outside = '---\ntitle: Outside\n---\nOutside body\n';
    fs.writeFileSync(path.join(site, entry), outside);

    const refused = saveEntry(site, entry, opened.hash, {
      text: '---\ntitle: Mine\n---\nMine\n',
    });
    assert.equal(refused.ok, false);
    assert.match(refused.problem ?? '', /changed/);
    assert.equal(fs.readFileSync(path.join(site, entry), 'utf8'), outside);
  });

  test('3.4 dollar sequences in a value are saved literally', () => {
    const site = freshSite('dollar');
    const entry = 'src/content/posts/hello.md';
    const text = '---\ntitle: Hello\n---\nBody stays exactly as written.\n';
    fs.writeFileSync(path.join(site, entry), text);
    const opened = readEntry(site, entry);
    const value = "Costs $5 $& $' $` $$";
    assert.equal(
      saveEntry(site, entry, opened.hash, {
        field: 'title',
        value,
        schemaHash: opened.schemaHash,
      }).ok,
      true,
    );
    assert.equal(
      fs.readFileSync(path.join(site, entry), 'utf8'),
      `---\ntitle: ${JSON.stringify(value)}\n---\nBody stays exactly as written.\n`,
    );
  });
} finally {
  fs.rmSync(root, { recursive: true, force: true });
}
process.exitCode = failures ? 1 : 0;
