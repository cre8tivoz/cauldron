# 22: Verify the agreed desktop workspace

**What to build:** The approved layout, sizing, selection context and tool switching work at the supported desktop sizes.

**Blocked by:** None (can start once implementation is authorised).

**Status:** ready-for-agent

**Parent findings:** [04: workspace and selection context](04-workspace-and-selection-context.md)

**Plan:** 3.1; settled UI decisions

**Execution:** Billy approved ticket publication, including safeguard 31. Application development remains paused until explicitly resumed. Readiness does not start work.

## Acceptance criteria

- [ ] Exercise resizable and collapsible left-agent/centre-preview/right-inspector panels at 1280 × 800 and larger sizes.
- [ ] Switch every tool view without the native preview obscuring it.
- [ ] Keep Coral, Source Sans 3 and the Mac system theme.
- [ ] Trace proposed device sizing, selection-chip or persistence changes to an actual agreed requirement before treating them as implementation work; label unapproved research separately.
- [ ] For any confirmed bug fixed here, retain a permanent regression test that fails before the fix and passes afterwards.
- [ ] Record the exercised user-path results and exact revision; satisfy the existing project checks before committing. Distinguish failures, blocked work and unverified behaviour.

## Sources and boundaries

- [Agreed development plan](../../../../cauldron-astro/CAULDRON-ASTRO-PLAN.md): the numbered requirements above.
- [Whole-repository review](../../../docs/cauldron-code-review.md): evidence of the relevant faults and remaining acceptance work.
- [Retrospective](../../../docs/cauldron-retro.md): regression-test and evidence guidance; other environment changes require their own approval.

Use the existing implementation and tracker. Preserve the original sites, settled decisions and accepted scope. No speculative restructuring, additional features or weaker assertions. Keep parent finding records unchanged; completion evidence belongs with this child ticket.

## Comments

Ticket breakdown approved by Billy through the to-tickets approval form. Implementation has not started.
