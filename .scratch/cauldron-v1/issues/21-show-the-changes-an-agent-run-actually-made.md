# 21: Show the changes an agent run actually made

**What to build:** The preview comparison covers the agreed changed text, settings, styles and removed elements, with clear failure messages.

**Blocked by:** [12: Undo an agent run without losing other work](12-undo-an-agent-run-without-losing-other-work.md)

**Status:** done

**Parent findings:** [03: before after and run undo](03-before-after-and-run-undo.md)

**Plan:** 2.2

**Execution:** Billy approved ticket publication, including safeguard 31. Application development remains paused until explicitly resumed. Readiness does not start work.

## Acceptance criteria

- [x] Exercise the real preview toggle for text, attribute, style-only and removal changes.
- [x] Comparison identifies the run’s own affected parts without attributing unrelated manual work to it.
- [x] A capture or highlighting failure is reported, not replaced with a misleading successful empty comparison.
- [x] Preserve the agreed comparison scope; do not add an unspecified second rendered site as a new requirement.
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

1. Attribute-only and style-only changes were invisible: the snapshot kept only text and eight computed styles, keyed by line and column without the file, so the same position in two files collided. Fix (`src/main/index.ts` `collectLocs`): each element records its file, own text, attributes, class and inline style.
2. The comparison was taken before the preview reloaded, so it compared the old page. Fix: the preview reloads before the after-snapshot in all three finish paths.
3. Deleting one line made every later element look changed or removed (seen live: 27 false outlines and 54 false removals). Fix (new `src/main/compare.ts`): elements are matched by content, not line number.
4. A removed element next to an edited one was mis-paired. Fixed by matching gaps by tag.

Removed elements are listed in the run list as "Removed: <tag> at <file>:<line>". Only files the run owns take part, so the person's own edits are not attributed to the run. A capture failure reports "The page could not be compared" and sets no highlights.

**Regression tests:** `scripts/test-core.mjs` 2.2 (seven): text, attribute, style-only, removal, another file's change excluded, line shift, delete beside a change. Their red run only showed the new module missing, which is weak evidence. The stronger red is the real path: before the fixes the live comparison produced the 27 false outlines and 54 false removals above.

**Verification evidence:** packaged app, `CAULDRON_COMPARE_TEST` on a fresh WDLsite copy, driving the real Show/Hide changes buttons: **16/16**, re-run on the final code: 16/16. The changed section, h1 and p were outlined in the preview; the removed p was listed by name; the person's hand edit in another file was not outlined; hiding cleared the outlines.

**Limitations:** not exercised: a run that deletes a whole file, CSS rule changes (only inline style and class are in scope), a changed page other than the one in the preview. No second rendered site was added.
