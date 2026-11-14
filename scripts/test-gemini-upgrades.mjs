// Comprehensive verification suite for the 5 Gemini upgrade phases
// (Starter Templates, Extended Catalogue, Page Outline AST Operations & Safety,
// Asset Saving & Curated Photos, Static Site Export & Honest Deploy Diagnostic).

import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { registerHooks } from 'node:module';

// Stand-in electron stub so modules importing electron (publishing, recovery, etc.)
// can be tested in headless Node.
const electronStub = path.join(
  fs.mkdtempSync(path.join(os.tmpdir(), 'cauldron-electron-upgrades-')),
  'electron.mjs',
);
fs.writeFileSync(
  electronStub,
  `export const app = {
  getAppPath: () => process.cwd(),
  getPath: () => globalThis.__cauldronUserData ?? ${JSON.stringify(
    path.join(
      fs.mkdtempSync(path.join(os.tmpdir(), 'cauldron-electron-home-')),
      'userData',
    ),
  )}
};\nexport class BrowserWindow {}\nexport default { app };\n`,
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

const { getTemplateFiles, STARTER_TEMPLATES } =
  await import('../src/main/templates.ts');
const { createProject } = await import('../src/main/projects.ts');
const { EXTENDED_LIBRARY } = await import('../src/main/library-pieces.ts');
const { LIBRARY, addPiece } = await import('../src/main/library.ts');
const {
  readPageSections,
  reorderPageSections,
  duplicatePageSection,
  insertPageSection,
  deletePageSection,
  setPageSectionAnchor,
} = await import('../src/main/actions.ts');
const { saveAssetFile, CURATED_STOCK_PHOTOS } =
  await import('../src/main/assets.ts');
const { exportStaticSite, deployCloudflarePages } =
  await import('../src/main/publishing.ts');

let failures = 0;
function test(name, fn) {
  try {
    fn();
    console.log(`PASS ${name}`);
  } catch (err) {
    failures++;
    console.error(`FAIL ${name}`);
    console.error(err);
  }
}

// -----------------------------------------------------------------------------
// Phase 1: Starter Templates
// -----------------------------------------------------------------------------

test('Phase 1: STARTER_TEMPLATES defines all 5 approved templates', () => {
  const ids = STARTER_TEMPLATES.map((t) => t.id);
  assert.equal(ids.length, 5);
  assert.deepEqual(ids.sort(), [
    'good-trade',
    'minimal',
    'penta',
    'sunday-table',
    'the-desk',
  ]);

  for (const tmpl of STARTER_TEMPLATES) {
    assert.ok(tmpl.id, 'template must have id');
    assert.ok(tmpl.name, 'template must have name');
    assert.ok(tmpl.category, 'template must have category');
    assert.ok(tmpl.description, 'template must have description');
    assert.ok(tmpl.direction, 'template must have direction');
    assert.ok(tmpl.directionId, 'template must have directionId');
    assert.ok(Array.isArray(tmpl.pages) && tmpl.pages.length > 0);
  }
});

test('Phase 1: getTemplateFiles and createProject scaffold each template with tokens and Astro files', () => {
  const templates = [
    'sunday-table',
    'penta',
    'good-trade',
    'the-desk',
    'minimal',
  ];

  for (const tmplId of templates) {
    const files = getTemplateFiles(tmplId, `Test ${tmplId}`);
    assert.ok(
      typeof files === 'object' && files !== null,
      `files object for ${tmplId}`,
    );
    assert.ok(
      files['src/layouts/Base.astro'],
      `Base.astro returned for ${tmplId}`,
    );
    assert.ok(
      files['src/pages/index.astro'],
      `index.astro returned for ${tmplId}`,
    );

    const tmpParent = fs.mkdtempSync(
      path.join(os.tmpdir(), `cauldron-tmpl-${tmplId}-`),
    );
    const projectName = `site-${tmplId}`;
    const result = createProject({
      parent: tmpParent,
      name: projectName,
      astroVersion: '5.0.0',
      template: tmplId,
    });

    assert.equal(result.ok, true, `createProject succeeded for ${tmplId}`);
    const root = result.project.root;

    // Required project manifest and config files
    assert.ok(
      fs.existsSync(path.join(root, 'package.json')),
      'package.json exists',
    );
    assert.ok(
      fs.existsSync(path.join(root, 'astro.config.mjs')),
      'astro.config.mjs exists',
    );
    assert.ok(
      fs.existsSync(path.join(root, 'src/pages/index.astro')),
      'index.astro exists',
    );
    assert.ok(
      fs.existsSync(path.join(root, 'src/layouts/Base.astro')),
      'Base.astro exists',
    );

    // One single tokens file lives in cauldron/tokens.css; src/styles/tokens.css must not be duplicated.
    const tokensPath = path.join(root, 'cauldron/tokens.css');
    assert.ok(
      fs.existsSync(tokensPath),
      `cauldron/tokens.css exists for ${tmplId}`,
    );
    assert.equal(
      fs.existsSync(path.join(root, 'src/styles/tokens.css')),
      false,
      `src/styles/tokens.css must not be duplicated for ${tmplId}`,
    );
    const tokenContent = fs.readFileSync(tokensPath, 'utf8');

    if (tmplId !== 'minimal') {
      assert.ok(
        tokenContent.includes('--cauldron-c-') &&
          tokenContent.includes('--cauldron-font-'),
        `expected direction tokens in cauldron/tokens.css for ${tmplId}`,
      );
      const baseContent = fs.readFileSync(
        path.join(root, 'src/layouts/Base.astro'),
        'utf8',
      );
      assert.ok(
        baseContent.includes("import '../../cauldron/tokens.css'"),
        `expected Base.astro to load cauldron/tokens.css for ${tmplId}`,
      );
    } else {
      assert.ok(
        tokenContent.includes('--cauldron-font-') ||
          tokenContent.includes('system-ui'),
        `expected minimal tokens for ${tmplId}`,
      );
    }
  }
});

// -----------------------------------------------------------------------------
// Phase 2: Extended Catalogue
// -----------------------------------------------------------------------------

test('Phase 2: EXTENDED_LIBRARY has at least 15 pieces and LIBRARY preserves exactly 5', () => {
  assert.ok(
    EXTENDED_LIBRARY.length >= 15,
    `EXTENDED_LIBRARY has >= 15 pieces (actual: ${EXTENDED_LIBRARY.length})`,
  );
  assert.equal(
    LIBRARY.length,
    5,
    `LIBRARY has exactly 5 pieces (actual: ${LIBRARY.length})`,
  );

  const combined = [...LIBRARY, ...EXTENDED_LIBRARY];
  for (const piece of combined) {
    assert.ok(typeof piece.id === 'string' && piece.id.length > 0, 'id');
    assert.ok(typeof piece.name === 'string' && piece.name.length > 0, 'name');
    assert.ok(
      typeof piece.category === 'string' && piece.category.length > 0,
      'category',
    );
    assert.ok(
      typeof piece.code === 'string' && piece.code.length > 0,
      'code string',
    );
    assert.equal(
      piece.plainAstro,
      true,
      `piece ${piece.id} has plainAstro: true`,
    );
  }
});

test('Phase 2: addPiece adds an extended catalogue piece to an Astro project', () => {
  const tmpParent = fs.mkdtempSync(
    path.join(os.tmpdir(), 'cauldron-add-piece-'),
  );
  const result = createProject({
    parent: tmpParent,
    name: 'library-test-site',
    astroVersion: '5.0.0',
    template: 'minimal',
  });
  assert.equal(result.ok, true);
  const root = result.project.root;

  const pieceId = 'centered-brand-nav';
  const addRes = addPiece(root, { pieceId, page: '/', mode: 'add' });
  assert.equal(addRes.ok, true, 'addPiece returned ok: true');

  const componentPath = path.join(
    root,
    'src/components/CenteredBrandNav.astro',
  );
  assert.ok(
    fs.existsSync(componentPath),
    'component file written to src/components',
  );
  const compContent = fs.readFileSync(componentPath, 'utf8');
  assert.ok(
    compContent.includes('Centered Brand Nav'),
    'component markup written',
  );

  const pageContent = fs.readFileSync(
    path.join(root, 'src/pages/index.astro'),
    'utf8',
  );
  assert.ok(
    pageContent.includes(
      "import CenteredBrandNav from '../components/CenteredBrandNav.astro';",
    ),
    'page includes component import',
  );
  assert.ok(
    pageContent.includes('<CenteredBrandNav />'),
    'page includes component tag',
  );
});

// -----------------------------------------------------------------------------
// Phase 3: Page Outline AST Operations & Safety (Critical P1 Finding 5)
// -----------------------------------------------------------------------------

test('Phase 3 (P1 Finding 5): Reorder safety, stale hash rejection, and byte-for-byte outside preservation', () => {
  const tmpParent = fs.mkdtempSync(
    path.join(os.tmpdir(), 'cauldron-outline-safety-'),
  );
  const result = createProject({
    parent: tmpParent,
    name: 'outline-safety-site',
    astroVersion: '5.0.0',
    template: 'minimal',
  });
  assert.equal(result.ok, true);
  const root = result.project.root;
  const pageFile = path.join(root, 'src/pages/index.astro');

  // Custom frontmatter, outside header, 3 sections, outside footer, and outside script
  const initialFrontmatter = `---
// Custom author notes and variables
const siteName = "Craftsman Studio";
let visitorCount = 42;
---`;

  const outsideHeader = `<header class="outside-header">
  <a href="/">Brand Wordmark</a>
</header>`;

  const section1 = `<section id="sec-1"><h1>One</h1></section>`;
  const section2 = `<section id="sec-2"><h2>Two</h2></section>`;
  const section3 = `<section id="sec-3"><h3>Three</h3></section>`;

  const outsideFooter = `<footer class="outside-footer">
  <p>© 2026 Craftsman Studio. All rights reserved.</p>
</footer>`;

  const outsideScript = `<script>
  console.log("Outside client script preserved");
</script>`;

  const initialContent = `${initialFrontmatter}
<Base title={siteName}>
${outsideHeader}
${section1}
${section2}
${section3}
${outsideFooter}
${outsideScript}
</Base>
`;

  fs.writeFileSync(pageFile, initialContent, 'utf8');

  // 1. Read initial sections and hash
  const initialRead = readPageSections(root, '/');
  assert.equal(initialRead.ok, true);
  assert.equal(initialRead.sections.length, 3);
  const staleHash = initialRead.hash;
  assert.ok(typeof staleHash === 'string' && staleHash.length > 0);

  // 2. Make an outside edit to the frontmatter
  const modifiedFrontmatter = `---
// Custom author notes and variables
const siteName = "Craftsman Studio";
const outsideSecret = 'preserved';
let visitorCount = 42;
---`;
  const fileWithOutsideEdit = initialContent.replace(
    initialFrontmatter,
    modifiedFrontmatter,
  );
  fs.writeFileSync(pageFile, fileWithOutsideEdit, 'utf8');

  // 3. Stale hash MUST be rejected and leave the file completely untouched!
  const staleReorder = reorderPageSections(root, '/', 0, 1, staleHash);
  assert.equal(
    staleReorder.ok,
    false,
    'reorder with stale baseHash must be refused',
  );
  assert.equal(
    fs.readFileSync(pageFile, 'utf8'),
    fileWithOutsideEdit,
    'file must remain untouched after refused reorder',
  );

  // 4. Re-read with new valid hash
  const freshRead = readPageSections(root, '/');
  assert.equal(freshRead.ok, true);
  const validHash = freshRead.hash;
  assert.notEqual(validHash, staleHash);

  // 5. Reorder section 0 and 1
  const reorderResult = reorderPageSections(root, '/', 0, 1, validHash);
  assert.equal(reorderResult.ok, true, 'reorder with valid hash succeeds');

  const afterReorder = fs.readFileSync(pageFile, 'utf8');

  // Assert section 1 is now before section 0
  const posSec2 = afterReorder.indexOf('id="sec-2"');
  const posSec1 = afterReorder.indexOf('id="sec-1"');
  assert.ok(
    posSec2 !== -1 && posSec1 !== -1 && posSec2 < posSec1,
    'section 2 is now placed before section 1',
  );

  // Assert the outside frontmatter edit, header, footer, and script are byte-for-byte preserved
  assert.ok(
    afterReorder.includes("const outsideSecret = 'preserved';"),
    'outside frontmatter edit preserved',
  );
  assert.ok(
    afterReorder.includes(outsideHeader),
    'outside header byte-for-byte preserved',
  );
  assert.ok(
    afterReorder.includes(outsideFooter),
    'outside footer byte-for-byte preserved',
  );
  assert.ok(
    afterReorder.includes(outsideScript),
    'outside script tag byte-for-byte preserved',
  );

  // 6. Test duplicatePageSection: duplicates section 0 immediately after section 0
  const dupRes = duplicatePageSection(root, '/', 0, reorderResult.hash);
  assert.equal(dupRes.ok, true, 'duplicatePageSection succeeds');
  assert.equal(
    dupRes.sections.length,
    4,
    'section count increased by 1 after duplication',
  );
  assert.equal(
    dupRes.sections[0].tag,
    dupRes.sections[1].tag,
    'section duplicated immediately after target',
  );

  // 7. Test insertPageSection: inserts a new section at index 1
  const insertedCode = `<section id="sec-inserted"><h4>Inserted Section</h4></section>`;
  const insRes = insertPageSection(root, '/', 1, insertedCode, dupRes.hash);
  assert.equal(insRes.ok, true, 'insertPageSection succeeds');
  assert.equal(
    insRes.sections.length,
    5,
    'section count increased after insertion',
  );
  assert.equal(
    insRes.sections[2].anchorId,
    'sec-inserted',
    'inserted section located after index 1',
  );

  // 8. Test setPageSectionAnchor: sets id="new-anchor"
  const anchorRes = setPageSectionAnchor(
    root,
    '/',
    2,
    'new-anchor',
    insRes.hash,
  );
  assert.equal(anchorRes.ok, true, 'setPageSectionAnchor succeeds');
  assert.equal(anchorRes.sections[2].anchorId, 'new-anchor');
  const fileWithAnchor = fs.readFileSync(pageFile, 'utf8');
  assert.ok(
    fileWithAnchor.includes('id="new-anchor"'),
    'new anchor id written to file',
  );

  // 9. Test deletePageSection: deletes a section cleanly
  const delRes = deletePageSection(root, '/', 2, anchorRes.hash);
  assert.equal(delRes.ok, true, 'deletePageSection succeeds');
  assert.equal(
    delRes.sections.length,
    4,
    'section deleted, count reduced to 4',
  );
  const fileAfterDelete = fs.readFileSync(pageFile, 'utf8');
  assert.ok(
    !fileAfterDelete.includes('id="new-anchor"'),
    'deleted section no longer present',
  );
});

// -----------------------------------------------------------------------------
// Phase 4: Asset Saving & Curated Photos
// -----------------------------------------------------------------------------

test('Phase 4: Curated photography list is populated and asset saving validates path safety', () => {
  assert.ok(
    Array.isArray(CURATED_STOCK_PHOTOS) && CURATED_STOCK_PHOTOS.length > 0,
    'CURATED_STOCK_PHOTOS has entries',
  );

  for (const photo of CURATED_STOCK_PHOTOS) {
    assert.ok(photo.id, 'photo id');
    assert.ok(photo.title, 'photo title');
    assert.ok(photo.fullUrl || photo.thumbUrl, 'photo url');
    assert.ok(photo.thumbUrl, 'photo thumbUrl');
    assert.ok(photo.photographer, 'photo photographer');
    assert.ok(photo.directionId, 'photo directionId');
  }

  const tmpParent = fs.mkdtempSync(path.join(os.tmpdir(), 'cauldron-assets-'));
  const projRes = createProject({
    parent: tmpParent,
    name: 'asset-test-site',
    astroVersion: '5.0.0',
    template: 'minimal',
  });
  assert.equal(projRes.ok, true);
  const root = projRes.project.root;

  // Save valid asset file
  const testBuffer = Buffer.from('fake-jpeg-binary-data');
  const saveRes = saveAssetFile(root, 'test.jpg', testBuffer);
  assert.equal(saveRes.ok, true, 'saveAssetFile returned ok: true');
  assert.equal(saveRes.relativePath, '/images/test.jpg');

  const expectedFile = path.join(root, 'public/images/test.jpg');
  assert.ok(fs.existsSync(expectedFile), 'asset exists in public/images/');
  assert.deepEqual(
    fs.readFileSync(expectedFile),
    testBuffer,
    'asset bytes match',
  );

  // Path traversal attempts must be rejected
  const traversal1 = saveAssetFile(
    root,
    '../../test.jpg',
    Buffer.from('traversal'),
  );
  assert.equal(
    traversal1.ok,
    false,
    'path traversal with ../../ must be rejected',
  );

  const traversal2 = saveAssetFile(
    root,
    '/etc/evil.jpg',
    Buffer.from('traversal'),
  );
  assert.equal(
    traversal2.ok,
    false,
    'absolute path traversal must be rejected',
  );

  // WDL-188: colliding names rename cleanly instead of overwriting, or refuse when asked
  const secondBuffer = Buffer.from('second-jpeg-binary-data');
  const collideRename = saveAssetFile(root, 'test.jpg', secondBuffer);
  assert.equal(collideRename.ok, true);
  assert.equal(collideRename.relativePath, '/images/test-2.jpg');
  assert.deepEqual(
    fs.readFileSync(expectedFile),
    testBuffer,
    'original file must not be overwritten',
  );
  assert.deepEqual(
    fs.readFileSync(path.join(root, 'public/images/test-2.jpg')),
    secondBuffer,
  );

  const collideRefuse = saveAssetFile(root, 'test.jpg', secondBuffer, {
    onCollision: 'refuse',
  });
  assert.equal(collideRefuse.ok, false);
});

// -----------------------------------------------------------------------------
// Phase 5: Static Site Export & Honest Deploy Diagnostic
// -----------------------------------------------------------------------------

test('Phase 5: exportStaticSite reports unbuilt site failures cleanly without crashing', () => {
  const emptyDir = fs.mkdtempSync(
    path.join(os.tmpdir(), 'cauldron-empty-export-'),
  );
  const exportRes = exportStaticSite(emptyDir);
  assert.equal(
    exportRes.ok,
    false,
    'exportStaticSite on empty dir reports ok: false',
  );
  assert.ok(exportRes.problem, 'problem message is reported');
  assert.ok(typeof exportRes.log === 'string', 'build log captured');
});

test('Phase 5 (P0 Finding 1): deployCloudflarePages fails honestly without credentials and never shows a fake live URL', () => {
  const tmpParent = fs.mkdtempSync(
    path.join(os.tmpdir(), 'cauldron-deploy-honest-'),
  );

  // 1. Unbuilt site fails build stage cleanly
  const unbuiltRes = deployCloudflarePages(tmpParent, 'honest-site');
  assert.equal(unbuiltRes.ok, false);
  assert.equal(
    unbuiltRes.url,
    undefined,
    'never return a fake url when unbuilt',
  );
  assert.ok(unbuiltRes.problem);

  // 2. Mock project with built dist/index.html but no Cloudflare credentials
  const mockProj = path.join(tmpParent, 'mock-proj');
  fs.mkdirSync(path.join(mockProj, 'dist'), { recursive: true });
  fs.writeFileSync(
    path.join(mockProj, 'dist/index.html'),
    '<!doctype html><html><body><h1>Built</h1></body></html>',
    'utf8',
  );
  fs.writeFileSync(
    path.join(mockProj, 'package.json'),
    JSON.stringify({
      name: 'mock-proj',
      scripts: {
        build:
          "node -e \"import fs from 'node:fs'; fs.mkdirSync('dist', {recursive:true}); fs.writeFileSync('dist/index.html', '<h1>Built</h1>');\"",
      },
    }),
    'utf8',
  );

  // Ensure no accidental credentials in test runner environment
  const savedToken = process.env.CLOUDFLARE_API_TOKEN;
  delete process.env.CLOUDFLARE_API_TOKEN;

  try {
    const deployRes = deployCloudflarePages(mockProj, 'mock-honest-site');
    assert.equal(
      deployRes.ok,
      false,
      'deployCloudflarePages must report failure without credentials',
    );
    assert.equal(
      deployRes.url,
      undefined,
      'must NEVER return a fake https://...pages.dev URL',
    );
    assert.ok(
      deployRes.problem &&
        (deployRes.problem.includes('Cloudflare Pages deployment requires') ||
          deployRes.problem.includes('Wrangler CLI could not be found') ||
          deployRes.problem.includes('Cloudflare Pages deployment failed')),
      `problem diagnostic explains exact failure cause (got: ${deployRes.problem})`,
    );
    assert.equal(
      fs.existsSync(path.join(mockProj, 'wrangler.toml')),
      false,
      'deployCloudflarePages must not silently create wrangler.toml',
    );
  } finally {
    if (savedToken) process.env.CLOUDFLARE_API_TOKEN = savedToken;
  }
});

if (failures > 0) {
  console.error(
    `\nFAILED: ${failures} check(s) failed in test-gemini-upgrades.`,
  );
  process.exit(1);
} else {
  console.log(
    '\nAll Gemini upgrade phases verified successfully with honest diagnostics!',
  );
}
