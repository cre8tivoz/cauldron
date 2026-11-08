# 29: Complete the blind judgement and design proof

**What to build:** Billy judges both comparisons blind and the unchanged measured evidence establishes whether the agreed release gate passes.

**Blocked by:** [25: Prove all five library components work](25-prove-all-five-library-components-work.md), [27: Build and measure the first real-brief comparison](27-build-and-measure-the-first-real-brief-comparison.md), [28: Build and measure the second real-brief comparison](28-build-and-measure-the-second-real-brief-comparison.md)

**Status:** open — Billy's blind verdicts recorded; Cauldron won PeNtA, lost Moretti Estate, and measured checks still have failures

**Parent findings:** [06: approved taste criteria](06-approved-taste-criteria.md), [07: library nine checks](07-library-nine-checks.md), [08: real brief blind proof](08-real-brief-blind-proof.md)

**Plan:** 4.1–4.5; ADR 0005

**Execution:** Billy approved ticket publication, including safeguard 31. Application development remains paused until explicitly resumed. Readiness does not start work.

## Acceptance criteria

- [ ] Record the approved automatic and human checks across both test-site copies and both real-brief targets.
- [x] Billy judges both comparison pairs before the condition key is revealed; no model substitutes its own preference.
- [ ] Cauldron must win both comparisons and pass the agreed measured checks.
- [ ] A loss, failed measurement or missing verdict remains an open release gate; record it honestly.
- [ ] For any confirmed bug fixed here, retain a permanent regression test that fails before the fix and passes afterwards.
- [ ] Record the exercised user-path results and exact revision; satisfy the existing project checks before committing. Distinguish failures, blocked work and unverified behaviour.

## Sources and boundaries

- [Agreed development plan](../../../../cauldron-astro/CAULDRON-ASTRO-PLAN.md): the numbered requirements above.
- [Whole-repository review](../../../docs/cauldron-code-review.md): evidence of the relevant faults and remaining acceptance work.
- [Retrospective](../../../docs/cauldron-retro.md): regression-test and evidence guidance; other environment changes require their own approval.
- [Approved taste and component criteria](../../../../cauldron-astro/design/camillo/taste-tests.md): preserve the original checks and thresholds.

Use the existing implementation and tracker. Preserve the original sites, settled decisions and accepted scope. No speculative restructuring, additional features or weaker assertions. Keep parent finding records unchanged; completion evidence belongs with this child ticket.

## Comments

Ticket breakdown approved by Billy through the to-tickets approval form.

## Current evidence — 8 Nov 2026

Both real-brief pairs have complete built outputs, preserved under neutral labels in
`.scratch/cauldron-v1/blind-comparison/outputs.tar.gz`. The app build used revision `e99b008`.
Brief provenance, identical-input hashes and measurements are recorded in tickets 27 and 28.

Automatic checks recorded 120 failures on the first app-built site and 52 on the second.
These include contrast, keyboard/focus and design-direction findings; none were waived or
silently fixed for the comparison. Building and measuring the pairs completes preparation,
not the release gate. The measured-check requirement is currently failed.

## Billy's completed blind judgement

Billy submitted both preferences before the condition key was read and revealed. The preserved
key at `~/.hermes/profiles/claudia/cache/cauldron-blind-condition-key.json` identifies version 1
as Codex alone and version 2 as Codex through Cauldron for both pairs.

### Moretti Estate — version 1 wins (Codex alone)

Billy described version 1 as far superior: unique, modern, clean, responsive from mobile to
desktop, and feeling designed rather than vibe-coded. Version 2 felt dated, like a 2022
small-business template. Version 2's more shop-like oil arrangement was a useful detail that
could inform version 1; this was a minor observation, not a requested edit. Version 1 is locked
in as his preferred design.

### PeNtA — version 2 wins (Codex through Cauldron)

Billy preferred version 2's flatter treatment, likening it to opening a box of brand-new pastel
pencils with a really good charcoal, fitting an artist's site. Version 1 felt more like a gallery
or studio. Its progressive image loading/zoom could complement version 2. Selected homepage
images missing from the full gallery were a minor observation, not a requested edit.

### Release result

Cauldron won one comparison and lost one. The requirement to win both is unmet. Recorded
measured failures also remain unresolved. No thresholds or winning conditions have changed,
no model has substituted a verdict, and no sites were edited after judgement. Ticket 29 and
ticket 30 remain open; no release is authorised by these results.

## Design-correction phase — 8 Nov 2026 (working tree, no commit; no AI run)

The saved reports were re-read against the generated source, not re-run. Four product
defects explain most of the measured noise; none of the original artifacts or verdicts
were changed.

1. **Rem tokens multiplied by a token-set root.** The Moretti site set
   `html { font-size: var(--cauldron-size-3) }` (`src/styles/moretti.css:11` in the saved
   site). Because tokens are rem against a 16px root, reported values are exactly
   token × 17/16: 16px spacing → 17px; 25px → 26.5625px; 15px → 15.9375px. Moretti had
   18 spacing + 18 type failing rows. PeNtA did not set `html` font-size and had no
   spacing/type failures in `t28-resume`. Fix: `DESIGN.md` and the brief now state the
   16px-root rule (`src/main/directions.ts:456`, `src/main/agent.ts:108`).
2. **Colours offered without measured limits.** `open-house` primary on bg is 3.8:1 and
   surface-on-primary 4.1:1; `silver-screen` muted on bg 3.7:1; `solid-ground` muted/
   primary 3.1/3.5:1 — exactly the saved `a.button-link 4.1:1`, `p.eyebrow 3.3:1` and
   `span.work-index 3.7:1` failures. Fix: `DESIGN.md` now lists measured text/button pairs
   with permitted use (`src/main/directions.ts:380-463`), the brief carries the 4.5:1/3:1
   requirement (`src/main/agent.ts:109`), and the approved contrast rule is in the taste
   rules (`src/main/tastes.ts:51`).
3. **Keyboard/focus measurement was nondeterministic and double-counted.** The same
   page/width appears twice in one report with different results: A `/` 375 was 5/7 then
   7/7 reached; B `/` 375 8/9 then 9/9; `/contact` 8/9 then 9/9. The Tab loop pressed once
   per control and read focus immediately; focus also counted unreachable controls and
   failed with "0 without an indicator, 0 under 3:1". Fix:
   `src/main/taste-check.ts:325` waits for focus to move and retries a lost press;
   unreachable controls remain a keyboard failure only (`focusOutcome`, line 27).
4. **Change-scope rows reused whole-site ids.** 42 ids (84 rows) in A and 9 ids in B were
   present in both scopes, so "120 failures" (A) and "52 failures" (B) overstate distinct
   issues: A has 78 unique failing ids, B 43. Hover/disabled/keyboard details also lacked
   control names. Fix: `tasteFindingId` (`src/main/taste-check.ts:11`) namespaces
   change-scope ids; details now name the failing controls.

No threshold was relaxed: 4.5:1/3:1 and the keyboard-reach requirement are unchanged.
`npm run check` exits 0 with 112 PASS, including 4 new ticket-29 tests (guidance tables and
ratios, prompt rules, focus/keyboard accounting, id namespacing).

**Still unproven / open:** these are source corrections, not a design-win proof. The
subjective Moretti loss also needs a direction decision: `open-house` is a heritage
small-producer look (honey/amber, Lora + Bitter slab), while the winning version was
described as unique, modern and clean. Recommendation for Billy: add/choose a restrained
editorial direction for provenance-led briefs instead of asking the model to make
`open-house` editorial; no direction was invented here. Two real Cauldron runs (one per
pair, same frozen standalone baselines, new neutral blind re-judge) are the next justified
step; no win is promised. Ticket remains **open**.
