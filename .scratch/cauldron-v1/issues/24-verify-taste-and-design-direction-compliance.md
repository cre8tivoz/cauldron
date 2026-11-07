# 24: Verify taste and design-direction compliance

**What to build:** The approved taste and direction checks judge the agent’s changes using the site’s chosen tokens, including the reference-URL path.

**Blocked by:** [12: Undo an agent run without losing other work](12-undo-an-agent-run-without-losing-other-work.md), [23: Make quality measurements and feedback reliable](23-make-quality-measurements-and-feedback-reliable.md)

**Status:** done

**Parent findings:** [06: approved taste criteria](06-approved-taste-criteria.md)

**Plan:** 4.1; 4.2; approved taste tests

**Execution:** Billy approved ticket publication, including safeguard 31. Application development remains paused until explicitly resumed. Readiness does not start work.

## Acceptance criteria

- [x] Implement and verify the approved automatic checks against changed output on both real-site copies at the approved widths, with negative controls that genuinely fail.
- [x] Keep separately labelled whole-site diagnostics; check the full approved token, state, reduced-motion and direction-exception requirements.
- [x] Exercise choosing a starter direction and extracting a direction from a reference URL, saving it in the site and offering its tokens in visual controls.
- [x] Record implementation-choice provenance without presenting it as a new Billy decision. The two real-brief targets are exercised by tickets 27/28 and aggregated in 29; this ticket alone does not close the four-target parent finding.
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

# Ticket 24 — taste and design-direction compliance (draft record)

**Fixes:** taste checks now judge only what an agent run wrote (new `src/main/taste-change.ts` works out the classes/ids/style rules the run added); a scoped "Agent changes:" report sits beside the unchanged whole-site diagnostics. Contrast (4.5:1 text, 4.5:1 buttons, 3:1 focus) is measured. Off-token spacing/type/radius now name the element. Scoped pages are found even when the run also touched a shared component (`changedPages` no longer returns only shared when both changed).

**Red/green:** 8 unit tests in `scripts/test-core.mjs` labelled 24 and permanent; the component-page scoping test failed before the `changedPages` fix.

**Real app (packaged, PASS):** change-taste harness 16/16 (includes reference-URL direction measured, saved to `cauldron/tokens.css`, used in checks); whole-site taste harness 20/20 including 14 negative controls that genuinely fail, reduced-motion, weak focus at 1.09:1 and the named-pure-black direction exception. `npm run check` exits 0 with 77 passing tests.

**Limitations:** starter-direction picking in visual controls and provenance notes are covered by existing tickets, not re-proven here; tickets 27/28/29 still own the real-brief comparison.
