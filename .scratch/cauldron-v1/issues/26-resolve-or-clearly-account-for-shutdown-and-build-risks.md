# 26: Resolve or clearly account for shutdown and build risks

**What to build:** The recorded shutdown warning and build-tool advisories have reproducible evidence and a clear disposition.

**Blocked by:** None (can start once implementation is authorised).

**Status:** done

**Parent findings:** [10: shutdown and build risks](10-shutdown-and-build-risks.md)

**Plan:** 0.1; 5.2; existing risk record

**Execution:** Billy approved ticket publication, including safeguard 31. Application development remains paused until explicitly resumed. Readiness does not start work.

## Acceptance criteria

- [x] Reproduce the affected shutdown path and verify any authorised correction without weakening sender validation; if not reproduced, retain that limitation rather than claim it fixed.
- [x] Run a fresh dependency assessment and distinguish application-runtime from development/build exposure.
- [x] Assess the official compatible remedy before dependency changes; do not force a downgrade, override or major change.
- [x] Keep any unresolved upstream problem explicit and request a genuine scope/risk decision if required; do not invent a new zero-advisory release requirement.
- [x] For any confirmed bug fixed here, retain a permanent regression test that fails before the fix and passes afterwards. (No bug was reproduced; no fix was made.)
- [x] Record the exercised user-path results and exact revision; satisfy the existing project checks before committing. Distinguish failures, blocked work and unverified behaviour.

## Sources and boundaries

- [Agreed development plan](../../../../cauldron-astro/CAULDRON-ASTRO-PLAN.md): the numbered requirements above.
- [Whole-repository review](../../../docs/cauldron-code-review.md): evidence of the relevant faults and remaining acceptance work.
- [Retrospective](../../../docs/cauldron-retro.md): regression-test and evidence guidance; other environment changes require their own approval.

Use the existing implementation and tracker. Preserve the original sites, settled decisions and accepted scope. No speculative restructuring, additional features or weaker assertions. Keep parent finding records unchanged; completion evidence belongs with this child ticket.

## Comments

Ticket breakdown approved by Billy through the to-tickets approval form. Implementation has not started.

### Verification (2026-11-08, revision 3778e10)

**Shutdown warning — not reproduced.** Ran the packaged app through the existing `CAULDRON_CLOSE_TEST` path (`src/main/index.ts:1905`): open the fresh-site copy, wait 2.5 s with the preview running, `state.window.close()`, wait 2 s. Three consecutive runs each printed `CLOSE PASS: window closed cleanly after a site and preview were open` and exited 0, with no warning, error or `Object has been destroyed` on stdout/stderr. `npm run smoke` also passed with no sender-refusal warning. Sender validation in `handle()` (`src/main/index.ts:819`) was not touched, and `sawUnexpectedError` stayed empty.

This does **not** prove the recorded warning never occurs; it was not reproduced on this revision and machine and remains an open limitation. No code change was made for it, and no test asserts a fix (there is no confirmed bug to pin).

**Dependency assessment (fresh, read-only):**

- `npm audit --json`: 16 moderate, 0 high, 0 critical — all in the Electron Forge packaging chain (`@electron-forge/cli` and its plugins/core, `@electron/packager`, `@electron/universal`, `@electron/asar`, `glob`, `minimatch`).
- `npm audit --omit=dev --json`: **0 vulnerabilities**. The shipped application uses only `react`, `react-dom`, `@fontsource/source-sans-3`, `axe-core`; none are affected.
- Advisory chain: `GHSA-3g3m-2fjr-6pw4` (glob, range 9.0.0–14.0.1) and `GHSA-g3hv-75wg-m249` (minimatch, range 7.0.0–<11.0.1). Installed: glob 13.0.7, minimatch 10.2.6.
- Exposure is build/package-time only (a local toolchain parsing repository paths), not runtime in the shipped app.

**Official remedy assessment.** The only `npm audit fix` remedy offered is `@electron-forge/cli@7.11.2` — a semver-major _downgrade_ from 8.0.1. No newer compatible Forge is available (`@electron-forge/cli` latest is 8.0.1; `@electron/asar` latest 4.3.1 still declares `glob: ^13.0.2`, `minimatch: ^10.0.1`). Patched versions (glob ≥ 14.0.2, minimatch ≥ 11.0.1) are outside the ranges those pinned dependencies allow, so clearing the advisory needs an npm override or forcing Forge internals to major versions no upstream release supports. Both are outside this ticket's authority; **no dependency, lockfile or override was changed.**

Disposition: development-only, upstream-unfixed, no runtime exposure. No new zero-advisory release gate was created. If Billy wants the dev advisory gone, the only real options are a Forge downgrade or an unapproved override — that is his scope/risk decision, not a blocker to this ticket's accounting.

`npm run check` passes on the final source; `npm run smoke` passes. No source change was required for this ticket.

Evidence logs: `~/.hermes/profiles/claudia/cache/scratch/t22-26/close-{1,2,3}.log`, `smoke.log`, `audit-all.json`, `audit-prod.json`.
