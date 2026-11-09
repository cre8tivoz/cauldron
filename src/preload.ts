import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron';

const EVENTS = [
  'cauldron:site',
  'cauldron:preview',
  'cauldron:status',
  'cauldron:selection',
  'cauldron:preview-height',
  'cauldron:drafts',
  'cauldron:agent-event',
  'cauldron:agent-done',
  'cauldron:menu',
  'cauldron:prepare-progress',
] as const;

type EventName = (typeof EVENTS)[number];

const api = {
  openSiteDialog: () => ipcRenderer.invoke('cauldron:open-site-dialog'),
  openSite: (root: string) => ipcRenderer.invoke('cauldron:open-site', root),
  state: () => ipcRenderer.invoke('cauldron:site-state'),

  startPreview: () => ipcRenderer.invoke('cauldron:start-preview'),
  stopPreview: () => ipcRenderer.invoke('cauldron:stop-preview'),
  reloadPreview: () => ipcRenderer.invoke('cauldron:preview-reload'),
  setPreviewBounds: (bounds: {
    x: number;
    y: number;
    width: number;
    height: number;
  }) => ipcRenderer.invoke('cauldron:preview-bounds', bounds),
  pickMode: (on: boolean) => ipcRenderer.invoke('cauldron:pick-mode', on),

  applyText: (value: string) =>
    ipcRenderer.invoke('cauldron:apply-text', value),
  applyAttribute: (name: string, value: string | null) =>
    ipcRenderer.invoke('cauldron:apply-attribute', name, value),
  applyStyle: (properties: Record<string, string>) =>
    ipcRenderer.invoke('cauldron:apply-style', properties),
  forceWrite: (operation: unknown) =>
    ipcRenderer.invoke('cauldron:force-write', operation),

  startRun: (payload: { tool: string; prompt: string }) =>
    ipcRenderer.invoke('cauldron:run-start', payload),
  finishRun: (id: string) => ipcRenderer.invoke('cauldron:run-finish', id),
  undoRun: (id: string) => ipcRenderer.invoke('cauldron:run-undo', id),
  runs: () => ipcRenderer.invoke('cauldron:runs'),
  highlight: (id: string, on: boolean) =>
    ipcRenderer.invoke('cauldron:highlight', id, on),
  runAction: (request: unknown) =>
    ipcRenderer.invoke('cauldron:run-action', request),
  actionCatalogue: () => ipcRenderer.invoke('cauldron:action-catalogue'),

  directions: () => ipcRenderer.invoke('cauldron:directions'),
  direction: () => ipcRenderer.invoke('cauldron:direction'),
  referenceDirection: (url: string) =>
    ipcRenderer.invoke('cauldron:reference-direction', url),
  setDirection: (id: string) =>
    ipcRenderer.invoke('cauldron:set-direction', id),
  agentSend: (payload: { tool: string; request: string }) =>
    ipcRenderer.invoke('cauldron:agent-send', payload),
  agentCancel: () => ipcRenderer.invoke('cauldron:agent-cancel'),
  mcpInfo: () => ipcRenderer.invoke('cauldron:mcp-info'),
  collections: () => ipcRenderer.invoke('cauldron:collections'),
  entry: (file: string) => ipcRenderer.invoke('cauldron:entry', file),
  saveEntry: (payload: {
    file: string;
    baseHash: string;
    change: Record<string, string>;
    keepMine?: boolean;
  }) => ipcRenderer.invoke('cauldron:save-entry', payload),
  library: () => ipcRenderer.invoke('cauldron:library'),
  repoState: () => ipcRenderer.invoke('cauldron:repo-state'),
  publish: (payload: {
    message: string;
    push: boolean;
    unsavedBuffers?: number;
  }) => ipcRenderer.invoke('cauldron:publish', payload),
  macBuild: () => ipcRenderer.invoke('cauldron:mac-build'),
  qualityRun: (payload: { pages?: string[] }) =>
    ipcRenderer.invoke('cauldron:quality-run', payload),
  addPiece: (payload: {
    pieceId: string;
    page: string;
    mode: 'add' | 'replace';
    replaceSelector?: string;
  }) => ipcRenderer.invoke('cauldron:add-piece', payload),

  refreshSelection: () => ipcRenderer.invoke('cauldron:refresh-selection'),
  undo: () => ipcRenderer.invoke('cauldron:undo'),
  redo: () => ipcRenderer.invoke('cauldron:redo'),
  clearSelection: () => ipcRenderer.invoke('cauldron:selection-clear'),

  contentDraft: (payload: {
    file: string;
    field: string;
    value: string | null;
    baseHash: string;
    schemaHash: string;
  }) => ipcRenderer.invoke('cauldron:content-draft', payload),
  saveDrafts: (drafts: unknown[]) =>
    ipcRenderer.invoke('cauldron:save-drafts', drafts),
  discardDrafts: () => ipcRenderer.invoke('cauldron:discard-drafts'),
  restoreDraft: (draft: unknown) =>
    ipcRenderer.invoke('cauldron:restore-draft', draft),
  newPage: (page: { path: string; title: string }) =>
    ipcRenderer.invoke('cauldron:new-page', page),

  // Project home (issue 32). The native folder picker is invoked through the
  // main process only; the renderer never gets raw dialog power.
  projectsHome: () => ipcRenderer.invoke('cauldron:projects-home'),
  createProject: (payload: { name: string; parent: string }) =>
    ipcRenderer.invoke('cauldron:create-project', payload),
  chooseProjectParent: () =>
    ipcRenderer.invoke('cauldron:choose-project-parent'),
  detectDependencies: (root: string) =>
    ipcRenderer.invoke('cauldron:detect-dependencies', root),
  prepareDependencies: (root: string) =>
    ipcRenderer.invoke('cauldron:prepare-dependencies', root),
  cancelPrepare: () => ipcRenderer.invoke('cauldron:prepare-cancel'),
  installMissingPackages: (packages?: string[]) =>
    ipcRenderer.invoke('cauldron:install-missing-packages', packages),
  removeRecent: (projectPath: string) =>
    ipcRenderer.invoke('cauldron:remove-recent', projectPath),
  /** Test-only preview introspection; the main process answers only under CAULDRON_BACKGROUND_TEST. */
  testPreviewIntrospect: () =>
    ipcRenderer.invoke('cauldron:test-preview-introspect') as Promise<unknown>,

  on: (channel: EventName, callback: (payload: never) => void) => {
    if (!EVENTS.includes(channel)) throw new Error(`Unknown event: ${channel}`);
    const listener = (_event: IpcRendererEvent, payload: unknown) =>
      callback(payload as never);
    ipcRenderer.on(channel, listener);
    return () => ipcRenderer.removeListener(channel, listener);
  },
};

contextBridge.exposeInMainWorld('cauldron', api);
