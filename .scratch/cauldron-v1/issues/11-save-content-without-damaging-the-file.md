# 11: Save content without damaging the file

**What to build:** Content forms safely edit supported fields and offer plain-text editing for structures they cannot safely edit.

**Blocked by:** None (can start once implementation is authorised).

**Status:** ready-for-agent

**Parent findings:** [05: content definition and fallback](05-content-definition-and-fallback.md)

**Plan:** 1.5; 3.4

**Execution:** Billy approved ticket publication, including safeguard 31. Application development remains paused until explicitly resumed. Readiness does not start work.

## Acceptance criteria

- [ ] Reproduce the block-list corruption before the fix, then prove the resulting file remains valid and unrelated content stays byte-for-byte intact.
- [ ] Use the site’s own definitions; unsupported or nested structures stay intact and are available through the plain-text fallback.
- [ ] A changed content definition or conflicting disk edit is reported without overwriting either version.
- [ ] For any confirmed bug fixed here, retain a permanent regression test that fails before the fix and passes afterwards.
- [ ] Record the exercised user-path results and exact revision; satisfy the existing project checks before committing. Distinguish failures, blocked work and unverified behaviour.

## Sources and boundaries

- [Agreed development plan](../../../../cauldron-astro/CAULDRON-ASTRO-PLAN.md): the numbered requirements above.
- [Whole-repository review](../../../docs/cauldron-code-review.md): evidence of the relevant faults and remaining acceptance work.
- [Retrospective](../../../docs/cauldron-retro.md): regression-test and evidence guidance; other environment changes require their own approval.

Use the existing implementation and tracker. Preserve the original sites, settled decisions and accepted scope. No speculative restructuring, additional features or weaker assertions. Keep parent finding records unchanged; completion evidence belongs with this child ticket.

## Comments

Ticket breakdown approved by Billy through the to-tickets approval form. Implementation has not started.
