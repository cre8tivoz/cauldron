/// <reference types="@electron-forge/plugin-vite/forge-vite-env" />
declare module '*.css';

// This file is a plain script on purpose: the declarations below apply everywhere.
type CauldronSite = {
  root: string;
  name: string;
  astroVersion: string;
  packageManager: 'npm' | 'pnpm' | 'yarn';
  hasDependencies: boolean;
};

type CauldronSelection = {
  id: string;
  file: string;
  line: number;
  column: number;
  name: string;
  text: string;
  textEditable: boolean;
  attributes: Array<{ name: string; value: string }>;
  style: Record<string, string>;
  pageUrl: string;
  domPath: string;
  history: { canUndo: boolean; canRedo: boolean };
};

type CauldronDraft = {
  key: string;
  file: string;
  line: number;
  column: number;
  name: string;
  field: string;
  value: string;
  savedAt: number;
};

type CauldronRun = {
  id: string;
  tool: string;
  prompt: string;
  status: 'running' | 'finished' | 'failed';
  note: string;
  startedAt: number;
  finishedAt: number | null;
  files: string[];
  highlighted: Array<{ loc: string; text: string }>;
};

type WriteOutcome = {
  ok: boolean;
  problem?: string;
  conflict?: { file: string; diskText: string; reason: string };
  selection?: CauldronSelection;
};

type CauldronApi = {
  openSiteDialog: () => Promise<
    | { cancelled: true }
    | { site: CauldronSite }
    | { problem: string; detail: string }
  >;
  openSite: (root: string) => Promise<unknown>;
  state: () => Promise<{
    site: CauldronSite | null;
    running: boolean;
    url: string | null;
    status: string[];
    selection: CauldronSelection | null;
    drafts: CauldronDraft[];
  }>;
  startPreview: () => Promise<
    { url: string } | { problem: string; detail: string }
  >;
  stopPreview: () => Promise<boolean>;
  reloadPreview: () => Promise<boolean>;
  setPreviewBounds: (bounds: {
    x: number;
    y: number;
    width: number;
    height: number;
  }) => Promise<boolean>;
  pickMode: (on: boolean) => Promise<boolean>;
  applyText: (value: string) => Promise<WriteOutcome>;
  applyAttribute: (name: string, value: string | null) => Promise<WriteOutcome>;
  applyStyle: (properties: Record<string, string>) => Promise<WriteOutcome>;
  forceWrite: (operation: unknown) => Promise<WriteOutcome>;
  startRun: (
    payload: { tool: string; prompt: string },
  ) => Promise<{ ok: boolean; run?: CauldronRun; problem?: string }>;
  finishRun: (id: string) => Promise<{ ok: boolean; run?: CauldronRun; problem?: string }>;
  undoRun: (
    id: string,
  ) => Promise<{ ok: boolean; problem?: string; clashes?: string[] }>;
  runs: () => Promise<CauldronRun[]>;
  highlight: (id: string, on: boolean) => Promise<boolean>;
  runAction: (request: unknown) => Promise<{ ok: boolean; [key: string]: unknown }>;
  actionCatalogue: () => Promise<Array<{ name: string; what: string }>>;

  refreshSelection: () => Promise<CauldronSelection | null>;
  undo: () => Promise<{ ok: boolean; problem?: string }>;
  redo: () => Promise<{ ok: boolean; problem?: string }>;
  clearSelection: () => Promise<boolean>;
  saveDrafts: (drafts: CauldronDraft[]) => Promise<boolean>;
  discardDrafts: () => Promise<boolean>;
  restoreDraft: (
    draft: CauldronDraft,
  ) => Promise<{ ok: boolean; problem?: string }>;
  newPage: (page: {
    path: string;
    title: string;
  }) => Promise<{ ok: true; file: string; url: string } | { problem: string }>;
  on: (channel: string, callback: (payload: never) => void) => () => void;
};

interface Window {
  cauldron: CauldronApi;
}
