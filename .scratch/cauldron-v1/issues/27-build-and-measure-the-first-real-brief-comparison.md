# 27: Build and measure the first real-brief comparison

**What to build:** One contrasting real brief has comparable Claude-alone and Cauldron builds, measured and prepared for blind judgement.

**Blocked by:** [18: Prove Claude works through the repaired app](18-prove-claude-works-through-the-repaired-app.md), [24: Verify taste and design-direction compliance](24-verify-taste-and-design-direction-compliance.md)

**Status:** ready-for-agent

**Parent findings:** [08: real brief blind proof](08-real-brief-blind-proof.md)

**Plan:** 4.5; approved taste-test targets

**Execution:** Billy approved ticket publication, including safeguard 31. Application development remains paused until explicitly resumed. Readiness does not start work.

## Acceptance criteria

- [ ] Record real-brief provenance and use identical brief text for the two conditions.
- [ ] Build both versions independently and apply the unchanged agreed measurements/taste checks to the Cauldron output.
- [ ] Preserve outputs and evidence under neutral labels; keep the condition key out of Billy’s view before judgement.
- [ ] Do not require the standalone version to fail, invent real-brief provenance or add another mandatory brief-approval gate.
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
