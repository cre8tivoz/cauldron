# 13: Recover every unsaved edit after a crash

**What to build:** Unsaved visual and content edits are captured during continuous typing and offered back after an actual crash and restart.

**Blocked by:** None (can start once implementation is authorised).

**Status:** ready-for-agent

**Parent findings:** [01: core save and recovery evidence](01-core-save-and-recovery-evidence.md), [05: content definition and fallback](05-content-definition-and-fallback.md)

**Plan:** 1.6; 3.4

**Execution:** Billy approved ticket publication, including safeguard 31. Application development remains paused until explicitly resumed. Readiness does not start work.

## Acceptance criteria

- [ ] Continuous typing does not indefinitely postpone the agreed periodic recovery save.
- [ ] Text, attribute, style, content-form and plain-text buffers are included; recovery data stays outside the site.
- [ ] Exercise an actual crash/restart and restore through the visible interface with the original source and definition versions retained.
- [ ] Changed files or definitions are reported safely; failed restore keeps the recovery data available.
- [ ] For any confirmed bug fixed here, retain a permanent regression test that fails before the fix and passes afterwards.
- [ ] Record the exercised user-path results and exact revision; satisfy the existing project checks before committing. Distinguish failures, blocked work and unverified behaviour.

## Sources and boundaries

- [Agreed development plan](../../../../cauldron-astro/CAULDRON-ASTRO-PLAN.md): the numbered requirements above.
- [Whole-repository review](../../../docs/cauldron-code-review.md): evidence of the relevant faults and remaining acceptance work.
- [Retrospective](../../../docs/cauldron-retro.md): regression-test and evidence guidance; other environment changes require their own approval.

Use the existing implementation and tracker. Preserve the original sites, settled decisions and accepted scope. No speculative restructuring, additional features or weaker assertions. Keep parent finding records unchanged; completion evidence belongs with this child ticket.

## Comments

Ticket breakdown approved by Billy through the to-tickets approval form. Implementation has not started.
