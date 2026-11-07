# 12: Undo an agent run without losing other work

**What to build:** A whole agent run can be reviewed and undone while unrelated manual edits survive, including changes to images and other site files.

**Blocked by:** None (can start once implementation is authorised).

**Status:** done

**Parent findings:** [03: before after and run undo](03-before-after-and-run-undo.md)

**Plan:** 1.3; 1.4; 2.2

**Execution:** Billy approved ticket publication, including safeguard 31, then authorised it in batch 1 on 7 Nov 2026.

## Acceptance criteria

- [x] Reproduce the unrelated-edit loss and omitted-image cases before repair; both regression cases pass after repair.
- [x] The changed-file list accounts for added, changed and removed files, including images and previously excluded file types or sizes.
- [x] Whole-run undo restores only the run’s own changes; later overlapping edits cause a clear refusal with identified clashes and no partial overwrite.
- [x] If ownership of a change cannot safely be established, refuse rather than silently attributing another writer’s work to the run; the agreed whole-run path must still be exercised successfully.
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

**Revision:** batch 1 commit `fix: batch 1, protect people's work`, built on `e67dad9`. Node 26.13.0. Developed by a subagent in a separate worktree; the orchestrator found and fixed two further ownership defects before merging.

**Issues found and fixed:**

1. Images and other files were ignored (reproduced). The snapshot only read listed text types under 1 MB, so a run that changed `hero.png` listed only the text file and undo left the image changed. Fix (`src/main/runs.ts`): every file outside `node_modules`, `dist`, `.git`, `.astro` and `.vercel` is read as raw bytes; read failures are recorded, never treated as unchanged.
2. Other writers' edits were undone (reproduced). A file edited by another program during the run was attributed to the agent and restored by undo. Fix: runs Cauldron starts record the files the agent reported writing (Claude's Edit, Write, MultiEdit and NotebookEdit tool events, `src/main/agent.ts`) and the files it changed through the agent connection. Any other changed file is marked uncertain, and undo refuses it by name.
3. Edits made in Cauldron's editor during a run (found during orchestrator review of the subagent change). Editor writes are excluded from the run. A file both the agent and the editor wrote is uncertain and refused, so the run never splits a file between two writers (`src/main/history.ts` `writtenSince`, `src/main/runs.ts`).
4. Person's edits stamped as the agent's (orchestrator review, never shipped). The first version tagged every shared action during a run as the run's, including the person's own. Fix: only actions arriving through the agent connection are tagged (`sharedAction(request, fromAgent)` in `src/main/index.ts`).
5. Undo checks every file before writing any, refusing with the clashing or uncertain files named and nothing written.

**Regression tests:** `scripts/test-core.mjs` 2.2 tests (image listed and undone; editor edit during a run survives undo; editor write on top of the agent's change refused; outside program's edit refused, never undone; fully claimed run undoes in full; unreadable file refuses; later edit refuses with nothing written; added and removed files). `scripts/test-agent.mjs`: Claude edit tools report the file they wrote.

**Verification evidence:**

- Red: the original review probe against the pre-batch `runs.ts` still reproduced both defects (image omitted; outside edit restored). The editor-write, outside-program and Claude-path tests failed against the subagent's first version and pass now.
- Probe against the new `runs.ts`: image listed and restored; outside program's edit refused.
- `npm run check` exit 0.
- Packaged app, editor suite on fresh copies of both named sites: WDLsite 30/30 and rudeboycoffee 32/32, including `2.2 a whole run is undone in one step` and `2.2 undo refuses when files changed after the run`.

**Limitations:**

- No live Claude run was made; the claimed-file path is proven with Claude's recorded event format (ticket 18 proves Claude end to end).
- Codex and Hermes events carry no file paths yet, so undo of their Cauldron-started runs refuses any file they changed directly instead of guessing (tickets 19 and 20).
- Runs started and stopped by hand around an outside agent have no events to check: changes other than Cauldron editor writes are treated as that run's, as the person declared.
- The whole site is held in memory during a run. This is fine for the test sites; very large media folders were not measured.
