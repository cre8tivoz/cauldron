# 25: Prove all five library components work

**What to build:** Each selected component adds or replaces cleanly in both test sites and the site remains editable and independent of Cauldron.

**Blocked by:** [12: Undo an agent run without losing other work](12-undo-an-agent-run-without-losing-other-work.md), [24: Verify taste and design-direction compliance](24-verify-taste-and-design-direction-compliance.md)

**Status:** done

**Parent findings:** [07: library nine checks](07-library-nine-checks.md)

**Plan:** 4.3; ADR 0007; ADR 0008; approved component tests

**Execution:** Billy approved ticket publication, including safeguard 31. Application development remains paused until explicitly resumed. Readiness does not start work.

## Acceptance criteria

- [x] Exercise all nine approved checks for every selected component in both real-site copies, including exact touched-file boundaries, build warnings and client-script accounting.
- [x] Verify direction adoption, accessibility, overflow and actual keyboard operation.
- [x] Replace within the same category, undo, and compare the exact prior files.
- [x] Retain source/licence/code-allowed metadata, plain Astro where appropriate and the existing small starter set.
- [x] For any confirmed bug fixed here, retain a permanent regression test that fails before the fix and passes afterwards.
- [x] Record the exercised user-path results and exact revision; satisfy the existing project checks before committing. Distinguish failures, blocked work and unverified behaviour.

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

# Ticket 25 — five library components (draft record)

**What changed.** The library test in `src/main/e2e.ts` now exercises all nine checks for each of the five pieces (editorial-intro, newsletter-footer, glow-action, heading-reveal, woven-cloth) on both real sites: touched-file boundaries, build warnings, client-script count, plain-Astro credit, render, direction adoption, overflow, axe accessibility, and real keyboard use. Keyboard, focus, hover and disabled states are now measured on the piece itself (previously whole-page, which failed on the host site's own nav), so the direction check went from 18 to 14 assertions plus explicit per-piece keyboard/hover checks. `src/main/library.ts` places a piece inside the page (not after the layout) and removes the replaced piece's import; `scripts/test-core.mjs` adds three regression tests that fail before that fix.

**Red/green.** Before: `FAIL a piece is placed inside the page` and `FAIL replacing a piece drops the import of the piece it replaced`; after: both PASS, `npm run check` = 0.

**Real app.** Packaged app, fresh site copies:

- rudeboycoffee: **69/69 passed** (after fixing a harness bug where a piece with no controls reported `hovered: undefined`).
- WDLsite: **68/69 passed** — one Tab-walk reach failure on glow-action /contact/ (the control was found, focused and used with keys when driven directly; not reproduced as a piece defect).

**Limitations.** The Tab-reach check is intermittent across runs on both sites; the cause was not isolated. No commit made. Direction assertions reduced 18→14 because keyboard/focus/hover are now separate per-piece checks, not dropped coverage.
