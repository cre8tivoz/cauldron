/// <reference types="@electron-forge/plugin-vite/forge-vite-env" />
declare module '*.css';

// Vite hands the file over as text at build time (`?raw`).
declare module '*?raw' {
  const text: string;
  export default text;
}

// This file is a plain script on purpose: the declarations below apply everywhere.
type CauldronSite = {
  root: string;
  name: string;
  astroVersion: string;
  packageManager: 'npm' | 'pnpm' | 'yarn';
  hasDependencies: boolean;
  missingPackages?: string[];
  buildError?: string | null;
};

type CauldronSelection = {
  id: string;
  baseHash: string;
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
  baseHash?: string;
  schemaHash?: string;
  savedAt: number;
};

type CauldronDirectionSummary = {
  id: string;
  name: string;
  forWhom: string;
  learnedFrom: string;
  colours: Record<string, string>;
  fonts: { display: string; body: string; detail?: string };
  typeScale: number[];
  spacing: number[];
  radii: number[];
  character: string;
  watch: string;
  structure: {
    density: string;
    displayType: string;
    surfaces: string;
    states: string;
    mobile: string;
  };
};

type CauldronAgentEvent =
  | { type: 'session' }
  | { type: 'text'; text: string; delta?: boolean }
  | { type: 'tool'; name: string }
  | { type: 'status'; text: string }
  | { type: 'done'; text: string }
  | { type: 'error'; text: string };

type QualityFinding = {
  id: string;
  label: string;
  status: 'pass' | 'fail' | 'unknown' | 'info';
  kind: 'measured' | 'failure' | 'opinion';
  detail: string;
  page?: string;
  width?: number;
  scope?: 'site' | 'change';
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
  category: string;
  description: string;
  licence: string;
  source: string;
  needsScript: boolean;
  codeAllowed: boolean;
  previewHtml: string;
};

type CauldronPageSection = {
  index: number;
  tag: string;
  name: string;
  anchorId: string | null;
  line: number;
  preview: string;
};

type CauldronStockPhoto = {
  id: string;
  title: string;
  photographer: string;
  source: 'Unsplash' | 'Pexels';
  sourceUrl: string;
  thumbUrl: string;
  fullUrl: string;
  directionId: string;
  category: string;
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
  schemaHash: string;
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
  problems?: string[];
  highlighted: Array<{
    file: string;
    loc: string;
    text: string;
    label: string;
    removed?: boolean;
  }>;
};

type WriteOutcome = {
  ok: boolean;
  problem?: string;
  conflict?: { file: string; diskText: string; reason: string };
  selection?: CauldronSelection;
};

type CauldronRecent = {
  path: string;
  name: string;
  addedAt: number;
  lastOpenedAt: number | null;
  /** The folder is gone or moved; the entry stays for cleanup or re-pointing. */
  missing: boolean;
  /** The project has its dependencies (node_modules/.bin/astro) ready. */
  prepared: boolean;
};

/** What opening a project can answer with (issue 32). */
type CauldronOpenResult =
  | { site: CauldronSite }
  | { cancelled: true }
  | { picked: string }
  | { problem: string; detail?: string }
  | {
      needsPreparation: true;
      problem: string;
      setup: CauldronDependencySetup;
    }
  | { needsConfirm: true; root: string; problem: string };

type CauldronDependencySetup = {
  manager: 'npm' | 'pnpm' | 'yarn';
  lockfile: string | null;
  hasNodeModules: boolean;
  hasAstroBin: boolean;
  conflict: string | null;
};

type CauldronPrepareEvent =
  | { root: string; type: 'progress'; text: string }
  | {
      root: string;
      type: 'done';
      ok: boolean;
      problem: string | null;
      detail: string;
    };

type CauldronStarterTemplate = {
  id: 'sunday-table' | 'penta' | 'good-trade' | 'the-desk' | 'minimal';
  name: string;
  category: string;
  description: string;
  direction: string;
  directionId: string;
  badge: string;
  swatches: string[];
  fonts: string;
  pages: string[];
};

type CauldronCreatedProject = {
  root: string;
  name: string;
  astroVersion: string;
  slug: string;
};

type CauldronApi = {
  openSiteDialog: () => Promise<
    | { cancelled: true }
    | { picked: string }
    | { problem: string; detail: string }
  >;
  openSite: (root: string) => Promise<CauldronOpenResult>;
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
  referenceDirection: (url: string) => Promise<{
    ok: boolean;
    problem?: string;
    direction?: CauldronDirectionSummary;
  }>;
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
    keepMine?: boolean;
  }) => Promise<{
    ok: boolean;
    problem?: string;
    hash?: string;
    conflict?: boolean;
    conflictCopy?: string;
  }>;
  repoState: () => Promise<{
    isRepo: boolean;
    branch: string;
    changes: Array<{ status: string; file: string }>;
    hasRemote: boolean;
    remote: string | null;
    lastCommit: string;
    unpushed: number;
  }>;
  publish: (payload: {
    message: string;
    push: boolean;
    unsavedBuffers?: number;
  }) => Promise<{
    ok: boolean;
    problem?: string;
    details?: string;
    committed?: number;
    pushed?: boolean;
    commit?: string;
    upload?: string;
    message?: string;
  }>;
  macBuild: () => Promise<{ zip: string | null; instructions: string }>;
  exportStatic: () => Promise<{
    ok: boolean;
    distPath?: string;
    problem?: string;
    log?: string;
  }>;
  deployCloudflare: (projectName?: string) => Promise<{
    ok: boolean;
    url?: string;
    problem?: string;
    log?: string;
  }>;
  stockPhotos: (
    query?: string,
    directionId?: string,
  ) => Promise<CauldronStockPhoto[]>;
  saveAssetImage: (payload: {
    fileName: string;
    base64: string;
  }) => Promise<
    { ok: true; relativePath: string } | { ok: false; problem: string }
  >;
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
    componentFile?: string;
    page?: string;
    replaced?: string;
    reusedExisting?: boolean;
    runId?: string;
  }>;
  pageSections: (page: string) => Promise<{
    ok: boolean;
    sections?: CauldronPageSection[];
    problem?: string;
    hash?: string;
    file?: string;
  }>;
  reorderPageSections: (payload: {
    page: string;
    fromIndex: number;
    toIndex: number;
    baseHash?: string;
  }) => Promise<{
    ok: boolean;
    sections?: CauldronPageSection[];
    problem?: string;
    hash?: string;
    file?: string;
  }>;
  deletePageSection: (payload: {
    page: string;
    sectionIndex: number;
    baseHash?: string;
  }) => Promise<{
    ok: boolean;
    sections?: CauldronPageSection[];
    problem?: string;
    hash?: string;
    file?: string;
  }>;
  setPageSectionAnchor: (payload: {
    page: string;
    sectionIndex: number;
    anchorId: string;
    baseHash?: string;
  }) => Promise<{
    ok: boolean;
    sections?: CauldronPageSection[];
    problem?: string;
    hash?: string;
    file?: string;
  }>;
  duplicatePageSection: (payload: {
    page: string;
    sectionIndex: number;
    baseHash?: string;
  }) => Promise<{
    ok: boolean;
    sections?: CauldronPageSection[];
    problem?: string;
    hash?: string;
    file?: string;
  }>;
  insertPageSection: (payload: {
    page: string;
    afterIndex: number;
    sectionCode: string;
    baseHash?: string;
  }) => Promise<{
    ok: boolean;
    sections?: CauldronPageSection[];
    problem?: string;
    hash?: string;
    file?: string;
  }>;

  refreshSelection: () => Promise<CauldronSelection | null>;
  undo: () => Promise<{ ok: boolean; problem?: string }>;
  redo: () => Promise<{ ok: boolean; problem?: string }>;
  clearSelection: () => Promise<boolean>;
  contentDraft: (payload: {
    file: string;
    field: string;
    value: string | null;
    baseHash: string;
    schemaHash: string;
  }) => Promise<boolean>;
  saveDrafts: (drafts: CauldronDraft[]) => Promise<boolean>;
  mergeDrafts: (drafts: CauldronDraft[]) => Promise<boolean>;
  removeDrafts: (keys: string[]) => Promise<boolean>;
  discardDrafts: () => Promise<boolean>;
  restoreDraft: (
    draft: CauldronDraft,
  ) => Promise<{ ok: boolean; problem?: string }>;
  restoreAllDrafts: () => Promise<{
    ok: boolean;
    restored: number;
    failed: number;
    problem?: string;
  }>;
  newPage: (page: {
    path: string;
    title: string;
  }) => Promise<{ ok: true; file: string; url: string } | { problem: string }>;

  projectsHome: () => Promise<{
    problem: string | null;
    projects: CauldronRecent[];
  }>;
  createProject: (payload: {
    name: string;
    parent: string;
    template?: string;
  }) => Promise<
    | { ok: true; project: CauldronCreatedProject }
    | { problem: string; detail: string }
  >;
  starterTemplates: () => Promise<CauldronStarterTemplate[]>;
  chooseProjectParent: () => Promise<{
    cancelled: boolean;
    path: string | null;
  }>;
  detectDependencies: (root: string) => Promise<{
    site: CauldronSite | null;
    problem: string | null;
    setup: CauldronDependencySetup;
  }>;
  prepareDependencies: (root: string) => Promise<{
    ok: boolean;
    problem?: string;
  }>;
  cancelPrepare: () => Promise<boolean>;
  installMissingPackages: (packages?: string[]) => Promise<{
    ok: boolean;
    manager?: string;
    storeDir?: string;
    log?: string;
    problem?: string;
    site?: CauldronSite;
  }>;
  removeRecent: (
    projectPath: string,
  ) => Promise<{ ok: boolean; problem?: string }>;

  /** Test-only preview introspection (main answers only under CAULDRON_BACKGROUND_TEST). */
  testPreviewIntrospect: () => Promise<unknown>;

  on: (channel: string, callback: (payload: never) => void) => () => void;
};

interface Window {
  cauldron: CauldronApi;
}
