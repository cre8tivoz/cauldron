# Cauldron — development retrospective

> **Historical record — not current.** Kept for provenance only. Status claims in this file ("done", "verified", "complete") were true at best when written and several have since been found wrong. The current state and work list is [`fablefixes.md`](../fablefixes.md); the rules and scope are in [`AGENTS.md`](../AGENTS.md).

## Bottom line

The existing plan and project rules did not reliably control execution or completion claims. Automated checks were present and working, but their coverage missed serious user-facing failures. Adding more instructions would leave those same gaps open.

This retrospective uses [the whole-repository review](cauldron-code-review.md), [the process audit](plan-verification.md), the current session's review/verification steps, and the actual test commands, CI workflow and repository instructions. It recommends changes to the agent's working environment. All recommendations are proposals; application development remains paused.

## Recommendations, highest consequence first

### 1. Critical — make the reproduced failures permanent tests

**Evidence:** the review reproduced content corruption, undo erasing an unrelated edit, image changes escaping run undo and a blocked upload retry. Existing `npm run check` and smoke passed. The current tests cover other safety cases but omit these scenarios.

**Recommendation:** when repairs are authorised, promote those four reproductions into deterministic regression tests, using the existing test setup and production functions. First demonstrate each test failing on the reviewed code; then fix the accepted fault and prove it passes. Keep sites and Git remotes disposable. Add the tests to the existing command already run by CI.

**Completion evidence:** the original fault is caught before repair, fixed afterwards, and unrelated user files remain unchanged. A new framework is unnecessary.

### 2. High — completion must refer to the actual acceptance checks

**Evidence:** `plan-verification.md:5,103–108` records overstated completion and inconsistent use of the issue workflow. The review still finds incomplete shared actions, recovery, comparison and approved taste checks. Passing assertion totals were used too broadly.

**Recommendation:** work from one authorised existing ticket at a time. Its reviewer checks the exact plan requirement and acceptance criteria, distinguishing implemented, exercised, failed and unverified behaviour. Close only what the evidence establishes. Keep human judgement separate from independently testable work; preserve the existing release gate.

**Completion evidence:** every closed requirement links to the relevant exercised scenario at the reviewed revision. Use the existing tracker and audit; retain the agreed scope and thresholds.

### 3. High — test the existing error-reporting rule

**Evidence:** the review's Standards findings show silent recovery, scanning, comparison and design-setting failures, plus recovery messages hidden by panel state. `AGENTS.md` already requires visible errors and console reporting.

**Recommendation:** add targeted failure-injection tests to the existing suite: damaged recovery/settings data, failed draft storage, unreadable run files, failed comparison and restore refusal with no selection or a closed panel. Assert the actual user-visible result and diagnostic. Legitimate missing-file states remain distinguishable from damaged data. Avoid a blanket ban on every `catch` or nullable result.

**Completion evidence:** each failure reaches the person in the actual interface state where it occurs. Keep semantic judgement with the reviewer; repeated wording alone adds no enforcement.

### 4. High — run existing checks before a commit can be accepted

**Evidence:** CI already runs types, lint, tests, packaging and a separate-Mac launch (`.github/workflows/ci.yml:19–47`). The audit records earlier failing commits. This checkout currently has no configured custom hooks path or executable local hooks.

**Recommendation:** use the existing required commands as the local commit gate, with failure stopping the sequence. If a local hook is adopted, reuse the existing check command and explicitly install/verify it in this checkout; a hook file merely committed to Git does not activate itself. Retain the packaged launch check required by the project. These checks prevent mechanical failures; they do not establish full product acceptance.

**Completion evidence:** a deliberate failing check blocks the local workflow, and the remote checks cover the exact pushed revision. No approval settings need changing.

### 5. Medium — keep important proof with the project

**Evidence:** the review document is now in `docs/`, but its reproduction script, raw results and coverage ledgers still point to temporary scratch storage.

**Recommendation:** preserve the minimal reproductions and relevant evidence in the project during the authorised repair work. Turn durable behaviour checks into tests; retain only the supporting logs needed to explain the finding. Keep credentials and whole disposable sites excluded.

**Completion evidence:** another session can reproduce the finding from the checkout after the temporary folder is gone. Keep the existing review and issue records as the index.

### 6. Medium — make review coverage explicit before declaring completion

**Evidence:** the first review passes returned partial coverage after truncated reads. Further passes were needed. A provisional preview-exit finding was rejected after checking its existing caller.

**Recommendation:** give each reviewer a bounded file list and enough output budget from the outset. Page long files, record missing ranges and continue only those ranges. Verify findings against callers and the visible interface before publishing them. Preserve the independent Standards/Spec separation.

**Completion evidence:** the requested file inventory matches the completed coverage, exclusions are explicit, and each reported fault survives caller-level verification. This improves the existing review process without adding another service or review loop.

## Navigation and instruction maintenance

The app's `AGENTS.md` already points to the brief, plan, approved tests, decisions and local tracker. Use those pointers and the current review in future task briefs. Fix a weak or stale pointer at its existing location when authorised. The recorded tracker contradiction has already been corrected.

The project instruction file is short enough that this retrospective does not justify a rewrite. There is no evidence here supporting a new global-instruction policy. Keep genuine judgement standards with the reviewer, and prefer executable checks for mechanical mistakes. Add neither duplicate plans nor a new standards document merely to restate rules already present.

## What worked

Real production-function probes exposed failures missed by the routine checks. Independent review axes helped separate code-rule breaches from plan gaps. Caller verification removed a false allegation. The existing CI and separate-Mac launch were confirmed working. The review respected the implementation pause.

## Limits and current state

This retrospective establishes observed workflow failures; it does not establish the model switch as their cause. No extra product feature was proved by the review. Structural changes remain outside the authorised scope.

---

## Rescue Lessons Learned & Technical Surprises (9 Nov 2026)

Following the P0–P3 rescue plan execution (`RESCUE-PLAN.md`, commit `11ace4db493727f3bc3cfbfbba2a6bc2a943d5ee`), six concrete engineering lessons and surprises emerged from repairing the `tinydogs` workflow failure and verifying all 17 whole-product acceptance rows in the packaged macOS app:

### 1. Agent process exit `0` is not site generation success

- **Surprise:** When Billy ran Codex on `tinydogs`, Codex exited with status `0` after writing 4 files (`src/layouts/Base.astro`, etc.) that imported uninstalled `@fontsource/...` packages. Because `finishAgentRun` in `src/main/index.ts` only checked whether the CLI process returned an error note, it recorded `status: "finished"` and `problems: []` even though `npm run build` failed with exit `1` and the live preview rendered an Astro error overlay.
- **Lesson:** Any agent run that modifies site files must pass an automated post-run verification gate (`findMissingPackages`, `buildSite`, and `inspectPreviewError` on the live preview DOM) before being marked `finished`. If packages are missing or the build/preview fails, the run must transition to `status: "failed"`, persist the exact diagnostic in `run.problems` on disk, surface an actionable error banner with one-click package installation (`Install missing packages`) or whole-run undo, and never masquerade as a clean completion.

### 2. Design direction tokens must explicitly tell agents how fonts are loaded (and `read_design` must expose `tokensCss`)

- **Surprise:** `cauldron/tokens.css` already loaded the chosen direction's Google Fonts via `@import url('https://fonts.googleapis.com/css2?...')`, while `DESIGN.md` listed the font family names without stating that `tokens.css` already loaded them. Compounding this, `read_source` intentionally blocks reading `cauldron/tokens.css` (to keep agents from hand-editing generated token files), so agents could not see the `@import` rule and hallucinated `@fontsource/...` imports into `Base.astro`.
- **Lesson:** When a file is protected from direct agent reads/writes, the dedicated MCP tool (`read_design`) must return its contents (`tokensCss` and `designMarkdown`), and both `DESIGN.md` and the agent system prompt must explicitly instruct agents to import `../cauldron/tokens.css` rather than adding uninstalled `@fontsource/*` packages.

### 3. macOS GUI `PATH` vs. terminal `PATH` (and caching pitfalls)

- **Surprise:** Packaged macOS GUI apps launched from Finder do not inherit the user's interactive shell `PATH` (`~/.nvm/...`, `/opt/homebrew/bin`). While `site.ts` and `dependencies.ts` used `resolveToolPath` and `childEnvForTools`, `buildSite` in `src/main/quality.ts` and `src/main/e2e.ts` called bare `spawnSync("npm", ...)` and failed with `spawnSync npm ENOENT` under GUI launch. Furthermore, `resolveInstalledExecutables` in `src/main/runtime.ts` cached executable lookup results without keying on `process.env.PATH`, causing stale lookups when `PATH` changed between test phases.
- **Lesson:** Every child-process spawn in an Electron main process must route through a single `PATH`-hydrated helper (`resolveToolPath` + `childEnvForTools`), and any memoized executable discovery must include `process.env.PATH` in its cache key.

### 4. Keep unreadable-file tracking separate from build/preview diagnostics on `AgentRun`

- **Surprise:** `Runs.undo` originally checked `run.problems.length > 0` to decide whether pre-run file snapshots had failed to be read, refusing whole-run undo whenever `run.problems` was non-empty. Once post-run build/import failures were recorded in `run.problems`, `Runs.undo` refused to undo broken runs—the exact moment a user most needs whole-run undo!
- **Lesson:** User-facing run diagnostics (`run.problems`) and internal snapshot integrity tracking (`private unreadable = new Map<string, string[]>()`) serve different purposes and must never share the same field.

### 5. Event-driven MCP readiness vs. fixed timers for background agent gateways

- **Surprise:** The Hermes integration originally waited a fixed `HERMES_PICKUP_MS` (`90_000` ms) when a background gateway was active. However, the Hermes gateway's internal `_PARKED_RETRY_INTERVAL` is `300` seconds (`5` minutes): if a gateway had parked a failed self-probe before Cauldron started its MCP server, waiting 90 seconds always timed out before switching to direct CLI fallback. Conversely, when the gateway was healthy, it connected to Cauldron's MCP server and called `tools/list` within `~300` ms.
- **Lesson:** Track actual MCP client connection events (`hasClientConnected` / `onClientConnected` triggered on `tools/list` or `tools/call` in `src/main/mcp.ts`). When the gateway connects immediately, grant the full run budget; if no MCP client connects within a short readiness window (`15` seconds), fall back to direct `hermes chat -q` execution immediately instead of blocking the user for 90 seconds.

### 6. Scoped keyboard Tab-reach testing requires full-document focus sequence indexing

- **Surprise:** `CAULDRON_LIBRARY_TEST` had an intermittent 68/69 failure (`glow-action keyboard: 1 of 2 controls reached by Tab`). Root-cause analysis revealed two interacting causes:
  1. In `src/main/taste-check.ts`, `activeIndex()` only indexed controls _inside_ the scoped library component (`[data-cauldron-component="glow-action"]`) and returned `-1` whenever focus landed on any link or button earlier on the page. When `pressTab` saw `before === after` (`-1 === -1`), it fired **two extra `Tab` keystrokes** per iteration—jumping 3 focusable elements at a time and skipping straight over the first button inside `glow-action`!
  2. In `src/main/e2e.ts`, when `before` (the element preceding the inserted component) was non-focusable (such as a `<section>` or `<p>`), calling `before.focus()` without a temporary `tabindex="-1"` left focus at the top of the document.
- **Lesson:** Keyboard Tab-reach probes must assign a unique `data-cauldron-focus-seq` attribute across _all_ visible focusable elements in the document so `pressTab` knows when focus is advancing outside the scoped component and never double- or triple-tabs. And when starting Tab traversal just before a target component, temporarily set `tabindex="-1"` on the preceding element so `before.focus()` reliably positions the browser's sequential focus navigation starting point.

### 7. Second-Mac validation via GitHub Actions macOS runners

- **Decision:** Because Billy does not have a second physical Mac available, separate-Mac download, unpack, and launch verification relies on the automated GitHub Actions macOS runner job (`separate-mac-launch` in `.github/workflows/ci.yml`), which downloads the built release zip artifact on a clean macOS machine, unpacks `Cauldron.app`, and verifies first-launch rendering (`CAULDRON_SMOKE=1`).
