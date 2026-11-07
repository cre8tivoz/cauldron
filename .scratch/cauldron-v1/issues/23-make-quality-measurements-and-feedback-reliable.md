# 23: Make quality measurements and feedback reliable

**What to build:** Quality reports use the agreed measurements and plain-English feedback can be applied through the agent.

**Blocked by:** [18: Prove Claude works through the repaired app](18-prove-claude-works-through-the-repaired-app.md)

**Status:** in-progress

**Parent findings:** [06: approved taste criteria](06-approved-taste-criteria.md)

**Plan:** 4.4; approved contrast and keyboard criteria

**Execution:** Billy approved ticket publication, including safeguard 31. Application development remains paused until explicitly resumed. Readiness does not start work.

## Acceptance criteria

- [ ] Build and inspect real output at the three approved widths, with fonts ready; cover overflow, keyboard use, accessibility, broken links and speed.
- [ ] Measure the approved text, button and keyboard-focus contrast thresholds rather than only checking indicator presence.
- [ ] Keep measured site results, check execution failures and design opinions distinct.
- [ ] Exercise feedback-to-agent correction through the interface and remeasure the result.
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

### Completion record — 8 Nov 2026 (batch 3a)

**Revision:** batch 3a commit `fix: batch 3a, reliable quality and taste checks, working library pieces`, built on `55d5a95`. Work, merge and test runs by subagents; reviewed by the orchestrator.

# Ticket 23 — draft record (rev 55d5a95, uncommitted worktree diff)

**Scope:** quality measurements and feedback loop. Files: src/main/contrast.ts (new), quality.ts, taste-check.ts, QualityPanel.tsx, main/index.ts, e2e.ts, declarations.d.ts, scripts/test-core.mjs.

**Fixes**

- Contrast is measured from real pixels, not assumed: text thresholds by size/weight, button text held to 4.5:1, focus indicators judged at 3:1 against the page behind them (outline offset honoured).
- All text nodes judged (previous 60-node cap could pass a site with pale labels).
- Every check carries a kind (measured / failure / opinion), so measurements, execution failures and design opinions stay distinct.
- Taste checks run at 375/768/1280 per page and are labelled by width, so breakpoint-only off-scale sizes are caught.
- Plain-English feedback box in the Quality panel sends to the chosen agent, then remeasures.

**Red/green:** before the fixes the packaged run failed 8 checks (no widths, no button contrast, no font check, kinds empty, fixture failures missed). `npm run check` exits 0 (typecheck, oxlint, unit tests) and now includes permanent regression tests: pale focus ring, offset focus ring, button 4.5:1, all text nodes.

**Real-app:** packaged app on a fresh copy of rudeboycoffee — 18/18 PASS (measurement + fixture) and 11/11 PASS (feedback→agent→remeasure).

**Limitations:** feedback run needs a live agent CLI; no commit made; manual visual review of the panel not done.

**Not done (blocks this ticket):** sending the quality report back to an agent as a fix request does not yet work end to end. On the final code, real Codex started without Cauldron's tools connected, replied that the connection was missing and changed nothing (feedback test 9/12, honest failure). Earlier runs that evening did load the connection, so it is intermittent; the cause in Codex 0.152 is unknown. The brief now tells the agent to report a missing connection instead of guessing, Codex gets a 60 s start-up allowance, and the test's checks were tightened to the fixture's Go button and to a real file change (two had passed falsely before). The flawed practice page is now kept in `scripts/fixtures/quality-fixture.astro` and installed by both quality tests. Other criteria met: quality test 15/15, project checks 89 PASS.

### Progress record — 8 Nov 2026 (ticket 23 remainder)

**Revision:** on committed `c33fc6a`, plus one diagnostic hook (below). Real Codex run, no fixtures standing in for the agent.

**Investigation (cause not established).** The following checks succeeded, but they did not reproduce or explain the earlier failing session:

- The exact command Cauldron builds (`codex exec <brief> --json -c mcp_servers.cauldron.url=… -c http_headers=… -c startup_timeout_sec=60 -c default_tools_approval_mode="approve" -C <site> --skip-git-repo-check --sandbox workspace-write`) was replayed ten times against a stand-in MCP server on 127.0.0.1 (invalid model, so no model cost). The server received `initialize`, `notifications/initialized` and `tools/list` on all ten runs. `codex mcp get cauldron` with the same overrides shows `transport: streamable_http`, `enabled: true`, header present.
- The Cauldron side now records what reaches `/mcp` when `CAULDRON_MCP_LOG` names a file. In the passing run the server logged `start` (port 62968, 9 tools), then `codex-mcp-client/0.152.0` posting `initialize`, `notifications/initialized`, `tools/list` and four `tools/call`s. Nothing closed it.
- Codex's own rollout for the failing 9/12 run shows no `cauldron` MCP tool calls at all — the turn was over in 5.9 s — while the passing run's rollout shows `McpToolCall server=cauldron` directly (`read_design`, `list_pages`, `read_page_outline`, `edit_element_style`). Absence of tool calls does not prove that the tools were unavailable or establish whether the fault was in Codex or Cauldron.

**Change.** `src/main/mcp.ts`: an off-by-default request log (`CAULDRON_MCP_LOG`) that records server start/close and each request's method, authorisation and client name. It changes nothing when unset; it exists so a future "connection missing" report can be classified as never-connected or connected-but-unused, which this ticket could not previously tell apart. `startup_timeout_sec=60` stays, as a harmless allowance.

**Real proof.** `npm run package`; disposable copy of `rudeboycoffee` under `…/scratch/b23finish/site` (copy's `.git` removed), fresh user data dir, hidden test window, `CAULDRON_QUALITY_FEEDBACK_TEST=1 CAULDRON_AGENT_TOOL=codex`. Log `…/b23finish/run1.log`, MCP log `…/b23finish/mcp.log`, argv `…/b23finish/agent-args.log`.

- Feedback test **12/12 PASS**, app exit 0.
- Before: `/quality-fixture/ at 375px`, `Go 4.2:1` — measured failure.
- Codex reply: changed `src/pages/quality-fixture.astro`, Go button text colour to `var(--cauldron-c-ink)`; the copy's fixture file contains `style="color: var(--cauldron-c-ink)"` on `button.go`. Original site untouched (files still June-dated).
- Actions served: `read_design`, `list_pages`, `read_page_outline`, `edit_element_style`.
- After remeasure: `Checked 1 button(s) at 4.5:1; lowest 16.8:1`.

**Checks.** `npm run typecheck` exits 0; agent/core unit tests pass (including the brief and Codex-timeout tests). `npm run lint` still stops at `oxfmt --check` on the pre-existing **untracked** `.scratch/cauldron-v1/next-session.md`; that file was deliberately left untouched, and `src/main/mcp.ts` passes `oxfmt --check` and `oxlint` on its own.

**Still open.** One real run now proves the complete feedback path can work. It does not fix or explain the previous intermittent failures, so ticket 23 remains in progress. No source change repaired the launch path, and no automatic retry was added. Root cause and reliability remain unverified; attributing this to upstream Codex would be premature.
