# 26: Resolve or clearly account for shutdown and build risks

**What to build:** The recorded shutdown warning and build-tool advisories have reproducible evidence and a clear disposition.

**Blocked by:** None (can start once implementation is authorised).

**Status:** ready-for-agent

**Parent findings:** [10: shutdown and build risks](10-shutdown-and-build-risks.md)

**Plan:** 0.1; 5.2; existing risk record

**Execution:** Billy approved ticket publication, including safeguard 31. Application development remains paused until explicitly resumed. Readiness does not start work.

## Acceptance criteria

- [ ] Reproduce the affected shutdown path and verify any authorised correction without weakening sender validation; if not reproduced, retain that limitation rather than claim it fixed.
- [ ] Run a fresh dependency assessment and distinguish application-runtime from development/build exposure.
- [ ] Assess the official compatible remedy before dependency changes; do not force a downgrade, override or major change.
- [ ] Keep any unresolved upstream problem explicit and request a genuine scope/risk decision if required; do not invent a new zero-advisory release requirement.
- [ ] For any confirmed bug fixed here, retain a permanent regression test that fails before the fix and passes afterwards.
- [ ] Record the exercised user-path results and exact revision; satisfy the existing project checks before committing. Distinguish failures, blocked work and unverified behaviour.

## Sources and boundaries

- [Agreed development plan](../../../../cauldron-astro/CAULDRON-ASTRO-PLAN.md): the numbered requirements above.
- [Whole-repository review](../../../docs/cauldron-code-review.md): evidence of the relevant faults and remaining acceptance work.
- [Retrospective](../../../docs/cauldron-retro.md): regression-test and evidence guidance; other environment changes require their own approval.

Use the existing implementation and tracker. Preserve the original sites, settled decisions and accepted scope. No speculative restructuring, additional features or weaker assertions. Keep parent finding records unchanged; completion evidence belongs with this child ticket.

## Comments

Ticket breakdown approved by Billy through the to-tickets approval form. Implementation has not started.
