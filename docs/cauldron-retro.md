# Cauldron — development retrospective

## Bottom line

The existing plan and project rules did not reliably control execution or completion claims. Automated checks were present and working, but their coverage missed serious user-facing failures. Adding more instructions would leave those same gaps open.

This retrospective uses [the whole-repository review](cauldron-code-review.md), [the process audit](plan-verification.md), the current session's review/verification steps, and the actual test commands, CI workflow and repository instructions. It recommends changes to the agent's working environment. All recommendations are proposals; application development remains paused.

## Recommendations, highest consequence first

### 1. Critical — make the reproduced failures permanent tests

**Evidence:** the review reproduced content corruption, undo erasing an unrelated edit, image changes escaping run undo and a blocked upload retry. Existing `npm run check` and smoke passed. The current tests cover other safety cases but omit these scenarios.

**Recommendation:** when repairs are authorised, promote those four reproductions into deterministic regression tests, using the existing test setup and production functions. First demonstrate each test failing on the reviewed code; then fix the accepted fault and prove it passes. Keep sites and Git remotes disposable. Add the tests to the existing command already run by CI.

**Completion evidence:** the original fault is caught before repair, fixed afterwards, and unrelated user files remain unchanged. A new framework is unnecessary.

### 2. High — completion must refer to the actual acceptance checks

**Evidence:** `plan-verification.md:5,103–108` records overstated completion and inconsistent use of the issue workflow. The review still finds incomplete shared actions, recovery, comparison and approved taste checks. Passing assertion totals were used too broadly.

**Recommendation:** work from one authorised existing ticket at a time. Its reviewer checks the exact plan requirement and acceptance criteria, distinguishing implemented, exercised, failed and unverified behaviour. Close only what the evidence establishes. Keep human judgement separate from independently testable work; preserve the existing release gate.

**Completion evidence:** every closed requirement links to the relevant exercised scenario at the reviewed revision. Use the existing tracker and audit; retain the agreed scope and thresholds.

### 3. High — test the existing error-reporting rule

**Evidence:** the review's Standards findings show silent recovery, scanning, comparison and design-setting failures, plus recovery messages hidden by panel state. `AGENTS.md` already requires visible errors and console reporting.

**Recommendation:** add targeted failure-injection tests to the existing suite: damaged recovery/settings data, failed draft storage, unreadable run files, failed comparison and restore refusal with no selection or a closed panel. Assert the actual user-visible result and diagnostic. Legitimate missing-file states remain distinguishable from damaged data. Avoid a blanket ban on every `catch` or nullable result.

**Completion evidence:** each failure reaches the person in the actual interface state where it occurs. Keep semantic judgement with the reviewer; repeated wording alone adds no enforcement.

### 4. High — run existing checks before a commit can be accepted

**Evidence:** CI already runs types, lint, tests, packaging and a separate-Mac launch (`.github/workflows/ci.yml:19–47`). The audit records earlier failing commits. This checkout currently has no configured custom hooks path or executable local hooks.

**Recommendation:** use the existing required commands as the local commit gate, with failure stopping the sequence. If a local hook is adopted, reuse the existing check command and explicitly install/verify it in this checkout; a hook file merely committed to Git does not activate itself. Retain the packaged launch check required by the project. These checks prevent mechanical failures; they do not establish full product acceptance.

**Completion evidence:** a deliberate failing check blocks the local workflow, and the remote checks cover the exact pushed revision. No approval settings need changing.

### 5. Medium — keep important proof with the project

**Evidence:** the review document is now in `docs/`, but its reproduction script, raw results and coverage ledgers still point to temporary scratch storage.

**Recommendation:** preserve the minimal reproductions and relevant evidence in the project during the authorised repair work. Turn durable behaviour checks into tests; retain only the supporting logs needed to explain the finding. Keep credentials and whole disposable sites excluded.

**Completion evidence:** another session can reproduce the finding from the checkout after the temporary folder is gone. Keep the existing review and issue records as the index.

### 6. Medium — make review coverage explicit before declaring completion

**Evidence:** the first review passes returned partial coverage after truncated reads. Further passes were needed. A provisional preview-exit finding was rejected after checking its existing caller.

**Recommendation:** give each reviewer a bounded file list and enough output budget from the outset. Page long files, record missing ranges and continue only those ranges. Verify findings against callers and the visible interface before publishing them. Preserve the independent Standards/Spec separation.

**Completion evidence:** the requested file inventory matches the completed coverage, exclusions are explicit, and each reported fault survives caller-level verification. This improves the existing review process without adding another service or review loop.

## Navigation and instruction maintenance

The app's `AGENTS.md` already points to the brief, plan, approved tests, decisions and local tracker. Use those pointers and the current review in future task briefs. Fix a weak or stale pointer at its existing location when authorised. The recorded tracker contradiction has already been corrected.

The project instruction file is short enough that this retrospective does not justify a rewrite. There is no evidence here supporting a new global-instruction policy. Keep genuine judgement standards with the reviewer, and prefer executable checks for mechanical mistakes. Add neither duplicate plans nor a new standards document merely to restate rules already present.

## What worked

Real production-function probes exposed failures missed by the routine checks. Independent review axes helped separate code-rule breaches from plan gaps. Caller verification removed a false allegation. The existing CI and separate-Mac launch were confirmed working. The review respected the implementation pause.

## Limits and current state

This retrospective establishes observed workflow failures; it does not establish the model switch as their cause. No extra product feature was proved by the review. Structural changes remain outside the authorised scope.

Only this retrospective document was created for this request. No application source, tests, hooks, CI, instructions, dependencies or approval settings were changed. Neither the review nor this retrospective has been committed or pushed in this step.
