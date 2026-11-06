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

type CauldronDirectionSummary = {
  id: string;
  name: string;
  forWhom: string;
  learnedFrom: string;
  colours: Record<string, string>;
  fonts: { display: string; body: string };
  typeScale: number[];
  spacing: number[];
  radii: number[];
  character: string;
  watch: string;
};

type CauldronAgentEvent =
  | { type: 'session' }
  | { type: 'text'; text: string }
  | { type: 'tool'; name: string }
  | { type: 'status'; text: string }
  | { type: 'done'; text: string }
  | { type: 'error'; text: string };

type QualityFinding = {
  id: string;
  label: string;
  status: 'pass' | 'fail' | 'unknown';
  detail: string;
  page?: string;
  width?: number;
};

type QualityReport = {
  built: boolean;
  builtAt: string;
  buildLog: string;
  findings: QualityFinding[];
  measured: Array<{ label: string; value: string }>;
};

type CauldronPiece = {
  id: string;
  name: string;
  category: 'intro' | 'footer' | 'button' | 'heading' | 'background';
  description: string;
  licence: string;
  source: string;
  needsScript: boolean;
  codeAllowed: boolean;
  previewHtml: string;
};

type CauldronCollection = {
  name: string;
  schemaHash: string;
  fields: Array<{
    name: string;
    type: 'text' | 'number' | 'boolean' | 'date' | 'list' | 'unknown';
    options?: string[];
    optional: boolean;
  }>;
  entries: Array<{ id: string; file: string; hash: string }>;
};

type CauldronEntry = {
  file: string;
  hash: string;
  values: Record<string, string>;
  text: string;
  frontmatter: boolean;
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
  startRun: (payload: {
    tool: string;
    prompt: string;
  }) => Promise<{ ok: boolean; run?: CauldronRun; problem?: string }>;
  finishRun: (
    id: string,
  ) => Promise<{ ok: boolean; run?: CauldronRun; problem?: string }>;
  undoRun: (
    id: string,
  ) => Promise<{ ok: boolean; problem?: string; clashes?: string[] }>;
  runs: () => Promise<CauldronRun[]>;
  highlight: (id: string, on: boolean) => Promise<boolean>;
  runAction: (
    request: unknown,
  ) => Promise<{ ok: boolean; [key: string]: unknown }>;
  actionCatalogue: () => Promise<Array<{ name: string; what: string }>>;

  directions: () => Promise<CauldronDirectionSummary[]>;
  direction: () => Promise<CauldronDirectionSummary | null>;
  setDirection: (id: string) => Promise<{ ok: boolean; problem?: string }>;
  agentSend: (payload: {
    tool: string;
    request: string;
  }) => Promise<{ ok: boolean; runId?: string; problem?: string }>;
  agentCancel: () => Promise<boolean>;
  mcpInfo: () => Promise<{ url: string; code: string } | null>;
  collections: () => Promise<{ collections: CauldronCollection[] }>;
  entry: (file: string) => Promise<CauldronEntry | { problem: string }>;
  saveEntry: (payload: {
    file: string;
    baseHash: string;
    change: Record<string, string>;
  }) => Promise<{ ok: boolean; problem?: string; hash?: string }>;
  repoState: () => Promise<{
    isRepo: boolean;
    branch: string;
    changes: Array<{ status: string; file: string }>;
    hasRemote: boolean;
    lastCommit: string;
  }>;
  publish: (payload: { message: string; push: boolean }) => Promise<{
    ok: boolean;
    problem?: string;
    details?: string;
    committed?: number;
    message?: string;
  }>;
  macBuild: () => Promise<{ zip: string | null; instructions: string }>;
  qualityRun: (payload: { pages?: string[] }) => Promise<QualityReport>;
  library: () => Promise<{
    pieces: CauldronPiece[];
    links: Array<{ name: string; url: string; why: string }>;
  }>;
  addPiece: (payload: {
    pieceId: string;
    page: string;
    mode: 'add' | 'replace';
    replaceSelector?: string;
  }) => Promise<{
    ok: boolean;
    problem?: string;
    page?: string;
    runId?: string;
  }>;

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
