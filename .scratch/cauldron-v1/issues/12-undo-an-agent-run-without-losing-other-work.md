# 12: Undo an agent run without losing other work

**What to build:** A whole agent run can be reviewed and undone while unrelated manual edits survive, including changes to images and other site files.

**Blocked by:** None (can start once implementation is authorised).

**Status:** ready-for-agent

**Parent findings:** [03: before after and run undo](03-before-after-and-run-undo.md)

**Plan:** 1.3; 1.4; 2.2

**Execution:** Billy approved ticket publication, including safeguard 31. Application development remains paused until explicitly resumed. Readiness does not start work.

## Acceptance criteria

- [ ] Reproduce the unrelated-edit loss and omitted-image cases before repair; both regression cases pass after repair.
- [ ] The changed-file list accounts for added, changed and removed files, including images and previously excluded file types or sizes.
- [ ] Whole-run undo restores only the run’s own changes; later overlapping edits cause a clear refusal with identified clashes and no partial overwrite.
- [ ] If ownership of a change cannot safely be established, refuse rather than silently attributing another writer’s work to the run; the agreed whole-run path must still be exercised successfully.
- [ ] For any confirmed bug fixed here, retain a permanent regression test that fails before the fix and passes afterwards.
- [ ] Record the exercised user-path results and exact revision; satisfy the existing project checks before committing. Distinguish failures, blocked work and unverified behaviour.

## Sources and boundaries

- [Agreed development plan](../../../../cauldron-astro/CAULDRON-ASTRO-PLAN.md): the numbered requirements above.
- [Whole-repository review](../../../docs/cauldron-code-review.md): evidence of the relevant faults and remaining acceptance work.
- [Retrospective](../../../docs/cauldron-retro.md): regression-test and evidence guidance; other environment changes require their own approval.

Use the existing implementation and tracker. Preserve the original sites, settled decisions and accepted scope. No speculative restructuring, additional features or weaker assertions. Keep parent finding records unchanged; completion evidence belongs with this child ticket.

## Comments

Ticket breakdown approved by Billy through the to-tickets approval form. Implementation has not started.
