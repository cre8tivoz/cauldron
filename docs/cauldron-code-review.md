# Cauldron — whole-repository code review

> **Historical record — not current.** Kept for provenance only. Status claims in this file ("done", "verified", "complete") were true at best when written and several have since been found wrong. The current work list is the [Cauldron Linear project](https://linear.app/witchdaddy/project/cauldron-cb61ac6bc02b); the rules and scope are in [`AGENTS.md`](../AGENTS.md).

## Verdict and scope

The application partially delivers the agreed plan. Confirmed faults affect content-file integrity, whole-run undo, recovery and publishing. No additional unrequested product feature was established. Some implementation choices, including shared type/spacing scales and remote font loading, still lack clear decision provenance; that alone does not establish scope creep.

Reviewed revision: `3ef15ba88e3e1fcb6c35726b315d39fe9e931742`. Billy selected the entire repository, including the scaffold. Full-snapshot comparison: `git diff 4b825dc642cb6eb9a060e54bf8d69288fbee4904 3ef15ba88e3e1fcb6c35726b315d39fe9e931742`. The starting object is Git's empty tree; a three-dot merge-base comparison cannot include the initial scaffold against a tree.

Both review axes covered the same 87 tracked first-party text files. The generated lockfile, documentation ZIP and two icons were inventoried separately. Source coverage does not imply every runtime scenario was exercised. Repository source, requirements, tracker records and configuration remain unchanged by this review.

## Standards

The binding rule is `AGENTS.md:20`: “Errors reach the person using the app as a visible message, and go to the console.”

1. **Damaged recovery data is hidden.** `src/main/recovery.ts:48–56` uses `catch { return []; }`. Unreadable or malformed drafts appear absent; publishing also trusts this result.
2. **Run scans silently omit files.** `src/main/runs.ts:38–56` skips directory/file read failures. `:106–113` can still mark the run finished with an incomplete change list.
3. **Comparison errors disappear.** `src/main/index.ts:225–262` replaces capture failures with `[]` and highlighting failures with `undefined`. No visible failure or diagnostic is produced.
4. **Recovery refusals can be invisible.** `src/App.tsx:375–380` stores the refusal in `problem`; `src/components/Inspector.tsx:110–123` returns before showing it when nothing is selected. A collapsed or absent inspector also hides it. The restore refusal at `src/main/index.ts:1027–1032` sends no status message.
5. **Damaged design settings look unchosen.** `src/main/directions.ts:456–475` catches read/parse failures and returns `null`, hiding the cause.
6. **Content-draft persistence failures lack a user-facing handler.** `src/components/ContentPanel.tsx:48–56` fires the recovery request without handling rejection. Its failure is not displayed.
7. **Diagnostic logging is incomplete.** `src/main/quality.ts:327–356` discards accessibility-check exceptions; `src/main/index.ts:94–97` logs status only during the test harness. Reporting a failure visibly does not satisfy the separate console requirement.

**Minor observations, with no authority to change code:** scaffold comments at `forge.config.mts:19–23` describe mechanics rather than rationale, against `CONTRIBUTING.md:23`. A **possible Divergent Change** smell exists in the controller's combined preview, agent, editing and publishing responsibilities (`src/main/index.ts`); this is a judgement call, not a proven bug or a recommendation to restructure now.

## Spec

Plan references below are to `cauldron-astro/CAULDRON-ASTRO-PLAN.md`; taste references are to `design/camillo/taste-tests.md`.

1. **Content corruption — reproduced.** Plan 1.5 says files “keep their shape” (`:84`); 3.4 requires plain-text fallback (`:109`). `src/main/content.ts:84–96,255–301` infers a block list as text, replaces its first line and reports success while leaving invalid YAML. A real YAML parser rejected the saved result.
2. **Whole-run undo is unsafe and incomplete — reproduced.** Plan 2.2 requires “a whole run” to be undoable (`:97`). `src/main/runs.ts:31–54,90–114,157–185` omits images and attributes concurrent manual changes to the agent. Probes showed an image left changed and an unrelated manual edit erased by undo.
3. **Recovery/publishing protection is partial — source-confirmed.** Plan 1.6 says “every few seconds” (`:86`); 5.1 prohibits unsaved publishing (`:134`). `src/App.tsx:155–174` restarts its timer on every keystroke; attribute/style buffers are not queued. `src/main/publishing.ts:84–95` checks persisted drafts only. Continuous typing can defer recovery indefinitely.
4. **Failed uploads cannot be retried normally — reproduced.** Under publishing 5.1 (`:134`), `src/main/publishing.ts:93–95,115–168` commits before pushing, then rejects a clean-tree retry. `src/components/PublishPanel.tsx:87–120` offers upload controls only with changed files. Direct Git push succeeded once the scratch remote was available.
5. **Shared actions are incomplete.** Plan 2.1 says visual controls and agents “all use these same actions” (`:94`). `src/main/agent.ts:233–285` permits direct file writes; only Claude receives the configured Cauldron connection. Codex/Hermes connection and conversation acceptance remain incomplete.
6. **Taste checks fall short of the approved bar.** Tests require changed-output scope, three widths and 3:1 focus contrast (`taste-tests.md:3–9,19`). `src/main/quality.ts:467,616–620` runs whole-body taste at 1280px; `src/main/taste-check.ts:160–198` measures focus presence, not contrast.
7. **Change comparison remains partial.** Plan 2.2 requires highlighting changed parts (`:97`). `src/main/index.ts:225–245,1205–1215` observes limited text/styles and outlines current nodes; removed elements have no current node to highlight. Complete comparison acceptance remains unverified.

## Acceptance still outstanding

The full component acceptance checks, fresh three-agent end-to-end coverage, manual unsigned first launch and real-brief blind comparison remain unverified. The blind comparison remains a release gate. Automated separate-Mac download/unpack/launch has passed.

Research suggestions were not promoted into extra requirements. In particular, this review does not demand cloud services, BYOK, other platforms, additional components or an architectural rewrite. It also does not assert that the plan requires an unspecified second rendered site simply because the feature is named Before/After; the concrete finding concerns incomplete change coverage.

## Execution evidence

- `npm run check` passed under Node 26.13.0: type checking, lint/format and the existing deterministic tests.
- `npm run smoke` passed: the packaged application opened hidden and rendered its interface. This review's run emitted none of the previously observed shutdown warnings; the historical warning is not claimed fixed.
- GitHub run `42344323709` succeeded at the exact reviewed revision, including packaging and separate-Mac launch.
- Four targeted probes exercised production `publishing.ts`, `runs.ts` and `content.ts` against scratch fixtures. Only Electron's user-data location was substituted to isolate recovery/run storage. Git remotes were local scratch repositories; no real website or external remote was edited.
- The probes reproduced content corruption, unrelated manual edits being undone, omitted image changes and a blocked push retry. Full browser editing, real model calls and the complete real-site matrix were not rerun.
- A provisional allegation that a stopped preview is never reported was rejected: `src/main/index.ts:155–160` already registers a process-exit handler and shows a status message.
- Final Git status was clean at the reviewed revision. No fixes, commits, pushes, dependency changes or new implementation tasks were made.

## Evidence files

- Probe script: `/Users/habibi/.hermes/profiles/claudia/cache/scratch/cauldron-review-probes.mjs`
- Probe results: `/Users/habibi/.hermes/profiles/claudia/cache/scratch/cauldron-review-KifyT9/evidence.json`
- Standards initial coverage: `/Users/habibi/.hermes/profiles/claudia/cache/scratch/cauldron-standards-coverage.json`
- Standards completed coverage: `/Users/habibi/.hermes/profiles/claudia/cache/scratch/cauldron-standards-completion.json`
- Spec coverage: `/Users/habibi/.hermes/profiles/claudia/cache/scratch/cauldron-spec-ledger.json`

**Summary:** Standards: 7 failure-handling findings and 2 minor observations; worst is recovery failures being hidden. Spec: 7 finding groups; worst are content corruption and undo erasing unrelated edits.
