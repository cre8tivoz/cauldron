# 27: Build and measure the first real-brief comparison

**What to build:** One contrasting real brief has comparable Claude-alone and Cauldron builds, measured and prepared for blind judgement.

**Blocked by:** [18: Prove Claude works through the repaired app](18-prove-claude-works-through-the-repaired-app.md), [24: Verify taste and design-direction compliance](24-verify-taste-and-design-direction-compliance.md)

**Status:** open — the source-editing gap is corrected; the rebuilt comparison and blind judgement have not been run

**Parent findings:** [08: real brief blind proof](08-real-brief-blind-proof.md)

**Plan:** 4.5; approved taste-test targets

**Execution:** Billy approved ticket publication, including safeguard 31. Application development remains paused until explicitly resumed. Readiness does not start work.

## Acceptance criteria

- [ ] Record real-brief provenance and use identical brief text for the two conditions.
- [ ] Build both versions independently and apply the unchanged agreed measurements/taste checks to the Cauldron output.
- [ ] Preserve outputs and evidence under neutral labels; keep the condition key out of Billy’s view before judgement.
- [ ] Do not require the standalone version to fail, invent real-brief provenance or add another mandatory brief-approval gate.
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

**Run 2026-11-08, revision 17bb143 (working tree also has the test-only mode below).** Condition key withheld; evidence in `scratch/t27-28/` and neutral copies in `.scratch/cauldron-v1/blind-comparison/`.

- Brief: Moretti Estate (single-estate olive oil, Heathcote). Brief text is an editorial assembly of the real project's `website-designs/moretti-estate/CURSOR-BUILD-BRIEF.md` and `CAMILLO-DESIGN-PROPOSAL.md`; it is not a verbatim client-supplied document. Same text used for both conditions; SHA-256 `4551e036…cf72c8`.
- Both conditions: installed Codex CLI 0.152.0, `gpt-5.6-terra`, identical user config and settings.
- Standalone: built Home/Oils/Visit; `npm run build` passes (3 pages).
- Through Cauldron: `read_design`, `list_pages`, `read_page_outline` only; **No files changed**. Reply: it found text/attribute/inline-style and CSS-rule edits plus `createPage`, but "no action to add or replace page markup/components", so it could not build the brief through the permitted actions.
- Cauldron output measurement (unchanged `checkSite`): builds, 1 page, 37 measured failures on the placeholder scaffold (no headings, no `lang`/main, 32px h1, default Times, pure black); `/oils` and `/visit` do not exist and measure as missing pages.
- The app's own `createPage` writes only a title shell (`src/pages/<page>.astro` with `<h1>`), and no action inserts markup or components. A whole-site brief cannot produce a designed site through Cauldron today. This is a product gap, not a provider or harness failure; no workaround was substituted.
- Blind comparison is preserved but **not judgement-ready**: one side is a finished three-page site, the other an untouched scaffold.
- Test-only addition: `CAULDRON_BRIEF_TEST` mode in `src/main/e2e.ts` + dispatch in `src/main/index.ts`, reusing the existing agent path and `checkSite`; no product behaviour changed.
- `npm run check` passes with the test-only mode; blind outputs archived as `.scratch/cauldron-v1/blind-comparison/outputs.tar.gz`.

**Correction 2026-11-08 (working tree after `17bb143`, uncommitted).** The recorded block was accurate: the shared action catalogue could not read or replace whole page/component/layout markup or design CSS, and `createPage` wrote only a title shell. The bounded correction is implemented:

- Added `readSource` / `writeSource` (MCP: `read_source` / `write_source`) through the existing shared action handler, catalogue and history path. Allowed files only: `.astro` under `src/pages`, `src/layouts`, `src/components`; `.css` under `src/styles`.
- Reads return the exact text and hash, or an explicit null hash when the file is absent. Writes of existing files require that exact hash; a stale hash is refused with the disk text and nothing is written. Creation requires an explicit null hash and refuses to clobber.
- Traversal, absolute paths, symlinks, other extensions and private files (`package.json`, `.env`, `cauldron/tokens.css`) are refused. Whole-file payloads over 512 KiB are refused.
- Creation records one ordinary history entry; undo deletes the file instead of writing it empty, redo recreates only when the path is absent, and a modified or newly conflicting file is refused.
- Tests: 16 focused core checks, red before implementation (`readSource`/`writeSource` were unknown actions; undo of a created file left an empty file), all green afterwards; packaged action-parity run 41/41 passed including MCP create, hash-checked replace, stale refusal and undo delete. `npm run check` passes.

**Still open:** no whole-site brief has been rebuilt through the corrected app, so the blind comparison remains not judgement-ready and whole-site building is **not** claimed proven. The next real proof is to rerun the ticket 27 pair through Cauldron, then measure and hold the blind judgement.
