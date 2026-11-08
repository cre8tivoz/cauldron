# 29: Complete the blind judgement and design proof

**What to build:** Billy judges both comparisons blind and the unchanged measured evidence establishes whether the agreed release gate passes.

**Blocked by:** [25: Prove all five library components work](25-prove-all-five-library-components-work.md), [27: Build and measure the first real-brief comparison](27-build-and-measure-the-first-real-brief-comparison.md), [28: Build and measure the second real-brief comparison](28-build-and-measure-the-second-real-brief-comparison.md)

**Status:** done — Billy accepted the reviewed PeNtA design; the authorised technical finish-up passes. Final whole-site report: 249 pass, 4 design opinions, zero failures across the three approved routes and three widths. Historical comparisons and agent-change reports remain preserved; no new agent generation was run.

**Parent findings:** [06: approved taste criteria](06-approved-taste-criteria.md), [07: library nine checks](07-library-nine-checks.md), [08: real brief blind proof](08-real-brief-blind-proof.md)

**Plan:** 4.1–4.5; ADR 0005

**Execution:** Billy approved ticket publication, including safeguard 31. Application development remains paused until explicitly resumed. Readiness does not start work.

## Acceptance criteria

- [x] Preserve the recorded automatic and human checks for the earlier test-site and real-brief comparisons; retain their original failures as historical evidence.
- [x] Billy judges both comparison pairs before the condition key is revealed; no model substitutes its own preference.
- [x] **Amended scope, explicitly approved by Billy on 2026-11-08:** the reviewed PeNtA iteration is the accepted design win. No further Moretti win, blind judgement or generation is required. Complete the bounded technical finish-up and record the final measurement of the existing PeNtA output with its small authorised corrections.
- [x] Record real failures and missing evidence honestly. The final whole-site check has zero failures; the historical agent-change layer was not rerun. Separate-Mac release evidence remains with ticket 30.
- [x] Retain focused behavioural red/green regressions for the confirmed checker bugs, including negative controls that must still fail.
- [x] Record exercised user paths and the tested source state; pass project checks before committing. See the final evidence and controller closure below.

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

## Corrected-proof round 2 — 8 Nov 2026 (revision `0ba9e1e`)

Two new real Codex runs through the packaged app (`gpt-5.6-terra`, installed CLI 0.152.0,
hidden fresh userData, existing `runBriefTest`/`sendAgent` path, no retry). This is a new proof
attempt after Billy's feedback, not the original independent trial; frozen outputs and verdicts
are unchanged. Fresh original scaffold + same supplied images, real cloned `node_modules`.

- Moretti: direction `the-edit` chosen through the existing test hook; 4 files changed; 3 routes
  built. Measured **452 findings, 37 failures, 37 distinct failing ids** — spacing 12 rows
  (25px/13px), hover 18, disabled 6, heading hierarchy 1. No contrast, axe, type-size, keyboard or
  focus failures (lowest text contrast 5.59:1; keyboard 8/8).
- PeNtA: direction `silver-screen`; 4 files changed; 3 routes built. Measured **452 findings,
  84 failures, 84 distinct failing ids** — text/axe contrast at 3.68:1 (muted captions/definition
  text), type sizes 63.75–256px off scale, hover 18, disabled 12, emoji-as-icon 6, spacing and
  hard-coded `15%` padding. Keyboard and focus pass (10/10).

New neutral pairs with fresh random labels are preserved in
`.scratch/cauldron-v1/blind-round2/` (archive gitignored; screenshots per label). The condition
key remained private until Billy submitted both verdicts. Measured failures remain, so the
release gate is **not** passed. Full run record: `scratch/t29-proof2-result.md`.

### Billy's round-two verdicts

Billy chose **option A for both pairs**, before the new condition key was read and revealed.
The served mapping was verified against the preserved round-two key:

- **Moretti option A** (port 8911, `label-15085d`): frozen Codex-alone baseline — winner.
  Option B (port 8912, `label-7f7d44`): new Cauldron build using The Edit.
  Billy said A remained the strongest. B was vastly improved and good, with too much white
  space; he considered both designs very good, but A still won.
- **PeNtA option A** (port 8913, `label-28b57d`): new Cauldron build using Silver Screen — winner.
  Option B (port 8914, `label-65dfdc`): frozen Codex-alone baseline.
  Billy said A was definitely the strongest.

**Outcome:** Cauldron again won PeNtA and lost Moretti. Its Moretti design improved in Billy's
assessment, but it did not meet the requirement to win both. The 37 and 84 measured failing
rows remain unresolved. Ticket 29 and the final-release gate stay open. No new builds, changes
to the judged sites, automatic retries or acceptance reductions are authorised by recording
this feedback.

## Correctness follow-up — 8 Nov 2026 (uncommitted enrichment)

Bounded fix pass on the current 10-direction enrichment; no new proof run, no gate change.

- Removed undefined token references from structure prose: `primary-deep` in clear-ground,
  the-edit and henry-from-online; unshipped source colours in open-house (dusty-cyan,
  meadow-green, brick-red, honey-gold, cocoa) and componine's prose-only "amber"/"cream";
  open-house's reference to a detail face it does not ship. Values were mapped to shipped
  tokens only; palettes unchanged.
- Added `29 direction structure prose names only shipped tokens` to `scripts/test-core.mjs`,
  checking colour-token names, 1-based size and 0-based space/radius indices, detail fonts.
- UI harness 4.2 failure was a harness bypass, not an app fault: calling
  `window.cauldron.referenceDirection` directly skipped `DesignPanel`'s `onChosen`, so React's
  direction state (and the Inspector tokens) stayed old. The harness now clicks the rail
  Design button, fills the real form with native events, submits, and waits for the form to
  unmount before selecting an element. Assertions unchanged.

`npm run check` exit 0; `npm run package` exit 0; packaged UI harness **28/28 passed**
(`scratch/t29-enrich-final-result.md`). Ticket 29 and the release gate stay **open**.

## Enriched-guidance PeNtA run — 8 Nov 2026 (Claude Code, blocked at auth)

One intended real run, revision `df28b3f` plus the uncommitted `AGENTS.md` wording and a
test-only `runBriefTest` tool selector (`CAULDRON_AGENT_TOOL`, default `codex`). Packaged
once; brief byte-identical to `B-penta.txt` (sha256 `389bb121…a5773`); direction
**Silver Screen**, whose enriched structure text was written to the site's
`cauldron/DESIGN.md`/`design.json` and is part of the prompt built by `agent.ts`.

Run `run-1794108191056` (tool `claude`) stopped immediately with
`Not logged in · Please run /login`; `claude auth status` reports `loggedIn: false`,
`authMethod: none`. No retry, no alternate provider, no credential change. `qualityRun`
built the untouched scaffold (`built: true`, 1 page; 253 findings: 206 pass / 43 fail /
4 opinion — `/gallery` and `/contact` measured as missing 404 routes). The stored run
record says `finished` / `No files changed` while the app log and `waitForAgent` say
failed. That was a real stored-history bug, corrected below; the run itself remains a
failure at auth.

Evidence: `.scratch/cauldron-v1/penta-enriched/` (README, app log, run record, quality
report, site source, site tar.gz). No generated-site claim is made; no Home/Gallery/
Contact content, filter, contact semantics, threshold or preview-route check exists.
Ticket 29 and the release gate stay **open**; no waiver.

### Correction — 8 Nov 2026 (stored record of a failed run)

`Runs.fail()` corrected the run in memory but never saved it, so the record written by the
earlier `finish()` — `finished` / `No files changed` — stayed on disk. `fail()` now saves the
corrected run (`src/main/runs.ts`), covering agent errors, cancellation and library failures
on the same path. `scripts/test-core.mjs` adds "a run that fails after its diff is saved as
failed, not finished": red before (`saved record says finished`), green after; `npm run check`
passes. This corrects the ticket 14/18 failure-reporting guarantee at the saved-history layer.
The PeNtA run is unchanged: still blocked at auth, no site generated, release gate open.

## User verdict on the three PeNtA comments (2026-11-08): CONDITIONAL win

Billy: "Overall ... very good iteration ... wins if those comments ... factored in for standard cauldron work." All three comments were implemented and verified; the standards were carried into both the agent prompt (src/main/agent.ts via shared `generatedSiteStandards` in src/main/directions.ts) and the saved DESIGN.md template, guarded by a narrow regression in scripts/test-agent.mjs (24 PASS). Evidence: /Users/habibi/.hermes/profiles/claudia/cache/scratch/penta-comments-result.md; screenshots in /Users/habibi/.hermes/profiles/claudia/cache/scratch/penta-comment-proof/. Site build exit 0; app `npm run check` exit 0. Measured: hero glyph/kicker overlap +214px→clearance at 1280 (font-verified), mobile hamburger semantics (44px target, Escape, outside-click, closed links unfocusable, desktop inline retained), statement faded image 14.39:1 worst-case text contrast. Ticket stays open; this does NOT erase the Moretti blind-round losses or the measured quality failures, and does not authorise release or ticket 30. Generated-site code deliberately not staged into the app repo.

## Bounded checker-finish batch — 8 Nov 2026 (implementation subagent, uncommitted work tree on 79aef82)

Billy authorised one finish-up batch (AGENTS.md). Draft evidence below; ticket completion stays with the controller.

### Confirmed checker false positives fixed (each with a behavioural red→green regression)

1. **Screen-reader-only helpers measured.** `.visually-hidden` elements (1px, clipped,
   absolute) were audited, so standard `-1px` margins failed spacing/tokens at every width.
   Fix: shared `isVisuallyHidden()` (src/main/taste-check.ts) excludes them in the taste
   page filter and in quality.ts's trace. Skip-links and real content are still measured.
2. **Typographic arrows counted as emoji.** `↗`/`→` in labels ("Open in mail app ↗")
   matched `Extended_Pictographic`. Fix: `usesEmojiAsIcon()` strips only the Unicode Arrows
   block (U+2190–U+21FF); real pictographs (🚀) still fail — regression asserts both sides.
3. **Hover signature missed real feedback.** It sampled the control only and omitted
   text-decoration thickness/offset. A descendant hover (`.onward__link:hover .onward__word`)
   and a thickness-only hover (nav links) read as "no hover change". Fix: signature covers
   the control and up to 40 descendants across 11 properties including thickness/offset.
4. **Disabled state measured under forced hover, mid-transition.** The disabled signature
   was captured while `:hover` was still forced and compared against hover, immediately
   after `el.disabled = true` with transitions running. Fix: compare against the resting
   signature, with hover cleared and transitions suppressed during sampling.
5. **SVG wordmark hierarchy/type.** A heading whose only typed text is visually hidden
   (hidden span + full-width SVG wordmark) was measured at its default font size (34px) and
   broke both "type sizes" and "hierarchy" (32/34px, 76px). Fix: hierarchy and type measure
   visible text only (SVG `<text>` excluded; `checkTasteOfCss` skips font-size on SVG-text
   selectors — a wordmark's 440px is a drawing size, not off-scale type).
6. **Closed-disclosure links measured.** Chromium keeps layout boxes for content inside a
   closed `<details>` (content-visibility:hidden), so mobile-menu links were counted as
   controls and failed keyboard reachability at 375. Fix: both checkers now use
   `Element.checkVisibility()` in addition to display/width.
7. **Selected controls required hover change.** A pressed filter (`aria-pressed`) and the
   current nav link (`aria-current`) are distinguished by their selected state, which
   deliberately overrides hover. Fix: hover is required only for unselected controls.
8. **Body size measured as the largest paragraph.** One display-size statement `<p>` (76px)
   made body "larger than the smallest heading". Fix: bodySize is the most common paragraph
   size (mode), with the smallest on ties.

### Red→green evidence (real checker, real Electron)

- e2e `runTasteTest` gained an on-brand `/helpers` fixture page exercising all of 1–4.
  Original source: `FAIL` on Spacing, Type, Emoji, Hover, Disabled, Tokens
  (`cauldron-finish-proof/taste-red.log`, 21/27).
  Fixed source: all six `PASS` (`taste-green3.log`, 27/27, incl. real-emoji negative control).
- e2e `runQualityTest` gained a hierarchy fixture (hidden-span h1 + SVG wordmark + 76px h2 +
  76px statement p). Original: `FAIL 29 hierarchy ignores visually-hidden heading text —
  Headings do not step down in size: 32px, 76px` (`quality-red.log`). Fixed: `PASS —
  Headings 76px, body 16px` (`quality-green.log`).
- `scripts/test-core.mjs` adds three focused tests (arrows, hidden helpers, SVG wordmark
  type/tokens); the wordmark test fails behaviourally on original source (`tc-red2.log`:
  `FAIL — 1 violation(s)`, type and tokens both count 440px) and passes after (`tc-g3.log`).

### Site fixes on a disposable copy (approved output untouched)

Disposable copy: `/Users/habibi/.hermes/profiles/claudia/cache/scratch/penta-finish/site`
(node_modules symlinked; approved source and reviewed archive unchanged). Only change:
gallery.astro — a pressed filter keeps its filled ink/surface state on hover (was light-on-
light), and filter buttons gain `:disabled` styling matching the shared `.button` pattern.
Reusable interaction-state guidance (readable pressed-on-hover, distinct disabled style,
arrows-not-emoji) added to `generatedSiteStandards` (src/main/directions.ts), so it reaches
both the agent prompt and saved DESIGN.md.
Playwright proof (`site-behaviour-proof.txt`, 19 recorded PASS checks): gallery all/stills/video visibility,
status line, pressed follows selection, selected hover readable, unselected hover visible,
disabled styling differs, keyboard reach+toggle+focus ring, mobile menu open/Escape,
no overflow at 375, contact mailto links, form builds a prefilled mailto without sending
(no backend claimed), required fields block empty submit.

### Re-measurement of the unchanged approved PeNtA design (real Cauldron checker)

Measured-only brief path (no agent/provider run: `CAULDRON_BRIEF_MEASURE_ONLY`) added to
`runBriefTest` in src/main/e2e.ts. Report:
`/Users/habibi/.hermes/profiles/claudia/cache/scratch/cauldron-finish-proof/penta-quality-recheck.json`
(`measure-recheck2.log`; fresh test user-data; supersedes the earlier one-failure report). Pages /, /gallery, /contact at 375/768/1280.

**253 findings: 249 pass / 4 opinion / 0 fail** (historical report: 65 fail rows incl.
repeats across sites/kinds/widths; 12 were the hidden-helper margins, 12 arrow "emoji",
18 hover, 6 disabled, 2 hierarchy).

Former remaining failure — now fixed (2026-11-08 recheck, Billy-authorised finishing
batch):

- `/contact` — "Body text (17px) is not smaller than the smallest heading." The contact
  h2 labels ("Studio", "Email", "Visits", form title) are genuine section headings, so
  the markup was kept; on the disposable copy only they now use the next direction type
  token up (`--cauldron-size-4`, 20px) while staying label-styled. The re-measured
  report (`penta-quality-recheck.json`, `measure-recheck2.log`) shows **0 failures**.
- The same recheck also exposed the real cost of removing the selected-state hover
  exemption: the gallery pressed filter and the `aria-current` nav link had NO hover
  delta (their `:hover` rules duplicated the resting selected style). Minimal CSS on
  the disposable copy gives each a visible hover change (pressed filter lifts via
  `filter: brightness(1.35)`; current nav link thickens one token), using existing
  direction tokens only.

Recheck evidence: `recheck-red.log` (old behaviour: both new negative checks FAIL to
fire — 0 violations reported), `recheck-green.log` / `recheck-green2.log` (29/29 incl.
"a selected (aria-pressed) control with no hover change still fails hover" and "a
control with hover styling but no disabled CSS fails the disabled check").

Known harness note (not a site finding): `runQualityTest`'s "button text is held to 4.5:1"
assertion reports `No buttons on this page` on this site (the home page has no `<button>`);
pre-existing harness assumption, unchanged.

### Gates on the final work tree

`npm run check` exit 0 (typecheck, lint, 98 core + 24 agent tests); `npm run smoke` exit 0.
Tested revision: HEAD 79aef82 + uncommitted modifications to `scripts/test-core.mjs`,
`src/main/directions.ts`, `src/main/e2e.ts`, `src/main/quality.ts`, `src/main/taste-change.ts`,
`src/main/taste-check.ts` (diff summary: cauldron-finish-result.md). No commits made by the
subagent; no provider runs; no installs.
