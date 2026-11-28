import {
  BrowserWindow,
  Menu,
  app,
  dialog,
  ipcMain,
  safeStorage,
  shell,
  webContents,
  type WebContents,
} from 'electron';
import path from 'node:path';
import fs from 'node:fs';
import { buildMenu } from '../app-menu';
import { mergeProblemMessages } from '../problems';
import { previewRouteFromUrl } from '../status-bar';
import type { EditingLayer } from '../responsive-layer';
import {
  allocateResponsiveId,
  readResponsiveStyles,
  writeResponsiveStyle,
} from './responsive-css';
import {
  listPublicImages,
  listSeoEntries,
  readPageSeo,
  writePageSeo,
  type SeoValues,
} from './seo';
import {
  cleanupOrphanedDevServers,
  detectSite,
  startDevServer,
  type DevServer,
  type Site,
} from './site';
import { Preview } from './preview';
import { PreviewCompare } from './preview-compare';
import { History } from './history';
import { Runs, type Run } from './runs';
import {
  collectCssRuleChanges,
  compareSnapshots,
  highlightsFor,
  otherChangedPages,
  type HighlightedPart,
  type PageElement,
} from './compare';

import {
  runAction,
  listPages,
  actionCatalogue,
  isReadOnlyAction,
  readPageSections,
  resolveNewPageTarget,
  resolvePageFile,
  type ActionRequest,
} from './actions';
import {
  runAgent,
  buildPrompt,
  clearHermesConnection,
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
  tokensCss,
  designDocument,
  type DesignDirection,
} from './directions';
import {
  clearMcpCallsLog,
  mcpCalls,
  startMcpServer,
  toolsFor,
  toRequest,
  type McpHandle,
} from './mcp';
import {
  AI_PROVIDER_LABELS,
  KeyStore,
  KeyStoreError,
  isAiProvider,
  needsKey,
  type AiProvider,
} from './ai-keys';
import { createModel, runKeyAgent, testModel } from './ai-agent';
import type { ModelMessage } from 'ai';
import { readCollections, readEntry, saveEntry } from './content';
import { LIBRARY, LINKS_SHELF, addPiece, piecePreview } from './library';
import { demoDirectionFor } from './library-demo-directions';
import { EXTENDED_LIBRARY } from './library-pieces';
import { checkSite, buildSiteAsync } from './quality';
import { directionFromUrl } from './reference';
import {
  publishAsync,
  repoStateAsync,
  exportStaticSiteAsync,
  deployCloudflarePagesAsync,
  deployGitHubPagesAsync,
  deployVercelAsync,
} from './publishing';
import {
  downloadAndSaveStockPhoto,
  getCuratedPhotos,
  saveAssetFile,
} from './assets';
import { clearDrafts, loadDrafts, saveDrafts, type Draft } from './recovery';
import {
  addRecent,
  canonicalProjectPath,
  createProject,
  loadRecents,
  removeRecent,
} from './projects';
import {
  isHomePreviewUrl,
  readProjectThemePalette,
  readProjectThumbnailDataUrl,
  removeProjectThumbnail,
  saveProjectThumbnail,
  thumbnailFilePath,
} from './thumbnails';
import { STARTER_TEMPLATES, starterPreview } from './templates';
import {
  detectDependencySetup,
  prepareDependencies,
  findMissingPackages,
  startInstallMissingPackages,
  type PrepareHandle,
  type PrepareUpdate,
} from './dependencies';
import {
  draftEditOperation,
  mergeDraftsList,
  planBatchDraftRestores,
  removeDraftKeys,
} from '../draft-restore';
import { hashOf, isInside, readFile, writeFileAtomic } from './files';
import {
  applyEdit,
  snapshotElement,
  type EditOperation,
  type ElementSnapshot,
  type Location,
} from './edit';

const E2E_HARNESS_ENABLED =
  typeof __CAULDRON_E2E__ === 'boolean'
    ? __CAULDRON_E2E__
    : process.env.CAULDRON_BUNDLE_E2E === '1';
const SMOKE = process.env.CAULDRON_SMOKE === '1';
// Test-only: hides the window, Dock and splash so an automated UI proof can
// drive the real app in the background. It grants no other shortcut: the
// renderer, preload, IPC and backend all run exactly as a person sees them.
const BACKGROUND_TEST = process.env.CAULDRON_BACKGROUND_TEST === '1';
let sawUnexpectedError = '';
let pendingProblem: string | null = null;
let editorRendererGone = false;
const E2E_SITE = E2E_HARNESS_ENABLED
  ? (process.env.CAULDRON_E2E_SITE ?? '')
  : '';
/**
 * The Astro version verified for this workflow in the project-backend proof
 * (real installs from the shared store; see the issue-32 backend record).
 * It is the app's current tested version, pinned exactly in new projects —
 * deliberately NOT presented as a live "latest" lookup.
 */
const ASTRO_VERSION_TESTED = '7.4.7';
// Test runs can keep their app data in their own folder, so parallel or
// repeated harness runs never share recovery, conflict or run records. The
// variable is only ever set by a test run.
if (process.env.CAULDRON_TEST_USER_DATA) {
  app.setPath('userData', process.env.CAULDRON_TEST_USER_DATA);
  // Harness runs use Chromium's fake keychain, never the person's own. This
  // MUST stay inside the test-only branch: the fake uses a fixed, public
  // password, so outside a test it would make saved AI keys decryptable.
  app.commandLine?.appendSwitch('use-mock-keychain');
}

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
  previewCompare: PreviewCompare;
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
  /** A running dependency install, one at a time across the app. */
  prepare: PrepareHandle | null;
  prepareRoot: string | null;
  installPackages: PrepareHandle | null;
  buildError: string | null;
  missingPackages: string[];
};

const state: Controller = {
  window: null,
  site: null,
  preview: new Preview(),
  previewCompare: new PreviewCompare(),
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
  prepare: null,
  prepareRoot: null,
  installPackages: null,
  buildError: null,
  missingPackages: [],
};

function summaryOf(site: Site | null): Site | null {
  if (!site) return null;
  return {
    ...site,
    missingPackages: state.missingPackages,
    buildError: state.buildError,
  };
}

// --- Project home state -----------------------------------------------------

/** The small JSON library of recent projects, persisted across restarts. */
function recentsStorePath(): string {
  return path.join(app.getPath('userData'), 'recent-projects.json');
}

/** Cached JPEG snapshots of opened projects for the Projects screen (WDL-174). */
function thumbnailsDir(): string {
  return path.join(app.getPath('userData'), 'project-thumbnails');
}

let thumbnailTimer: NodeJS.Timeout | null = null;

function cancelThumbnailCapture(): void {
  if (thumbnailTimer) {
    clearTimeout(thumbnailTimer);
    thumbnailTimer = null;
  }
}

/**
 * Schedules a debounced preview snapshot for the open site (WDL-174). Only
 * overwrites an existing thumbnail when viewing the home page (`/`), skips
 * Vite build-error overlays, and never touches the site folder itself.
 */
function scheduleThumbnailCapture(root: string, serverUrl: string): void {
  cancelThumbnailCapture();
  thumbnailTimer = setTimeout(() => {
    thumbnailTimer = null;
    void (async () => {
      if (state.site?.root !== root || state.server?.url !== serverUrl) return;
      const contents = state.preview.webContents;
      if (!contents) return;
      const currentUrl = contents.getURL();
      const cacheDir = thumbnailsDir();
      const hasExisting = fs.existsSync(thumbnailFilePath(cacheDir, root));
      if (hasExisting && !isHomePreviewUrl(currentUrl, serverUrl)) return;
      const previewError = await inspectPreviewError();
      if (previewError) return;
      if (state.site?.root !== root || state.server?.url !== serverUrl) return;
      const bytes = await state.preview.captureThumbnail(480);
      if (
        !bytes ||
        state.site?.root !== root ||
        state.server?.url !== serverUrl
      ) {
        return;
      }
      saveProjectThumbnail(cacheDir, root, bytes);
    })();
  }, 800);
}

/**
 * One app-managed pnpm content-addressable store, outside every project, so
 * new projects share downloaded packages without a per-userData fresh store
 * or any global settings write. Supplied per install with --store-dir.
 */
function pnpmStoreDir(): string {
  // macOS Electron exposes no per-app cache path; the app-level Application
  // Support location is outside every project and outside the test-overridden
  // userData, so the store is genuinely shared and persists across restarts.
  return path.join(app.getPath('appData'), 'Cauldron', 'pnpm-store');
}

/** Record a project in the library; a store failure is shown, never fatal. */
function recordRecent(root: string): void {
  const result = addRecent(recentsStorePath(), root);
  if (result.problem) fail(result.problem);
}

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

/** Format an thrown value or rejection reason into a readable one-line message. */
export function formatUnexpectedError(error: unknown): string {
  if (error instanceof Error) return error.message || error.name;
  if (typeof error === 'string') return error;
  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}

/** True only while the editor window and its renderer process can display UI. */
export function isEditorUiAvailable(
  window:
    | {
        isDestroyed?: () => boolean;
        webContents?: { isCrashed?: () => boolean } | null;
      }
    | null
    | undefined,
  rendererGone: boolean,
): boolean {
  if (!window || window.isDestroyed?.()) return false;
  if (rendererGone) return false;
  if (window.webContents?.isCrashed?.()) return false;
  return true;
}

/** Deliver an error banner to the editor window, or buffer until startup finishes. */
function notifyProblem(message: string): void {
  const window = state.window;
  const combined = mergeProblemMessages(pendingProblem, message) ?? message;
  if (
    isEditorUiAvailable(window, editorRendererGone) &&
    window &&
    !window.webContents.isLoadingMainFrame()
  ) {
    send('cauldron:problem', combined);
    pendingProblem = null;
  } else {
    pendingProblem = combined;
  }
}

/** Log and surface an uncaught exception or unhandled promise rejection. */
function reportUnexpectedError(
  kind: 'error' | 'unhandled rejection',
  error: unknown,
): void {
  const detail = formatUnexpectedError(error);
  const message = `Unexpected ${kind}: ${detail}`;
  sawUnexpectedError = detail;
  console.error(`Cauldron hit an unexpected ${kind}:`, error);
  status(message);
  notifyProblem(message);
  if (
    !isEditorUiAvailable(state.window, editorRendererGone) &&
    app.isPackaged &&
    !SMOKE &&
    !BACKGROUND_TEST &&
    !E2E_SITE
  ) {
    dialog.showErrorBox('Cauldron hit an unexpected error', message);
  }
}

/** Wire both uncaughtException and unhandledRejection to one reporting path. */
export function registerUnexpectedErrorHandlers(
  proc: Pick<NodeJS.Process, 'on'>,
  report: (kind: 'error' | 'unhandled rejection', error: unknown) => void,
): void {
  proc.on('uncaughtException', (error) => {
    report('error', error);
  });
  proc.on('unhandledRejection', (reason) => {
    report('unhandled rejection', reason);
  });
}

/** A failure the person must see, and a diagnostic for whoever reads the console. */
function fail(message: string): void {
  console.error(message);
  status(message);
  notifyProblem(message);
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
  const root = state.site?.root ?? '';
  const run: Run | undefined = state.runs
    .list()
    .find(
      (item) =>
        item.status === 'finished' &&
        item.files.some((file) => file.ownership === 'run'),
    );
  if (!run || !root) return [];
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
      ...state.runs.readChangeText(root, run.id, file),
    }));
}

function selectionView() {
  const selection = state.selection;
  if (!selection) return null;
  const responsiveId =
    selection.snapshot.attributes.find(
      (attribute) => attribute.name === 'data-cauldron-r',
    )?.value ?? null;
  const responsiveStyles = state.site
    ? readResponsiveStyles(state.site.root, responsiveId)
    : { tablet: {}, phone: {} };
  return {
    id: selection.id,
    file: relativeFile(selection.location.file),
    line: selection.location.line,
    column: selection.location.column,
    name: selection.location.name,
    text: selection.snapshot.text,
    baseHash: hashOf(selection.snapshot.sourceText),
    textEditable: selection.snapshot.textEditable,
    ...(selection.snapshot.textEditReason
      ? { textEditReason: selection.snapshot.textEditReason }
      : {}),
    attributes: selection.snapshot.attributes,
    style: selection.snapshot.style,
    responsiveId,
    responsiveStyles,
    pageUrl: selection.pageUrl,
    domPath: selection.domPath,
    history: state.history.state(),
  };
}

function pushSelection(): void {
  const view = selectionView();
  send('cauldron:selection', view);
  state.preview.webContents?.send(
    'preview:selection-meta',
    view
      ? {
          path: view.domPath,
          textEditable: view.textEditable,
          textEditReason: view.textEditReason,
        }
      : null,
  );
}

function pushPreviewSections(): void {
  const site = state.site;
  const contents = state.preview.webContents;
  if (!site || !contents) return;
  const route = previewRouteFromUrl(
    state.preview.currentUrl ?? state.server?.url ?? null,
  );
  const res = readPageSections(site.root, route);
  if (!res.ok || !Array.isArray(res.sections) || typeof res.file !== 'string') {
    contents.send('preview:sections', null);
    return;
  }
  const absFile = path.join(site.root, res.file);
  const sections = res.sections as Array<{
    index: number;
    tag: string;
    name: string;
    line: number;
    column: number;
  }>;
  contents.send('preview:sections', {
    file: absFile,
    sections: sections.map((sec) => ({
      index: sec.index,
      tag: sec.tag,
      name: sec.name,
      line: sec.line,
      column: sec.column,
    })),
  });
}

function pushHistory(): void {
  send('cauldron:history', state.history.state());
  pushPreviewSections();
}

async function stopPreview(): Promise<void> {
  cancelThumbnailCapture();
  if (state.server) {
    const s = state.server;
    state.server = null;
    if (s.process.exitCode === null) {
      await new Promise<void>((resolve) => {
        let done = false;
        const onExit = () => {
          if (!done) {
            done = true;
            resolve();
          }
        };
        s.process.once('exit', onExit);
        s.process.once('close', onExit);
        s.stop();
        setTimeout(onExit, 2500);
      });
    }
  }
  state.mcp?.close();
  state.mcp = null;
  state.preview.hide();
  state.previewCompare.clear();
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
  let loaded = false;
  let lastError: Error | null = null;
  for (let attempt = 0; attempt < 10; attempt++) {
    try {
      await state.preview.load(server.url);
      loaded = true;
      break;
    } catch (error) {
      lastError = error as Error;
      await new Promise((resolve) => setTimeout(resolve, 300));
    }
  }
  if (!loaded) {
    await stopPreview();
    const problem = `The preview could not load: ${lastError?.message ?? 'unknown error'}`;
    status(problem);
    return { problem, detail: server.url };
  }
  await state.previewCompare.load(server.url);
  await startMcp(site);
  send('cauldron:preview', { running: true, url: server.url });
  scheduleThumbnailCapture(site.root, server.url);
  status(`Preview running at ${server.url}`);
  return { url: server.url };
}

function designView() {
  if (!state.site) return { direction: null };
  const read = readDirection(state.site.root);
  return {
    ...read,
    tokensCss: read.direction ? tokensCss(read.direction) : null,
    designMarkdown: read.direction ? designDocument(read.direction) : null,
  };
}

// ---------------------------------------------------------------------------
// Bring your own AI key (WDL-243). The key store lives here, in main; the
// renderer only ever learns whether a key is saved.
let keyStoreInstance: KeyStore | null = null;
/** The key agent's conversation per open site, kept for this app session. */
const keyHistory = new Map<string, ModelMessage[]>();
function keyStore(): KeyStore {
  keyStoreInstance ??= new KeyStore(path.join(app.getPath('userData'), 'ai'), {
    isAvailable: () => safeStorage.isAsyncEncryptionAvailable(),
    encrypt: (plain) => safeStorage.encryptStringAsync(plain),
    decrypt: async (cipher) =>
      (await safeStorage.decryptStringAsync(cipher)).result,
  });
  return keyStoreInstance;
}

/** Harness only: a local stand-in provider, so acceptance never spends money. */
function testAiBaseUrl(): string | undefined {
  return process.env.CAULDRON_TEST_USER_DATA
    ? process.env.CAULDRON_TEST_AI_BASE_URL || undefined
    : undefined;
}

type KeyModel =
  | { ok: true; model: ReturnType<typeof createModel>; label: string }
  | { ok: false; problem: string };

async function keyModel(): Promise<KeyModel> {
  const store = keyStore();
  const settings = store.settings();
  const label = AI_PROVIDER_LABELS[settings.provider];
  const key = await store.readKey(settings.provider);
  if (needsKey(settings.provider) && !key)
    return {
      ok: false,
      problem: `Add your ${label} key in the agent settings first.`,
    };
  return {
    ok: true,
    model: createModel(settings, key, { baseURL: testAiBaseUrl() }),
    label,
  };
}

/** The key agent's tools are exactly the MCP connection's checked actions. */
async function callKeyTool(
  name: string,
  args: Record<string, unknown>,
): Promise<{ ok: boolean; text: string }> {
  if (name === 'read_selection')
    return { ok: true, text: JSON.stringify(selectionView(), null, 2) };
  if (name === 'read_design')
    return { ok: true, text: JSON.stringify(designView(), null, 2) };
  const request = toRequest(name, args);
  if (!request) return { ok: false, text: `Unknown tool: ${name}` };
  try {
    const result = sharedAction(request, true);
    return { ok: Boolean(result.ok), text: JSON.stringify(result, null, 2) };
  } catch (error) {
    return {
      ok: false,
      text: error instanceof Error ? error.message : String(error),
    };
  }
}

function keyProblem(error: unknown): { ok: false; problem: string } {
  return {
    ok: false,
    problem:
      error instanceof KeyStoreError
        ? error.message
        : 'The AI settings could not be saved.',
  };
}

/** The local connection for outside agents, one per open site (plan 3.3). */
async function startMcp(site: Site): Promise<void> {
  state.mcp?.close();
  state.mcp = null;
  mcpToolCalls.length = 0;
  try {
    state.mcp = await startMcpServer({
      root: site.root,
      siteName: site.name,
      run: (request) => sharedAction(request, true),
      readSelection: () => selectionView(),
      readDesign: () => designView(),
      record: (call) => recordMcpToolCall(call),
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

/**
 * Safely inspects the live preview webContents for Vite/Astro build error overlays
 * or error page text.
 */
async function inspectPreviewError(): Promise<string | null> {
  const contents = state.preview.webContents;
  if (!contents || contents.isDestroyed()) return null;
  try {
    const errorText = (await contents.executeJavaScript(
      `(() => {
        try {
          const overlay = document.querySelector('vite-error-overlay');
          if (overlay) {
            const root = overlay.shadowRoot || overlay;
            const msgEl = root.querySelector('.message-body') || root.querySelector('.message') || root.querySelector('pre');
            const text = msgEl?.textContent?.trim() || root.textContent?.trim();
            if (text) {
              const lines = text.split('\\n').map(l => l.trim()).filter(Boolean);
              return lines.slice(0, 3).join(' ').slice(0, 300);
            }
            return 'Vite build/runtime error';
          }
          const astroOverlay = document.querySelector('#astro-error-overlay');
          if (astroOverlay) {
            const text = astroOverlay.textContent?.trim();
            if (text) {
              const lines = text.split('\\n').map(l => l.trim()).filter(Boolean);
              return lines.slice(0, 3).join(' ').slice(0, 300);
            }
            return 'Astro build error';
          }
          const title = document.title || '';
          const body = document.body ? document.body.innerText || '' : '';
          // Only the dev server's own failure wording counts. A page that
          // merely has "error" in its title is an ordinary page.
          if (
            body.includes('Internal server error') ||
            body.includes('Failed to resolve import') ||
            body.includes('Rolldown failed to resolve import') ||
            body.includes('Cannot find module')
          ) {
            const lines = body.split('\\n').map(l => l.trim()).filter(Boolean);
            const errLine = lines.find(l =>
              l.includes('Failed to resolve import') ||
              l.includes('Rolldown failed') ||
              l.includes('Cannot find module') ||
              l.includes('Internal server error')
            );
            return errLine ? errLine.slice(0, 300) : (title || 'Preview load error');
          }
          return null;
        } catch {
          return null;
        }
      })()`,
      true,
    )) as string | null;
    return errorText || null;
  } catch {
    return null;
  }
}

function readSiteStateSnapshot(site: Site): {
  summary: ReturnType<typeof summaryOf>;
  drafts: Draft[];
  direction: ReturnType<typeof rendererDirection> | null;
  readProblems: string[];
} {
  const recovery = loadDrafts(site.root);
  const design = readDirection(site.root);
  return {
    summary: summaryOf(site),
    drafts: recovery.drafts,
    direction: design.direction ? rendererDirection(design.direction) : null,
    readProblems: [recovery.problem, design.problem].filter(
      (problem): problem is string => Boolean(problem),
    ),
  };
}

function pushSiteSnapshot(
  site: Site,
  options?: {
    reportProblems?: boolean;
    recovered?: boolean;
    history?: { canUndo: boolean; canRedo: boolean };
  },
): string[] {
  const snapshot = readSiteStateSnapshot(site);
  send('cauldron:site', {
    site: snapshot.summary,
    drafts: snapshot.drafts,
    direction: snapshot.direction,
    ...(options?.recovered !== undefined
      ? { recovered: options.recovered }
      : {}),
    ...(options?.history ? { history: options.history } : {}),
  });
  if (options?.reportProblems !== false && snapshot.readProblems.length > 0) {
    fail(snapshot.readProblems.join(' '));
  }
  return snapshot.readProblems;
}

/**
 * Rechecks missing package imports and preview overlay errors, updating
 * state.missingPackages and state.buildError, and sends an updated site summary.
 */
async function refreshSiteHealth(options?: {
  buildVerifiedOk?: boolean;
  reportProblems?: boolean;
}): Promise<{
  missingPackages: string[];
  buildError: string | null;
  readProblems: string[];
}> {
  if (!state.site) {
    state.missingPackages = [];
    state.buildError = null;
    return { missingPackages: [], buildError: null, readProblems: [] };
  }
  const siteRoot = state.site.root;
  const previewError = await inspectPreviewError();
  let missing = options?.buildVerifiedOk ? [] : findMissingPackages(siteRoot);

  // Trust a real build over the static import scan when Astro is available.
  if (
    missing.length > 0 &&
    !previewError &&
    options?.buildVerifiedOk === undefined &&
    detectDependencySetup(siteRoot).hasAstroBin
  ) {
    const verification = await buildSiteAsync(siteRoot);
    if (state.site?.root !== siteRoot) {
      return {
        missingPackages: state.missingPackages,
        buildError: state.buildError,
        readProblems: [],
      };
    }
    if (verification.ok) missing = [];
  }

  state.missingPackages = missing;
  state.buildError =
    previewError ??
    (missing.length > 0
      ? `Missing package imports: ${missing.join(', ')}`
      : null);

  const readProblems = pushSiteSnapshot(state.site, {
    reportProblems: options?.reportProblems,
  });
  return {
    missingPackages: state.missingPackages,
    buildError: state.buildError,
    readProblems,
  };
}

async function openSiteAt(root: string) {
  if (state.agent)
    return {
      problem:
        'Finish or cancel the current agent job before opening another site.',
    };
  if (state.prepare)
    return {
      problem:
        'A dependency install is running. Cancel it or wait for it to finish before opening another project.',
    };
  // Data safety (issue 32): a project with edits saved as recovery drafts is
  // not abandoned silently. The renderer confirms typed-but-unsaved edits
  // itself; this guard covers the persisted ones the main process knows about.
  if (state.site) {
    const current = canonicalProjectPath(state.site.root);
    const target = canonicalProjectPath(root);
    if (current !== target) {
      const saved = storedDrafts(state.site.root);
      if (saved.length > 0)
        return {
          needsConfirm: true,
          root,
          problem: `${state.site.name} has ${saved.length} unsaved edit${
            saved.length === 1 ? '' : 's'
          } kept as recovery drafts. Confirm before switching projects.`,
        };
    }
  }
  const detected = detectSite(root);
  if ('problem' in detected) {
    status(detected.problem);
    return detected;
  }
  // The library records every project that was really detected as a site,
  // including one whose open is refused below for missing dependencies: a
  // failed or cancelled install must stay recoverable from the library, never
  // become a dead end (issue 32).
  recordRecent(detected.root);
  // An existing project without its dependencies is not opened into a dead
  // preview: the caller gets a structured answer and the setup flow offers an
  // explicit install with the project's own package manager (issue 32).
  const setup = detectDependencySetup(root);
  if (!setup.hasAstroBin) {
    status(
      `${detected.name} needs its dependencies installed before it can open.`,
    );
    return {
      needsPreparation: true as const,
      problem: `${detected.name} does not have its dependencies installed yet, so its preview cannot run. Install them from the project home (packages are downloaded through Cauldron's shared store; nothing is installed globally).`,
      setup,
    };
  }

  await stopPreview();
  pendingProblem = null;
  state.site = detected;
  state.selection = null;
  state.history = new History();
  pushHistory();
  state.runs = new Runs();
  const runHistory = state.runs.load(detected.root);
  // Read the saved edits and design settings once, run health checks, then
  // surface every open-time failure together at the end so neither preview
  // status nor health refreshes bury or split them (WDL-252).
  pushSiteSnapshot(detected, {
    reportProblems: false,
    recovered: true,
    history: state.history.state(),
  });
  status(
    `${detected.name}: Astro ${detected.astroVersion}, ${detected.packageManager}`,
  );
  const preview = await startPreview();
  const health = await refreshSiteHealth({ reportProblems: false });
  const problems = [
    'problem' in preview ? preview.problem : null,
    ...health.readProblems,
    runHistory.problem,
  ].filter((problem): problem is string => Boolean(problem));
  if (problems.length > 0) fail(problems.join(' '));
  return 'problem' in preview
    ? { site: summaryOf(detected), ...preview }
    : { site: summaryOf(detected) };
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
  state.previewCompare.reload();
  await loaded;
  await refreshSiteHealth();
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

/** Records DOM highlights, CSS rule diffs, and changed sibling pages for a finished run. */
function recordRunComparison(
  root: string,
  run: Run,
  after: { elements: PageElement[]; problem: string | null },
): void {
  const highlighted = after.problem ? [] : comparisonFor(run, after.elements);
  const cssInputs = run.files
    .filter(
      (file) =>
        file.ownership !== 'outside' &&
        /\.(css|pcss|scss|astro)$/i.test(file.file),
    )
    .map((file) => ({
      file: file.file,
      ...state.runs.readChangeText(root, run.id, file),
    }));
  const cssChanges = collectCssRuleChanges(cssInputs);
  const otherPages = otherChangedPages(
    run.files,
    state.preview.webContents?.getURL() ?? null,
  );
  state.runs.setComparison(run.id, {
    highlighted,
    cssChanges,
    otherPages,
  });
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
    ? `${[...new Set(selectors)].join(',')}{outline:2px solid #a58cf0 !important;outline-offset:2px !important}`
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
    deletedFiles: run.files
      .filter((file) => file.status === 'removed')
      .map((file) => file.file),
    problems: run.problems,
    highlighted: run.highlighted,
    cssChanges: run.cssChanges ?? [],
    otherPages: run.otherPages ?? [],
    ...(run.directEdits && run.directEdits.length > 0
      ? { directEdits: run.directEdits }
      : {}),
    undoAvailable: state.site
      ? state.runs.canUndo(state.site.root, run.id)
      : false,
  };
}

/** Files each Cauldron-started agent run said it wrote, by run id (plan 2.2). */
const runClaims = new Map<string, Set<string>>();
/** Files edited via Cauldron's own checked MCP actions with post-action hashes, by run id (WDL-159). */
const checkedRunClaims = new Map<string, Map<string, string | null>>();

function claimForRun(id: string | null, file: string): void {
  if (!id) return;
  const claims = runClaims.get(id) ?? new Set<string>();
  claims.add(file);
  runClaims.set(id, claims);
}

function claimCheckedForRun(id: string | null, file: string): void {
  if (!id) return;
  const claims = checkedRunClaims.get(id) ?? new Map<string, string | null>();
  let hash: string | null = null;
  try {
    if (fs.existsSync(file)) {
      hash = hashOf(fs.readFileSync(file, 'utf8'));
    }
  } catch {
    // Leave null so finish() surfaces the file if its state cannot be verified.
  }
  claims.set(file, hash);
  checkedRunClaims.set(id, claims);
}

function resolveActionFile(
  root: string,
  request: ActionRequest,
): string | null {
  if ('target' in request) return path.resolve(root, request.target.file);
  if ('file' in request) return path.resolve(root, request.file);
  if (request.action === 'createPage') {
    const resolved = resolveNewPageTarget(root, request.page);
    return resolved.ok ? resolved.file : null;
  }
  if ('page' in request) return resolvePageFile(root, request.page);
  return null;
}

/**
 * One path for every edit. `fromAgent` marks writes that arrive through the
 * agent connection, so a run never mistakes the person's own edits for its own.
 */
function sharedAction(request: ActionRequest, fromAgent = false) {
  const site = state.site;
  if (!site) return { ok: false as const, problem: 'No site is open.' };
  const full = resolveActionFile(site.root, request);
  const before =
    full && isInside(site.root, full) && fs.existsSync(full)
      ? readFile(full)
      : null;
  const result = runAction(site.root, request);
  const extraWrites =
    result.ok && 'extraWrites' in result && Array.isArray(result.extraWrites)
      ? (result.extraWrites as Array<{
          file: string;
          before: string;
          after: string;
          beforeHash: string;
          afterHash: string;
          created: boolean;
        }>)
      : [];
  if (result.ok && fromAgent && !isReadOnlyAction(request.action)) {
    if (full) {
      claimForRun(state.agentRunId, full);
      claimCheckedForRun(state.agentRunId, full);
    }
    for (const extra of extraWrites) {
      claimForRun(state.agentRunId, extra.file);
      claimCheckedForRun(state.agentRunId, extra.file);
    }
  }
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
      // A newly created file (new page or source): undo removes it cleanly.
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
    for (const extra of extraWrites) {
      if (extra.beforeHash !== extra.afterHash) {
        state.history.record({
          file: extra.file,
          location: { file: extra.file, line: 1, column: 1, name: 'source' },
          operation: { kind: 'text', value: '' },
          before: extra.before,
          after: extra.after,
          beforeHash: extra.beforeHash,
          afterHash: extra.afterHash,
          label: request.action,
          ...(extra.created ? { created: true, root: site.root } : {}),
          runId: fromAgent
            ? (state.agentRunId ?? 'agent-connection')
            : undefined,
        });
      }
    }
    pushHistory();
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
      pushHistory();
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
  pushHistory();
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

/**
 * `keyed` is resolved by the IPC handler (decrypting the key is async), so this
 * stays synchronous for every existing caller.
 */
function sendAgent(
  payload: { tool: AgentTool; request: string },
  keyed: KeyModel | null = null,
): {
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
  if (payload.tool === 'key' && !keyed?.ok)
    return {
      ok: false,
      problem:
        keyed && !keyed.ok
          ? keyed.problem
          : 'Add your AI key in the agent settings first.',
    };

  const selection = promptSelection();

  const prompt = buildPrompt({
    request: payload.request,
    tool: payload.tool,
    siteName: site.name,
    direction,
    selection,
    catalogue: actionCatalogue(site.name),
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
    text: `Starting ${keyed?.ok ? keyed.label : payload.tool}…`,
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
    keyed?.ok
      ? runKeyAgent({
          model: keyed.model,
          providerLabel: keyed.label,
          prompt,
          tools: toolsFor(site.name),
          call: callKeyTool,
          history: keyHistory.get(site.root) ?? [],
          onComplete: (messages) => keyHistory.set(site.root, messages),
          onEvent,
        })
      : runAgent({
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
    payload.tool === 'hermes' && state.mcp && !state.mcp.hasClientConnected()
      ? hermesPickupWaitMs()
      : 0;
  if (wait > 0 && state.mcp) {
    onEvent({
      type: 'status',
      text: `Waiting for Hermes to connect to this site (up to ${Math.ceil(wait / 1000)} s)…`,
    });
    let launched = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let settleTimer: ReturnType<typeof setTimeout> | null = null;
    const launch = () => {
      if (launched) return;
      launched = true;
      if (timer) clearTimeout(timer);
      if (settleTimer) clearTimeout(settleTimer);
      offClientConnected();
      if (state.agentRunId === run.id) state.agent = start();
    };
    const offClientConnected = state.mcp.onClientConnected(() => {
      if (launched) return;
      if (settleTimer) clearTimeout(settleTimer);
      settleTimer = setTimeout(launch, 1500);
    });
    timer = setTimeout(launch, wait);
    state.agent = {
      cancel: () => {
        launched = true;
        if (timer) clearTimeout(timer);
        if (settleTimer) clearTimeout(settleTimer);
        offClientConnected();
        onEvent({ type: 'error', text: 'Cancelled.' });
      },
    };
  } else {
    // runAgent can report a missing tool SYNCHRONOUSLY, before returning its
    // handle. The error event has already run finishAgentRun (which cleared
    // agent and runId), so the handle is assigned only if the run is still the
    // current one — otherwise a stale handle would stick and lock the controls.
    try {
      const handle = start();
      if (state.agentRunId === run.id) state.agent = handle;
    } catch (error) {
      if (state.agentRunId === run.id) {
        state.agent = null;
        state.agentRunId = null;
        onEvent({
          type: 'error',
          text: error instanceof Error ? error.message : String(error),
        });
      }
    }
  }

  return { ok: true, runId: run.id };
}

/** Editing IPC is accepted only from the app's main frame, never the site preview. */
export function isAuthorizedEditorIpc(
  editor:
    | {
        isDestroyed?: () => boolean;
        mainFrame?: { parent?: unknown; frameTreeNodeId?: number } | null;
      }
    | null
    | undefined,
  sender: unknown,
  senderFrame:
    | { parent?: unknown; frameTreeNodeId?: number }
    | null
    | undefined,
): boolean {
  if (!editor || editor.isDestroyed?.()) return false;
  if (sender !== editor) return false;
  const mainFrame = editor.mainFrame;
  if (!mainFrame || !senderFrame) return false;
  if (senderFrame === mainFrame) return true;
  return (
    senderFrame.parent == null &&
    mainFrame.parent == null &&
    typeof senderFrame.frameTreeNodeId === 'number' &&
    senderFrame.frameTreeNodeId === mainFrame.frameTreeNodeId
  );
}

/** Editing IPC is accepted only from the app's main frame, never the site preview. */
function handle(
  channel: string,
  listener: Parameters<typeof ipcMain.handle>[1],
): void {
  ipcMain.handle(channel, (event, ...args) => {
    if (
      !isAuthorizedEditorIpc(
        state.window?.webContents,
        event.sender,
        event.senderFrame,
      )
    )
      throw new Error('The website preview has no editing powers.');
    return listener(event, ...args);
  });
}

function registerIpc(): void {
  // The dialog only picks; the opening itself goes through the same guarded
  // flow as every other entry point (recents, path field, menu), so an
  // unprepared project gets the same setup offer instead of a dead preview
  // (issue 32).
  handle('cauldron:open-site-dialog', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory'],
      title: 'Open an Astro site',
    });
    if (result.canceled || result.filePaths.length === 0)
      return { cancelled: true as const };
    return { picked: result.filePaths[0] };
  });

  handle('cauldron:open-site', async (_event, root: string) =>
    openSiteAt(root),
  );

  // --- Project home (issue 32) ----------------------------------------------

  handle('cauldron:projects-home', () => {
    const library = loadRecents(recentsStorePath());
    const cacheDir = thumbnailsDir();
    return {
      problem: library.problem,
      projects: library.projects.map((project) => {
        const exists = fs.existsSync(project.path);
        return {
          ...project,
          missing: !exists,
          // So the library can offer "Install dependencies" again on an entry
          // whose install failed or was dismissed, without re-opening first.
          prepared: exists && detectDependencySetup(project.path).hasAstroBin,
          thumbnailUrl: readProjectThumbnailDataUrl(cacheDir, project.path),
          palette: exists ? readProjectThemePalette(project.path) : null,
        };
      }),
    };
  });

  handle('cauldron:choose-project-parent', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory', 'createDirectory'],
      title: 'Choose where the new project folder is created',
    });
    return {
      cancelled: result.canceled,
      path: result.canceled ? null : (result.filePaths[0] ?? null),
    };
  });

  handle(
    'cauldron:create-project',
    (_event, payload: { name: string; parent: string; template?: string }) => {
      const result = createProject({
        parent: payload.parent,
        name: payload.name,
        astroVersion: ASTRO_VERSION_TESTED,
        template: payload.template,
      });
      if ('ok' in result) {
        recordRecent(result.project.root);
        status(`Created ${result.project.name} in ${result.project.root}`);
        return result;
      }
      status(result.problem);
      return result;
    },
  );

  handle('cauldron:starter-templates', () =>
    STARTER_TEMPLATES.map((template) => ({
      ...template,
      previewHtml: starterPreview(template),
    })),
  );

  handle('cauldron:detect-dependencies', (_event, root: string) => {
    const site = detectSite(root);
    return {
      site: 'problem' in site ? null : site,
      problem: 'problem' in site ? site.problem : null,
      setup: detectDependencySetup(root),
    };
  });

  handle('cauldron:prepare-dependencies', (_event, root: string) => {
    if (state.prepare)
      return {
        ok: false,
        problem: 'An install is already running. Cancel it first.',
      };
    if (state.agent)
      return {
        ok: false,
        problem: 'An agent job is running; prepare can start once it finishes.',
      };
    const resolved = canonicalProjectPath(root);
    if (!fs.existsSync(resolved))
      return { ok: false, problem: 'That project folder no longer exists.' };
    state.prepareRoot = resolved;
    // A failure the helper reports synchronously (a missing package manager,
    // an unusable folder) emits its terminal event before this handler
    // returns. The handle must then never be stored: a stale handle would
    // block every later install and survive as an un-cancellable ghost.
    let syncProblem: string | null = null;
    let handle: PrepareHandle;
    try {
      handle = prepareDependencies({
        root: resolved,
        storeDir: pnpmStoreDir(),
        onUpdate: (update: PrepareUpdate) => {
          if (state.prepareRoot !== resolved) return;
          if (update.type === 'progress') {
            send('cauldron:prepare-progress', {
              root: resolved,
              type: 'progress',
              text: update.text,
            });
            return;
          }
          send('cauldron:prepare-progress', {
            root: resolved,
            type: 'done',
            ok: update.ok,
            problem: update.ok ? null : update.problem,
            detail: update.detail,
          });
          state.prepare = null;
          state.prepareRoot = null;
          if (!update.ok) syncProblem = update.problem;
          if (update.ok)
            status(`Dependencies are ready in ${path.basename(resolved)}.`);
          else fail(update.problem);
        },
      });
    } catch (error) {
      state.prepare = null;
      state.prepareRoot = null;
      const problem = `The install could not be started: ${
        error instanceof Error ? error.message : String(error)
      }`;
      fail(problem);
      return { ok: false, problem };
    }
    if (state.prepareRoot !== resolved) {
      // The run already ended synchronously; report that outcome instead of
      // pretending the install is running.
      return {
        ok: false,
        problem: syncProblem ?? 'The install could not be started.',
      };
    }
    state.prepare = handle;
    return { ok: true };
  });

  handle('cauldron:prepare-cancel', () => {
    state.prepare?.cancel();
    return true;
  });

  // Test-only instrumentation (CAULDRON_BACKGROUND_TEST): reads the real
  // preview WebContentsView state and captures the child page and the parent
  // window, so a background run can prove the view is actually laid out,
  // visible and rendering without foregrounding the app. It reports facts
  // only; it changes nothing.
  if (BACKGROUND_TEST)
    handle('cauldron:test-preview-introspect', async () => {
      const child = await state.preview.captureChild();
      const parent = await state.preview.captureWindow();
      return {
        ...state.preview.introspect(),
        compare: {
          ...state.previewCompare.introspect(),
          detail: await state.previewCompare.inspectFrames(),
          applied: state.previewCompare.appliedLog.slice(-12),
          failures: state.previewCompare.failures,
        },
        childPng: child,
        parentPng: parent,
      };
    });

  handle('cauldron:remove-recent', (_event, projectPath: string) => {
    const result = removeRecent(recentsStorePath(), projectPath);
    if (result.problem) fail(result.problem);
    else removeProjectThumbnail(thumbnailsDir(), projectPath);
    return { ok: !result.problem, problem: result.problem ?? undefined };
  });

  handle('cauldron:site-state', () => {
    const snapshot = state.site ? readSiteStateSnapshot(state.site) : null;
    const readProblemText = snapshot?.readProblems.join(' ') ?? '';
    if (readProblemText) {
      console.error(readProblemText);
      status(readProblemText);
    }
    const problem = mergeProblemMessages(pendingProblem, readProblemText);
    pendingProblem = null;
    return {
      site: snapshot?.summary ?? null,
      running: Boolean(state.server),
      url: state.server?.url ?? null,
      status: state.status,
      problem,
      direction: snapshot?.direction ?? null,
      selection: selectionView(),
      drafts: snapshot?.drafts ?? [],
      history: state.history.state(),
    };
  });

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

  handle('cauldron:apply-text', (_event, value: string) => {
    const res = writeSelection({ kind: 'text', value });
    if (res.ok) state.previewCompare.reload();
    return res;
  });

  handle(
    'cauldron:apply-attribute',
    (_event, name: string, value: string | null) => {
      const res = writeSelection({ kind: 'attribute', name, value });
      if (res.ok) state.previewCompare.reload();
      return res;
    },
  );

  handle(
    'cauldron:apply-style',
    (_event, properties: Record<string, string>, layer?: EditingLayer) => {
      if (!layer || layer === 'base') {
        const res = writeSelection({ kind: 'style', properties });
        if (res.ok) state.previewCompare.reload();
        return res;
      }
      return writeResponsiveSelection(layer, properties);
    },
  );

  handle(
    'cauldron:force-write',
    (_event, operation: EditOperation & { layer?: EditingLayer }) => {
      if (
        operation.kind === 'style' &&
        (operation.layer === 'tablet' || operation.layer === 'phone')
      ) {
        return writeResponsiveSelection(operation.layer, operation.properties, {
          force: true,
        });
      }
      const res = writeSelection(operation, { force: true });
      if (res.ok) state.previewCompare.reload();
      return res;
    },
  );

  handle('cauldron:undo', () => undoLast());
  handle('cauldron:redo', () => redoLast());
  handle('cauldron:text-undo', () => {
    state.window?.webContents.undo();
    return true;
  });
  handle('cauldron:text-redo', () => {
    state.window?.webContents.redo();
    return true;
  });

  handle('cauldron:save-drafts', (_event, drafts: Draft[]) => {
    if (!state.site) return false;
    const content = storedDrafts(state.site.root).filter(
      (draft) => draft.name === 'content',
    );
    const next = [...content, ...drafts];
    saveDrafts(state.site.root, next);
    send('cauldron:drafts', { drafts: next });
    return true;
  });

  handle('cauldron:merge-drafts', (_event, drafts: Draft[]) => {
    if (!state.site) return false;
    const next = mergeDraftsList(storedDrafts(state.site.root), drafts);
    saveDrafts(state.site.root, next);
    send('cauldron:drafts', { drafts: next });
    return true;
  });

  handle('cauldron:remove-drafts', (_event, keys: string[]) => {
    if (!state.site) return false;
    const existing = storedDrafts(state.site.root);
    const next = removeDraftKeys(existing, keys);
    if (next.length !== existing.length) {
      saveDrafts(state.site.root, next);
      send('cauldron:drafts', { drafts: next });
    }
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

  handle('cauldron:restore-all-drafts', () => {
    const result = restoreAllDrafts();
    if (result.ok) status('All drafts restored.');
    else fail(result.problem ?? 'Some drafts could not be restored.');
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
    recordRunComparison(site.root, run, after);
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

  handle('cauldron:run-undo', async (_event, id: string) => {
    const site = requireSite();
    if ('problem' in site) return site;
    const result = state.runs.undo(site.root, id);
    if (!result.ok) {
      status(result.problem);
      return { ok: false, problem: result.problem, clashes: result.clashes };
    }
    await reloadPreview();
    refreshSelectionFromDisk();
    await refreshSiteHealth();
    status('Run undone');
    return { ok: true };
  });

  handle('cauldron:runs', () => state.runs.list().map(runSummary));

  handle('cauldron:action-catalogue', () => actionCatalogue(state.site?.name));

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

  handle('cauldron:seo-list', () => {
    const site = requireSite();
    if ('problem' in site) return { entries: [], images: [] };
    return {
      entries: listSeoEntries(site.root),
      images: listPublicImages(site.root),
    };
  });

  handle('cauldron:seo-read', (_event, file: string) => {
    const site = requireSite();
    if ('problem' in site) return site;
    return readPageSeo(site.root, file);
  });

  handle(
    'cauldron:seo-save',
    (
      _event,
      payload: {
        file: string;
        baseHash: string;
        changes: Partial<SeoValues>;
      },
    ) => {
      const site = requireSite();
      if ('problem' in site) return { ok: false, problem: site.problem };
      const res = writePageSeo(
        site.root,
        payload.file,
        payload.baseHash,
        payload.changes ?? {},
      );
      if (!res.ok) {
        if (!res.conflict) fail(res.problem);
        return res;
      }
      for (const write of res.writes) {
        state.history.record({
          file: write.file,
          location: { file: write.file, line: 1, column: 1, name: 'head' },
          operation: { kind: 'text', value: '' },
          before: write.before,
          after: write.after,
          beforeHash: write.beforeHash,
          afterHash: write.afterHash,
          label: `SEO on ${payload.file}`,
          root: site.root,
        });
      }
      if (res.writes.length > 0) {
        pushHistory();
        state.preview.reload();
        state.previewCompare.reload();
        status(`Saved SEO for ${payload.file}`);
      }
      return { ok: true, entry: res.entry };
    },
  );

  handle('cauldron:repo-state', async () => {
    const site = requireSite();
    if ('problem' in site) return { isRepo: false, changes: [] };
    return repoStateAsync(site.root);
  });

  handle(
    'cauldron:publish',
    async (
      _event,
      payload: { message: string; push: boolean; unsavedBuffers?: number },
    ) => {
      const site = requireSite();
      if ('problem' in site) return site;
      status('Publishing changes…');
      const result = await publishAsync(site.root, payload);
      if (result.ok) {
        status(result.message);
      } else {
        fail(result.problem);
      }
      return result;
    },
  );

  handle('cauldron:export-static', async () => {
    const site = requireSite();
    if ('problem' in site) return site;
    status('Building static site…');
    const result = await exportStaticSiteAsync(site.root);
    if (result.ok && result.distPath) {
      status(`Built static site to ${result.distPath}`);
      shell.openPath(result.distPath);
    } else {
      fail(result.problem || 'Static export failed.');
    }
    return result;
  });

  handle(
    'cauldron:deploy-cloudflare',
    async (
      _event,
      payload?: { projectName?: string; writeWranglerConfig?: boolean },
    ) => {
      const site = requireSite();
      if ('problem' in site) return site;
      status('Deploying to Cloudflare Pages…');
      const result = await deployCloudflarePagesAsync(
        site.root,
        payload?.projectName || site.name,
        { writeWranglerConfig: payload?.writeWranglerConfig },
      );
      if (result.ok) {
        status(
          result.url
            ? `Cloudflare Pages ready: ${result.url}`
            : result.note ||
                "Deployed, but Cloudflare didn't report the address — check your Cloudflare dashboard.",
        );
      } else {
        fail(result.problem || 'Cloudflare Pages deployment failed.');
      }
      return result;
    },
  );

  handle(
    'cauldron:deploy-vercel',
    async (_event, payload?: { projectName?: string }) => {
      const site = requireSite();
      if ('problem' in site) return site;
      status('Deploying to Vercel…');
      const result = await deployVercelAsync(
        site.root,
        payload?.projectName || site.name,
      );
      if (result.ok) {
        status(
          result.url
            ? `Vercel ready: ${result.url}`
            : result.note ||
                "Deployed, but Vercel didn't report the address — check your Vercel dashboard.",
        );
      } else {
        fail(result.problem || 'Vercel deployment failed.');
      }
      return result;
    },
  );

  handle(
    'cauldron:deploy-github-pages',
    async (_event, payload?: { repoName?: string }) => {
      const site = requireSite();
      if ('problem' in site) return site;
      status('Deploying to GitHub Pages…');
      const result = await deployGitHubPagesAsync(
        site.root,
        payload?.repoName || site.name,
      );
      if (result.ok) {
        status(
          result.url
            ? `GitHub Pages ready: ${result.url}`
            : result.note ||
                'Pushed to gh-pages — check your repository Settings → Pages.',
        );
      } else {
        fail(result.problem || 'GitHub Pages deployment failed.');
      }
      return result;
    },
  );

  handle(
    'cauldron:stock-photos',
    (_event, payload?: { query?: string; directionId?: string }) => {
      return getCuratedPhotos(payload?.query, payload?.directionId);
    },
  );

  handle(
    'cauldron:save-asset-image',
    async (_event, payload: { fileName: string; base64: string }) => {
      const site = requireSite();
      if ('problem' in site) return site;
      try {
        const buffer = Buffer.from(payload.base64, 'base64');
        const res = saveAssetFile(site.root, payload.fileName, buffer);
        if (res.ok) {
          status(`Saved image to ${res.relativePath}`);
          state.preview.reload();
        } else {
          fail(res.problem);
        }
        return res;
      } catch (err) {
        const problem = `Could not process image: ${err instanceof Error ? err.message : String(err)}`;
        fail(problem);
        return {
          ok: false,
          problem,
        };
      }
    },
  );

  handle(
    'cauldron:save-stock-photo',
    async (_event, payload: { photoId: string; url: string }) => {
      const site = requireSite();
      if ('problem' in site) return site;
      const res = await downloadAndSaveStockPhoto(site.root, payload);
      if (res.ok) {
        status(`Saved image to ${res.relativePath}`);
        state.preview.reload();
      } else {
        fail(res.problem);
      }
      return res;
    },
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

  handle('cauldron:library', () => {
    return {
      pieces: [...LIBRARY, ...EXTENDED_LIBRARY].map((piece) => {
        // Showcase each component in a researched direction that suits it, so
        // the library shows real, varied colour. Insertion still adopts the
        // open site's own direction.
        const demo = demoDirectionFor(piece.id);
        return {
          id: piece.id,
          name: piece.name,
          category: piece.category,
          description: piece.description,
          licence: piece.licence,
          source: piece.source,
          needsScript: piece.needsScript,
          codeAllowed: piece.codeAllowed,
          previewHtml: piecePreview(piece, demo),
          directionName: demo.name,
        };
      }),
      links: LINKS_SHELF,
    };
  });

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
      status(
        result.reusedExisting
          ? `Placed existing ${result.componentFile} on ${result.page}`
          : `Added ${result.componentFile} to ${result.page}`,
      );
      return { ...result, runId: run.id };
    },
  );

  handle('cauldron:page-sections', (_event, page: string) => {
    const site = requireSite();
    if ('problem' in site) return site;
    return readPageSections(site.root, page);
  });

  handle(
    'cauldron:reorder-page-sections',
    (
      _event,
      payload: {
        page: string;
        fromIndex: number;
        toIndex: number;
        baseHash: string;
      },
    ) => {
      const res = sharedAction({ action: 'reorderPageSections', ...payload });
      if (res.ok) {
        state.preview.reload();
        state.previewCompare.reload();
        pushPreviewSections();
      }
      return res;
    },
  );

  handle(
    'cauldron:delete-page-section',
    (
      _event,
      payload: { page: string; sectionIndex: number; baseHash: string },
    ) => {
      const res = sharedAction({ action: 'deletePageSection', ...payload });
      if (res.ok) {
        state.preview.reload();
        state.previewCompare.reload();
        pushPreviewSections();
      }
      return res;
    },
  );

  handle(
    'cauldron:set-page-section-anchor',
    (
      _event,
      payload: {
        page: string;
        sectionIndex: number;
        anchorId: string;
        baseHash: string;
      },
    ) => {
      const res = sharedAction({ action: 'setPageSectionAnchor', ...payload });
      if (res.ok) {
        state.preview.reload();
        state.previewCompare.reload();
        pushPreviewSections();
      }
      return res;
    },
  );

  handle(
    'cauldron:duplicate-page-section',
    (
      _event,
      payload: {
        page: string;
        sectionIndex: number;
        baseHash: string;
      },
    ) => {
      const res = sharedAction({ action: 'duplicatePageSection', ...payload });
      if (res.ok) {
        state.preview.reload();
        state.previewCompare.reload();
        pushPreviewSections();
      }
      return res;
    },
  );

  handle(
    'cauldron:insert-page-section',
    (
      _event,
      payload: {
        page: string;
        afterIndex: number;
        sectionCode?: string;
        pieceId?: string;
        baseHash: string;
      },
    ) => {
      const res = sharedAction({ action: 'insertPageSection', ...payload });
      if (res.ok) {
        state.preview.reload();
        state.previewCompare.reload();
        pushPreviewSections();
      }
      return res;
    },
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
    async (_event, payload: { tool: AgentTool; request: string }) =>
      sendAgent(payload, payload?.tool === 'key' ? await keyModel() : null),
  );

  handle('cauldron:ai-status', () => keyStore().status());
  handle('cauldron:ai-settings', async (_event, next: unknown) => {
    try {
      const value = (next ?? {}) as { provider?: unknown; model?: unknown };
      keyStore().setSettings({ provider: value.provider, model: value.model });
      return { ok: true, status: await keyStore().status() };
    } catch (error) {
      return keyProblem(error);
    }
  });
  handle(
    'cauldron:ai-key-save',
    async (_event, provider: unknown, key: unknown) => {
      try {
        await keyStore().saveKey(provider, key);
        return { ok: true, status: await keyStore().status() };
      } catch (error) {
        return keyProblem(error);
      }
    },
  );
  handle('cauldron:ai-key-remove', async (_event, provider: unknown) => {
    if (isAiProvider(provider)) keyStore().removeKey(provider as AiProvider);
    return { ok: true, status: await keyStore().status() };
  });
  handle('cauldron:ai-test', async () => {
    const keyed = await keyModel();
    if (!keyed.ok) return keyed;
    const result = await testModel(keyed.model, keyed.label);
    return result.ok ? { ok: true } : { ok: false, problem: result.problem };
  });

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
  const created = sharedAction({
    action: 'createPage',
    page: page.path,
    title: page.title,
  });
  if (!created.ok) return created;

  const file = String(created.file);
  const clean = String(
    created.clean ??
      page.path
        .trim()
        .replace(/^\/+|\/+$/g, '')
        .replace(/\.astro$/, ''),
  );

  // Only poll/navigate when Cauldron's own preview dev server is running;
  // never fall back to an unowned port like 127.0.0.1:4321.
  const baseUrl = state.server?.url;
  if (!baseUrl) {
    status(`Created ${file}`);
    return { ok: true, file, url: null };
  }

  const url = new URL(`/${clean}/`, baseUrl).href;
  // Astro's route watcher is asynchronous. Wait for the new route, then
  // navigate once; loading its temporary 404 does not subscribe to HMR.
  let ready = false;
  for (let attempt = 0; attempt < 120; attempt++) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        ready = true;
        break;
      }
      const altResponse = await fetch(url.replace(/\/$/, ''));
      if (altResponse.ok) {
        ready = true;
        break;
      }
    } catch {
      /* The dev server may still be updating its route table. */
    }
    await new Promise((resolve) => setTimeout(resolve, 150));
  }
  if (!ready) {
    if (BACKGROUND_TEST || E2E_SITE) {
      console.error(
        `createPage failed to become ready: ${url} (server url: ${state.server?.url})`,
      );
    }
    return {
      ok: false,
      file,
      problem: `Created ${file}, but Astro has not made its preview ready yet.`,
    };
  }
  try {
    // The compare columns show whatever the single preview is showing, so a
    // page change reaches both.
    void state.previewCompare.load(url).catch(() => undefined);
    await state.preview.load(url);
    send('cauldron:preview', { running: true, url });
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    console.error(`createPage preview load failed for ${url}:`, error);
    fail(`Created ${file}, but the preview could not open it: ${detail}`);
    return {
      ok: false,
      file,
      problem: `Created ${file}, but the preview could not open it: ${detail}`,
    };
  }
  status(`Created ${file}`);
  return { ok: true, file, url };
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

function restoreAllDrafts(): {
  ok: boolean;
  restored: number;
  failed: number;
  problem?: string;
} {
  const site = requireSite();
  if ('problem' in site)
    return { ok: false, restored: 0, failed: 0, problem: site.problem };
  const queued = storedDrafts(site.root);
  if (queued.length === 0) return { ok: true, restored: 0, failed: 0 };

  const planned = planBatchDraftRestores(queued, (draftFile) => {
    const full = path.join(site.root, draftFile);
    if (!isInside(site.root, full) || !fs.existsSync(full)) return null;
    try {
      return readFile(full);
    } catch {
      return null;
    }
  });

  // When multiple drafts were typed against the same file snapshot, restoring the
  // first changes the file's hash on disk. Carry forward the verified post-write
  // hash only for drafts in this batch that started from that same snapshot.
  const rebasedHashes = new Map<string, string>();
  let restored = 0;
  let failed = 0;
  let firstProblem: string | undefined;

  for (const draft of planned) {
    const batchKey = `${draft.file}:${draft.baseHash}`;
    const currentBase = rebasedHashes.get(batchKey) ?? draft.baseHash;
    const outcome = restoreDraft({ ...draft, baseHash: currentBase });
    if (outcome.ok) {
      restored += 1;
      const full = path.join(site.root, draft.file);
      if (isInside(site.root, full) && fs.existsSync(full)) {
        rebasedHashes.set(batchKey, readFile(full).hash);
      }
    } else {
      failed += 1;
      if (!firstProblem) firstProblem = outcome.problem;
    }
  }

  return {
    ok: failed === 0,
    restored,
    failed,
    ...(firstProblem ? { problem: firstProblem } : {}),
  };
}

function registerPreviewIpc(): void {
  handle('cauldron:preview-bounds', (_event, bounds) => {
    state.preview.setBounds(bounds);
    return true;
  });

  // Side-by-side frames. The renderer measures its own columns and sends the
  // rectangles; main only places native views, so a resize never round-trips
  // through React state.
  handle('cauldron:preview-compare', async (_event, frames) => {
    if (!Array.isArray(frames)) return false;
    if (frames.length === 0) {
      state.previewCompare.clear();
      return true;
    }
    // A geometry update must not navigate: dragging a splitter fires this many
    // times a second, and reloading all three pages resets their scroll and
    // page state each time. New views load the current URL themselves.
    if (state.server) {
      state.previewCompare.setUrl(state.preview.currentUrl ?? state.server.url);
    }
    state.previewCompare.setFrames(frames);
    return true;
  });

  handle('cauldron:preview-reload', async () => {
    await reloadPreview();
    return true;
  });

  handle('cauldron:preview-open-page', async (_event, pageRoute: string) => {
    const site = requireSite();
    if ('problem' in site) return site;
    const baseUrl = state.server?.url;
    if (!baseUrl) {
      const problem = 'Start the preview to open that page.';
      status(problem);
      return { ok: false, problem };
    }
    const cleanRoute = `/${String(pageRoute ?? '').replace(/^\/+/, '')}`;
    const target = new URL(cleanRoute, baseUrl);
    if (target.origin !== new URL(baseUrl).origin) {
      return { ok: false, problem: 'Refusing to leave the local preview.' };
    }
    try {
      void state.previewCompare.load(target.href).catch(() => undefined);
      await state.preview.load(target.href);
      state.selection = null;
      send('cauldron:selection', null);
      send('cauldron:preview', { running: true, url: target.href });
      await refreshSiteHealth();
      status(`Opened ${cleanRoute}`);
      return { ok: true, url: target.href };
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      fail(`The preview could not open ${cleanRoute}: ${detail}`);
      return { ok: false, problem: `Could not open ${cleanRoute}: ${detail}` };
    }
  });

  handle(
    'cauldron:install-missing-packages',
    async (_event, packages?: string[]) => {
      if (!state.site) return { ok: false, problem: 'No site is open.' };
      const toInstall =
        Array.isArray(packages) && packages.length > 0
          ? packages
          : findMissingPackages(state.site.root);
      if (toInstall.length === 0) {
        return {
          ok: true,
          manager: state.site.packageManager,
          log: 'No missing packages found.',
          site: summaryOf(state.site),
        };
      }
      state.installPackages?.cancel();
      status(`Installing missing packages: ${toInstall.join(', ')}…`);
      const job = startInstallMissingPackages(state.site.root, toInstall, {
        storeDirOrUserData: pnpmStoreDir(),
      });
      state.installPackages = job;
      const result = await job.promise;
      if (state.installPackages === job) state.installPackages = null;
      if (result.ok) {
        state.buildError = null;
        status(`Installed ${toInstall.join(', ')}.`);
        if (state.server) {
          await reloadPreview();
        } else {
          await startPreview();
        }
        await refreshSiteHealth();
      } else {
        fail(result.problem ?? `Failed to install ${toInstall.join(', ')}.`);
      }
      return { ...result, site: summaryOf(state.site) };
    },
  );

  handle('cauldron:install-packages-cancel', () => {
    state.installPackages?.cancel();
    return true;
  });

  handle('cauldron:pick-mode', (_event, on: boolean) => {
    state.preview.webContents?.send('preview:mode', on);
    state.previewCompare.setPickMode(on);
    return true;
  });

  ipcMain.on(
    'preview:report',
    (event, report: { kind: string; payload: unknown }) => {
      const isMainPreview = event.sender === state.preview.webContents;
      const isCompareFrame = state.previewCompare.hasWebContents(event.sender);
      if (
        (!isMainPreview && !isCompareFrame) ||
        event.senderFrame !== event.sender.mainFrame
      )
        return;
      // Reject reports if the preview has navigated away from the local Astro server.
      const serverUrl = state.server?.url;
      const frameUrl = event.senderFrame?.url;
      if (!serverUrl || !frameUrl) return;
      try {
        if (new URL(frameUrl).origin !== new URL(serverUrl).origin) return;
      } catch {
        return;
      }
      if (report.kind === 'pick') {
        handlePick(report.payload);
        return;
      }
      // Compare frames only report click-to-select picks.
      if (!isMainPreview) return;
      if (report.kind === 'height') {
        send('cauldron:preview-height', report.payload);
        return;
      }
      if (report.kind === 'inline-text') {
        handleInlineTextEdit(report.payload);
        return;
      }
      if (report.kind === 'reorder-sections') {
        handleCanvasSectionReorder(report.payload);
      }
    },
  );
}

function writeResponsiveSelection(
  layer: 'tablet' | 'phone',
  properties: Record<string, string>,
  options?: { force?: boolean },
):
  | { ok: true; selection: unknown }
  | { ok: boolean; problem: string; conflict?: unknown } {
  const selection = state.selection;
  const site = state.site;
  if (!selection || !site) {
    return { ok: false, problem: 'Nothing is selected.' };
  }
  const existingResponsiveId =
    selection.snapshot.attributes.find(
      (attribute) => attribute.name === 'data-cauldron-r',
    )?.value ?? null;

  // Before modifying cauldron/responsive.css, verify the target file has not
  // changed on disk when we need to add `data-cauldron-r`.
  if (!existingResponsiveId && !options?.force) {
    const disk = readFile(selection.location.file);
    if (disk.hash !== hashOf(selection.snapshot.sourceText)) {
      return {
        ok: false,
        problem: 'The file changed on disk since this element was selected.',
        conflict: {
          file: relativeFile(selection.location.file),
          reason: 'The file changed on disk since this element was selected.',
        },
      };
    }
  }

  const responsiveId =
    existingResponsiveId ??
    allocateResponsiveId(
      site.root,
      selection.snapshot.sourceText,
      relativeFile(selection.location.file),
      selection.location.line,
      selection.location.column,
      selection.location.name,
    );

  // Wire & write responsive CSS first so an unsupported layout refuses visibly
  // before mutating the element's source file.
  const res = writeResponsiveStyle(site.root, responsiveId, layer, properties, {
    targetFile: selection.location.file,
  });
  if (!res.ok) {
    fail(res.problem);
    return { ok: false, problem: res.problem };
  }

  // If the target file itself received an import (standalone layout-less page),
  // keep the selection's line and snapshot aligned before adding data-cauldron-r.
  const selfWrite = res.writes.find(
    (write) => write.file === selection.location.file,
  );
  if (selfWrite) {
    const lineDelta =
      selfWrite.after.split('\n').length - selfWrite.before.split('\n').length;
    selection.location = {
      ...selection.location,
      line: Math.max(1, selection.location.line + lineDelta),
    };
    const updatedSnapshot = snapshotElement(
      selfWrite.after,
      selection.location,
    );
    if (updatedSnapshot) selection.snapshot = updatedSnapshot;
  }

  for (const write of res.writes) {
    state.history.record({
      file: write.file,
      location: selection.location,
      operation: { kind: 'style', properties },
      before: write.before,
      after: write.after,
      beforeHash: write.beforeHash,
      afterHash: write.afterHash,
      label: `${layer} style on <${selection.location.name}>`,
      created: write.created,
      root: site.root,
    });
  }

  if (!existingResponsiveId) {
    const tagged = writeSelection(
      {
        kind: 'attribute',
        name: 'data-cauldron-r',
        value: responsiveId,
      },
      options,
    );
    if (!tagged.ok) return tagged;
  }

  pushHistory();
  pushSelection();
  state.preview.reload();
  state.previewCompare.reload();
  status(`Saved ${layer} style override`);
  return { ok: true, selection: selectionView() };
}

function handleInlineTextEdit(payload: unknown): void {
  const site = state.site;
  if (!site) return;
  const edit = payload as {
    file?: string;
    line?: number;
    column?: number;
    name?: string;
    value?: string;
    url?: string;
  } | null;
  if (
    !edit?.file ||
    !edit.name ||
    !edit.line ||
    !edit.column ||
    typeof edit.value !== 'string'
  ) {
    return;
  }
  if (!isInside(site.root, edit.file)) {
    fail('That element comes from outside the site.');
    return;
  }
  // Bind inline edits strictly to the already-validated selection; never switch
  // state.selection to an untrusted payload reported from the preview DOM.
  const current = state.selection?.location;
  if (
    !current ||
    !state.selection?.snapshot.textEditable ||
    current.file !== edit.file ||
    current.line !== edit.line ||
    current.column !== edit.column ||
    current.name !== edit.name
  ) {
    state.preview.reload();
    return;
  }
  const outcome = writeSelection({ kind: 'text', value: edit.value });
  if (!outcome.ok) {
    fail(outcome.problem ?? 'That text could not be saved.');
    state.preview.reload();
    return;
  }
  state.previewCompare.reload();
  status(`Saved text on <${edit.name}>`);
}

function handleCanvasSectionReorder(payload: unknown): void {
  const site = state.site;
  const server = state.server;
  if (!site || !server) return;
  const req = payload as {
    fromIndex?: number;
    toIndex?: number;
    url?: string;
  } | null;
  if (
    !req ||
    !Number.isInteger(req.fromIndex) ||
    !Number.isInteger(req.toIndex) ||
    req.fromIndex === req.toIndex
  ) {
    return;
  }
  // Always derive the route from main's tracked preview URL, never from the
  // preview DOM's window.location.href (which page scripts can spoof via history.replaceState).
  const trackedUrl = state.preview.currentUrl ?? server.url;
  try {
    if (new URL(trackedUrl).origin !== new URL(server.url).origin) return;
  } catch {
    return;
  }
  const route = previewRouteFromUrl(trackedUrl);
  const read = readPageSections(site.root, route);
  if (!read.ok || typeof read.hash !== 'string') {
    fail(
      typeof read.problem === 'string'
        ? read.problem
        : 'Could not read sections to reorder.',
    );
    return;
  }
  const res = sharedAction({
    action: 'reorderPageSections',
    page: route,
    fromIndex: req.fromIndex as number,
    toIndex: req.toIndex as number,
    baseHash: read.hash,
  });
  if (!res.ok) {
    fail(
      typeof res.problem === 'string'
        ? res.problem
        : 'Could not reorder sections.',
    );
    return;
  }
  state.preview.reload();
  state.previewCompare.reload();
  pushPreviewSections();
  status('Reordered page sections');
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
const MAX_MCP_CALLS = 200;
const MAX_MCP_ARG_CHARS = 512;

/** Every tool call an outside agent made, bounded and without large file bodies (ticket 18 evidence). */
const mcpToolCalls: Array<{ name: string; args: Record<string, unknown> }> = [];

function summarizeMcpArgs(
  args: Record<string, unknown>,
): Record<string, unknown> {
  const summary: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(args)) {
    if (key === 'content' && typeof value === 'string') {
      summary[key] = `[${value.length} chars]`;
    } else if (typeof value === 'string' && value.length > MAX_MCP_ARG_CHARS) {
      summary[key] =
        `${value.slice(0, MAX_MCP_ARG_CHARS)}… [${value.length} chars]`;
    } else {
      summary[key] = value;
    }
  }
  return summary;
}

function recordMcpToolCall(call: {
  name: string;
  args: Record<string, unknown>;
}): void {
  if (mcpToolCalls.length >= MAX_MCP_CALLS) {
    mcpToolCalls.splice(0, mcpToolCalls.length - MAX_MCP_CALLS + 1);
  }
  mcpToolCalls.push({ name: call.name, args: summarizeMcpArgs(call.args) });
}
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
    checkedFiles: Object.fromEntries(checkedRunClaims.get(id) ?? []),
  });
  runClaims.delete(id);
  checkedRunClaims.delete(id);
  if (!run) return;
  recordRunComparison(site.root, run, after);
  if (note) state.runs.fail(id, note);

  if (run.files.length > 0) {
    const build = await buildSiteAsync(site.root);
    await refreshSiteHealth({ buildVerifiedOk: build.ok });
    let buildLogLine: string | null = null;
    if (!build.ok) {
      const lines = build.log
        .split('\n')
        .map((l) => l.trim())
        .filter(Boolean);
      buildLogLine =
        lines.find(
          (l) =>
            l.includes('Failed to resolve import') ||
            l.includes('Rolldown failed') ||
            l.includes('Cannot find module') ||
            l.toLowerCase().includes('error'),
        ) ??
        lines.at(-1) ??
        'astro build failed';
      state.buildError = buildLogLine;
      if (state.site) pushSiteSnapshot(state.site);
    }

    if (
      (!build.ok && state.missingPackages.length > 0) ||
      state.buildError ||
      buildLogLine
    ) {
      const problems: string[] = [];
      if (!build.ok && state.missingPackages.length > 0) {
        problems.push(
          `Missing package imports: ${state.missingPackages.join(', ')}`,
        );
      }
      if (state.buildError && !problems.includes(state.buildError)) {
        problems.push(state.buildError);
      }
      if (buildLogLine && !problems.includes(buildLogLine)) {
        problems.push(buildLogLine);
      }
      const primary = problems[0] ?? 'Build failed';
      state.runs.recordBuildFailure(
        run.id,
        problems,
        `${run.files.length} file${run.files.length === 1 ? '' : 's'} changed · Build failed: ${primary}`,
      );
    }
  } else {
    await refreshSiteHealth();
  }

  status(run.note);
  if (run.problems.length > 0)
    console.error(
      `Run ${run.id}: ${run.problems.join(', ')} could not be read. ${run.note}`,
    );
  send('cauldron:agent-done', { runId: id, note: run.note });
  agentDoneWaiter?.({
    ok: run.status !== 'failed' && !note,
    runId: id,
    note: run.note,
  });
  agentDoneWaiter = null;
}

function undoLast(): { ok: boolean; problem?: string } {
  const result = state.history.undo();
  if ('problem' in result) {
    status(result.problem);
    return { ok: false, problem: result.problem };
  }
  pushHistory();
  refreshSelectionFromDisk();
  state.preview.reload();
  state.previewCompare.reload();
  status('Undone');
  return { ok: true };
}

function redoLast(): { ok: boolean; problem?: string } {
  const result = state.history.redo();
  if ('problem' in result) {
    status(result.problem);
    return { ok: false, problem: result.problem };
  }
  pushHistory();
  refreshSelectionFromDisk();
  state.preview.reload();
  state.previewCompare.reload();
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
  if ((SMOKE || E2E_SITE || BACKGROUND_TEST) && !proof) return null;
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
    // Background test runs keep the window off-screen; the interface still
    // renders and is fully drivable over CDP, exactly like a shown window.
    if (!SMOKE && !E2E_SITE && !BACKGROUND_TEST && !window.isDestroyed())
      window.show();
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

  // Assign state.window before starting the renderer load so initial startup IPC
  // calls from the editor window are never rejected during page boot.
  editorRendererGone = false;
  state.window = window;
  state.preview.attach(window, path.join(__dirname, 'preview-preload.js'));
  state.previewCompare.attach(
    window,
    path.join(__dirname, 'preview-preload.js'),
  );
  state.preview.webContents?.on('did-finish-load', () => {
    if (state.site && state.server) {
      scheduleThumbnailCapture(state.site.root, state.server.url);
      pushPreviewSections();
    }
  });
  const syncPreviewNavigation = (url: string) => {
    if (!state.server) return;
    try {
      if (new URL(url).origin !== new URL(state.server.url).origin) return;
    } catch {
      return;
    }
    state.preview.noteNavigation(url);
    state.previewCompare.setUrl(url);
    send('cauldron:preview', { running: true, url });
  };
  state.preview.webContents?.on('did-navigate', (_event, url) => {
    syncPreviewNavigation(url);
  });
  state.preview.webContents?.on(
    'did-navigate-in-page',
    (_event, url, isMainFrame) => {
      if (!isMainFrame) return;
      syncPreviewNavigation(url);
    },
  );

  window.webContents.on('did-start-loading', () => {
    editorRendererGone = false;
  });

  window.webContents.on('render-process-gone', (_event, details) => {
    if (details.reason === 'clean-exit') return;
    editorRendererGone = true;
    reportUnexpectedError(
      'error',
      new Error(
        `Editor renderer exited unexpectedly (${details.reason}, exit code ${details.exitCode})`,
      ),
    );
  });

  const rendererUrl = MAIN_WINDOW_VITE_DEV_SERVER_URL;
  if (rendererUrl) void window.loadURL(rendererUrl);
  else
    void window.loadFile(
      path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`),
    );

  window.on('closed', () => {
    state.agent?.cancel();
    state.prepare?.cancel();
    state.installPackages?.cancel();
    state.window = null;
    // The view goes with the window; tear it down once, safely.
    state.preview.destroy();
    void stopPreview();
  });

  return window;
}

async function runE2eTests(): Promise<boolean> {
  if (!E2E_HARNESS_ENABLED || !E2E_SITE) return false;

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
        state.site
          ? repoStateAsync(state.site.root)
          : { isRepo: false, changes: [] },
      publish: (payload: { message: string; push: boolean }) =>
        state.site
          ? publishAsync(state.site.root, payload)
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
      stopPreview,
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
      previewClickLeaf: async () => {
        const contents = state.preview.webContents;
        if (!contents || contents.isDestroyed()) return null;
        const count = Number(
          await contents.executeJavaScript(
            `(() => {
              const wanted = ['H1','H2','H3','H4','P','LI','SPAN','BUTTON','A'];
              const all = [...document.querySelectorAll('[data-cauldron-source-loc], [data-astro-source-loc]')].filter((el) =>
                el.children.length === 0 &&
                el.textContent.trim().length > 2 &&
                wanted.includes(el.tagName)
              );
              all.sort((a, b) => wanted.indexOf(a.tagName) - wanted.indexOf(b.tagName));
              window.__cauldronLeafCandidates = all;
              return all.length;
            })()`,
          ),
        );
        if (!Number.isFinite(count) || count <= 0) return null;
        let fallback: { tag: string; text: string } | null = null;
        for (let index = 0; index < count; index += 1) {
          // Clear stale selection first so we wait for this click's own pick IPC.
          state.selection = null;
          const picked = (await contents.executeJavaScript(
            `(() => {
              const el = window.__cauldronLeafCandidates?.[${index}];
              if (!el) return null;
              el.click();
              return { tag: el.tagName.toLowerCase(), text: el.textContent };
            })()`,
          )) as { tag: string; text: string } | null;
          if (!picked) continue;
          if (!fallback) fallback = picked;
          const deadline = Date.now() + 800;
          while (Date.now() < deadline && !state.selection) {
            await new Promise((resolve) => setTimeout(resolve, 25));
          }
          const selected = state.selection as SelectionState | null;
          if (selected?.snapshot.textEditable) return picked;
        }
        if (fallback) {
          await contents.executeJavaScript(
            `window.__cauldronLeafCandidates?.[0]?.click();`,
          );
          const deadline = Date.now() + 800;
          while (Date.now() < deadline && !state.selection) {
            await new Promise((resolve) => setTimeout(resolve, 25));
          }
        }
        return fallback;
      },
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
        state.preview.webContents?.executeJavaScript(
          script,
        ) as Promise<unknown>,
      finishRun: async (id: string) => {
        if (!state.site) return { ok: false };
        await reloadPreview();
        const after = await collectLocs();
        const run = state.runs.finish(state.site.root, id, {
          outside: outsideWrites(runStartedAt(id)),
        });
        if (!run) return { ok: false };
        recordRunComparison(state.site.root, run, after);
        return {
          ok: true,
          compared: after.problem === null,
          run: {
            files: run.files.map((file) => file.file),
            deletedFiles: run.files
              .filter((file) => file.status === 'removed')
              .map((file) => file.file),
            highlighted: run.highlighted,
            cssChanges: run.cssChanges ?? [],
            otherPages: run.otherPages ?? [],
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
        clearMcpCallsLog();
      },
      buildPromptText: (request: string) => {
        const site = state.site;
        const direction = site ? directionFor(site.root) : null;
        return buildPrompt({
          request,
          siteName: site?.name ?? '',
          direction,
          selection: promptSelection(),
          catalogue: actionCatalogue(site?.name),
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

  // Closing the window used to throw "Object has been destroyed" and put a dialog
  // on screen. This exercises that exact path.
  if (process.env.CAULDRON_CLOSE_TEST) {
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
    return true;
  }

  const e2e = await import('./e2e');
  const api = harnessApi();
  const suites: Array<[string, () => Promise<void>]> = [
    ['CAULDRON_TASTE_TEST', () => e2e.runTasteTest()],
    [
      'CAULDRON_CHANGE_TASTE_TEST',
      () => e2e.runChangeTasteTest(E2E_SITE, api as never),
    ],
    [
      'CAULDRON_UI_TEST',
      () => e2e.runUiTest(E2E_SITE, state.window!, state.preview, openSiteAt),
    ],
    ['CAULDRON_PUBLISH_TEST', () => e2e.runPublishTest(E2E_SITE, api as never)],
    [
      'CAULDRON_PUBLISH_UI_TEST',
      () =>
        e2e.runPublishUiTest(E2E_SITE, state.window!, api as never, openSiteAt),
    ],
    ['CAULDRON_QUALITY_TEST', () => e2e.runQualityTest(E2E_SITE, api as never)],
    [
      'CAULDRON_QUALITY_FEEDBACK_TEST',
      () => e2e.runQualityFeedbackTest(E2E_SITE, state.window!, api as never),
    ],
    ['CAULDRON_LIBRARY_TEST', () => e2e.runLibraryTest(E2E_SITE, api as never)],
    ['CAULDRON_CONTENT_TEST', () => e2e.runContentTest(E2E_SITE, api as never)],
    [
      'CAULDRON_CODEX_TEST',
      () => e2e.runCodexProofTest(E2E_SITE, api as never),
    ],
    [
      'CAULDRON_HERMES_TEST',
      () => e2e.runHermesProofTest(E2E_SITE, api as never),
    ],
    ['CAULDRON_BRIEF_TEST', () => e2e.runBriefTest(E2E_SITE, api as never)],
    ['CAULDRON_AGENT_TEST', () => e2e.runAgentTest(E2E_SITE, api as never)],
    [
      'CAULDRON_CLAUDE_TEST',
      () => e2e.runClaudeProofTest(E2E_SITE, state.window!, api as never),
    ],
    [
      'CAULDRON_FAILURE_TEST',
      () =>
        e2e.runFailureTest(
          E2E_SITE,
          state.window!,
          api as never,
          openSiteAt,
          process.env.CAULDRON_FAILURE_CONTENT_SITE,
        ),
    ],
    [
      'CAULDRON_ACTIONS_TEST',
      () => e2e.runActionsParityTest(E2E_SITE, api as never, state.window!),
    ],
    [
      'CAULDRON_CRASH_TEST',
      () =>
        e2e.runCrashTest(
          E2E_SITE,
          state.window!,
          api as never,
          openSiteAt,
          process.env.CAULDRON_CRASH_TEST === 'restore' ? 'restore' : 'type',
        ),
    ],
    [
      'CAULDRON_COMPARE_TEST',
      () =>
        e2e.runCompareTest(E2E_SITE, state.window!, api as never, openSiteAt),
    ],
  ];

  for (const [envKey, runSuite] of suites) {
    if (process.env[envKey]) {
      await runSuite();
      return true;
    }
  }

  await e2e.runEndToEnd(E2E_SITE, api as never);
  return true;
}

async function isTextInputActiveIn(target: WebContents): Promise<boolean> {
  if (target.isDestroyed()) return false;
  try {
    return Boolean(
      await target.executeJavaScript(
        `(() => {
          const el = document.activeElement;
          if (!el || !(el instanceof HTMLElement)) return false;
          if (el.isContentEditable || el.tagName === 'TEXTAREA') return true;
          if (el.tagName === 'INPUT') {
            const type = (el.type || 'text').toLowerCase();
            return !['button','submit','reset','checkbox','radio','file','image','range','color'].includes(type);
          }
          return false;
        })()`,
      ),
    );
  } catch (error) {
    console.warn(
      'Could not inspect preview activeElement for undo routing:',
      error,
    );
    return false;
  }
}

async function routeEditShortcut(kind: 'undo' | 'redo'): Promise<void> {
  const focused = webContents.getFocusedWebContents();
  const editor = state.window?.webContents;
  if (focused && (!editor || focused.id !== editor.id)) {
    const preview = state.preview.webContents;
    if (preview && focused.id === preview.id) {
      if (await isTextInputActiveIn(focused)) {
        if (kind === 'undo') focused.undo();
        else focused.redo();
        return;
      }
      send('cauldron:menu', { action: kind, editorFocused: false });
      return;
    }
    if (kind === 'undo') focused.undo();
    else focused.redo();
    return;
  }
  send('cauldron:menu', { action: kind, editorFocused: true });
}

export function start(): void {
  process.on('exit', () => {
    state.server?.stop();
    state.mcp?.close();
  });
  // Surface uncaught errors and unhandled promise rejections visibly and in
  // the console rather than swallowing async failures silently.
  registerUnexpectedErrorHandlers(process, reportUnexpectedError);

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
    if ((SMOKE || E2E_SITE || BACKGROUND_TEST) && process.platform === 'darwin')
      app.dock?.hide();
    // Development runs otherwise show Electron's own icon in the Dock. The
    // packaged app reads build/icon.icns from its bundle.
    if (
      !app.isPackaged &&
      !SMOKE &&
      !E2E_SITE &&
      !BACKGROUND_TEST &&
      process.platform === 'darwin'
    ) {
      try {
        app.dock?.setIcon(path.join(app.getAppPath(), 'build/icon.png'));
      } catch (error) {
        console.error('The Cauldron Dock icon could not be set:', error);
      }
    }
    Menu.setApplicationMenu(
      buildMenu({
        onNewProject: () => send('cauldron:menu', { action: 'new-project' }),
        onOpenProject: () => send('cauldron:menu', { action: 'open-project' }),
        onProjectHome: () => send('cauldron:menu', { action: 'project-home' }),
        onUndo: () => {
          void routeEditShortcut('undo');
        },
        onRedo: () => {
          void routeEditShortcut('redo');
        },
      }),
    );
    if (!SMOKE) await cleanupOrphanedDevServers();
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
          // Let initial React mount effects finish before app.exit tears down state.window.
          if (!shot) await new Promise((resolve) => setTimeout(resolve, 150));
          console.log('SMOKE PASS: window created and interface rendered');
          app.exit(0);
        } else {
          console.error('SMOKE FAIL: interface root was empty');
          app.exit(1);
        }
      });
    }

    if (E2E_HARNESS_ENABLED && E2E_SITE && (await runE2eTests())) return;

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
  });

  app.on('window-all-closed', () => {
    // A window closing while an install runs must not leave the pnpm child
    // running detached from any UI (issue 32).
    state.prepare?.cancel();
    if (process.platform !== 'darwin') app.quit();
  });

  app.on('before-quit', () => {
    state.agent?.cancel();
    state.prepare?.cancel();
    state.server?.stop();
    state.mcp?.close();
    clearHermesConnection();
    mcpToolCalls.length = 0;
    clearMcpCallsLog();
  });
}
