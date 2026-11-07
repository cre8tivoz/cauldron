# 25: Prove all five library components work

**What to build:** Each selected component adds or replaces cleanly in both test sites and the site remains editable and independent of Cauldron.

**Blocked by:** [12: Undo an agent run without losing other work](12-undo-an-agent-run-without-losing-other-work.md), [24: Verify taste and design-direction compliance](24-verify-taste-and-design-direction-compliance.md)

**Status:** ready-for-agent

**Parent findings:** [07: library nine checks](07-library-nine-checks.md)

**Plan:** 4.3; ADR 0007; ADR 0008; approved component tests

**Execution:** Billy approved ticket publication, including safeguard 31. Application development remains paused until explicitly resumed. Readiness does not start work.

## Acceptance criteria

- [ ] Exercise all nine approved checks for every selected component in both real-site copies, including exact touched-file boundaries, build warnings and client-script accounting.
- [ ] Verify direction adoption, accessibility, overflow and actual keyboard operation.
- [ ] Replace within the same category, undo, and compare the exact prior files.
- [ ] Retain source/licence/code-allowed metadata, plain Astro where appropriate and the existing small starter set.
- [ ] For any confirmed bug fixed here, retain a permanent regression test that fails before the fix and passes afterwards.
- [ ] Record the exercised user-path results and exact revision; satisfy the existing project checks before committing. Distinguish failures, blocked work and unverified behaviour.

## Sources and boundaries

- [Agreed development plan](../../../../cauldron-astro/CAULDRON-ASTRO-PLAN.md): the numbered requirements above.
- [Whole-repository review](../../../docs/cauldron-code-review.md): evidence of the relevant faults and remaining acceptance work.
- [Retrospective](../../../docs/cauldron-retro.md): regression-test and evidence guidance; other environment changes require their own approval.
- [Approved taste and component criteria](../../../../cauldron-astro/design/camillo/taste-tests.md): preserve the original checks and thresholds.

Use the existing implementation and tracker. Preserve the original sites, settled decisions and accepted scope. No speculative restructuring, additional features or weaker assertions. Keep parent finding records unchanged; completion evidence belongs with this child ticket.

## Comments

Ticket breakdown approved by Billy through the to-tickets approval form. Implementation has not started.
