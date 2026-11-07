# 13: Recover every unsaved edit after a crash

**What to build:** Unsaved visual and content edits are captured during continuous typing and offered back after an actual crash and restart.

**Blocked by:** None (can start once implementation is authorised).

**Status:** done

**Parent findings:** [01: core save and recovery evidence](01-core-save-and-recovery-evidence.md), [05: content definition and fallback](05-content-definition-and-fallback.md)

**Plan:** 1.6; 3.4

**Execution:** Billy approved ticket publication, including safeguard 31, then authorised it in batch 1 on 7 Nov 2026.

## Acceptance criteria

- [x] Continuous typing does not indefinitely postpone the agreed periodic recovery save.
- [x] Text, attribute, style, content-form and plain-text buffers are included; recovery data stays outside the site.
- [x] Exercise an actual crash/restart and restore through the visible interface with the original source and definition versions retained.
- [x] Changed files or definitions are reported safely; failed restore keeps the recovery data available.
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

**Revision:** batch 1 commit `fix: batch 1, protect people's work`, built on `e67dad9`. Node 26.13.0. Code and crash harness developed by two subagents in separate worktrees; verified by the orchestrator.

**Issues found and fixed:**

1. Continuous typing postponed the recovery save forever (source-confirmed). `queueDraft` in `src/App.tsx` reset its 3-second timer on every keystroke. Fix: the save is due a fixed time after the first unsaved change and later keystrokes keep that due time (`src/draft-schedule.ts`).
2. Attribute and style edits were not kept (source-confirmed). Only element text was queued. Fix: attribute, existing-style and new-style inputs queue their own drafts (`src/components/Inspector.tsx`).
3. Restoring a style or attribute draft would have written it as element text (found by the subagent). Fix: `src/draft-restore.ts` maps each draft back to its own edit kind; `restoreDraft` in `src/main/index.ts` keeps any draft it cannot map.

Content-form and plain-text drafts were already saved immediately outside the site and are unchanged. A refused restore (changed file or changed content definition) keeps the draft; this is now pinned by a test.

**Regression tests:** `scripts/test-core.mjs` 1.6 tests (continuous typing cannot postpone the save; a completed save arms the next; style and attribute drafts restore as their own kind; a refused content restore changes nothing and keeps the draft).

**Verification evidence:**

- Red: the three new tests failed before the fix, because the scheduling and restore-mapping code did not exist. The timer defect itself was confirmed from source; it lived inside a React component with no direct test.
- `npm run check` exit 0.
- Real crash through the packaged app (`CAULDRON_CRASH_TEST`, fresh WDLsite copies): phase 1 typed into the visible inspector for about 5 seconds without applying, confirmed the recovery file outside the site with the original `baseHash`, confirmed the source untouched, then killed the app with SIGKILL (exit 137). Phase 2 restarted, showed "Unsaved edits from last time…", clicked **Restore the first one**, the typed text landed in the source, and the recovery entry and notice cleared: 7/7.
- Run four times on the final code. The first final run had one harness failure (5/6 keystrokes registered): the test typed before the inspector text field had rendered. The orchestrator made the harness wait for the field and log each keystroke. Three further full runs were clean (6/6 keystrokes `111111`, restore 7/7).

**Limitations:** the crash test types element text; attribute and style drafts are covered by unit tests and code reading, not a separate crash run. Early runs used the app's default development data folder; later runs use the new test-only `CAULDRON_TEST_USER_DATA` override.
