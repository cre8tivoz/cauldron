import { BrowserWindow, Menu, app, dialog, ipcMain, shell } from 'electron';
import path from 'node:path';
import fs from 'node:fs';
import { buildMenu } from '../app-menu';
import { detectSite, startDevServer, type DevServer, type Site } from './site';
import { Preview } from './preview';
import { History } from './history';
import { Runs, type Run } from './runs';
import { runAction, actionCatalogue, type ActionRequest } from './actions';
import {
  runAgent,
  buildPrompt,
  type AgentTool,
  type AgentHandle,
} from './agent';
import {
  DIRECTIONS,
  findDirection,
  readDirection,
  writeDirection,
} from './directions';
import { startMcpServer, type McpHandle } from './mcp';
import { readCollections, readEntry, saveEntry } from './content';
import { LIBRARY, LINKS_SHELF, addPiece, piecePreview } from './library';
import { clearDrafts, loadDrafts, saveDrafts, type Draft } from './recovery';
import { hashOf, isInside, readFile, writeFileAtomic } from './files';
import {
  applyEdit,
  snapshotElement,
  type EditOperation,
  type ElementSnapshot,
  type Location,
} from './edit';

const SMOKE = process.env.CAULDRON_SMOKE === '1';
let sawUnexpectedError = '';
const E2E_SITE = process.env.CAULDRON_E2E_SITE ?? '';

type SelectionState = {
  id: string;
  location: Location;
  snapshot: ElementSnapshot;
  pageUrl: string;
  domPath: string;
};

type Controller = {
  window: BrowserWindow | null;
  site: Site | null;
  preview: Preview;
  server: DevServer | null;
  selection: SelectionState | null;
  history: History;
  runs: Runs;
  beforeLocs: Array<{ loc: string; text: string }>;
  agent: AgentHandle | null;
  agentRunId: string | null;
  sessions: Map<string, Partial<Record<AgentTool, string>>>;
  mcp: McpHandle | null;
  status: string[];
};

const state: Controller = {
  window: null,
  site: null,
  preview: new Preview(),
  server: null,
  selection: null,
  history: new History(),
  runs: new Runs(),
  beforeLocs: [],
  agent: null,
  agentRunId: null,
  sessions: new Map(),
  mcp: null,
  status: [],
};

function send(channel: string, payload: unknown): void {
  const window = state.window;
  if (!window || window.isDestroyed()) return;
  window.webContents.send(channel, payload);
}

function status(message: string): void {
  state.status = [...state.status.slice(-80), message];
  send('cauldron:status', message);
}

function relativeFile(file: string): string {
  if (!state.site) return file;
  return path.relative(state.site.root, file) || file;
}

function selectionView() {
  const selection = state.selection;
  if (!selection) return null;
  return {
    id: selection.id,
    file: relativeFile(selection.location.file),
    line: selection.location.line,
    column: selection.location.column,
    name: selection.location.name,
    text: selection.snapshot.text,
    textEditable: selection.snapshot.textEditable,
    attributes: selection.snapshot.attributes,
    style: selection.snapshot.style,
    pageUrl: selection.pageUrl,
    domPath: selection.domPath,
    history: state.history.state(),
  };
}

function pushSelection(): void {
  send('cauldron:selection', selectionView());
}

async function stopPreview(): Promise<void> {
  state.server?.stop();
  state.server = null;
  state.mcp?.close();
  state.mcp = null;
  state.preview.hide();
  send('cauldron:preview', { running: false, url: null });
}

async function startPreview(): Promise<
  { problem: string; detail: string } | { url: string }
> {
  const site = state.site;
  if (!site)
    return { problem: 'No site is open.', detail: 'Open a folder first.' };
  if (state.server) return { url: state.server.url };

  status(`Starting the preview for ${site.name}…`);
  const server = await startDevServer(site, (line) => {
    if (/error|warn/i.test(line)) status(`preview: ${line}`);
  });
  if ('problem' in server) {
    status(server.problem);
    return server;
  }
  state.server = server;
  state.preview.show();
  await state.preview.load(server.url);
  await startMcp(site);
  send('cauldron:preview', { running: true, url: server.url });
  status(`Preview running at ${server.url}`);
  return { url: server.url };
}

/** The local connection for outside agents, one per open site (plan 3.3). */
async function startMcp(site: Site): Promise<void> {
  state.mcp?.close();
  state.mcp = null;
  try {
    state.mcp = await startMcpServer({
      root: site.root,
      siteName: site.name,
      run: (request) => runAction(site.root, request),
      readSelection: () => selectionView(),
      readDesign: () => readDirection(site.root),
    });
    status(`Outside agents can connect on ${state.mcp.url}`);
  } catch (error) {
    status(
      `The outside-agent connection could not start: ${(error as Error).message}`,
    );
  }
}

async function openSiteAt(root: string) {
  const detected = detectSite(root);
  if ('problem' in detected) {
    status(detected.problem);
    return detected;
  }

  await stopPreview();
  state.site = detected;
  state.selection = null;
  state.history = new History();
  send('cauldron:site', { site: detected, drafts: loadDrafts(detected.root) });
  status(
    `${detected.name}: Astro ${detected.astroVersion}, ${detected.packageManager}`,
  );
  await startPreview();
  return { site: detected };
}

/** Every element on the page with its text, used to see what a run changed. */
function collectLocs(): Promise<Array<{ loc: string; text: string }>> {
  const view = state.preview.webContents;
  if (!view) return Promise.resolve([]);
  return view
    .executeJavaScript(
      `(() => [...document.querySelectorAll('[data-astro-source-loc]')]
        .map((el) => ({ loc: el.getAttribute('data-astro-source-loc') || '', text: (el.textContent || '').trim().slice(0, 160) }))
        .filter((item) => item.text !== ''))()`,
    )
    .catch(() => []);
}

/** The Before/After toggle: outlines the parts of the page the run changed. */
function highlightLocs(locs: string[], on: boolean): void {
  const view = state.preview.webContents;
  if (!view) return;
  const css = on
    ? locs
        .map(
          (loc) =>
            `[data-astro-source-loc="${loc}"]{outline:2px solid #ffa99a !important;outline-offset:2px !important}`,
        )
        .join('\n')
    : '';
  void view
    .executeJavaScript(
      `(() => {
        let style = document.getElementById('cauldron-highlight');
        if (!style) {
          style = document.createElement('style');
          style.id = 'cauldron-highlight';
          document.head.appendChild(style);
        }
        style.textContent = ${JSON.stringify(css)};
        return true;
      })()`,
    )
    .catch(() => undefined);
}

function runSummary(run: Run) {
  return {
    id: run.id,
    tool: run.tool,
    prompt: run.prompt,
    status: run.status,
    note: run.note,
    startedAt: run.startedAt,
    finishedAt: run.finishedAt,
    files: run.files.map((file) => file.file),
    highlighted: run.highlighted,
  };
}

function requireSite(): Site | { problem: string } {
  if (!state.site) return { problem: 'No site is open.' };
  return state.site;
}

function saveConflictCopy(file: string, text: string): string {
  const dir = path.join(app.getPath('userData'), 'conflicts');
  fs.mkdirSync(dir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const target = path.join(dir, `${stamp}-${path.basename(file)}`);
  fs.writeFileSync(target, text, 'utf8');
  return target;
}

/**
 * Every write goes through here: it checks the file against what the edit was based on,
 * merges when the other change is elsewhere in the file, and refuses when it overlaps
 * (plan items 1.3 and 1.4).
 */
function writeSelection(
  operation: EditOperation,
  options: { force?: boolean } = {},
):
  | { ok: true; selection: unknown }
  | { ok: boolean; problem: string; conflict?: unknown } {
  const selection = state.selection;
  const site = state.site;
  if (!selection || !site)
    return { ok: false, problem: 'Nothing is selected.' };
  if (!isInside(site.root, selection.location.file)) {
    return { ok: false, problem: 'That element is not inside the open site.' };
  }

  const disk = readFile(selection.location.file);
  const attributes: Record<string, string> = {};
  if (operation.kind === 'attribute' || operation.kind === 'style') {
    for (const attribute of selection.snapshot.attributes) {
      attributes[attribute.name] = attribute.value;
    }
    attributes.style =
      selection.snapshot.attributes.find(
        (attribute) => attribute.name === 'style',
      )?.value ?? '';
  }

  const result = applyEdit(disk.text, selection.location, operation, {
    text: selection.snapshot.text,
    attributes,
  });

  if (!result.ok) {
    if (result.conflict && options.force) {
      saveConflictCopy(selection.location.file, disk.text);
      const forced = applyEdit(disk.text, selection.location, operation, {});
      if (!forced.ok) return { ok: false, problem: forced.reason };
      writeFileAtomic(selection.location.file, forced.text);
      state.history.record({
        file: selection.location.file,
        location: selection.location,
        operation,
        before: disk.text,
        after: forced.text,
        beforeHash: disk.hash,
        afterHash: forced.hash,
        label: 'Edit',
      });
      selection.snapshot = forced.snapshot;
      pushSelection();
      return { ok: true, selection: selectionView() };
    }
    if (result.conflict) {
      return {
        ok: false,
        problem: result.reason,
        conflict: {
          file: relativeFile(selection.location.file),
          diskText: result.conflict.diskText,
          reason: result.reason,
        },
      };
    }
    return { ok: false, problem: result.reason };
  }

  const hash = writeFileAtomic(selection.location.file, result.text);
  if (hash !== result.hash) {
    return { ok: false, problem: 'The file changed while it was being saved.' };
  }
  state.history.record({
    file: selection.location.file,
    location: selection.location,
    operation,
    before: disk.text,
    after: result.text,
    beforeHash: disk.hash,
    afterHash: result.hash,
    label: operation.kind === 'text' ? 'Text edit' : 'Style edit',
  });
  selection.snapshot = result.snapshot;
  pushSelection();
  status(`Saved ${relativeFile(selection.location.file)}`);
  return { ok: true, selection: selectionView() };
}

function sendAgent(payload: { tool: AgentTool; request: string }): {
  ok: boolean;
  runId?: string;
  problem?: string;
} {
  const site = requireSite();
  if ('problem' in site) return { ok: false, problem: site.problem };
  const direction = readDirection(site.root);
  if (!direction) {
    return {
      ok: false,
      problem:
        'Choose a design direction for this site first, so the agent has a look to build to.',
    };
  }
  if (state.agent)
    return { ok: false, problem: 'An agent job is already running.' };

  const selection = state.selection
    ? {
        file: relativeFile(state.selection.location.file),
        line: state.selection.location.line,
        column: state.selection.location.column,
        name: state.selection.location.name,
        text: state.selection.snapshot.text,
      }
    : null;

  const prompt = buildPrompt({
    request: payload.request,
    siteName: site.name,
    direction,
    selection,
    catalogue: actionCatalogue(),
  });

  state.beforeLocs = [];
  const run = state.runs.start(site.root, payload.tool, payload.request);
  state.agentRunId = run.id;
  void collectLocs().then((locs) => {
    state.beforeLocs = locs;
  });

  const sessions = state.sessions.get(site.root) ?? {};
  send('cauldron:agent-event', {
    type: 'status',
    text: `Starting ${payload.tool}…`,
  });

  state.agent = runAgent({
    tool: payload.tool,
    root: site.root,
    prompt,
    sessionId: sessions[payload.tool],
    onEvent: (event) => {
      if (event.type === 'session') {
        const next = {
          ...state.sessions.get(site.root),
          [payload.tool]: event.sessionId,
        };
        state.sessions.set(site.root, next);
        return;
      }
      send('cauldron:agent-event', event);
      if (event.type === 'done' || event.type === 'error') {
        void finishAgentRun(event.type === 'error' ? event.text : '');
      }
    },
  });

  return { ok: true, runId: run.id };
}

function registerIpc(): void {
  ipcMain.handle('cauldron:open-site-dialog', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory'],
      title: 'Open an Astro site',
    });
    if (result.canceled || result.filePaths.length === 0)
      return { cancelled: true };
    return openSiteAt(result.filePaths[0]);
  });

  ipcMain.handle('cauldron:open-site', async (_event, root: string) =>
    openSiteAt(root),
  );

  ipcMain.handle('cauldron:site-state', () => ({
    site: state.site,
    running: Boolean(state.server),
    url: state.server?.url ?? null,
    status: state.status,
    selection: selectionView(),
    drafts: state.site ? loadDrafts(state.site.root) : [],
  }));

  ipcMain.handle('cauldron:start-preview', () => startPreview());
  ipcMain.handle('cauldron:stop-preview', async () => {
    await stopPreview();
    return true;
  });

  ipcMain.handle('cauldron:refresh-selection', () => {
    refreshSelectionFromDisk();
    return selectionView();
  });

  ipcMain.handle('cauldron:selection-clear', () => {
    state.selection = null;
    pushSelection();
    return true;
  });

  ipcMain.handle('cauldron:apply-text', (_event, value: string) =>
    writeSelection({ kind: 'text', value }),
  );

  ipcMain.handle(
    'cauldron:apply-attribute',
    (_event, name: string, value: string | null) =>
      writeSelection({ kind: 'attribute', name, value }),
  );

  ipcMain.handle(
    'cauldron:apply-style',
    (_event, properties: Record<string, string>) =>
      writeSelection({ kind: 'style', properties }),
  );

  ipcMain.handle('cauldron:force-write', (_event, operation: EditOperation) =>
    writeSelection(operation, { force: true }),
  );

  ipcMain.handle('cauldron:undo', () => undoLast());
  ipcMain.handle('cauldron:redo', () => redoLast());

  ipcMain.handle('cauldron:save-drafts', (_event, drafts: Draft[]) => {
    if (!state.site) return false;
    saveDrafts(state.site.root, drafts);
    return true;
  });

  ipcMain.handle('cauldron:discard-drafts', () => {
    if (!state.site) return false;
    clearDrafts(state.site.root);
    send('cauldron:drafts', { drafts: [] });
    return true;
  });

  ipcMain.handle(
    'cauldron:new-page',
    (_event, page: { path: string; title: string }) => createPage(page),
  );

  ipcMain.handle('cauldron:restore-draft', (_event, draft: Draft) =>
    restoreDraft(draft),
  );

  ipcMain.handle(
    'cauldron:run-start',
    (_event, payload: { tool: string; prompt: string }) => {
      const site = requireSite();
      if ('problem' in site) return site;
      state.beforeLocs = [];
      const run = state.runs.start(site.root, payload.tool, payload.prompt);
      void collectLocs().then((locs) => {
        state.beforeLocs = locs;
      });
      status(`Run started: ${payload.tool}`);
      return { ok: true, run: runSummary(run) };
    },
  );

  ipcMain.handle('cauldron:run-finish', async (_event, id: string) => {
    const site = requireSite();
    if ('problem' in site) return site;
    const afterLocs = await collectLocs();
    const before = new Map(
      state.beforeLocs.map((item) => [item.loc, item.text]),
    );
    const changed = afterLocs.filter(
      (item) => before.get(item.loc) !== item.text,
    );
    const removed = state.beforeLocs.filter(
      (item) => !afterLocs.some((current) => current.loc === item.loc),
    );
    const run = state.runs.finish(site.root, id);
    if (!run) return { ok: false, problem: 'That run is not known.' };
    state.runs.setHighlighted(id, [...changed, ...removed]);
    state.preview.reload();
    status(run.note);
    return { ok: true, run: runSummary(run) };
  });

  ipcMain.handle('cauldron:run-undo', (_event, id: string) => {
    const site = requireSite();
    if ('problem' in site) return site;
    const result = state.runs.undo(site.root, id);
    if (!result.ok) {
      status(result.problem);
      return { ok: false, problem: result.problem, clashes: result.clashes };
    }
    state.preview.reload();
    refreshSelectionFromDisk();
    status('Run undone');
    return { ok: true };
  });

  ipcMain.handle('cauldron:runs', () => state.runs.list().map(runSummary));

  ipcMain.handle('cauldron:action-catalogue', () => actionCatalogue());

  ipcMain.handle('cauldron:collections', () => {
    const site = requireSite();
    if ('problem' in site) return { collections: [] };
    return { collections: readCollections(site.root) };
  });

  ipcMain.handle('cauldron:entry', (_event, file: string) => {
    const site = requireSite();
    if ('problem' in site) return site;
    return readEntry(site.root, file);
  });

  ipcMain.handle(
    'cauldron:save-entry',
    (
      _event,
      payload: {
        file: string;
        baseHash: string;
        change: Record<string, string>;
      },
    ) => {
      const site = requireSite();
      if ('problem' in site) return site;
      const result = saveEntry(
        site.root,
        payload.file,
        payload.baseHash,
        payload.change,
      );
      if (result.ok) status(`Saved ${payload.file}`);
      return result;
    },
  );

  ipcMain.handle('cauldron:library', () => ({
    pieces: LIBRARY.map((piece) => ({
      id: piece.id,
      name: piece.name,
      category: piece.category,
      description: piece.description,
      licence: piece.licence,
      source: piece.source,
      needsScript: piece.needsScript,
      codeAllowed: piece.codeAllowed,
      previewHtml: piecePreview(piece),
    })),
    links: LINKS_SHELF,
  }));

  ipcMain.handle(
    'cauldron:add-piece',
    async (
      _event,
      payload: {
        pieceId: string;
        page: string;
        mode: 'add' | 'replace';
        replaceSelector?: string;
      },
    ) => {
      const site = requireSite();
      if ('problem' in site) return site;

      state.beforeLocs = [];
      const run = state.runs.start(
        site.root,
        'library',
        `Add ${payload.pieceId}`,
      );
      const result = addPiece(site.root, payload);
      const finished = state.runs.finish(site.root, run.id);
      if (finished) state.runs.setHighlighted(run.id, []);
      if (!result.ok) {
        state.runs.fail(run.id, result.problem);
        return result;
      }
      state.preview.reload();
      status(`Added ${payload.pieceId} to ${result.page}`);
      return { ...result, runId: run.id };
    },
  );

  ipcMain.handle('cauldron:mcp-info', () =>
    state.mcp ? { url: state.mcp.url, code: state.mcp.code } : null,
  );

  ipcMain.handle('cauldron:directions', () =>
    DIRECTIONS.map((direction) => ({
      id: direction.id,
      name: direction.name,
      forWhom: direction.forWhom,
      learnedFrom: direction.learnedFrom,
      colours: direction.colours,
      fonts: {
        display: direction.fonts.display.family,
        body: direction.fonts.body.family,
      },
      character: direction.character,
      watch: direction.watch,
    })),
  );

  ipcMain.handle('cauldron:direction', () =>
    state.site ? readDirection(state.site.root) : null,
  );

  ipcMain.handle('cauldron:set-direction', (_event, id: string) => {
    const result = setDirectionTo(id);
    if ('ok' in result && result.ok) {
      status(
        `${findDirection(id)?.name ?? 'That direction'} is now this site's design direction.`,
      );
    }
    return result;
  });

  ipcMain.handle(
    'cauldron:agent-send',
    (_event, payload: { tool: AgentTool; request: string }) =>
      sendAgent(payload),
  );

  ipcMain.handle('cauldron:agent-cancel', () => {
    state.agent?.cancel();
    state.agent = null;
    if (state.agentRunId) state.runs.fail(state.agentRunId, 'Cancelled.');
    state.agentRunId = null;
    send('cauldron:agent-event', { type: 'status', text: 'Cancelled.' });
    return true;
  });

  ipcMain.handle('cauldron:highlight', (_event, id: string, on: boolean) => {
    const run = state.runs.get(id);
    if (!run) return false;
    highlightLocs(
      run.highlighted.map((item) => item.loc),
      on,
    );
    return true;
  });

  ipcMain.handle('cauldron:run-action', (_event, request: unknown) => {
    const site = requireSite();
    if ('problem' in site) return site;
    return runAction(site.root, request as ActionRequest);
  });

  registerPreviewIpc();
}

async function createPage(page: { path: string; title: string }) {
  const site = requireSite();
  if ('problem' in site) return site;
  const clean = page.path.replace(/^\/+/, '').replace(/\.astro$/, '');
  if (!/^[a-z0-9][a-z0-9\-/]*$/.test(clean)) {
    return {
      problem:
        'Page addresses can only use lowercase letters, numbers and dashes.',
    };
  }
  const file = path.join(site.root, 'src/pages', `${clean}.astro`);
  if (!isInside(site.root, file))
    return { problem: 'That page would sit outside the site.' };
  if (fs.existsSync(file))
    return { problem: 'A page already exists at that address.' };
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const title = page.title.trim() || clean;
  fs.writeFileSync(
    file,
    `---\n---\n<!doctype html>\n<html lang="en-AU">\n  <head>\n    <meta charset="utf-8" />\n    <meta name="viewport" content="width=device-width, initial-scale=1" />\n    <title>${title}</title>\n  </head>\n  <body>\n    <h1>${title}</h1>\n  </body>\n</html>\n`,
    'utf8',
  );
  const url = new URL(`/${clean}/`, state.server?.url ?? 'http://127.0.0.1/')
    .href;
  await state.preview.load(url);
  status(`Created ${path.relative(site.root, file)}`);
  return { ok: true, file: path.relative(site.root, file), url };
}

/** Brings back text typed before a crash, using the same checked write path as any other edit. */
function restoreDraft(draft: Draft): { ok: boolean; problem?: string } {
  const site = state.site;
  if (!site) return { ok: false, problem: 'No site is open.' };
  const file = path.join(site.root, draft.file);
  if (!isInside(site.root, file))
    return { ok: false, problem: 'That draft is not from this site.' };
  const disk = readFile(file);
  const location: Location = {
    file,
    line: draft.line,
    column: draft.column,
    name: draft.name,
  };
  const snapshot = snapshotElement(disk.text, location);
  if (!snapshot)
    return {
      ok: false,
      problem: 'The element the draft belonged to has gone.',
    };
  state.selection = {
    id: `draft-${draft.key}`,
    location,
    snapshot,
    pageUrl: '',
    domPath: '',
  };
  const result = writeSelection({ kind: 'text', value: draft.value });
  if (!result.ok) return { ok: false, problem: result.problem };
  const remaining = loadDrafts(site.root).filter(
    (item) => item.key !== draft.key,
  );
  saveDrafts(site.root, remaining);
  send('cauldron:drafts', { drafts: remaining });
  return { ok: true };
}

function registerPreviewIpc(): void {
  ipcMain.handle('cauldron:preview-bounds', (_event, bounds) => {
    state.preview.setBounds(bounds);
    return true;
  });

  ipcMain.handle('cauldron:preview-reload', () => {
    state.preview.reload();
    return true;
  });

  ipcMain.handle('cauldron:pick-mode', (_event, on: boolean) => {
    state.preview.webContents?.send('preview:mode', on);
    return true;
  });

  ipcMain.on(
    'preview:report',
    (_event, report: { kind: string; payload: unknown }) => {
      if (report.kind === 'height') {
        send('cauldron:preview-height', report.payload);
        return;
      }
      if (report.kind === 'pick') {
        handlePick(report.payload);
      }
    },
  );
}

function handlePick(payload: unknown): void {
  const site = state.site;
  if (!site) return;
  const pick = payload as {
    file?: string;
    line?: number;
    column?: number;
    name?: string;
    path?: string;
    url?: string;
  } | null;

  if (!pick?.file || !pick.name || !pick.line || !pick.column) {
    state.selection = null;
    send('cauldron:selection', null);
    status(
      'That part of the page is generated by a component, so it has no file to edit.',
    );
    return;
  }
  if (!isInside(site.root, pick.file)) {
    status('That element comes from outside the site.');
    return;
  }

  const location: Location = {
    file: pick.file,
    line: pick.line,
    column: pick.column,
    name: pick.name,
  };
  const disk = readFile(pick.file);
  const snapshot = snapshotElement(disk.text, location);
  if (!snapshot) {
    status('That element could not be matched to a spot in its file.');
    return;
  }

  state.selection = {
    id: `${Date.now()}`,
    location,
    snapshot,
    pageUrl: pick.url ?? '',
    domPath: pick.path ?? '',
  };
  pushSelection();
}

let agentDoneWaiter:
  | ((result: { ok: boolean; runId?: string; note?: string }) => void)
  | null = null;

function waitForAgentDone(
  timeoutMs: number,
): Promise<{ ok: boolean; runId?: string; note?: string }> {
  return new Promise((resolve) => {
    agentDoneWaiter = resolve;
    setTimeout(() => {
      if (agentDoneWaiter === resolve) {
        agentDoneWaiter = null;
        resolve({ ok: false, note: 'The agent did not finish in time.' });
      }
    }, timeoutMs).unref();
  });
}

function setDirectionTo(id: string): { ok: boolean; problem?: string } {
  const site = requireSite();
  if ('problem' in site) return { ok: false, problem: site.problem };
  const direction = findDirection(id);
  if (!direction)
    return { ok: false, problem: 'That direction is not in the starter set.' };
  const written = writeDirection(site.root, direction);
  if (!written.ok) return written;
  return { ok: true };
}

async function finishAgentRun(note: string): Promise<void> {
  const site = state.site;
  const id = state.agentRunId;
  state.agent = null;
  state.agentRunId = null;
  if (!site || !id) return;

  const afterLocs = await collectLocs();
  const before = new Map(state.beforeLocs.map((item) => [item.loc, item.text]));
  const changed = afterLocs.filter(
    (item) => before.get(item.loc) !== item.text,
  );
  const removed = state.beforeLocs.filter(
    (item) => !afterLocs.some((current) => current.loc === item.loc),
  );
  const run = state.runs.finish(site.root, id);
  if (!run) return;
  state.runs.setHighlighted(id, [...changed, ...removed]);
  if (note) state.runs.fail(id, note);
  state.preview.reload();
  status(run.note);
  send('cauldron:agent-done', { runId: id, note: run.note });
  agentDoneWaiter?.({ ok: true, runId: id, note: run.note });
  agentDoneWaiter = null;
}

function undoLast(): { ok: boolean; problem?: string } {
  const result = state.history.undo();
  if ('problem' in result) {
    status(result.problem);
    return { ok: false, problem: result.problem };
  }
  refreshSelectionFromDisk();
  status('Undone');
  return { ok: true };
}

function redoLast(): { ok: boolean; problem?: string } {
  const result = state.history.redo();
  if ('problem' in result) {
    status(result.problem);
    return { ok: false, problem: result.problem };
  }
  refreshSelectionFromDisk();
  status('Redone');
  return { ok: true };
}

function refreshSelectionFromDisk(): void {
  const selection = state.selection;
  if (!selection) {
    pushSelection();
    return;
  }
  const disk = readFile(selection.location.file);
  const snapshot = snapshotElement(disk.text, selection.location);
  if (snapshot) selection.snapshot = snapshot;
  pushSelection();
}

function createWindow(): BrowserWindow {
  const window = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1280,
    minHeight: 800,
    show: !SMOKE && !E2E_SITE,
    title: 'Cauldron',
    backgroundColor: '#0b0b0c',
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 16, y: 16 },
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  window.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//.test(url)) void shell.openExternal(url);
    return { action: 'deny' };
  });

  const rendererUrl = MAIN_WINDOW_VITE_DEV_SERVER_URL;
  if (rendererUrl) void window.loadURL(rendererUrl);
  else
    void window.loadFile(
      path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`),
    );

  state.window = window;
  state.preview.attach(window, path.join(__dirname, 'preview-preload.js'));

  window.on('closed', () => {
    state.window = null;
    // The view goes with the window; tear it down once, safely.
    state.preview.destroy();
    void stopPreview();
  });

  return window;
}

function harnessApi() {
  return {
    openSiteAt,
    startPreview,
    previewLoad: (url: string) => state.preview.load(url),
    previewHtml: () =>
      state.preview.webContents?.executeJavaScript(
        'document.documentElement.outerHTML',
      ) as Promise<string>,
    previewClick: (selector: string) =>
      state.preview.webContents?.executeJavaScript(
        `(() => { const el = document.querySelector(${JSON.stringify(selector)}); if (!el) return null; el.click(); return { tag: el.tagName.toLowerCase(), text: el.textContent }; })()`,
      ) as Promise<unknown>,
    previewClickLeaf: () =>
      state.preview.webContents?.executeJavaScript(
        `(() => {
                const wanted = ['H1','H2','H3','H4','P','LI','A','SPAN','BUTTON'];
                const els = [...document.querySelectorAll('[data-astro-source-loc]')].filter((el) =>
                  el.children.length === 0 &&
                  el.textContent.trim().length > 2 &&
                  wanted.includes(el.tagName)
                );
                const el = els[0];
                if (!el) return null;
                el.click();
                return { tag: el.tagName.toLowerCase(), text: el.textContent };
              })()`,
      ) as Promise<unknown>,
    getSelection: () => state.selection,
    writeText: (value: string) => writeSelection({ kind: 'text', value }),
    writeStyle: (properties: Record<string, string>) =>
      writeSelection({ kind: 'style', properties }),
    undo: () => undoLast(),
    createPage: (page: { path: string; title: string }) => createPage(page),
    runAction: (request: unknown) =>
      state.site
        ? runAction(state.site.root, request as ActionRequest)
        : { ok: false, problem: 'No site.' },
    startRun: (payload: { tool: string; prompt: string }) => {
      if (!state.site) return { ok: false };
      state.beforeLocs = [];
      const run = state.runs.start(
        state.site.root,
        payload.tool,
        payload.prompt,
      );
      void collectLocs().then((locs) => {
        state.beforeLocs = locs;
      });
      return { ok: true, run: { id: run.id } };
    },
    finishRun: async (id: string) => {
      if (!state.site) return { ok: false };
      const afterLocs = await collectLocs();
      const before = new Map(
        state.beforeLocs.map((item) => [item.loc, item.text]),
      );
      const changed = afterLocs.filter(
        (item) => before.get(item.loc) !== item.text,
      );
      const run = state.runs.finish(state.site.root, id);
      if (!run) return { ok: false };
      state.runs.setHighlighted(id, changed);
      return {
        ok: true,
        run: {
          files: run.files.map((file) => file.file),
          highlighted: run.highlighted,
        },
      };
    },
    mcpInfo: async () =>
      state.mcp ? { url: state.mcp.url, code: state.mcp.code } : null,
    setDirection: (id: string) => setDirectionTo(id),
    sendAgent: (payload: { tool: AgentTool; request: string }) =>
      sendAgent(payload),
    waitForAgent: (timeout: number) => waitForAgentDone(timeout),
    buildPromptText: (request: string) => {
      const site = state.site;
      const direction = site ? readDirection(site.root) : null;
      return buildPrompt({
        request,
        siteName: site?.name ?? '',
        direction,
        selection: null,
        catalogue: actionCatalogue(),
      });
    },
    undoRun: (id: string) =>
      state.site
        ? state.runs.undo(state.site.root, id)
        : { ok: false, problem: 'No site.' },
    saveDraft: (drafts: Draft[]) => {
      if (state.site) saveDrafts(state.site.root, drafts);
    },
    restoreDraft: (draft: Draft) => restoreDraft(draft),
    status,
    site: () => state.site,
  };
}

export function start(): void {
  // A broken handler should never put a blocking error box on someone's screen.
  // It is logged and shown in the status bar instead, and the app keeps its data.
  process.on('uncaughtException', (error) => {
    sawUnexpectedError = error.message;
    console.error('Cauldron hit an unexpected error:', error);
    status(`Unexpected error: ${error.message}`);
  });

  if (!app.requestSingleInstanceLock()) {
    app.quit();
    return;
  }

  app.on('second-instance', () => {
    const window = BrowserWindow.getAllWindows()[0];
    if (window) {
      if (window.isMinimized()) window.restore();
      window.focus();
    }
  });

  app.whenReady().then(async () => {
    if ((SMOKE || E2E_SITE) && process.platform === 'darwin') app.dock?.hide();
    Menu.setApplicationMenu(buildMenu());
    registerIpc();
    createWindow();

    if (SMOKE) {
      const fail = setTimeout(() => {
        console.error('SMOKE FAIL: interface did not render within 15s');
        app.exit(1);
      }, 15000);
      state.window?.webContents.on('did-finish-load', async () => {
        const text: string = await state.window!.webContents.executeJavaScript(
          "document.querySelector('#root')?.textContent ?? ''",
        );
        clearTimeout(fail);
        const shot = process.env.CAULDRON_SHOT;
        if (shot) {
          await new Promise((resolve) => setTimeout(resolve, 600));
          const image = await state.window!.webContents.capturePage();
          fs.writeFileSync(shot, image.toPNG());
          console.log(`SMOKE SHOT: ${shot}`);
        }
        if (text.includes('Cauldron')) {
          console.log('SMOKE PASS: window created and interface rendered');
          app.exit(0);
        } else {
          console.error('SMOKE FAIL: interface root was empty');
          app.exit(1);
        }
      });
    }

    // Closing the window used to throw "Object has been destroyed" and put a dialog
    // on screen. This exercises that exact path.
    if (E2E_SITE && process.env.CAULDRON_CLOSE_TEST) {
      await openSiteAt(E2E_SITE);
      await new Promise((resolve) => setTimeout(resolve, 2500));
      state.window?.close();
      await new Promise((resolve) => setTimeout(resolve, 2000));
      console.log(
        sawUnexpectedError
          ? `CLOSE FAIL: ${sawUnexpectedError}`
          : 'CLOSE PASS: window closed cleanly after a site and preview were open',
      );
      app.exit(sawUnexpectedError ? 1 : 0);
      return;
    }

    if (E2E_SITE && process.env.CAULDRON_LIBRARY_TEST) {
      const { runLibraryTest } = await import('./e2e');
      await runLibraryTest(E2E_SITE, harnessApi() as never);
    }

    if (E2E_SITE && process.env.CAULDRON_CONTENT_TEST) {
      const { runContentTest } = await import('./e2e');
      await runContentTest(E2E_SITE, harnessApi() as never);
    }

    if (E2E_SITE && process.env.CAULDRON_AGENT_TEST) {
      const { runAgentTest } = await import('./e2e');
      await runAgentTest(E2E_SITE, harnessApi() as never);
    }

    if (E2E_SITE) {
      const { runEndToEnd } = await import('./e2e');
      await runEndToEnd(E2E_SITE, harnessApi() as never);
    }

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
  });

  app.on('before-quit', () => {
    state.server?.stop();
    state.mcp?.close();
  });
}
