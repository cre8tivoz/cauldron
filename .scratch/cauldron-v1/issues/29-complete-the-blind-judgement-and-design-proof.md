# 29: Complete the blind judgement and design proof

**What to build:** Billy judges both comparisons blind and the unchanged measured evidence establishes whether the agreed release gate passes.

**Blocked by:** [25: Prove all five library components work](25-prove-all-five-library-components-work.md), [27: Build and measure the first real-brief comparison](27-build-and-measure-the-first-real-brief-comparison.md), [28: Build and measure the second real-brief comparison](28-build-and-measure-the-second-real-brief-comparison.md)

**Status:** ready-for-human

**Parent findings:** [06: approved taste criteria](06-approved-taste-criteria.md), [07: library nine checks](07-library-nine-checks.md), [08: real brief blind proof](08-real-brief-blind-proof.md)

**Plan:** 4.1–4.5; ADR 0005

**Execution:** Billy approved ticket publication, including safeguard 31. Application development remains paused until explicitly resumed. Readiness does not start work.

## Acceptance criteria

- [ ] Record the approved automatic and human checks across both test-site copies and both real-brief targets.
- [ ] Billy judges both comparison pairs before the condition key is revealed; no model substitutes its own preference.
- [ ] Cauldron must win both comparisons and pass the agreed measured checks.
- [ ] A loss, failed measurement or missing verdict remains an open release gate; record it honestly.
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
