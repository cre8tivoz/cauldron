import { BrowserWindow, Menu, app, dialog, ipcMain, shell } from 'electron';
import path from 'node:path';
import fs from 'node:fs';
import { buildMenu } from '../app-menu';
import { detectSite, startDevServer, type DevServer, type Site } from './site';
import { Preview } from './preview';
import { History } from './history';
import { Runs, type Run } from './runs';
import {
  compareSnapshots,
  highlightsFor,
  type HighlightedPart,
  type PageElement,
} from './compare';

import {
  runAction,
  listPages,
  actionCatalogue,
  type ActionRequest,
} from './actions';
import {
  runAgent,
  buildPrompt,
  writeHermesConnection,
  hermesPickupWaitMs,
  type AgentTool,
  type AgentHandle,
} from './agent';
import {
  DIRECTIONS,
  findDirection,
  readDirection,
  writeDirection,
  type DesignDirection,
} from './directions';
import { startMcpServer, mcpCalls, type McpHandle } from './mcp';
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
// repeated harness runs never share recovery, conflict or run records. The
// variable is only ever set by a test run.
if (process.env.CAULDRON_TEST_USER_DATA)
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
  beforeLocs: PageElement[];
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

/**
 * The renderer gets font families as plain strings. Nothing from a saved
 * design file, a measured reference or a future plugin can reach the renderer
 * as markup through this shape.
 */
function rendererDirection(direction: DesignDirection) {
  return {
    ...direction,
    fonts: {
      display: direction.fonts.display.family,
      body: direction.fonts.body.family,
      ...(direction.fonts.detail
        ? { detail: direction.fonts.detail.family }
        : {}),
    },
  };
}

function relativeFile(file: string): string {
  if (!state.site) return file;
  return path.relative(state.site.root, file) || file;
}

/**
 * The files the last finished agent run wrote, as text, so the quality checks
 * can judge the agent's output rather than the whole site (ticket 24). Binary
 * files carry no style to judge and are left out.
 */
function lastRunChanges(): Array<{
  file: string;
  before: string | null;
  after: string | null;
}> {
  const run: Run | undefined = state.runs
    .list()
    .find(
      (item) =>
        item.status === 'finished' &&
        item.files.some((file) => file.ownership === 'run'),
    );
  if (!run) return [];
  const text = (value: Buffer | null) =>
    value ? value.toString('utf8') : null;
  return run.files
    .filter(
      (file) =>
        file.ownership === 'run' &&
        !/\.(png|jpe?g|gif|webp|avif|ico|pdf|zip|woff2?|ttf|otf|mp4|webm|mp3)$/i.test(
          file.file,
        ),
    )
    .map((file) => ({
      file: file.file,
      before: text(file.before),
      after: text(file.after),
    }));
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
      record: (call) => mcpToolCalls.push(call),
    });
    status(`Outside agents can connect on ${state.mcp.url}`);
    // Ticket 20: give Hermes this site's connection now, so its gateway has
    // picked it up well before anyone asks Hermes to work.
    try {
      writeHermesConnection(state.mcp.url, state.mcp.code);
    } catch (error) {
      console.error('The Hermes connection could not be written:', error);
    }
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
  // The design setting is read again here for the same reason: anything that
  // read it during start-up reported into a status line "Preview running" has
  // since replaced. Both problems are shown together so neither hides the other.
  const problems = [
    recovery.problem,
    readDirection(detected.root).problem,
  ].filter(Boolean);
  if (problems.length > 0) fail(problems.join(' '));
  return 'problem' in preview
    ? { site: detected, ...preview }
    : { site: detected };
}

/**
 * Every element on the page with the parts a run can change: its own text, its
 * attributes, its class and its inline style, keyed by file and source location.
 * A failure is reported, never returned as an empty page: an empty snapshot
 * would look like every element was removed.
 */
function collectLocs(): Promise<{
  elements: PageElement[];
  problem: string | null;
}> {
  const view = state.preview.webContents;
  if (!view)
    return Promise.resolve({
      elements: [],
      problem: 'the preview was not running',
    });
  return view
    .executeJavaScript(
      `(() => [...document.querySelectorAll('[data-cauldron-source-loc], [data-astro-source-loc]')].map((el) => {
        const attributes = [...el.attributes]
          .filter((attr) => !/^data-(cauldron|astro)-source-(file|loc)$/.test(attr.name))
          .map((attr) => attr.name + '=' + attr.value)
          .sort();
        return {
          file: el.getAttribute('data-cauldron-source-file') || el.getAttribute('data-astro-source-file') || '',
          loc: el.getAttribute('data-cauldron-source-loc') || el.getAttribute('data-astro-source-loc') || '',
          tag: el.tagName.toLowerCase(),
          text: [...el.childNodes].filter((node) => node.nodeType === 3).map((node) => node.textContent || '').join('').trim().slice(0, 160),
          attributes: attributes.join('|'),
          class: el.getAttribute('class') || '',
          style: el.getAttribute('style') || '',
        };
      }).filter((item) => item.file !== '' && item.loc !== ''))()`,
    )
    .then((elements: PageElement[]) => ({ elements, problem: null }))
    .catch((error: unknown) => {
      const problem = error instanceof Error ? error.message : String(error);
      fail(`The page could not be compared: ${problem}`);
      return { elements: [], problem };
    });
}

/** The page must show the files the run wrote before it can be compared to them. */
async function reloadPreview(): Promise<void> {
  const contents = state.preview.webContents;
  if (!contents) return;
  const loaded = new Promise<void>((resolve) => {
    const done = (): void => {
      clearTimeout(timer);
      resolve();
    };
    const timer = setTimeout(done, 15000);
    contents.once('did-finish-load', done);
  });
  state.preview.reload();
  await loaded;
}

/** A run's own comparison: only the files the run changed, never the person's. */
function comparisonFor(run: Run, after: PageElement[]): HighlightedPart[] {
  const comparison = compareSnapshots(
    state.beforeLocs,
    after,
    run.files.map((file) => file.file),
  );
  return highlightsFor(comparison);
}

/** The Before/After toggle: outlines the parts of the page the run changed. */
function highlightLocs(
  parts: Array<{ file: string; loc: string }>,
  on: boolean,
): void {
  const view = state.preview.webContents;
  if (!view) return;
  const selectors = parts
    .filter((part) => part.loc !== '')
    .flatMap((part) => {
      const byLoc = [
        `[data-cauldron-source-loc=${JSON.stringify(part.loc)}]`,
        `[data-astro-source-loc=${JSON.stringify(part.loc)}]`,
      ];
      if (part.file === '') return byLoc;
      return [
        `[data-cauldron-source-file=${JSON.stringify(part.file)}][data-cauldron-source-loc=${JSON.stringify(part.loc)}]`,
        `[data-astro-source-file=${JSON.stringify(part.file)}][data-astro-source-loc=${JSON.stringify(part.loc)}]`,
      ];
    });
  const css = on
    ? `${[...new Set(selectors)].join(',')}{outline:2px solid #ffa99a !important;outline-offset:2px !important}`
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
  if (result.ok && fromAgent && full && request.action !== 'readSource')
    claimForRun(state.agentRunId, full);
  if (result.ok && full) {
    const exists = fs.existsSync(full);
    if (before && exists) {
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
          runId: fromAgent
            ? (state.agentRunId ?? 'agent-connection')
            : undefined,
        });
    } else if (!before && exists) {
      // A newly created source file: undo must remove it, not write it empty.
      const after = readFile(full);
      state.history.record({
        file: full,
        location: { file: full, line: 1, column: 1, name: 'source' },
        operation: { kind: 'text', value: '' },
        before: '',
        after: after.text,
        beforeHash: '',
        afterHash: after.hash,
        label: request.action,
        created: true,
        root: site.root,
        runId: fromAgent ? (state.agentRunId ?? 'agent-connection') : undefined,
      });
    }
    if (before || exists) refreshSelectionFromDisk();
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

/** The selected element as the brief describes it (sendAgent and the harness agree). */
function promptSelection() {
  return state.selection
    ? {
        file: relativeFile(state.selection.location.file),
        line: state.selection.location.line,
        column: state.selection.location.column,
        name: state.selection.location.name,
        text: state.selection.snapshot.text,
      }
    : null;
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

  const selection = promptSelection();

  const prompt = buildPrompt({
    request: payload.request,
    tool: payload.tool,
    siteName: site.name,
    direction,
    selection,
    catalogue: actionCatalogue(),
  });

  state.beforeLocs = [];
  lastAgentEvents = [];
  lastAgentPrompt = prompt;
  const run = state.runs.start(site.root, payload.tool, payload.request);
  state.agentRunId = run.id;
  void collectLocs().then((locs) => {
    state.beforeLocs = locs.elements;
  });

  const sessions = state.sessions.get(site.root) ?? {};
  send('cauldron:agent-event', {
    type: 'status',
    text: `Starting ${payload.tool}…`,
  });

  const onEvent = (
    event: Parameters<Parameters<typeof runAgent>[0]['onEvent']>[0],
  ) => {
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
  };
  const start = () =>
    runAgent({
      tool: payload.tool,
      root: site.root,
      prompt,
      sessionId: sessions[payload.tool],
      mcp: state.mcp ?? undefined,
      onEvent,
    });

  // Ticket 20: Hermes's gateway picks up a changed connection on a timer, so
  // a job sent just after the site opened waits for it instead of starting
  // without Cauldron's actions.
  if (state.mcp) {
    try {
      if (payload.tool === 'hermes')
        writeHermesConnection(state.mcp.url, state.mcp.code);
    } catch (error) {
      console.error('The Hermes connection could not be written:', error);
    }
  }
  const wait =
    payload.tool === 'hermes' && state.mcp ? hermesPickupWaitMs() : 0;
  if (wait > 0) {
    onEvent({
      type: 'status',
      text: `Waiting for Hermes to connect to this site (up to ${Math.ceil(wait / 1000)} s)…`,
    });
    const timer = setTimeout(() => {
      if (state.agentRunId === run.id) state.agent = start();
    }, wait);
    state.agent = {
      cancel: () => {
        clearTimeout(timer);
        onEvent({ type: 'error', text: 'Cancelled.' });
      },
    };
  } else {
    state.agent = start();
  }

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
        state.beforeLocs = locs.elements;
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
    if (comparable) await reloadPreview();
    const after = await collectLocs();
    const run = state.runs.finish(site.root, id, {
      outside: outsideWrites(runStartedAt(id)),
    });
    if (!run) return { ok: false, problem: 'That run is not known.' };
    state.runs.setHighlighted(
      id,
      after.problem ? [] : comparisonFor(run, after.elements),
    );
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
        changed: lastRunChanges(),
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

  handle('cauldron:directions', () => DIRECTIONS.map(rendererDirection));

  handle('cauldron:direction', () => {
    const direction = state.site ? directionFor(state.site.root) : null;
    return direction ? rendererDirection(direction) : null;
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
            direction: rendererDirection(direction),
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
    highlightLocs(run.highlighted, on);
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

let lastAgentEvents: Array<{
  type: string;
  text?: string;
  name?: string;
  paths?: string[];
}> = [];
/** Every tool call an outside agent made, in order (ticket 18 evidence). */
const mcpToolCalls: Array<{ name: string; args: Record<string, unknown> }> = [];
let lastAgentPrompt = '';
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

  await reloadPreview();
  const after = await collectLocs();
  const run = state.runs.finish(site.root, id, {
    outside: outsideWrites(runStartedAt(id)),
    claimed: [...(runClaims.get(id) ?? [])],
  });
  runClaims.delete(id);
  if (!run) return;
  state.runs.setHighlighted(
    id,
    after.problem ? [] : comparisonFor(run, after.elements),
  );
  if (note) state.runs.fail(id, note);
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
  let disk: { text: string; hash: string };
  try {
    disk = readFile(selection.location.file);
  } catch {
    // Undoing a created file removes it; a selection pointing at it must clear
    // rather than fail.
    state.selection = null;
    pushSelection();
    return;
  }
  const snapshot = snapshotElement(disk.text, selection.location);
  if (snapshot) selection.snapshot = snapshot;
  pushSelection();
}

/**
 * The supplied Witch Daddy Labs artwork, shipped beside the app at package
 * time (forge.config.mts `extraResource`). It is the crop's own 1280×800
 * canvas, so the startup window keeps its aspect ratio exactly.
 */
function splashImagePath(): string {
  return app.isPackaged
    ? path.join(process.resourcesPath, 'splash.png')
    : path.join(app.getAppPath(), 'build', 'splash.png');
}

type Splash = { window: BrowserWindow; shown: Promise<void> };

/** Shows the branded startup window; the main window retires it when ready. */
function showSplash(): Splash | null {
  // CAULDRON_SPLASH_PROOF lets the hidden smoke run exercise and photograph
  // this path without taking the screen (used by the packaging proof).
  const proof = process.env.CAULDRON_SPLASH_PROOF ?? '';
  if ((SMOKE || E2E_SITE) && !proof) return null;
  let image = '';
  try {
    image = fs.readFileSync(splashImagePath()).toString('base64');
  } catch (error) {
    // A missing picture must not stop the app; the main window still opens.
    console.error('The Cauldron startup artwork could not be read:', error);
    return null;
  }
  const splash = new BrowserWindow({
    width: 640,
    height: 400,
    show: false,
    frame: false,
    resizable: false,
    movable: false,
    title: 'Cauldron',
    backgroundColor: '#ffffff',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });
  const html = `<!doctype html><html><head><meta charset="utf-8">
<style>html,body{margin:0;height:100%;background:#fff;overflow:hidden}img{display:block;width:100%;height:100%;object-fit:contain}</style>
</head><body><img src="data:image/png;base64,${image}" alt="Cauldron by Witch Daddy Labs"></body></html>`;
  void splash.loadURL(
    `data:text/html;base64,${Buffer.from(html, 'utf8').toString('base64')}`,
  );
  console.log('STARTUP splash created');
  let markShown = () => {};
  const shown = new Promise<void>((resolve) => (markShown = resolve));
  splash.once('ready-to-show', () => {
    if (splash.isDestroyed()) return markShown();
    if (proof) {
      // Hidden runs keep the picture for evidence instead of foregrounding.
      void splash.webContents
        .capturePage()
        .then((shot) => {
          fs.writeFileSync(path.join(proof, 'splash.png'), shot.toPNG());
          console.log('STARTUP splash captured');
        })
        .catch((error) => {
          console.error('STARTUP splash capture failed:', error);
        })
        .finally(markShown);
      return;
    }
    splash.show();
    markShown();
  });
  splash.once('closed', () => {
    console.log('STARTUP splash closed');
    markShown();
  });
  splash.webContents.once('did-fail-load', markShown);
  return { window: splash, shown };
}

function createWindow(splash: Splash | null = null): BrowserWindow {
  const window = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1280,
    minHeight: 800,
    // The branded startup window is shown until this one has rendered. Test
    // runs stay hidden; they never take the screen.
    show: false,
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

  // Show the app only once its own interface is ready, then retire the splash.
  // No timer: the transition is driven by the renderer's ready-to-show event.
  let revealed = false;
  const reveal = async () => {
    if (revealed) return;
    revealed = true;
    console.log('STARTUP main ready');
    // Wait for the splash's first paint, not a timer, so a fast renderer can
    // never close the branded window before anyone sees it.
    if (splash) await splash.shown;
    if (splash && !splash.window.isDestroyed()) splash.window.close();
    if (!SMOKE && !E2E_SITE && !window.isDestroyed()) window.show();
  };
  window.once('ready-to-show', reveal);
  window.webContents.once('did-fail-load', () => {
    if (splash && !splash.window.isDestroyed()) splash.window.close();
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
    // Ticket 17 reads the same history the person's Undo uses.
    history: () =>
      state.history.list().map((change) => ({
        file: path.relative(state.site?.root ?? '', change.file),
        label: change.label,
        runId: change.runId,
        afterHash: change.afterHash,
        created: change.created ?? false,
      })),
    // Ticket 17: a real agent run sets state.agentRunId in sendAgent; the
    // harness needs the same tagging without launching a provider.
    tagAgentRun: (id: string | null) => {
      state.agentRunId = id;
    },
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
      return { ...result, runId: run.id };
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
        changed: lastRunChanges(),
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
        state.beforeLocs = locs.elements;
      });
      return { ok: true, run: { id: run.id } };
    },
    beforeLocsCount: () => state.beforeLocs.length,
    previewEval: (script: string) =>
      state.preview.webContents?.executeJavaScript(script) as Promise<unknown>,
    finishRun: async (id: string) => {
      if (!state.site) return { ok: false };
      await reloadPreview();
      const after = await collectLocs();
      const run = state.runs.finish(state.site.root, id, {
        outside: outsideWrites(runStartedAt(id)),
      });
      if (!run) return { ok: false };
      state.runs.setHighlighted(
        id,
        after.problem ? [] : comparisonFor(run, after.elements),
      );
      return {
        ok: true,
        compared: after.problem === null,
        run: {
          files: run.files.map((file) => file.file),
          highlighted: run.highlighted,
        },
      };
    },
    setDirection: (id: string) => setDirectionTo(id),
    sendAgent: (payload: { tool: AgentTool; request: string }) =>
      sendAgent(payload),
    cancelAgent: () => {
      state.agent?.cancel();
      return true;
    },
    agentStatuses: () =>
      lastAgentEvents
        .filter((event) => event.type === 'status')
        .map((event) => event.text ?? ''),
    agentErrors: () =>
      lastAgentEvents
        .filter((event) => event.type === 'error')
        .map((event) => event.text ?? ''),
    waitForAgent: (timeout: number) => waitForAgentDone(timeout),
    settleRenderer: async () => {
      const contents = state.window?.webContents;
      if (!contents || contents.isDestroyed()) return;
      await contents.executeJavaScript(
        `new Promise(resolve => setTimeout(resolve, 0)).then(() => window.cauldron.runs())`,
      );
    },
    agentReply: () =>
      // Streamed pieces (delta) continue the previous text, as in the panel.
      lastAgentEvents
        .filter((event) => event.type === 'text')
        .reduce(
          (reply, event) =>
            (event as { delta?: boolean }).delta
              ? reply + (event.text ?? '')
              : reply
                ? `${reply}\n${event.text ?? ''}`
                : (event.text ?? ''),
          '',
        ),
    /** The exact brief handed to the agent process, for the Codex proof. */
    agentPrompt: () => lastAgentPrompt,
    /** Every event the run reported, in order, so progress can be checked. */
    agentEvents: () =>
      lastAgentEvents.map((event) => ({
        type: event.type,
        text: event.text ?? '',
        name: event.name ?? '',
        paths: event.paths,
      })),
    /** The Cauldron actions an outside agent actually asked for. */
    mcpServed: () => mcpCalls(),
    agentTools: () =>
      lastAgentEvents
        .filter((event) => event.type === 'tool')
        .map((event) => event.name ?? ''),
    agentRunning: () => Boolean(state.agent),
    /** Ticket 18: the session id the app will resume for a tool on this site. */
    agentSession: (tool: string) =>
      (state.site ? state.sessions.get(state.site.root) : undefined)?.[
        tool as AgentTool
      ] ?? null,
    /** Ticket 18: the tool calls the outside-agent connection actually served. */
    mcpCalls: () => mcpToolCalls.slice(),
    clearMcpCalls: () => {
      mcpToolCalls.length = 0;
    },
    buildPromptText: (request: string) => {
      const site = state.site;
      const direction = site ? directionFor(site.root) : null;
      return buildPrompt({
        request,
        siteName: site?.name ?? '',
        direction,
        selection: promptSelection(),
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
    // Development runs otherwise show Electron's own icon in the Dock. The
    // packaged app reads build/icon.icns from its bundle.
    if (
      !app.isPackaged &&
      !SMOKE &&
      !E2E_SITE &&
      process.platform === 'darwin'
    ) {
      try {
        app.dock?.setIcon(path.join(app.getAppPath(), 'build/icon.png'));
      } catch (error) {
        console.error('The Cauldron Dock icon could not be set:', error);
      }
    }
    Menu.setApplicationMenu(buildMenu());
    registerIpc();
    createWindow(showSplash());

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

    if (E2E_SITE && process.env.CAULDRON_CHANGE_TASTE_TEST) {
      const { runChangeTasteTest } = await import('./e2e');
      await runChangeTasteTest(E2E_SITE, harnessApi() as never);
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

    if (E2E_SITE && process.env.CAULDRON_QUALITY_FEEDBACK_TEST) {
      const { runQualityFeedbackTest } = await import('./e2e');
      await runQualityFeedbackTest(
        E2E_SITE,
        state.window!,
        harnessApi() as never,
      );
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

    if (E2E_SITE && process.env.CAULDRON_CODEX_TEST) {
      const { runCodexProofTest } = await import('./e2e');
      await runCodexProofTest(E2E_SITE, harnessApi() as never);
      return;
    }

    if (E2E_SITE && process.env.CAULDRON_HERMES_TEST) {
      const { runHermesProofTest } = await import('./e2e');
      await runHermesProofTest(E2E_SITE, harnessApi() as never);
      return;
    }

    if (E2E_SITE && process.env.CAULDRON_BRIEF_TEST) {
      const { runBriefTest } = await import('./e2e');
      await runBriefTest(E2E_SITE, harnessApi() as never);
      return;
    }

    if (E2E_SITE && process.env.CAULDRON_AGENT_TEST) {
      const { runAgentTest } = await import('./e2e');
      await runAgentTest(E2E_SITE, harnessApi() as never);
      return;
    }

    if (E2E_SITE && process.env.CAULDRON_CLAUDE_TEST) {
      const { runClaudeProofTest } = await import('./e2e');
      await runClaudeProofTest(E2E_SITE, state.window!, harnessApi() as never);
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

    if (E2E_SITE && process.env.CAULDRON_ACTIONS_TEST) {
      const { runActionsParityTest } = await import('./e2e');
      await runActionsParityTest(
        E2E_SITE,
        harnessApi() as never,
        state.window!,
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

    if (E2E_SITE && process.env.CAULDRON_COMPARE_TEST) {
      const { runCompareTest } = await import('./e2e');
      await runCompareTest(
        E2E_SITE,
        state.window!,
        harnessApi() as never,
        openSiteAt,
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
