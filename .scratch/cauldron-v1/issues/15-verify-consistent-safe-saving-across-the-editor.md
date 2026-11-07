# 15: Verify consistent safe saving across the editor

**What to build:** The agreed open, edit, save, conflict-choice, undo and preview-isolation behaviour is exercised on fresh copies of both named real sites.

**Blocked by:** [11: Save content without damaging the file](11-save-content-without-damaging-the-file.md), [13: Recover every unsaved edit after a crash](13-recover-every-unsaved-edit-after-a-crash.md)

**Status:** ready-for-agent

**Parent findings:** [01: core save and recovery evidence](01-core-save-and-recovery-evidence.md)

**Plan:** 1.1–1.8

**Execution:** Billy approved ticket publication, including safeguard 31. Application development remains paused until explicitly resumed. Readiness does not start work.

## Acceptance criteria

- [ ] Exercise the original style edit, unrelated outside edit and undo scenario across applicable page, style, source and content save paths.
- [ ] Non-overlapping changes merge safely; overlaps preserve both versions and offer the agreed keep-mine/use-disk choice.
- [ ] Unsupported authored source remains byte-for-byte intact; new pages appear without a manual reload.
- [ ] Verify preview isolation, source-path containment and real startup/failure behaviour without weakening protections; record only exercised coverage.
- [ ] For any confirmed bug fixed here, retain a permanent regression test that fails before the fix and passes afterwards.
- [ ] Record the exercised user-path results and exact revision; satisfy the existing project checks before committing. Distinguish failures, blocked work and unverified behaviour.

## Sources and boundaries

- [Agreed development plan](../../../../cauldron-astro/CAULDRON-ASTRO-PLAN.md): the numbered requirements above.
- [Whole-repository review](../../../docs/cauldron-code-review.md): evidence of the relevant faults and remaining acceptance work.
- [Retrospective](../../../docs/cauldron-retro.md): regression-test and evidence guidance; other environment changes require their own approval.

Use the existing implementation and tracker. Preserve the original sites, settled decisions and accepted scope. No speculative restructuring, additional features or weaker assertions. Keep parent finding records unchanged; completion evidence belongs with this child ticket.

## Comments

Ticket breakdown approved by Billy through the to-tickets approval form. Implementation has not started.
