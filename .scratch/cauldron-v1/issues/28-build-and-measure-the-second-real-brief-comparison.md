# 28: Build and measure the second real-brief comparison

**What to build:** A second genuinely contrasting real brief has comparable Claude-alone and Cauldron builds, measured and prepared for blind judgement.

**Blocked by:** [18: Prove Claude works through the repaired app](18-prove-claude-works-through-the-repaired-app.md), [24: Verify taste and design-direction compliance](24-verify-taste-and-design-direction-compliance.md)

**Status:** open — the shared source-editing gap is corrected; the second rebuilt pair and blind judgement have not been run

**Parent findings:** [08: real brief blind proof](08-real-brief-blind-proof.md)

**Plan:** 4.5; approved taste-test targets

**Execution:** Billy approved ticket publication, including safeguard 31. Application development remains paused until explicitly resumed. Readiness does not start work.

## Acceptance criteria

- [ ] Record real-brief provenance, demonstrate contrast with the first brief and use identical brief text within the comparison pair.
- [ ] Build both versions independently and apply the unchanged agreed measurements/taste checks to the Cauldron output.
- [ ] Preserve neutral outputs and evidence with the condition key withheld until judgement.
- [ ] Do not require the standalone version to fail or mislabel illustrative drafts as real briefs.
- [ ] For any confirmed bug fixed here, retain a permanent regression test that fails before the fix and passes afterwards.
- [ ] Record the exercised user-path results and exact revision; satisfy the existing project checks before committing. Distinguish failures, blocked work and unverified behaviour.

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
