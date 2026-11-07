# 16: Publish safely and retry a failed upload

**What to build:** Publishing is explicit, refuses every unsaved buffer and can retry an already committed change after an upload failure.

**Blocked by:** [13: Recover every unsaved edit after a crash](13-recover-every-unsaved-edit-after-a-crash.md)

**Status:** ready-for-agent

**Parent findings:** [09: publishing and mac release](09-publishing-and-mac-release.md)

**Plan:** 5.1

**Execution:** Billy approved ticket publication, including safeguard 31. Application development remains paused until explicitly resumed. Readiness does not start work.

## Acceptance criteria

- [ ] Reproduce the clean-tree retry refusal before repair, then prove retry succeeds against an isolated remote without creating an unnecessary second commit.
- [ ] Show changed files and publish only after an explicit request through the open site’s own repository.
- [ ] Block publishing for visual and content buffers, including edits not yet written to recovery storage.
- [ ] Keep local commit and remote upload outcomes distinct; handle remote/upstream failures visibly.
- [ ] For any confirmed bug fixed here, retain a permanent regression test that fails before the fix and passes afterwards.
- [ ] Record the exercised user-path results and exact revision; satisfy the existing project checks before committing. Distinguish failures, blocked work and unverified behaviour.

## Sources and boundaries

- [Agreed development plan](../../../../cauldron-astro/CAULDRON-ASTRO-PLAN.md): the numbered requirements above.
- [Whole-repository review](../../../docs/cauldron-code-review.md): evidence of the relevant faults and remaining acceptance work.
- [Retrospective](../../../docs/cauldron-retro.md): regression-test and evidence guidance; other environment changes require their own approval.

Use the existing implementation and tracker. Preserve the original sites, settled decisions and accepted scope. No speculative restructuring, additional features or weaker assertions. Keep parent finding records unchanged; completion evidence belongs with this child ticket.

## Comments

Ticket breakdown approved by Billy through the to-tickets approval form. Implementation has not started.
