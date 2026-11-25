/**
 * Shared IPC domain types exchanged between Electron's preload bridge and the
 * React renderer. Derived globally via `src/declarations.d.ts`.
 */

export type CauldronSite = {
  root: string;
  name: string;
  astroVersion: string;
  packageManager: 'npm' | 'pnpm' | 'yarn';
  hasDependencies: boolean;
  missingPackages?: string[];
  buildError?: string | null;
};

export type CauldronSelection = {
  id: string;
  baseHash: string;
  file: string;
  line: number;
  column: number;
  name: string;
  text: string;
  textEditable: boolean;
  textEditReason?: string;
  attributes: Array<{ name: string; value: string }>;
  style: Record<string, string>;
  responsiveId?: string | null;
  responsiveStyles?: {
    tablet: Record<string, string>;
    phone: Record<string, string>;
  };
  pageUrl: string;
  domPath: string;
  history: { canUndo: boolean; canRedo: boolean };
};

export type CauldronDraft = {
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

export type CauldronDirectionSummary = {
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

export type CauldronAgentEvent =
  | { type: 'session' }
  | { type: 'text'; text: string; delta?: boolean }
  | { type: 'tool'; name: string }
  | { type: 'status'; text: string }
  | { type: 'done'; text: string }
  | { type: 'error'; text: string };

export type QualityFinding = {
  id: string;
  label: string;
  status: 'pass' | 'fail' | 'unknown' | 'info';
  kind: 'measured' | 'failure' | 'opinion';
  detail: string;
  page?: string;
  width?: number;
  scope?: 'site' | 'change';
};

export type QualityReport = {
  built: boolean;
  builtAt: string;
  buildLog: string;
  findings: QualityFinding[];
  measured: Array<{ label: string; value: string }>;
};

export type CauldronPiece = {
  id: string;
  name: string;
  category: string;
  description: string;
  licence: string;
  source: string;
  needsScript: boolean;
  codeAllowed: boolean;
  previewHtml: string;
  directionName: string;
};

export type CauldronPageSection = {
  index: number;
  tag: string;
  name: string;
  anchorId: string | null;
  line: number;
  column?: number;
  preview: string;
};

export type CauldronPageSectionResult = {
  ok: boolean;
  sections?: CauldronPageSection[];
  problem?: string;
  hash?: string;
  file?: string;
};

export type CauldronStockPhoto = {
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

export type CauldronCollection = {
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

export type CauldronEntry = {
  file: string;
  hash: string;
  values: Record<string, string>;
  text: string;
  frontmatter: boolean;
  schemaHash: string;
};

export type CauldronRun = {
  id: string;
  tool: string;
  prompt: string;
  status: 'running' | 'finished' | 'failed';
  note: string;
  startedAt: number;
  finishedAt: number | null;
  files: string[];
  deletedFiles?: string[];
  /** Files modified directly by the agent outside Cauldron's checked actions (WDL-159). */
  directEdits?: string[];
  problems?: string[];
  undoAvailable?: boolean;
  highlighted: Array<{
    file: string;
    loc: string;
    text: string;
    label: string;
    removed?: boolean;
  }>;
  cssChanges?: Array<{
    file: string;
    selector: string;
    status: 'added' | 'changed' | 'removed';
    label: string;
  }>;
  otherPages?: Array<{
    file: string;
    page: string;
  }>;
};

export type WriteOutcome = {
  ok: boolean;
  problem?: string;
  conflict?: { file: string; diskText: string; reason: string };
  selection?: CauldronSelection;
};

export type CauldronProjectPalette = {
  bg: string;
  surface: string;
  ink: string;
  primary: string;
  line: string;
};

export type CauldronRecent = {
  path: string;
  name: string;
  addedAt: number;
  lastOpenedAt: number | null;
  /** The folder is gone or moved; the entry stays for cleanup or re-pointing. */
  missing: boolean;
  /** The project has its dependencies (node_modules/.bin/astro) ready. */
  prepared: boolean;
  /** Cached JPEG snapshot data URL captured from the live preview (WDL-174). */
  thumbnailUrl?: string | null;
  /** Site colour tokens from cauldron/tokens.css for fallback card previews. */
  palette?: CauldronProjectPalette | null;
};

export type CauldronDependencySetup = {
  manager: 'npm' | 'pnpm' | 'yarn';
  lockfile: string | null;
  hasNodeModules: boolean;
  hasAstroBin: boolean;
  conflict: string | null;
};

/** What opening a project can answer with (issue 32). */
export type CauldronOpenResult =
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

export type CauldronPrepareEvent =
  | { root: string; type: 'progress'; text: string }
  | {
      root: string;
      type: 'done';
      ok: boolean;
      problem: string | null;
      detail: string;
    };

export type CauldronStarterTemplate = {
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
  previewHtml: string;
};

export type CauldronCreatedProject = {
  root: string;
  name: string;
  astroVersion: string;
  slug: string;
};

/** Bring your own AI key (WDL-243). The renderer never sees a key. */
export type CauldronAiProvider =
  | 'anthropic'
  | 'openai'
  | 'openrouter'
  | 'ollama';

export type CauldronAiStatus = {
  settings: { provider: CauldronAiProvider; model: string };
  keychain: boolean;
  keys: Record<CauldronAiProvider, boolean>;
};

export type CauldronAiResult =
  | { ok: true; status: CauldronAiStatus }
  | { ok: false; problem: string };
