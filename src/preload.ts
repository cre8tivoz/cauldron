import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron';

const EVENTS = [
  'cauldron:site',
  'cauldron:preview',
  'cauldron:status',
  'cauldron:selection',
  'cauldron:preview-height',
  'cauldron:drafts',
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

  refreshSelection: () => ipcRenderer.invoke('cauldron:refresh-selection'),
  undo: () => ipcRenderer.invoke('cauldron:undo'),
  redo: () => ipcRenderer.invoke('cauldron:redo'),
  clearSelection: () => ipcRenderer.invoke('cauldron:selection-clear'),

  saveDrafts: (drafts: unknown[]) =>
    ipcRenderer.invoke('cauldron:save-drafts', drafts),
  discardDrafts: () => ipcRenderer.invoke('cauldron:discard-drafts'),
  restoreDraft: (draft: unknown) =>
    ipcRenderer.invoke('cauldron:restore-draft', draft),
  newPage: (page: { path: string; title: string }) =>
    ipcRenderer.invoke('cauldron:new-page', page),

  on: (channel: EventName, callback: (payload: never) => void) => {
    if (!EVENTS.includes(channel)) throw new Error(`Unknown event: ${channel}`);
    const listener = (_event: IpcRendererEvent, payload: unknown) =>
      callback(payload as never);
    ipcRenderer.on(channel, listener);
    return () => ipcRenderer.removeListener(channel, listener);
  },
};

contextBridge.exposeInMainWorld('cauldron', api);
