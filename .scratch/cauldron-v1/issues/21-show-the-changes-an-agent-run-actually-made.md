# 21: Show the changes an agent run actually made

**What to build:** The preview comparison covers the agreed changed text, settings, styles and removed elements, with clear failure messages.

**Blocked by:** [12: Undo an agent run without losing other work](12-undo-an-agent-run-without-losing-other-work.md)

**Status:** ready-for-agent

**Parent findings:** [03: before after and run undo](03-before-after-and-run-undo.md)

**Plan:** 2.2

**Execution:** Billy approved ticket publication, including safeguard 31. Application development remains paused until explicitly resumed. Readiness does not start work.

## Acceptance criteria

- [ ] Exercise the real preview toggle for text, attribute, style-only and removal changes.
- [ ] Comparison identifies the run’s own affected parts without attributing unrelated manual work to it.
- [ ] A capture or highlighting failure is reported, not replaced with a misleading successful empty comparison.
- [ ] Preserve the agreed comparison scope; do not add an unspecified second rendered site as a new requirement.
- [ ] For any confirmed bug fixed here, retain a permanent regression test that fails before the fix and passes afterwards.
- [ ] Record the exercised user-path results and exact revision; satisfy the existing project checks before committing. Distinguish failures, blocked work and unverified behaviour.

## Sources and boundaries

- [Agreed development plan](../../../../cauldron-astro/CAULDRON-ASTRO-PLAN.md): the numbered requirements above.
- [Whole-repository review](../../../docs/cauldron-code-review.md): evidence of the relevant faults and remaining acceptance work.
- [Retrospective](../../../docs/cauldron-retro.md): regression-test and evidence guidance; other environment changes require their own approval.

Use the existing implementation and tracker. Preserve the original sites, settled decisions and accepted scope. No speculative restructuring, additional features or weaker assertions. Keep parent finding records unchanged; completion evidence belongs with this child ticket.

## Comments

Ticket breakdown approved by Billy through the to-tickets approval form. Implementation has not started.
