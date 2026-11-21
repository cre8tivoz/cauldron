// Rendered acceptance for the component library (WDL-263).
//
// Renders every library piece (starters + catalogue) in its showcase palette
// AND in all ten design directions, plus the interactive pieces as they run on
// a real site (their shipped Astro markup, styles and script). Then, in a real
// Chromium (the repo's own Electron), it checks:
//   - contrast on actual glyph pixels, at eight frozen frames of every
//     animation, including gradient and text-clipped headlines;
//   - no horizontal overflow at a 375px phone width;
//   - Command Palette and Coverflow behaviour with real keyboard/mouse input,
//     and that both still work as plain links with JavaScript off.
// Run: npm run test:library:render   (add --write to refresh the evidence JSON)
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync, execFileSync } from 'node:child_process';
import { registerHooks } from 'node:module';
import { pathToFileURL } from 'node:url';

const repo = path.resolve(new URL('..', import.meta.url).pathname);
const stub = path.join(
  fs.mkdtempSync(path.join(os.tmpdir(), 'cauldron-render-')),
  'electron.mjs',
);
fs.writeFileSync(
  stub,
  'export const app = { getAppPath: () => process.cwd(), getPath: () => "/tmp/cauldron-render-userdata", isPackaged: false };\nexport class BrowserWindow {}\nexport default { app };\n',
);
registerHooks({
  load(url, context, next) {
    return next(url, {
      ...context,
      format: url.endsWith('.ts') ? 'module-typescript' : context.format,
    });
  },
  resolve(specifier, context, next) {
    if (specifier === 'electron')
      return next(pathToFileURL(stub).href, context);
    if (specifier.startsWith('.') && !path.extname(specifier))
      return next(`${specifier}.ts`, context);
    return next(specifier, context);
  },
});
const { LIBRARY, piecePreview } = await import(
  pathToFileURL(path.join(repo, 'src/main/library.ts')).href
);
const { EXTENDED_LIBRARY } = await import(
  pathToFileURL(path.join(repo, 'src/main/library-pieces.ts')).href
);
const { DIRECTIONS, tokensCss } = await import(
  pathToFileURL(path.join(repo, 'src/main/directions.ts')).href
);
const { demoDirectionFor } = await import(
  pathToFileURL(path.join(repo, 'src/main/library-demo-directions.ts')).href
);

const work = fs.mkdtempSync(path.join(os.tmpdir(), 'cauldron-library-render-'));
const only = process.argv
  .find((a) => a.startsWith('--only='))
  ?.slice(7)
  .split(',');
const pieces = [...LIBRARY, ...EXTENDED_LIBRARY].filter(
  (p) => !only || only.includes(p.id),
);
assert.ok(pieces.length, `no piece matches ${only}`);
const audit = [];
const behaviour = [];
const write = (name, html) => {
  const file = path.join(work, `${name}.html`);
  fs.writeFileSync(file, html);
  return file;
};

// The interactive pieces as a site runs them: the shipped .astro text, its
// markup, its scoped styles and its script (Astro ships it as a module).
function scriptedPage(piece, direction) {
  const section = /<section[\s\S]*<\/section>/.exec(piece.astro)[0];
  const style = /<style>([\s\S]*?)<\/style>/.exec(piece.astro)[1];
  const script = /<script>([\s\S]*?)<\/script>/.exec(piece.astro)?.[1] ?? '';
  return `<!doctype html><html lang="en-AU"><head><meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<style>${tokensCss(direction)}</style>
<style>*, *::before, *::after { box-sizing: border-box; } body { margin: 0; background: var(--cauldron-c-bg); color: var(--cauldron-c-ink); font-family: var(--cauldron-font-body); }</style>
<style>${style}</style></head><body>${section}<script type="module">${script}</script></body></html>`;
}

for (const piece of pieces) {
  const showcase = demoDirectionFor(piece.id);
  audit.push({
    id: piece.id,
    palette: `showcase:${showcase.name}`,
    phone: true,
    file: write(`${piece.id}--showcase`, piecePreview(piece, showcase)),
  });
  for (const direction of DIRECTIONS)
    audit.push({
      id: piece.id,
      palette: direction.id,
      phone: false,
      file: write(
        `${piece.id}--${direction.id}`,
        piecePreview(piece, direction),
      ),
    });
  if (piece.needsScript) {
    for (const [label, direction] of [
      [`showcase:${showcase.name}`, showcase],
      ...DIRECTIONS.map((x) => [x.id, x]),
    ])
      audit.push({
        id: `${piece.id} (running)`,
        palette: label,
        phone: direction === showcase,
        file: write(
          `${piece.id}--run--${label.replace(/[^a-z0-9-]+/gi, '_')}`,
          scriptedPage(piece, direction),
        ),
      });
    behaviour.push({
      id: piece.id,
      file: write(`${piece.id}--behaviour`, scriptedPage(piece, showcase)),
    });
  }
}
fs.writeFileSync(
  path.join(work, 'manifest.json'),
  JSON.stringify({ audit, behaviour }),
);

const electron = path.join(repo, 'node_modules', '.bin', 'electron');
const run = spawnSync(
  electron,
  [path.join(repo, 'scripts', 'library-render-runner.cjs'), work],
  { encoding: 'utf8', timeout: 20 * 60 * 1000 },
);
const reportFile = path.join(work, 'report.json');
assert.ok(
  fs.existsSync(reportFile),
  `the renderer produced no report (exit ${run.status}): ${run.stderr?.slice(-800)}`,
);
const report = JSON.parse(fs.readFileSync(reportFile, 'utf8'));
assert.equal(report.error, undefined, `renderer error: ${report.error}`);

let passed = 0;
const failures = [];
const check = (name, ok, detail = '') => {
  if (ok) passed++;
  else failures.push(`${name}${detail ? ` — ${detail}` : ''}`);
};

// ── Contrast on real glyph pixels ────────────────────────────────────────────
const need = (r) =>
  r.size >= 24 || (r.size >= 18.66 && r.weight >= 700) ? 3 : 4.5;
let measured = 0;
const worstByPiece = {};
for (const page of report.audits) {
  const ok = page.results.length > 0;
  check(
    `${page.id} in ${page.palette}: text was measured`,
    ok,
    'no text runs could be measured',
  );
  if (page.skipped?.length)
    console.log(
      `note - ${page.id} in ${page.palette}: ${page.skipped.length} text run(s) not painted (occluded or off-screen)`,
    );
  for (const r of page.results) {
    measured++;
    const w = worstByPiece[page.id];
    if (!w || r.p5 / need(r) < w.ratio / w.need)
      worstByPiece[page.id] = {
        ratio: Number(r.p5.toFixed(2)),
        need: need(r),
        palette: page.palette,
        text: r.text,
        frame: r.frame,
      };
    // A run that never paints at full opacity is judged at the colour it is
    // actually painted, and says so in the failure, rather than vanishing.
    const note = r.empty
      ? ' [nothing painted]'
      : r.faded
        ? ` [faded, ${Math.round((r.maxCoverage ?? 0) * 100)}% painted]`
        : '';
    check(
      `${page.id} in ${page.palette}: "${r.text}" (frame ${r.frame + 1}/${page.frames})${note}`,
      Number(r.p5.toFixed(2)) >= need(r),
      `${r.p5.toFixed(2)}:1, needs ${need(r)}:1 (${r.size}px/${r.weight})${note}`,
    );
  }
}

// ── Phone width ──────────────────────────────────────────────────────────────
for (const p of report.phones)
  check(
    `${p.id} (${p.palette}) fits a 375px phone`,
    p.scroll <= 376 && p.section <= 376,
    `scrollWidth ${p.scroll}, section ${p.section}`,
  );

// ── Behaviour with real input ─────────────────────────────────────────────────
const cp = report.behaviour['command-palette'];
if (only && !only.includes('command-palette')) {
  // not selected
} else if (cp) {
  check('palette: clicking the search focuses it', cp.focusedByClick);
  check('palette: search is a combobox wired to its list', cp.combobox);
  check('palette: the "/" hint shows once the script runs', cp.hintShown);
  check(
    'palette: typing "pri" leaves only Pricing',
    JSON.stringify(cp.afterPri) === '["$Pricing"]' ||
      JSON.stringify(cp.afterPri) === '["Pricing"]' ||
      (cp.afterPri.length === 1 && cp.afterPri[0].endsWith('Pricing')),
    JSON.stringify(cp.afterPri),
  );
  check(
    'palette: empty groups hide while filtering',
    JSON.stringify(cp.groupsAfterPri) === '["Go to"]',
    JSON.stringify(cp.groupsAfterPri),
  );
  check(
    'palette: Escape clears the search and restores every item',
    cp.afterEscape.value === '' && cp.afterEscape.shown === 6,
    JSON.stringify(cp.afterEscape),
  );
  check(
    'palette: no match shows the empty message',
    cp.noMatch.shown === 0 && cp.noMatch.emptyShown,
    JSON.stringify(cp.noMatch),
  );
  check(
    'palette: keywords match ("book" finds Book a call)',
    cp.keyword.length === 1 && cp.keyword[0].endsWith('Book a call'),
    JSON.stringify(cp.keyword),
  );
  check(
    'palette: arrow keys move the active item with aria-selected and aria-activedescendant',
    cp.activeAfterDown2.text?.endsWith('Services') &&
      cp.activeAfterDown2.selected === 'true' &&
      cp.activeAfterDown2.descendant,
    JSON.stringify(cp.activeAfterDown2),
  );
  check(
    'palette: arrow keys wrap',
    cp.wrapUp?.endsWith('Book a call'),
    cp.wrapUp,
  );
  check(
    'palette: Enter opens the active item',
    cp.enterOpened === '/services',
    String(cp.enterOpened),
  );
  check('palette: "/" focuses the search from the page', cp.slashFocuses);
} else check('palette behaviour ran', false);
const cf = report.behaviour.coverflow;
if (only && !only.includes('coverflow')) {
  // not selected
} else if (cf) {
  check('coverflow: controls appear once the script runs', cf.controlsShown);
  check(
    'coverflow: starts on Editorial',
    cf.start.centre === 'Editorial' &&
      cf.start.status === '3 of 5: Editorial' &&
      cf.start.current === 'Editorial',
    JSON.stringify(cf.start),
  );
  check(
    'coverflow: the next button brings the next project forward',
    cf.afterNext.centre === 'Motion' &&
      cf.afterNext.status === '4 of 5: Motion',
    JSON.stringify(cf.afterNext),
  );
  check(
    'coverflow: the left arrow key goes back',
    cf.afterLeft.centre === 'Editorial',
    JSON.stringify(cf.afterLeft),
  );
  check(
    'coverflow: it wraps past the last project',
    cf.wrapped.centre === 'Identity' &&
      cf.wrapped.status === '1 of 5: Identity',
    JSON.stringify(cf.wrapped),
  );
  check(
    'coverflow: clicking the left card brings that card forward and stays on the page',
    cf.sideClick.centre === cf.sideTarget && cf.sideOpened === null,
    `${cf.sideTarget} -> ${JSON.stringify(cf.sideClick)} opened ${cf.sideOpened}`,
  );
  check(
    'coverflow: clicking the centre card follows its link',
    cf.centreOpened === cf.centreHref,
    `${cf.centreHref} vs ${cf.centreOpened}`,
  );
  check(
    'coverflow: a swipe advances one project and fires no link',
    cf.afterSwipe.centre !== cf.swipeFrom && cf.swipeOpened === null,
    `${cf.swipeFrom} -> ${cf.afterSwipe.centre}, opened ${cf.swipeOpened}`,
  );
} else check('coverflow behaviour ran', false);
for (const [id, ns] of Object.entries(report.noScript)) {
  check(
    `${id}: without JavaScript every destination is a real link`,
    ns.links.length >= 5 && ns.links.every((h) => h && h !== '#'),
    JSON.stringify(ns.links),
  );
  check(
    `${id}: without JavaScript no dead control is shown`,
    ns.visibleButtons === 0,
    `${ns.visibleButtons} visible buttons`,
  );
}

const pages = report.audits.length;
console.log(
  `library render: ${pages} rendered pages (${pieces.length} pieces × showcase + ${DIRECTIONS.length} directions, plus the running interactive pieces), ${measured} measured text runs`,
);
for (const f of failures) console.error(`FAIL - ${f}`);
const counts = {};
for (const page of report.audits) counts[page.id] ??= { pages: 0, failed: 0 };
for (const f of failures) {
  const id = Object.keys(counts)
    .sort((a, b) => b.length - a.length)
    .find((k) => f.startsWith(k));
  if (id) counts[id].failed++;
}
for (const [id, c] of Object.entries(counts))
  if (c.failed) console.error(`BY PIECE ${id}: ${c.failed}`);
console.log(`${passed} passed, ${failures.length} failed`);

if (process.argv.includes('--write') && !only) {
  const revision = execFileSync('git', ['rev-parse', '--short', 'HEAD'], {
    cwd: repo,
    encoding: 'utf8',
  }).trim();
  const dirty =
    execFileSync('git', ['status', '--porcelain', '--', 'src'], {
      cwd: repo,
      encoding: 'utf8',
    }).trim() !== '';
  fs.writeFileSync(
    path.join(repo, 'docs/library-audit/render-audit.json'),
    JSON.stringify(
      {
        revision: dirty ? `${revision}+uncommitted` : revision,
        pieces: pieces.length,
        palettes: DIRECTIONS.length + 1,
        renderedPages: pages,
        measuredTextRuns: measured,
        passed,
        failed: failures.length,
        failures,
        worstByPiece,
      },
      null,
      2,
    ) + '\n',
  );
}
fs.rmSync(work, { recursive: true, force: true });
if (failures.length) process.exit(1);
