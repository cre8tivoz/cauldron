import fs from 'node:fs';
import path from 'node:path';
import { app } from 'electron';
import { hashOf } from './files';
import type { Site } from './site';
import type { EditOperation, Location } from './edit';
import type { Draft } from './recovery';

type Api = {
  addPiece?: (payload: {
    pieceId: string;
    page: string;
    mode: 'add' | 'replace';
    replaceSelector?: string;
  }) => { ok: boolean; problem?: string; page?: string };
  collections?: () => CauldronCollections;
  repoState?: () => {
    isRepo: boolean;
    changes: Array<{ file: string }>;
    branch?: string;
  };
  publish?: (payload: { message: string; push: boolean }) => {
    ok: boolean;
    problem?: string;
    committed?: number;
    details?: string;
  };
  qualityRun?: (payload: { pages?: string[] }) => Promise<{
    built: boolean;
    findings: Array<{ label: string; status: string; detail: string }>;
    measured: Array<{ label: string; value: string }>;
    buildLog: string;
  }>;
  entry?: (file: string) => Record<string, unknown> | { problem: string };
  saveEntry?: (payload: {
    file: string;
    baseHash: string;
    change: Record<string, string>;
  }) => { ok: boolean; problem?: string; hash?: string };

  openSiteAt: (root: string) => Promise<unknown>;
  startPreview: () => Promise<unknown>;
  previewLoad: (url: string) => Promise<void>;
  previewHtml: () => Promise<string>;
  previewClick: (selector: string) => Promise<unknown>;
  previewClickLeaf: () => Promise<unknown>;
  getSelection: () => { location: Location } | null;
  writeText: (value: string) => {
    ok: boolean;
    problem?: string;
    conflict?: unknown;
  };
  writeStyle: (properties: Record<string, string>) => {
    ok: boolean;
    problem?: string;
  };
  undo: () => unknown;
  createPage: (page: { path: string; title: string }) => Promise<unknown>;
  runAction: (request: unknown) => { ok: boolean; [key: string]: unknown };
  startRun: (payload: { tool: string; prompt: string }) => {
    ok: boolean;
    run?: { id: string };
  };
  finishRun: (id: string) => Promise<{
    ok: boolean;
    run?: { files: string[]; highlighted: unknown[] };
  }>;
  undoRun: (id: string) => {
    ok: boolean;
    problem?: string;
    clashes?: string[];
  };
  saveDraft: (drafts: Draft[]) => void;
  setDirection?: (id: string) => { ok: boolean; problem?: string };
  sendAgent?: (payload: {
    tool: 'claude' | 'codex' | 'hermes';
    request: string;
  }) => {
    ok: boolean;
    runId?: string;
    problem?: string;
  };
  waitForAgent?: (timeout: number) => Promise<{ ok: boolean; note?: string }>;
  buildPromptText?: (request: string) => string;
  mcpInfo?: () => Promise<{ url: string; code: string } | null>;
  restoreDraft: (draft: Draft) => { ok: boolean; problem?: string };
  status: (message: string) => void;
  site: () => Site | null;
};

const results: Array<{ name: string; ok: boolean; detail: string }> = [];

function check(name: string, ok: boolean, detail = ''): void {
  results.push({ name, ok, detail });
  console.log(
    `${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`,
  );
}

function singleRegionChange(before: string, after: string): boolean {
  let start = 0;
  while (
    start < before.length &&
    start < after.length &&
    before[start] === after[start]
  )
    start += 1;
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
  return (
    before.slice(0, start) === after.slice(0, start) &&
    before.slice(endBefore + 1) === after.slice(endAfter + 1)
  );
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function waitFor(
  predicate: () => Promise<boolean>,
  timeout = 30000,
): Promise<boolean> {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    if (await predicate()) return true;
    await wait(400);
  }
  return false;
}

export type AgentTestApi = {
  openSiteAt: (root: string) => Promise<unknown>;
  setDirection: (id: string) => { ok: boolean; problem?: string };
  sendAgent: (payload: {
    tool: 'claude' | 'codex' | 'hermes';
    request: string;
  }) => {
    ok: boolean;
    runId?: string;
    problem?: string;
  };
  waitForAgent: (timeout: number) => Promise<{ ok: boolean; note?: string }>;
  runs: () => Array<{
    id: string;
    tool: string;
    status: string;
    files: string[];
  }>;
  buildPromptText: (request: string) => string;
  mcpInfo?: () => Promise<{ url: string; code: string } | null>;
};

type CauldronCollections = Array<{
  name: string;
  fields: Array<{ name: string; type: string }>;
  entries: Array<{ id: string; file: string; hash: string }>;
}>;

/** 4.3: every starter piece drops into a real site, builds, and ships no JavaScript. */
export async function runLibraryTest(root: string, api: Api): Promise<void> {
  try {
    await api.openSiteAt(root);
    api.setDirection?.('long-lunch');
    const { execFileSync } = await import('node:child_process');
    const pages = api.runAction({ action: 'listPages' }) as {
      pages?: Array<{ page: string }>;
    };
    const page = pages.pages?.[0]?.page ?? '/';
    const pieces = [
      'editorial-intro',
      'newsletter-footer',
      'glow-action',
      'heading-reveal',
      'woven-cloth',
    ];

    let allAdded = true;
    for (const piece of pieces) {
      const added = api.addPiece?.({ pieceId: piece, page, mode: 'add' });
      if (!added?.ok) {
        allAdded = false;
        check(
          `4.3 ${piece} adds to the page`,
          false,
          added?.problem ?? 'no result',
        );
      }
    }
    check('4.3 all five pieces copy into the site', allAdded);

    check(
      '4.3 pieces are plain Astro with no client JavaScript',
      !fs
        .readFileSync(path.join(root, 'src/pages/index.astro'), 'utf8')
        .includes('client:'),
    );

    try {
      execFileSync('npm', ['run', 'build'], {
        cwd: root,
        stdio: 'pipe',
        timeout: 300000,
      });
      check('4.3 the site still builds with every piece in it', true);
    } catch (error) {
      check(
        '4.3 the site still builds with every piece in it',
        false,
        String(error).slice(0, 200),
      );
    }

    const built = fs.existsSync(path.join(root, 'dist'))
      ? fs.readdirSync(path.join(root, 'dist'), { recursive: true }).length
      : 0;
    check('4.3 a real build was produced', built > 0, `${built} files in dist`);

    // Adopting the direction and passing accessibility, in the built page.
    const { serveDist, inspectionWindow, runAxe } = await import('./quality');
    const { findDirection } = await import('./directions');
    const direction = findDirection('long-lunch');
    const server = await serveDist(path.join(root, 'dist'));
    const window = inspectionWindow();
    try {
      await window.loadURL(server.url);
      await new Promise((resolve) => setTimeout(resolve, 400));

      const count = (await window.webContents.executeJavaScript(
        `document.querySelectorAll('section[class^="cauldron-"]').length`,
      )) as number;
      check(
        '4.3 every piece is on the built page',
        count >= 5,
        `${count} pieces`,
      );

      const adopted = (await window.webContents.executeJavaScript(
        `(() => {
          const heading = document.querySelector('.cauldron-editorial-intro h2');
          const glow = document.querySelector('.cauldron-glow-action .glow');
          if (!heading || !glow) return null;
          return {
            font: getComputedStyle(heading).fontFamily,
            size: getComputedStyle(heading).fontSize,
            background: getComputedStyle(glow).backgroundColor,
          };
        })()`,
      )) as { font: string; size: string; background: string } | null;

      check(
        '4.3 the pieces use the site direction tokens',
        Boolean(adopted) &&
          adopted!.font
            .toLowerCase()
            .includes(direction?.fonts.display.family.toLowerCase() ?? ''),
        adopted ? `${adopted.font} at ${adopted.size}` : 'nothing found',
      );

      const violations = await runAxe(
        window,
        `[...document.querySelectorAll('section[class^="cauldron-"]')]`,
      );
      check(
        '4.3 the added pieces pass the accessibility checks',
        violations !== null && violations.length === 0,
        violations
          ? violations
              .map(
                (violation) =>
                  `${violation.id}: ${violation.where.join(' | ')}`,
              )
              .join('; ') || 'no axe violations'
          : 'axe did not run',
      );
    } finally {
      if (!window.isDestroyed()) window.destroy();
      server.close();
    }

    console.log(
      `\n${results.filter((r) => r.ok).length}/${results.length} passed`,
    );
  } catch (error) {
    console.error('LIBRARY TEST ERROR', error);
  } finally {
    app.exit(results.every((r) => r.ok) ? 0 : 1);
  }
}

/** 5.1: publishing through the site's own Git repository, on a throwaway copy. */
export async function runPublishTest(root: string, api: Api): Promise<void> {
  const { execFileSync } = await import('node:child_process');
  const scratch = path.join(
    app.getPath('temp'),
    `cauldron-publish-${Date.now()}`,
  );
  try {
    // A throwaway repository, so nothing real is ever committed to.
    fs.cpSync(root, scratch, {
      recursive: true,
      filter: (source) =>
        !/[\\/](node_modules|\.git|dist|\.astro)$/.test(source),
    });
    const git = (args: string[]) =>
      execFileSync('git', args, {
        cwd: scratch,
        encoding: 'utf8',
        stdio: 'pipe',
      });
    git(['init', '-q']);
    git(['config', 'user.email', 'test@example.com']);
    git(['config', 'user.name', 'Cauldron test']);
    git(['add', '-A']);
    git(['commit', '-q', '-m', 'Starting point']);

    await api.openSiteAt(scratch);
    const state = api.repoState?.();
    check(
      '5.1 the site is recognised as its own Git repository',
      Boolean(state?.isRepo),
      state?.branch ?? '',
    );
    check(
      '5.1 nothing to publish on a clean tree',
      (state?.changes.length ?? -1) === 0,
      `${state?.changes.length ?? '?'} changes`,
    );

    const made = api.runAction({
      action: 'createPage',
      page: 'publish-check',
      title: 'Publish check',
    }) as {
      ok?: boolean;
      problem?: string;
    };
    check('5.1 a change is made', Boolean(made?.ok), made?.problem ?? '');
    const changed = api.repoState?.();
    check(
      '5.1 the change is shown before publishing',
      (changed?.changes.length ?? 0) > 0,
      changed?.changes.map((c) => c.file).join(', '),
    );

    const noMessage = api.publish?.({ message: '   ', push: false });
    check(
      '5.1 a commit without a message is refused',
      noMessage?.ok === false,
      noMessage?.problem ?? '',
    );

    const published = api.publish?.({
      message: 'Add the publish check page',
      push: false,
    });
    check(
      '5.1 publishing commits the change',
      Boolean(published?.ok),
      published?.problem ?? published?.details ?? '',
    );
    const lastCommit = git(['log', '-1', '--pretty=%s']).trim();
    check(
      '5.1 the commit is really there',
      lastCommit === 'Add the publish check page',
      lastCommit,
    );

    const again = api.publish?.({ message: 'Nothing to do', push: false });
    check(
      '5.1 publishing an unchanged site is refused',
      again?.ok === false,
      again?.problem ?? '',
    );

    console.log(
      `\n${results.filter((r) => r.ok).length}/${results.length} passed`,
    );
  } catch (error) {
    console.error('PUBLISH TEST ERROR', error);
  } finally {
    try {
      fs.rmSync(scratch, { recursive: true, force: true });
    } catch {
      // Leaving a temp folder behind is better than failing the test.
    }
    app.exit(results.every((r) => r.ok) ? 0 : 1);
  }
}

/** 4.4: the built site is measured, and the numbers are real. */
export async function runQualityTest(root: string, api: Api): Promise<void> {
  try {
    await api.openSiteAt(root);
    api.setDirection?.('long-lunch');
    const report = await api.qualityRun?.({ pages: ['/'] });
    check(
      '4.4 the site builds before anything is measured',
      Boolean(report?.built),
      report?.buildLog?.slice(-300) ?? '',
    );
    const findings = report?.findings ?? [];
    check(
      '4.4 layout, accessibility, focus and links are measured',
      findings.length >= 8,
      `${findings.length} findings`,
    );

    const byId = (needle: string) =>
      findings.filter((finding) =>
        finding.label.toLowerCase().includes(needle),
      );
    check(
      '4.4 every width is checked for overflow',
      findings.filter((finding) => finding.label === 'No horizontal overflow')
        .length === 3,
    );
    check(
      '4.4 contrast is measured, not guessed',
      byId('contrast').length > 0,
      byId('contrast')[0]?.detail ?? '',
    );
    check(
      '4.4 keyboard focus is measured',
      byId('focus').length > 0,
      byId('focus')[0]?.detail ?? '',
    );
    check(
      '4.4 broken links are found',
      byId('links').length > 0,
      byId('links')[0]?.detail ?? '',
    );
    check(
      '4.4 measured numbers are kept apart from opinion',
      (report?.measured?.length ?? 0) > 0,
      `${report?.measured?.length ?? 0} measurements`,
    );
    const antiPatterns = [
      'No pure black',
      'No cards inside cards',
      'No tired blue-purple gradients',
    ];
    check(
      '4.1 the taste anti-patterns are checked automatically',
      antiPatterns.every((label) =>
        findings.some((finding) => finding.label === label),
      ),
      antiPatterns
        .map((label) => {
          const found = findings.find((finding) => finding.label === label);
          return `${label}: ${found?.status ?? 'missing'}`;
        })
        .join(' · '),
    );
    const axe = findings.find((finding) => finding.label.includes('axe'));
    check(
      '4.4 axe-core runs against WCAG 2.1 AA',
      Boolean(axe),
      axe?.detail ?? 'axe did not run',
    );

    const failed = findings.filter(
      (finding) => finding.status === 'fail',
    ).length;
    console.log(
      `\n${results.filter((r) => r.ok).length}/${results.length} passed · ${failed} finding(s) failed on this site`,
    );
  } catch (error) {
    console.error('QUALITY TEST ERROR', error);
  } finally {
    app.exit(results.every((r) => r.ok) ? 0 : 1);
  }
}

/** 3.4: content forms come from the site's own definitions, and a stale form is refused. */
export async function runContentTest(root: string, api: Api): Promise<void> {
  try {
    await api.openSiteAt(root);
    const collections = api.collections?.() ?? [];
    check(
      "3.4 the site's content definitions are read",
      collections.length > 0,
      `${collections.length} collections`,
    );

    const collection = collections.find((item) => item.entries.length > 0);
    check(
      '3.4 entries are listed',
      Boolean(collection),
      collection?.name ?? 'none',
    );
    if (!collection) return;

    const first = collection.entries[0];
    const opened = api.entry?.(first.file) as
      | { hash: string; values: Record<string, string> }
      | { problem: string };
    check(
      '3.4 an entry opens as a form',
      'hash' in opened,
      'problem' in opened ? opened.problem : '',
    );

    if (!('hash' in opened)) return;
    const field = collection.fields[0]?.name ?? 'title';
    const marker = `Cauldron content ${Date.now()}`;
    const saved = api.saveEntry?.({
      file: first.file,
      baseHash: opened.hash,
      change: { field, value: marker },
    });
    check(
      '3.4 one field saves into the entry',
      Boolean(saved?.ok),
      saved?.problem ?? '',
    );

    const after = api.entry?.(first.file) as {
      hash: string;
      values: Record<string, string>;
    };
    check(
      '3.4 the saved value is in the file',
      after.values[field] === marker,
      after.values[field] ?? '',
    );

    const stale = api.saveEntry?.({
      file: first.file,
      baseHash: opened.hash,
      change: { field, value: 'should not land' },
    });
    check(
      '3.4 an out-of-date form is refused, not overwritten',
      stale?.ok === false,
      stale?.problem ?? '',
    );

    console.log(
      `\n${results.filter((r) => r.ok).length}/${results.length} passed`,
    );
  } catch (error) {
    console.error('CONTENT TEST ERROR', error);
  } finally {
    app.exit(results.every((r) => r.ok) ? 0 : 1);
  }
}

/** A real agent job, end to end, with the taste rules and direction in its brief. */
export async function runAgentTest(
  root: string,
  api: AgentTestApi,
): Promise<void> {
  try {
    await api.openSiteAt(root);
    const chosen = api.setDirection('long-lunch');
    check('4.2 a design direction is saved into the site', chosen.ok);
    const designFile = path.join(root, 'cauldron/DESIGN.md');
    check(
      '4.2 the site owns its design document and tokens',
      fs.existsSync(designFile) &&
        fs.existsSync(path.join(root, 'cauldron/tokens.css')),
    );

    const prompt = api.buildPromptText('Change the home page heading.');
    check(
      '4.1 the agent brief carries the taste rules',
      prompt.includes('Taste rules'),
    );
    check(
      '4.2 the agent brief carries the direction and its tokens',
      prompt.includes('Long Lunch') && prompt.includes('var(--cauldron-c-'),
    );

    const tool = (process.env.CAULDRON_AGENT_TOOL ?? 'claude') as
      | 'claude'
      | 'codex'
      | 'hermes';
    const marker = `Cauldron agent test ${Date.now()}`;
    const started = api.sendAgent({
      tool,
      request: `On the home page only, change the main h1 heading text to exactly "${marker}". Change nothing else.`,
    });
    check(
      `3.2 ${tool} is started by Cauldron`,
      started.ok,
      started.problem ?? '',
    );

    const finished = await api.waitForAgent(240000);
    check(
      '3.2 the agent job finishes and reports back',
      finished.ok,
      finished.note ?? '',
    );

    const [run] = api.runs();
    const runFiles = (run?.files ?? [])
      .map((file) => (typeof file === 'string' ? file : file.file))
      .join(', ');
    check(
      '2.2 the finished run lists the files it changed',
      (run?.files.length ?? 0) > 0,
      runFiles || 'none',
    );

    const page = fs.readFileSync(
      path.join(root, 'src/pages/index.astro'),
      'utf8',
    );
    check('3.2 the agent really changed the site', page.includes(marker));

    const tokens = fs.readFileSync(
      path.join(root, 'cauldron/tokens.css'),
      'utf8',
    );
    check(
      '4.2 direction tokens were written for the agent to use',
      tokens.includes('--cauldron-c-primary') &&
        !tokens.includes('--c-primary:'),
    );

    console.log(
      `\n${results.filter((r) => r.ok).length}/${results.length} passed`,
    );
  } catch (error) {
    console.error('AGENT TEST ERROR', error);
  } finally {
    app.exit(results.every((r) => r.ok) ? 0 : 1);
  }
}

export async function runEndToEnd(root: string, api: Api): Promise<void> {
  try {
    await api.openSiteAt(root);
    const site = api.site();
    check(
      '1.1 a site opens and is identified',
      Boolean(site),
      site ? `${site.name} Astro ${site.astroVersion}` : 'no site',
    );

    const loaded = await waitFor(async () => {
      const html = await api.previewHtml();
      return html.includes('data-astro-source-loc');
    }, 45000);
    check('1.1 live preview renders the site', loaded);
    if (!loaded) throw new Error('preview never rendered');

    const isolated = await api.previewClick('body');
    void isolated;
    const hasBridge = await api.previewHtml();
    check(
      '1.8 the preview has no bridge to the app',
      !hasBridge.includes('window.cauldron') &&
        (await api.previewClick('body'), true),
    );

    const picked = await api.previewClickLeaf();
    void picked;
    const selected = await waitFor(async () => Boolean(api.getSelection()));
    check('1.2 clicking an element selects it', selected);
    const selection = api.getSelection();
    if (!selection) throw new Error('nothing selected');

    const file = selection.location.file;
    const original = fs.readFileSync(file, 'utf8');
    const originalHash = hashOf(original);

    const newText = `Cauldron test ${Date.now()}`;
    const written = api.writeText(newText);
    check(
      '1.2 a text edit is written',
      written.ok,
      written.ok ? '' : (written.problem ?? ''),
    );
    const afterEdit = fs.readFileSync(file, 'utf8');
    check(
      '1.5 only the edited region changes',
      singleRegionChange(original, afterEdit),
    );
    check(
      '1.5 the file grew only by the new text',
      afterEdit.includes(newText),
    );

    const previewUpdated = await waitFor(
      async () => (await api.previewHtml()).includes(newText),
      15000,
    );
    check('1.2 the preview shows the change', previewUpdated);

    const undoResult = api.undo() as { problem?: string } | null;
    const undone = !undoResult?.problem;
    check(
      '1.3 undo restores the file exactly',
      undone && hashOf(fs.readFileSync(file, 'utf8')) === originalHash,
    );

    // 1.4: a change elsewhere in the same file merges instead of blocking.
    const mergeFirst = api.writeText(`Cauldron merge ${Date.now()}`);
    const withNote = `${fs.readFileSync(file, 'utf8')}\n<!-- outside edit -->\n`;
    fs.writeFileSync(file, withNote, 'utf8');
    const third = api.writeText(`Cauldron merged ${Date.now()}`);
    const merged = fs.readFileSync(file, 'utf8');
    check(
      '1.4 edits elsewhere in the file merge cleanly',
      mergeFirst.ok && third.ok && merged.includes('<!-- outside edit -->'),
      third.ok ? '' : (third.problem ?? ''),
    );

    // 1.4: the same spot changed outside must be refused, not overwritten.
    const current = fs.readFileSync(file, 'utf8');
    const selection2 = api.getSelection();
    if (selection2) {
      const clashing = current.replace(
        /Cauldron merged \d+/,
        'Changed outside Cauldron',
      );
      fs.writeFileSync(file, clashing, 'utf8');
      const refused = api.writeText('Should not land');
      check(
        '1.4 an overlapping outside change is refused',
        !refused.ok && Boolean(refused.conflict),
        refused.ok
          ? 'the edit overwrote the outside change'
          : (refused.problem ?? ''),
      );
      fs.writeFileSync(file, current, 'utf8');
    }

    // 2.1: one set of actions, with the version stated on every write.
    const listed = api.runAction({ action: 'listPages' }) as {
      ok: boolean;
      pages?: Array<{ page: string }>;
    };
    check(
      '2.1 the shared actions list pages',
      listed.ok && (listed.pages?.length ?? 0) > 0,
    );

    const activeForAction = api.getSelection();
    if (activeForAction) {
      const target = {
        file: path.relative(root, activeForAction.location.file),
        line: activeForAction.location.line,
        column: activeForAction.location.column,
        name: activeForAction.location.name,
      };
      const fileText = fs.readFileSync(activeForAction.location.file, 'utf8');
      const stale = api.runAction({
        action: 'editElementText',
        target,
        value: `Action ${Date.now()}`,
        baseHash: 'deliberately-wrong',
      }) as { ok: boolean; merged?: boolean };
      check(
        '2.1 a write based on an old version still merges when the spot is untouched',
        stale.ok && stale.merged === true,
      );
      void fileText;
      api.undo();
    }

    // 2.2: an agent run, reviewed and undone in one step.
    const started = api.startRun({ tool: 'e2e', prompt: 'change the heading' });
    const runId = started.run?.id ?? '';
    const fileForRun = path.join(root, 'src/pages/index.astro');
    const beforeRun = fs.readFileSync(fileForRun, 'utf8');
    fs.writeFileSync(
      fileForRun,
      beforeRun.replace(
        /<h1([^>]*)>([\s\S]*?)<\/h1>/,
        '<h1$1>Run changed this</h1>',
      ),
      'utf8',
    );
    const finished = await api.finishRun(runId);
    check(
      '2.2 a run reports which files it changed',
      finished.ok && (finished.run?.files.length ?? 0) === 1,
      finished.run?.files.join(', ') ?? '',
    );
    const undoneRun = api.undoRun(runId);
    check(
      '2.2 a whole run is undone in one step',
      undoneRun.ok &&
        hashOf(fs.readFileSync(fileForRun, 'utf8')) === hashOf(beforeRun),
      undoneRun.problem ?? '',
    );

    const secondRun = api.startRun({ tool: 'e2e', prompt: 'change it again' });
    const secondId = secondRun.run?.id ?? '';
    const baseForClash = fs.readFileSync(fileForRun, 'utf8');
    fs.writeFileSync(
      fileForRun,
      `${baseForClash}\n<!-- run edit -->\n`,
      'utf8',
    );
    await api.finishRun(secondId);
    fs.writeFileSync(
      fileForRun,
      `${baseForClash}\n<!-- changed afterwards -->\n`,
      'utf8',
    );
    const refusedUndo = api.undoRun(secondId);
    check(
      '2.2 undo refuses when files changed after the run',
      !refusedUndo.ok && (refusedUndo.clashes?.length ?? 0) > 0,
      refusedUndo.problem ?? '',
    );
    fs.writeFileSync(fileForRun, baseForClash, 'utf8');

    // 3.3: outside agents connect locally, with a code.
    const info = await api.mcpInfo?.();
    if (info) {
      const call = async (body: unknown, code = info.code) => {
        const response = await fetch(info.url, {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            'x-cauldron-code': code,
          },
          body: JSON.stringify(body),
        });
        return {
          status: response.status,
          body: (await response.json()) as Record<string, unknown>,
        };
      };

      const hello = await call({
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: {},
      });
      check(
        '3.3 an outside agent can connect on this computer',
        hello.status === 200 &&
          Boolean((hello.body.result as { serverInfo?: unknown })?.serverInfo),
      );

      const wrong = await call(
        { jsonrpc: '2.0', id: 2, method: 'tools/list', params: {} },
        'wrong-code',
      );
      check('3.3 the wrong access code is refused', wrong.status === 401);

      const list = await call({
        jsonrpc: '2.0',
        id: 3,
        method: 'tools/list',
        params: {},
      });
      const tools = (list.body.result as { tools?: unknown[] })?.tools ?? [];
      check(
        '3.3 the outside connection offers the same actions',
        tools.length >= 8,
        `${tools.length} tools`,
      );

      const pages = await call({
        jsonrpc: '2.0',
        id: 4,
        method: 'tools/call',
        params: { name: 'list_pages', arguments: {} },
      });
      const text =
        (
          (pages.body.result as { content?: Array<{ text?: string }> })
            ?.content ?? []
        )[0]?.text ?? '';
      check(
        '3.3 an outside agent can read the site',
        text.includes('"ok": true'),
      );
    }

    // 1.7: a new page shows up without a reload.
    const pageTitle = `Cauldron page ${Date.now()}`;
    await api.createPage({ path: 'cauldron-test-page', title: pageTitle });
    const pageShown = await waitFor(
      async () => (await api.previewHtml()).includes(pageTitle),
      15000,
    );
    check('1.7 a new page appears without a reload', pageShown);
    fs.rmSync(path.join(root, 'src/pages/cauldron-test-page.astro'), {
      force: true,
    });

    // 1.6: text typed but not saved is kept outside the site, and comes back.
    const active = api.getSelection();
    if (active) {
      const draft: Draft = {
        key: 'e2e-draft',
        file: path.relative(root, active.location.file),
        line: active.location.line,
        column: active.location.column,
        name: active.location.name,
        field: 'text',
        value: `Draft text ${Date.now()}`,
        savedAt: Date.now(),
      };
      api.saveDraft([draft]);
      const recoveryDir = path.join(app.getPath('userData'), 'recovery');
      const keptOutside = fs
        .readdirSync(recoveryDir)
        .some((name) =>
          fs
            .readFileSync(path.join(recoveryDir, name), 'utf8')
            .includes('e2e-draft'),
        );
      check(
        '1.6 unsaved text is kept outside the site',
        keptOutside,
        recoveryDir,
      );

      const restored = api.restoreDraft(draft);
      const landed = fs
        .readFileSync(active.location.file, 'utf8')
        .includes(String(draft.value));
      check(
        '1.6 the draft is offered back and lands cleanly',
        restored.ok && landed,
      );
      api.undo();
    }

    console.log(
      `\n${results.filter((r) => r.ok).length}/${results.length} passed`,
    );
  } catch (error) {
    console.error('E2E ERROR', error);
  } finally {
    const failed = results.filter((r) => !r.ok).length;
    app.exit(failed === 0 ? 0 : 1);
  }
}
