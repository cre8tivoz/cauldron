# 14: Make failures visible wherever they happen

**What to build:** Failures in recovery, file scanning, comparison, design settings and quality checking show a useful message and diagnostic.

**Blocked by:** None (can start once implementation is authorised).

**Status:** done

**Parent findings:** [00: process and traceability](00-process-and-traceability.md), [01: core save and recovery evidence](01-core-save-and-recovery-evidence.md), [03: before after and run undo](03-before-after-and-run-undo.md), [06: approved taste criteria](06-approved-taste-criteria.md), [10: shutdown and build risks](10-shutdown-and-build-risks.md)

**Plan:** 1.1; 1.6; 2.2; 4.2; 4.4; AGENTS failure reporting

**Execution:** Billy approved ticket publication, including safeguard 31, then authorised it in batch 1 on 7 Nov 2026.

## Acceptance criteria

- [x] Inject each of the seven failure-handling cases documented in the review and verify its actual visible result plus console diagnostic.
- [x] A missing optional file remains distinguishable from unreadable or malformed data; uncertainty is not reported as an empty or successful result.
- [x] Restore refusal remains visible with no selection, a collapsed inspector and another tool view open.
- [x] Keep existing preview isolation and sender checks intact.
- [x] For any confirmed bug fixed here, retain a permanent regression test that fails before the fix and passes afterwards.
- [x] Record the exercised user-path results and exact revision; satisfy the existing project checks before committing. Distinguish failures, blocked work and unverified behaviour.

## Sources and boundaries

- [Agreed development plan](../../../../cauldron-astro/CAULDRON-ASTRO-PLAN.md): the numbered requirements above.
- [Whole-repository review](../../../docs/cauldron-code-review.md): evidence of the relevant faults and remaining acceptance work.
- [Retrospective](../../../docs/cauldron-retro.md): regression-test and evidence guidance; other environment changes require their own approval.

Use the existing implementation and tracker. Preserve the original sites, settled decisions and accepted scope. No speculative restructuring, additional features or weaker assertions. Keep parent finding records unchanged; completion evidence belongs with this child ticket.

## Comments

Ticket breakdown approved by Billy through the to-tickets approval form.

### Completion record — 7 Nov 2026 (batch 1)

**Revision:** batch 1 commit `fix: batch 1, protect people's work`, built on `e67dad9`. Node 26.13.0. Fixes by one subagent; injection harness and two further fixes by a second; final verification by the orchestrator.

**What changed:** a `fail(text)` helper in `src/main/index.ts` shows the message in the always-visible status bar and writes `console.error`.

1. Recovery: `loadDrafts` returns `{ drafts, problem }`. A missing file is no drafts; an unreadable or malformed file is a reported problem, and publishing refuses on it (`src/main/recovery.ts`, `src/main/publishing.ts`).
2. Run scans: unreadable files are recorded (ticket 12) and logged.
3. Preview comparison: capture and highlight failures are reported.
4. Restore refusal: reported through the status bar, so it stays visible whatever is selected or open.
5. Design settings: `readDirection` returns `{ direction, problem }`. Missing means no direction; damaged is a reported problem (`src/main/directions.ts`).
6. Content drafts: a rejected `contentDraft` shows in the panel and is logged (`src/components/ContentPanel.tsx`).
7. Accessibility: a check exception is logged and becomes a failed "Accessibility is not verified" finding (`src/main/quality.ts`).

**Further bugs found by injecting failures in the real app:**

- A recovery failure message was immediately replaced by later "site opened" and "preview running" messages, because the status bar shows the latest one. It is now reported after the preview starts.
- A run that could not be compared, because the preview was stopped, finished as "No files changed." with no diagnostic. It now reports that the page could not be compared.

**Regression tests:** `scripts/test-core.mjs`: unreadable or malformed drafts are reported and a missing file is not; a missing design setting is distinct from a damaged one; a failed accessibility check is reported and logged, not discarded.

**Verification evidence:**

- Red: all three tests failed against the pre-batch modules (`runAxe returned null` for case 7). Green afterwards; `npm run check` exit 0.
- Packaged app, `CAULDRON_FAILURE_TEST` with its own app data folder: **14/14**. Each case was injected, and both the on-screen text and the matching `console.error` line were observed:
  - (1) malformed recovery JSON shows "Saved edits could not be read from …".
  - (5) a damaged `design.json` shows "The design setting could not be read: …"; with no file there is no error.
  - (2) a file set unreadable during a run shows "1 file changed. 1 file could not be read."
  - (4) a refused restore, triggered with the Content view open, nothing selected and the inspector collapsed, shows "The draft is kept, but its original file version no longer matches. Nothing was overwritten."
  - (3) a stopped preview shows "The page could not be compared: …".
  - (6) unwritable recovery storage shows "That change could not be kept as a draft: … EACCES …" in the content panel.
- Preview isolation and IPC sender checks are unchanged; the editor suites' 1.8 isolation checks pass on both sites.

**Limitations:**

- Case 7 could not be triggered in the packaged app without altering the bundled axe-core. Its report and console diagnostic are proven by the unit test; the step that renders it as a failed Quality finding is checked by code reading. That finding list is the one the quality harness already displays.
- Case 3 was injected by stopping the preview. A script failure part-way through a comparison was not separately exercised.
