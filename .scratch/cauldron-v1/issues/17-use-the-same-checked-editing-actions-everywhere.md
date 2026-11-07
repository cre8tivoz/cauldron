# 17: Use the same checked editing actions everywhere

**What to build:** Visual controls and agent connections use the same version-checked editing actions and conflict rules.

**Blocked by:** [15: Verify consistent safe saving across the editor](15-verify-consistent-safe-saving-across-the-editor.md)

**Status:** ready-for-agent

**Parent findings:** [02: shared actions and agent support](02-shared-actions-and-agent-support.md)

**Plan:** 2.1; 3.3; ADR 0006

**Execution:** Billy approved ticket publication, including safeguard 31. Application development remains paused until explicitly resumed. Readiness does not start work.

## Acceptance criteria

- [ ] Exercise equivalent edits through visual controls, the in-app action connection and authenticated outside-agent access.
- [ ] Every applicable write identifies its starting version; stale edits follow the agreed refusal or safe conflict handling.
- [ ] Changes participate in shared history and the correct agent run; connection/catalogue text alone is insufficient evidence.
- [ ] Outside access is localhost-only, uses the per-site code and stops when the app/site closes.
- [ ] For any confirmed bug fixed here, retain a permanent regression test that fails before the fix and passes afterwards.
- [ ] Record the exercised user-path results and exact revision; satisfy the existing project checks before committing. Distinguish failures, blocked work and unverified behaviour.

## Sources and boundaries

- [Agreed development plan](../../../../cauldron-astro/CAULDRON-ASTRO-PLAN.md): the numbered requirements above.
- [Whole-repository review](../../../docs/cauldron-code-review.md): evidence of the relevant faults and remaining acceptance work.
- [Retrospective](../../../docs/cauldron-retro.md): regression-test and evidence guidance; other environment changes require their own approval.

Use the existing implementation and tracker. Preserve the original sites, settled decisions and accepted scope. No speculative restructuring, additional features or weaker assertions. Keep parent finding records unchanged; completion evidence belongs with this child ticket.

## Comments

Ticket breakdown approved by Billy through the to-tickets approval form. Implementation has not started.
