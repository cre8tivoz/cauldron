// Regression checks for the file-safety requirements in plan 1.3–1.5 and 2.1.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawnSync } from 'node:child_process';
import { registerHooks } from 'node:module';
import { pathToFileURL } from 'node:url';

// A tiny stand-in so main-process modules that import electron can be unit-tested.
const electronStub = path.join(
  fs.mkdtempSync(path.join(os.tmpdir(), 'cauldron-electron-')),
  'electron.mjs',
);
fs.writeFileSync(
  electronStub,
  `export const app = { getAppPath: () => process.cwd(), getPath: () => globalThis.__cauldronUserData ?? ${JSON.stringify(
    path.join(
      fs.mkdtempSync(path.join(os.tmpdir(), 'cauldron-electron-home-')),
      'userData',
    ),
  )} };\nexport class BrowserWindow {}\nexport default { app };\n`,
);

registerHooks({
  load(url, context, next) {
    return next(url, {
      ...context,
      format: url.endsWith('.ts') ? 'module-typescript' : context.format,
    });
  },
  resolve(specifier, context, next) {
    if (specifier === 'electron') {
      return next(pathToFileURL(electronStub).href, context);
    }
    if (specifier.startsWith('.') && !path.extname(specifier)) {
      return next(`${specifier}.ts`, context);
    }
    return next(specifier, context);
  },
});
const { runAction } = await import('../src/main/actions.ts');
const { History } = await import('../src/main/history.ts');
const { hashOf, isInside } = await import('../src/main/files.ts');
// Ticket 13 modules: imported leniently so a missing implementation fails a test
// rather than aborting the whole run.
const draftSchedule = await import('../src/draft-schedule.ts').catch(
  () => null,
);
const draftRestore = await import('../src/draft-restore.ts').catch(() => null);
// Ticket 14 modules: imported leniently so a missing implementation fails a test.
const recovery = await import('../src/main/recovery.ts').catch(() => null);
const directions = await import('../src/main/directions.ts').catch(() => null);
// Ticket 14 case 7: an accessibility-check exception must be reported, not
// discarded. A window whose page scripts fail stands in for a broken check.
const axeOutcome = await (async () => {
  const quality = await import('../src/main/quality.ts').catch((error) => ({
    importError: error,
  }));
  if ('importError' in quality) return { importError: quality.importError };
  const logged = [];
  const original = console.error;
  console.error = (...args) => logged.push(args.join(' '));
  try {
    const failing = {
      webContents: {
        executeJavaScript: () =>
          Promise.reject(new Error('page script failed')),
      },
    };
    const value = await quality.runAxe(failing);
    return { value, logged };
  } catch (error) {
    return { error, logged };
  } finally {
    console.error = original;
  }
})();
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
  // Ticket 19: an outside agent has only these actions, so the outline must say
  // where each heading is, or no agent can edit through the shared actions.
  test('3.3 outline gives usable positions for the shared actions', () => {
    fs.writeFileSync(
      file,
      '---\nconst title = "Kept";\n---\n  <h1 class="lead">Positioned</h1>\n<p>Body</p>\n',
    );
    const outline = runAction(root, {
      action: 'readPageOutline',
      page: '/',
    });
    assert.equal(outline.ok, true);
    const heading = outline.headings[0];
    assert.equal(heading.line, 4);
    assert.equal(heading.column, 3);
    const edited = runAction(root, {
      action: 'editElementText',
      target: {
        file: 'src/pages/index.astro',
        line: heading.line,
        column: heading.column,
        name: `h${heading.level}`,
      },
      value: 'Moved',
      baseHash: outline.hash,
    });
    assert.equal(edited.ok, true);
    assert.equal(
      fs.readFileSync(file, 'utf8'),
      '---\nconst title = "Kept";\n---\n  <h1 class="lead">Moved</h1>\n<p>Body</p>\n',
    );
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
    assert.equal(refused.conflict, true);
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

  test('1.6 continuous typing cannot postpone the recovery save', () => {
    assert.ok(draftSchedule, 'src/draft-schedule.ts is missing');
    const first = 1_000;
    let schedule = draftSchedule.noteDraftChange({ dueAt: null }, first);
    const dueAt = schedule.dueAt;
    assert.equal(dueAt, first + draftSchedule.DRAFT_SAVE_DELAY_MS);
    for (let now = first + 250; now < first + 10_000; now += 250) {
      schedule = draftSchedule.noteDraftChange(schedule, now);
      assert.equal(
        schedule.dueAt,
        dueAt,
        `a keystroke at ${now} moved the save`,
      );
    }
    assert.equal(draftSchedule.isDraftDue(schedule, dueAt - 1), false);
    assert.equal(draftSchedule.isDraftDue(schedule, dueAt), true);
  });

  test('1.6 a completed save arms a new recovery save', () => {
    assert.ok(draftSchedule, 'src/draft-schedule.ts is missing');
    const cleared = draftSchedule.clearDraftSchedule();
    assert.equal(cleared.dueAt, null);
    assert.equal(
      draftSchedule.noteDraftChange(cleared, 5_000).dueAt,
      5_000 + draftSchedule.DRAFT_SAVE_DELAY_MS,
    );
  });

  test('1.6 style and attribute drafts restore as their own kind, never as text', () => {
    assert.ok(draftRestore, 'src/draft-restore.ts is missing');
    assert.deepEqual(draftRestore.draftEditOperation('text', 'Hello'), {
      kind: 'text',
      value: 'Hello',
    });
    assert.deepEqual(
      draftRestore.draftEditOperation('attribute:href', '/about'),
      { kind: 'attribute', name: 'href', value: '/about' },
    );
    assert.deepEqual(draftRestore.draftEditOperation('style:color', 'red'), {
      kind: 'style',
      properties: { color: 'red' },
    });
    assert.equal(draftRestore.draftEditOperation('content:title', 'Hi'), null);
  });

  test('1.6 a refused content restore changes nothing and keeps the draft usable', () => {
    const site = freshSite('refused-restore');
    const entry = 'src/content/posts/hello.md';
    const text = '---\ntitle: Hello\n---\nBody\n';
    fs.writeFileSync(path.join(site, entry), text);
    const opened = readEntry(site, entry);
    // The definition changed after the draft was taken: the restore must be refused.
    fs.writeFileSync(
      path.join(site, 'src/content.config.ts'),
      '// schema changed',
    );
    const refused = saveEntry(site, entry, opened.hash, {
      field: 'title',
      value: 'Typed before the crash',
      schemaHash: opened.schemaHash,
    });
    assert.equal(refused.ok, false);
    assert.match(refused.problem ?? '', /definition changed/);
    assert.equal(fs.readFileSync(path.join(site, entry), 'utf8'), text);
  });
} finally {
  fs.rmSync(root, { recursive: true, force: true });
}
// 2.2 whole-run undo (ticket 12). Loaded late so an import fault is reported per test.
const runsLoad = await import('../src/main/runs.ts').catch((error) => ({
  error,
}));
function runsApi() {
  if (runsLoad.error) throw runsLoad.error;
  return runsLoad;
}
const runSite = (label) => {
  const site = fs.mkdtempSync(
    path.join(os.tmpdir(), `cauldron-runs-${label}-`),
  );
  fs.mkdirSync(path.join(site, 'src/pages'), { recursive: true });
  fs.mkdirSync(path.join(site, 'public'), { recursive: true });
  return site;
};
const png = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 1, 2, 255,
]);

test('2.2 an image the run changed is listed and undone', () => {
  const { Runs } = runsApi();
  const site = runSite('image');
  fs.writeFileSync(path.join(site, 'public/logo.png'), png);
  fs.writeFileSync(
    path.join(site, 'src/pages/index.astro'),
    '<h1>Before</h1>\n',
  );
  const runs = new Runs();
  const run = runs.start(site, 'claude', 'add a logo');
  fs.writeFileSync(
    path.join(site, 'public/logo.png'),
    Buffer.concat([png, Buffer.from([9, 9])]),
  );
  fs.writeFileSync(
    path.join(site, 'src/pages/index.astro'),
    '<h1>After</h1>\n',
  );
  const finished = runs.finish(site, run.id);
  assert.deepEqual(
    finished.files.map((file) => file.file),
    ['public/logo.png', 'src/pages/index.astro'],
  );
  assert.equal(finished.files[0].status, 'changed');
  assert.equal(finished.files[0].ownership, 'run');
  assert.deepEqual(runs.undo(site, run.id), { ok: true });
  assert.deepEqual(fs.readFileSync(path.join(site, 'public/logo.png')), png);
  assert.equal(
    fs.readFileSync(path.join(site, 'src/pages/index.astro'), 'utf8'),
    '<h1>Before</h1>\n',
  );
});

test('2.2 a manual edit made during the run survives undo', () => {
  const { Runs } = runsApi();
  const site = runSite('outside');
  fs.writeFileSync(
    path.join(site, 'src/pages/agent.astro'),
    '<h1>Agent v1</h1>\n',
  );
  fs.writeFileSync(
    path.join(site, 'src/pages/manual.astro'),
    '<nav>Menu v1</nav>\n',
  );
  const runs = new Runs();
  const run = runs.start(site, 'claude', 'edit the agent page');
  fs.writeFileSync(
    path.join(site, 'src/pages/agent.astro'),
    '<h1>Agent v2</h1>\n',
  );
  const history = new History();
  const manual = path.join(site, 'src/pages/manual.astro');
  history.record({
    file: manual,
    location: { file: manual, line: 1, column: 1, name: 'nav' },
    operation: { kind: 'text', value: '' },
    before: '<nav>Menu v1</nav>\n',
    after: '<nav>Menu v2</nav>\n',
    beforeHash: hashOf('<nav>Menu v1</nav>\n'),
    afterHash: hashOf('<nav>Menu v2</nav>\n'),
    label: 'editElementText',
  });
  fs.writeFileSync(manual, '<nav>Menu v2</nav>\n');
  const finished = runs.finish(site, run.id, {
    outside: history.writtenSince(run.startedAt),
  });
  assert.deepEqual(
    finished.files.map((file) => file.file),
    ['src/pages/agent.astro'],
  );
  assert.deepEqual(finished.outside, ['src/pages/manual.astro']);
  assert.deepEqual(runs.undo(site, run.id), { ok: true });
  assert.equal(fs.readFileSync(manual, 'utf8'), '<nav>Menu v2</nav>\n');
  assert.equal(
    fs.readFileSync(path.join(site, 'src/pages/agent.astro'), 'utf8'),
    '<h1>Agent v1</h1>\n',
  );
});

test('2.2 an editor write on top of the agent’s change is refused, not split', () => {
  const { Runs } = runsApi();
  const site = runSite('shared-file');
  const page = path.join(site, 'src/pages/index.astro');
  fs.writeFileSync(page, '<h1>v1</h1>\n');
  const runs = new Runs();
  const run = runs.start(site, 'claude', 'edit the page');
  // The agent writes first, then the person edits the same file in Cauldron.
  fs.writeFileSync(page, '<h1>agent</h1>\n');
  const history = new History();
  history.record({
    file: page,
    location: { file: page, line: 1, column: 1, name: 'h1' },
    operation: { kind: 'text', value: '' },
    before: '<h1>agent</h1>\n',
    after: '<h1>agent and me</h1>\n',
    beforeHash: hashOf('<h1>agent</h1>\n'),
    afterHash: hashOf('<h1>agent and me</h1>\n'),
    label: 'editElementText',
  });
  fs.writeFileSync(page, '<h1>agent and me</h1>\n');
  const finished = runs.finish(site, run.id, {
    outside: history.writtenSince(run.startedAt),
  });
  assert.deepEqual(finished.outside, []);
  assert.deepEqual(
    finished.files.map((file) => [file.file, file.ownership]),
    [['src/pages/index.astro', 'uncertain']],
  );
  const result = runs.undo(site, run.id);
  assert.equal(result.ok, false);
  assert.deepEqual(result.uncertain, ['src/pages/index.astro']);
  assert.equal(fs.readFileSync(page, 'utf8'), '<h1>agent and me</h1>\n');
});

test('2.2 an outside program’s edit during an agent run is refused, never undone', () => {
  const { Runs } = runsApi();
  const site = runSite('raw-outside');
  const agent = path.join(site, 'src/pages/agent.astro');
  const manual = path.join(site, 'src/pages/manual.astro');
  fs.writeFileSync(agent, '<h1>Original</h1>\n');
  fs.writeFileSync(manual, '<p>Original</p>\n');
  const runs = new Runs();
  const run = runs.start(site, 'claude', 'only edit agent.astro');
  // Another program (an editor outside Cauldron) writes while the agent works.
  fs.writeFileSync(manual, '<p>Outside edit while agent runs</p>\n');
  fs.writeFileSync(agent, '<h1>Agent edit</h1>\n');
  const finished = runs.finish(site, run.id, { outside: [], claimed: [agent] });
  assert.deepEqual(
    finished.files.map((file) => [file.file, file.ownership]),
    [
      ['src/pages/agent.astro', 'run'],
      ['src/pages/manual.astro', 'uncertain'],
    ],
  );
  const result = runs.undo(site, run.id);
  assert.equal(result.ok, false);
  assert.deepEqual(result.uncertain, ['src/pages/manual.astro']);
  assert.equal(
    fs.readFileSync(manual, 'utf8'),
    '<p>Outside edit while agent runs</p>\n',
  );
  assert.equal(fs.readFileSync(agent, 'utf8'), '<h1>Agent edit</h1>\n');
});

test('2.2 a run whose every change is claimed undoes in full', () => {
  const { Runs } = runsApi();
  const site = runSite('claimed');
  const agent = path.join(site, 'src/pages/agent.astro');
  fs.writeFileSync(agent, '<h1>Original</h1>\n');
  const runs = new Runs();
  const run = runs.start(site, 'claude', 'edit agent.astro');
  fs.writeFileSync(agent, '<h1>Agent edit</h1>\n');
  runs.finish(site, run.id, { outside: [], claimed: [agent] });
  assert.deepEqual(runs.undo(site, run.id), { ok: true });
  assert.equal(fs.readFileSync(agent, 'utf8'), '<h1>Original</h1>\n');
});

test('2.2 an unreadable file makes undo refuse, not restore', () => {
  const { Runs } = runsApi();
  const site = runSite('unreadable');
  fs.writeFileSync(
    path.join(site, 'src/pages/agent.astro'),
    '<h1>Agent v1</h1>\n',
  );
  const locked = path.join(site, 'src/pages/locked.astro');
  fs.writeFileSync(locked, '<h1>Locked</h1>\n');
  fs.chmodSync(locked, 0o000);
  const runs = new Runs();
  const run = runs.start(site, 'claude', 'edit');
  fs.writeFileSync(
    path.join(site, 'src/pages/agent.astro'),
    '<h1>Agent v2</h1>\n',
  );
  const finished = runs.finish(site, run.id);
  assert.ok(finished.problems.includes('src/pages/locked.astro'));
  const result = runs.undo(site, run.id);
  fs.chmodSync(locked, 0o644);
  assert.equal(result.ok, false);
  assert.ok(result.uncertain.includes('src/pages/locked.astro'));
  assert.match(result.problem, /locked\.astro/);
  assert.equal(
    fs.readFileSync(path.join(site, 'src/pages/agent.astro'), 'utf8'),
    '<h1>Agent v2</h1>\n',
  );
});

test('2.2 a later edit refuses the whole undo and writes nothing', () => {
  const { Runs } = runsApi();
  const site = runSite('overlap');
  fs.writeFileSync(path.join(site, 'src/pages/a.astro'), 'a v1\n');
  fs.writeFileSync(path.join(site, 'src/pages/b.astro'), 'b v1\n');
  const runs = new Runs();
  const run = runs.start(site, 'claude', 'edit both');
  fs.writeFileSync(path.join(site, 'src/pages/a.astro'), 'a v2\n');
  fs.writeFileSync(path.join(site, 'src/pages/b.astro'), 'b v2\n');
  runs.finish(site, run.id);
  fs.writeFileSync(path.join(site, 'src/pages/a.astro'), 'a v3 (later)\n');
  const result = runs.undo(site, run.id);
  assert.equal(result.ok, false);
  assert.deepEqual(result.clashes, ['src/pages/a.astro']);
  assert.equal(
    fs.readFileSync(path.join(site, 'src/pages/a.astro'), 'utf8'),
    'a v3 (later)\n',
  );
  assert.equal(
    fs.readFileSync(path.join(site, 'src/pages/b.astro'), 'utf8'),
    'b v2\n',
  );
});

test('2.2 added and removed files are listed and undone', () => {
  const { Runs } = runsApi();
  const site = runSite('addremove');
  fs.writeFileSync(path.join(site, 'src/pages/old.astro'), 'old page\n');
  const runs = new Runs();
  const run = runs.start(site, 'claude', 'replace a page');
  fs.rmSync(path.join(site, 'src/pages/old.astro'));
  fs.writeFileSync(path.join(site, 'src/pages/new.astro'), 'new page\n');
  const finished = runs.finish(site, run.id);
  assert.deepEqual(
    finished.files.map((file) => [file.file, file.status]),
    [
      ['src/pages/new.astro', 'added'],
      ['src/pages/old.astro', 'removed'],
    ],
  );
  assert.deepEqual(runs.undo(site, run.id), { ok: true });
  assert.equal(fs.existsSync(path.join(site, 'src/pages/new.astro')), false);
  assert.equal(
    fs.readFileSync(path.join(site, 'src/pages/old.astro'), 'utf8'),
    'old page\n',
  );
});

// Ticket 14: uncertainty is never reported as an empty or successful result.
test('14 unreadable or malformed drafts are reported, a missing file is not', () => {
  assert.ok(recovery, 'recovery module could not be imported');
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'cauldron-home-'));
  globalThis.__cauldronUserData = home;
  const site = fs.mkdtempSync(path.join(os.tmpdir(), 'cauldron-safety-'));
  const missing = recovery.loadDrafts(site);
  assert.deepEqual(missing.drafts, []);
  assert.equal(missing.problem, null);
  recovery.saveDrafts(site, [
    {
      key: 'k',
      file: 'src/pages/index.astro',
      line: 1,
      column: 1,
      name: 'h1',
      field: 'text',
      value: 'x',
      savedAt: 1,
    },
  ]);
  const folder = path.join(home, 'recovery');
  const file = path.join(folder, fs.readdirSync(folder)[0]);
  fs.writeFileSync(file, '{ not json');
  const malformed = recovery.loadDrafts(site);
  assert.deepEqual(malformed.drafts, []);
  assert.match(malformed.problem ?? '', /could not be read/);
  fs.chmodSync(file, 0o000);
  const unreadable = recovery.loadDrafts(site);
  assert.deepEqual(unreadable.drafts, []);
  assert.match(unreadable.problem ?? '', /could not be read/);
  fs.chmodSync(file, 0o644);
});

test('14 a missing design setting is distinct from a damaged one', () => {
  assert.ok(directions, 'directions module could not be imported');
  const site = fs.mkdtempSync(path.join(os.tmpdir(), 'cauldron-safety-'));
  assert.deepEqual(directions.readDirection(site), {
    direction: null,
    problem: null,
  });
  fs.mkdirSync(path.join(site, 'cauldron'), { recursive: true });
  const file = path.join(site, 'cauldron/design.json');
  fs.writeFileSync(file, '{ broken');
  const malformed = directions.readDirection(site);
  assert.equal(malformed.direction, null);
  assert.match(malformed.problem ?? '', /could not be read/);
  fs.chmodSync(file, 0o000);
  const unreadable = directions.readDirection(site);
  assert.equal(unreadable.direction, null);
  assert.match(unreadable.problem ?? '', /could not be read/);
  fs.chmodSync(file, 0o644);
});

test('14 a failed accessibility check is reported and logged, not discarded', () => {
  assert.ok(!axeOutcome.importError, String(axeOutcome.importError));
  assert.ok(
    axeOutcome.error,
    `runAxe returned ${JSON.stringify(axeOutcome.value)}`,
  );
  assert.match(axeOutcome.error.message, /could not run: page script failed/);
  assert.ok(
    axeOutcome.logged.some((line) => line.includes('page script failed')),
    'no console.error diagnostic',
  );
});

// 5.1 publishing through the site's own repository (ticket 16). Loaded late so
// an import fault is reported per test rather than aborting the whole run.
const publishLoad = await import('../src/main/publishing.ts').catch(
  (error) => ({
    error,
  }),
);
function publishApi() {
  if (publishLoad.error) throw publishLoad.error;
  return publishLoad;
}

function gitIn(cwd, args) {
  const result = spawnSync('git', args, {
    cwd,
    encoding: 'utf8',
    timeout: 60000,
    env: {
      ...process.env,
      GIT_TERMINAL_PROMPT: '0',
      GIT_CONFIG_NOSYSTEM: '1',
      HOME: cwd,
    },
  });
  return result;
}

/** A site repository plus an isolated bare remote, both under one temp dir. */
function publishFixture(label) {
  const base = fs.mkdtempSync(
    path.join(os.tmpdir(), `cauldron-publish-${label}-`),
  );
  const site = path.join(base, 'site');
  const remote = path.join(base, 'remote.git');
  const page = path.join(site, 'src/pages/index.astro');
  fs.mkdirSync(path.dirname(page), { recursive: true });
  fs.writeFileSync(page, '<h1>v1</h1>\n');
  assert.equal(gitIn(site, ['init', '-q']).status, 0);
  gitIn(site, ['checkout', '-q', '-b', 'main']);
  gitIn(site, ['config', 'user.name', 'Cauldron Test']);
  gitIn(site, ['config', 'user.email', 'test@example.invalid']);
  gitIn(site, ['config', 'commit.gpgsign', 'false']);
  assert.equal(gitIn(site, ['add', '-A']).status, 0);
  assert.equal(gitIn(site, ['commit', '-q', '-m', 'First']).status, 0);
  assert.equal(gitIn(base, ['init', '-q', '--bare', remote]).status, 0);
  assert.equal(gitIn(site, ['remote', 'add', 'origin', remote]).status, 0);
  assert.equal(gitIn(site, ['push', '-q', '-u', 'origin', 'main']).status, 0);
  return { base, site, remote, page };
}

const commitCount = (repo, ref = 'HEAD') => {
  const result = gitIn(repo, ['rev-list', '--count', ref]);
  assert.equal(result.status, 0, result.stderr);
  return Number.parseInt(result.stdout.trim(), 10);
};

test('5.1 a failed upload keeps the commit and a retry uploads it without a second commit', () => {
  const { publish, repoState } = publishApi();
  const { base, site, remote, page } = publishFixture('retry');
  fs.writeFileSync(page, '<h1>v2</h1>\n');

  // The remote is gone: the commit must still be made, and the upload reported
  // as its own, visible failure.
  gitIn(site, ['remote', 'set-url', 'origin', path.join(base, 'gone.git')]);
  const failed = publish(site, { message: 'Second', push: true });
  assert.equal(failed.ok, false);
  assert.equal(failed.committed, 1);
  assert.match(failed.problem, /upload|push/i);
  assert.equal(commitCount(site), 2);

  // The retry happens on a clean tree: the commit exists but was never uploaded.
  assert.equal(repoState(site).changes.length, 0);
  assert.equal(repoState(site).unpushed, 1);

  gitIn(site, ['remote', 'set-url', 'origin', remote]);
  const retried = publish(site, { message: 'Second', push: true });
  assert.equal(retried.ok, true, retried.problem);
  assert.equal(retried.committed, 0);
  assert.equal(retried.pushed, true);
  assert.equal(commitCount(site), 2);
  assert.equal(commitCount(remote, 'main'), 2);
  assert.equal(repoState(site).unpushed, 0);
});

test('5.1 a site with no changes and nothing to upload still refuses', () => {
  const { publish } = publishApi();
  const { site } = publishFixture('clean');
  const result = publish(site, { message: 'Nothing', push: true });
  assert.equal(result.ok, false);
  assert.match(result.problem, /Nothing has changed/);
  assert.equal(commitCount(site), 1);
});

test('5.1 a commit-only publish reports the commit and the missing upload apart', () => {
  const { publish } = publishApi();
  const { site, remote, page } = publishFixture('local');
  fs.writeFileSync(page, '<h1>v2</h1>\n');
  const result = publish(site, { message: 'Local only', push: false });
  assert.equal(result.ok, true, result.problem);
  assert.equal(result.committed, 1);
  assert.equal(result.pushed, false);
  assert.match(result.commit, /Committed/);
  assert.match(result.upload, /not uploaded|waiting/i);
  assert.equal(commitCount(site), 2);
  assert.equal(commitCount(remote, 'main'), 1);
});

test('5.1 publishing refuses while an edit has not reached recovery storage', () => {
  const { publish } = publishApi();
  const { site, remote, page } = publishFixture('unsaved');
  fs.writeFileSync(page, '<h1>typed but not saved</h1>\n');
  const result = publish(site, {
    message: 'Should not happen',
    push: true,
    unsavedBuffers: 2,
  });
  assert.equal(result.ok, false);
  assert.match(result.problem, /not saved|unsaved|still/i);
  assert.equal(commitCount(site), 1);
  assert.equal(commitCount(remote, 'main'), 1);
});

// 2.2 the comparison behind the Before/After toggle (ticket 21). Loaded late so
// an import fault is reported per test rather than aborting the whole run.
const compareLoad = await import('../src/main/compare.ts').catch((error) => ({
  error,
}));
function compareApi() {
  if (compareLoad.error) throw compareLoad.error;
  return compareLoad;
}
const pageEl = (overrides) => ({
  file: '/site/src/pages/index.astro',
  loc: '76:6',
  tag: 'h1',
  text: 'Heading',
  attributes: '',
  class: 'hero-title',
  style: '',
  ...overrides,
});
const ownedPage = ['src/pages/index.astro'];

test('2.2 a text change is part of the run comparison', () => {
  const { compareSnapshots, highlightsFor } = compareApi();
  const before = [pageEl({})];
  const after = [pageEl({ text: 'Heading, edited' })];
  const comparison = compareSnapshots(before, after, ownedPage);
  assert.deepEqual(
    comparison.changed.map((element) => element.loc),
    ['76:6'],
  );
  assert.equal(
    highlightsFor(comparison)[0].label,
    'Changed: h1 at src/pages/index.astro:76:6',
  );
});

test('2.2 an attribute-only change is part of the run comparison', () => {
  const { compareSnapshots } = compareApi();
  const comparison = compareSnapshots(
    [pageEl({})],
    [pageEl({ attributes: 'href=/work' })],
    ownedPage,
  );
  assert.equal(comparison.changed.length, 1);
  assert.deepEqual(comparison.removed, []);
});

test('2.2 a style-only change is part of the run comparison', () => {
  const { compareSnapshots } = compareApi();
  assert.equal(
    compareSnapshots([pageEl({})], [pageEl({ style: 'color: red' })], ownedPage)
      .changed.length,
    1,
    'an inline style change must be seen',
  );
  assert.equal(
    compareSnapshots([pageEl({})], [pageEl({ style: 'color: red' })], ownedPage)
      .changed[0].style,
    'color: red',
  );
});

test('2.2 a removed element is listed by name, since there is no node to outline', () => {
  const { compareSnapshots, highlightsFor } = compareApi();
  const comparison = compareSnapshots([pageEl({})], [], ownedPage);
  assert.deepEqual(comparison.changed, []);
  assert.equal(
    comparison.removed[0].label,
    'Removed: h1 at src/pages/index.astro:76:6',
  );
  const [part] = highlightsFor(comparison);
  assert.equal(part.removed, true);
  assert.match(part.label, /^Removed: h1 at src\/pages\/index\.astro:76:6$/);
});

test('2.2 a person’s edit in another file is not attributed to the run', () => {
  const { compareSnapshots } = compareApi();
  const comparison = compareSnapshots(
    [
      pageEl({}),
      pageEl({
        file: '/site/src/components/Header.astro',
        loc: '27:5',
        tag: 'a',
        text: 'Witch Daddy Labs',
      }),
    ],
    [
      pageEl({ text: 'Heading, edited' }),
      pageEl({
        file: '/site/src/components/Header.astro',
        loc: '27:5',
        tag: 'a',
        text: 'Witch Daddy Labs, by hand',
      }),
    ],
    ownedPage,
  );
  assert.deepEqual(
    comparison.changed.map((element) => element.file),
    ['/site/src/pages/index.astro'],
  );
  assert.equal(comparison.excluded, 1);
  assert.equal(compareSnapshots([], [], []).excluded, 0);
});

test('2.2 removing a line does not make the whole page look rewritten', () => {
  const { compareSnapshots } = compareApi();
  const before = [
    pageEl({ loc: '202:8', tag: 'h2', text: 'Kept close to home' }),
    pageEl({ loc: '203:9', tag: 'p', text: 'One' }),
    pageEl({ loc: '204:9', tag: 'p', text: 'Two' }),
  ];
  const after = [
    pageEl({ loc: '202:9', tag: 'p', text: 'One' }),
    pageEl({ loc: '203:9', tag: 'p', text: 'Two' }),
  ];
  const comparison = compareSnapshots(before, after, ownedPage);
  assert.deepEqual(comparison.changed, []);
  assert.deepEqual(
    comparison.removed.map((element) => element.label),
    ['Removed: h2 at src/pages/index.astro:202:8'],
  );
});

test('2.2 a removal beside a change keeps each on its own element', () => {
  const { compareSnapshots } = compareApi();
  const before = [
    pageEl({ loc: '75:7', tag: 'p', text: 'A tiny coven' }),
    pageEl({ loc: '76:7', tag: 'h1', text: 'Clinic apps' }),
  ];
  const after = [
    pageEl({ loc: '75:7', tag: 'h1', text: 'Clinic apps, edited' }),
  ];
  const comparison = compareSnapshots(before, after, ownedPage);
  assert.deepEqual(
    comparison.changed.map((element) => element.tag),
    ['h1'],
  );
  assert.deepEqual(
    comparison.removed.map((element) => element.tag),
    ['p'],
  );
});

process.exitCode = failures ? 1 : 0;
