# 31: Block local commits when existing checks fail

**What to build:** An explicitly installed local commit check runs the existing required commands and stops a failing commit without changing approval settings.

**Blocked by:** None (can start once implementation is authorised).

**Status:** ready-for-agent

**Parent findings:** [00: process and traceability](00-process-and-traceability.md)

**Plan:** Approved retrospective safeguard 31; retro recommendation 4

**Execution:** Billy approved ticket publication, including safeguard 31. Application development remains paused until explicitly resumed. Readiness does not start work.

## Acceptance criteria

- [ ] Use the existing project check commands and keep the packaged launch gate required by the project.
- [ ] Prove a deliberate failing check blocks the local commit path and a passing check permits it.
- [ ] Verify actual installation in this checkout; a tracked hook file alone is not proof.
- [ ] Retain the existing CI and approval settings. Billy separately approved this workflow safeguard when approving ticket publication; other environment changes still require their own approval.
- [ ] For any confirmed bug fixed here, retain a permanent regression test that fails before the fix and passes afterwards.
- [ ] Record the exercised user-path results and exact revision; satisfy the existing project checks before committing. Distinguish failures, blocked work and unverified behaviour.

## Sources and boundaries

- [Approved retrospective proposal](../../../docs/cauldron-retro.md): recommendation 4. This ticket adopts only the commit safeguard Billy approved.

Use the existing implementation and tracker. Preserve the original sites, settled decisions and accepted scope. No speculative restructuring, additional features or weaker assertions. Keep parent finding records unchanged; completion evidence belongs with this child ticket.

## Comments

Ticket breakdown approved by Billy through the to-tickets approval form. Implementation has not started.
