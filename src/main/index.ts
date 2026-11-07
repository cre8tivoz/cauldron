import { BrowserWindow, Menu, app, dialog, ipcMain, shell } from 'electron';
import path from 'node:path';
import fs from 'node:fs';
import { buildMenu } from '../app-menu';
import { detectSite, startDevServer, type DevServer, type Site } from './site';
import { Preview } from './preview';
import { History } from './history';
import { Runs, type Run } from './runs';
import {
  runAction,
  listPages,
  actionCatalogue,
  type ActionRequest,
} from './actions';
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
import { checkSite } from './quality';
import { directionFromUrl } from './reference';
import { macBuildInfo, publish, repoState } from './publishing';
import { clearDrafts, loadDrafts, saveDrafts, type Draft } from './recovery';
import { draftEditOperation } from '../draft-restore';
import { hashOf, isInside, readFile, writeFileAtomic } from './files';
import {
  applyEdit,
  escapeText,
  snapshotElement,
  type EditOperation,
  type ElementSnapshot,
  type Location,
} from './edit';

const SMOKE = process.env.CAULDRON_SMOKE === '1';
let sawUnexpectedError = '';
const E2E_SITE = process.env.CAULDRON_E2E_SITE ?? '';
// Test runs can keep their app data in their own folder, so parallel or
// repeated harness runs never share recovery, conflict or run records.
if (E2E_SITE && process.env.CAULDRON_TEST_USER_DATA)
  app.setPath('userData', process.env.CAULDRON_TEST_USER_DATA);

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
  if (E2E_SITE) console.log(`STATUS ${message}`);
  state.status = [...state.status.slice(-80), message];
  send('cauldron:status', message);
}

/** A failure the person must see, and a diagnostic for whoever reads the console. */
function fail(message: string): void {
  console.error(message);
  status(message);
}

/** Saved edits, with damaged recovery data reported instead of shown as none. */
function storedDrafts(root: string): Draft[] {
  const read = loadDrafts(root);
  if (read.problem) fail(read.problem);
  return read.drafts;
}

/** The chosen design direction, with damaged settings reported instead of ignored. */
function directionFor(
  root: string,
): ReturnType<typeof readDirection>['direction'] {
  const read = readDirection(root);
  if (read.problem) fail(read.problem);
  return read.direction;
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
    baseHash: hashOf(selection.snapshot.sourceText),
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
  server.process.once('exit', (code) => {
    if (state.server !== server) return;
    void stopPreview();
    status(
      `The Astro preview stopped (code ${code ?? 'unknown'}). Start it again to continue.`,
    );
  });
  state.preview.show();
  try {
    await state.preview.load(server.url);
  } catch (error) {
    await stopPreview();
    const problem = `The preview could not load: ${(error as Error).message}`;
    status(problem);
    return { problem, detail: server.url };
  }
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
      run: (request) => sharedAction(request, true),
      readSelection: () => selectionView(),
      readDesign: () => directionFor(site.root),
    });
    status(`Outside agents can connect on ${state.mcp.url}`);
  } catch (error) {
    status(
      `The outside-agent connection could not start: ${(error as Error).message}`,
    );
  }
}

async function openSiteAt(root: string) {
  if (state.agent)
    return {
      problem:
        'Finish or cancel the current agent job before opening another site.',
    };
  const detected = detectSite(root);
  if ('problem' in detected) {
    status(detected.problem);
    return detected;
  }

  await stopPreview();
  state.site = detected;
  state.selection = null;
  state.history = new History();
  state.runs = new Runs();
  // Read the saved edits once, and keep the failure for last: the status bar
  // shows one message, so a later "site opened" line must not bury it (plan 1.6).
  const recovery = loadDrafts(detected.root);
  send('cauldron:site', {
    site: detected,
    drafts: recovery.drafts,
  });
  status(
    `${detected.name}: Astro ${detected.astroVersion}, ${detected.packageManager}`,
  );
  const preview = await startPreview();
  if (recovery.problem) fail(recovery.problem);
  return 'problem' in preview
    ? { site: detected, ...preview }
    : { site: detected };
}

/** Every element on the page with its text, used to see what a run changed. */
function collectLocs(): Promise<Array<{ loc: string; text: string }>> {
  const view = state.preview.webContents;
  if (!view) return Promise.resolve([]);
  return view
    .executeJavaScript(
      `(() => [...document.querySelectorAll('[data-cauldron-source-loc], [data-astro-source-loc]')]
        .map((el) => ({ loc: el.getAttribute('data-cauldron-source-loc') || el.getAttribute('data-astro-source-loc') || '', text: JSON.stringify([(el.textContent || '').trim().slice(0, 160), ...['color','backgroundColor','fontSize','fontFamily','padding','margin','display','borderRadius'].map((key) => getComputedStyle(el)[key])]) }))
        .filter((item) => item.text !== ''))()`,
    )
    .catch((error: unknown) => {
      fail(
        `The page could not be compared: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      return [];
    });
}

/** The Before/After toggle: outlines the parts of the page the run changed. */
function highlightLocs(locs: string[], on: boolean): void {
  const view = state.preview.webContents;
  if (!view) return;
  const css = on
    ? locs
        .map(
          (loc) =>
            `[data-cauldron-source-loc="${loc}"],[data-astro-source-loc="${loc}"]{outline:2px solid #ffa99a !important;outline-offset:2px !important}`,
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
    .catch((error: unknown) => {
      fail(
        `The changed parts of the page could not be highlighted: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      return undefined;
    });
}

/** Files Cauldron's own editor wrote during a run, which the run did not own. */
function outsideWrites(startedAt: number | undefined) {
  const site = state.site;
  if (!site || startedAt === undefined) return [];
  return state.history.writtenSince(startedAt).map((item) => ({
    file: path.relative(site.root, item.file),
    beforeHash: item.beforeHash,
    afterHash: item.afterHash,
  }));
}

function runStartedAt(id: string): number | undefined {
  return state.runs.get(id)?.startedAt;
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

/** Files each Cauldron-started agent run said it wrote, by run id (plan 2.2). */
const runClaims = new Map<string, Set<string>>();

function claimForRun(id: string | null, file: string): void {
  if (!id) return;
  const claims = runClaims.get(id) ?? new Set<string>();
  claims.add(file);
  runClaims.set(id, claims);
}

/**
 * One path for every edit. `fromAgent` marks writes that arrive through the
 * agent connection, so a run never mistakes the person's own edits for its own.
 */
function sharedAction(request: ActionRequest, fromAgent = false) {
  const site = state.site;
  if (!site) return { ok: false as const, problem: 'No site is open.' };
  const relative =
    'target' in request
      ? request.target.file
      : 'file' in request
        ? request.file
        : null;
  const full = relative ? path.resolve(site.root, relative) : null;
  const before =
    full && isInside(site.root, full) && fs.existsSync(full)
      ? readFile(full)
      : null;
  const result = runAction(site.root, request);
  if (result.ok && fromAgent && full) claimForRun(state.agentRunId, full);
  if (result.ok && before && full) {
    const after = readFile(full);
    if (before.hash !== after.hash)
      state.history.record({
        file: full,
        location:
          'target' in request
            ? { ...request.target, file: full }
            : { file: full, line: 1, column: 1, name: 'source' },
        operation: { kind: 'text', value: '' },
        before: before.text,
        after: after.text,
        beforeHash: before.hash,
        afterHash: after.hash,
        label: request.action,
        // Agent-connection writes are never the person's own edits, even when
        // an outside agent writes outside a Cauldron-started run.
        runId: fromAgent ? (state.agentRunId ?? 'agent-connection') : undefined,
      });
    refreshSelectionFromDisk();
  }
  return result;
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
 * Content saves follow the same outside-change rule as the editor (plan 1.4).
 * `keepMine` re-applies the person's change on top of the current file after
 * keeping the disk version as a copy; otherwise a stale save is refused.
 */
function saveContent(payload: {
  file: string;
  baseHash: string;
  change: Record<string, string>;
  keepMine?: boolean;
}): {
  ok: boolean;
  problem?: string;
  hash?: string;
  conflict?: boolean;
  conflictCopy?: string;
} {
  const site = state.site;
  if (!site) return { ok: false, problem: 'No site is open.' };
  if (!payload.keepMine) {
    const result = saveEntry(
      site.root,
      payload.file,
      payload.baseHash,
      payload.change,
    );
    if (result.ok) status(`Saved ${payload.file}`);
    return result;
  }
  const full = path.join(site.root, payload.file);
  if (!isInside(site.root, full) || !fs.existsSync(full))
    return { ok: false, problem: 'That entry is not inside the open site.' };
  const disk = readFile(full);
  const conflictCopy = saveConflictCopy(full, disk.text);
  const result = saveEntry(site.root, payload.file, disk.hash, payload.change);
  if (result.ok)
    status(
      `Saved ${payload.file}. The disk version was kept as a copy: ${conflictCopy}`,
    );
  else fail(result.problem ?? `${payload.file} could not be saved.`);
  return { ...result, conflictCopy };
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

  const expected = { text: selection.snapshot.text, attributes };
  const common = {
    target: selection.location,
    baseHash: hashOf(selection.snapshot.sourceText),
    expected,
  };
  const action: ActionRequest =
    operation.kind === 'text'
      ? { ...common, action: 'editElementText', value: operation.value }
      : operation.kind === 'attribute'
        ? {
            ...common,
            action: 'editElementAttribute',
            name: operation.name,
            value: operation.value,
          }
        : {
            ...common,
            action: 'editElementStyle',
            properties: operation.properties,
          };
  const outcome = runAction(site.root, action);
  const result = outcome.ok
    ? {
        ok: true as const,
        text: outcome.text as string,
        hash: outcome.hash as string,
        snapshot: snapshotElement(outcome.text as string, selection.location)!,
      }
    : {
        ok: false as const,
        reason: outcome.problem,
        conflict: outcome.clash
          ? { diskText: outcome.clash.diskText ?? disk.text }
          : undefined,
      };

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

  const hash = readFile(selection.location.file).hash;
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
  const direction = directionFor(site.root);
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
  lastAgentEvents = [];
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
    mcp: state.mcp ?? undefined,
    onEvent: (event) => {
      if (state.agentRunId !== run.id) return;
      lastAgentEvents.push(event);
      if (event.type === 'tool' && event.paths) {
        for (const file of event.paths)
          claimForRun(run.id, path.resolve(site.root, file));
      }
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

/** Editing IPC is accepted only from the app's main frame, never the site preview. */
function handle(
  channel: string,
  listener: Parameters<typeof ipcMain.handle>[1],
): void {
  ipcMain.handle(channel, (event, ...args) => {
    const editor = state.window?.webContents;
    if (
      !editor ||
      event.sender !== editor ||
      event.senderFrame !== editor.mainFrame
    )
      throw new Error('The website preview has no editing powers.');
    return listener(event, ...args);
  });
}

function registerIpc(): void {
  handle('cauldron:open-site-dialog', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory'],
      title: 'Open an Astro site',
    });
    if (result.canceled || result.filePaths.length === 0)
      return { cancelled: true };
    return openSiteAt(result.filePaths[0]);
  });

  handle('cauldron:open-site', async (_event, root: string) =>
    openSiteAt(root),
  );

  handle('cauldron:site-state', () => ({
    site: state.site,
    running: Boolean(state.server),
    url: state.server?.url ?? null,
    status: state.status,
    selection: selectionView(),
    drafts: state.site ? storedDrafts(state.site.root) : [],
  }));

  handle('cauldron:start-preview', () => startPreview());
  handle('cauldron:stop-preview', async () => {
    await stopPreview();
    return true;
  });

  handle('cauldron:refresh-selection', () => {
    refreshSelectionFromDisk();
    return selectionView();
  });

  handle('cauldron:selection-clear', () => {
    state.selection = null;
    pushSelection();
    return true;
  });

  handle('cauldron:apply-text', (_event, value: string) =>
    writeSelection({ kind: 'text', value }),
  );

  handle(
    'cauldron:apply-attribute',
    (_event, name: string, value: string | null) =>
      writeSelection({ kind: 'attribute', name, value }),
  );

  handle('cauldron:apply-style', (_event, properties: Record<string, string>) =>
    writeSelection({ kind: 'style', properties }),
  );

  handle('cauldron:force-write', (_event, operation: EditOperation) =>
    writeSelection(operation, { force: true }),
  );

  handle('cauldron:undo', () => undoLast());
  handle('cauldron:redo', () => redoLast());

  handle('cauldron:save-drafts', (_event, drafts: Draft[]) => {
    if (!state.site) return false;
    const content = storedDrafts(state.site.root).filter(
      (draft) => draft.name === 'content',
    );
    saveDrafts(state.site.root, [...content, ...drafts]);
    return true;
  });

  handle(
    'cauldron:content-draft',
    (
      _event,
      payload: {
        file: string;
        field: string;
        value: string | null;
        baseHash: string;
        schemaHash: string;
      },
    ) => {
      if (!state.site) return false;
      const key = `content:${payload.file}:${payload.field}`;
      const drafts = storedDrafts(state.site.root).filter(
        (draft) => draft.key !== key,
      );
      if (payload.value !== null)
        drafts.push({
          key,
          file: payload.file,
          field: `content:${payload.field}`,
          value: payload.value,
          baseHash: payload.baseHash,
          schemaHash: payload.schemaHash,
          name: 'content',
          line: 1,
          column: 1,
          savedAt: Date.now(),
        });
      saveDrafts(state.site.root, drafts);
      send('cauldron:drafts', { drafts });
      return true;
    },
  );

  handle('cauldron:discard-drafts', () => {
    if (!state.site) return false;
    clearDrafts(state.site.root);
    send('cauldron:drafts', { drafts: [] });
    return true;
  });

  handle('cauldron:new-page', (_event, page: { path: string; title: string }) =>
    createPage(page),
  );

  handle('cauldron:restore-draft', (_event, draft: Draft) => {
    const result = restoreDraft(draft);
    // Shown in the status bar, so a refusal cannot hide behind a missing
    // selection, a collapsed inspector or another tool view.
    if (result.ok) status('Draft restored.');
    else fail(result.problem ?? 'That draft could not be restored.');
    return result;
  });

  handle(
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

  handle('cauldron:run-finish', async (_event, id: string) => {
    const site = requireSite();
    if ('problem' in site) return site;
    // A comparison needs a page. Without one the run is still finished, but the
    // outcome is uncertainty and must be said out loud (plan 2.2).
    const comparable = Boolean(state.server) && state.preview.alive;
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
    const run = state.runs.finish(site.root, id, {
      outside: outsideWrites(runStartedAt(id)),
    });
    if (!run) return { ok: false, problem: 'That run is not known.' };
    state.runs.setHighlighted(id, [...changed, ...removed]);
    state.preview.reload();
    status(run.note);
    if (!comparable)
      fail(
        'The page could not be compared: the preview was not running, so this run was not compared.',
      );
    if (run.problems.length > 0)
      console.error(
        `Run ${run.id}: ${run.problems.join(', ')} could not be read. ${run.note}`,
      );
    return { ok: true, run: runSummary(run) };
  });

  handle('cauldron:run-undo', (_event, id: string) => {
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

  handle('cauldron:runs', () => state.runs.list().map(runSummary));

  handle('cauldron:action-catalogue', () => actionCatalogue());

  handle('cauldron:collections', () => {
    const site = requireSite();
    if ('problem' in site) return { collections: [] };
    return { collections: readCollections(site.root) };
  });

  handle('cauldron:entry', (_event, file: string) => {
    const site = requireSite();
    if ('problem' in site) return site;
    return readEntry(site.root, file);
  });

  handle(
    'cauldron:save-entry',
    (
      _event,
      payload: {
        file: string;
        baseHash: string;
        change: Record<string, string>;
        keepMine?: boolean;
      },
    ) => {
      const site = requireSite();
      if ('problem' in site) return site;
      return saveContent(payload);
    },
  );

  handle('cauldron:repo-state', () => {
    const site = requireSite();
    if ('problem' in site) return { isRepo: false, changes: [] };
    return repoState(site.root);
  });

  handle(
    'cauldron:publish',
    (
      _event,
      payload: { message: string; push: boolean; unsavedBuffers?: number },
    ) => {
      const site = requireSite();
      if ('problem' in site) return site;
      const result = publish(site.root, payload);
      if (result.ok) {
        status(result.message);
      } else {
        status(result.problem);
      }
      return result;
    },
  );

  handle('cauldron:mac-build', () =>
    macBuildInfo(
      app.isPackaged ? path.dirname(app.getAppPath()) : process.cwd(),
    ),
  );

  handle(
    'cauldron:quality-run',
    async (_event, payload: { pages?: string[] }) => {
      const site = requireSite();
      if ('problem' in site) return site;
      const direction = directionFor(site.root);
      const pages =
        payload?.pages && payload.pages.length > 0
          ? payload.pages
          : listPages(site.root)
              .map((item) => item.page)
              .filter((page) => !page.includes('['));
      const report = await checkSite({
        root: site.root,
        direction,
        pages,
        onProgress: (message) => status(message),
      });
      const failed = report.findings.filter(
        (finding) => finding.status === 'fail',
      ).length;
      status(
        report.built
          ? `Quality: ${failed} thing${failed === 1 ? '' : 's'} to fix.`
          : 'The site does not build, so nothing could be checked.',
      );
      return report;
    },
  );

  handle('cauldron:library', () => ({
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

  handle(
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

  handle('cauldron:mcp-info', () =>
    state.mcp ? { url: state.mcp.url, code: state.mcp.code } : null,
  );

  handle('cauldron:directions', () =>
    DIRECTIONS.map((direction) => ({
      id: direction.id,
      name: direction.name,
      forWhom: direction.forWhom,
      learnedFrom: direction.learnedFrom,
      colours: direction.colours,
      typeScale: direction.typeScale,
      spacing: direction.spacing,
      radii: direction.radii,
      fonts: {
        display: direction.fonts.display.family,
        body: direction.fonts.body.family,
      },
      character: direction.character,
      watch: direction.watch,
    })),
  );

  handle('cauldron:direction', () => {
    const direction = state.site ? directionFor(state.site.root) : null;
    return direction
      ? {
          ...direction,
          fonts: {
            display: direction.fonts.display.family,
            body: direction.fonts.body.family,
          },
        }
      : null;
  });

  handle('cauldron:reference-direction', async (_event, url: string) => {
    const site = requireSite();
    if ('problem' in site) return { ok: false, problem: site.problem };
    try {
      const direction = await directionFromUrl(url);
      if (state.site?.root !== site.root)
        return {
          ok: false,
          problem: 'The open site changed. Nothing was saved.',
        };
      const result = writeDirection(site.root, direction);
      return result.ok
        ? {
            ok: true,
            direction: {
              ...direction,
              fonts: {
                display: direction.fonts.display.family,
                body: direction.fonts.body.family,
              },
            },
          }
        : result;
    } catch (error) {
      console.error('Reference direction failed:', error);
      return { ok: false, problem: (error as Error).message };
    }
  });

  handle('cauldron:set-direction', (_event, id: string) => {
    const result = setDirectionTo(id);
    if ('ok' in result && result.ok) {
      status(
        `${findDirection(id)?.name ?? 'That direction'} is now this site's design direction.`,
      );
    }
    return result;
  });

  handle(
    'cauldron:agent-send',
    (_event, payload: { tool: AgentTool; request: string }) =>
      sendAgent(payload),
  );

  handle('cauldron:agent-cancel', () => {
    state.agent?.cancel();
    send('cauldron:agent-event', { type: 'status', text: 'Cancelling…' });
    return true;
  });

  handle('cauldron:highlight', (_event, id: string, on: boolean) => {
    const run = state.runs.get(id);
    if (!run) return false;
    highlightLocs(
      run.highlighted.map((item) => item.loc),
      on,
    );
    return true;
  });

  handle('cauldron:run-action', (_event, request: unknown) => {
    const site = requireSite();
    if ('problem' in site) return site;
    return sharedAction(request as ActionRequest);
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
  const title = escapeText(page.title.trim() || clean);
  fs.writeFileSync(
    file,
    `---\n---\n<!doctype html>\n<html lang="en-AU">\n  <head>\n    <meta charset="utf-8" />\n    <meta name="viewport" content="width=device-width, initial-scale=1" />\n    <title>${title}</title>\n  </head>\n  <body>\n    <h1>${title}</h1>\n  </body>\n</html>\n`,
    'utf8',
  );
  const url = new URL(`/${clean}/`, state.server?.url ?? 'http://127.0.0.1/')
    .href;
  // Astro 6's route watcher is asynchronous. Wait for the new route, then
  // navigate once; loading its temporary 404 does not subscribe to HMR.
  let ready = false;
  for (let attempt = 0; attempt < 50; attempt++) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        ready = true;
        break;
      }
    } catch {
      /* The dev server may still be updating its route table. */
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  if (!ready)
    return {
      ok: false,
      problem:
        'The page was created, but Astro has not made its preview ready yet.',
    };
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
  if (!draft.baseHash || disk.hash !== draft.baseHash) {
    return {
      ok: false,
      problem:
        'The draft is kept, but its original file version no longer matches. Nothing was overwritten.',
    };
  }
  if (draft.name === 'content') {
    const result = saveEntry(
      site.root,
      draft.file,
      draft.baseHash,
      draft.field === 'content:text'
        ? { text: draft.value }
        : {
            field: draft.field.replace(/^content:/, ''),
            value: draft.value,
            schemaHash: draft.schemaHash,
          },
    );
    if (result.ok) {
      const remaining = storedDrafts(site.root).filter(
        (item) => item.key !== draft.key,
      );
      saveDrafts(site.root, remaining);
      send('cauldron:drafts', { drafts: remaining });
    }
    return result;
  }
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
  const operation = draftEditOperation(draft.field, draft.value);
  if (!operation)
    return {
      ok: false,
      problem:
        'That draft cannot be restored in this version of Cauldron. The draft is kept.',
    };
  state.selection = {
    id: `draft-${draft.key}`,
    location,
    snapshot,
    pageUrl: '',
    domPath: '',
  };
  const result = writeSelection(operation);
  if (!result.ok) return { ok: false, problem: result.problem };
  const remaining = storedDrafts(site.root).filter(
    (item) => item.key !== draft.key,
  );
  saveDrafts(site.root, remaining);
  send('cauldron:drafts', { drafts: remaining });
  return { ok: true };
}

function registerPreviewIpc(): void {
  handle('cauldron:preview-bounds', (_event, bounds) => {
    state.preview.setBounds(bounds);
    return true;
  });

  handle('cauldron:preview-reload', () => {
    state.preview.reload();
    return true;
  });

  handle('cauldron:pick-mode', (_event, on: boolean) => {
    state.preview.webContents?.send('preview:mode', on);
    return true;
  });

  ipcMain.on(
    'preview:report',
    (event, report: { kind: string; payload: unknown }) => {
      if (
        event.sender !== state.preview.webContents ||
        event.senderFrame !== event.sender.mainFrame
      )
        return;
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

let lastAgentEvents: Array<{ type: string; text?: string; name?: string }> = [];
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
  const run = state.runs.finish(site.root, id, {
    outside: outsideWrites(runStartedAt(id)),
    claimed: [...(runClaims.get(id) ?? [])],
  });
  runClaims.delete(id);
  if (!run) return;
  state.runs.setHighlighted(id, [...changed, ...removed]);
  if (note) state.runs.fail(id, note);
  state.preview.reload();
  status(run.note);
  if (run.problems.length > 0)
    console.error(
      `Run ${run.id}: ${run.problems.join(', ')} could not be read. ${run.note}`,
    );
  send('cauldron:agent-done', { runId: id, note: run.note });
  agentDoneWaiter?.({ ok: !note, runId: id, note: run.note });
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

  window.webContents.on('will-navigate', (event) => event.preventDefault());
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
    state.agent?.cancel();
    state.window = null;
    // The view goes with the window; tear it down once, safely.
    state.preview.destroy();
    void stopPreview();
  });

  return window;
}

function harnessApi() {
  return {
    mcpInfo: async () =>
      state.mcp ? { url: state.mcp.url, code: state.mcp.code } : null,
    addPiece: (payload: {
      pieceId: string;
      page: string;
      mode: 'add' | 'replace';
      replaceSelector?: string;
    }) => {
      if (!state.site) return { ok: false, problem: 'No site.' };
      const run = state.runs.start(
        state.site.root,
        'library',
        `Add ${payload.pieceId}`,
      );
      const result = addPiece(state.site.root, payload);
      state.runs.finish(state.site.root, run.id);
      return result;
    },
    collections: () => (state.site ? readCollections(state.site.root) : []),
    runs: () => state.runs.list(),
    repoState: () =>
      state.site ? repoState(state.site.root) : { isRepo: false, changes: [] },
    publish: (payload: { message: string; push: boolean }) =>
      state.site
        ? publish(state.site.root, payload)
        : { ok: false, problem: 'No site.' },
    qualityRun: async (payload: { pages?: string[] }) => {
      if (!state.site)
        return {
          built: false,
          findings: [],
          measured: [],
          buildLog: '',
          builtAt: '',
        };
      return checkSite({
        root: state.site.root,
        direction: directionFor(state.site.root),
        pages: payload?.pages ?? ['/'],
      });
    },
    entry: (file: string) =>
      state.site ? readEntry(state.site.root, file) : { problem: 'No site.' },
    saveEntry: (payload: {
      file: string;
      baseHash: string;
      change: Record<string, string>;
      keepMine?: boolean;
    }) =>
      state.site ? saveContent(payload) : { ok: false, problem: 'No site.' },
    openSiteAt,
    startPreview,
    previewLoad: (url: string) => state.preview.load(url),
    previewBridgeAbsent: () =>
      state.preview.webContents?.executeJavaScript(
        'typeof window.cauldron === "undefined" && typeof window.require === "undefined" && typeof window.process === "undefined"',
      ),
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
                const els = [...document.querySelectorAll('[data-cauldron-source-loc], [data-astro-source-loc]')].filter((el) =>
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
    forceWrite: (operation: unknown) =>
      writeSelection(operation as EditOperation, { force: true }),
    undo: () => undoLast(),
    createPage: (page: { path: string; title: string }) => createPage(page),
    runAction: (request: unknown) =>
      state.site
        ? sharedAction(request as ActionRequest)
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
      const run = state.runs.finish(state.site.root, id, {
        outside: outsideWrites(runStartedAt(id)),
      });
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
    setDirection: (id: string) => setDirectionTo(id),
    sendAgent: (payload: { tool: AgentTool; request: string }) =>
      sendAgent(payload),
    waitForAgent: (timeout: number) => waitForAgentDone(timeout),
    settleRenderer: async () => {
      const contents = state.window?.webContents;
      if (!contents || contents.isDestroyed()) return;
      await contents.executeJavaScript(
        `new Promise(resolve => setTimeout(resolve, 0)).then(() => window.cauldron.runs())`,
      );
    },
    agentReply: () =>
      lastAgentEvents
        .filter((event) => event.type === 'text')
        .map((event) => event.text ?? '')
        .join('\n'),
    agentTools: () =>
      lastAgentEvents
        .filter((event) => event.type === 'tool')
        .map((event) => event.name ?? ''),
    buildPromptText: (request: string) => {
      const site = state.site;
      const direction = site ? directionFor(site.root) : null;
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
        const rendered = (await state.window!.webContents.executeJavaScript(
          "({ hasApp: Boolean(document.querySelector('#root .app')), hasRail: Boolean(document.querySelector('.rail')), text: (document.querySelector('#root')?.textContent ?? '').trim().length })",
        )) as { hasApp: boolean; hasRail: boolean; text: number };
        clearTimeout(fail);
        const shot = process.env.CAULDRON_SHOT;
        if (shot) {
          await new Promise((resolve) => setTimeout(resolve, 600));
          const image = await state.window!.webContents.capturePage();
          fs.writeFileSync(shot, image.toPNG());
          console.log(`SMOKE SHOT: ${shot}`);
        }
        if (rendered.hasApp && rendered.hasRail && rendered.text > 0) {
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

    if (E2E_SITE && process.env.CAULDRON_TASTE_TEST) {
      const { runTasteTest } = await import('./e2e');
      await runTasteTest();
      return;
    }

    if (E2E_SITE && process.env.CAULDRON_UI_TEST) {
      const { runUiTest } = await import('./e2e');
      await runUiTest(E2E_SITE, state.window!, state.preview, openSiteAt);
      return;
    }

    if (E2E_SITE && process.env.CAULDRON_PUBLISH_TEST) {
      const { runPublishTest } = await import('./e2e');
      await runPublishTest(E2E_SITE, harnessApi() as never);
      return;
    }

    if (E2E_SITE && process.env.CAULDRON_PUBLISH_UI_TEST) {
      const { runPublishUiTest } = await import('./e2e');
      await runPublishUiTest(
        E2E_SITE,
        state.window!,
        harnessApi() as never,
        openSiteAt,
      );
      return;
    }

    if (E2E_SITE && process.env.CAULDRON_QUALITY_TEST) {
      const { runQualityTest } = await import('./e2e');
      await runQualityTest(E2E_SITE, harnessApi() as never);
      return;
    }

    if (E2E_SITE && process.env.CAULDRON_LIBRARY_TEST) {
      const { runLibraryTest } = await import('./e2e');
      await runLibraryTest(E2E_SITE, harnessApi() as never);
      return;
    }

    if (E2E_SITE && process.env.CAULDRON_CONTENT_TEST) {
      const { runContentTest } = await import('./e2e');
      await runContentTest(E2E_SITE, harnessApi() as never);
      return;
    }

    if (E2E_SITE && process.env.CAULDRON_AGENT_TEST) {
      const { runAgentTest } = await import('./e2e');
      await runAgentTest(E2E_SITE, harnessApi() as never);
      return;
    }

    if (E2E_SITE && process.env.CAULDRON_FAILURE_TEST) {
      const { runFailureTest } = await import('./e2e');
      await runFailureTest(
        E2E_SITE,
        state.window!,
        harnessApi() as never,
        openSiteAt,
        process.env.CAULDRON_FAILURE_CONTENT_SITE,
      );
      return;
    }

    if (E2E_SITE && process.env.CAULDRON_CRASH_TEST) {
      const { runCrashTest } = await import('./e2e');
      await runCrashTest(
        E2E_SITE,
        state.window!,
        harnessApi() as never,
        openSiteAt,
        process.env.CAULDRON_CRASH_TEST === 'restore' ? 'restore' : 'type',
      );
      return;
    }

    if (E2E_SITE) {
      const { runEndToEnd } = await import('./e2e');
      await runEndToEnd(E2E_SITE, harnessApi() as never);
      return;
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
