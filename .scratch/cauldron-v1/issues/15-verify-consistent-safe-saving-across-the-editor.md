# 15: Verify consistent safe saving across the editor

**What to build:** The agreed open, edit, save, conflict-choice, undo and preview-isolation behaviour is exercised on fresh copies of both named real sites.

**Blocked by:** [11: Save content without damaging the file](11-save-content-without-damaging-the-file.md), [13: Recover every unsaved edit after a crash](13-recover-every-unsaved-edit-after-a-crash.md)

**Status:** done

**Parent findings:** [01: core save and recovery evidence](01-core-save-and-recovery-evidence.md)

**Plan:** 1.1–1.8

**Execution:** Billy approved ticket publication, including safeguard 31, then authorised it in batch 1 on 7 Nov 2026.

## Acceptance criteria

- [x] Exercise the original style edit, unrelated outside edit and undo scenario across applicable page, style, source and content save paths.
- [x] Non-overlapping changes merge safely; overlaps preserve both versions and offer the agreed keep-mine/use-disk choice.
- [x] Unsupported authored source remains byte-for-byte intact; new pages appear without a manual reload.
- [x] Verify preview isolation, source-path containment and real startup/failure behaviour without weakening protections; record only exercised coverage.
- [x] For any confirmed bug fixed here, retain a permanent regression test that fails before the fix and passes afterwards.
- [x] Record the exercised user-path results and exact revision; satisfy the existing project checks before committing. Distinguish failures, blocked work and unverified behaviour.

## Sources and boundaries

- [Agreed development plan](../../../../cauldron-astro/CAULDRON-ASTRO-PLAN.md): the numbered requirements above.
- [Whole-repository review](../../../docs/cauldron-code-review.md): evidence of the relevant faults and remaining acceptance work.
- [Retrospective](../../../docs/cauldron-retro.md): regression-test and evidence guidance; other environment changes require their own approval.

Use the existing implementation and tracker. Preserve the original sites, settled decisions and accepted scope. No speculative restructuring, additional features or weaker assertions. Keep parent finding records unchanged; completion evidence belongs with this child ticket.

## Comments

Ticket breakdown approved by Billy through the to-tickets approval form.

### Completion record — 7 Nov 2026 (batch 1)

**Revision:** batch 1 commit `fix: batch 1, protect people's work`, built on `e67dad9`. Node 26.13.0. Harness checks added by a subagent; the content-path gap was fixed by the orchestrator.

**Coverage added to `runEndToEnd`** (the existing 23 checks unchanged): a style edit is written; only the styled tag changes and authored source stays byte-for-byte intact (frontmatter identical); a style edit merges with an unrelated outside edit; undo after an outside edit keeps the outside edit; an overlapping outside style change is refused; **Use the disk version** leaves the outside version untouched; **Keep mine** writes my version and keeps the disk version as a copy in the app's `conflicts` folder; a content save based on an older version is refused and a current one is written (on sites with content).

**Issue found and fixed:** content forms refused a clash but did not offer the agreed keep-mine / use-disk choice, against plan 1.4's "every save path follows the same rule". Fix: `saveEntry` marks a clash as `conflict`; `saveContent` in `src/main/index.ts` keeps the disk version as a conflict copy before applying **Keep mine** on top of the current file; `ContentPanel.tsx` shows the same **Keep mine** / **Use the disk version** choice as the inspector. Regression: the stale plain-text test now asserts `conflict: true`; the content harness checks the choice, the written value and the conflict copy.

**Verification evidence** (packaged app, final merged code, fresh copies of the originals in `~/hermes/website-designs`):

- Editor suite: WDLsite (Astro 7.3.5) **30/30**; rudeboycoffee (Astro 6.4.8) **32/32**. Both include 1.1 open and preview, 1.8 the preview has neither the editing bridge nor Node access, 1.2/1.5 edits and byte-for-byte checks, 1.3 undo, 1.4 merge, refuse, keep mine and use disk, 1.7 a new page appears without a reload, and 1.6 drafts.
- Content suite on rudeboycoffee: **9/9**, including `1.4 a content clash is offered as a keep-mine / use-disk choice`, `1.4 keep mine writes my content version` and `1.4 keep mine keeps the disk content version as a copy`.
- Source-path containment: the existing symlink and outline-escape unit tests pass. Startup and crash recovery were exercised in ticket 13's crash runs.
- `npm run check` exit 0.

**Limitations:** WDLsite has no content collections, so content saves were exercised on rudeboycoffee only. The new content-panel buttons were exercised through the same main-process path the buttons call, not by clicking. There is no separate whole-file source editor beyond the content plain-text fallback.
