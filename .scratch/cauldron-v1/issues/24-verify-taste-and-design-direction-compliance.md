# 24: Verify taste and design-direction compliance

**What to build:** The approved taste and direction checks judge the agent’s changes using the site’s chosen tokens, including the reference-URL path.

**Blocked by:** [12: Undo an agent run without losing other work](12-undo-an-agent-run-without-losing-other-work.md), [23: Make quality measurements and feedback reliable](23-make-quality-measurements-and-feedback-reliable.md)

**Status:** ready-for-agent

**Parent findings:** [06: approved taste criteria](06-approved-taste-criteria.md)

**Plan:** 4.1; 4.2; approved taste tests

**Execution:** Billy approved ticket publication, including safeguard 31. Application development remains paused until explicitly resumed. Readiness does not start work.

## Acceptance criteria

- [ ] Implement and verify the approved automatic checks against changed output on both real-site copies at the approved widths, with negative controls that genuinely fail.
- [ ] Keep separately labelled whole-site diagnostics; check the full approved token, state, reduced-motion and direction-exception requirements.
- [ ] Exercise choosing a starter direction and extracting a direction from a reference URL, saving it in the site and offering its tokens in visual controls.
- [ ] Record implementation-choice provenance without presenting it as a new Billy decision. The two real-brief targets are exercised by tickets 27/28 and aggregated in 29; this ticket alone does not close the four-target parent finding.
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
