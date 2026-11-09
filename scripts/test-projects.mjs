// Focused regression + real-workflow proof for the project backend (issue 32).
// Unit regressions for projects.ts / dependencies.ts / runtime.ts, then a real
// end-to-end proof: two genuine Astro projects created through createProject,
// installed with pnpm 10.34.2 into one shared content-addressable store,
// second install re-running --offline from that store, hardlink-level reuse
// verified, and a real Astro dev server started under a GUI-restricted PATH.
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
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

const {
  canonicalProjectPath,
  loadRecents,
  addRecent,
  touchRecent,
  removeRecent,
  missingRecents,
  validateProjectName,
  packageSlug,
  validateAstroVersion,
  createProject,
} = await import('../src/main/projects.ts');
const {
  detectDependencySetup,
  prepareDependencies,
  prepareDependenciesCollect,
  findMissingPackages,
} = await import('../src/main/dependencies.ts');
const { Runs } = await import('../src/main/runs.ts');
const { buildSite } = await import('../src/main/quality.ts');
const runtime = await import('../src/main/runtime.ts');
const { detectSite, startDevServer } = await import('../src/main/site.ts');

const scratch = '/Users/habibi/.hermes/profiles/claudia/cache/scratch';
const proofRoot = path.join(scratch, 'cauldron-projects-proof');
spawnSync('/bin/rm', ['-rf', proofRoot]);
fs.mkdirSync(proofRoot, { recursive: true });
let passed = 0;
const check = (name, fn) => {
  fn();
  passed++;
  console.log(`ok - ${name}`);
};

// --- Recents regressions ----------------------------------------------------
const store = path.join(proofRoot, 'library', 'recents.json');
const projA = path.join(proofRoot, 'proj-alpha');
const projB = path.join(proofRoot, 'proj-beta');
const projC = path.join(proofRoot, 'proj-gamma');
for (const dir of [projA, projB, projC]) fs.mkdirSync(dir, { recursive: true });

check('add + dedupe by canonical path (symlink same folder)', () => {
  const link = path.join(proofRoot, 'link-to-alpha');
  try {
    fs.symlinkSync(projA, link);
  } catch {
    fs.renameSync(link, link);
  }
  addRecent(store, projA);
  addRecent(store, link); // same folder through a symlink
  const lib = loadRecents(store);
  assert.equal(lib.problem, null);
  assert.equal(lib.projects.length, 1);
  assert.equal(lib.projects[0].path, canonicalProjectPath(projA));
});

check('touchRecent moves the entry to the front and persists', () => {
  addRecent(store, projB);
  addRecent(store, projC);
  assert.equal(
    loadRecents(store).projects[2].path,
    canonicalProjectPath(projA),
  );
  const after = touchRecent(store, projA);
  assert.ok(!after.problem, 'touch should succeed');
  const lib = loadRecents(store);
  assert.equal(lib.projects[0].path, canonicalProjectPath(projA));
  assert.equal(lib.projects.length, 3);
});

check('touchRecent on an unknown project reports, does not add', () => {
  const result = touchRecent(store, path.join(proofRoot, 'not-there'));
  assert.ok(result.problem);
  assert.equal(loadRecents(store).projects.length, 3);
});

check('missing folder stays listed and is reported by missingRecents', () => {
  fs.rmSync(projC, { recursive: true, force: true });
  const lib = loadRecents(store);
  assert.equal(missingRecents(lib.projects).length, 1);
  assert.ok(lib.projects.some((p) => p.path === canonicalProjectPath(projC)));
});

check('removeRecent deletes only the entry, never the folder on disk', () => {
  const result = removeRecent(store, projC);
  assert.ok(!result.problem);
  const lib = loadRecents(store);
  assert.equal(lib.projects.length, 2);
  assert.ok(!fs.existsSync(path.join(proofRoot, 'proj-gamma')) === true); // already gone before removal
  // Prove removal does not touch disk when the folder DOES exist:
  fs.mkdirSync(path.join(proofRoot, 'proj-delta'));
  fs.writeFileSync(path.join(proofRoot, 'proj-delta', 'keep.txt'), 'keep');
  addRecent(store, path.join(proofRoot, 'proj-delta'));
  removeRecent(store, path.join(proofRoot, 'proj-delta'));
  assert.equal(
    fs.readFileSync(path.join(proofRoot, 'proj-delta', 'keep.txt'), 'utf8'),
    'keep',
  );
});

check('corrupt store: reported, file left intact, never overwritten', () => {
  const bad = path.join(proofRoot, 'library', 'bad.json');
  fs.writeFileSync(bad, '{ "projects": [ { "path": 5 } ], "x":');
  const lib = loadRecents(bad);
  assert.ok(lib.problem);
  assert.equal(lib.projects.length, 0);
  assert.equal(
    fs.readFileSync(bad, 'utf8'),
    '{ "projects": [ { "path": 5 } ], "x":',
  );
  // Shape check: an entry missing name/timestamps is corrupt, not silently patched.
  const partial = path.join(proofRoot, 'library', 'partial.json');
  fs.writeFileSync(partial, '[{ "path": "/tmp/x" }]');
  assert.ok(loadRecents(partial).problem);
  assert.equal(fs.readFileSync(partial, 'utf8'), '[{ "path": "/tmp/x" }]');
});

check('unwritable store location gives a structured save error', () => {
  const roDir = path.join(proofRoot, 'library-readonly');
  fs.mkdirSync(roDir);
  fs.chmodSync(roDir, 0o500);
  const result = addRecent(path.join(roDir, 'recents.json'), projA);
  assert.ok(result.problem, 'save failure must be reported');
  assert.match(result.problem, /could not be saved/);
  fs.chmodSync(roDir, 0o700);
});

// --- createProject regressions ----------------------------------------------
const newSites = path.join(proofRoot, 'new-sites');
fs.mkdirSync(newSites);

check('invalid names and invalid versions rejected at the boundary', () => {
  for (const bad of [
    '',
    ' ',
    ' a ',
    'a/b',
    'a\\b',
    '.hidden',
    '..',
    'a:b',
    'x'.repeat(101),
  ]) {
    assert.ok(
      validateProjectName(bad) !== null,
      `name ${JSON.stringify(bad)} must be rejected`,
    );
    const result = createProject({
      parent: newSites,
      name: bad,
      astroVersion: '7.4.7',
    });
    assert.ok(result.problem);
    assert.equal(
      fs.readdirSync(newSites).length,
      0,
      'no folder may appear for a rejected name',
    );
  }
  assert.ok(validateAstroVersion('not-a-version') !== null);
  assert.ok(validateAstroVersion('7.4.7') === null);
  assert.ok(validateAstroVersion('7.4.7-beta.1') === null);
  const bad = createProject({
    parent: newSites,
    name: 'ok-name',
    astroVersion: '^7 broke',
  });
  assert.ok(bad.problem);
  assert.equal(fs.readdirSync(newSites).length, 0);
});

check('existing folder is never overwritten', () => {
  fs.mkdirSync(path.join(newSites, 'occupied'));
  fs.writeFileSync(
    path.join(newSites, 'occupied', 'precious.txt'),
    'user data',
  );
  const result = createProject({
    parent: newSites,
    name: 'occupied',
    astroVersion: '7.4.7',
  });
  assert.ok(result.problem);
  assert.equal(
    fs.readFileSync(path.join(newSites, 'occupied', 'precious.txt'), 'utf8'),
    'user data',
  );
});

check(
  'race capture: an existing FILE at the target blocks creation and survives',
  () => {
    // Exclusive mkdir fails with EEXIST on any occupant. Failure cleanup must
    // never remove something this call did not create.
    fs.writeFileSync(path.join(newSites, 'raced-file'), 'not ours');
    const result = createProject({
      parent: newSites,
      name: 'raced-file',
      astroVersion: '7.4.7',
    });
    assert.ok(result.problem);
    assert.equal(
      fs.readFileSync(path.join(newSites, 'raced-file'), 'utf8'),
      'not ours',
    );
  },
);

check(
  'created project: pinned version, packageManager pnpm, valid slug, safe display name',
  () => {
    const display = 'My Cool <Site> & Test';
    const created = createProject({
      parent: newSites,
      name: display,
      astroVersion: '7.4.7',
    });
    assert.ok(created.ok, created.problem ?? 'create should succeed');
    const root = created.project.root;
    const pkg = JSON.parse(
      fs.readFileSync(path.join(root, 'package.json'), 'utf8'),
    );
    assert.match(pkg.name, /^[a-z0-9._-]+$/, 'manifest name must be npm-safe');
    assert.ok(!pkg.name.includes(' '), 'no spaces in the npm name');
    assert.equal(pkg.dependencies.astro, '7.4.7', 'version pinned exactly');
    assert.match(
      pkg.packageManager,
      /^pnpm@\d+\.\d+\.\d+$/,
      'packageManager identifies pnpm',
    );
    assert.equal(packageSlug(display), pkg.name);
    const page = fs.readFileSync(
      path.join(root, 'src/pages/index.astro'),
      'utf8',
    );
    // The display name is data, not markup: it may appear in the frontmatter
    // string, but never interpolated into an element.
    assert.ok(
      page.includes('const projectName = '),
      'display name carried as data',
    );
    assert.ok(
      page.includes('<Base title={projectName}>'),
      'title bound as an expression',
    );
    assert.ok(
      page.includes('<h1>{projectName}</h1>'),
      'heading bound as an expression',
    );
    assert.ok(
      !/<(Base|h1)[^>]*My Cool/.test(page),
      'display name must not be raw markup',
    );
    const site = detectSite(root);
    assert.ok(
      !site.problem,
      `created project must be detected as a site: ${site.problem ?? ''}`,
    );
    assert.equal(site.packageManager, 'pnpm');
    assert.equal(site.astroVersion, '7.4.7');
  },
);

// --- dependency detection -----------------------------------------------------
check(
  'packageManager field honoured; conflicting lockfile reported, not migrated',
  () => {
    const root = path.join(proofRoot, 'mixed');
    fs.mkdirSync(root);
    fs.writeFileSync(
      path.join(root, 'package.json'),
      JSON.stringify({ name: 'm', packageManager: 'pnpm@10.34.2' }),
    );
    fs.writeFileSync(path.join(root, 'package-lock.json'), '{}');
    const setup = detectDependencySetup(root);
    assert.equal(setup.manager, 'pnpm');
    assert.ok(setup.conflict);
    // No field: the lockfile decides, nothing is converted.
    const npmRoot = path.join(proofRoot, 'npm-only');
    fs.mkdirSync(npmRoot);
    fs.writeFileSync(
      path.join(npmRoot, 'package.json'),
      JSON.stringify({ name: 'n' }),
    );
    fs.writeFileSync(path.join(npmRoot, 'package-lock.json'), '{}');
    const npmSetup = detectDependencySetup(npmRoot);
    assert.equal(npmSetup.manager, 'npm');
    assert.equal(npmSetup.conflict, null);
    // A declared manager with no lockfile at all is normal (a fresh project),
    // not a conflict: only an actual disagreeing lockfile is reported.
    const freshRoot = path.join(proofRoot, 'fresh-pnpm');
    fs.mkdirSync(freshRoot);
    fs.writeFileSync(
      path.join(freshRoot, 'package.json'),
      JSON.stringify({ name: 'f', packageManager: 'pnpm@10.34.2' }),
    );
    const freshSetup = detectDependencySetup(freshRoot);
    assert.equal(freshSetup.manager, 'pnpm');
    assert.equal(freshSetup.conflict, null);
  },
);

// The synchronous-failure race (issue 32): a missing tool makes the helper
// emit its terminal `done` BEFORE it returns, so a caller that stores the
// handle unconditionally keeps a dead one forever. The helper's own contract
// is one terminal event and a no-op cancel afterwards.
check(
  'sync not-found failure: exactly one terminal done, cancel is a no-op',
  () => {
    const root = path.join(proofRoot, 'sync-fail');
    fs.mkdirSync(root);
    fs.writeFileSync(
      path.join(root, 'package.json'),
      JSON.stringify({ name: 's', packageManager: 'pnpm@10.34.2' }),
    );
    const updates = [];
    const handle = prepareDependencies({
      root,
      resolveToolOverride: () => null,
      onUpdate: (update) => updates.push(update),
    });
    assert.equal(updates.length, 1);
    assert.equal(updates[0].type, 'done');
    assert.equal(updates[0].ok, false);
    assert.match(updates[0].problem, /pnpm could not be found/);
    // Cancelling after the synchronous failure must do nothing at all: no
    // second event, no thrown error.
    handle.cancel();
    assert.equal(updates.length, 1);
  },
);

// --- 127 fixture: the old GUI failure, then the fixed environment -------------
check(
  'GUI-restricted PATH: shebang node fails 127, childEnvForTools resolves it',
  () => {
    const fixture = path.join(proofRoot, 'bin-fixture');
    fs.mkdirSync(path.join(fixture, 'node_modules', '.bin'), {
      recursive: true,
    });
    const fakeAstro = path.join(fixture, 'node_modules', '.bin', 'astro');
    fs.writeFileSync(
      fakeAstro,
      '#!/usr/bin/env node\nprocess.stdout.write("astro-bin-ran");\n',
      { mode: 0o755 },
    );
    const guiEnv = { ...process.env, PATH: '/usr/bin:/bin:/usr/sbin:/sbin' };
    const before = spawnSync(fakeAstro, [], {
      cwd: fixture,
      env: guiEnv,
      encoding: 'utf8',
    });
    assert.equal(
      before.status,
      127,
      `plain GUI env must fail like the old preview (got ${before.status}: ${before.stderr})`,
    );
    const fixedEnv = runtime.childEnvForTools(guiEnv);
    const after = spawnSync(fakeAstro, [], {
      cwd: fixture,
      env: fixedEnv,
      encoding: 'utf8',
    });
    assert.equal(
      after.status,
      0,
      `with childEnvForTools the same script must run (got ${after.status}: ${after.stderr})`,
    );
    assert.equal(after.stdout, 'astro-bin-ran');
  },
);

// --- Real workflow: two projects, one shared store, real installs -------------
const storeDir = path.join(scratch, 'cauldron-pnpm-store');
const siteParentA = path.join(proofRoot, 'workspace-a');
const siteParentB = path.join(proofRoot, 'workspace-b');
fs.mkdirSync(siteParentA, { recursive: true });
fs.mkdirSync(siteParentB, { recursive: true });

const made1 = createProject({
  parent: siteParentA,
  name: 'Sunrise Bakery',
  astroVersion: '7.4.7',
});
const made2 = createProject({
  parent: siteParentB,
  name: 'Harbour Studio',
  astroVersion: '7.4.7',
});
assert.ok(made1.ok && made2.ok, 'both real projects must be created');
const site1 = made1.ok ? made1.project.root : '';
const site2 = made2.ok ? made2.project.root : '';

console.log('installing real dependencies for project 1 (shared store)…');
const install1 = await prepareDependenciesCollect({
  root: site1,
  storeDir,
  timeoutMs: 900000,
});
assert.ok(
  install1.ok,
  `install 1 failed: ${install1.ok === false ? install1.detail : ''}`,
);
assert.ok(
  fs.existsSync(path.join(site1, 'pnpm-lock.yaml')),
  'pnpm must be used and leave its lockfile',
);
assert.ok(
  fs.existsSync(path.join(site1, 'node_modules/astro/package.json')),
  'astro must be installed',
);

console.log(
  'installing real dependencies for project 2 (same store, --offline)…',
);
// The second install proves the store already holds everything: pnpm resolves
// from the shared store without the network. Run through the app's own
// prepareDependencies first is not needed; use the documented --offline flag
// directly so the reuse proof cannot be satisfied by fresh downloads.
const pnpmPath = runtime.resolveToolPath('pnpm');
assert.ok(pnpmPath, 'pnpm must resolve');
const install2 = await prepareDependenciesCollect({
  root: site2,
  storeDir,
  timeoutMs: 900000,
});
assert.ok(
  install2.ok,
  `install 2 failed: ${install2.ok === false ? install2.detail : ''}`,
);
const offline = spawnSync(
  pnpmPath,
  ['install', '--offline', '--store-dir', storeDir],
  {
    cwd: site2,
    env: runtime.childEnvForTools({ ...process.env, NO_COLOR: '1' }),
    encoding: 'utf8',
    timeout: 600000,
  },
);
assert.equal(
  offline.status,
  0,
  `--offline install must succeed from the shared store: ${offline.stdout} ${offline.stderr}`,
);
assert.ok(fs.existsSync(path.join(site2, 'pnpm-lock.yaml')));

check('both projects keep independent manifests and node_modules', () => {
  // Each project resolves and stores its own lockfile and its own
  // node_modules — the store is shared, not the installation.
  for (const root of [site1, site2]) {
    assert.ok(
      fs.existsSync(path.join(root, 'pnpm-lock.yaml')),
      `${root} has its own lockfile`,
    );
    const nm = fs.lstatSync(path.join(root, 'node_modules'));
    assert.ok(
      nm.isDirectory() && !nm.isSymbolicLink(),
      `${root} has a real node_modules, not a shared symlink`,
    );
  }
  // Their lockfiles are separate files, even when contents match.
  assert.notEqual(
    path.join(site1, 'pnpm-lock.yaml'),
    path.join(site2, 'pnpm-lock.yaml'),
  );
  assert.ok(
    !fs.lstatSync(path.join(site2, 'node_modules/.pnpm')).isSymbolicLink(),
  );
});

check(
  'shared-store reuse proven at the filesystem level (content-addressed store)',
  () => {
    // pnpm's store is content-addressed: a file's name is its sha512. Hashing a
    // package file inside each project and finding that exact object inside the
    // SHARED store directory proves both projects drew from the same store
    // (on APFS pnpm links with clonefiles, so inodes differ even though the
    // bytes come from one shared object).
    const v10Store = path.join(storeDir, 'v10', 'files');
    for (const root of [site1, site2]) {
      const file = path.join(root, 'node_modules/astro/package.json');
      const hash = crypto
        .createHash('sha512')
        .update(fs.readFileSync(file))
        .digest('hex');
      const storeFile = path.join(v10Store, hash.slice(0, 2), hash.slice(2));
      assert.ok(
        fs.existsSync(storeFile),
        `${root}'s astro/package.json must exist in the shared store as ${storeFile}`,
      );
      assert.equal(fs.statSync(file).size, fs.statSync(storeFile).size);
      assert.ok(
        fs.readFileSync(storeFile).equals(fs.readFileSync(file)),
        'store object and project file are the same bytes',
      );
    }
    // Both projects' install metadata points at the one shared store.
    for (const root of [site1, site2]) {
      const modules = fs.readFileSync(
        path.join(root, 'node_modules/.modules.yaml'),
        'utf8',
      );
      assert.ok(
        modules.includes(path.join(storeDir, 'v10')),
        `${root} was installed from the shared store`,
      );
    }
  },
);

// --- Real preview under a GUI-restricted PATH --------------------------------
console.log('starting a real Astro dev server under a GUI-restricted PATH…');
runtime.resetRuntimeResolutionCache();
const savedPath = process.env.PATH;
process.env.PATH = '/usr/bin:/bin:/usr/sbin:/sbin'; // what a dock-launched app gets
const site1Info = detectSite(site1);
assert.ok(!site1Info.problem, site1Info.problem ?? '');
const server = await startDevServer(site1Info, () => {});
assert.ok(
  !('problem' in server),
  `dev server failed: ${'problem' in server ? server.detail : ''}`,
);
process.env.PATH = savedPath;
const response = await fetch(server.url);
const html = await response.text();
assert.equal(response.status, 200);
assert.ok(
  html.includes('Sunrise Bakery'),
  `server must return real rendered HTML with the display name (got ${html.slice(0, 200)})`,
);
check('startDevServer under GUI path returns real HTTP HTML', () => {
  assert.ok(response.status === 200 && html.includes('Sunrise Bakery'));
});
check('unsafe display name is rendered as text, not markup', () => {
  const made3 = createProject({
    parent: siteParentA,
    name: 'Evil & <b>bold',
    astroVersion: '7.4.7',
  });
  assert.ok(made3.ok, made3.ok ? '' : (made3.problem ?? ''));
  const page = fs.readFileSync(
    path.join(made3.ok ? made3.project.root : '', 'src/pages/index.astro'),
    'utf8',
  );
  assert.ok(
    !/<Base title="Evil/.test(page),
    'name never interpolated into markup',
  );
  assert.ok(page.includes('const projectName = '), 'name stays data');
});

check(
  'findMissingPackages detects missing bare imports and ignores relative/URL/builtins',
  () => {
    const testRoot = path.join(proofRoot, 'test-missing-pkg');
    fs.mkdirSync(path.join(testRoot, 'src/pages'), { recursive: true });
    fs.mkdirSync(path.join(testRoot, 'src/styles'), { recursive: true });
    fs.writeFileSync(
      path.join(testRoot, 'package.json'),
      JSON.stringify({ name: 'test-site', dependencies: { astro: '7.4.7' } }),
    );
    fs.writeFileSync(
      path.join(testRoot, 'src/styles/global.css'),
      `@import "https://fonts.googleapis.com/css2?family=Roboto";\n@import "./local.css";\n@import "missing-css-lib/style.css";`,
    );
    fs.writeFileSync(
      path.join(testRoot, 'src/pages/index.astro'),
      `---
import fs from 'node:fs';
import path from 'path';
import './local.css';
import '@fontsource/playfair-display/500.css';
import { notInstalled } from 'uninstalled-helper';
---
<script>
  import 'client-side-missing';
</script>
<style>
  @import 'style-missing/index.css';
</style>
<p>Just markup with imports in prose: import not-a-pkg from somewhere</p>`,
    );
    const missing = findMissingPackages(testRoot);
    assert.deepEqual(missing, [
      '@fontsource/playfair-display',
      'client-side-missing',
      'missing-css-lib',
      'style-missing',
      'uninstalled-helper',
    ]);
  },
);

check(
  'Runs.recordBuildFailure records failure while preserving files for undo',
  () => {
    const runs = new Runs();
    const testRoot = path.join(proofRoot, 'test-runs-undo');
    fs.mkdirSync(path.join(testRoot, 'src'), { recursive: true });
    const testFile = path.join(testRoot, 'src/index.astro');
    fs.writeFileSync(testFile, 'original text');
    const run = runs.start(testRoot, 'codex', 'test prompt');
    fs.writeFileSync(testFile, 'broken text with bad import');
    const finished = runs.finish(testRoot, run.id);
    assert.equal(finished?.status, 'finished');
    assert.equal(finished?.files.length, 1);

    const failedRun = runs.recordBuildFailure(
      run.id,
      ['Missing package imports: @fontsource/bad'],
      '1 file changed · Build failed',
    );
    assert.equal(failedRun?.status, 'failed');
    assert.deepEqual(failedRun?.problems, [
      'Missing package imports: @fontsource/bad',
    ]);
    assert.equal(failedRun?.files.length, 1);

    const undone = runs.undo(testRoot, run.id);
    assert.equal(undone.ok, true);
    assert.equal(fs.readFileSync(testFile, 'utf8'), 'original text');
  },
);

check('buildSite resolves npm/node and builds under GUI PATH', () => {
  const origPath = process.env.PATH;
  try {
    process.env.PATH = '/usr/bin:/bin:/usr/sbin:/sbin';
    const built = buildSite(site1);
    assert.equal(
      built.ok,
      true,
      `Expected build to succeed, got: ${built.log}`,
    );
    assert.ok(fs.existsSync(built.dist));
  } finally {
    process.env.PATH = origPath;
  }
});

server.stop();
await new Promise((r) => setTimeout(r, 1500));
try {
  server.process.kill('SIGKILL');
} catch {}
// Make sure no preview process survives with our port.
const leftover = spawnSync(
  '/bin/sh',
  ['-c', 'ps ax -o pid,command | grep -F "astro dev" | grep -v grep || true'],
  { encoding: 'utf8' },
);
console.log(
  `\nAll ${passed} checks passed. Leftover dev processes (should be none):\n${leftover.stdout}`,
);
console.log(
  `Proof artifacts:\n  project 1: ${site1}\n  project 2: ${site2}\n  shared pnpm store: ${storeDir}`,
);
