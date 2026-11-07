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
  const { readEntry, saveEntry } = await import('../src/main/content.ts');
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
} finally {
  fs.rmSync(root, { recursive: true, force: true });
}
process.exitCode = failures ? 1 : 0;
