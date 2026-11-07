# 17: Use the same checked editing actions everywhere

**What to build:** Visual controls and agent connections use the same version-checked editing actions and conflict rules.

**Blocked by:** [15: Verify consistent safe saving across the editor](15-verify-consistent-safe-saving-across-the-editor.md)

**Status:** done

**Parent findings:** [02: shared actions and agent support](02-shared-actions-and-agent-support.md)

**Plan:** 2.1; 3.3; ADR 0006

**Execution:** Billy approved ticket publication, including safeguard 31. Application development remains paused until explicitly resumed. Readiness does not start work.

## Acceptance criteria

- [x] Exercise equivalent edits through visual controls, the in-app action connection and authenticated outside-agent access.
- [x] Every applicable write identifies its starting version; stale edits follow the agreed refusal or safe conflict handling.
- [x] Changes participate in shared history and the correct agent run; connection/catalogue text alone is insufficient evidence.
- [x] Outside access is localhost-only, uses the per-site code and stops when the app/site closes.
- [x] For any confirmed bug fixed here, retain a permanent regression test that fails before the fix and passes afterwards.
- [x] Record the exercised user-path results and exact revision; satisfy the existing project checks before committing. Distinguish failures, blocked work and unverified behaviour.

## Sources and boundaries

- [Agreed development plan](../../../../cauldron-astro/CAULDRON-ASTRO-PLAN.md): the numbered requirements above.
- [Whole-repository review](../../../docs/cauldron-code-review.md): evidence of the relevant faults and remaining acceptance work.
- [Retrospective](../../../docs/cauldron-retro.md): regression-test and evidence guidance; other environment changes require their own approval.

Use the existing implementation and tracker. Preserve the original sites, settled decisions and accepted scope. No speculative restructuring, additional features or weaker assertions. Keep parent finding records unchanged; completion evidence belongs with this child ticket.

## Comments

Ticket breakdown approved by Billy through the to-tickets approval form. Implementation has not started.

### Completion record — 7 Nov 2026 (batch 2)

**Revision:** batch 2 commit `fix: batch 2, one set of editing actions and all three agents`, built on `28f9135`. Node 26.13.0. Work by subagents in separate worktrees; merged, re-run and verified by the orchestrator on the final merged code.

**Issues found:** none. All three paths already behaved identically, so no product code changed and no regression test was added (no bug to pin).

**Verification evidence:** packaged app, `CAULDRON_ACTIONS_TEST` on fresh WDLsite copies: **35/35**, re-run on the final code: 35/35.

- The same text edit and the same style edit through (a) the visual controls, (b) the in-app action channel and (c) the outside-agent connection (real HTTP JSON-RPC: initialize, tools/list, tools/call with the per-site code) all reached the file.
- A stale starting version was refused on all three paths with the file unchanged.
- Undo restored each edit. Visual and in-app writes are the person's own; connection writes are tagged with the open run, or `agent-connection` outside a run.
- The connection listens on 127.0.0.1 only; a wrong or missing code gets 401; after opening another site the old address and code are refused; after the app exits both recorded ports refuse connections (`curl` exit 7).

**Limitations:** page creation records no undo step (existing behaviour, outside this ticket). Agents keep their own file tools as well (decided: a product question for Billy, not changed here).
