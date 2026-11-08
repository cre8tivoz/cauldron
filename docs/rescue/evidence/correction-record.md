# Correction record — Cauldron Jev audit, round 2 (8 Nov 2026)

This record states exactly what the first-pass audit got wrong, the evidence that changes
each finding, and what was re-run. Original round-1 raw results were not modified
(`raw/results.jsonl` untouched); round 2 appends to `raw2/results.jsonl`.

## 1. Stale-source conclusions in the first audit (now corrected)

The first audit read `docs/plan-verification.md` (frozen at checkpoint `82fc6c6`, 7 Nov) and
retrospective findings 00–10, and treated their "remaining work" rows as the current state. It
read almost none of the ticket completion records 11–32. Corrections, each traceable to a
ticket completion record at a named commit (all ancestors of delivered HEAD `e144e1f`):

| First-audit claim                                   | Correction                                   | Evidence                                                                                                                                                                                                                                                                                                                                |
| --------------------------------------------------- | -------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| "Hermes not proven at all" (3.2)                    | FALSE — Hermes has a real packaged-app proof | Ticket 20 (`.scratch/cauldron-v1/issues/20-…md`): `CAULDRON_HERMES_TEST=1: 13/13`, real installed Hermes 0.22.7, `read_selection` → `edit_element_text` on `src/layouts/Base.astro:45`, file changed, whole-run undo restored it; plus `CAULDRON_AGENT_TEST` 11/11 with resume. Re-run on final merged code (batch-2 commit `55d5a95`). |
| "Focus contrast missing" (4.4/4.1)                  | FALSE — measured                             | Ticket 23: `src/main/contrast.ts` measures text 4.5:1 by size/weight, button 4.5:1, focus indicators at 3:1 against the page behind them; regression tests (pale/offset focus ring) red→green.                                                                                                                                          |
| "All-nine library checks incomplete" (4.3)          | FALSE — all nine exercised                   | Ticket 25: nine checks × five pieces × both sites; rudeboycoffee 69/69, WDLsite 68/69 (one intermittent Tab-reach on glow-action /contact/, cause not isolated, honestly recorded).                                                                                                                                                     |
| "Publish retry unproven" (5.1)                      | FALSE — broken, then fixed and proven        | Ticket 16: retry refusal reproduced; `publishing.ts` repoState counts unuploaded commits; packaged `CAULDRON_PUBLISH_UI_TEST` 21/21 incl. broken-remote → "1 commit(s) not uploaded yet" → Upload → "Uploaded to origin/main", remote main = local HEAD.                                                                                |
| "Crash recovery unproven" (1.6)                     | FALSE — real crash run exists                | Ticket 13: real SIGKILL (exit 137) crash through the packaged app, restart, "Unsaved edits from last time…", Restore → 7/7, run four times (three clean).                                                                                                                                                                               |
| "2.2 rendered compare evidence missing"             | FALSE                                        | Ticket 21: `CAULDRON_COMPARE_TEST` 16/16 driving the real Show/Hide buttons; new `src/main/compare.ts` content-matched comparison.                                                                                                                                                                                                      |
| "1.4 keep-mine/use-disk missing on content path"    | FIXED in ticket 15                           | ContentPanel now offers the same choice; content suite 9/9; regression asserts `conflict: true`.                                                                                                                                                                                                                                        |
| "3.1 only source-inspected"                         | Re-proven                                    | Ticket 22: 20/20 real-controls UI harness at 1280×800 and 1440×900.                                                                                                                                                                                                                                                                     |
| "5.2 separate-Mac launch unproven entirely"         | PARTIALLY corrected                          | Automated separate-Mac launch IS proven: CI run 42476500982 job `separate-mac-launch` = success at exact head `e144e1f` (checked live via `gh run view` this audit). Human first launch on a second physical Mac remains pending (ticket 30).                                                                                           |
| "Native dialog never verified"                      | STILL TRUE                                   | issue32 manifest `native_dialog_foreground_verified: false`; ticket 32 "Still open: native Finder picker and native menu clicks not verified in a foreground session".                                                                                                                                                                  |
| "Evidence predates issue-32 changes" blanket caveat | Scoped correctly                             | `git show --stat e144e1f`: touches ProjectHome/projects/dependencies/runtime/agent(tool-path only)/index/preview + tests. Editor/save/undo/action/compare/taste call paths were NOT changed by it; tickets 11–29 evidence remains valid for those paths (no blanket re-run prescribed).                                                 |

## 2. 4.5 blind proof — corrected characterisation

First audit said "verdict closed by Billy" with provenance resting on tickets. Full ticket 29
shows: two real briefs (Moretti Estate, PeNtA) with recorded provenance and byte-identical
brief texts (SHA-256 recorded), built both ways, measured; Billy judged blind twice with the
condition key read only after his choices; Cauldron won PeNtA both rounds, lost Moretti both
rounds. The original win-both gate is unmet on its own terms. Billy then amended scope
(8 Nov, recorded in ticket 29 and AGENTS.md): the reviewed PeNtA iteration is the accepted
design win; the judgement is closed; no further Moretti win required. PeNtA acceptance was
conditional on three comments — all implemented and verified; final PeNtA re-measure
253 findings / 249 pass / 4 opinion / 0 fail. Status: `superseded_by_billy_decision`, not a
release authorisation.

## 3. Documentation inventory — corrected

Round 1 admitted "listed/not_full/targeted" and used wildcard paths. Round 2 enumerates every
relevant authored document with exact absolute paths: all 33 ticket files (full), spec.md,
plan-verification.md, both AGENTS.md, plan, UI research, starter set, taste tests,
START-HERE, all 8 ADRs, glossary, README, CONTRIBUTING, code review, retro, the Obsidian
brief (full), delivery evidence, and the exact excluded set (7 named retired Cauldron-OS
notes; 5 named research assessments declared reference-only/not-full — this is declared as
excluded, not asserted read). Newly found stale docs: app README ("no editor to use yet"),
ticket 30's recorded zip sha (`ff4831…` — file not on disk; delivered zip is `9d8082…`), and
START-HERE/plan-verification frozen at the pause checkpoint.

## 4. Decisive new primary evidence: tinydogs real-use failure (8 Nov 2026)

Billy opened the delivered app and created project `tinydogs` under
`/Users/habibi/Documents/OPENAI PROJECTS`. The agent wrote
`src/layouts/Base.astro:2-4` importing `@fontsource/playfair-display/500.css` and
`@fontsource/jost/{400,500}.css`; `package.json` dependencies contain only `astro`.
Parent-verified on an unchanged APFS clone: `npm run build` exits 1
(`[vite]: Rolldown failed to resolve import "@fontsource/playfair-display/500.css"`).
No preview ran. Saved run record
`/Users/habibi/Library/Application Support/Cauldron/runs/c805630eb824/run-1794138419087.json`:
status `finished`, `problems []`, 4 files changed.
Source: `src/main/index.ts:1787-1814` `finishAgentRun` runs `reloadPreview` + `collectLocs`
then `runs.finish`; it only marks failed on an agent error note; there is no build/render-health
validation at completion. Two real product gaps (not verification gaps):

1. Generated dependency failure — an agent can import packages absent from dependencies;
   nothing validates or offers to install them.
2. Completion does not check render/build health — an unbuildable site is recorded as a
   finished run with no problems, and the user is left with no preview.
   This overrides the first audit's "nothing needs new features; it is verification only."
   No app repair was performed by this audit; cause analysis and repair remain with the parent.

## 5. Jev round 2 (corrected evidence, materially changed rows only)

- 23 requests (20 requirement rows + 3 controls), pinned `jev-1.14.0` (returned model matches),
  23,018 input tokens, estimated US$0.000967. Round 1: 36 requests, 23,686 tokens, US$0.000995.
  Total ≈ US$0.0020 of the US$0.50 cap (estimate from API-reported tokens × published rate
  US$0.042/Mtok, output free; not a verified charge). No retries; stop on first error;
  per-request reserve 0.004 × max 40 requests ≤ cap, asserted before billing.
- Robustness probes added per skill: every Choice sent twice with reversed option order.
  Agreement 19/20; the 1.4 disagreement (source_or_docs_only vs partial_or_bounded) is kept
  as a review band, not resolved by tuning.
- Controls: C-N6 ("all five components passed all nine checks with zero failures") rejected
  (0.02) — correct, ticket 25 records 68/69. C-N7 ("first ordinary new-project workflow
  produced a working preview") rejected (0.02) — correct, the tinydogs case. C-P4 (Hermes
  real-run claim, true) landed `review` (0.62, goes_beyond 0.43) — a true claim in the review
  band is consistent with the supplied state being ticket text rather than raw logs; saved
  raw, not tuned. Round-1 controls unchanged (5/5 planted-false rejected; C-P2 review).
- Round-1 Jev pessimism on rows 1.6/2.2/3.2/5.2 was evidence poverty (summaries, not raw
  records), exactly as the skill predicts. With full ticket excerpts, round-2 values moved
  e.g. 1.6 implemented 0.19→0.86, 2.2 0.28→0.87, 3.2 0.15→0.71 (still held to `partial` on
  my side because of the tinydogs outcome-accuracy failure), 5.2 0.21→0.24 (`partial`).
  P-HOME fell to 0.09 implemented / 0.21 real-path under the real-use counter-evidence —
  the model opinion and the deterministic evidence now agree the home workflow failed at
  first real use. Round-1 weak-Jev rows that were not materially changed (0.2, 0.3, 1.5, 1.7,
  1.8, 3.4, X-BYOK) keep their round-1 values with the documented caveat; they were not
  "overridden to confirmed".
- Model opinions remain advisory and separate from deterministic evidence. Jev judged
  supplied text; it did not run the app.

## 6. Verdict (round 2)

The delivered build is substantially the specified app with genuine, re-runable packaged-app
proofs across editors, agents (all three), runs/undo, taste/quality, library, publishing and
project home. It is NOT release-ready. Remaining real gaps vs missing proof vs stale docs:

- REAL product gaps (need code, from primary evidence): generated-dependency validation and
  build/render-health check at run completion (tinydogs case); shutdown-warning root cause
  not established (not reproduced, ticket 26); intermittent Tab-reach in library check cause
  not isolated (ticket 25).
- MISSING PROOF (no code change implied): human first launch on a second physical Mac
  (ticket 30); native Finder picker/menu clicks in a foreground session; hosted-Git publish
  path; feedback→agent reliability beyond one 12/12 run; small tickets' unexercised edges as
  recorded per ticket.
- STALE DOCS (need record updates, no code): app README; ticket 30's zip sha;
  START-HERE/plan-verification checkpoint freeze.
- 4.5: win-both gate unmet but closed by Billy's recorded amendment; not a release
  authorisation. BYOK/reverse-control correctly outside v1 (current AGENTS.md supersedes
  historical plan 3.3 wording — labelled superseded scope, not a missing feature).
