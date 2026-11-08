# START HERE — Cauldron

## Access and current checkpoint

- App repository: https://github.com/cre8tivoz/cauldron
- App checkout: `/Users/habibi/hermes/apps-codebases/cauldron`
- Research workspace: `/Users/habibi/hermes/apps-codebases/cauldron-astro`
- Pushed application checkpoint: `82fc6c6cd38f9181332dfc2ef4c0bcddc95f8528` on `main`.
- CI: https://github.com/cre8tivoz/cauldron/actions/runs/42316697137 — **success**, including the actual ZIP download/unpack/launch on a fresh macOS runner.
- Current findings, all 24 plan references, evidence and risks: [app audit](../cauldron/docs/plan-verification.md).
- Configured local tracker: [source pointers and issue index](../cauldron/.scratch/cauldron-v1/spec.md), with individual records in its `issues/` directory. Every retrospective record currently needs triage.

**Status — 7 Nov 2026:** application development remains paused. Billy authorised a document/process audit and record updates. The current documentation changes are local and have not been committed or pushed. The full v1 plan remains incomplete.

## Read in this order

0. **Billy's original brief:** `/Users/habibi/OBSIDIAN-VAULT/Obsidian Vault/HERMES/10 Projects/Witch Daddy Labs/Built Apps/CAULDRON-OS/WEB BUILDER IDEAS.md`. It remains unchanged.
1. [CAULDRON-ASTRO-PLAN.md](CAULDRON-ASTRO-PLAN.md): the agreed 24-item implementation baseline and recorded decisions.
2. [Approved taste tests](design/camillo/taste-tests.md) and [selected starter set](design/STARTER-SET.md): the acceptance thresholds and selected seven directions/five components.
3. [ADRs](docs/adr/) and [GLOSSARY.md](GLOSSARY.md): settled choices and vocabulary. Their copies in the app match byte-for-byte.
4. [UI research](CAULDRON-UI-RESEARCH.md): read the seven recorded decisions first. Other patterns remain research suggestions; they carry no extra scope authority.
5. [Current audit](../cauldron/docs/plan-verification.md) and the relevant local finding record: exercised evidence, deviations, unresolved risks and acceptance gaps.
6. Supporting research for the relevant requirement: Stacki runtime/REA, Sitereal REA, Zeku REA, the source manifest/catalogue, and Mobbin analysis. Earlier foundation recommendations are superseded by ADR 0001.

## Verified checkpoint evidence

| Area | Exercised result | Limitation |
| --- | --- | --- |
| Core editor | Both copied sites 23/23 | Broader save/recovery acceptance remains open |
| Component library | Both copied sites 11/11 | All nine approved per-component criteria still need explicit complete evidence |
| Content | Rudeboycoffee 6/6 | WDLsite has no content collections; complex schema/fallback paths remain bounded |
| Quality checker | Both harnesses 9/9 | WDLsite itself has 9 failed findings; rudeboycoffee has 15 |
| Claude | 12/12 through Cauldron, including real MCP use and resume | Fresh Codex/Hermes continuity and revised-path support remain open |
| CI and packaging | Check/build/upload plus separate-runner Mac launch passed | Manual unsigned first-launch path and the 4.5 release gate remain open |

Local gates were run under Node 26.13.0 and npm 12.2.2 before the checkpoint push. Generic smoke still prints shutdown-time IPC sender-refusal warnings. The development/build dependency audit reports 16 moderate affected packages; the production-only audit reports zero. Neither warning has been hidden or accepted on Billy's behalf.

## Process findings to keep visible

- The configured local tracker had no tickets during implementation. GitHub also had no issues. After the earlier approval timeout, Billy requested resubmission and the five-file instruction patch succeeded. Both workspaces now identify the configured local Markdown tracker and the app finding records. Finding 00 retains the historical process failures and awaits triage.
- Earlier status notes overclaimed phase completion. The current audit supersedes those claims. Do not infer complete acceptance from assertion totals.
- Phase 5 work preceded the unrun 4.5 proof. No v1 release is authorised.
- The blind-test documents added a mandatory brief-approval step and a requirement for solo versions to fail checks. These additions have been removed. The retained plumber/theatre drafts have no recorded real-brief provenance.
- Application source, tests, dependencies and workflows were unchanged during this document audit. The original 24 numbered requirement lines and approved taste-test thresholds remain unchanged.

## Locked decisions

- Own application at `cre8tivoz/cauldron`, written from scratch; MIT; Electron, React and TypeScript.
- Visual editing, the agent and built-in design taste are all core to v1.
- Real Astro files are the source of truth. Shared actions live inside the app; outside agents need it open.
- Claude Code first, then Codex and Hermes, each genuinely exercised before support is claimed.
- Agent left, preview centre, inspector right; desktop minimum 1280 × 800.
- Coral accent, Source Sans 3, Mac system light/dark setting.
- Content editing, publishing, grouped undo and Before/After are in v1.
- Components are copied into the site as editable plain Astro; React is reserved for genuine interaction.
- Seven directions and five selected pieces plus links, as recorded in the starter set. Billy delegated these picks to Claudia after rejecting the earlier sets. Further Camillo/subagent work remains stopped.
- Open Design, the rejected direction sets and the generic 35-piece catalogue stay excluded.
- BYOK, Windows/Linux and broad eight-agent support remain parked.
- Two contrasting real briefs, each built with Claude alone and inside Cauldron; Billy judges blind. Cauldron must win both and pass its measured checks before v1 ships.

## Research and historical evidence

- `references/source-manifest.json`: 12 source records, with origin/licence metadata.
- `references/reference-catalog.json`: 24 original URL records.
- `references/mobbin/ui-deep-dive/`: search records, analysis and full-resolution verification.
- Mobbin collection: https://mobbin.com/collections/5d511baf-5e36-4493-8171-e50f80dfaa37/mobile/screens
- `evaluation/`: retained runtime/REA evidence and unfinished 4.5 preparation.
- Earlier Jev review: `/Users/habibi/hermes/cauldron-pivot-research/plan-review/`; later review: `evaluation/plan-review-v2/`. These are evidence about supplied plans, with their documented limits.
- Obsidian pivot handoff: `HERMES/10 Projects/Witch Daddy Labs/Built Apps/CAULDRON-OS/Cauldron Pivot — Initial Reference Read.md`. Older Cauldron OS release/unification notes describe the retired app.
- Scaffold and implementation history is retained in Git and the audit. The old scaffold-only and whole-phase-done summaries were removed from this current-state document because they conflicted with the verified checkpoint.

The research workspace remains outside Git. Application implementation resumes only when Billy asks, from the agreed requirements and the recorded open findings.
