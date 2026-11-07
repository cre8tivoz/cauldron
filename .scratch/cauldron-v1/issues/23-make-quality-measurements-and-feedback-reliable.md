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
