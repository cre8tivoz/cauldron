# Cauldron — original intent vs delivered build (independent audit, round 2)

**Auditor:** independent subagent (Claudia profile), read-only. **Date:** 8 Nov 2026.
**App commit verified live before and after audit:** `e144e1f46c96b19b9dc5fbd6a037b1764de031ac`; worktree unchanged (two untracked `.DS_Store` files only). Delivered zip sha256 `9d80823791fe9683…ddd21` matches the issue32 manifest and the fresh `out/make/zip` build byte-for-byte. CI run 42476500982 checked live: `success` at this exact head, jobs `check` + `separate-mac-launch` both `success`.

**Read this together with `correction-record.md`** — the round-1 report contained stale-source
conclusions; every one is corrected there with ticket/commit citations.

## Verdict (plain)

The delivered app implements the agreed 24-item plan (plus the issue-32 restored project
workflow) with genuine packaged-app proofs across nearly every requirement — but it is **not
finished and not release-ready**, and Billy's first real use of it **failed at the core
workflow** (new project → preview).

- **Real user-path failure (decisive, 8 Nov 2026):** the tinydogs new-project workflow created
  the project and ran the agent, but the generated site imported `@fontsource` packages absent
  from `package.json`; the build exits 1; no preview appeared; the run record says `finished`,
  `problems []`. Two product gaps, not verification gaps: (1) no generated-dependency
  validation/install offer; (2) run completion performs no build/render-health check
  (`src/main/index.ts:1787-1814`). Cause analysis is with the parent; no repair was made here.
- **What is genuinely proven (packaged app, real paths, re-run on final merged code):** all
  three agents (Claude 37/37, Codex 20/20, Hermes 13/13 — each a real edit through the shared
  actions with run listing and whole-run undo); whole-run undo and Before/After (30/30, 32/32,
  16/16); real SIGKILL crash/restore (7/7 ×3); publish retry after a failed upload (21/21,
  local bare remote); actions parity incl. outside-agent JSON-RPC with 401/port-refusal
  security matrix (35/35); all nine library checks × five pieces × two sites (69/69, 68/69);
  change-scope taste 16/16 and whole-site 20/20 with negative controls; desktop workspace
  20/20 at two sizes; content saves without file damage (6/6 ×2, 9/9); shared pnpm store with
  offline reuse proof; project home 71/71 packaged renderer checks.
- **4.5 blind proof:** two real briefs built both ways and judged blind by Billy twice
  (condition key read after his choices). Cauldron won PeNtA twice, lost Moretti twice — the
  win-both gate is unmet on its own terms. Billy then amended scope: the reviewed PeNtA
  iteration is the accepted design win; that judgement is closed (ticket 29, AGENTS.md).
  Not a release authorisation.
- **Missing proof (no code change implied):** human first launch on a second physical Mac
  (ticket 30 pending; the automated fresh-runner launch IS proven); native Finder picker/menu
  clicks in a foreground session; hosted-Git publish path; feedback→agent reliability beyond
  one 12/12 run.
- **Stale docs:** app README ("no editor to use yet"), ticket 30's recorded zip sha (not on
  disk), START-HERE/plan-verification frozen at the 82fc6c6 pause.

## Status matrix (deterministic status; Jev raw values in requirements.json)

| Req       | Requirement                              | Status                       | Key caveat                                                                                                                                                         |
| --------- | ---------------------------------------- | ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 0.1       | Repo/licence/CI/hooks                    | built_exercised              | shutdown warning not reproduced but not proven absent; 16 dev-only advisories                                                                                      |
| 0.2       | Nothing copied                           | built_exercised              | no provenance audit claimed                                                                                                                                        |
| 0.3       | Real test-site copies                    | built_exercised              | fresh copies per run                                                                                                                                               |
| 1.1       | Open + preview, no silent installs       | built_exercised              | native Finder dialog unclicked                                                                                                                                     |
| 1.2       | Select/edit into real files              | built_exercised              | re-proven (tickets 15/22); issue-32 diff touched no editor path                                                                                                    |
| 1.3       | Version-checked saves/undo               | built_exercised              | ticket-15 packaged runs                                                                                                                                            |
| 1.4       | One outside-change rule                  | built_exercised              | Jev reversed-order Choice disagreed (review band, saved)                                                                                                           |
| 1.5       | File shape preserved                     | built_exercised              | bounded fixtures                                                                                                                                                   |
| 1.6       | Crash recovery                           | built_exercised              | real SIGKILL restore 7/7; only text typed in crash run                                                                                                             |
| 1.7       | New page, no reload                      | built_exercised              | —                                                                                                                                                                  |
| 1.8       | Preview isolation                        | built_exercised              | hostile-frame coverage per plan-verification                                                                                                                       |
| 2.1       | Shared actions everywhere                | built_exercised              | ticket 17: 35/35 incl. real outside connection                                                                                                                     |
| 2.2       | Run review, whole-run undo, Before/After | built_exercised              | failed-run record correction regression                                                                                                                            |
| 3.1       | Desktop workspace                        | built_exercised              | no device scaling/panel persistence                                                                                                                                |
| 3.2       | Claude+Codex+Hermes end to end           | **partial**                  | all three have real proofs; tinydogs shows whole-site generation outcome accuracy fails                                                                            |
| 3.3       | Outside-agent MCP                        | built_exercised              | standalone reverse control outside v1 (current AGENTS.md supersedes historical plan wording)                                                                       |
| 3.4       | Content forms + fallback                 | built_exercised              | bounded edges recorded                                                                                                                                             |
| 4.1       | Taste rules always on                    | built_exercised              | ticket-29 checker false-positive fixes with red/green                                                                                                              |
| 4.2       | Directions/tokens/reference URL          | built_exercised              | harness-bypass fixed (28/28)                                                                                                                                       |
| 4.3       | Component library                        | built_exercised              | one intermittent Tab-reach, cause not isolated                                                                                                                     |
| 4.4       | Quality + critique loop                  | **partial**                  | feedback path proven once (12/12 real Codex)                                                                                                                       |
| 4.5       | Real-brief blind proof                   | superseded_by_billy_decision | win-both unmet; PeNtA accepted; not a release gate pass                                                                                                            |
| 5.1       | Publishing                               | built_exercised              | local bare remotes only                                                                                                                                            |
| 5.2       | Separate-Mac first launch                | **partial**                  | automated runner launch proven; human second-Mac pending                                                                                                           |
| P-HOME    | New/Open/recents home                    | **partial**                  | creation worked; first real use failed at preview; native picker/menu unverified; thumbnails/branch/last-edited not implemented (research takes, not requirements) |
| P-DEPS    | Shared dependency store                  | built_exercised              | real-use gap: generated dependency imports unvalidated                                                                                                             |
| P-RUNTIME | GUI runtime resolution                   | built_exercised              | real launch worked for creation/agent                                                                                                                              |
| X-BYOK    | BYOK / reverse control                   | deferred (correct)           | —                                                                                                                                                                  |

## Jev judgment layer (advisory)

- Round 1: 36 requests, 23,686 input tokens, est. US$0.000995. Round 2: 23 requests
  (only materially changed rows), 23,018 tokens, est. US$0.000967. Total ≈ US$0.0020 of the
  US$0.50 cap (estimate from API tokens × US$0.042/Mtok, output free; not a verified charge).
  Pinned `jev-1.14.0` (returned model matches); no retries; ledger preserved; original raw
  results untouched.
- Robustness: reversed-order Choice probes — 19/20 agreement; the 1.4 disagreement kept in the
  review band, not tuned away.
- Controls: round-1 planted-false claims all rejected (5/5), true claims held (C-P2 review).
  Round 2: C-N6 rejected (68/69 ≠ zero failures), C-N7 rejected (tinydogs), C-P4 (true Hermes
  claim) review at 0.62 — saved raw.
- Round-1 pessimism (1.6/2.2/3.2/5.2 "missing") was weak-evidence artefact; with full ticket
  excerpts round 2 moved strongly positive — except P-HOME, which fell (0.37→0.09 implemented)
  under the real-use counter-evidence. Model opinion and deterministic evidence agree there.
- Jev judged supplied text; it did not run the app. No completeness percentage is claimed.

## Deliverables & limits

- `requirements.json` — 28 rows: source path+quote, implementation, evidence, round-1 and
  round-2 Jev raw values, reconciled status and caveat.
- `documentation-inventory.json` — full enumeration with exact absolute paths; no wildcards;
  exclusions and reference-only declarations explicit.
- `correction-record.md` — every round-1 stale claim, the evidence that corrects it, the
  tinydogs primary case, and the round-2 Jev accounting.
- `raw/results.jsonl` (round 1, untouched), `raw2/results.jsonl` (round 2), `scored.json`
  (round 1), `audit-report.html` (round 1 preserved), `scripts/` (both runners + job defs).
- Limits: Jev judged supplied excerpts; no packaged app was foregrounded; no paid coding-agent
  runs; no installs or config changes; read-only in both repos (git status verified unchanged
  after the audit). The user's tinydogs project was not opened or modified by this audit.
