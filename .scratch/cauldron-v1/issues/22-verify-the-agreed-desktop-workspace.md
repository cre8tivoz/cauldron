# 22: Verify the agreed desktop workspace

**What to build:** The approved layout, sizing, selection context and tool switching work at the supported desktop sizes.

**Blocked by:** None (can start once implementation is authorised).

**Status:** done

**Parent findings:** [04: workspace and selection context](04-workspace-and-selection-context.md)

**Plan:** 3.1; settled UI decisions

**Execution:** Billy approved ticket publication, including safeguard 31. Application development remains paused until explicitly resumed. Readiness does not start work.

## Acceptance criteria

- [x] Exercise resizable and collapsible left-agent/centre-preview/right-inspector panels at 1280 × 800 and larger sizes.
- [x] Switch every tool view without the native preview obscuring it.
- [x] Keep Coral, Source Sans 3 and the Mac system theme.
- [x] Trace proposed device sizing, selection-chip or persistence changes to an actual agreed requirement before treating them as implementation work; label unapproved research separately.
- [x] For any confirmed bug fixed here, retain a permanent regression test that fails before the fix and passes afterwards. (No bug was found; no fix was made, so no regression was added.)
- [x] Record the exercised user-path results and exact revision; satisfy the existing project checks before committing. Distinguish failures, blocked work and unverified behaviour.

## Sources and boundaries

- [Agreed development plan](../../../../cauldron-astro/CAULDRON-ASTRO-PLAN.md): the numbered requirements above.
- [Whole-repository review](../../../docs/cauldron-code-review.md): evidence of the relevant faults and remaining acceptance work.
- [Retrospective](../../../docs/cauldron-retro.md): regression-test and evidence guidance; other environment changes require their own approval.

Use the existing implementation and tracker. Preserve the original sites, settled decisions and accepted scope. No speculative restructuring, additional features or weaker assertions. Keep parent finding records unchanged; completion evidence belongs with this child ticket.

## Comments

Ticket breakdown approved by Billy through the to-tickets approval form. Implementation has not started.

### Verification (2026-11-08, revision 3778e10 + the test changes below)

Ran the packaged app at `3778e10` with `CAULDRON_UI_TEST=1`, `CAULDRON_E2E_SITE` on a copy of `WDLsite` and a fresh `CAULDRON_TEST_USER_DATA`. The window stayed hidden; no app was foregrounded.

`src/main/e2e.ts` gained 13 checks in the existing UI harness (no new infrastructure) that drive the real controls: keyboard `ArrowRight`/`ArrowLeft` on both splitters, and the Agent/Element collapse buttons. At 1280 × 800 and 1440 × 900 they confirm:

- the workspace has no horizontal overflow and both columns are present;
- the native preview rectangle equals the stage rectangle (within 2 px) before resizing;
- the agent column grows 400 → 416 (1280) and 416 → 432 (1440), and the preview follows;
- the element column grows 300 → 316 (1280) and 316 → 332 (1440), and the preview follows;
- collapsing both columns removes them and grows the stage to 1232 (1280) and 1392 (1440), with the preview filling it;
- expanding both restores the columns and the preview bounds;
- the computed body font is `Source Sans 3`, `--accent` matches the active macOS scheme (`#ffa99a` while the test machine is in dark mode, `#a13f33` in light).

The five non-Build tool views were switched through their rail buttons and each left the native preview at zero bounds. Build restored non-zero bounds. No renderer errors were recorded.

Result: **20/20 `3.1` checks pass**, and 23/24 overall. The one failure, `4.2 the measured direction's tokens are offered in the visual controls`, is pre-existing: the same suite on unmodified `3778e10` (test changes stashed) produced exactly the same failure (10/11). It is unrelated to layout and is not fixed here; it needs its own ticket/decision.

`npm run check` passes on the final source. No device sizing, selection-chip or persistence changes were made or are required by this ticket; nothing unapproved was treated as work.

Evidence logs: `~/.hermes/profiles/claudia/cache/scratch/t22-26/ui.log` (final) and `ui-baseline.log` (unmodified baseline).
