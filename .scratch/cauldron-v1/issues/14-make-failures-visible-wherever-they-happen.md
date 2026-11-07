# 14: Make failures visible wherever they happen

**What to build:** Failures in recovery, file scanning, comparison, design settings and quality checking show a useful message and diagnostic.

**Blocked by:** None (can start once implementation is authorised).

**Status:** ready-for-agent

**Parent findings:** [00: process and traceability](00-process-and-traceability.md), [01: core save and recovery evidence](01-core-save-and-recovery-evidence.md), [03: before after and run undo](03-before-after-and-run-undo.md), [06: approved taste criteria](06-approved-taste-criteria.md), [10: shutdown and build risks](10-shutdown-and-build-risks.md)

**Plan:** 1.1; 1.6; 2.2; 4.2; 4.4; AGENTS failure reporting

**Execution:** Billy approved ticket publication, including safeguard 31. Application development remains paused until explicitly resumed. Readiness does not start work.

## Acceptance criteria

- [ ] Inject each of the seven failure-handling cases documented in the review and verify its actual visible result plus console diagnostic.
- [ ] A missing optional file remains distinguishable from unreadable or malformed data; uncertainty is not reported as an empty or successful result.
- [ ] Restore refusal remains visible with no selection, a collapsed inspector and another tool view open.
- [ ] Keep existing preview isolation and sender checks intact.
- [ ] For any confirmed bug fixed here, retain a permanent regression test that fails before the fix and passes afterwards.
- [ ] Record the exercised user-path results and exact revision; satisfy the existing project checks before committing. Distinguish failures, blocked work and unverified behaviour.

## Sources and boundaries

- [Agreed development plan](../../../../cauldron-astro/CAULDRON-ASTRO-PLAN.md): the numbered requirements above.
- [Whole-repository review](../../../docs/cauldron-code-review.md): evidence of the relevant faults and remaining acceptance work.
- [Retrospective](../../../docs/cauldron-retro.md): regression-test and evidence guidance; other environment changes require their own approval.

Use the existing implementation and tracker. Preserve the original sites, settled decisions and accepted scope. No speculative restructuring, additional features or weaker assertions. Keep parent finding records unchanged; completion evidence belongs with this child ticket.

## Comments

Ticket breakdown approved by Billy through the to-tickets approval form. Implementation has not started.
