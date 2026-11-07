import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { app } from 'electron';
import { hashOf } from './files';
import type { Site } from './site';
import type { Location } from './edit';
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
    keepMine?: boolean;
  }) => {
    ok: boolean;
    problem?: string;
    hash?: string;
    conflict?: boolean;
    conflictCopy?: string;
  };

  openSiteAt: (root: string) => Promise<unknown>;
  startPreview: () => Promise<unknown>;
  previewLoad: (url: string) => Promise<void>;
  previewHtml: () => Promise<string>;
  previewBridgeAbsent: () => Promise<boolean>;
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
    conflict?: unknown;
  };
  forceWrite: (operation: unknown) => { ok: boolean; problem?: string };
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
  agentReply: () => string;
  settleRenderer: () => Promise<void>;
  agentTools: () => string[];
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

      const { measureTaste } = await import('./taste-check');
      const taste = await measureTaste(
        window,
        direction!,
        '/',
        'section[class^="cauldron-"]',
      );
      check(
        '4.3 the added pieces pass the approved direction and state checks',
        taste.every((finding) => finding.status === 'pass'),
        taste
          .filter((finding) => finding.status !== 'pass')
          .map((finding) => `${finding.label}: ${finding.detail}`)
          .join('; ') || 'all measured checks passed',
      );
      for (const width of [375, 768, 1280]) {
        window.setContentSize(width, 900);
        const overflow = await window.webContents.executeJavaScript(
          `document.documentElement.scrollWidth > innerWidth + 2`,
        );
        check(`4.3 added pieces do not overflow at ${width}px`, !overflow);
      }
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
    check('LIBRARY TEST ERROR', false, String(error));
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

    const { saveDrafts, clearDrafts } = await import('./recovery');
    saveDrafts(scratch, [
      {
        key: 'publish-unsaved',
        file: 'src/pages/publish-check.astro',
        line: 1,
        column: 1,
        name: 'content',
        field: 'content:text',
        value: 'unsaved content',
        savedAt: Date.now(),
      },
    ]);
    const pending = api.publish?.({ message: 'Must not commit', push: false });
    check(
      '5.1 unsaved content blocks publishing',
      pending?.ok === false && Boolean(pending.problem?.includes('unsaved')),
      pending?.problem ?? '',
    );
    clearDrafts(scratch);
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
    const remote = `${scratch}-remote.git`;
    try {
      execFileSync('git', ['init', '--bare', '-q', remote]);
      git(['remote', 'add', 'origin', remote]);
      fs.writeFileSync(
        path.join(scratch, 'publish-proof.txt'),
        'Real local-remote push check.',
      );
      const pushed = api.publish?.({
        message: 'Prove remote publication',
        push: true,
      });
      check(
        '5.1 publishing pushes to the existing remote',
        Boolean(pushed?.ok),
        pushed?.problem ?? '',
      );
      const branch = git(['branch', '--show-current']).trim();
      const remoteHead = execFileSync(
        'git',
        ['--git-dir', remote, 'rev-parse', `refs/heads/${branch}`],
        { encoding: 'utf8' },
      ).trim();
      check(
        '5.1 the remote contains the exact published commit',
        remoteHead === git(['rev-parse', 'HEAD']).trim(),
      );
    } finally {
      fs.rmSync(remote, { recursive: true, force: true });
    }

    console.log(
      `\n${results.filter((r) => r.ok).length}/${results.length} passed`,
    );
  } catch (error) {
    console.error('PUBLISH TEST ERROR', error);
    check('PUBLISH TEST ERROR', false, String(error));
  } finally {
    try {
      fs.rmSync(scratch, { recursive: true, force: true });
    } catch {
      // Leaving a temp folder behind is better than failing the test.
    }
    app.exit(results.every((r) => r.ok) ? 0 : 1);
  }
}

/** 5.1: the publishing panel, driven through the window a person uses. */
export async function runPublishUiTest(
  root: string,
  window: import('electron').BrowserWindow,
  api: Api,
  open: (root: string) => Promise<unknown>,
): Promise<void> {
  const { execFileSync } = await import('node:child_process');
  const git = (args: string[]) =>
    execFileSync('git', args, { cwd: root, encoding: 'utf8', stdio: 'pipe' });
  const js = async <T>(code: string): Promise<T> =>
    (await window.webContents.executeJavaScript(code)) as T;
  const click = (selector: string) =>
    js<boolean>(
      `(() => {
        const el = document.querySelector(${JSON.stringify(selector)});
        if (!el) return false;
        el.click();
        return true;
      })()`,
    );
  const rail = (title: string) => click(`button[title="${title}"]`);
  const panel = () =>
    js<{ text: string; buttons: Array<{ label: string; disabled: boolean }> }>(
      `(() => {
        const body = document.querySelector('.panes .pane-body');
        return {
          text: body ? body.innerText : '',
          buttons: body
            ? [...body.querySelectorAll('button')].map((button) => ({
                label: (button.textContent || '').trim(),
                disabled: Boolean(button.disabled),
              }))
            : [],
        };
      })()`,
    );
  const typedInto = (
    selector: string,
    value: string,
    kind: 'input' | 'textarea',
  ) =>
    js<boolean>(
      `(() => {
        const field = document.querySelector(${JSON.stringify(selector)});
        if (!field) return false;
        const setter = Object.getOwnPropertyDescriptor(
          window.${kind === 'input' ? 'HTMLInputElement' : 'HTMLTextAreaElement'}.prototype,
          'value',
        ).set;
        setter.call(field, ${JSON.stringify(value)});
        field.dispatchEvent(new Event('input', { bubbles: true }));
        return field.value === ${JSON.stringify(value)};
      })()`,
    );
  const recoveryDir = path.join(app.getPath('userData'), 'recovery');
  const recoveryText = (): string => {
    if (!fs.existsSync(recoveryDir)) return '';
    return fs
      .readdirSync(recoveryDir)
      .map((name) => {
        try {
          return fs.readFileSync(path.join(recoveryDir, name), 'utf8');
        } catch {
          return '';
        }
      })
      .join('\n');
  };

  try {
    // A real changed file, so the publishing controls are on screen at all.
    fs.appendFileSync(
      path.join(root, 'src/pages/index.astro'),
      '\n<!-- Ticket 16 UI proof -->\n',
    );
    await open(root);
    await waitFor(
      async () => js<boolean>(`Boolean(document.querySelector('.app'))`),
      30000,
    );
    check(
      '5.1 the window shows the site',
      await waitFor(
        async () =>
          js<boolean>(
            `Boolean(document.querySelector('button[title="Content"]'))`,
          ),
        20000,
      ),
    );

    // (a) A content buffer that has not been saved.
    await rail('Content');
    const entryReady = await waitFor(
      async () =>
        js<boolean>(
          `Boolean(document.querySelector('.pane-body ul li button'))`,
        ),
      20000,
    );
    check('5.1 a content entry is listed', entryReady);
    await click('.pane-body ul li button');
    const fieldReady = await waitFor(
      async () =>
        js<boolean>(`Boolean(document.querySelector('input[id^="content-"]'))`),
      15000,
    );
    check('5.1 the content form is shown', fieldReady);
    const field = await js<{ id: string; value: string } | null>(
      `(() => {
        const input = document.querySelector('input[id^="content-"]');
        return input ? { id: input.id, value: input.value } : null;
      })()`,
    );
    const contentValue = `${field?.value ?? ''} — ticket 16`;
    const typedContent = await typedInto(
      `#${field?.id}`,
      contentValue,
      'input',
    );
    check(
      '5.1 a form value is typed and not saved',
      typedContent,
      `${field?.id} = ${contentValue}`,
    );

    await rail('Publishing');
    const noticed = await waitFor(
      async () =>
        /still being typed and have not been saved/.test((await panel()).text),
      10000,
    );
    const contentPanel = await panel();
    const contentNotice =
      contentPanel.text
        .split('\n')
        .find((line) => line.includes('still being typed')) ?? '';
    console.log(`[a] NOTICE ${contentNotice}`);
    console.log(
      `[a] BUTTONS ${contentPanel.buttons
        .map(
          (button) =>
            `${button.label}:${button.disabled ? 'disabled' : 'enabled'}`,
        )
        .join(' | ')}`,
    );
    const commitButton = contentPanel.buttons.find((b) => b.label === 'Commit');
    const pushButton = contentPanel.buttons.find(
      (b) => b.label === 'Commit and push',
    );
    check(
      '5.1 the unsaved content notice is shown',
      noticed && contentNotice !== '',
      contentNotice,
    );
    check(
      '5.1 commit and upload are disabled for the content buffer',
      Boolean(commitButton?.disabled) && Boolean(pushButton?.disabled),
      `${commitButton?.label}:${commitButton?.disabled} ${pushButton?.label}:${pushButton?.disabled}`,
    );
    const head = git(['rev-parse', 'HEAD']).trim();
    const refusedContent = await js<{ ok: boolean; problem?: string }>(
      `window.cauldron.publish({ message: 'Ticket 16 must not commit', push: false, unsavedBuffers: 1 })`,
    );
    console.log(`[a] IPC ${JSON.stringify(refusedContent)}`);
    check(
      '5.1 publishing through the panel IPC is refused while the buffer is unsaved',
      refusedContent?.ok === false &&
        Boolean(refusedContent.problem?.includes('unsaved edit')),
      refusedContent?.problem ?? '',
    );
    check(
      '5.1 the refusal made no commit',
      git(['rev-parse', 'HEAD']).trim() === head,
    );

    // Reload the entry so the content buffer is clean again before (b).
    await rail('Content');
    await click('.pane-body ul li button');
    await wait(400);

    // (b) A visual buffer typed less than a second ago, not yet in recovery.
    await rail('Sites');
    const previewUp = await waitFor(
      async () =>
        (await api.previewHtml()).includes('data-cauldron-source-loc'),
      60000,
    );
    check('5.1 the preview is up for the visual buffer', previewUp);
    await api.previewClickLeaf();
    check(
      '5.1 an element is selected',
      await waitFor(async () => Boolean(api.getSelection()), 15000),
    );
    const inspectorReady = await waitFor(
      async () =>
        js<boolean>(
          `Boolean(document.querySelector('textarea[aria-label="Element text"]'))`,
        ),
      15000,
    );
    check('5.1 the inspector text field is shown', inspectorReady);
    const visualValue = `Ticket 16 unsaved ${Date.now()}`;
    const typedVisual = await typedInto(
      'textarea[aria-label="Element text"]',
      visualValue,
      'textarea',
    );
    await rail('Publishing');
    const visualPanel = await panel();
    const visualNotice =
      visualPanel.text
        .split('\n')
        .find((line) => line.includes('still being typed')) ?? '';
    const visualCommit = visualPanel.buttons.find((b) => b.label === 'Commit');
    console.log(
      `[b] TYPED ${typedVisual} in recovery=${recoveryText().includes(visualValue)}`,
    );
    console.log(`[b] NOTICE ${visualNotice}`);
    console.log(
      `[b] BUTTONS ${visualPanel.buttons
        .map(
          (button) =>
            `${button.label}:${button.disabled ? 'disabled' : 'enabled'}`,
        )
        .join(' | ')}`,
    );
    check(
      '5.1 the visual buffer is blocked before recovery storage has it',
      typedVisual &&
        !recoveryText().includes(visualValue) &&
        /still being typed and have not been saved/.test(visualPanel.text) &&
        Boolean(visualCommit?.disabled),
      `${visualNotice} · recovery has it: ${recoveryText().includes(visualValue)}`,
    );

    // (c) A failed upload, then an upload-only retry.
    await wait(3600); // let the draft reach recovery, then discard it through the app
    await js(`window.cauldron.discardDrafts()`);
    window.webContents.reload();
    await waitFor(
      async () => js<boolean>(`Boolean(document.querySelector('.app'))`),
      30000,
    );
    await wait(600);
    fs.writeFileSync(
      path.join(root, 'publish-ticket16.txt'),
      'Ticket 16 failed upload proof.\n',
    );
    git(['remote', 'set-url', 'origin', '/nonexistent-cauldron-remote']);
    await rail('Publishing');
    const dirtyReady = await waitFor(
      async () => /changed file\(s\)/.test((await panel()).text),
      15000,
    );
    check('5.1 the changed files are shown before publishing', dirtyReady);
    const beforeCommit = git(['rev-list', '--count', 'HEAD']).trim();
    const messageTyped = await typedInto(
      '#commit-message',
      'Ticket 16 failed upload',
      'input',
    );
    check('5.1 a commit message is typed', messageTyped);
    await wait(200);
    await js<boolean>(
      `(() => {
        const button = [...document.querySelectorAll('.panes .pane-body button')].find(
          (item) => item.textContent.trim() === 'Commit and push',
        );
        if (!button) return false;
        button.click();
        return true;
      })()`,
    );
    const failed = await waitFor(
      async () =>
        /Committed \d+ file\(s\) locally/.test((await panel()).text) &&
        /upload failed/i.test((await panel()).text),
      30000,
    );
    const failedPanel = await panel();
    console.log(`[c] FAILED-UPLOAD PANEL\n${failedPanel.text}`);
    check(
      '5.1 the commit and the failed upload are shown as separate lines',
      failed &&
        /Committed \d+ file\(s\) locally\./.test(failedPanel.text) &&
        /upload failed/i.test(failedPanel.text),
      failedPanel.text.split('\n').filter(Boolean).slice(-3).join(' / '),
    );
    const afterCommit = git(['rev-list', '--count', 'HEAD']).trim();
    check(
      '5.1 the failed upload still made exactly one local commit',
      Number(afterCommit) === Number(beforeCommit) + 1,
      `${beforeCommit} -> ${afterCommit}`,
    );

    git(['remote', 'set-url', 'origin', `${root}-remote.git`]);
    await rail('Sites');
    await wait(300);
    await rail('Publishing');
    const retryReady = await waitFor(
      async () =>
        /commit\(s\) not uploaded yet/.test((await panel()).text) &&
        (await panel()).buttons.some((b) => b.label === 'Upload'),
      15000,
    );
    const retryPanel = await panel();
    console.log(`[c] RETRY PANEL\n${retryPanel.text}`);
    check(
      '5.1 the panel offers Upload for the already-committed change',
      retryReady,
      retryPanel.text
        .split('\n')
        .find((line) => line.includes('not uploaded yet')) ?? '',
    );
    check(
      '5.1 nothing is left in the working tree for the retry',
      git(['status', '--porcelain']).trim() === '',
      git(['status', '--porcelain']).trim(),
    );
    await js<boolean>(
      `(() => {
        const button = [...document.querySelectorAll('.panes .pane-body button')].find(
          (item) => item.textContent.trim() === 'Upload',
        );
        if (!button) return false;
        button.click();
        return true;
      })()`,
    );
    const uploaded = await waitFor(
      async () => /Uploaded to/.test((await panel()).text),
      30000,
    );
    const uploadedPanel = await panel();
    console.log(`[c] UPLOAD PANEL\n${uploadedPanel.text}`);
    check(
      '5.1 the retry uploads the commit',
      uploaded && /Uploaded to/.test(uploadedPanel.text),
      uploadedPanel.text
        .split('\n')
        .find((line) => line.includes('Uploaded to')) ?? '',
    );
    const afterUpload = git(['rev-list', '--count', 'HEAD']).trim();
    check(
      '5.1 the retry created no second commit',
      afterUpload === afterCommit,
      `${afterCommit} -> ${afterUpload}`,
    );
    const branchName = git(['branch', '--show-current']).trim();
    const remoteHead = execFileSync(
      'git',
      [
        '--git-dir',
        `${root}-remote.git`,
        'rev-parse',
        `refs/heads/${branchName}`,
      ],
      { encoding: 'utf8' },
    ).trim();
    check(
      '5.1 the remote now has the committed change',
      remoteHead === git(['rev-parse', 'HEAD']).trim(),
      `${remoteHead.slice(0, 7)} vs ${git(['rev-parse', 'HEAD']).trim().slice(0, 7)}`,
    );

    console.log(
      `\n${results.filter((r) => r.ok).length}/${results.length} passed`,
    );
  } catch (error) {
    console.error('PUBLISH UI TEST ERROR', error);
    check('PUBLISH UI TEST ERROR', false, String(error));
  } finally {
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
      findings.some((finding) => finding.label === 'Internal links work'),
      findings.find((finding) => finding.label === 'Internal links work')
        ?.detail ?? '',
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
    check('QUALITY TEST ERROR', false, String(error));
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
      | { hash: string; schemaHash: string; values: Record<string, string> }
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
      change: { field, value: marker, schemaHash: opened.schemaHash },
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

    // Plan 1.4: a clash keeps both versions and offers keep mine / use the disk version.
    check(
      '1.4 a content clash is offered as a keep-mine / use-disk choice',
      (stale as { conflict?: boolean } | undefined)?.conflict === true,
      JSON.stringify(stale),
    );
    const diskBefore = fs.readFileSync(path.join(root, first.file), 'utf8');
    const mine = `Cauldron keep mine ${Date.now()}`;
    const kept = api.saveEntry?.({
      file: first.file,
      baseHash: opened.hash,
      change: { field, value: mine, schemaHash: opened.schemaHash },
      keepMine: true,
    }) as { ok: boolean; problem?: string; conflictCopy?: string } | undefined;
    const keptEntry = api.entry?.(first.file) as {
      values: Record<string, string>;
    };
    check(
      '1.4 keep mine writes my content version',
      Boolean(kept?.ok) && keptEntry.values[field] === mine,
      kept?.problem ?? keptEntry.values[field] ?? '',
    );
    check(
      '1.4 keep mine keeps the disk content version as a copy',
      Boolean(kept?.conflictCopy) &&
        fs.readFileSync(kept!.conflictCopy!, 'utf8') === diskBefore,
      kept?.conflictCopy ?? 'no copy',
    );

    console.log(
      `\n${results.filter((r) => r.ok).length}/${results.length} passed`,
    );
  } catch (error) {
    console.error('CONTENT TEST ERROR', error);
    check('CONTENT TEST ERROR', false, String(error));
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
      request: `${tool === 'claude' ? "First use Cauldron's list_pages MCP tool to inspect the site. " : ''}On the home page only, change the main h1 heading text to exactly "${marker}". Change nothing else.`,
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
      .map((file) => {
        const entry = file as unknown;
        return typeof entry === 'string'
          ? entry
          : ((entry as { file?: string }).file ?? '');
      })
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
    if (tool === 'claude')
      check(
        '3.3 Claude really calls Cauldron over MCP',
        api
          .agentTools()
          .some(
            (name) => name.includes('cauldron') && name.includes('list_pages'),
          ),
        api.agentTools().join(', '),
      );
    const continued = api.sendAgent({
      tool,
      request:
        'Without reading or changing any files, reply with exactly the heading text from my previous request.',
    });
    check(
      '3.2 the conversation can be resumed',
      continued.ok,
      continued.problem ?? '',
    );
    if (continued.ok) {
      const done = await api.waitForAgent(240000);
      check(
        '3.2 the resumed agent remembers the previous request',
        done.ok && api.agentReply().includes(marker),
        api.agentReply().slice(-200),
      );
    }

    console.log(
      `\n${results.filter((r) => r.ok).length}/${results.length} passed`,
    );
  } catch (error) {
    console.error('AGENT TEST ERROR', error);
    check('AGENT TEST ERROR', false, String(error));
  } finally {
    // agent-done also refreshes the renderer's run list. Complete that IPC
    // round-trip before destroying its sending frame.
    await api.settleRenderer();
    app.exit(results.every((r) => r.ok) ? 0 : 1);
  }
}

/** The actual renderer IPC, tab lifecycle, minimum window and reference-URL path. */
export async function runUiTest(
  root: string,
  window: import('electron').BrowserWindow,
  preview: import('./preview').Preview,
  open: (root: string) => Promise<unknown>,
): Promise<void> {
  try {
    await open(root);
    await wait(800);
    await window.webContents.executeJavaScript(
      `window.__auditErrors = []; window.addEventListener('error', e => window.__auditErrors.push(e.message)); window.addEventListener('unhandledrejection', e => window.__auditErrors.push(String(e.reason)));`,
    );
    const chosen = await window.webContents.executeJavaScript(`(async () => {
      await window.cauldron.setDirection('long-lunch');
      const direction = await window.cauldron.direction();
      return typeof direction.fonts.display === 'string' && direction.id === 'long-lunch';
    })()`);
    check('3.1 saved direction returns renderer-safe fonts', chosen);
    await open(root);
    await wait(500);
    for (const title of [
      'Content',
      'Components',
      'Design directions',
      'Quality checks',
      'Publishing',
    ]) {
      await window.webContents.executeJavaScript(
        `document.querySelector('button[title="${title}"]').click()`,
      );
      await wait(250);
      check(
        `3.1 ${title} is not covered by the native preview`,
        preview.getBounds().width === 0,
      );
    }
    await window.webContents.executeJavaScript(
      `document.querySelector('button[title="Sites"]').click()`,
    );
    await wait(300);
    window.setSize(1280, 800);
    await wait(300);
    const dimensions = await window.webContents.executeJavaScript(
      `({ width: innerWidth, scroll: document.documentElement.scrollWidth, stage: document.querySelector('.stage').getBoundingClientRect().width })`,
    );
    check(
      '3.1 Build restores the preview bounds at 1280 × 800',
      dimensions.stage > 0 &&
        preview.getBounds().width > 0 &&
        dimensions.scroll <= dimensions.width,
    );
    const errors = await window.webContents.executeJavaScript(
      'window.__auditErrors',
    );
    check(
      '3.1 reopening a directed site and switching tools causes no renderer errors',
      errors.length === 0,
      errors.join('; '),
    );
    const http = await import('node:http');
    const server = http.createServer((_request, response) =>
      response.end(
        '<!doctype html><html><head><title>Measured reference</title><style>body{background:#fefefe;color:#123456;font-family:Georgia;padding:24px}h1{font-size:48px}a{color:#234567}</style></head><body><h1>A real rendered reference</h1><a href="/">Link</a></body></html>',
      ),
    );
    await new Promise<void>((resolve) =>
      server.listen(0, '127.0.0.1', resolve),
    );
    try {
      const port = (server.address() as import('node:net').AddressInfo).port;
      const result = await window.webContents.executeJavaScript(
        `window.cauldron.referenceDirection('http://127.0.0.1:${port}/')`,
      );
      check(
        '4.2 a reference URL is measured through the real renderer action',
        result.ok &&
          result.direction.colours.ink === '#123456' &&
          result.direction.typeScale.includes(48),
      );
      const loaded = await window.webContents.executeJavaScript(
        'window.cauldron.direction()',
      );
      check(
        '4.2 measured direction survives disk reload',
        loaded?.id === result.direction?.id && loaded?.fonts.body === 'Georgia',
      );
    } finally {
      server.close();
    }
    const image = await window.webContents.capturePage();
    fs.writeFileSync(path.join(root, 'audit-ui.png'), image.toPNG());
    console.log(
      `\n${results.filter((r) => r.ok).length}/${results.length} passed`,
    );
  } catch (error) {
    check('UI TEST ERROR', false, String(error));
  } finally {
    app.exit(results.length > 0 && results.every((r) => r.ok) ? 0 : 1);
  }
}

/** Negative controls for the approved automatic taste bar, not a provider-generated site. */
export async function runTasteTest(): Promise<void> {
  const { createServer } = await import('node:http');
  const { measureTaste } = await import('./taste-check');
  const { inspectionWindow } = await import('./quality');
  const { findDirection } = await import('./directions');
  const direction = findDirection('long-lunch')!;
  const window = inspectionWindow();
  const server = createServer((_request, response) =>
    response.end(`<!doctype html><html><head><meta charset="utf-8"><style>
    body{background:#ffffff;color:#000000;font-family:Arial;padding:3px}
    h1,p,button{font-family:Arial;font-size:19px}
    .panel{border:1px solid #000;border-radius:7px;padding:3px}
    .gradient{background:linear-gradient(90deg,#2563eb,#7c3aed)}
    @keyframes move{to{transform:translateX(2px)}}
    .motion{animation:move 1s infinite}
    button{width:20px;overflow:hidden;white-space:nowrap;outline:none}
  </style></head><body><h1>Negative control</h1><div class="panel"><div class="panel gradient"><p class="motion">Deliberately bad styles</p></div></div><button>🚀 A deliberately truncated label</button></body></html>`),
  );
  try {
    await new Promise<void>((resolve) =>
      server.listen(0, '127.0.0.1', resolve),
    );
    const port = (server.address() as import('node:net').AddressInfo).port;
    await window.loadURL(`http://127.0.0.1:${port}/`);
    const findings = await measureTaste(window, direction, '/negative-control');
    for (const label of [
      'No unchosen default fonts',
      'No pure black',
      'No cards inside cards',
      'No tired blue-purple gradients',
      'No unchosen generic SaaS accents',
      'First fonts match the direction',
      'Colours follow the direction',
      'Spacing follows the direction',
      'Type sizes use the direction',
      'Radii follow the direction',
      'Tokens rather than hard-coded values',
      'No emoji used as interface icons',
      'Labels are not truncated',
      'Motion respects reduced-motion',
    ]) {
      const found = findings.find((finding) => finding.label === label);
      check(
        `4.1 negative control: ${label}`,
        found?.status === 'fail',
        found?.detail ?? 'not measured',
      );
    }
    console.log(
      `\n${results.filter((r) => r.ok).length}/${results.length} passed`,
    );
  } catch (error) {
    check('TASTE TEST ERROR', false, String(error));
  } finally {
    server.close();
    if (!window.isDestroyed()) window.destroy();
    app.exit(results.length > 0 && results.every((r) => r.ok) ? 0 : 1);
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
      return (
        html.includes('data-cauldron-source-loc') ||
        html.includes('data-astro-source-loc')
      );
    }, 45000);
    check('1.1 live preview renders the site', loaded);
    if (!loaded) throw new Error('preview never rendered');

    const isolated = await api.previewClick('body');
    void isolated;
    check(
      '1.8 the live preview has neither the editing bridge nor Node access',
      await api.previewBridgeAbsent(),
    );

    const picked = await api.previewClickLeaf();
    console.log('PICK', JSON.stringify(picked));
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

    // 1.3 / 1.5: a style edit, an unrelated outside edit and undo, with the
    // authored source Cauldron does not understand left byte-for-byte intact.
    const beforeStyle = fs.readFileSync(file, 'utf8');
    const styleEdit = api.writeStyle({ color: 'rgb(1, 2, 3)' });
    const afterStyle = fs.readFileSync(file, 'utf8');
    const beforeLines = beforeStyle.split('\n');
    const afterLines = afterStyle.split('\n');
    const changedLines = beforeLines
      .map((line, index) => (line === afterLines[index] ? -1 : index))
      .filter((index) => index !== -1);
    const frontmatterOf = (text: string) =>
      /^---\n[\s\S]*?\n---/.exec(text)?.[0] ?? '';
    check('1.2 a style edit is written', styleEdit.ok, styleEdit.problem ?? '');
    check(
      '1.5 only the styled tag changes, authored source is byte-for-byte intact',
      singleRegionChange(beforeStyle, afterStyle) &&
        beforeLines.length === afterLines.length &&
        changedLines.length > 0 &&
        changedLines.every(
          (index) =>
            afterLines[index].replace(/\s?style="[^"]*"/, '') ===
            beforeLines[index],
        ) &&
        frontmatterOf(beforeStyle).length > 0 &&
        frontmatterOf(beforeStyle) === frontmatterOf(afterStyle),
      `${changedLines.length} line(s) changed, frontmatter ${frontmatterOf(beforeStyle).length} bytes`,
    );

    const outsideMarker = `<!-- style outside edit ${Date.now()} -->`;
    fs.writeFileSync(
      file,
      `${fs.readFileSync(file, 'utf8')}\n${outsideMarker}\n`,
      'utf8',
    );
    const styleAgain = api.writeStyle({ color: 'rgb(4, 5, 6)' });
    const mergedStyle = fs.readFileSync(file, 'utf8');
    check(
      '1.3 a style edit merges with an unrelated outside edit',
      styleAgain.ok &&
        mergedStyle.includes(outsideMarker) &&
        mergedStyle.includes('rgb(4, 5, 6)'),
      styleAgain.problem ?? '',
    );

    const undoStyle = api.undo() as { problem?: string } | null;
    const undoneStyle = fs.readFileSync(file, 'utf8');
    check(
      '1.3 undo after an outside edit keeps the outside edit',
      !undoStyle?.problem &&
        undoneStyle.includes(outsideMarker) &&
        undoneStyle.includes('rgb(1, 2, 3)'),
      undoStyle?.problem ?? '',
    );

    // 1.4: an overlapping outside change keeps both versions and offers the
    // keep-mine / use-the-disk choice.
    const clashingStyle = fs
      .readFileSync(file, 'utf8')
      .replace('rgb(1, 2, 3)', 'rgb(9, 9, 9)');
    fs.writeFileSync(file, clashingStyle, 'utf8');
    const styleClash = api.writeStyle({ color: 'rgb(7, 8, 9)' });
    const conflictDir = path.join(app.getPath('userData'), 'conflicts');
    const copies = fs.existsSync(conflictDir)
      ? fs.readdirSync(conflictDir)
      : [];
    check(
      '1.4 an overlapping outside style change is refused',
      !styleClash.ok && Boolean(styleClash.conflict),
      styleClash.problem ?? '',
    );
    check(
      '1.4 use the disk version leaves the outside version untouched',
      fs.readFileSync(file, 'utf8') === clashingStyle,
    );

    const forced = api.forceWrite({
      kind: 'style',
      properties: { color: 'rgb(7, 8, 9)' },
    });
    const afterForce = fs.readFileSync(file, 'utf8');
    const nowCopies = fs.existsSync(conflictDir)
      ? fs.readdirSync(conflictDir)
      : [];
    const newCopies = nowCopies.filter((name) => !copies.includes(name));
    const diskVersionKept = newCopies.some((name) =>
      fs
        .readFileSync(path.join(conflictDir, name), 'utf8')
        .includes('rgb(9, 9, 9)'),
    );
    check(
      '1.4 keep mine writes my version and keeps the disk version',
      forced.ok && afterForce.includes('rgb(7, 8, 9)') && diskVersionKept,
      forced.problem ?? `${newCopies.length} conflict copies`,
    );

    // 1.3: the content save path carries the version it started from too.
    const collections = api.collections?.();
    const contentFile = (collections ?? [])
      .flatMap((collection) => collection.entries)
      .map((entry) => entry.file)
      .find(
        (entryFile) =>
          Boolean(entryFile) && fs.existsSync(path.join(root, entryFile)),
      );
    if (contentFile && api.saveEntry && api.entry) {
      const fullContent = path.join(root, contentFile);
      const entry = api.entry(contentFile) as { hash?: string } | undefined;
      const originalContent = fs.readFileSync(fullContent, 'utf8');
      fs.writeFileSync(
        fullContent,
        `${originalContent}\n<!-- content outside edit -->\n`,
        'utf8',
      );
      const staleContent = api.saveEntry({
        file: contentFile,
        baseHash: entry?.hash ?? '',
        change: { text: `${originalContent}\nplain text\n` },
      });
      check(
        '1.3 a content save based on an older version is refused',
        !staleContent.ok &&
          fs
            .readFileSync(fullContent, 'utf8')
            .includes('<!-- content outside edit -->'),
        staleContent.problem ?? '',
      );
      const freshContent = api.saveEntry({
        file: contentFile,
        baseHash: hashOf(fs.readFileSync(fullContent, 'utf8')),
        change: { text: `${originalContent}\nplain text\n` },
      });
      check(
        '1.3 a content save from the current version is written',
        freshContent.ok &&
          fs.readFileSync(fullContent, 'utf8').includes('plain text'),
        freshContent.problem ?? '',
      );
      fs.writeFileSync(fullContent, originalContent, 'utf8');
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
        '2.1 a write without a valid base version is refused',
        !stale.ok &&
          fs.readFileSync(activeForAction.location.file, 'utf8') === fileText,
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
        baseHash: hashOf(fs.readFileSync(active.location.file, 'utf8')),
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
    check('E2E ERROR', false, String(error));
  } finally {
    const failed = results.filter((r) => !r.ok).length;
    app.exit(failed === 0 ? 0 : 1);
  }
}

/**
 * 1.6 through the real window: phase "type" types into the inspector and is
 * killed outright, phase "restore" restarts, finds the visible offer and clicks
 * it. Both phases must run against the same userData (printed).
 */
export async function runCrashTest(
  root: string,
  window: import('electron').BrowserWindow,
  api: Api,
  open: (root: string) => Promise<unknown>,
  phase: 'type' | 'restore',
): Promise<void> {
  const recoveryDir = path.join(app.getPath('userData'), 'recovery');
  console.log(
    `CRASH TEST phase=${phase} userData=${app.getPath('userData')} recovery=${recoveryDir} site=${root}`,
  );
  const readRecovery = (): {
    file: string;
    body: string;
    drafts: Draft[];
  } | null => {
    if (!fs.existsSync(recoveryDir)) return null;
    for (const name of fs.readdirSync(recoveryDir)) {
      const file = path.join(recoveryDir, name);
      try {
        const body = fs.readFileSync(file, 'utf8');
        if (!body.includes(root)) continue;
        const parsed = JSON.parse(body) as { drafts?: Draft[] };
        return { file, body, drafts: parsed.drafts ?? [] };
      } catch {
        // Being written right now.
      }
    }
    return null;
  };

  try {
    if (phase === 'type') {
      await open(root);
      const loaded = await waitFor(
        async () =>
          (await api.previewHtml()).includes('data-cauldron-source-loc'),
        45000,
      );
      check('1.6 the site and its live preview are up', loaded);
      if (!loaded) throw new Error('preview never rendered');

      const picked = await api.previewClickLeaf();
      console.log('PICK', JSON.stringify(picked));
      const selected = await waitFor(
        async () => Boolean(api.getSelection()),
        15000,
      );
      check('1.6 a heading in the preview is selected', selected);
      const selection = api.getSelection();
      if (!selection) throw new Error('nothing selected');

      const file = selection.location.file;
      const original = fs.readFileSync(file, 'utf8');
      const originalHash = hashOf(original);
      console.log('SOURCE', file);

      // Type into the visible inspector, several keystrokes over ~5s, and never
      // press the save shortcut or leave the field.
      const typed = `Crash recovered ${Date.now()}`;
      // The inspector renders just after the selection arrives; wait for it so a
      // slow render is not mistaken for a lost keystroke.
      const fieldReady = await waitFor(
        async () =>
          Boolean(
            await window.webContents.executeJavaScript(
              `Boolean(document.querySelector('textarea[aria-label="Element text"]'))`,
            ),
          ),
        15000,
      );
      check('1.6 the inspector text field is shown', fieldReady);
      let accepted = 0;
      const perStep: number[] = [];
      for (let step = 1; step <= 6; step += 1) {
        const value = typed.slice(0, Math.ceil((typed.length * step) / 6));
        const ok = Number(
          await window.webContents.executeJavaScript(`(() => {
            const field = document.querySelector('textarea[aria-label="Element text"]');
            if (!field) return 0;
            const setter = Object.getOwnPropertyDescriptor(
              window.HTMLTextAreaElement.prototype,
              'value',
            ).set;
            setter.call(field, ${JSON.stringify(value)});
            field.dispatchEvent(new Event('input', { bubbles: true }));
            return field.value === ${JSON.stringify(value)} ? 1 : 0;
          })()`),
        );
        perStep.push(ok);
        accepted += ok;
        await wait(900);
      }
      check(
        '1.6 typed text reaches the inspector without being applied',
        accepted === 6,
        `${accepted}/6 keystrokes, per step ${perStep.join('')}`,
      );
      check(
        '1.6 the source file is untouched while typing',
        fs.readFileSync(file, 'utf8') === original,
      );

      const saved = await waitFor(async () => {
        const read = readRecovery();
        return Boolean(read?.drafts.some((draft) => draft.value === typed));
      }, 10000);
      const read = readRecovery();
      console.log(`RECOVERY FILE ${read?.file ?? '(none)'}`);
      console.log(`RECOVERY CONTENT ${read?.body ?? '(none)'}`);
      check(
        '1.6 continuous typing still reaches the recovery file',
        saved,
        read?.file ?? 'no recovery file',
      );
      if (!saved || !read) throw new Error('no recovery data to crash on');
      check(
        '1.6 the recovery draft keeps the original source version',
        read.drafts.every(
          (draft) => draft.baseHash === hashOf(fs.readFileSync(file, 'utf8')),
        ),
      );
      check(
        '1.6 the recovery data is outside the site',
        !read.file.startsWith(root),
      );
      check(
        '1.6 the site still holds its original source',
        hashOf(fs.readFileSync(file, 'utf8')) === originalHash,
      );

      console.log(
        'CRASH TEST: killing the process now (SIGKILL, no clean shutdown)',
      );
      await wait(300);
      process.kill(process.pid, 'SIGKILL');
      await wait(2000);
      throw new Error('the process survived SIGKILL');
    }

    const before = readRecovery();
    if (!before) {
      check('1.6 recovery data survived the crash', false, recoveryDir);
      throw new Error('no recovery data after the crash');
    }
    const draft = before.drafts[0];
    console.log(`RECOVERY FILE ${before.file}`);
    console.log(`RECOVERY CONTENT ${before.body}`);
    const file = path.join(root, draft.file);
    const disk = fs.readFileSync(file, 'utf8');
    check(
      '1.6 recovery data survived the crash',
      before.drafts.length > 0,
      `${before.drafts.length} change(s)`,
    );
    check(
      '1.6 the source still holds the version the draft was typed against',
      draft.baseHash === hashOf(disk),
    );

    await open(root);
    const offered = await waitFor(
      async () =>
        Boolean(
          await window.webContents.executeJavaScript(
            `Boolean([...document.querySelectorAll('.notice')].find((n) => n.textContent.includes('Unsaved edits from last time')))`,
          ),
        ),
      20000,
    );
    const notice = await window.webContents.executeJavaScript(
      `(() => { const n = [...document.querySelectorAll('.notice')].find((el) => el.textContent.includes('Unsaved edits from last time')); return n ? n.textContent.trim() : null; })()`,
    );
    console.log(`RECOVERY OFFER ${JSON.stringify(notice)}`);
    check('1.6 the visible interface offers the recovered edits', offered);

    const clicked = await window.webContents.executeJavaScript(
      `(() => { const b = [...document.querySelectorAll('button')].find((el) => el.textContent.trim() === 'Restore the first one'); if (!b) return null; b.click(); return b.textContent.trim(); })()`,
    );
    console.log(`RESTORE CONTROL ${JSON.stringify(clicked)}`);
    check(
      '1.6 the offer has a restore control in the window',
      Boolean(clicked),
    );

    const landed = await waitFor(
      async () => fs.readFileSync(file, 'utf8').includes(String(draft.value)),
      15000,
    );
    check(
      '1.6 clicking restore writes the typed text to the source',
      landed,
      landed ? String(draft.value) : 'text never landed',
    );
    const consumed = await waitFor(
      async () => (readRecovery()?.drafts.length ?? 0) === 0,
      10000,
    );
    check('1.6 the restored change is cleared from recovery', consumed);
    const noticeGone = await waitFor(
      async () =>
        Boolean(
          await window.webContents.executeJavaScript(
            `!([...document.querySelectorAll('.notice')].find((n) => n.textContent.includes('Unsaved edits from last time')))`,
          ),
        ),
      10000,
    );
    check('1.6 the offer disappears once it is restored', noticeGone);
  } catch (error) {
    console.error('CRASH TEST ERROR', error);
    check('CRASH TEST ERROR', false, String(error));
  } finally {
    console.log(
      `\n${results.filter((r) => r.ok).length}/${results.length} passed`,
    );
    app.exit(results.every((r) => r.ok) ? 0 : 1);
  }
}

/**
 * 14: every failure has a visible result and a console diagnostic. Each case is
 * injected through the real packaged app: damaged files on disk, a permission
 * change, or the same IPC the buttons use.
 */
export async function runFailureTest(
  root: string,
  window: import('electron').BrowserWindow,
  api: Api,
  open: (root: string) => Promise<unknown>,
  contentRoot?: string,
): Promise<void> {
  const recoveryDir = path.join(app.getPath('userData'), 'recovery');
  const recoveryFile = path.join(
    recoveryDir,
    `${crypto.createHash('sha256').update(root).digest('hex').slice(0, 16)}.json`,
  );
  const errors: string[] = [];
  const realError = console.error.bind(console);
  console.error = (...args: unknown[]) => {
    errors.push(args.map((arg) => String(arg)).join(' '));
    realError(...args);
  };
  const since = (index: number) => errors.slice(index);

  const js = (code: string) =>
    window.webContents.executeJavaScript(code) as Promise<unknown>;
  const dom = async (selector: string): Promise<string | null> =>
    (await js(
      `(() => { const el = document.querySelector(${JSON.stringify(selector)}); return el ? el.textContent.trim() : null; })()`,
    )) as string | null;
  const waitText = async (
    selector: string,
    needle: string,
    timeout = 20000,
  ) => {
    let text: string | null = null;
    const found = await waitFor(async () => {
      text = await dom(selector);
      return Boolean(text && text.includes(needle));
    }, timeout);
    return { found, text };
  };
  const reported = (from: number, needle: string): string | null =>
    since(from).find((line) => line.includes(needle)) ?? null;

  console.log(`FAILURE TEST userData=${app.getPath('userData')} site=${root}`);
  try {
    fs.mkdirSync(recoveryDir, { recursive: true });
    fs.rmSync(path.join(root, 'cauldron/design.json'), { force: true });

    // 1. Damaged recovery data, written before the site is opened.
    fs.writeFileSync(recoveryFile, '{"drafts": [ this is not json', 'utf8');
    let mark = errors.length;
    await open(root);
    const one = await waitText('.statusbar', 'could not be read');
    console.log(`CASE 1 DOM ${JSON.stringify(one.text)}`);
    console.log(
      `CASE 1 STDERR ${JSON.stringify(reported(mark, 'Saved edits could not be read'))}`,
    );
    check(
      '14.1 damaged recovery data is visible in the window',
      one.found,
      String(one.text),
    );
    check(
      '14.1 damaged recovery data has a console diagnostic',
      Boolean(reported(mark, 'Saved edits could not be read')),
    );

    // 5a. Damaged design settings: opened site, then a damaged file, then reopen.
    mark = errors.length;
    fs.mkdirSync(path.join(root, 'cauldron'), { recursive: true });
    fs.writeFileSync(
      path.join(root, 'cauldron/design.json'),
      '{ broken',
      'utf8',
    );
    await open(root);
    const five = await waitText(
      '.statusbar',
      'design setting could not be read',
    );
    console.log(`CASE 5 DOM ${JSON.stringify(five.text)}`);
    console.log(
      `CASE 5 STDERR ${JSON.stringify(reported(mark, 'design setting could not be read'))}`,
    );
    check(
      '14.5a damaged design settings are visible in the window',
      five.found,
      String(five.text),
    );
    check(
      '14.5a damaged design settings have a console diagnostic',
      Boolean(reported(mark, 'design setting could not be read')),
    );

    // 5b. A missing design.json is not a failure: missing must stay distinguishable.
    //     Clear the damaged recovery file first so only the design setting is tested.
    fs.rmSync(path.join(root, 'cauldron/design.json'), { force: true });
    fs.rmSync(recoveryFile, { force: true });
    mark = errors.length;
    await open(root);
    await wait(4000);
    const missing = await dom('.statusbar');
    console.log(`CASE 5b DOM ${JSON.stringify(missing)}`);
    console.log(
      `CASE 5b STDERR ${JSON.stringify(since(mark).filter((line) => line.includes('design setting')))}`,
    );
    check(
      '14.5b a missing design file reports no failure',
      Boolean(missing) && !missing!.includes('design setting'),
      String(missing),
    );
    check(
      '14.5b a missing design file writes no diagnostic',
      since(mark).every((line) => !line.includes('design setting')),
    );

    // 2. A file the scan cannot read, during a real run.
    const scanTarget = path.join(root, 'src/pages/about.astro');
    fs.chmodSync(scanTarget, 0o000);
    mark = errors.length;
    const started = (await js(
      `window.cauldron.startRun({ tool: 'claude', prompt: 'Failure injection run' })`,
    )) as { ok: boolean; run?: { id: string } };
    await wait(1200);
    const finished = (await js(
      `window.cauldron.finishRun(${JSON.stringify(started.run?.id ?? '')})`,
    )) as { ok: boolean };
    fs.chmodSync(scanTarget, 0o644);
    const two = await waitText('.statusbar', 'could not be read');
    console.log(
      `CASE 2 START ${JSON.stringify(started)} FINISH ${JSON.stringify(finished)}`,
    );
    console.log(`CASE 2 DOM ${JSON.stringify(two.text)}`);
    console.log(
      `CASE 2 STDERR ${JSON.stringify(reported(mark, 'could not be read'))}`,
    );
    check(
      '14.2 an unreadable file during a run is visible in the window',
      two.found,
      String(two.text),
    );
    check(
      '14.2 an unreadable file during a run has a console diagnostic',
      Boolean(reported(mark, 'could not be read')),
    );

    // 4. Restore refusal with another tool view open, the inspector collapsed and
    //    nothing selected. The draft is written the way the app writes one.
    api.saveDraft([
      {
        key: 'text:src/pages/index.astro:1:1',
        file: 'src/pages/index.astro',
        line: 1,
        column: 1,
        name: 'h1',
        field: 'text',
        value: 'Stale draft text',
        baseHash: 'not-the-current-file-version',
        savedAt: Date.now(),
      },
    ]);
    mark = errors.length;
    await open(root);
    const offered = await waitFor(
      async () =>
        (await dom('.notice')) !== null &&
        String(await dom('.notice')).includes('Unsaved edits from last time'),
      20000,
    );
    check('14.4 the recovered draft is offered before the refusal', offered);
    await js(
      `document.querySelector('nav.rail button[title="Content"]').click()`,
    );
    await wait(600);
    await js(
      `(() => { const b = [...document.querySelectorAll('button')].find((el) => el.textContent.trim().startsWith('Element')); if (b) b.click(); return true; })()`,
    );
    await wait(400);
    const view = (await js(
      `(async () => ({ view: document.querySelector('.pane-body h2')?.textContent?.trim() ?? null, selection: (await window.cauldron.state()).selection }))()`,
    )) as { view: string | null; selection: unknown };
    console.log(`CASE 4 VIEW ${JSON.stringify(view)}`);
    const restored = (await js(
      `(() => { const b = [...document.querySelectorAll('button')].find((el) => el.textContent.trim() === 'Restore the first one'); if (!b) return 'no restore control'; b.click(); return 'clicked'; })()`,
    )) as string;
    const four = await waitText('.statusbar', 'no longer matches');
    console.log(`CASE 4 CONTROL ${restored} DOM ${JSON.stringify(four.text)}`);
    console.log(
      `CASE 4 STDERR ${JSON.stringify(reported(mark, 'no longer matches'))}`,
    );
    check(
      '14.4 restore refusal is visible with another view open and no selection',
      four.found && view.selection === null,
      `view=${JSON.stringify(view.view)} ${JSON.stringify(four.text)}`,
    );
    check(
      '14.4 restore refusal has a console diagnostic',
      Boolean(reported(mark, 'no longer matches')),
    );

    // 3. Preview comparison: the preview is stopped before the run finishes, so
    //    there is no page to compare against. The outcome must be reported, not
    //    passed off as "nothing changed".
    await open(root);
    await waitFor(
      async () =>
        String(await api.previewHtml()).includes('data-cauldron-source-loc'),
      45000,
    );
    mark = errors.length;
    const run3 = (await js(
      `window.cauldron.startRun({ tool: 'claude', prompt: 'Comparison failure' })`,
    )) as { ok: boolean; run?: { id: string } };
    await js(`window.cauldron.stopPreview()`);
    await wait(800);
    const finished3 = (await js(
      `window.cauldron.finishRun(${JSON.stringify(run3.run?.id ?? '')})`,
    )) as { ok: boolean };
    const three = await waitText('.statusbar', 'could not be compared', 12000);
    console.log(
      `CASE 3 FINISH ${JSON.stringify(finished3)} DOM ${JSON.stringify(three.text)}`,
    );
    console.log(
      `CASE 3 STDERR ${JSON.stringify(reported(mark, 'could not be compared'))}`,
    );
    check(
      '14.3 a failed preview comparison is visible in the window',
      three.found,
      String(three.text),
    );
    check(
      '14.3 a failed preview comparison has a console diagnostic',
      Boolean(reported(mark, 'could not be compared')),
    );

    // 6. A content draft that cannot be persisted. Recovery storage is made
    //    unwritable, then a form field is typed into in the real panel.
    if (!contentRoot) {
      console.log('CASE 6 NOT RUN: no content site supplied');
    } else {
      fs.chmodSync(recoveryDir, 0o500);
      await open(contentRoot);
      await js(
        `document.querySelector('nav.rail button[title="Content"]').click()`,
      );
      await wait(2500);
      const entry = (await js(
        `(() => { const b = [...document.querySelectorAll('ul button')][0]; if (!b) return null; b.click(); return b.textContent.trim(); })()`,
      )) as string | null;
      await wait(1200);
      mark = errors.length;
      const typed = (await js(
        `(() => { const f = document.querySelector('input[id^="content-"]'); if (!f) return 'no field'; const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set; setter.call(f, 'Injected failure value'); f.dispatchEvent(new Event('input', { bubbles: true })); return f.value; })()`,
      )) as string;
      const six = await waitText(
        '.notice.bad',
        'could not be kept as a draft',
        12000,
      );
      console.log(
        `CASE 6 ENTRY ${JSON.stringify(entry)} FIELD ${JSON.stringify(typed)}`,
      );
      console.log(`CASE 6 DOM ${JSON.stringify(six.text)}`);
      console.log(`CASE 6 STDERR ${JSON.stringify(since(mark).slice(-3))}`);
      check(
        '14.6 an unpersistable content draft is visible in the panel',
        six.found,
        String(six.text),
      );
      fs.chmodSync(recoveryDir, 0o700);
    }
  } catch (error) {
    console.error('FAILURE TEST ERROR', error);
    check('FAILURE TEST ERROR', false, String(error));
  } finally {
    try {
      fs.chmodSync(recoveryDir, 0o700);
    } catch {
      // Already writable.
    }
    console.log(
      `\n${results.filter((r) => r.ok).length}/${results.length} passed`,
    );
    app.exit(results.every((r) => r.ok) ? 0 : 1);
  }
}
