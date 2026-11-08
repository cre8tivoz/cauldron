# 28: Build and measure the second real-brief comparison

**What to build:** A second genuinely contrasting real brief has comparable Claude-alone and Cauldron builds, measured and prepared for blind judgement.

**Blocked by:** [18: Prove Claude works through the repaired app](18-prove-claude-works-through-the-repaired-app.md), [24: Verify taste and design-direction compliance](24-verify-taste-and-design-direction-compliance.md)

**Status:** done — the app-side half was rebuilt through Cauldron at `e99b008` and measured with the unchanged checks; blind judgement stays with ticket 29

**Parent findings:** [08: real brief blind proof](08-real-brief-blind-proof.md)

**Plan:** 4.5; approved taste-test targets

**Execution:** Billy approved ticket publication, including safeguard 31. Application development remains paused until explicitly resumed. Readiness does not start work.

## Acceptance criteria

- [x] Record real-brief provenance, demonstrate contrast with the first brief and use identical brief text within the comparison pair.
- [x] Build both versions independently and apply the unchanged agreed measurements/taste checks to the Cauldron output.
- [x] Preserve neutral outputs and evidence with the condition key withheld until judgement.
- [x] Do not require the standalone version to fail or mislabel illustrative drafts as real briefs.
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

**Run 2026-11-08, revision 17bb143 (working tree also has the test-only mode in ticket 27).** Condition key withheld; evidence in `scratch/t27-28/`, neutral copies in `.scratch/cauldron-v1/blind-comparison/`.

- Brief: PeNtA, Melbourne experimental visual artist. Brief text is assembled from `website-designs/penta-artist/README.md` (real client build, MOUTHWASH monochrome direction); it is not a verbatim client-supplied document. Contrast with ticket 27: type-led monochrome art site vs warm editorial food producer. Same text both conditions; SHA-256 `389bb121…c947a5773`.
- Both conditions: installed Codex CLI 0.152.0, `gpt-5.6-terra`, identical user config and settings.
- Standalone: built Home/Gallery/Contact with working filter markup; `npm run build` passes (3 pages).
- Through Cauldron: created bare `gallery.astro` and `contact.astro` through `create_page`, then stopped. Reply: actions "can create pages and modify existing elements, but cannot add the markup/CSS/JS needed for navigation, image galleries, filters, or the contact form." 2 files changed, both title-only shells.
- Cauldron output measurement (unchanged `checkSite`): builds, 253 findings, 47 measured failures, including pure black, default Times, colour/spacing/type off-direction and no main landmark.
- Same product gap as ticket 27, now confirmed on a contrasting brief: no action writes page markup or components. No workaround, alternate app or provider substitution was used.
- Blind comparison preserved but **not judgement-ready**.
- Environment note: the Cauldron-side agent also reported a Vite cache `EPERM` because the disposable scaffold's `node_modules` was a symlink to a read-only dependency tree. The app's later build/measurement succeeded, so this did not cause the gap.
- `npm run check` passes with the test-only mode; blind outputs archived as `.scratch/cauldron-v1/blind-comparison/outputs.tar.gz`.

**Correction 2026-11-08 (working tree after `17bb143`, uncommitted).** The blocked result was accurate. The editing-surface gap is corrected with bounded whole-file source actions: `readSource` / `writeSource` (MCP `read_source` / `write_source`) for `.astro` under `src/pages`, `src/layouts`, `src/components` and `.css` under `src/styles`, using the existing shared action, catalogue and history path.

- Existing files need the exact hash from `read_source`; stale writes are refused with the disk text and no write. Creation needs an explicit null hash and cannot clobber. Traversal, absolute paths, symlinks, unwanted extensions/private files and payloads over 512 KiB are refused.
- Creation is one ordinary history entry: undo deletes it, redo recreates only when absent, and external modification or a new collision is refused. Run attribution and run undo keep the existing semantics (a added file is deleted on run undo).
- Verification: 16 focused core checks red before implementation and green after; packaged action parity 41/41 including MCP create/replace/stale/undo. `npm run check` passes.

**Still open:** ticket 28's pair has not been rebuilt through the app, so the second comparison remains not judgement-ready and whole-site building is **not** claimed proven. Rerun the PeNtA pair through Cauldron before any blind judgement.

**Run 2026-11-08, revision e99b008 (packaged app).** Same protocol as ticket 27: fresh copy of the initial three-file scaffold plus the same copied project images, brief text reused unchanged (SHA-256 `389bb121…c947a5773`), no standalone output shown to the app run.

- App-side run: `read_design`, `list_pages`, `read_source` ×6, `create_page` ×2, `read_source` ×4, then the provider stopped the turn with: "You've hit your usage limit… try again at Nov 11th, 2026 6:32 PM." Two empty page shells (`gallery.astro`, `contact.astro`, 258 bytes each) were created before the stop; `index.astro` was untouched.
- No retry was attempted, per the no-repeat rule; the quota failure is preserved rather than replaced. This also used the single permitted model run for this brief, so pair B's app half is **not built**.
- Measurement (unchanged `checkSite`, still run): builds three routes; 253 findings, **47 failures** — `/` 15, `/gallery` 16, `/contact` 16: default fonts, off-direction colour/spacing/type, missing `lang` on both shells, pure black. These describe title shells, not a design attempt.
- Acceptance criteria still unmet: both versions built independently through the app, and the unchanged checks applied to a real app-side design. The earlier limitation (no source-writing action) did **not** recur: `read_source`/`write_source` worked in ticket 27's pair and were called here before the quota stop.
- Evidence: `scratch/t27-28-complete/logs/B-cauldron.log`, `measure/B-quality.json`; neutral copies in `blind-comparison/outputs.tar.gz` and `measurements.md`.
- `npm run check` passes at `e99b008`. Next step needs provider quota restored, then one more real Codex run for this brief; blind judgement stays with ticket 29.

**Run 2026-11-08, revision e99b008 (resumed after the usage-limit pause, packaged app).** Same fresh-scaffold protocol: a new copy of the initial three-file Astro starter plus the same 14 copied images, disposable real-directory `node_modules` clone (no read-only symlink), hidden fresh userData, brief text reused byte-identically (SHA-256 `389bb121…c947a5773`), no standalone output shown to the app. One Codex run only, through the existing `sendAgent` / `CAULDRON_BRIEF_TEST` path, installed CLI 0.152.0 with the saved `gpt-5.6-terra` config unchanged.

- Provider quota was available: the run finished normally in about five minutes with **5 files changed** — `src/layouts/StudioLayout.astro`, `src/styles/site.css`, `src/pages/index.astro`, `gallery.astro`, `contact.astro` — via `read_source` ×7 and `write_source` ×5. The earlier "no source action" gap did not recur.
- Result: a real three-page site. Home leads with a split `PeN/tA` wordmark, manifesto and four selected works; Gallery holds ten items with a working Stills/Video filter and poster links for video; Contact has the Fitzroy address, `mailto:` link and a labelled mail-client form; all 14 supplied images are used, monochrome per the brief.
- Build: independent `npm run build` passes, three routes, `lang` and one `<main>` per page.
- Measurement (unchanged `checkSite` / taste checks through the app's `qualityRun`): 452 findings, **52 failures** — `/` 10, `/gallery` 15, `/contact` 27. Failures: text contrast 3.68–3.7:1, axe `label-content-name-mismatch`, no visible disabled state on three contact controls, one unreachable focus target / indicator under 3:1, one missing hover state, keyboard reach 8/9 and 11/12. No threshold was relaxed and the standalone side was not altered.
- Provenance: packaged `app.asar` build files are SHA-256 identical to the local build made at 02:47 after commit `e99b008`; no repackaging was needed.
- Evidence: `scratch/t28-resume/` (`logs/B-cauldron.log`, `measure/B-quality.json`, `measure/summary.json`, site and userData); summary at `scratch/t28-resume-result.md`. Neutral copies: `.scratch/cauldron-v1/blind-comparison/outputs.tar.gz` (pair-B `output-2` replaced), `measurements.md`, `hashes.txt`. Pair A unchanged; condition key stays in `scratch/t27-28/condition-key.json` and is not in the archive.
- `npm run check` was not rerun because no repository source changed; the saved green run at `e99b008` stands (`t27-28-complete/logs/check3.log`). No commit made.
- Remaining: the 52 measured failures are recorded, not hidden. Blind judgement and the release gate remain ticket 29.
