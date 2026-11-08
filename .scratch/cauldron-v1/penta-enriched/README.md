# PeNtA — enriched Silver Screen, single real run (Claude Code)

Preserved evidence for the 8 Nov 2026 instruction: build ONE PeNtA site through the
packaged Cauldron app with the newly enriched Silver Screen guidance. No Moretti,
no baseline rebuild, no retries.

**Outcome: no site was generated. The single permitted agent run stopped at Claude Code
authentication before any model work or file change.**

## What actually happened

- Revision: `df28b3f` plus Billy's uncommitted `AGENTS.md` wording update and a
  test-only change in `src/main/e2e.ts` (`runBriefTest` reads `CAULDRON_AGENT_TOOL`,
  default `codex`) so this run could use Claude without a production provider change.
- Packaged once with `npm run package` (`NODE_ENV=development`, Node 26.13.0). The
  packaged bundle was checked to contain `process.env.CAULDRON_AGENT_TOOL??\`codex\`` in
  the brief harness before launch.
- Brief: byte-identical copy of `B-penta.txt`,
  sha256 `389bb12188c4956912128b9a55ea83998066be24c0def71abdc2de2c947a5773`.
- Selected direction: **Silver Screen** (`silver-screen`). The enriched structure text
  was written into `site/cauldron/DESIGN.md` and `site/cauldron/design.json`, and the
  app's prompt builder includes those five structure fields (`agent.ts` direction
  block), so the enriched guidance was in the prompt handed to `claude -p`.
- Agent run `run-1794108191056` (tool `claude`) started and failed immediately:
  `Not logged in · Please run /login`. `claude auth status` reports
  `{"loggedIn": false, "authMethod": "none", "loginExpiresAt": null}`.
  No credential or provider change was attempted and no second run was made.
- `qualityRun` still built and measured the untouched scaffold: `built: true`,
  253 findings = 206 pass / 43 fail / 4 opinion. `/gallery` and `/contact` were measured
  as missing routes (404 fallback: no title, no lang), so those numbers describe the
  scaffold, not a PeNtA site. Build log: 1 page built.

## Files

- `evidence/claude-run-output.txt` — full app log for the run.
- `evidence/run-record.json` — the app's saved run record (prompt field is the brief).
- `evidence/B-penta.txt`, `evidence/run.sh` — brief and exact harness environment.
- `measure/penta-quality.json` — quality report from this run.
- `site/` — scaffold state with `cauldron/DESIGN.md`, `tokens.css`, `design.json`.
- `archive/penta-enriched-site.tar.gz` — site source, images and `dist` (no
  `node_modules`, `.astro`, `.git`, `.DS_Store`).

## Honest gaps

- Not verified: generated Home/Gallery/Contact content, gallery filter, contact
  semantics, requirement-level quality thresholds, preview route bytes, screenshots.
  Nothing exists to measure; the run never reached the model.
- Run record inconsistency observed: the log and `waitForAgent` report the job as
  failed, while the stored run record says `status: finished`, `note: No files changed`.
  Recorded, not fixed.
- Ticket 29 and the release gate remain open. No waiver claimed.
