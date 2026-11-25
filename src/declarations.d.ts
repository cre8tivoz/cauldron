/// <reference types="@electron-forge/plugin-vite/forge-vite-env" />
declare module '*.css';

// Vite hands the file over as text at build time (`?raw`).
declare module '*?raw' {
  const text: string;
  export default text;
}

// Build-time flag defined by `vite.main.config.mts` so production bundles drop
// the E2E harness while dev (`npm start`) and opt-in builds retain it.
declare const __CAULDRON_E2E__: boolean | undefined;

// This file is a plain script on purpose: the declarations below apply everywhere,
// while `CauldronApi` is derived directly from `src/preload.ts`.
type CauldronSite = import('./cauldron-types').CauldronSite;
type CauldronSelection = import('./cauldron-types').CauldronSelection;
type CauldronDraft = import('./cauldron-types').CauldronDraft;
type CauldronDirectionSummary =
  import('./cauldron-types').CauldronDirectionSummary;
type CauldronAgentEvent = import('./cauldron-types').CauldronAgentEvent;
type QualityFinding = import('./cauldron-types').QualityFinding;
type QualityReport = import('./cauldron-types').QualityReport;
type CauldronPiece = import('./cauldron-types').CauldronPiece;
type CauldronPageSection = import('./cauldron-types').CauldronPageSection;
type CauldronStockPhoto = import('./cauldron-types').CauldronStockPhoto;
type CauldronCollection = import('./cauldron-types').CauldronCollection;
type CauldronEntry = import('./cauldron-types').CauldronEntry;
type CauldronSeoValues = import('./cauldron-types').CauldronSeoValues;
type CauldronSeoEntrySummary =
  import('./cauldron-types').CauldronSeoEntrySummary;
type CauldronSeoEntryDetail = import('./cauldron-types').CauldronSeoEntryDetail;
type CauldronRun = import('./cauldron-types').CauldronRun;
type WriteOutcome = import('./cauldron-types').WriteOutcome;
type CauldronRecent = import('./cauldron-types').CauldronRecent;
type CauldronOpenResult = import('./cauldron-types').CauldronOpenResult;
type CauldronDependencySetup =
  import('./cauldron-types').CauldronDependencySetup;
type CauldronPrepareEvent = import('./cauldron-types').CauldronPrepareEvent;
type CauldronStarterTemplate =
  import('./cauldron-types').CauldronStarterTemplate;
type CauldronCreatedProject = import('./cauldron-types').CauldronCreatedProject;
type CauldronApi = import('./preload').CauldronApi;

interface Window {
  cauldron: CauldronApi;
}
