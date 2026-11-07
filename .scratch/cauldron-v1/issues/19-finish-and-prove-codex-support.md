# 19: Finish and prove Codex support

**What to build:** Codex has the configured Cauldron action connection and completes the same real editing and conversation workflow.

**Blocked by:** [18: Prove Claude works through the repaired app](18-prove-claude-works-through-the-repaired-app.md)

**Status:** done

**Parent findings:** [02: shared actions and agent support](02-shared-actions-and-agent-support.md)

**Plan:** 3.2; 3.3

**Execution:** Billy approved ticket publication, including safeguard 31. Application development remains paused until explicitly resumed. Readiness does not start work.

## Acceptance criteria

- [x] Prove a real in-app edit and authenticated outside connection using the shared actions.
- [x] Exercise conversation continuation, selected-element context, progress, cancellation and genuine failure reporting.
- [x] Record reviewable files, safe run undo, design-direction and taste context on the corrected integration.
- [x] Claim support only for the real paths actually exercised.
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

**Issues found and fixed:**

1. Codex was never given the Cauldron connection: its command line had no connection settings. Fix (`src/main/agent.ts`): the site's address and code are passed per run with `-c mcp_servers.cauldron.*` on new and resumed runs. Nothing is written to Codex's own settings.
2. `codex exec` cancelled every connection tool call ("user cancelled MCP tool call"). Fix: `default_tools_approval_mode="approve"` for the Cauldron connection only.
3. A Codex notice (an `error` item such as "Skill descriptions were shortened") failed the whole run. It is now shown as a status; a real `turn.failed` still fails.
4. `read_page_outline` gave no line or column, so an outside agent could not aim any edit. Fix (`src/main/actions.ts`): outline entries carry them.

**Regression tests:** `scripts/test-agent.mjs`: Codex is given the connection; a resumed job is given it too; no connection when the app has none; connection tool calls are reported as progress; a notice does not fail the run; a failed turn is still an error. `scripts/test-core.mjs`: the outline gives usable positions. Red evidence (from the subagent's run): the pre-fix command line had no `-c` settings.

**Verification evidence:** packaged app, `CAULDRON_CODEX_TEST`, fresh WDLsite copies: **20/20**, re-run twice on the final code: 20/20 (one run first showed 19/20 because the test's own process filter matched Cauldron's helper; the filter was fixed, not the product).

- REAL (installed Codex CLI 0.152.0): Codex called `list_pages`, `read_page_outline`, `read_selection` and `edit_element_text`; the run listed `src/layouts/Base.astro` as its own; the file changed; progress arrived during the run; the continued job used `codex exec resume <id>` and remembered the earlier request; undo restored the file; cancelling left no Codex process and the run was failed, not successful.
- FIXTURE: a failing `codex` first on PATH was reported as a failure.

**Limitations:** a connection action failing mid-run was seen once (aimed at a container element, refused by design, shown as a status) but not tested deliberately.
