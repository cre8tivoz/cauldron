// Regression checks for the file-safety requirements in plan 1.3–1.5 and 2.1.
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
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
  `export const app = {
    isPackaged: false,
    getAppPath: () => process.cwd(),
    getVersion: () => ${JSON.stringify(
      JSON.parse(fs.readFileSync('package.json', 'utf8')).version,
    )},
    getPath: () => globalThis.__cauldronUserData ?? ${JSON.stringify(
      path.join(
        fs.mkdtempSync(path.join(os.tmpdir(), 'cauldron-electron-home-')),
        'userData',
      ),
    )},
    on: () => {},
    once: () => {},
    whenReady: async () => {},
    requestSingleInstanceLock: () => true,
    quit: () => {},
    exit: () => {},
  };
  export class BrowserWindow { static getAllWindows() { return []; } }
  export class WebContentsView {}
  export const Menu = { buildFromTemplate: () => ({}), setApplicationMenu: () => {} };
  export const dialog = { showErrorBox: () => {} };
  export const ipcMain = { handle: () => {}, on: () => {} };
  export const shell = { openExternal: async () => {} };
  export const webContents = {};
  export default { app, BrowserWindow, WebContentsView, Menu, dialog, ipcMain, shell, webContents };\n`,
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
const {
  runAction,
  actionCatalogue,
  isReadOnlyAction,
  editCssRule,
  createPageFile,
  readPageSections,
  reorderPageSections,
  deletePageSection,
  setPageSectionAnchor,
  duplicatePageSection,
  insertPageSection,
} = await import('../src/main/actions.ts');
const { History } = await import('../src/main/history.ts');
const { hashOf, isInside } = await import('../src/main/files.ts');
const {
  findMissingPackages,
  planMissingPackageInstall,
  startInstallMissingPackages,
} = await import('../src/main/dependencies.ts');
const { resolveAstroOutDir, resolveSiteBuildConfig, buildSiteAsync } =
  await import('../src/main/quality.ts');
const {
  repoStateAsync,
  publishAsync,
  exportStaticSiteAsync,
  deployCloudflarePagesAsync,
  parseCloudflarePagesUrl,
  classifyWranglerFailure,
} = await import('../src/main/publishing.ts');
const { downloadAndSaveStockPhoto, extensionForImageMime } =
  await import('../src/main/assets.ts');
const { configurePreviewSecurity } = await import('../src/main/preview.ts');
const {
  isAuthorizedEditorIpc,
  isEditorUiAvailable,
  formatUnexpectedError,
  registerUnexpectedErrorHandlers,
} = await import('../src/main/index.ts');

const wdl188Root = fs.mkdtempSync(path.join(os.tmpdir(), 'cauldron-wdl188-'));
const wdl188Results = await (async () => {
  const pngRes = await downloadAndSaveStockPhoto(wdl188Root, {
    photoId: 'hero-shot',
    url: 'https://images.unsplash.com/photo-1',
    fetchImpl: async () =>
      new Response(Uint8Array.from([137, 80, 78, 71]), {
        status: 200,
        headers: { 'content-type': 'image/png; charset=utf-8' },
      }),
  });
  const secondPngRes = await downloadAndSaveStockPhoto(wdl188Root, {
    photoId: 'hero-shot',
    url: 'https://images.unsplash.com/photo-1',
    fetchImpl: async () =>
      new Response(Uint8Array.from([137, 80, 78, 72]), {
        status: 200,
        headers: { 'content-type': 'image/png' },
      }),
  });
  const webpRes = await downloadAndSaveStockPhoto(wdl188Root, {
    photoId: 'hero-webp',
    url: 'https://images.unsplash.com/photo-2',
    fetchImpl: async () =>
      new Response(Uint8Array.from([82, 73, 70, 70]), {
        status: 200,
        headers: { 'content-type': 'image/webp' },
      }),
  });
  const badStatusRes = await downloadAndSaveStockPhoto(wdl188Root, {
    photoId: 'missing',
    url: 'https://images.unsplash.com/missing',
    fetchImpl: async () =>
      new Response('Not Found', { status: 404, statusText: 'Not Found' }),
  });
  const htmlRes = await downloadAndSaveStockPhoto(wdl188Root, {
    photoId: 'spoof',
    url: 'https://images.unsplash.com/html',
    fetchImpl: async () =>
      new Response('<html>oops</html>', {
        status: 200,
        headers: { 'content-type': 'text/html' },
      }),
  });
  const httpSchemeRes = await downloadAndSaveStockPhoto(wdl188Root, {
    photoId: 'insecure',
    url: 'http://images.unsplash.com/photo-1',
    fetchImpl: async () => {
      throw new Error('should not fetch non-https');
    },
  });
  return {
    pngRes,
    secondPngRes,
    webpRes,
    badStatusRes,
    htmlRes,
    httpSchemeRes,
  };
})();
// Ticket 27/28: the outside-agent connection must offer the same source actions.
const mcpModule = await import('../src/main/mcp.ts').catch((error) => ({
  error,
}));
// Ticket 13 modules: imported leniently so a missing implementation fails a test
// rather than aborting the whole run.
const draftSchedule = await import('../src/draft-schedule.ts').catch(
  () => null,
);
const draftRestore = await import('../src/draft-restore.ts').catch(() => null);
const agentStream = await import('../src/agent-stream.ts').catch(() => null);
// Ticket 14 modules: imported leniently so a missing implementation fails a test.
const recovery = await import('../src/main/recovery.ts').catch(() => null);
const directions = await import('../src/main/directions.ts').catch(() => null);
// Ticket 23: contrast thresholds and how measured, failed and opinion results
// are told apart.
const contrast = await import('../src/main/contrast.ts').catch(() => null);
const qualityRules = await import('../src/main/quality.ts').catch(() => null);
// Ticket 24: judging the agent's own changes, not the whole site.
const tasteChange = await import('../src/main/taste-change.ts').catch(
  () => null,
);
// Ticket 29: shared checker helpers, imported once so the tests stay
// synchronous (the harness below only sees synchronous results).
const tasteCheck = await import('../src/main/taste-check.ts').catch(() => null);
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
const batchEResults = await (async () => {
  // WDL-216 + WDL-204: custom outDir build + async export & deploy + async Git
  const siteRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'cauldron-batche-'));
  fs.mkdirSync(path.join(siteRoot, 'src/pages'), { recursive: true });
  fs.writeFileSync(
    path.join(siteRoot, 'astro.config.mjs'),
    "// outDir: 'commented-out'\nexport default {\n  outDir: './custom-out',\n};\n",
    'utf8',
  );
  fs.writeFileSync(
    path.join(siteRoot, 'package.json'),
    JSON.stringify({
      name: 'batch-e-site',
      scripts: {
        build:
          "node -e \"const fs=require('node:fs'); fs.mkdirSync('custom-out',{recursive:true}); fs.writeFileSync('custom-out/index.html','<!doctype html><h1>Custom Out</h1>');\"",
      },
    }),
    'utf8',
  );
  fs.writeFileSync(
    path.join(siteRoot, 'src/pages/index.astro'),
    '<h1>Hello</h1>\n',
    'utf8',
  );

  const customOutDir = resolveAstroOutDir(siteRoot);
  const buildAsyncRes = await buildSiteAsync(siteRoot);
  const exportAsyncRes = await exportStaticSiteAsync(siteRoot);

  // deployCloudflarePagesAsync with injected runner (WDL-151 + WDL-204)
  const deployNoUrl = await deployCloudflarePagesAsync(
    siteRoot,
    'batch-e-site',
    {
      runner: async () => ({
        status: 0,
        stdout: 'Uploading files...\nDeployment complete!\n',
        stderr: '',
      }),
    },
  );
  const wranglerAfterNoOpt = fs.existsSync(
    path.join(siteRoot, 'wrangler.toml'),
  );
  const deployWithUrl = await deployCloudflarePagesAsync(
    siteRoot,
    'batch-e-site',
    {
      runner: async () => ({
        status: 0,
        stdout:
          'Deployment complete! Take a peek over at https://batch-e-site.pages.dev\n',
        stderr: '',
      }),
    },
  );
  const deployProjectError = await deployCloudflarePagesAsync(
    siteRoot,
    'batch-e-site',
    {
      runner: async () => ({
        status: 1,
        stdout: '',
        stderr: '✘ [ERROR] Project not found. Please verify your project name.',
      }),
    },
  );

  // WDL-204: repoStateAsync & publishAsync against an initialized temp Git repo
  const { execFileSync } = await import('node:child_process');
  execFileSync('git', ['init'], { cwd: siteRoot });
  execFileSync('git', ['config', 'user.name', 'Test User'], { cwd: siteRoot });
  execFileSync('git', ['config', 'user.email', 'test@example.com'], {
    cwd: siteRoot,
  });
  const repoBefore = await repoStateAsync(siteRoot);
  const pubRes = await publishAsync(siteRoot, {
    message: 'Initial Batch E commit',
    push: false,
  });
  const repoAfter = await repoStateAsync(siteRoot);

  // WDL-200: timeout + cancel on a hung installer subprocess
  const stubDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cauldron-stub-bin-'));
  const sleeperPath = path.join(stubDir, 'fake-pkg-mgr');
  fs.writeFileSync(
    sleeperPath,
    '#!/usr/bin/env node\nsetTimeout(() => {}, 10000);\n',
    { mode: 0o755 },
  );
  const timeoutRes = await startInstallMissingPackages(
    siteRoot,
    ['lucide-react'],
    {
      timeoutMs: 120,
      resolveToolOverride: (tool) => (tool === 'npm' ? sleeperPath : null),
    },
  ).promise;

  const cancelHandle = startInstallMissingPackages(siteRoot, ['lucide-react'], {
    timeoutMs: 10000,
    resolveToolOverride: (tool) => (tool === 'npm' ? sleeperPath : null),
  });
  setTimeout(() => cancelHandle.cancel(), 80);
  const cancelRes = await cancelHandle.promise;

  return {
    siteRoot,
    customOutDir,
    buildAsyncRes,
    exportAsyncRes,
    deployNoUrl,
    wranglerAfterNoOpt,
    deployWithUrl,
    deployProjectError,
    repoBefore,
    pubRes,
    repoAfter,
    timeoutRes,
    cancelRes,
  };
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
    const first = addPiece(root, options);
    assert.equal(first.ok, true);
    assert.equal(first.reusedExisting, false);
    assert.ok(
      fs
        .readFileSync(nested, 'utf8')
        .includes('../../components/Editorialintro.astro'),
    );
    const component = path.join(root, 'src/components/Editorialintro.astro');
    fs.appendFileSync(component, '\n<!-- owner edit -->');
    const edited = fs.readFileSync(component, 'utf8');
    const second = addPiece(root, options);
    assert.equal(second.ok, true);
    assert.equal(second.reusedExisting, true);
    assert.equal(fs.readFileSync(component, 'utf8'), edited);
  });
  test('WDL-209 unrelated existing component keeps custom file untouched and disambiguates', () => {
    const collisionRoot = fs.mkdtempSync(
      path.join(os.tmpdir(), 'cauldron-library-collision-'),
    );
    try {
      const customComponentDir = path.join(collisionRoot, 'src/components');
      const pagesDir = path.join(collisionRoot, 'src/pages');
      fs.mkdirSync(customComponentDir, { recursive: true });
      fs.mkdirSync(pagesDir, { recursive: true });
      const customFooter = path.join(
        customComponentDir,
        'Newsletterfooter.astro',
      );
      const customContent = '<footer>Custom hand-crafted footer</footer>\n';
      fs.writeFileSync(customFooter, customContent);
      const page = path.join(pagesDir, 'index.astro');
      fs.writeFileSync(page, '<main>Home</main>\n');

      const first = addPiece(collisionRoot, {
        pieceId: 'newsletter-footer',
        page: '/index/',
        mode: 'add',
      });
      assert.equal(first.ok, true);
      assert.equal(first.reusedExisting, false);
      assert.equal(
        first.componentFile,
        'src/components/Newsletterfooter2.astro',
      );
      // Pre-existing custom component is completely untouched.
      assert.equal(fs.readFileSync(customFooter, 'utf8'), customContent);
      const suffixed = path.join(customComponentDir, 'Newsletterfooter2.astro');
      assert.ok(fs.existsSync(suffixed));
      const pageText = fs.readFileSync(page, 'utf8');
      assert.ok(
        pageText.includes(
          "import Newsletterfooter2 from '../components/Newsletterfooter2.astro';",
        ),
      );
      assert.ok(pageText.includes('<Newsletterfooter2 />'));

      // Re-adding the same library piece reuses the suffixed Cauldron file rather than creating #3.
      fs.appendFileSync(suffixed, '\n<!-- owner tweak -->');
      const editedSuffixed = fs.readFileSync(suffixed, 'utf8');
      const about = path.join(pagesDir, 'about.astro');
      fs.writeFileSync(about, '<main>About</main>\n');
      const second = addPiece(collisionRoot, {
        pieceId: 'newsletter-footer',
        page: '/about/',
        mode: 'add',
      });
      assert.equal(second.ok, true);
      assert.equal(second.reusedExisting, true);
      assert.equal(
        second.componentFile,
        'src/components/Newsletterfooter2.astro',
      );
      assert.equal(fs.readFileSync(suffixed, 'utf8'), editedSuffixed);
      assert.equal(
        fs.existsSync(path.join(customComponentDir, 'Newsletterfooter3.astro')),
        false,
      );
    } finally {
      fs.rmSync(collisionRoot, { recursive: true, force: true });
    }
  });
  test('WDL-207 library add cleans up new component file if page write fails', () => {
    if (typeof process.getuid === 'function' && process.getuid() === 0) return;
    const rollbackRoot = fs.mkdtempSync(
      path.join(os.tmpdir(), 'cauldron-library-rollback-'),
    );
    const pagesDir = path.join(rollbackRoot, 'src/pages/locked');
    try {
      fs.mkdirSync(pagesDir, { recursive: true });
      const lockedPage = path.join(pagesDir, 'index.astro');
      fs.writeFileSync(lockedPage, '<main>Locked</main>\n');
      fs.chmodSync(pagesDir, 0o555);
      const failed = addPiece(rollbackRoot, {
        pieceId: 'editorial-intro',
        page: '/locked/',
        mode: 'add',
      });
      assert.equal(failed.ok, false);
      assert.ok(failed.problem?.includes('Could not write component files'));
      assert.equal(
        fs.existsSync(
          path.join(rollbackRoot, 'src/components/Editorialintro.astro'),
        ),
        false,
      );
    } finally {
      fs.chmodSync(pagesDir, 0o755);
      fs.rmSync(rollbackRoot, { recursive: true, force: true });
    }
  });
  test('4.3 a piece is placed inside the page, never after its layout', () => {
    const page = path.join(root, 'src/pages/layout-page.astro');
    fs.writeFileSync(
      page,
      '---\nimport Base from "../layouts/Base.astro";\n---\n<Base title="Hello">\n  <section>\n    <h1>Hello</h1>\n  </section>\n</Base>\n',
    );
    assert.equal(
      addPiece(root, {
        pieceId: 'glow-action',
        page: '/layout-page/',
        mode: 'add',
      }).ok,
      true,
    );
    const text = fs.readFileSync(page, 'utf8');
    assert.ok(
      text.indexOf('<Glowingcalltoaction />') < text.indexOf('</Base>'),
      'the piece belongs inside the page body',
    );
    assert.ok(text.endsWith('</Base>\n'), 'the layout still closes the page');
  });
  test('4.3 replacing a piece drops the import of the piece it replaced', () => {
    const page = path.join(root, 'src/pages/replace-page.astro');
    fs.writeFileSync(page, '---\n---\n<main>\n  <h1>Hi</h1>\n</main>\n');
    assert.equal(
      addPiece(root, {
        pieceId: 'editorial-intro',
        page: '/replace-page/',
        mode: 'add',
      }).ok,
      true,
    );
    assert.ok(
      fs
        .readFileSync(page, 'utf8')
        .includes(
          "import Editorialintro from '../components/Editorialintro.astro';",
        ),
    );
    assert.equal(
      addPiece(root, {
        pieceId: 'glow-action',
        page: '/replace-page/',
        mode: 'replace',
        replaceSelector: 'Editorialintro',
      }).ok,
      true,
    );
    const replaced = fs.readFileSync(page, 'utf8');
    assert.ok(replaced.includes('<Glowingcalltoaction />'));
    assert.equal(
      replaced.includes('Editorialintro'),
      false,
      'a page must not import a component it no longer renders',
    );
    assert.ok(
      replaced.includes(
        "import Glowingcalltoaction from '../components/Glowingcalltoaction.astro';",
      ),
    );
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

// Ticket 29: a job that fails at the provider (signed out, cancelled) is diffed
// and saved as finished before the failure is known. The saved record must be
// corrected too, or the run history reports success for a job that did nothing.
test('2.2 a run that fails after its diff is saved as failed, not finished', () => {
  const { Runs } = runsApi();
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'cauldron-runs-home-'));
  globalThis.__cauldronUserData = home;
  const site = runSite('failed-persist');
  const runs = new Runs();
  const run = runs.start(site, 'claude', 'signed-out job');
  const finished = runs.finish(site, run.id);
  assert.equal(finished.status, 'finished');
  assert.equal(finished.note, 'No files changed.');
  runs.fail(run.id, 'Not logged in · Please run /login');
  assert.equal(runs.get(run.id).status, 'failed');
  const dir = path.join(
    home,
    'runs',
    crypto
      .createHash('sha256')
      .update(Buffer.from(site))
      .digest('hex')
      .slice(0, 12),
  );
  const saved = JSON.parse(
    fs.readFileSync(path.join(dir, `${run.id}.json`), 'utf8'),
  );
  assert.equal(saved.status, 'failed', `saved record says ${saved.status}`);
  assert.match(saved.note, /Not logged in/);
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

test('4.4 text contrast uses the approved size and weight thresholds', () => {
  assert.ok(contrast, 'the contrast measurement module is missing');
  assert.equal(contrast.textContrastRequired(17, 400), 4.5);
  assert.equal(contrast.textContrastRequired(24, 400), 3);
  assert.equal(contrast.textContrastRequired(20, 700), 3);
  assert.equal(contrast.textContrastRequired(18, 700), 4.5);
});

test('4.4 a pale focus ring fails instead of counting as visible', () => {
  assert.ok(contrast, 'the contrast measurement module is missing');
  const verdict = contrast.judgeFocus({
    where: 'button.go',
    outlineStyle: 'solid',
    outlineWidth: 2,
    outlineColor: 'rgb(244, 244, 244)',
    boxShadow: 'none',
    background: 'rgb(255, 255, 255)',
    parentBackground: 'rgb(248, 244, 233)',
    beforeBackground: 'rgb(255, 255, 255)',
  });
  assert.equal(verdict.state, 'low-contrast');
  assert.ok(verdict.ratio < 3, `ratio was ${verdict.ratio}`);
});

test('4.4 no focus indicator at all is still a failure', () => {
  assert.ok(contrast, 'the contrast measurement module is missing');
  const verdict = contrast.judgeFocus({
    where: 'a',
    outlineStyle: 'none',
    outlineWidth: 0,
    outlineColor: 'rgb(0, 0, 0)',
    boxShadow: 'none',
    background: 'rgba(0, 0, 0, 0)',
    parentBackground: 'rgb(255, 255, 255)',
    beforeBackground: 'rgba(0, 0, 0, 0)',
  });
  assert.equal(verdict.state, 'missing');
});

test('4.4 a strong focus ring passes the 3:1 threshold', () => {
  assert.ok(contrast, 'the contrast measurement module is missing');
  const verdict = contrast.judgeFocus({
    where: 'button',
    outlineStyle: 'solid',
    outlineWidth: 2,
    outlineColor: 'rgb(42, 23, 18)',
    boxShadow: 'none',
    background: 'rgb(248, 244, 233)',
    parentBackground: 'rgb(248, 244, 233)',
    beforeBackground: 'rgb(248, 244, 233)',
  });
  assert.equal(verdict.state, 'ok');
  assert.ok(verdict.ratio >= 3, `ratio was ${verdict.ratio}`);
});

test('4.4 a translucent text colour is measured over its background', () => {
  assert.ok(contrast, 'the contrast measurement module is missing');
  const ratio = contrast.contrastRatio('rgba(0, 0, 0, 0.5)', '#ffffff');
  assert.ok(ratio > 3.5 && ratio < 4.5, `ratio was ${ratio}`);
});

test('4.4 button text is held to 4.5:1 even when it looks like large text', () => {
  assert.ok(qualityRules, 'the quality report module is missing');
  const text = qualityRules.summariseTextContrast([
    {
      where: 'p.headline',
      color: '#7a7a7a',
      background: '#ffffff',
      fontSize: 20,
      fontWeight: 700,
    },
  ]);
  const buttons = qualityRules.summariseButtonContrast([
    {
      where: 'button.go',
      name: 'Go',
      color: '#7a7a7a',
      background: '#ffffff',
    },
  ]);
  assert.equal(text.failures.length, 0, 'large bold text should allow 3:1');
  assert.equal(
    buttons.failures.length,
    1,
    'button text must still reach 4.5:1',
  );
  assert.ok(buttons.failures[0].ratio > 3 && buttons.failures[0].ratio < 4.5);
});

test('4.4 every text node is judged, including short labels past the first sixty', () => {
  assert.ok(qualityRules, 'the quality report module is missing');
  const nodes = Array.from({ length: 80 }, (_, index) => ({
    where: `p.text-${index}`,
    color: '#2a1712',
    background: '#f8f4e9',
    fontSize: 17,
    fontWeight: 400,
  }));
  nodes[70] = {
    ...nodes[70],
    where: 'button.go',
    color: '#999999',
    background: '#ffffff',
  };
  const summary = qualityRules.summariseTextContrast(nodes);
  assert.equal(summary.checked, 80);
  assert.deepEqual(
    summary.failures.map((failure) => failure.where),
    ['button.go'],
  );
});

test('4.4 an offset focus ring is judged against the page behind it', () => {
  assert.ok(contrast, 'the contrast measurement module is missing');
  const verdict = contrast.judgeFocus({
    where: 'a.btn-primary',
    outlineStyle: 'solid',
    outlineWidth: 2,
    outlineColor: 'rgb(200, 255, 0)',
    outlineOffset: 3,
    boxShadow: 'none',
    background: 'rgb(200, 255, 0)',
    parentBackground: 'rgb(13, 13, 13)',
    beforeBackground: 'rgb(200, 255, 0)',
  });
  assert.equal(verdict.state, 'ok');
});

test('24 changed output: only the class and id names a run added are judged', () => {
  assert.ok(tasteChange, 'taste-change could not be imported');
  const changed = [
    {
      file: 'src/components/Booking.astro',
      before: '<section class="card"><h2>Old</h2></section>',
      after:
        '<section class="card booking-callout" id="booking"><h2>New</h2><a class="booking-link" href="#">Book</a></section>',
    },
  ];
  const selectors = tasteChange.changedSelectors(changed);
  assert.ok(selectors.includes('.booking-callout'), selectors.join(', '));
  assert.ok(selectors.includes('.booking-link'), selectors.join(', '));
  assert.ok(selectors.includes('#booking'), selectors.join(', '));
  assert.ok(
    !selectors.includes('.card'),
    'an existing class was treated as the run’s own',
  );
});

test('24 changed output: the CSS judged is the CSS the run wrote', () => {
  assert.ok(tasteChange, 'taste-change could not be imported');
  const css = tasteChange.changedStyleText([
    {
      file: 'src/components/Booking.astro',
      before: null,
      after: '<style>.booking{color:#2563eb}</style><p>hi</p>',
    },
    {
      file: 'src/styles/extra.css',
      before: 'a{color:red}',
      after: '.more{padding:13px}',
    },
    { file: 'public/photo.png', before: null, after: 'not really a png' },
    { file: 'README.md', before: null, after: '# notes only' },
  ]);
  assert.deepEqual(
    css.map((item) => item.file),
    ['src/components/Booking.astro', 'src/styles/extra.css'],
  );
  assert.match(css[0].css, /\.booking\{color:#2563eb\}/);
  assert.match(css[1].css, /padding:13px/);
});

test('24 changed output: off-brand declarations in the agent’s CSS fail', () => {
  assert.ok(tasteChange, 'taste-change could not be imported');
  const direction = directions.findDirection('long-lunch');
  const findings = tasteChange.checkTasteOfCss(
    `.booking { color: #2563eb; background: #ffffff; padding: 13px; border-radius: 7px; font-size: 19px; }
     .booking-hero { background: linear-gradient(90deg, #2563eb, #7c3aed); }`,
    direction,
    '/booking',
  );
  const failed = findings
    .filter((finding) => finding.status === 'fail')
    .map((finding) => finding.label);
  for (const expected of [
    'No unchosen generic SaaS accents',
    'No tired blue-purple gradients',
    'Spacing follows the direction',
    'Type sizes use the direction',
    'Radii follow the direction',
    'Colours follow the direction',
    'Tokens rather than hard-coded values',
  ])
    assert.ok(
      failed.some((label) => label.includes(expected)),
      `${expected} did not fail: ${failed.join(', ')}`,
    );
  assert.ok(
    findings.every(
      (finding) =>
        finding.scope === 'change' &&
        finding.label.startsWith('Agent changes: '),
    ),
    'a changed-output finding was not labelled as the agent’s',
  );
});

test('24 changed output: an on-brand change using the direction’s tokens passes', () => {
  assert.ok(tasteChange, 'taste-change could not be imported');
  const direction = directions.findDirection('long-lunch');
  const findings = tasteChange.checkTasteOfCss(
    `.booking { background: var(--cauldron-c-surface); color: var(--cauldron-c-ink); padding: var(--cauldron-space-4); border-radius: var(--cauldron-radius-2); font-size: var(--cauldron-size-3); }`,
    direction,
    '/booking',
  );
  assert.deepEqual(
    findings
      .filter((finding) => finding.status === 'fail')
      .map((finding) => `${finding.label}: ${finding.detail}`),
    [],
  );
});

// A direction shaped like the one a reference URL produces: measured colours and
// scales, fonts that were named but not licensed or downloaded.
const measuredDirection = {
  id: 'reference-abc123',
  name: 'Measured reference',
  forWhom: 'This site',
  learnedFrom: 'http://127.0.0.1/',
  colours: {
    bg: '#fbf7f2',
    ink: '#333333',
    primary: '#0f5132',
    'reference-1': '#fbf7f2',
  },
  fonts: {
    display: {
      family: 'Georgia',
      package: 'Reference font — supply your own licensed font files',
      weights: [400, 700],
    },
    body: {
      family: 'Verdana',
      package: 'Reference font — supply your own licensed font files',
      weights: [400, 700],
    },
  },
  typeScale: [16, 48],
  spacing: [0, 24],
  radii: [0, 8],
  motion: { quick: '0ms', settle: '0ms', easing: 'linear' },
  character: 'Measured.',
  watch: 'Supply the font files.',
};

test('24 reference URL: the measured direction becomes usable site tokens', () => {
  const tokens = directions.tokensCss(measuredDirection);
  assert.match(tokens, /--cauldron-c-ink: #333333/);
  assert.match(tokens, /--cauldron-c-reference-1: #fbf7f2/);
  assert.match(tokens, /--cauldron-size-2: 3rem/);
  assert.ok(
    !/fonts\.googleapis/.test(tokens),
    'a font that was measured, not licensed, must not be fetched from Google',
  );
});

test('24 reference URL: the checks use the measured direction’s tokens', () => {
  assert.ok(tasteChange, 'taste-change could not be imported');
  const accepted = tasteChange.checkTasteOfCss(
    `.callout { background: var(--cauldron-c-bg); color: var(--cauldron-c-ink); padding: var(--cauldron-space-1); border-radius: var(--cauldron-radius-1); font-size: var(--cauldron-size-1); }`,
    measuredDirection,
    '/',
  );
  assert.deepEqual(
    accepted
      .filter((finding) => finding.status === 'fail')
      .map((finding) => finding.label),
    [],
  );
  const stray = tasteChange.checkTasteOfCss(
    `.callout { color: #b84b30 }`,
    measuredDirection,
    '/',
  );
  assert.equal(
    stray.find((finding) => finding.label.includes('Colours follow'))?.status,
    'fail',
    'a colour outside the measured palette was accepted',
  );
});

test('24 changed output: a run’s page is found even when it also changed a component', () => {
  assert.ok(tasteChange, 'taste-change could not be imported');
  const result = tasteChange.changedPages([
    { file: 'src/components/Booking.astro', before: null, after: '' },
    { file: 'src/pages/booking.astro', before: null, after: '' },
  ]);
  assert.deepEqual(result.pages, ['/booking']);
  assert.equal(result.shared, true);
  const home = tasteChange.changedPages([
    { file: 'src/pages/index.astro', before: null, after: '' },
  ]);
  assert.deepEqual(home.pages, ['/']);
  assert.equal(home.shared, false);
});

test('24 the focus check’s contrast maths uses the approved 3:1 bar', () => {
  assert.ok(tasteChange, 'taste-change could not be imported');
  const near = tasteChange.contrastRatio([254, 254, 253], [255, 255, 255]);
  assert.ok(near < 1.1, `a near-white ring measured ${near}:1`);
  const visible = tasteChange.contrastRatio([42, 23, 18], [255, 253, 247]);
  assert.ok(visible >= 3, `the direction’s ink measured ${visible}:1`);
  assert.ok(tasteChange.contrastRatio([0, 0, 0], [255, 255, 255]) > 20);
  assert.deepEqual(tasteChange.parseColour('rgb(51, 51, 51)'), [51, 51, 51, 1]);
  assert.deepEqual(tasteChange.parseColour('#333'), [51, 51, 51, 1]);
});

// Ticket 29: the real-brief reports showed directions used as small-text
// colours at 3.1–4.1:1, and one site multiplied every rem token by setting
// html font-size to a size token. The guidance must state the measured limits.
test('29 every direction document states measured text pairs and the rem root rule', async () => {
  assert.ok(directions && contrast, 'directions/contrast module missing');
  for (const direction of directions.DIRECTIONS) {
    const doc = directions.designDocument(direction);
    assert.match(doc, /16px root/, `${direction.id}: no rem root rule`);
    assert.match(
      doc,
      /Never set `html \{ font-size/,
      `${direction.id}: no html font-size warning`,
    );
    for (const foreground of ['ink', 'muted', 'primary']) {
      for (const background of ['bg', 'surface']) {
        if (!direction.colours[foreground] || !direction.colours[background])
          continue;
        const raw = contrast.contrastRatio(
          direction.colours[foreground],
          direction.colours[background],
        );
        const ratio = contrast.round1(raw);
        const line = new RegExp(
          `\\| ${foreground} on ${background} \\| ${ratio}:1 \\| (small text and above|large text \\(24px\\+, or 18\\.66px\\+ bold\\) only|decorative fills only, no text) \\|`,
        ).exec(doc);
        assert.ok(
          line,
          `${direction.id}: no measured row for ${foreground} on ${background}`,
        );
        const expected =
          raw >= contrast.TEXT_CONTRAST
            ? 'small text and above'
            : raw >= contrast.LARGE_TEXT_CONTRAST
              ? 'large text (24px+, or 18.66px+ bold) only'
              : 'decorative fills only, no text';
        assert.equal(
          line[1],
          expected,
          `${direction.id}: ${foreground} on ${background} is ${raw}:1 but its use is wrong`,
        );
      }
    }
    for (const on of ['surface', 'bg']) {
      if (!direction.colours[on] || !direction.colours.primary) continue;
      const raw = contrast.contrastRatio(
        direction.colours[on],
        direction.colours.primary,
      );
      const ratio = contrast.round1(raw);
      const line = new RegExp(
        `\\| ${on} on primary fill \\| ${ratio}:1 \\| (button labels allowed|not for button labels) \\|`,
      ).exec(doc);
      assert.ok(line, `${direction.id}: no measured button fill pair`);
      assert.equal(
        line[1] === 'button labels allowed',
        raw >= contrast.BUTTON_CONTRAST,
        `${direction.id}: ${on} on primary is ${raw}:1 but its use is wrong`,
      );
    }
  }
  const openHouse = directions.designDocument(
    directions.findDirection('open-house'),
  );
  assert.match(
    openHouse,
    /\| primary on bg \| 3\.8:1 \| large text/,
    'the Moretti direction’s failing primary-on-bg pair is not marked',
  );
  assert.match(
    openHouse,
    /\| surface on primary fill \| 4\.1:1 \| not for button labels \|/,
    'the Moretti direction’s failing button pair is not marked',
  );
});

// Ticket 29 follow-up: a direction's structure prose must only name tokens it
// actually ships, or the site is told to use a colour/scale step it lacks.
test('29 direction structure prose names only shipped tokens', () => {
  assert.ok(directions, 'directions module missing');
  for (const direction of directions.DIRECTIONS) {
    const prose = Object.values(direction.structure).join('\n');
    for (const colour of prose.match(/\bprimary-(?:deep|soft)\b/g) ?? []) {
      assert.ok(
        direction.colours[colour],
        `${direction.id}: structure names ${colour}, which is not shipped`,
      );
    }
    for (const [, index] of prose.matchAll(/\bsize-(\d+)\b/g)) {
      assert.ok(
        Number(index) >= 1 && Number(index) <= direction.typeScale.length,
        `${direction.id}: size-${index} is outside ${direction.typeScale.length} sizes`,
      );
    }
    for (const [, index] of prose.matchAll(/\bspace-(\d+)\b/g)) {
      assert.ok(
        Number(index) < direction.spacing.length,
        `${direction.id}: space-${index} is outside ${direction.spacing.length} steps`,
      );
    }
    for (const [, index] of prose.matchAll(/\bradius-(\d+)\b/g)) {
      assert.ok(
        Number(index) < direction.radii.length,
        `${direction.id}: radius-${index} is outside ${direction.radii.length} radii`,
      );
    }
    if (/\bdetail\b/i.test(prose)) {
      assert.ok(
        direction.fonts.detail,
        `${direction.id}: structure names a detail face it does not ship`,
      );
    }
  }
});

test('29 contrast use is classified on the raw ratio, not the rounded display', async () => {
  assert.ok(directions && contrast, 'directions/contrast module missing');
  // #777 on white is 4.4781:1 and prints as 4.5:1. #959595 is 2.9953:1 and
  // prints as 3.0:1. Both must stay on the failing side of their threshold.
  const direction = {
    ...directions.findDirection('open-house'),
    colours: {
      ...directions.findDirection('open-house').colours,
      bg: '#ffffff',
      surface: '#ffffff',
      ink: '#777777',
      muted: '#959595',
      primary: '#777777',
    },
  };
  const doc = directions.designDocument(direction);
  assert.match(
    doc,
    /\| ink on bg \| 4\.5:1 \| large text \(24px\+, or 18\.66px\+ bold\) only \|/,
    '4.478:1 printed as 4.5 is wrongly allowed for small text',
  );
  assert.match(
    doc,
    /\| muted on bg \| 3:1 \| decorative fills only, no text \|/,
    '2.995:1 printed as 3 is wrongly allowed for large text',
  );
  assert.match(
    doc,
    /\| surface on primary fill \| 4\.5:1 \| not for button labels \|/,
    '4.478:1 printed as 4.5 is wrongly allowed for button labels',
  );
  assert.doesNotMatch(doc, /small text and above \|/);
});

// Ticket 29 enrichment: every direction is a system, not just a palette, and
// the three approved artist/designer sources are selectable beside the seven.
test('29 all ten directions carry source-led structure and render it', async () => {
  assert.ok(directions, 'directions module missing');
  const { buildPrompt } = await import('../src/main/agent.ts');
  assert.equal(directions.DIRECTIONS.length, 10, 'the catalogue is not ten');
  for (const id of ['componine', 'niki-studio', 'henry-from-online']) {
    assert.ok(directions.findDirection(id), `${id} is not in the catalogue`);
  }
  for (const direction of directions.DIRECTIONS) {
    for (const field of [
      'density',
      'displayType',
      'surfaces',
      'states',
      'mobile',
    ]) {
      assert.ok(
        typeof direction.structure[field] === 'string' &&
          direction.structure[field].length > 40,
        `${direction.id}: structure.${field} is empty or too short`,
      );
    }
    const doc = directions.designDocument(direction);
    assert.match(
      doc,
      /## Layout and structure/,
      `${direction.id}: DESIGN.md has no structure section`,
    );
    assert.ok(
      doc.includes(direction.structure.density),
      `${direction.id}: density missing from DESIGN.md`,
    );
    assert.ok(
      doc.includes(direction.structure.mobile),
      `${direction.id}: mobile guidance missing from DESIGN.md`,
    );
    const prompt = buildPrompt({
      request: 'build the site',
      siteName: 'fixture',
      direction,
      selection: null,
      catalogue: [],
    });
    for (const field of [
      'density',
      'displayType',
      'surfaces',
      'states',
      'mobile',
    ]) {
      assert.ok(
        prompt.includes(direction.structure[field]),
        `${direction.id}: buildPrompt drops structure.${field}`,
      );
    }
  }
  // Ten palettes on one skeleton was the original defect. Guidance must be
  // genuinely per-direction, not the same boilerplate under ten names.
  assert.equal(
    new Set(directions.DIRECTIONS.map((entry) => entry.structure.density)).size,
    10,
    'directions share the same density guidance',
  );
  assert.equal(
    new Set(directions.DIRECTIONS.map((entry) => entry.structure.states)).size,
    10,
    'directions share the same state guidance',
  );
});

test('29 approved artist directions use free faces and true source credit', () => {
  assert.ok(directions, 'directions module missing');
  const paid = [
    'Memoir',
    'Monument Extended',
    'Louize',
    'Neue Montreal',
    'Apercu',
    'Riposte',
    'DenimWeb',
    'Söhne',
  ];
  for (const id of ['componine', 'niki-studio', 'henry-from-online']) {
    const direction = directions.findDirection(id);
    assert.match(direction.learnedFrom, /https?:\/\//, `${id}: no source link`);
    for (const font of [direction.fonts.display, direction.fonts.body]) {
      assert.ok(
        !paid.some((name) => font.family.includes(name)),
        `${id}: ships a paid source face (${font.family})`,
      );
    }
  }
  const longLunch = directions.findDirection('long-lunch');
  assert.equal(longLunch.fonts.detail.family, 'IBM Plex Mono');
  assert.doesNotMatch(
    directions.designDocument(longLunch),
    /Apercu Mono/,
    'the paid source face leaked into DESIGN.md',
  );
});

test('29 structure and detail survive save, reload and old saves', () => {
  assert.ok(directions, 'directions module missing');
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'cauldron-enrich-'));
  const niki = directions.findDirection('niki-studio');
  assert.ok(directions.writeDirection(root, niki).ok);
  const reloaded = directions.readDirection(root).direction;
  assert.deepEqual(reloaded.structure, niki.structure);
  assert.deepEqual(reloaded.typeScale, niki.typeScale);
  const design = fs.readFileSync(path.join(root, 'cauldron/DESIGN.md'), 'utf8');
  assert.match(design, /92px|5\.75rem/, 'the display step is not documented');
  assert.match(
    design,
    /Archivo Black/,
    'the chosen free display face is absent',
  );
  const tokens = fs.readFileSync(
    path.join(root, 'cauldron/tokens.css'),
    'utf8',
  );
  assert.match(
    tokens,
    /--cauldron-font-display: 'Archivo Black', ui-sans-serif/,
  );
  const solidTokens = directions.tokensCss(
    directions.findDirection('solid-ground'),
  );
  assert.match(
    solidTokens,
    /--cauldron-font-display: 'Archivo', ui-sans-serif/,
    'a sans display still falls back to a serif',
  );

  // A site saved before ticket 29 has no structure or detail font. It must
  // still load, keep its saved colours, and gain the known preset guidance.
  const oldRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'cauldron-old-'));
  const preset = directions.findDirection('long-lunch');
  const legacy = {
    id: 'long-lunch',
    name: 'Long Lunch',
    forWhom: preset.forWhom,
    learnedFrom: preset.learnedFrom,
    colours: { ...preset.colours, ink: '#123456' },
    fonts: {
      display: preset.fonts.display,
      body: preset.fonts.body,
    },
    typeScale: preset.typeScale,
    spacing: preset.spacing,
    radii: preset.radii,
    motion: preset.motion,
    character: preset.character,
    watch: preset.watch,
  };
  fs.mkdirSync(path.join(oldRoot, 'cauldron'), { recursive: true });
  fs.writeFileSync(
    path.join(oldRoot, 'cauldron/design.json'),
    JSON.stringify({ id: legacy.id, name: legacy.name, tokens: legacy }),
  );
  const old = directions.readDirection(oldRoot);
  assert.equal(old.problem, null);
  assert.equal(old.direction.colours.ink, '#123456', 'saved colour was lost');
  assert.deepEqual(
    old.direction.structure,
    preset.structure,
    'an old preset save did not gain its structure guidance',
  );
  assert.equal(
    old.direction.fonts.detail.family,
    'IBM Plex Mono',
    'an old Long Lunch save did not gain its detail face',
  );

  // A measured reference has no preset to fall back to.
  const referenceRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'cauldron-ref-'));
  fs.mkdirSync(path.join(referenceRoot, 'cauldron'), { recursive: true });
  fs.writeFileSync(
    path.join(referenceRoot, 'cauldron/design.json'),
    JSON.stringify({
      id: 'reference-old',
      tokens: { ...legacy, id: 'reference-old', name: 'Old reference' },
    }),
  );
  const reference = directions.readDirection(referenceRoot);
  assert.equal(reference.problem, null);
  assert.deepEqual(
    reference.direction.structure,
    directions.REFERENCE_STRUCTURE,
  );
});

test('29 the agent brief carries the contrast and rem root rules', async () => {
  assert.ok(directions, 'directions module missing');
  const { buildPrompt } = await import('../src/main/agent.ts');
  const prompt = buildPrompt({
    request: 'build the site',
    siteName: 'fixture',
    direction: directions.findDirection('open-house'),
    selection: null,
    catalogue: [],
  });
  assert.match(prompt, /rem against a 16px root/);
  assert.match(prompt, /small text needs 4\.5:1/i);
  assert.match(
    prompt,
    /Text and buttons meet 4\.5:1/,
    'the approved contrast rule is missing from the taste rules',
  );
});

// Ticket 29: focus and keyboard failed the same controls, and a run’s own
// findings reused the whole-site ids. Both were report defects, not design.
test('29 unreachable controls are keyboard failures, not focus failures', async () => {
  const tasteCheck = await import('../src/main/taste-check.ts');
  const clean = tasteCheck.focusOutcome({
    invisible: 0,
    lowContrast: 0,
    unreached: 2,
    weakest: 99,
    problems: [],
  });
  assert.equal(
    clean.failed,
    false,
    'a focus failure was reported with no indicator fault',
  );
  assert.match(clean.focusDetail, /keyboard/);
  const weak = tasteCheck.focusOutcome({
    invisible: 1,
    lowContrast: 0,
    unreached: 2,
    weakest: 1.09,
    problems: ['button.btn 1.09:1'],
  });
  assert.equal(weak.failed, true);
  assert.match(weak.thresholdDetail, /1\.09:1/);
});

test('29 a run’s own taste findings do not reuse the whole-site ids', async () => {
  const tasteCheck = await import('../src/main/taste-check.ts');
  assert.equal(
    tasteCheck.tasteFindingId('hover', '/gallery', 1280, 'site'),
    'taste-hover-/gallery-1280',
  );
  assert.equal(
    tasteCheck.tasteFindingId('hover', '/gallery', 1280, 'change'),
    'taste-change-hover-/gallery-1280',
  );
});

test('29 typographic arrows are punctuation, not emoji icons', () => {
  assert.ok(tasteCheck, 'taste-check module missing');
  assert.equal(
    tasteCheck.usesEmojiAsIcon('Open in mail app ↗'),
    false,
    'an arrow glyph in a label was counted as an emoji icon',
  );
  assert.equal(tasteCheck.usesEmojiAsIcon('Gallery →'), false);
  assert.equal(tasteCheck.usesEmojiAsIcon('Image → Python'), false);
  assert.equal(tasteCheck.usesEmojiAsIcon('🚀 Launch'), true);
  assert.equal(tasteCheck.usesEmojiAsIcon('Save 👍'), true);
  assert.equal(tasteCheck.usesEmojiAsIcon('→'), false);
});

test('29 screen-reader-only helpers are recognised and skipped', () => {
  assert.ok(tasteCheck, 'taste-check module missing');
  // The .visually-hidden pattern: absolute, 1px, clipped.
  assert.equal(
    tasteCheck.isVisuallyHidden(
      { position: 'absolute', clip: 'rect(0 0 0 0)' },
      { width: 1, height: 1 },
    ),
    true,
  );
  // A skip-link is absolute but full-sized and unclipped: still measured.
  assert.equal(
    tasteCheck.isVisuallyHidden(
      { position: 'absolute', clip: 'auto' },
      { width: 140, height: 44 },
    ),
    false,
  );
  // Static in-flow content is never visually hidden.
  assert.equal(
    tasteCheck.isVisuallyHidden(
      { position: 'static', clip: 'auto' },
      { width: 300, height: 40 },
    ),
    false,
  );
});

test('29 an SVG wordmark’s font-size is a drawing size, not off-scale type', () => {
  assert.ok(tasteChange && directions, 'taste-change/directions missing');
  const checkTasteOfCss = tasteChange.checkTasteOfCss;
  const direction = directions.findDirection('long-lunch');
  const css = [
    '.hero__wordmark text { font-size: 440px; letter-spacing: -0.04em; }',
    '.hero__wordmark { width: 100%; }',
  ].join('\n');
  const findings = checkTasteOfCss(css, direction, '/ (src/pages/index.astro)');
  const type = findings.find((finding) =>
    finding.label.endsWith('Type sizes use the direction'),
  );
  const tokens = findings.find((finding) =>
    finding.label.endsWith('Tokens rather than hard-coded values'),
  );
  assert.equal(type?.status, 'pass', type?.detail ?? 'type finding missing');
  assert.equal(
    tokens?.status,
    'pass',
    tokens?.detail ?? 'tokens finding missing',
  );
  // The rule stays strict for real typography.
  const offScale = checkTasteOfCss(
    '.hero__title { font-size: 440px; }',
    direction,
    '/ (src/pages/index.astro)',
  );
  assert.equal(
    offScale.find((finding) =>
      finding.label.endsWith('Type sizes use the direction'),
    )?.status,
    'fail',
  );
});

// Tickets 27/28: a whole-site brief needs bounded, version-checked access to
// page/component/layout markup and design CSS. These actions are whole-file
// reads and writes, never a general filesystem tool.
const sourceRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'cauldron-source-'));
const pagesDir = path.join(sourceRoot, 'src/pages');
fs.mkdirSync(pagesDir, { recursive: true });
fs.mkdirSync(path.join(sourceRoot, 'src/components'), { recursive: true });
fs.mkdirSync(path.join(sourceRoot, 'src/layouts'), { recursive: true });
fs.mkdirSync(path.join(sourceRoot, 'src/styles'), { recursive: true });
const sourceFile = path.join(pagesDir, 'index.astro');

test('27/28 & WDL-193: catalogue matches served MCP tools and includes bounded source actions', () => {
  const catalogue = actionCatalogue('Catalogue Site');
  const names = catalogue.map((entry) => entry.name);
  assert.ok(
    names.includes('read_source'),
    'read_source is not in the catalogue',
  );
  assert.ok(
    names.includes('write_source'),
    'write_source is not in the catalogue',
  );
  assert.match(
    catalogue.find((entry) => entry.name === 'write_source').what,
    /baseHash/i,
  );
  if (!mcpModule.error) {
    assert.deepEqual(
      names,
      mcpModule.toolsFor('Catalogue Site').map((tool) => tool.name),
    );
  }
});

test('27/28 readSource returns the exact bytes and hash of a page', () => {
  const bytes = '---\nconst x = "  keep  ";\n---\n<h1>  Hi  </h1>\n';
  fs.writeFileSync(sourceFile, bytes);
  const read = runAction(sourceRoot, {
    action: 'readSource',
    file: 'src/pages/index.astro',
  });
  assert.equal(read.ok, true, read.problem);
  assert.equal(read.exists, true);
  assert.equal(read.content, bytes);
  assert.equal(read.hash, hashOf(bytes));
});

test('27/28 readSource states creation clearly when the file is absent', () => {
  const read = runAction(sourceRoot, {
    action: 'readSource',
    file: 'src/pages/not-yet.astro',
  });
  assert.equal(read.ok, true, read.problem);
  assert.equal(read.exists, false);
  assert.equal(read.content, null);
  assert.equal(read.hash, null);
});

test('27/28 writeSource replaces the exact bytes when the hash matches', () => {
  const base = '<h1>Old</h1>\n';
  fs.writeFileSync(sourceFile, base);
  const read = runAction(sourceRoot, {
    action: 'readSource',
    file: 'src/pages/index.astro',
  });
  const content = '<h1>New</h1>\n<!--   odd spacing kept   -->\n';
  const wrote = runAction(sourceRoot, {
    action: 'writeSource',
    file: 'src/pages/index.astro',
    content,
    baseHash: read.hash,
  });
  assert.equal(wrote.ok, true, wrote.problem);
  assert.equal(wrote.created, false);
  assert.equal(wrote.hash, hashOf(content));
  assert.equal(fs.readFileSync(sourceFile, 'utf8'), content);
});

test('27/28 writeSource refuses a stale hash and leaves the file alone', () => {
  const base = '<h1>Base</h1>\n';
  fs.writeFileSync(sourceFile, base);
  const read = runAction(sourceRoot, {
    action: 'readSource',
    file: 'src/pages/index.astro',
  });
  const outside = '<h1>Outside edit</h1>\n';
  fs.writeFileSync(sourceFile, outside);
  const wrote = runAction(sourceRoot, {
    action: 'writeSource',
    file: 'src/pages/index.astro',
    content: '<h1>Stale</h1>\n',
    baseHash: read.hash,
  });
  assert.equal(wrote.ok, false);
  assert.ok(wrote.clash, 'a stale write must report the disk version');
  assert.equal(wrote.clash.diskText, outside);
  assert.equal(fs.readFileSync(sourceFile, 'utf8'), outside);
});

test('27/28 create needs an explicit null hash and never clobbers', () => {
  const file = 'src/components/Hero.astro';
  const content = '<section class="hero">Built by the agent</section>\n';
  const created = runAction(sourceRoot, {
    action: 'writeSource',
    file,
    content,
    baseHash: null,
  });
  assert.equal(created.ok, true, created.problem);
  assert.equal(created.created, true);
  assert.equal(fs.readFileSync(path.join(sourceRoot, file), 'utf8'), content);
  assert.equal(
    fs
      .readdirSync(path.join(sourceRoot, 'src/components'))
      .filter((name) => name.startsWith('.Hero.astro.cauldron-')).length,
    0,
    'atomic create left a temporary file behind',
  );
  const again = runAction(sourceRoot, {
    action: 'writeSource',
    file,
    content: '<section>clobbered</section>\n',
    baseHash: null,
  });
  assert.equal(again.ok, false);
  assert.equal(fs.readFileSync(path.join(sourceRoot, file), 'utf8'), content);
});

test('27/28 creating an absent file with a string hash is refused', () => {
  const file = 'src/layouts/Base.astro';
  const wrote = runAction(sourceRoot, {
    action: 'writeSource',
    file,
    content: '<slot />\n',
    baseHash: hashOf('something that is not on disk'),
  });
  assert.equal(wrote.ok, false);
  assert.equal(fs.existsSync(path.join(sourceRoot, file)), false);
});

test('27/28 source paths allow nested design folders', () => {
  const nested = [
    'src/pages/blog/post.astro',
    'src/components/ui/Button.astro',
    'src/styles/blocks/hero.css',
  ];
  for (const file of nested) {
    const wrote = runAction(sourceRoot, {
      action: 'writeSource',
      file,
      content: '<h1>Nested</h1>\n',
      baseHash: null,
    });
    assert.equal(wrote.ok, true, `${file}: ${wrote.problem}`);
    const read = runAction(sourceRoot, { action: 'readSource', file });
    assert.equal(read.content, '<h1>Nested</h1>\n');
  }
});

test('27/28 source paths reject traversal and absolute paths', () => {
  for (const file of [
    '../outside.astro',
    'src/pages/../../outside.astro',
    'src/../package.json',
    path.join(sourceRoot, 'src/pages/index.astro'),
    '/tmp/outside.astro',
  ]) {
    const read = runAction(sourceRoot, { action: 'readSource', file });
    assert.equal(read.ok, false, `read allowed ${file}`);
    const wrote = runAction(sourceRoot, {
      action: 'writeSource',
      file,
      content: '<h1>x</h1>\n',
      baseHash: null,
    });
    assert.equal(wrote.ok, false, `write allowed ${file}`);
  }
});

test('27/28 source paths reject other extensions and private files', () => {
  for (const file of [
    'src/pages/site.css',
    'src/styles/main.astro',
    'src/pages/notes.md',
    'src/pages/app.ts',
    'package.json',
    'cauldron/tokens.css',
    '.env',
  ]) {
    const read = runAction(sourceRoot, { action: 'readSource', file });
    assert.equal(read.ok, false, `read allowed ${file}`);
    const wrote = runAction(sourceRoot, {
      action: 'writeSource',
      file,
      content: 'x',
      baseHash: null,
    });
    assert.equal(wrote.ok, false, `write allowed ${file}`);
  }
});

test('27/28 a symlink cannot be used to read or write outside the site', () => {
  const outside = path.join(
    fs.mkdtempSync(path.join(os.tmpdir(), 'cauldron-outside-')),
    'secret.astro',
  );
  fs.writeFileSync(outside, 'outside content\n');
  const link = path.join(pagesDir, 'link.astro');
  fs.symlinkSync(outside, link);
  const read = runAction(sourceRoot, {
    action: 'readSource',
    file: 'src/pages/link.astro',
  });
  assert.equal(read.ok, false);
  const wrote = runAction(sourceRoot, {
    action: 'writeSource',
    file: 'src/pages/link.astro',
    content: 'changed\n',
    baseHash: hashOf('outside content\n'),
  });
  assert.equal(wrote.ok, false);
  assert.equal(fs.readFileSync(outside, 'utf8'), 'outside content\n');
});

test('27/28 undo of a created source deletes it and redo recreates it', () => {
  const full = path.join(sourceRoot, 'src/pages/made.astro');
  const content = '<h1>Made</h1>\n';
  fs.writeFileSync(full, content);
  const history = new History();
  history.record({
    file: full,
    location: { file: full, line: 1, column: 1, name: 'source' },
    operation: { kind: 'text', value: '' },
    before: '',
    after: content,
    beforeHash: '',
    afterHash: hashOf(content),
    label: 'writeSource',
    created: true,
  });
  const undone = history.undo();
  assert.ok(!('problem' in undone), undone.problem);
  assert.equal(fs.existsSync(full), false, 'undo left an empty file behind');
  const redone = history.redo();
  assert.ok(!('problem' in redone), redone.problem);
  assert.equal(fs.readFileSync(full, 'utf8'), content);
});

test('27/28 undo of a created source refuses an outside-modified file', () => {
  const full = path.join(sourceRoot, 'src/pages/changed.astro');
  const content = '<h1>Made</h1>\n';
  fs.writeFileSync(full, content);
  const history = new History();
  history.record({
    file: full,
    location: { file: full, line: 1, column: 1, name: 'source' },
    operation: { kind: 'text', value: '' },
    before: '',
    after: content,
    beforeHash: '',
    afterHash: hashOf(content),
    label: 'writeSource',
    created: true,
  });
  const outside = '<h1>Outside changed it</h1>\n';
  fs.writeFileSync(full, outside);
  const undone = history.undo();
  assert.ok('problem' in undone);
  assert.equal(fs.readFileSync(full, 'utf8'), outside);
});

test('27/28 redo of a created source refuses to clobber a new file', () => {
  const full = path.join(sourceRoot, 'src/pages/recreated.astro');
  const content = '<h1>Made</h1>\n';
  fs.writeFileSync(full, content);
  const history = new History();
  history.record({
    file: full,
    location: { file: full, line: 1, column: 1, name: 'source' },
    operation: { kind: 'text', value: '' },
    before: '',
    after: content,
    beforeHash: '',
    afterHash: hashOf(content),
    label: 'writeSource',
    created: true,
  });
  assert.ok(!('problem' in history.undo()));
  const collision = '<h1>Someone else made this</h1>\n';
  fs.writeFileSync(full, collision);
  const redone = history.redo();
  assert.ok('problem' in redone);
  assert.equal(fs.readFileSync(full, 'utf8'), collision);
});

test('27/28 redo refuses a created file whose ancestor became a symlink', () => {
  const site = fs.mkdtempSync(path.join(os.tmpdir(), 'cauldron-scope-redo-'));
  const outside = fs.mkdtempSync(path.join(os.tmpdir(), 'cauldron-scope-out-'));
  const pages = path.join(site, 'src/pages');
  fs.mkdirSync(pages, { recursive: true });
  const full = path.join(pages, 'moved.astro');
  const content = '<h1>Made</h1>\n';
  fs.writeFileSync(full, content);
  const history = new History();
  history.record({
    file: full,
    location: { file: full, line: 1, column: 1, name: 'source' },
    operation: { kind: 'text', value: '' },
    before: '',
    after: content,
    beforeHash: '',
    afterHash: hashOf(content),
    label: 'writeSource',
    created: true,
    root: site,
  });
  assert.ok(!('problem' in history.undo()));
  fs.rmSync(pages, { recursive: true });
  fs.symlinkSync(outside, pages);
  const redone = history.redo();
  assert.ok('problem' in redone);
  assert.equal(fs.existsSync(path.join(outside, 'moved.astro')), false);
});

test('27/28 undo refuses a created file whose ancestor became a symlink', () => {
  const site = fs.mkdtempSync(path.join(os.tmpdir(), 'cauldron-scope-undo-'));
  const outside = fs.mkdtempSync(path.join(os.tmpdir(), 'cauldron-scope-out-'));
  const pages = path.join(site, 'src/pages');
  fs.mkdirSync(pages, { recursive: true });
  const full = path.join(pages, 'swapped.astro');
  const content = '<h1>Made</h1>\n';
  fs.writeFileSync(full, content);
  const history = new History();
  history.record({
    file: full,
    location: { file: full, line: 1, column: 1, name: 'source' },
    operation: { kind: 'text', value: '' },
    before: '',
    after: content,
    beforeHash: '',
    afterHash: hashOf(content),
    label: 'writeSource',
    created: true,
    root: site,
  });
  const elsewhere = path.join(outside, 'swapped.astro');
  fs.renameSync(full, elsewhere);
  fs.rmSync(pages, { recursive: true });
  fs.symlinkSync(outside, pages);
  const undone = history.undo();
  assert.ok('problem' in undone);
  assert.equal(fs.readFileSync(elsewhere, 'utf8'), content);
});

test('27/28 run undo replaces a page and deletes a created file, leaving outside work', () => {
  const { Runs } = runsApi();
  const site = fs.mkdtempSync(path.join(os.tmpdir(), 'cauldron-run-source-'));
  fs.mkdirSync(path.join(site, 'src/pages'), { recursive: true });
  fs.mkdirSync(path.join(site, 'src/styles'), { recursive: true });
  const page = path.join(site, 'src/pages/index.astro');
  const outsideFile = path.join(site, 'src/pages/outside.astro');
  fs.writeFileSync(page, '<h1>Old</h1>\n');
  fs.writeFileSync(outsideFile, '<h1>Outside kept</h1>\n');
  const runs = new Runs();
  const run = runs.start(site, 'claude', 'build a page');
  fs.writeFileSync(page, '<h1>Run page</h1>\n');
  const created = path.join(site, 'src/styles/run.css');
  fs.writeFileSync(created, 'body { margin: 0; }\n');
  const finished = runs.finish(site, run.id, {
    claimed: ['src/pages/index.astro', 'src/styles/run.css'],
  });
  assert.equal(finished.files.length, 2);
  assert.deepEqual(runs.undo(site, run.id), { ok: true });
  assert.equal(fs.readFileSync(page, 'utf8'), '<h1>Old</h1>\n');
  assert.equal(fs.existsSync(created), false);
  assert.equal(fs.readFileSync(outsideFile, 'utf8'), '<h1>Outside kept</h1>\n');
});

// Async round-trip through the real MCP handler: tools/list must show the
// source pair, and write_source's null hash must survive toRequest unchanged.
await (async () => {
  const name = '27/28 MCP offers source actions and keeps the null-create hash';
  try {
    if (mcpModule.error) throw mcpModule.error;
    let seen = null;
    const server = await mcpModule.startMcpServer({
      root: sourceRoot,
      siteName: 'Source test',
      run: (request) => {
        seen = request;
        return { ok: true, file: request.file };
      },
      readSelection: () => ({}),
      readDesign: () => ({}),
    });
    const post = async (payload) => {
      const response = await fetch(server.url, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-cauldron-code': server.code,
        },
        body: JSON.stringify(payload),
      });
      return response.json();
    };
    try {
      // WDL-228: the version reported to agents comes from package.json, not a second copy.
      const init = await post({ jsonrpc: '2.0', id: 0, method: 'initialize' });
      assert.equal(
        init.result.serverInfo.version,
        JSON.parse(fs.readFileSync('package.json', 'utf8')).version,
      );
      const listed = await post({
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/list',
      });
      const tools = listed.result.tools;
      const names = tools.map((tool) => tool.name);
      assert.ok(names.includes('read_source'), 'read_source is not offered');
      assert.ok(names.includes('write_source'), 'write_source is not offered');
      const write = tools.find((tool) => tool.name === 'write_source');
      assert.deepEqual(write.inputSchema.properties.baseHash.type, [
        'string',
        'null',
      ]);
      assert.ok(write.inputSchema.required.includes('baseHash'));
      const called = await post({
        jsonrpc: '2.0',
        id: 2,
        method: 'tools/call',
        params: {
          name: 'write_source',
          arguments: {
            file: 'src/pages/made-by-agent.astro',
            content: '<h1>Agent</h1>\n',
            baseHash: null,
          },
        },
      });
      assert.equal(called.result.isError, false);
      assert.deepEqual(seen, {
        action: 'writeSource',
        file: 'src/pages/made-by-agent.astro',
        content: '<h1>Agent</h1>\n',
        baseHash: null,
      });
    } finally {
      server.close();
    }
    console.log(`PASS ${name}`);
  } catch (error) {
    failures++;
    console.error(`FAIL ${name}: ${error.message}`);
  }
})();

test('Finding 5: section reorder preserves outside edits and requires matching baseHash', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cauldron-reorder-'));
  const pagesDir = path.join(dir, 'src/pages');
  fs.mkdirSync(pagesDir, { recursive: true });
  const initialContent = `---
const title = 'Outside Frontmatter Edit';
---
<!-- Unrelated top comment -->
<main>
  <section id="hero">
    <h1>Hero</h1>
  </section>
  <section id="about">
    <h2>About</h2>
  </section>
  <section id="contact">
    <h3>Contact</h3>
  </section>
</main>
<!-- Unrelated bottom comment -->
`;
  const file = path.join(pagesDir, 'index.astro');
  fs.writeFileSync(file, initialContent, 'utf8');

  const initialRead = readPageSections(dir, '/');
  assert.equal(initialRead.ok, true);
  assert.equal(initialRead.sections.length, 3);
  const initialHash = initialRead.hash;

  // Make an outside edit outside the sections
  const outsideEdited = initialContent.replace(
    'Outside Frontmatter Edit',
    'Preserved Outside Edit',
  );
  fs.writeFileSync(file, outsideEdited, 'utf8');

  // Attempting reorder with the stale initialHash must be refused
  const staleRes = reorderPageSections(dir, '/', 0, 1, initialHash);
  assert.equal(staleRes.ok, false);
  assert.equal(
    staleRes.problem,
    'That file changed since this action was prepared. Read it again before editing.',
  );

  // Reorder with the fresh baseHash
  const freshHash = hashOf(outsideEdited);
  const reorderRes = reorderPageSections(dir, '/', 0, 1, freshHash);
  assert.equal(reorderRes.ok, true);
  assert.equal(reorderRes.sections.length, 3);
  assert.equal(reorderRes.sections[0].anchorId, 'about');
  assert.equal(reorderRes.sections[1].anchorId, 'hero');

  // Verify the outside edit survived
  const finalText = fs.readFileSync(file, 'utf8');
  assert.ok(
    finalText.includes('Preserved Outside Edit'),
    'Outside frontmatter edit was lost',
  );
  assert.ok(
    finalText.includes('<!-- Unrelated top comment -->'),
    'Top comment was lost',
  );
  assert.ok(
    finalText.includes('<!-- Unrelated bottom comment -->'),
    'Bottom comment was lost',
  );
});

test('Finding 4: duplicatePageSection duplicates section block and validates baseHash', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cauldron-duplicate-'));
  const pagesDir = path.join(dir, 'src/pages');
  fs.mkdirSync(pagesDir, { recursive: true });
  const content = `<main>\n  <section id="hero">\n    <h1>Original Hero</h1>\n  </section>\n</main>\n`;
  const file = path.join(pagesDir, 'index.astro');
  fs.writeFileSync(file, content, 'utf8');

  const read = readPageSections(dir, '/');
  assert.equal(read.ok, true);

  // Stale hash refusal
  const staleRes = duplicatePageSection(dir, '/', 0, 'stale-hash-1234');
  assert.equal(staleRes.ok, false);
  assert.equal(
    staleRes.problem,
    'That file changed since this action was prepared. Read it again before editing.',
  );

  // Valid duplicate
  const dupRes = duplicatePageSection(dir, '/', 0, read.hash);
  assert.equal(dupRes.ok, true);
  assert.equal(dupRes.sections.length, 2);

  const updatedText = fs.readFileSync(file, 'utf8');
  assert.equal(
    (updatedText.match(/Original Hero/g) || []).length,
    2,
    'Section text should be duplicated',
  );
});

test('Finding 4: insertPageSection inserts at start (-1) or after index and validates baseHash', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cauldron-insert-'));
  const pagesDir = path.join(dir, 'src/pages');
  fs.mkdirSync(pagesDir, { recursive: true });
  const content = `<main>\n  <section id="s1">First</section>\n  <section id="s2">Second</section>\n</main>\n`;
  const file = path.join(pagesDir, 'index.astro');
  fs.writeFileSync(file, content, 'utf8');

  const read = readPageSections(dir, '/');
  assert.equal(read.ok, true);

  // Insert before first section (-1)
  const insTop = insertPageSection(
    dir,
    '/',
    -1,
    '<section id="top">Top Section</section>',
    read.hash,
  );
  assert.equal(insTop.ok, true);
  assert.equal(insTop.sections.length, 3);
  assert.equal(insTop.sections[0].anchorId, 'top');

  // Insert after index 1 (which is now s1)
  const insAfter = insertPageSection(
    dir,
    '/',
    1,
    '<section id="mid">Middle Section</section>',
    insTop.hash,
  );
  assert.equal(insAfter.ok, true);
  assert.equal(insAfter.sections.length, 4);
  assert.equal(insAfter.sections[2].anchorId, 'mid');
});

test('Finding 5: deletePageSection and setPageSectionAnchor validate baseHash', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cauldron-anchor-del-'));
  const pagesDir = path.join(dir, 'src/pages');
  fs.mkdirSync(pagesDir, { recursive: true });
  const content = `<main>\n  <section id="s1">First</section>\n  <section id="s2">Second</section>\n</main>\n`;
  const file = path.join(pagesDir, 'index.astro');
  fs.writeFileSync(file, content, 'utf8');

  const read = readPageSections(dir, '/');
  assert.equal(read.ok, true);

  // Stale baseHash for setPageSectionAnchor is refused
  const staleAnchor = setPageSectionAnchor(dir, '/', 0, 'new-anchor', 'stale');
  assert.equal(staleAnchor.ok, false);
  assert.equal(
    staleAnchor.problem,
    'That file changed since this action was prepared. Read it again before editing.',
  );

  // Matching baseHash succeeds
  const goodAnchor = setPageSectionAnchor(dir, '/', 0, 'new-anchor', read.hash);
  assert.equal(goodAnchor.ok, true);
  assert.equal(goodAnchor.sections[0].anchorId, 'new-anchor');

  // Stale baseHash for deletePageSection is refused
  const staleDel = deletePageSection(dir, '/', 0, 'stale');
  assert.equal(staleDel.ok, false);
  assert.equal(
    staleDel.problem,
    'That file changed since this action was prepared. Read it again before editing.',
  );

  // Matching baseHash deletes the section
  const goodDel = deletePageSection(dir, '/', 0, goodAnchor.hash);
  assert.equal(goodDel.ok, true);
  assert.equal(goodDel.sections.length, 1);
});

test('fablefixes 9: an anchor lands on the section itself and refuses unsafe text', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cauldron-anchor-own-'));
  fs.mkdirSync(path.join(dir, 'src/pages'), { recursive: true });
  const file = path.join(dir, 'src/pages/index.astro');
  const content = `<main>\n  <section class="hero">\n    <div data-id="keep" id="child">Hi</div>\n  </section>\n  <section id='two'>Two</section>\n</main>\n`;
  fs.writeFileSync(file, content, 'utf8');

  const initial = readPageSections(dir, '/');
  assert.equal(initial.ok, true);
  const added = setPageSectionAnchor(dir, '/', 0, '#intro', initial.hash);
  assert.equal(added.ok, true);
  assert.equal(
    fs.readFileSync(file, 'utf8'),
    content.replace(
      '<section class="hero">',
      '<section id="intro" class="hero">',
    ),
  );

  const replaced = setPageSectionAnchor(dir, '/', 1, 'second', added.hash);
  assert.equal(replaced.ok, true);
  assert.ok(fs.readFileSync(file, 'utf8').includes("<section id='second'>Two"));
  assert.ok(
    fs.readFileSync(file, 'utf8').includes('data-id="keep" id="child"'),
  );

  const before = fs.readFileSync(file, 'utf8');
  for (const unsafe of ['a" onclick="x', 'two words', '', '9lives', 'a<b']) {
    const refused = setPageSectionAnchor(dir, '/', 0, unsafe, replaced.hash);
    assert.equal(refused.ok, false, unsafe);
  }
  assert.equal(fs.readFileSync(file, 'utf8'), before);
});

test('fablefixes 10: CSS and element edits are refused outside style and markup files', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cauldron-edit-scope-'));
  fs.mkdirSync(path.join(dir, 'src/styles'), { recursive: true });
  const pkg = path.join(dir, 'package.json');
  const pkgText = '{\n  "name": "x"\n}\n';
  fs.writeFileSync(pkg, pkgText, 'utf8');
  const config = path.join(dir, 'astro.config.mjs');
  const configText = 'export default {};\n';
  fs.writeFileSync(config, configText, 'utf8');

  const css = runAction(dir, {
    action: 'editCssRule',
    file: 'package.json',
    selector: 'x',
    property: 'y',
    value: 'z',
    baseHash: hashOf(pkgText),
  });
  assert.equal(css.ok, false);
  assert.equal(fs.readFileSync(pkg, 'utf8'), pkgText);

  const element = runAction(dir, {
    action: 'editElementText',
    target: { file: 'astro.config.mjs', line: 1, column: 1, name: 'export' },
    value: 'x',
    baseHash: hashOf(configText),
  });
  assert.equal(element.ok, false);
  assert.equal(fs.readFileSync(config, 'utf8'), configText);

  const sheet = path.join(dir, 'src/styles/global.css');
  fs.writeFileSync(sheet, 'h1 {\n  color: red;\n}\n', 'utf8');
  const allowed = runAction(dir, {
    action: 'editCssRule',
    file: 'src/styles/global.css',
    selector: 'p',
    property: 'color',
    value: 'blue',
    baseHash: hashOf(fs.readFileSync(sheet, 'utf8')),
  });
  assert.equal(allowed.ok, true);

  const missing = runAction(dir, {
    action: 'editCssRule',
    file: 'src/styles/none.css',
    selector: 'p',
    property: 'color',
    value: 'blue',
    baseHash: '',
  });
  assert.equal(missing.ok, false);
});

const content = await import('../src/main/content.ts');
test('fablefixes 7: a date field is saved as a date, never as quoted text', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cauldron-date-'));
  fs.mkdirSync(path.join(dir, 'src/content/blog'), { recursive: true });
  fs.writeFileSync(
    path.join(dir, 'src/content.config.ts'),
    `import { defineCollection, z } from 'astro:content';\nconst blog = defineCollection({ schema: z.object({ title: z.string(), pubDate: z.date() }) });\nexport const collections = { blog };\n`,
  );
  const file = path.join(dir, 'src/content/blog/a.md');
  fs.writeFileSync(
    file,
    `---\ntitle: "Hello"\npubDate: 2026-01-01\n---\nBody\n`,
  );

  const entry = content.readEntry(dir, 'src/content/blog/a.md');
  const bad = content.saveEntry(dir, 'src/content/blog/a.md', entry.hash, {
    field: 'pubDate',
    value: 'next Tuesday',
    schemaHash: entry.schemaHash,
  });
  assert.equal(bad.ok, false);
  assert.ok(fs.readFileSync(file, 'utf8').includes('pubDate: 2026-01-01'));

  const good = content.saveEntry(dir, 'src/content/blog/a.md', entry.hash, {
    field: 'pubDate',
    value: '2026-02-02',
    schemaHash: entry.schemaHash,
  });
  assert.equal(good.ok, true);
  assert.equal(
    fs.readFileSync(file, 'utf8'),
    `---\ntitle: "Hello"\npubDate: 2026-02-02\n---\nBody\n`,
  );
});

test('fablefixes 25: changed files with spaces, accents and renames are read exactly', () => {
  const { repoState } = publishApi();
  const { site, page } = publishFixture('status');
  gitIn(site, ['mv', 'src/pages/index.astro', 'src/pages/home page.astro']);
  fs.writeFileSync(path.join(site, 'src/pages/café menu.astro'), '<p>x</p>\n');
  const files = repoState(site)
    .changes.map((c) => `${c.status} ${c.file}`)
    .sort();
  assert.deepEqual(files, [
    '?? src/pages/café menu.astro',
    'R src/pages/index.astro → src/pages/home page.astro',
  ]);
  assert.equal(fs.existsSync(page), false);
});

test('fablefixes 25/81: the remote shown is the one a push would use, by name', () => {
  const { repoState } = publishApi();
  const { site } = publishFixture('remote');
  assert.equal(repoState(site).remote, 'origin');
  // Renaming keeps the branch's upstream, so the new name is the one shown.
  assert.equal(gitIn(site, ['remote', 'rename', 'origin', 'studio']).status, 0);
  assert.equal(repoState(site).remote, 'studio');
  // Push-specific settings win over the upstream, as they do for `git push`.
  gitIn(site, ['remote', 'add', 'mirror', path.join(site, 'mirror.git')]);
  gitIn(site, ['config', 'remote.pushDefault', 'mirror']);
  assert.equal(repoState(site).remote, 'mirror');
  gitIn(site, ['config', 'branch.main.pushRemote', 'studio']);
  assert.equal(repoState(site).remote, 'studio');
  gitIn(site, ['config', '--unset', 'branch.main.pushRemote']);
  gitIn(site, ['config', '--unset', 'remote.pushDefault']);
  gitIn(site, ['remote', 'remove', 'mirror']);
  // Two remotes and no upstream: nothing is chosen, and none is guessed.
  gitIn(site, ['remote', 'add', 'backup', path.join(site, 'nowhere.git')]);
  gitIn(site, ['branch', '--unset-upstream']);
  const state = repoState(site);
  assert.equal(state.hasRemote, true);
  assert.equal(state.remote, null);
});

test('WDL-203 outline ignores code in front matter (CRLF) and components inside loops', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cauldron-outline-crlf-'));
  fs.mkdirSync(path.join(dir, 'src/pages'), { recursive: true });
  const page = [
    '---',
    'const items: Array<Item> = [];',
    '---',
    '<main>',
    '  <section id="a">First</section>',
    '  {items.map((item) => <Card title={item.title} />)}',
    '  <section id="b">Second</section>',
    '</main>',
    '',
  ].join('\r\n');
  fs.writeFileSync(path.join(dir, 'src/pages/index.astro'), page);
  const read = readPageSections(dir, '/');
  assert.equal(read.ok, true);
  assert.deepEqual(
    read.sections.map((section) => section.anchorId),
    ['a', 'b'],
  );
});

test('WDL-230 a missing folder is reported as missing, not as "no package.json"', async () => {
  const { detectSite } = await import('../src/main/site.ts');
  const gone = path.join(os.tmpdir(), `cauldron-gone-${Date.now()}`);
  const result = detectSite(gone);
  assert.match(result.problem, /does not exist/);
  const file = path.join(os.tmpdir(), `cauldron-file-${Date.now()}.txt`);
  fs.writeFileSync(file, 'x');
  assert.match(detectSite(file).problem, /file, not a folder/);
  fs.rmSync(file);
});

test('WDL-214 the preview server answers a malformed address instead of crashing', async () => {
  if (!qualityRules) return;
  const dist = fs.mkdtempSync(path.join(os.tmpdir(), 'cauldron-dist-'));
  fs.writeFileSync(path.join(dist, 'index.html'), '<p>ok</p>');
  const served = await qualityRules.serveDist(dist);
  try {
    const bad = await fetch(`${served.url}%E0%A4%A`);
    assert.equal(bad.status, 400);
    const good = await fetch(served.url);
    assert.equal(good.status, 200);
  } finally {
    served.close();
  }
});

test('WDL-203 an apostrophe in text inside a loop does not hide later sections', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cauldron-outline-apos-'));
  fs.mkdirSync(path.join(dir, 'src/pages'), { recursive: true });
  fs.writeFileSync(
    path.join(dir, 'src/pages/index.astro'),
    `<main>\n  <section id="a">First</section>\n  {items.map(item => <Card>It's here</Card>)}\n  <section id="b">Second</section>\n</main>\n`,
  );
  const read = readPageSections(dir, '/');
  assert.deepEqual(
    read.sections.map((section) => section.anchorId),
    ['a', 'b'],
  );
});

test('WDL-251 reverting content or element fields clears drafts', async () => {
  const { contentDraftValue, selectionDraftValue } =
    await import('../src/draft-restore.ts');

  const savedEntry = {
    text: '---\ntitle: Hello\n---\nBody\n',
    values: { title: 'Hello', summary: '' },
  };
  assert.equal(
    contentDraftValue(savedEntry, 'title', 'Hello world'),
    'Hello world',
  );
  assert.equal(contentDraftValue(savedEntry, 'title', 'Hello'), null);
  assert.equal(contentDraftValue(savedEntry, 'summary', ''), null);
  assert.equal(contentDraftValue(savedEntry, 'text', savedEntry.text), null);
  assert.equal(contentDraftValue(savedEntry, 'text', 'Changed'), 'Changed');

  const selection = {
    text: 'Original',
    style: { color: '#111111' },
    attributes: [{ name: 'href', value: '/about' }],
  };
  assert.equal(selectionDraftValue(selection, 'text', 'Edited'), 'Edited');
  assert.equal(selectionDraftValue(selection, 'text', 'Original'), null);
  assert.equal(selectionDraftValue(selection, 'style:color', '#111111'), null);
  assert.equal(selectionDraftValue(selection, 'style:margin', ''), null);
  assert.equal(
    selectionDraftValue(selection, 'attribute:href', '/about'),
    null,
  );
  assert.equal(
    selectionDraftValue(selection, 'attribute:href', '/contact'),
    '/contact',
  );
});

test('WDL-251 & WDL-213 draft banner copy distinguishes startup recovery from live session edits with proper grammar', async () => {
  const { describeDraftBanner } = await import('../src/draft-restore.ts');

  const oneLive = describeDraftBanner([{ key: 'k1' }], new Set());
  assert.equal(oneLive.heading, 'Unsaved edits.');
  assert.equal(oneLive.detail, '1 change has not been saved to the site yet.');
  assert.equal(oneLive.hasRecovery, false);

  const twoLive = describeDraftBanner(
    [{ key: 'k1' }, { key: 'k2' }],
    new Set(),
  );
  assert.equal(
    twoLive.detail,
    '2 changes have not been saved to the site yet.',
  );

  const oneRecovered = describeDraftBanner([{ key: 'k1' }], new Set(['k1']));
  assert.equal(oneRecovered.heading, 'Unsaved edits from last time.');
  assert.equal(
    oneRecovered.detail,
    '1 change was being typed when Cauldron last stopped.',
  );
  assert.equal(oneRecovered.hasRecovery, true);

  const twoRecovered = describeDraftBanner(
    [{ key: 'k1' }, { key: 'k2' }],
    new Set(['k1', 'k2']),
  );
  assert.equal(
    twoRecovered.detail,
    '2 changes were being typed when Cauldron last stopped.',
  );

  const mixed = describeDraftBanner(
    [{ key: 'k1' }, { key: 'k2' }],
    new Set(['k1']),
  );
  assert.equal(mixed.heading, 'Unsaved edits.');
  assert.match(mixed.detail, /2 changes.*1 from last time/);
});

test('WDL-213 & WDL-251 mergeDraftsList, removeDraftKeys, and planBatchDraftRestores handle multi-element batches safely', async () => {
  const {
    draftEditOperation,
    mergeDraftsList,
    planBatchDraftRestores,
    removeDraftKeys,
  } = await import('../src/draft-restore.ts');
  const { applyEdit, snapshotElement } = await import('../src/main/edit.ts');
  const { hashOf } = await import('../src/main/files.ts');

  const recovered = { key: 'recovered-1', value: 'keep me' };
  const liveA = { key: 'live-a', value: 'a' };
  const liveB = { key: 'live-b', value: 'b' };
  const merged = mergeDraftsList([recovered, liveA], [liveB]);
  assert.deepEqual(
    merged.map((d) => d.key),
    ['recovered-1', 'live-a', 'live-b'],
  );
  const afterRemove = removeDraftKeys(merged, ['live-a']);
  assert.deepEqual(
    afterRemove.map((d) => d.key),
    ['recovered-1', 'live-b'],
  );

  // Two consecutive <p> elements where the first gets multiline text:
  // bottom-to-top planning ensures the second <p> is restored at its true tag
  // before the first <p> shifts lines below it.
  let source = '<main>\n  <p>First</p>\n  <p>Second</p>\n</main>\n';
  const originalHash = hashOf(source);
  const planned = planBatchDraftRestores(
    [
      {
        key: 'p1',
        file: 'src/pages/index.astro',
        line: 2,
        column: 6,
        name: 'p',
        field: 'text',
        value: 'Line 1\nLine 2\nLine 3',
        baseHash: originalHash,
      },
      {
        key: 'p2',
        file: 'src/pages/index.astro',
        line: 3,
        column: 6,
        name: 'p',
        field: 'text',
        value: 'Updated second',
        baseHash: originalHash,
      },
    ],
    () => ({ text: source, hash: originalHash }),
  );
  assert.deepEqual(
    planned.map((d) => d.key),
    ['p2', 'p1'],
  );
  for (const draft of planned) {
    const location = {
      file: draft.file,
      line: draft.line,
      column: draft.column,
      name: draft.name,
    };
    const snapshot = snapshotElement(source, location);
    assert.ok(snapshot);
    const op = draftEditOperation(draft.field, draft.value);
    assert.ok(op);
    const edited = applyEdit(source, location, op, snapshot);
    assert.equal(edited.ok, true);
    source = edited.text;
  }
  assert.ok(source.includes('Line 1\nLine 2\nLine 3'));
  assert.ok(source.includes('<p>Updated second</p>'));
});

test('WDL-212 agent stream reducer preserves progress across events', () => {
  assert.ok(agentStream);
  let state = agentStream.beginAgentStream('Fix button contrast');
  assert.equal(state.running, true);
  assert.equal(state.activePrompt, 'Fix button contrast');
  assert.deepEqual(state.lines, []);

  state = agentStream.applyAgentStreamEvent(state, {
    type: 'session',
    id: 'sess-1',
  });
  state = agentStream.applyAgentStreamEvent(state, {
    type: 'status',
    text: 'Starting Codex…',
  });
  state = agentStream.applyAgentStreamEvent(state, {
    type: 'tool',
    name: 'apply_style',
  });
  state = agentStream.applyAgentStreamEvent(state, {
    type: 'text',
    text: 'Updating ',
    delta: true,
  });
  state = agentStream.applyAgentStreamEvent(state, {
    type: 'text',
    text: 'contrast token.',
    delta: true,
  });
  state = agentStream.applyAgentStreamEvent(state, {
    type: 'text',
    text: 'Check finished.',
    delta: false,
  });
  assert.deepEqual(state.lines, [
    { kind: 'status', text: 'Starting Codex…' },
    { kind: 'tool', text: 'Using apply_style' },
    { kind: 'agent', text: 'Updating contrast token.' },
    { kind: 'agent', text: 'Check finished.' },
  ]);

  const finished = agentStream.finishAgentStream(state, 'Updated 1 file.');
  assert.equal(finished.running, false);
  assert.equal(finished.message, 'Updated 1 file.');

  const errored = agentStream.applyAgentStreamEvent(
    agentStream.beginAgentStream('Retry'),
    { type: 'error', text: 'Process exited' },
  );
  assert.equal(errored.running, false);
  assert.deepEqual(errored.lines, [{ kind: 'error', text: 'Process exited' }]);

  const failedStart = agentStream.failAgentStream(
    agentStream.beginAgentStream('Bad'),
    'No tool found.',
  );
  assert.equal(failedStart.running, false);
  assert.equal(failedStart.message, 'No tool found.');
});

test('WDL-192: outline edits require baseHash and leave the file untouched when missing', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cauldron-wdl-192-'));
  fs.mkdirSync(path.join(dir, 'src/pages'), { recursive: true });
  const file = path.join(dir, 'src/pages/index.astro');
  const content = `<main>\n  <section>One</section>\n  <section>Two</section>\n</main>\n`;
  fs.writeFileSync(file, content, 'utf8');

  for (const baseHash of [undefined, '']) {
    assert.equal(reorderPageSections(dir, '/', 0, 1, baseHash).ok, false);
    assert.equal(deletePageSection(dir, '/', 0, baseHash).ok, false);
    assert.equal(setPageSectionAnchor(dir, '/', 0, 'one', baseHash).ok, false);
    assert.equal(duplicatePageSection(dir, '/', 0, baseHash).ok, false);
    assert.equal(
      insertPageSection(dir, '/', -1, { kind: 'Hero' }, baseHash).ok,
      false,
    );
  }
  assert.equal(fs.readFileSync(file, 'utf8'), content);
});

test('WDL-160 / WDL-202 / WDL-207: createPageFile writes atomically and History undoes and redoes created pages', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cauldron-wdl-160-'));
  fs.mkdirSync(path.join(dir, 'src/pages'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'src/pages/index.astro'), '<h1>Home</h1>\n');

  const created = createPageFile(dir, '/about/', 'About Us');
  assert.equal(created.ok, true);
  assert.equal(created.clean, 'about');
  assert.equal(created.file, 'src/pages/about.astro');
  const full = path.join(dir, created.file);
  assert.ok(fs.existsSync(full));
  const initialBody = fs.readFileSync(full, 'utf8');
  assert.ok(initialBody.includes('<title>About Us</title>'));
  assert.equal(
    fs
      .readdirSync(path.join(dir, 'src/pages'))
      .filter((name) => name.includes('.cauldron-')).length,
    0,
  );

  // Refuses existing page without overwriting
  const duplicate = createPageFile(dir, '/about', 'Other');
  assert.equal(duplicate.ok, false);
  assert.equal(fs.readFileSync(full, 'utf8'), initialBody);

  // History undo removes unedited created page, redo recreates it, undo refuses if edited
  const history = new History();
  history.record({
    file: full,
    location: { file: full },
    operation: 'create',
    before: '',
    after: initialBody,
    beforeHash: hashOf(''),
    afterHash: hashOf(initialBody),
    label: 'Create page /about',
    created: true,
    root: dir,
  });
  const undone = history.undo();
  assert.equal('problem' in undone, false);
  assert.equal(fs.existsSync(full), false);

  const redone = history.redo();
  assert.equal('problem' in redone, false);
  assert.equal(fs.readFileSync(full, 'utf8'), initialBody);

  fs.writeFileSync(full, `${initialBody}<!-- edited -->\n`, 'utf8');
  const blockedUndo = history.undo();
  assert.equal('problem' in blockedUndo, true);
  assert.match(blockedUndo.problem, /changed since/i);
});

test('WDL-207: Runs.undo and persist leave no temporary files behind', () => {
  const { Runs } = runsApi();
  const site = runSite('atomic');
  const userData = fs.mkdtempSync(path.join(os.tmpdir(), 'cauldron-runs-ud-'));
  const previousUserData = globalThis.__cauldronUserData;
  globalThis.__cauldronUserData = userData;
  try {
    fs.writeFileSync(path.join(site, 'public/logo.png'), png);
    const runs = new Runs();
    const run = runs.start(site, 'claude', 'replace logo');
    fs.writeFileSync(
      path.join(site, 'public/logo.png'),
      Buffer.concat([png, Buffer.from([1, 2, 3])]),
    );
    runs.finish(site, run.id);
    assert.deepEqual(runs.undo(site, run.id), { ok: true });
    assert.deepEqual(fs.readFileSync(path.join(site, 'public/logo.png')), png);
    assert.equal(
      fs
        .readdirSync(path.join(site, 'public'))
        .filter((name) => name.includes('.cauldron-')).length,
      0,
    );
    const runsFolder = path.join(userData, 'runs');
    const siteRunFolders = fs.readdirSync(runsFolder);
    assert.equal(siteRunFolders.length, 1);
    const runEntries = fs.readdirSync(path.join(runsFolder, siteRunFolders[0]));
    assert.ok(runEntries.some((name) => name.endsWith('.json')));
    assert.equal(
      runEntries.filter((name) => name.includes('.cauldron-')).length,
      0,
    );
  } finally {
    globalThis.__cauldronUserData = previousUserData;
  }
});

test('Codex review P1: read-only actions never claim run ownership', () => {
  for (const action of [
    'listPages',
    'readPageOutline',
    'readPageSections',
    'readSource',
  ]) {
    assert.equal(isReadOnlyAction(action), true, action);
  }
  for (const action of [
    'editElementText',
    'reorderPageSections',
    'createPage',
    'writeSource',
  ]) {
    assert.equal(isReadOnlyAction(action), false, action);
  }
});

test('WDL-194: findMissingPackages ignores tsconfig path aliases and baseUrl targets', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cauldron-wdl-194-'));
  fs.mkdirSync(path.join(dir, 'src/lib'), { recursive: true });
  fs.mkdirSync(path.join(dir, 'src/components'), { recursive: true });
  fs.mkdirSync(path.join(dir, 'src/pages'), { recursive: true });
  fs.writeFileSync(
    path.join(dir, 'package.json'),
    JSON.stringify({ name: 'alias-site', dependencies: { astro: '7.4.7' } }),
  );
  fs.writeFileSync(
    path.join(dir, 'tsconfig.json'),
    `{
      // JSONC comments and trailing commas are standard in Astro tsconfigs
      "extends": "astro/tsconfigs/strict",
      "compilerOptions": {
        "baseUrl": "src",
        "paths": {
          "@lib/*": ["lib/*"],
          "@components/*": ["components/*"],
        },
      },
    }`,
  );
  fs.writeFileSync(
    path.join(dir, 'src/lib/utils.ts'),
    'export const ok = true;\n',
  );
  fs.writeFileSync(
    path.join(dir, 'src/components/card.astro'),
    '<div>Card</div>\n',
  );
  fs.writeFileSync(
    path.join(dir, 'src/pages/index.astro'),
    `---
import { ok } from '@lib/utils';
import Card from '@components/card.astro';
import { helper } from 'lib/utils';
import { realMissing } from 'actually-missing-pkg';
---
<Card />
`,
  );
  assert.deepEqual(findMissingPackages(dir), ['actually-missing-pkg']);

  // Catch-all alias "*" must still flag missing packages when no local file resolves.
  const catchallDir = fs.mkdtempSync(
    path.join(os.tmpdir(), 'cauldron-wdl-194-catchall-'),
  );
  fs.mkdirSync(path.join(catchallDir, 'src/lib'), { recursive: true });
  fs.mkdirSync(path.join(catchallDir, 'src/pages'), { recursive: true });
  fs.writeFileSync(
    path.join(catchallDir, 'package.json'),
    JSON.stringify({ name: 'catchall-site', dependencies: { astro: '7.4.7' } }),
  );
  fs.writeFileSync(
    path.join(catchallDir, 'tsconfig.json'),
    JSON.stringify({
      compilerOptions: {
        baseUrl: '.',
        paths: {
          '*': ['src/*'],
        },
      },
    }),
  );
  fs.writeFileSync(
    path.join(catchallDir, 'src/lib/utils.ts'),
    'export const ok = true;\n',
  );
  fs.writeFileSync(
    path.join(catchallDir, 'src/pages/index.astro'),
    `---
import { ok } from 'lib/utils';
import nope from 'missing-package';
---
<p>{String(ok)}</p>
`,
  );
  assert.deepEqual(findMissingPackages(catchallDir), ['missing-package']);
});

await (async () => {
  const name =
    'WDL-215 & WDL-205: MCP rejects query code, rotates per session without disk file, and caps call log';
  const ud = fs.mkdtempSync(path.join(os.tmpdir(), 'cauldron-mcp-sec-'));
  const prevUd = globalThis.__cauldronUserData;
  globalThis.__cauldronUserData = ud;
  try {
    if (mcpModule.error) throw mcpModule.error;
    // Plant a legacy mcp-codes.json and ensure startMcpServer removes it and never persists a new one
    const legacyFile = path.join(ud, 'mcp-codes.json');
    fs.writeFileSync(
      legacyFile,
      JSON.stringify({ [sourceRoot]: 'stale-code' }),
    );

    const s1 = await mcpModule.startMcpServer({
      root: sourceRoot,
      siteName: 'Security Test',
      run: () => ({ ok: true }),
      readSelection: () => ({}),
      readDesign: () => ({}),
    });
    const code1 = s1.code;
    assert.equal(fs.existsSync(legacyFile), false);

    // Reject ?code= in query string
    const queryAttempt = await fetch(
      `${s1.url}?code=${encodeURIComponent(code1)}`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list' }),
      },
    );
    assert.equal(queryAttempt.status, 401);

    // Cap recorded calls at 200
    for (let i = 0; i < 210; i += 1) {
      const res = await fetch(s1.url, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-cauldron-code': code1,
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: i + 10,
          method: 'tools/call',
          params: { name: 'list_pages', arguments: {} },
        }),
      });
      assert.equal(res.status, 200);
    }
    assert.equal(mcpModule.mcpCalls().length, 200);
    s1.close();

    // New server start rotates access code and clears prior calls
    const s2 = await mcpModule.startMcpServer({
      root: sourceRoot,
      siteName: 'Security Test',
      run: () => ({ ok: true }),
      readSelection: () => ({}),
      readDesign: () => ({}),
    });
    assert.notEqual(s2.code, code1);
    assert.equal(mcpModule.mcpCalls().length, 0);
    assert.equal(fs.existsSync(legacyFile), false);
    s2.close();
    console.log(`PASS ${name}`);
  } catch (error) {
    failures++;
    console.error(`FAIL ${name}: ${error.message}`);
  } finally {
    globalThis.__cauldronUserData = prevUd;
  }
})();

test('WDL-187: editCssRule matches whole selectors, replaces without duplicates, and stays inside Astro style blocks', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cauldron-wdl-187-'));
  fs.mkdirSync(path.join(dir, 'src/styles'), { recursive: true });
  fs.mkdirSync(path.join(dir, 'src/pages'), { recursive: true });
  const cssFile = path.join(dir, 'src/styles/main.css');
  fs.writeFileSync(
    cssFile,
    [
      '/* h1 { color: purple; } */',
      '.hero h1 {',
      '  color: blue;',
      '}',
      'h1 {',
      '  font-size: 2rem;',
      '  color: black',
      '}',
    ].join('\n'),
  );

  const r1 = editCssRule(
    dir,
    'src/styles/main.css',
    'h1',
    'color',
    '#b84b30',
    hashOf(fs.readFileSync(cssFile, 'utf8')),
  );
  assert.equal(r1.ok, true);
  const updatedCss = fs.readFileSync(cssFile, 'utf8');
  assert.ok(updatedCss.includes('/* h1 { color: purple; } */'));
  assert.ok(updatedCss.includes('.hero h1 {\n  color: blue;\n}'));
  const h1Block = updatedCss.slice(updatedCss.indexOf('\nh1 {'));
  assert.equal(h1Block.match(/\bcolor:/g)?.length, 1);
  assert.equal(h1Block.includes('color: black'), false);
  assert.ok(h1Block.includes('color: #b84b30;'));

  const astroFile = path.join(dir, 'src/pages/index.astro');
  fs.writeFileSync(
    astroFile,
    '<main><h1>Hi</h1></main>\n<style>\n.hero h1 { color: blue; }\n</style>\n',
  );
  const r2 = editCssRule(
    dir,
    'src/pages/index.astro',
    'h1',
    'color',
    '#2a1712',
    hashOf(fs.readFileSync(astroFile, 'utf8')),
  );
  assert.equal(r2.ok, true);
  const updatedAstro = fs.readFileSync(astroFile, 'utf8');
  assert.ok(updatedAstro.includes('.hero h1 { color: blue; }'));
  assert.ok(
    updatedAstro.indexOf('h1 {\n  color: #2a1712;\n}') <
      updatedAstro.indexOf('</style>'),
  );

  // Quoted value without trailing semicolon + case-sensitive custom properties
  const edgeCss = path.join(dir, 'src/styles/edge.css');
  fs.writeFileSync(
    edgeCss,
    'h1 { font-family: "Arial" }\n:root { --Accent: red; --accent: blue; }\n',
  );
  const r3 = editCssRule(
    dir,
    'src/styles/edge.css',
    'h1',
    'color',
    'red',
    hashOf(fs.readFileSync(edgeCss, 'utf8')),
  );
  assert.equal(r3.ok, true);
  assert.ok(fs.readFileSync(edgeCss, 'utf8').includes('font-family: "Arial";'));
  const r4 = editCssRule(
    dir,
    'src/styles/edge.css',
    ':root',
    '--accent',
    'green',
    hashOf(fs.readFileSync(edgeCss, 'utf8')),
  );
  assert.equal(r4.ok, true);
  const finalEdge = fs.readFileSync(edgeCss, 'utf8');
  assert.ok(finalEdge.includes('--Accent: red;'));
  assert.ok(finalEdge.includes('--accent: green;'));
});

test('WDL-191 & WDL-197: PageOutline inserts token-based library pieces and LibraryPanel uses previewHtml', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cauldron-wdl-191-'));
  fs.mkdirSync(path.join(dir, 'src/pages'), { recursive: true });
  fs.mkdirSync(path.join(dir, 'cauldron'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'cauldron/tokens.css'), ':root {}\n');
  const pageFile = path.join(dir, 'src/pages/index.astro');
  const initial =
    '---\nconst title = "Home";\n---\n<main>\n  <section>Existing</section>\n</main>\n';
  fs.writeFileSync(pageFile, initial);

  const res = insertPageSection(
    dir,
    '/',
    0,
    { pieceId: 'editorial-intro' },
    hashOf(initial),
  );
  assert.equal(res.ok, true);
  const written = fs.readFileSync(pageFile, 'utf8');
  assert.ok(written.includes('cauldron/tokens.css'));
  assert.ok(written.includes('var(--cauldron-'));
  assert.ok(written.includes('<section class="cauldron-editorial-intro">'));
  assert.equal(/\b(?:py-16|text-gray-600)\b/.test(written), false);

  const outlineSrc = fs.readFileSync(
    path.join(process.cwd(), 'src/components/PageOutline.tsx'),
    'utf8',
  );
  assert.equal(/\b(?:py-16|py-24|text-gray-600)\b/.test(outlineSrc), false);

  const librarySrc = fs.readFileSync(
    path.join(process.cwd(), 'src/components/LibraryPanel.tsx'),
    'utf8',
  );
  assert.ok(librarySrc.includes('piece.previewHtml'));
  assert.equal(librarySrc.includes('renderStageVisual'), false);
});

test('WDL-188: curated stock photos download in main with MIME extensions and safe collision handling', () => {
  assert.equal(extensionForImageMime('image/jpeg; charset=utf-8'), '.jpg');
  assert.equal(extensionForImageMime('image/png'), '.png');
  assert.equal(extensionForImageMime('image/webp'), '.webp');
  assert.equal(extensionForImageMime('text/html'), null);
  assert.equal(wdl188Results.pngRes.ok, true);
  assert.equal(wdl188Results.pngRes.relativePath, '/images/hero-shot.png');
  assert.equal(wdl188Results.secondPngRes.ok, true);
  assert.equal(
    wdl188Results.secondPngRes.relativePath,
    '/images/hero-shot-2.png',
  );
  assert.deepEqual(
    fs.readFileSync(path.join(wdl188Root, 'public/images/hero-shot.png')),
    Buffer.from([137, 80, 78, 71]),
  );
  assert.equal(wdl188Results.webpRes.ok, true);
  assert.equal(wdl188Results.webpRes.relativePath, '/images/hero-webp.webp');
  assert.equal(wdl188Results.badStatusRes.ok, false);
  assert.match(wdl188Results.badStatusRes.problem, /HTTP 404/);
  assert.equal(wdl188Results.htmlRes.ok, false);
  assert.match(wdl188Results.htmlRes.problem, /Expected an image response/);
  assert.equal(wdl188Results.httpSchemeRes.ok, false);
  const traySrc = fs.readFileSync(
    path.join(process.cwd(), 'src/components/AssetTray.tsx'),
    'utf8',
  );
  assert.ok(traySrc.includes('window.cauldron.saveStockPhoto'));
  assert.equal(traySrc.includes('fetch(photo.fullUrl)'), false);
});

test('WDL-206: index.html does not load Google Fonts stylesheets on startup', () => {
  const indexHtml = fs.readFileSync(
    path.join(process.cwd(), 'index.html'),
    'utf8',
  );
  assert.equal(/<link[^>]*fonts\.googleapis\.com/i.test(indexHtml), false);
  assert.equal(/<link[^>]*fonts\.gstatic\.com/i.test(indexHtml), false);
  const designSrc = fs.readFileSync(
    path.join(process.cwd(), 'src/components/DesignPanel.tsx'),
    'utf8',
  );
  assert.ok(designSrc.includes('cauldron-specimen-fonts'));
  assert.ok(designSrc.includes('SPECIMEN_GOOGLE_FONTS_URL'));
});

test('WDL-210: preview view denies pop-up child windows and permission requests', () => {
  let windowOpenHandler = null;
  let permissionCheckHandler = null;
  let permissionRequestHandler = null;
  configurePreviewSecurity({
    setWindowOpenHandler(fn) {
      windowOpenHandler = fn;
    },
    session: {
      setPermissionCheckHandler(fn) {
        permissionCheckHandler = fn;
      },
      setPermissionRequestHandler(fn) {
        permissionRequestHandler = fn;
      },
    },
  });
  assert.deepEqual(windowOpenHandler({ url: 'https://example.com' }), {
    action: 'deny',
  });
  assert.equal(
    permissionCheckHandler({}, 'media', 'http://localhost:4321'),
    false,
  );
  let granted = true;
  permissionRequestHandler({}, 'geolocation', (allow) => {
    granted = allow;
  });
  assert.equal(granted, false);
});

test('WDL-208: main and renderer wire unhandledRejection and error surfacing visibly', () => {
  assert.equal(formatUnexpectedError(new Error('boom')), 'boom');
  assert.equal(formatUnexpectedError('plain failure'), 'plain failure');
  const handlers = new Map();
  const recorded = [];
  registerUnexpectedErrorHandlers(
    {
      on(event, fn) {
        handlers.set(event, fn);
      },
    },
    (kind, err) => recorded.push([kind, formatUnexpectedError(err)]),
  );
  assert.ok(handlers.has('uncaughtException'));
  assert.ok(handlers.has('unhandledRejection'));
  handlers.get('uncaughtException')(new Error('sync fail'));
  handlers.get('unhandledRejection')('async fail');
  assert.deepEqual(recorded, [
    ['error', 'sync fail'],
    ['unhandled rejection', 'async fail'],
  ]);
  const appSrc = fs.readFileSync(
    path.join(process.cwd(), 'src/App.tsx'),
    'utf8',
  );
  assert.ok(appSrc.includes("'cauldron:problem'"));
  assert.ok(appSrc.includes("window.addEventListener('unhandledrejection'"));
  assert.equal(
    isEditorUiAvailable(
      { isDestroyed: () => false, webContents: { isCrashed: () => false } },
      false,
    ),
    true,
  );
  assert.equal(
    isEditorUiAvailable(
      { isDestroyed: () => false, webContents: { isCrashed: () => false } },
      true,
    ),
    false,
  );
  assert.equal(
    isEditorUiAvailable(
      { isDestroyed: () => false, webContents: { isCrashed: () => true } },
      false,
    ),
    false,
  );
});

test('WDL-229: startup editor IPC check allows top-level editor frame and gates pickMode until preview runs', () => {
  const mainFrame = { parent: null, frameTreeNodeId: 1 };
  const editor = { isDestroyed: () => false, mainFrame };
  assert.equal(isAuthorizedEditorIpc(editor, editor, mainFrame), true);
  // Frame wrapper re-creation sharing the top-level frameTreeNodeId still passes.
  assert.equal(
    isAuthorizedEditorIpc(editor, editor, { parent: null, frameTreeNodeId: 1 }),
    true,
  );
  // Child frames and preview webContents are always refused.
  assert.equal(
    isAuthorizedEditorIpc(editor, editor, {
      parent: mainFrame,
      frameTreeNodeId: 2,
    }),
    false,
  );
  assert.equal(isAuthorizedEditorIpc(editor, {}, mainFrame), false);
  assert.equal(
    isAuthorizedEditorIpc(
      { isDestroyed: () => true, mainFrame },
      editor,
      mainFrame,
    ),
    false,
  );
  const indexSrc = fs.readFileSync(
    path.join(process.cwd(), 'src/main/index.ts'),
    'utf8',
  );
  assert.ok(
    indexSrc.indexOf('state.window = window;') <
      indexSrc.indexOf('void window.loadURL(rendererUrl)'),
  );
  const appSrc = fs.readFileSync(
    path.join(process.cwd(), 'src/App.tsx'),
    'utf8',
  );
  assert.ok(appSrc.includes('if (!site || !preview.running) return;'));
});

test('WDL-216: astro outDir detection and site package-manager build config', () => {
  assert.equal(
    batchEResults.customOutDir,
    path.join(batchEResults.siteRoot, 'custom-out'),
  );
  const traversalDir = fs.mkdtempSync(
    path.join(os.tmpdir(), 'cauldron-wdl216-traversal-'),
  );
  fs.writeFileSync(
    path.join(traversalDir, 'astro.config.mjs'),
    "export default { outDir: '../../escape' };\n",
    'utf8',
  );
  assert.equal(
    resolveAstroOutDir(traversalDir),
    path.join(traversalDir, 'dist'),
  );

  const pnpmDir = fs.mkdtempSync(
    path.join(os.tmpdir(), 'cauldron-wdl216-pnpm-'),
  );
  fs.writeFileSync(path.join(pnpmDir, 'pnpm-lock.yaml'), '', 'utf8');
  const pnpmCfg = resolveSiteBuildConfig(pnpmDir, (t) =>
    t === 'pnpm' ? '/usr/local/bin/pnpm' : '/usr/bin/npm',
  );
  assert.equal(pnpmCfg.manager, 'pnpm');
  assert.deepEqual(pnpmCfg.args, ['run', 'build']);
  const pnpmFallbackCfg = resolveSiteBuildConfig(pnpmDir, (t) =>
    t === 'pnpm' ? null : '/usr/bin/npm',
  );
  assert.equal(pnpmFallbackCfg.manager, 'npm');
  assert.deepEqual(pnpmFallbackCfg.args, ['run', 'build']);

  assert.equal(batchEResults.buildAsyncRes.ok, true);
  assert.equal(
    batchEResults.buildAsyncRes.dist,
    path.join(batchEResults.siteRoot, 'custom-out'),
  );
});

test('WDL-204: async build, static export, and async git publish stay non-blocking', () => {
  assert.equal(batchEResults.exportAsyncRes.ok, true);
  assert.equal(
    batchEResults.exportAsyncRes.distPath,
    path.join(batchEResults.siteRoot, 'custom-out'),
  );
  assert.equal(batchEResults.repoBefore.isRepo, true);
  assert.ok(batchEResults.repoBefore.changes.length > 0);
  assert.equal(batchEResults.pubRes.ok, true);
  assert.equal(batchEResults.repoAfter.changes.length, 0);
});

test('WDL-200: npm fallback drops pnpm flags and package installer supports timeout and cancel', () => {
  const npmFallbackPlan = planMissingPackageInstall({
    setupManager: 'pnpm',
    packages: ['lucide-react'],
    storeDirOrUserData: '/tmp/user-data',
    resolveToolOverride: (t) => (t === 'pnpm' ? null : '/usr/bin/npm'),
  });
  assert.equal(npmFallbackPlan.ok, true);
  assert.equal(npmFallbackPlan.manager, 'npm');
  assert.equal(npmFallbackPlan.fallbackFrom, 'pnpm');
  assert.deepEqual(npmFallbackPlan.args, [
    'install',
    '--save',
    '--no-audit',
    '--no-fund',
    'lucide-react',
  ]);
  assert.ok(!npmFallbackPlan.args.includes('--store-dir'));
  assert.ok(!npmFallbackPlan.args.includes('--reporter=append-only'));
  assert.ok(!npmFallbackPlan.args.includes('add'));

  const pnpmPlan = planMissingPackageInstall({
    setupManager: 'pnpm',
    packages: ['lucide-react'],
    storeDirOrUserData: '/tmp/user-data',
    resolveToolOverride: () => '/usr/local/bin/pnpm',
  });
  assert.equal(pnpmPlan.ok, true);
  assert.equal(pnpmPlan.manager, 'pnpm');
  assert.ok(pnpmPlan.args.includes('add'));
  assert.ok(pnpmPlan.args.includes('--store-dir'));
  assert.ok(pnpmPlan.args.includes('--reporter=append-only'));

  assert.equal(batchEResults.timeoutRes.ok, false);
  assert.equal(batchEResults.timeoutRes.timedOut, true);
  assert.ok(batchEResults.timeoutRes.problem?.includes('timed out'));

  assert.equal(batchEResults.cancelRes.ok, false);
  assert.equal(batchEResults.cancelRes.cancelled, true);
  assert.ok(batchEResults.cancelRes.problem?.includes('cancelled'));
});

test('WDL-151: Cloudflare deploy never invents URLs, classifies auth vs non-auth errors, and avoids unasked wrangler.toml', () => {
  assert.equal(
    parseCloudflarePagesUrl('Visit https://demo-123.pages.dev/preview now'),
    'https://demo-123.pages.dev/preview',
  );
  assert.equal(parseCloudflarePagesUrl('Deployed without URL'), undefined);

  assert.equal(batchEResults.deployNoUrl.ok, true);
  assert.equal(batchEResults.deployNoUrl.url, undefined);
  assert.ok(
    batchEResults.deployNoUrl.note?.includes('check your Cloudflare dashboard'),
  );
  assert.equal(batchEResults.wranglerAfterNoOpt, false);

  assert.equal(batchEResults.deployWithUrl.ok, true);
  assert.equal(
    batchEResults.deployWithUrl.url,
    'https://batch-e-site.pages.dev',
  );

  assert.equal(batchEResults.deployProjectError.ok, false);
  assert.equal(batchEResults.deployProjectError.isAuthError, false);
  assert.ok(
    batchEResults.deployProjectError.problem?.includes('Project not found'),
  );

  const authFailure = classifyWranglerFailure(
    'Not logged in. Run wrangler login or set CLOUDFLARE_API_TOKEN',
    1,
  );
  assert.equal(authFailure.isAuthError, true);
  assert.ok(authFailure.problem.includes('Wrangler login'));

  const missingCli = classifyWranglerFailure(
    'npm error could not determine executable to run',
    1,
  );
  assert.equal(missingCli.isAuthError, false);
  assert.ok(missingCli.problem.includes('Wrangler CLI could not be found'));
});

process.exitCode = failures ? 1 : 0;
