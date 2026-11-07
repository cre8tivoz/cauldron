# 18: Prove Claude works through the repaired app

**What to build:** Claude completes a real edit through Cauldron’s shared actions, continues its conversation and reports progress or failure accurately.

**Blocked by:** [12: Undo an agent run without losing other work](12-undo-an-agent-run-without-losing-other-work.md), [17: Use the same checked editing actions everywhere](17-use-the-same-checked-editing-actions-everywhere.md)

**Status:** done

**Parent findings:** [02: shared actions and agent support](02-shared-actions-and-agent-support.md)

**Plan:** 3.2; 3.3; 4.1; 4.2

**Execution:** Billy approved ticket publication, including safeguard 31. Application development remains paused until explicitly resumed. Readiness does not start work.

## Acceptance criteria

- [x] Run the real installed tool through the actual app path on a disposable site; record the action calls and resulting files.
- [x] Exercise continuing conversation, selected-element context, progress, cancellation and failure reporting.
- [x] The chosen direction and taste rules are carried on each run; the resulting run is reviewable and safely undoable.
- [x] Protocol fixtures are labelled separately from actual provider execution.
- [x] For any confirmed bug fixed here, retain a permanent regression test that fails before the fix and passes afterwards.
- [x] Record the exercised user-path results and exact revision; satisfy the existing project checks before committing. Distinguish failures, blocked work and unverified behaviour.

## Sources and boundaries

- [Agreed development plan](../../../../cauldron-astro/CAULDRON-ASTRO-PLAN.md): the numbered requirements above.
- [Whole-repository review](../../../docs/cauldron-code-review.md): evidence of the relevant faults and remaining acceptance work.
- [Retrospective](../../../docs/cauldron-retro.md): regression-test and evidence guidance; other environment changes require their own approval.

Use the existing implementation and tracker. Preserve the original sites, settled decisions and accepted scope. No speculative restructuring, additional features or weaker assertions. Keep parent finding records unchanged; completion evidence belongs with this child ticket.

## Comments

Ticket breakdown approved by Billy through the to-tickets approval form. Implementation has not started.

### Completion record — 7 Nov 2026 (batch 2)

**Revision:** batch 2 commit `fix: batch 2, one set of editing actions and all three agents`, built on `28f9135`. Node 26.13.0. Work by subagents in separate worktrees; merged, re-run and verified by the orchestrator on the final merged code.

**Issues found and fixed:**

1. A failed Claude login was reported as success. Claude reports an expired login as `subtype: success, is_error: true` with exit code 0, and the parser turned that into a finished run. Fix (`src/main/agent.ts`): `is_error` is an error carrying Claude's message.

**Regression tests:** `scripts/test-agent.mjs` (protocol fixtures): an `is_error` result cannot become a successful run; resume passes the stored session id; cancel kills a process that ignores SIGTERM and reports no success. Red before the fix: `FAIL 3.2 an is_error result cannot become a successful run: 'done' !== 'error'`; green after.

**Verification evidence:** packaged app, `CAULDRON_CLAUDE_TEST`, fresh WDLsite copies: **37/37**, re-run on the final code: 37/37. Checks are labelled REAL or FIXTURE in the output.

- REAL (installed Claude Code 2.1.319, signed in): the brief carried the Long Lunch direction, the taste rules and the selected element; Claude called `read_selection` then `edit_element_text` on `src/layouts/Base.astro:45`; the run listed that file; the file changed; whole-run undo restored it.
- FIXTURE (a stand-in that speaks Claude's stream-json and calls the real connection, `scripts/fixtures/claude-standin.mjs`, through the same app path): conversation resume and memory, progress events, cancellation (process gone, run failed, never shown as success), a crash exit and an `is_error` result reported as failures, undo of an edit and an added file.

**Limitations:** conversation memory, cancellation and failure were proven with the stand-in, not live Claude. The first proof attempts were refused because Claude Code was signed out on this Mac; Billy signed in and the real checks then passed.
