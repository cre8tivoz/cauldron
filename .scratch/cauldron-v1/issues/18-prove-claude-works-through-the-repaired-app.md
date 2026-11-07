# 18: Prove Claude works through the repaired app

**What to build:** Claude completes a real edit through Cauldron’s shared actions, continues its conversation and reports progress or failure accurately.

**Blocked by:** [12: Undo an agent run without losing other work](12-undo-an-agent-run-without-losing-other-work.md), [17: Use the same checked editing actions everywhere](17-use-the-same-checked-editing-actions-everywhere.md)

**Status:** ready-for-agent

**Parent findings:** [02: shared actions and agent support](02-shared-actions-and-agent-support.md)

**Plan:** 3.2; 3.3; 4.1; 4.2

**Execution:** Billy approved ticket publication, including safeguard 31. Application development remains paused until explicitly resumed. Readiness does not start work.

## Acceptance criteria

- [ ] Run the real installed tool through the actual app path on a disposable site; record the action calls and resulting files.
- [ ] Exercise continuing conversation, selected-element context, progress, cancellation and failure reporting.
- [ ] The chosen direction and taste rules are carried on each run; the resulting run is reviewable and safely undoable.
- [ ] Protocol fixtures are labelled separately from actual provider execution.
- [ ] For any confirmed bug fixed here, retain a permanent regression test that fails before the fix and passes afterwards.
- [ ] Record the exercised user-path results and exact revision; satisfy the existing project checks before committing. Distinguish failures, blocked work and unverified behaviour.

## Sources and boundaries

- [Agreed development plan](../../../../cauldron-astro/CAULDRON-ASTRO-PLAN.md): the numbered requirements above.
- [Whole-repository review](../../../docs/cauldron-code-review.md): evidence of the relevant faults and remaining acceptance work.
- [Retrospective](../../../docs/cauldron-retro.md): regression-test and evidence guidance; other environment changes require their own approval.

Use the existing implementation and tracker. Preserve the original sites, settled decisions and accepted scope. No speculative restructuring, additional features or weaker assertions. Keep parent finding records unchanged; completion evidence belongs with this child ticket.

## Comments

Ticket breakdown approved by Billy through the to-tickets approval form. Implementation has not started.
