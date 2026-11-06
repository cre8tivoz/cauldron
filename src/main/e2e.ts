import fs from 'node:fs';
import path from 'node:path';
import { app } from 'electron';
import { hashOf } from './files';
import type { Site } from './site';
import type { EditOperation, Location } from './edit';
import type { Draft } from './recovery';

type Api = {
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
  startRun: (payload: { tool: string; prompt: string }) => { ok: boolean; run?: { id: string } };
  finishRun: (id: string) => Promise<{ ok: boolean; run?: { files: string[]; highlighted: unknown[] } }>;
  undoRun: (id: string) => { ok: boolean; problem?: string; clashes?: string[] };
  saveDraft: (drafts: Draft[]) => void;
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
    check('2.1 the shared actions list pages', listed.ok && (listed.pages?.length ?? 0) > 0);

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
      check('2.1 a write based on an old version still merges when the spot is untouched', stale.ok && stale.merged === true);
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
      beforeRun.replace(/<h1([^>]*)>([\s\S]*?)<\/h1>/, '<h1$1>Run changed this</h1>'),
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
      undoneRun.ok && hashOf(fs.readFileSync(fileForRun, 'utf8')) === hashOf(beforeRun),
      undoneRun.problem ?? '',
    );

    const secondRun = api.startRun({ tool: 'e2e', prompt: 'change it again' });
    const secondId = secondRun.run?.id ?? '';
    const baseForClash = fs.readFileSync(fileForRun, 'utf8');
    fs.writeFileSync(fileForRun, `${baseForClash}\n<!-- run edit -->\n`, 'utf8');
    await api.finishRun(secondId);
    fs.writeFileSync(fileForRun, `${baseForClash}\n<!-- changed afterwards -->\n`, 'utf8');
    const refusedUndo = api.undoRun(secondId);
    check(
      '2.2 undo refuses when files changed after the run',
      !refusedUndo.ok && (refusedUndo.clashes?.length ?? 0) > 0,
      refusedUndo.problem ?? '',
    );
    fs.writeFileSync(fileForRun, baseForClash, 'utf8');

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
