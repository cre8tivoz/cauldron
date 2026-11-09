# 32 — Restore the missing project workflow

**Status:** implemented; core project workflows verified in the packaged app. Native Finder-dialog interaction and physical menu shortcuts remain unverified; this is a targeted repair build, not a renewed whole-product release-ready claim. Billy's current instruction supersedes the earlier tickets-only restriction for this repair.

## Why this was missed

The written 24-item baseline narrowed project entry to opening an existing Astro folder (plan 1.1). UI research section 14 retained New site, Open folder and recent projects, but those were never turned into implementation acceptance criteria. Tickets 11–31 repaired that narrower baseline. The app has no new-project or recent-project API/UI and no dependency-store management. No shared-store requirement was found in the current numbered plan. This is a requirements-to-implementation omission, not an approved deferral. Billy's current instruction explicitly requires all three capabilities.

## Required result

- On launch, useful project home with **New Astro project**, **Open existing project**, and a persisted library of previously created/opened projects. Reopen works after app restart. Missing/moved folders produce a recoverable message; removing a recent entry never deletes a project.
- Create a real, ordinary Astro project at a user-chosen safe location, without overwriting an existing folder. Prepare dependencies through the app, with visible progress, consent and useful failures. Launch its real preview; no terminal preparation required.
- Use the existing pnpm tool and its documented content-addressable shared store for new-project dependencies. Keep each project's resolution separate; do not point incompatible projects at one mutable node_modules folder. Prove actual reuse between two projects, rather than treating npm's download cache as deduplication. Do not silently convert existing projects or change global package-manager settings.
- Existing Astro projects open through the same workflow, with dependency preparation offered when needed and errors visible. Resolve installed Node and agents for a GUI launch; do not depend on the development terminal PATH.
- Project lifecycle wiring must reach renderer controls, preload/IPC and native menu. Async failures must restore controls and display an actionable error.
- Acceptance is normal renderer-driven new/open/reopen/preview behaviour with a Finder-style environment, persistent project history and measured shared-store reuse. Backend-only tests, shell-render smoke or generated-site beauty do not satisfy it.

## Evidence (review-corrections stage — one bounded pass, uncommitted on HEAD b153278)

- Corrected and proved (2026-11-08, second UI pass): packaged-app renderer proof
  `npm run test:projects:ui` — **71/71 checks, exit 0**; backend focused suite **18/18**;
  typecheck/lint/`npm test` green; smoke PASS on the final package. Full record:
  `~/.hermes/profiles/claudia/cache/scratch/cauldron-projects-ui-result.md`.
- Closed in this stage: existing-project setup flow (inspect → explicit install-and-open consent
  naming the detected manager; lockfile mismatch shown as a visible block, never converted;
  "Open by path" fallback; unprepared library entries offer Install again; refused opens still
  land in the library); the prepare-handle synchronous-failure race (handler + renderer, plus
  quit/window-close cancelling the running install); the unsaved-project-switch guard (shared
  renderer modal + backend persisted-draft guard, Keep editing preserves everything, discard is
  explicit); ⌘N focuses the new-project form; embedded preview proved from inside the app
  (child view positive bounds + visible, child page really renders — the earlier black centre
  pane was a screenshot/capture limitation of the parent window, not an app bug).
- One real agent chat check: Codex (ChatGPT auth verified read-only first) answered a single
  read-only request through the normal UI — "Title: Cliff Cottage", run finished, no files
  changed (site-file hashes identical before/after; only the app's own direction metadata moved
  when the direction was picked).
- Distribution zip (unsigned, same-Mac only):
  `/Users/habibi/hermes/cauldron-builds/Cauldron-darwin-arm64-0.0.1-issue32.zip`,
  sha256 `9d80823791fe9683fe3db06ff2477884967c659f334ca96240f0779e9d7ddd21`.
- Controller final review reproduced a native-picker handoff bug in the real built React renderer: setting busy during the picker left the shared open callback seeing stale busy state and refusing the selected folder. The picker now owns a separate in-flight ref; the shared open handler owns opening busy state. A focused bridge-fixture test failed against the previous renderer and passes against the rebuilt renderer. Explicit discard also carries its confirmation through the same handler. These are renderer scheduling tests, not a claim that the native OS dialog was clicked. Script: `scripts/test-project-navigation.mjs` (run after packaging; existing Playwright supplied through `PLAYWRIGHT_MODULE` where needed).
- After these small controller corrections, `npm run check`, `npm run smoke`, the focused renderer regressions and `npm run make` all passed. The 71-check packaged run and real Codex proof precede those corrections; they were not repeated to spend another provider call. Final source identities and durable evidence are preserved under `cauldron-builds/issue32-proof/`.
- Still open: native Finder picker and native menu clicks not verified in a foreground session
  (background automation used the real editable path fields; the dialog now returns a picked
  path into the same guarded flow, so the flow is shared by construction); second-Mac first
  launch remains pending per the standing rule.

### Rescue verification update — 9 Nov 2026 (P0 & P1 completion)

- **Root cause of `tinydogs` generation failure fixed:**
  - `src/main/directions.ts` (`designDocument`), `src/main/agent.ts` (`buildPrompt`), and `src/main/index.ts` (`readDesign`) now explicitly clarify that `cauldron/tokens.css` already loads Google Fonts (`@import url(...)`) and defines `--cauldron-font-*` variables, and forbid importing uninstalled `@fontsource/...` packages unless declared in `package.json`.
  - `src/main/dependencies.ts` adds `findMissingPackages(root)` and `installMissingPackages(root, packages, storeDirOrUserData)` so any missing package imports in `src/` are detected and can be installed with explicit user consent through the project's detected package manager and shared `pnpm` store (`~/Library/Application Support/Cauldron/pnpm-store`).
  - `src/main/index.ts` (`finishAgentRun`), `src/main/site.ts` (`inspectPreviewError`), `src/main/quality.ts` (`buildSite` with `childEnvForTools` and `resolveToolPath`), and `src/main/runs.ts` (`recordBuildFailure`) now verify build/import and preview health before marking a file-changing agent run as `finished`, surfacing build/import failures both in the UI (`AgentPanel`, `QualityPanel`, alert banner) and on the persisted run record on disk while keeping failed runs cleanly undoable.
- **Verified in the packaged app (`out/Cauldron-darwin-arm64/Cauldron.app`):**
  - Disposable copy of Billy's `tinydogs` project opened → missing `@fontsource/playfair-display` and `@fontsource/jost` detected → installed via `installMissingPackages` into the shared `pnpm` store → `/` (125 elements) and `/dogs/` (106 elements) rendered in preview.
  - Broken-import negative test recorded `status: "failed"` and `problems: ["Missing package imports: @fontsource/nonexistent-test-pkg"]` on disk and in UI; `Undo this run` restored the file and preview.
  - Fresh project `"Tiny Dogs Editorial"` created → `"Open House"` direction set → live Codex generation for a two-page boutique breeder site → finished with `status: "finished"`, `problems: []`, `missingPackages: []`, and rendered `/` (85 elements) and `/dogs/` (82 elements).
  - Full `scripts/test-projects.mjs` (21/21), `scripts/test-project-navigation.mjs` (2/2), and `scripts/test-projects-ui.mjs` (71/71) re-run and passed on the rescued build.

## Delivery boundaries

One cheaper worker at a time, Claudia reviewing. Small backend foundation then renderer integration, no unrelated redesign or new site-generation runs. No global installs, credentials/configuration changes, originals edited or public release. Existing pnpm is available (10.34.2). Creating disposable Astro projects and installing their dependencies to exercise this explicitly requested workflow is in scope; no new application dependencies are authorised. Preserve existing user projects and .DS_Store files. Background testing must not foreground apps. Required project gates remain in force.
