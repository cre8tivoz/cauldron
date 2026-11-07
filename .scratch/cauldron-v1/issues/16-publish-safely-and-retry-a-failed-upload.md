# 16: Publish safely and retry a failed upload

**What to build:** Publishing is explicit, refuses every unsaved buffer and can retry an already committed change after an upload failure.

**Blocked by:** [13: Recover every unsaved edit after a crash](13-recover-every-unsaved-edit-after-a-crash.md)

**Status:** done

**Parent findings:** [09: publishing and mac release](09-publishing-and-mac-release.md)

**Plan:** 5.1

**Execution:** Billy approved ticket publication, including safeguard 31, then authorised it in batch 1 on 7 Nov 2026.

## Acceptance criteria

- [x] Reproduce the clean-tree retry refusal before repair, then prove retry succeeds against an isolated remote without creating an unnecessary second commit.
- [x] Show changed files and publish only after an explicit request through the open site’s own repository.
- [x] Block publishing for visual and content buffers, including edits not yet written to recovery storage.
- [x] Keep local commit and remote upload outcomes distinct; handle remote/upstream failures visibly.
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

**Revision:** batch 1 commit `fix: batch 1, protect people's work`, built on `e67dad9`. Node 26.13.0. Fix by one subagent; on-screen harness by a second; verified by the orchestrator.

**Issues found and fixed:**

1. A failed upload could not be retried (reproduced). Publishing committed and then failed to push; the retry saw a clean tree and refused with "Nothing has changed since the last commit." Fix (`src/main/publishing.ts`): `repoState` counts commits not yet uploaded; publishing with a clean tree but unuploaded commits uploads them without committing again; the commit and upload outcomes are reported separately; a failed upload reports that the commit is in place.
2. Edits still being typed did not block publishing (source-confirmed). Only drafts already in recovery storage were checked. Fix: the window passes its count of unsaved visual and content edits with the publish request, and publishing refuses while any exist (`src/App.tsx`, `src/components/ContentPanel.tsx`, `src/components/PublishPanel.tsx`, `src/preload.ts`, `src/declarations.d.ts`).
3. The Publish panel offered upload only when files had changed. It now shows "N commit(s) not uploaded yet" with an **Upload** control on a clean tree, and shows the unsaved notice with Commit and Upload disabled while edits are unsaved.

Unreadable recovery data now also blocks publishing (ticket 14).

**Regression tests:** `scripts/test-core.mjs` 5.1 tests (a failed upload keeps the commit and a retry uploads it without a second commit; commit-only reports commit and upload apart; publishing refuses while an edit has not reached recovery storage; "nothing changed" is still refused), against a local bare remote with no network.

**Verification evidence:**

- Red: against the pre-batch `publishing.ts`, the first publish returned "The commit is in place, but the push failed." and the retry "Nothing has changed since the last commit."; the three new tests failed. Green afterwards; `npm run check` exit 0.
- Packaged app, `CAULDRON_PUBLISH_UI_TEST` on a rudeboycoffee copy made into its own repository with a local bare remote: **21/21**.
  - (a) Typing in a content form without saving showed "1 edit(s) are still being typed and have not been saved…" with Commit and Commit-and-push disabled; the same request through the button's channel was refused and HEAD did not move.
  - (b) Typing in the inspector and opening Publish within a second, before the recovery save, was blocked the same way.
  - (c) With the remote broken, clicking commit-and-upload showed "Committed 2 file(s) locally." and, on a separate line, "The commit is in place locally, but the upload failed." After restoring the remote the panel showed "1 commit(s) not uploaded yet" with **Upload**. Clicking it showed "Uploaded to origin/main."; the commit count stayed 2 → 2 and the remote's `main` matched local HEAD.
- Existing behaviour kept: the changed-file list, explicit publishing through the site's own repository, commit-only, and no-remote outcomes.

**Limitations:** only local bare remotes were used; no hosted Git service or credential prompt was exercised. When a remote exists but no upstream is set, every local commit counts as not uploaded until the first upload sets the upstream.
