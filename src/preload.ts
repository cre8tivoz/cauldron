import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron';
import type {
  CauldronCollection,
  CauldronCreatedProject,
  CauldronDependencySetup,
  CauldronDirectionSummary,
  CauldronDraft,
  CauldronEntry,
  CauldronOpenResult,
  CauldronPageSectionResult,
  CauldronPiece,
  CauldronRecent,
  CauldronRun,
  CauldronSelection,
  CauldronSite,
  CauldronStarterTemplate,
  CauldronStockPhoto,
  QualityReport,
  WriteOutcome,
} from './cauldron-types';

const EVENTS = [
  'cauldron:site',
  'cauldron:preview',
  'cauldron:status',
  'cauldron:problem',
  'cauldron:selection',
  'cauldron:history',
  'cauldron:preview-height',
  'cauldron:drafts',
  'cauldron:agent-event',
  'cauldron:agent-done',
  'cauldron:menu',
  'cauldron:prepare-progress',
] as const;

export type CauldronEventName = (typeof EVENTS)[number];

function invoke<Result>(channel: string, ...args: unknown[]): Promise<Result> {
  return ipcRenderer.invoke(channel, ...args) as Promise<Result>;
}

const api = {
  openSiteDialog: () =>
    invoke<
      | { cancelled: true }
      | { picked: string }
      | { problem: string; detail: string }
    >('cauldron:open-site-dialog'),
  openSite: (root: string) =>
    invoke<CauldronOpenResult>('cauldron:open-site', root),
  state: () =>
    invoke<{
      site: CauldronSite | null;
      running: boolean;
      url: string | null;
      status: string[];
      problem?: string | null;
      direction?: CauldronDirectionSummary | null;
      selection: CauldronSelection | null;
      drafts: CauldronDraft[];
      history?: { canUndo: boolean; canRedo: boolean };
    }>('cauldron:site-state'),

  startPreview: () =>
    invoke<{ url: string } | { problem: string; detail: string }>(
      'cauldron:start-preview',
    ),
  stopPreview: () => invoke<boolean>('cauldron:stop-preview'),
  reloadPreview: () => invoke<boolean>('cauldron:preview-reload'),
  openPreviewPage: (page: string) =>
    invoke<{ ok: boolean; url?: string; problem?: string }>(
      'cauldron:preview-open-page',
      page,
    ),
  setPreviewBounds: (bounds: {
    x: number;
    y: number;
    width: number;
    height: number;
  }) => invoke<boolean>('cauldron:preview-bounds', bounds),
  pickMode: (on: boolean) => invoke<boolean>('cauldron:pick-mode', on),

  applyText: (value: string) =>
    invoke<WriteOutcome>('cauldron:apply-text', value),
  applyAttribute: (name: string, value: string | null) =>
    invoke<WriteOutcome>('cauldron:apply-attribute', name, value),
  applyStyle: (properties: Record<string, string>) =>
    invoke<WriteOutcome>('cauldron:apply-style', properties),
  forceWrite: (operation: unknown) =>
    invoke<WriteOutcome>('cauldron:force-write', operation),

  startRun: (payload: { tool: string; prompt: string }) =>
    invoke<{ ok: boolean; run?: CauldronRun; problem?: string }>(
      'cauldron:run-start',
      payload,
    ),
  finishRun: (id: string) =>
    invoke<{ ok: boolean; run?: CauldronRun; problem?: string }>(
      'cauldron:run-finish',
      id,
    ),
  undoRun: (id: string) =>
    invoke<{ ok: boolean; problem?: string; clashes?: string[] }>(
      'cauldron:run-undo',
      id,
    ),
  runs: () => invoke<CauldronRun[]>('cauldron:runs'),
  highlight: (id: string, on: boolean) =>
    invoke<boolean>('cauldron:highlight', id, on),
  runAction: (request: unknown) =>
    invoke<{ ok: boolean; [key: string]: unknown }>(
      'cauldron:run-action',
      request,
    ),
  actionCatalogue: () =>
    invoke<Array<{ name: string; what: string }>>('cauldron:action-catalogue'),

  directions: () => invoke<CauldronDirectionSummary[]>('cauldron:directions'),
  direction: () =>
    invoke<CauldronDirectionSummary | null>('cauldron:direction'),
  referenceDirection: (url: string) =>
    invoke<{
      ok: boolean;
      problem?: string;
      direction?: CauldronDirectionSummary;
    }>('cauldron:reference-direction', url),
  setDirection: (id: string) =>
    invoke<{ ok: boolean; problem?: string }>('cauldron:set-direction', id),
  agentSend: (payload: { tool: string; request: string }) =>
    invoke<{ ok: boolean; runId?: string; problem?: string }>(
      'cauldron:agent-send',
      payload,
    ),
  agentCancel: () => invoke<boolean>('cauldron:agent-cancel'),
  collections: () =>
    invoke<{ collections: CauldronCollection[] }>('cauldron:collections'),
  entry: (file: string) =>
    invoke<CauldronEntry | { problem: string }>('cauldron:entry', file),
  saveEntry: (payload: {
    file: string;
    baseHash: string;
    change: Record<string, string>;
    keepMine?: boolean;
  }) =>
    invoke<{
      ok: boolean;
      problem?: string;
      hash?: string;
      conflict?: boolean;
      conflictCopy?: string;
    }>('cauldron:save-entry', payload),
  library: () =>
    invoke<{
      pieces: CauldronPiece[];
      links: Array<{ name: string; url: string; why: string }>;
    }>('cauldron:library'),
  repoState: () =>
    invoke<{
      isRepo: boolean;
      branch: string;
      changes: Array<{ status: string; file: string }>;
      hasRemote: boolean;
      remote: string | null;
      lastCommit: string;
      unpushed: number;
    }>('cauldron:repo-state'),
  publish: (payload: {
    message: string;
    push: boolean;
    unsavedBuffers?: number;
  }) =>
    invoke<{
      ok: boolean;
      problem?: string;
      details?: string;
      committed?: number;
      pushed?: boolean;
      commit?: string;
      upload?: string;
      message?: string;
    }>('cauldron:publish', payload),
  exportStatic: () =>
    invoke<{
      ok: boolean;
      distPath?: string;
      problem?: string;
      log?: string;
    }>('cauldron:export-static'),
  deployCloudflare: (projectName?: string) =>
    invoke<{
      ok: boolean;
      url?: string;
      note?: string;
      isAuthError?: boolean;
      createdFiles?: string[];
      problem?: string;
      log?: string;
    }>('cauldron:deploy-cloudflare', { projectName }),
  deployVercel: (projectName?: string) =>
    invoke<{
      ok: boolean;
      url?: string;
      note?: string;
      isAuthError?: boolean;
      problem?: string;
      log?: string;
    }>('cauldron:deploy-vercel', { projectName }),
  deployGitHubPages: (repoName?: string) =>
    invoke<{
      ok: boolean;
      url?: string;
      note?: string;
      isAuthError?: boolean;
      problem?: string;
      log?: string;
    }>('cauldron:deploy-github-pages', { repoName }),
  stockPhotos: (query?: string, directionId?: string) =>
    invoke<CauldronStockPhoto[]>('cauldron:stock-photos', {
      query,
      directionId,
    }),
  saveAssetImage: (payload: { fileName: string; base64: string }) =>
    invoke<{ ok: true; relativePath: string } | { ok: false; problem: string }>(
      'cauldron:save-asset-image',
      payload,
    ),
  saveStockPhoto: (payload: { photoId: string; url: string }) =>
    invoke<{ ok: true; relativePath: string } | { ok: false; problem: string }>(
      'cauldron:save-stock-photo',
      payload,
    ),
  qualityRun: (payload: { pages?: string[] }) =>
    invoke<QualityReport>('cauldron:quality-run', payload),
  addPiece: (payload: {
    pieceId: string;
    page: string;
    mode: 'add' | 'replace';
    replaceSelector?: string;
  }) =>
    invoke<{
      ok: boolean;
      problem?: string;
      componentFile?: string;
      page?: string;
      replaced?: string;
      reusedExisting?: boolean;
      runId?: string;
    }>('cauldron:add-piece', payload),
  pageSections: (page: string) =>
    invoke<CauldronPageSectionResult>('cauldron:page-sections', page),
  reorderPageSections: (payload: {
    page: string;
    fromIndex: number;
    toIndex: number;
    baseHash: string;
  }) =>
    invoke<CauldronPageSectionResult>(
      'cauldron:reorder-page-sections',
      payload,
    ),
  deletePageSection: (payload: {
    page: string;
    sectionIndex: number;
    baseHash: string;
  }) =>
    invoke<CauldronPageSectionResult>('cauldron:delete-page-section', payload),
  setPageSectionAnchor: (payload: {
    page: string;
    sectionIndex: number;
    anchorId: string;
    baseHash: string;
  }) =>
    invoke<CauldronPageSectionResult>(
      'cauldron:set-page-section-anchor',
      payload,
    ),
  duplicatePageSection: (payload: {
    page: string;
    sectionIndex: number;
    baseHash: string;
  }) =>
    invoke<CauldronPageSectionResult>(
      'cauldron:duplicate-page-section',
      payload,
    ),
  insertPageSection: (payload: {
    page: string;
    afterIndex: number;
    sectionCode?: string;
    pieceId?: string;
    baseHash: string;
  }) =>
    invoke<CauldronPageSectionResult>('cauldron:insert-page-section', payload),

  refreshSelection: () =>
    invoke<CauldronSelection | null>('cauldron:refresh-selection'),
  undo: () => invoke<{ ok: boolean; problem?: string }>('cauldron:undo'),
  redo: () => invoke<{ ok: boolean; problem?: string }>('cauldron:redo'),
  textUndo: () => invoke<boolean>('cauldron:text-undo'),
  textRedo: () => invoke<boolean>('cauldron:text-redo'),
  clearSelection: () => invoke<boolean>('cauldron:selection-clear'),

  contentDraft: (payload: {
    file: string;
    field: string;
    value: string | null;
    baseHash: string;
    schemaHash: string;
  }) => invoke<boolean>('cauldron:content-draft', payload),
  saveDrafts: (drafts: CauldronDraft[]) =>
    invoke<boolean>('cauldron:save-drafts', drafts),
  mergeDrafts: (drafts: CauldronDraft[]) =>
    invoke<boolean>('cauldron:merge-drafts', drafts),
  removeDrafts: (keys: string[]) =>
    invoke<boolean>('cauldron:remove-drafts', keys),
  discardDrafts: () => invoke<boolean>('cauldron:discard-drafts'),
  restoreDraft: (draft: CauldronDraft) =>
    invoke<{ ok: boolean; problem?: string }>('cauldron:restore-draft', draft),
  restoreAllDrafts: () =>
    invoke<{
      ok: boolean;
      restored: number;
      failed: number;
      problem?: string;
    }>('cauldron:restore-all-drafts'),
  newPage: (page: { path: string; title: string }) =>
    invoke<
      | { ok: true; file: string; url: string | null }
      | { ok?: false; file?: string; problem: string }
    >('cauldron:new-page', page),

  // Project home (issue 32). The native folder picker is invoked through the
  // main process only; the renderer never gets raw dialog power.
  projectsHome: () =>
    invoke<{ problem: string | null; projects: CauldronRecent[] }>(
      'cauldron:projects-home',
    ),
  createProject: (payload: {
    name: string;
    parent: string;
    template?: string;
  }) =>
    invoke<
      | { ok: true; project: CauldronCreatedProject }
      | { problem: string; detail: string }
    >('cauldron:create-project', payload),
  starterTemplates: () =>
    invoke<CauldronStarterTemplate[]>('cauldron:starter-templates'),
  chooseProjectParent: () =>
    invoke<{ cancelled: boolean; path: string | null }>(
      'cauldron:choose-project-parent',
    ),
  detectDependencies: (root: string) =>
    invoke<{
      site: CauldronSite | null;
      problem: string | null;
      setup: CauldronDependencySetup;
    }>('cauldron:detect-dependencies', root),
  prepareDependencies: (root: string) =>
    invoke<{ ok: boolean; problem?: string }>(
      'cauldron:prepare-dependencies',
      root,
    ),
  cancelPrepare: () => invoke<boolean>('cauldron:prepare-cancel'),
  installMissingPackages: (packages?: string[]) =>
    invoke<{
      ok: boolean;
      cancelled?: boolean;
      timedOut?: boolean;
      manager?: string;
      storeDir?: string;
      log?: string;
      problem?: string;
      site?: CauldronSite;
    }>('cauldron:install-missing-packages', packages),
  cancelInstallPackages: () =>
    invoke<boolean>('cauldron:install-packages-cancel'),
  removeRecent: (projectPath: string) =>
    invoke<{ ok: boolean; problem?: string }>(
      'cauldron:remove-recent',
      projectPath,
    ),
  /** Test-only preview introspection; the main process answers only under CAULDRON_BACKGROUND_TEST. */
  testPreviewIntrospect: () =>
    invoke<unknown>('cauldron:test-preview-introspect'),

  on: (
    channel: CauldronEventName,
    callback: (payload: never) => void,
  ): (() => void) => {
    if (!EVENTS.includes(channel)) throw new Error(`Unknown event: ${channel}`);
    const listener = (_event: IpcRendererEvent, payload: unknown) =>
      callback(payload as never);
    ipcRenderer.on(channel, listener);
    return () => {
      ipcRenderer.removeListener(channel, listener);
    };
  },
};

export type CauldronApi = typeof api;

contextBridge.exposeInMainWorld('cauldron', api);
