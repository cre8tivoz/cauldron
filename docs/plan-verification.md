# Plan verification — corrective audit

Source of truth: `cauldron-astro/CAULDRON-ASTRO-PLAN.md` and its approved `design/camillo/taste-tests.md`. This audit does not reduce their acceptance criteria.

**The earlier claim that only blind judgement and a second Mac remained was incorrect.** The earlier test totals described selected assertions, not coverage of every plan requirement. A quality harness passing does not mean the inspected site passes quality.

## GitHub failure investigation

Read the actual failed logs, not notification titles:

| Run         | Commit  | Actual failure                                       | Existing correction     |
| ----------- | ------- | ---------------------------------------------------- | ----------------------- |
| 42231206676 | 11bee2e | Window.cauldron missing from TypeScript declarations | b494c85                 |
| 42234826720 | 4128c6f | Formatting failures in six files                     | Later formatting passes |
| 42237188586 | 12ca11f | e2e.ts formatting failure                            | Later formatting passes |
| 42237952738 | a4fc000 | Duplicate object property in the harness             | b1cbd95                 |
| 42238004319 | b1cbd95 | Smoke assertion failed                               | 4699936                 |
| 42238806913 | ca4ae33 | Smoke assertion failed                               | 4699936                 |
| 42252265516 | 80a6b43 | Run-file evidence display typed as never             | d67ed5d                 |

Audit starting point d67ed5d: remote CI 42252292115 succeeded. Earlier claims that Phase 2 and the close fix had green CI were wrong; their logs show formatting failures. No historical failed run is deleted or relabelled.

## Requirement-by-requirement findings at audit start

| Plan | Finding                                                                                                                                                                                                                                                                                 |
| ---- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0.1  | App, licence, docs and CI exist. CI checked types, formatting and a launch, not the full product.                                                                                                                                                                                       |
| 0.2  | App/research separation exists.                                                                                                                                                                                                                                                         |
| 0.3  | Both test-site copies exist, but the editor suite had not been proven on both.                                                                                                                                                                                                          |
| 1.1  | Open/preview works on installed sites; installation is not silent. Startup errors need propagation rather than only status.                                                                                                                                                             |
| 1.2  | WDLsite editing worked. Fresh rudeboycoffee editor run failed: Astro 6 removes source annotations.                                                                                                                                                                                      |
| 1.3  | Undo refused any outside change, including non-overlapping ones; shared action stale checks could overwrite newer text.                                                                                                                                                                 |
| 1.4  | Inspector has merge/refuse and conflict choice, but the shared action path used a different rule.                                                                                                                                                                                       |
| 1.5  | Existing surgical edit check was tautological (common prefix/suffix is not proof). Safety needs explicit expected-file assertions and opaque syntax cases.                                                                                                                              |
| 1.6  | Recovery existed but did not preserve the original source version. Saved draft records could remain after Save.                                                                                                                                                                         |
| 1.7  | New-page path raced Astro 6's watcher, yielding a persistent 404.                                                                                                                                                                                                                       |
| 1.8  | Preview bridge is isolated; editing IPC lacked sender validation and path checks followed symlinks. Original test searched HTML rather than evaluating the running context.                                                                                                             |
| 2.1  | Inspector, action IPC and MCP did not all use the same action/history path. CLI agents received a catalogue, not an actual configured action connection.                                                                                                                                |
| 2.2  | Run file review and whole-run undo exist. Highlight comparison only compared text, missing style-only changes. Before/After needs verification against its full intended behaviour.                                                                                                     |
| 3.1  | Panels exist; native preview could overlay other tool pages, and returning to Build did not necessarily remeasure its bounds. Resizing needs live UI coverage.                                                                                                                          |
| 3.2  | Single-turn edits had been exercised for all three CLIs. Codex thread ids were not parsed and its resume command passed an unsupported -C flag. Error/result handling could report success too early. Conversation continuity was not tested.                                           |
| 3.3  | Local authenticated HTTP protocol tests existed, not a real external-agent MCP test. Connection details were not exposed in the UI.                                                                                                                                                     |
| 3.4  | Forms exist. Schema version was not checked on save; unquoted text could corrupt YAML. Parser support is limited and must use plain-text fallback for unsupported structures.                                                                                                           |
| 4.1  | Only part of the approved automatic taste tests existed. Whole-site checks were incorrectly presented as evidence about agent output; approved direction exceptions were not fully implemented.                                                                                         |
| 4.2  | Starter directions and inspector token suggestions exist. Token presence does not prove output compliance. Reference-URL extraction and full approved checks are not proven.                                                                                                            |
| 4.3  | Add and previews exist. Replace UI missing, failed Replace wrote an orphan file, nested-page imports wrong, unknown page fell back to home, re-add overwrote owner edits. Both-site builds/a11y now exercised during audit, but all nine approved component checks still need evidence. |
| 4.4  | Build/quality report exists. Prior 'broken links found' test could match the unrelated accessible-name finding. Focus detection sampled/programmatically focused controls, not full keyboard verification.                                                                              |
| 4.5  | Not run. Draft fictional plumber/theatre briefs were not two real briefs, and requiring new approval before preparing builds was an added gate, not part of the plan. Human blind judgement remains genuinely external.                                                                 |
| 5.1  | Local commit test passed. Parent-repository detection, unsaved content forms and real remote-push/retry need coverage.                                                                                                                                                                  |
| 5.2  | Old local zip was stale relative to newer source. Existing GitHub macOS runners already offered an automated separate-Mac launch route; treating this as entirely Billy's job was wrong.                                                                                                |

## Corrective verification

### Pause checkpoint — 7 Nov 2026, 11:09 AEDT

Billy asked to pause, wrap up, commit and push. This is a checkpoint, **not completion of the plan or permission to release v1**.

The corrective changes include version-checked actions and draft recovery; merge-or-refuse undo; symlink and IPC sender checks; Astro 6 annotation preservation and new-route readiness; agent error handling and conversation parsing; schema-checked content saves; transactional library operations, Replace controls and direction-token adoption; reference-URL measurement; scoped taste/state checks; native-preview tab handling; publishing safeguards; and CI regression tests plus a separate-runner Mac launch job.

Verified before pausing:

| Check                                                                | Result                                                                      |
| -------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| Type checking, lint, formatting, deterministic safety/protocol tests | Pass                                                                        |
| WDLsite editor                                                       | 23/23                                                                       |
| Rudeboycoffee editor                                                 | 23/23, installed Astro 6.4.8                                                |
| WDLsite starter library                                              | 11/11, including actual build, direction/state checks, three widths and axe |
| Rudeboycoffee starter library                                        | 11/11, including actual build, direction/state checks, three widths and axe |
| Rudeboycoffee content                                                | 6/6                                                                         |
| WDLsite content                                                      | Not applicable: this original has no content collections                    |
| WDLsite quality harness                                              | 9/9; the inspected site itself still has 9 failed findings                  |
| Rudeboycoffee quality harness                                        | 9/9; the inspected site itself still has 15 failed findings                 |
| Claude Code through Cauldron                                         | 12/12: real edit, actual MCP use, recorded run and conversation resume      |
| Packaged app smoke launch                                            | Pass; shutdown IPC warnings remain (see below)                              |

The complete two-site matrix finished with exit 0: seven applicable suites, no failed suites. Only disposable copies were edited. An inherited host-site `border-radius: 2px` reset was caught on the second library target and corrected in the copied component styles; the repeated matrix above includes that correction.

Claude authentication is working again. Its agent-test shutdown warning was a renderer run-list refresh racing test exit; the test now completes that IPC round trip before exiting. The subsequent Claude 12/12 log has no IPC-handler error. **The generic smoke run still prints shutdown-time IPC sender-refusal warnings**, despite returning a successful render result; these remain open, rather than being hidden or labelled fixed.

Still open at the pause:

- Finish mapping every approved acceptance criterion to exercised evidence. Passing the listed suites does not prove the entire plan.
- Run the new UI/reference-URL harness on the final checkpoint; complete Before/After, replacement/undo and publishing remote-push/retry coverage.
- Re-run Codex and Hermes on the corrective checkpoint, including conversation continuity; their earlier single-turn results do not establish the revised paths.
- Complete the real-brief Claude-alone/Cauldron comparison and Billy's blind judgement (4.5). The existing fictional draft briefs are not a completed proof, and extra brief approval is not a requirement in the plan.
- Verify the new CI artifact download and separate-Mac launch job after this push. Adding the workflow is not evidence it passed.
- Resolve or explicitly retain the upstream development-dependency advisories below without silently downgrading Forge or forcing major dependency overrides.

Raw local evidence is under the active profile's scratch `cauldron-plan-audit/` directory (`matrix.json`, per-suite logs, and `claude-shutdown-check.log`). Scratch evidence is temporary; the verified results and limitations are recorded here durably.

Evidence and final disposition are updated as fixes are exercised. No unverified item above is complete merely because code was edited.

- Added deterministic regression tests in `scripts/test-core.mjs` and agent protocol fixture tests in `scripts/test-agent.mjs`. Fixtures test failure handling, not real provider execution.
- Fresh copies of originals, not originals themselves, are used under the active profile's scratch directory for the real-site matrix.
- Audit-start real-site matrix: WDL editor 23/23; rudeboy editor FAILED selection. Both libraries 7/7. Rudeboy content 6/6. WDL has no content collections (not a valid positive content-form target). Both quality harnesses ran, and reported actual site failures separately.

## Document and process audit — 7 Nov 2026

Application development remains paused. This audit updates records and investigates adherence to the existing plan. No application, test, dependency or CI implementation was changed during it.

### Findings about the method actually used

- The local Markdown tracker was configured during setup (`docs/agents/issue-tracker.md`), as confirmed by the original setup conversation. Neither workspace had a `.scratch/` ticket directory before this audit. GitHub returned no open or closed issues. The app's `AGENTS.md` contradicted the configured tracker by naming GitHub. `CONTRIBUTING.md` required an issue before work, and that requirement was not followed.
- Eight ADRs and the glossary are present in both workspaces; the copies are byte-identical. Their recorded decisions remain intact. Source inspection and history show relevant research lessons used in saves, shared actions, recovery, agent integration and taste features. Coverage was selective: traceability and phase acceptance were not consistently maintained.
- Phase completion was overstated. Phase 5 code and packaging were implemented while the 4.5 proof remained unrun; earlier phase safety gaps also survived into later work. Phase 4 was explicitly allowed alongside 1–3, so parallel taste work itself is within the plan. No release should be inferred from a working ZIP or green CI.
- The blind-proof run sheet added a mandatory brief-approval step and a requirement for solo builds to fail measured checks. Both additions have been removed. The illustrative drafts are labelled with their missing real-brief provenance.
- UI research still presented settled font/theme/agent choices as open questions. The research README and Obsidian handoff still described a scaffold-only state. These status records have been reconciled; historical technical evidence is retained.
- Current source has an acceptance mismatch: the focus probe tests outline/shadow visibility without the approved 3:1 focus-indicator contrast measurement. Whole-site quality, changed-agent-output taste, scoped component checks and passing harness assertions must retain distinct evidence labels.
- Reference-URL measurement, security corrections, content freshness, component direction adoption and a separate-Mac CI launch are traceable to explicit plan items. The inspected module inventory did not establish a new platform/cloud/BYOK product expansion. Remaining choices such as uniform scales and remote font loading still need provenance/acceptance review. A blanket claim of zero deviations would exceed the evidence.
- I could not verify a causal model-switch explanation. There is no authoritative model-to-commit attribution in the repository. The documented process failures are established independently of that question.

### Tracker and risk handling

Local retrospective finding records now exist under [`.scratch/cauldron-v1/issues/`](../.scratch/cauldron-v1/issues/), with [source pointers](../.scratch/cauldron-v1/spec.md). Every record is `needs-triage`. Their creation date is explicit; they do not imply earlier ticket-driven implementation or authorise resumed development. No accepted requirement has been closed retrospectively.

The earlier protected-file request timed out and made no changes. Billy returned and requested resubmission. That patch succeeded for both `AGENTS.md` files, app `CONTRIBUTING.md`, and both tracker instruction files. They now consistently identify the local Markdown tracker, the app finding records, the agreed source documents and the implementation pause. Finding 00 retains the historical process failures and awaits triage.

| Risk                                              | Evidence and consequence                                                                                                                                                            | Finding                                                                                                                                        |
| ------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| R1 — untracked scope and competing instructions   | No historical ticket frontier. The GitHub/local tracker contradiction has been corrected; ongoing compliance still needs triage and evidence.                                       | [00](../.scratch/cauldron-v1/issues/00-process-and-traceability.md)                                                                            |
| R2 — incomplete write-safety acceptance           | Passing fixtures leave untested paths where losslessness/recovery cannot be claimed.                                                                                                | [01](../.scratch/cauldron-v1/issues/01-core-save-and-recovery-evidence.md)                                                                     |
| R3 — support claims exceed real integration proof | Fresh multi-turn/MCP paths for Codex and Hermes are outstanding.                                                                                                                    | [02](../.scratch/cauldron-v1/issues/02-shared-actions-and-agent-support.md)                                                                    |
| R4 — false completion from partial quality checks | Focus contrast, changed-output scope and all-nine library criteria are incompletely covered.                                                                                        | [06](../.scratch/cauldron-v1/issues/06-approved-taste-criteria.md), [07](../.scratch/cauldron-v1/issues/07-library-nine-checks.md)             |
| R5 — release gate bypass                          | Blind proof has no qualifying outputs/verdict; a CI artifact may otherwise be mistaken for release readiness.                                                                       | [08](../.scratch/cauldron-v1/issues/08-real-brief-blind-proof.md), [09](../.scratch/cauldron-v1/issues/09-publishing-and-mac-release.md)       |
| R6 — build and shutdown debt                      | Smoke sender-refusal warnings and 16 moderate development/build audit findings remain open.                                                                                         | [10](../.scratch/cauldron-v1/issues/10-shutdown-and-build-risks.md)                                                                            |
| R7 — research recommendations promoted into scope | Historical UI suggestions and source-derived palettes need explicit provenance; fixed scales and online fonts are implementation choices, with no separate Billy decision recorded. | [04](../.scratch/cauldron-v1/issues/04-workspace-and-selection-context.md), [06](../.scratch/cauldron-v1/issues/06-approved-taste-criteria.md) |

### Requirement/evidence map

The agreed plan contains 24 numbered items. Every item is mapped below; a row summarises exercised evidence and remaining work, without changing its original acceptance requirement.

| Plan | Requirement                                     | Evidence at checkpoint                                                                  | Remaining verification / limitation                                                                  | Finding                                                                     |
| ---- | ----------------------------------------------- | --------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| 0.1  | Repository, licence, scaffold, automated checks | CI run 42316697137 passed check/build/upload and separate launch.                       | Shutdown warnings remain; tracker instruction contradiction corrected after resubmission.            | [10](../.scratch/cauldron-v1/issues/10-shutdown-and-build-risks.md)         |
| 0.2  | Research and application-code separation        | Original brief, ADRs 0001/0002, manifest and research directories inspected.            | No complete code-authorship/licence audit claimed.                                                   | [00](../.scratch/cauldron-v1/issues/00-process-and-traceability.md)         |
| 0.3  | Named real test-site copies                     | Both copied sites exercised; source originals excluded from test edits.                 | Use fresh copies for every later acceptance run.                                                     | [01](../.scratch/cauldron-v1/issues/01-core-save-and-recovery-evidence.md)  |
| 1.1  | Open and preview                                | 23/23 editor suites cover both installed targets.                                       | Missing-install, failure, timeout and cancellation paths need explicit complete evidence.            | [01](../.scratch/cauldron-v1/issues/01-core-save-and-recovery-evidence.md)  |
| 1.2  | Selection and real-file edits                   | Source selection and text edits exercised on both sites.                                | Broader attribute/style settings need the full path walkthrough.                                     | [01](../.scratch/cauldron-v1/issues/01-core-save-and-recovery-evidence.md)  |
| 1.3  | Version-checked saves and history               | Deterministic stale-write and non-overlapping undo regressions pass.                    | Every save/style/source path must meet the original acceptance scenario.                             | [01](../.scratch/cauldron-v1/issues/01-core-save-and-recovery-evidence.md)  |
| 1.4  | One outside-change rule                         | Safe merge and overlapping refusal exercised.                                           | Keep-mine/use-disk and action-path consistency remain acceptance work.                               | [01](../.scratch/cauldron-v1/issues/01-core-save-and-recovery-evidence.md)  |
| 1.5  | Authored-source preservation                    | Opaque syntax, escaping and byte-exact regression cases pass.                           | Bounded fixtures do not prove arbitrary Astro source preservation.                                   | [01](../.scratch/cauldron-v1/issues/01-core-save-and-recovery-evidence.md)  |
| 1.6  | Crash recovery                                  | Draft storage and restore exercised.                                                    | Actual crash/restart, schema changes and all unsaved-buffer paths need coverage.                     | [01](../.scratch/cauldron-v1/issues/01-core-save-and-recovery-evidence.md)  |
| 1.7  | New page without reload                         | Both editor suites pass the route-readiness scenario.                                   | Keep the two-site regression; no additional page-builder scope is introduced.                        | [01](../.scratch/cauldron-v1/issues/01-core-save-and-recovery-evidence.md)  |
| 1.8  | Preview isolation                               | Live preview lacks Node/editor bridge; symlink regression and sender guards exist.      | Complete hostile frame/channel coverage and resolve shutdown warnings without weakening guards.      | [01](../.scratch/cauldron-v1/issues/01-core-save-and-recovery-evidence.md)  |
| 2.1  | Shared actions                                  | Visual/action/MCP action code and Claude MCP use inspected.                             | Codex/Hermes action connection and all direct-writer paths remain incomplete.                        | [02](../.scratch/cauldron-v1/issues/02-shared-actions-and-agent-support.md) |
| 2.2  | Reviewable runs and Before/After                | Changed-file list, run undo and conflict refusal exercised.                             | Full rendered text/style/removal comparison needs evidence.                                          | [03](../.scratch/cauldron-v1/issues/03-before-after-and-run-undo.md)        |
| 3.1  | Agreed desktop workspace                        | Three columns and minimum size exist; UI harness added.                                 | Final UI harness, selection context, device-width scaling and panel persistence need reconciliation. | [04](../.scratch/cauldron-v1/issues/04-workspace-and-selection-context.md)  |
| 3.2  | Three real agent integrations                   | Claude 12/12 with edit, errors/progress and resume; older single-turn results retained. | Fresh Codex/Hermes continuity and revised-path verification outstanding.                             | [02](../.scratch/cauldron-v1/issues/02-shared-actions-and-agent-support.md) |
| 3.3  | Authenticated localhost outside-agent access    | Claude MCP tools invoked through real adapter; wrong-code protocol test passes.         | Each additional claimed client requires real end-to-end proof.                                       | [02](../.scratch/cauldron-v1/issues/02-shared-actions-and-agent-support.md) |
| 3.4  | Content definitions and fallback                | Rudeboycoffee 6/6; schema hash and quoting regressions pass.                            | Unsupported/nested definitions, fallback and buffer/recovery edges remain bounded.                   | [05](../.scratch/cauldron-v1/issues/05-content-definition-and-fallback.md)  |
| 4.1  | Approved taste rules                            | Rules carried in prompts; negative controls and scoped library checks exist.            | Four-target changed-output scope and exact approved focus contrast are incomplete.                   | [06](../.scratch/cauldron-v1/issues/06-approved-taste-criteria.md)          |
| 4.2  | Approved design directions                      | Seven named references, site-owned tokens and inspector choices exist.                  | Full seven-check/four-target compliance and reference-URL walkthrough remain unverified.             | [06](../.scratch/cauldron-v1/issues/06-approved-taste-criteria.md)          |
| 4.3  | Five editable library components                | Both copies pass 11/11 harness including build, direction/state checks, widths and axe. | All nine per-component criteria, especially exact Replace/undo, still need explicit coverage.        | [07](../.scratch/cauldron-v1/issues/07-library-nine-checks.md)              |
| 4.4  | Measured quality and critique                   | Both harnesses 9/9; site failures separately reported.                                  | Exact keyboard/focus thresholds and feedback-to-agent acceptance remain incomplete.                  | [06](../.scratch/cauldron-v1/issues/06-approved-taste-criteria.md)          |
| 4.5  | Two real-brief blind comparisons                | Preparation documents inspected.                                                        | No four real comparison builds or Billy blind verdict; extra conditions corrected in documentation.  | [08](../.scratch/cauldron-v1/issues/08-real-brief-blind-proof.md)           |
| 5.1  | Explicit publishing through the site repo       | Earlier local commit test and current safeguards inspected.                             | Remote push/retry and complete unsaved-content evidence outstanding.                                 | [09](../.scratch/cauldron-v1/issues/09-publishing-and-mac-release.md)       |
| 5.2  | Unsigned Mac build and separate-Mac launch      | Actual ZIP downloaded/unpacked/launched on fresh macOS CI runner; both jobs succeeded.  | Manual first-launch instructions remain to verify; v1 release still depends on 4.5.                  | [09](../.scratch/cauldron-v1/issues/09-publishing-and-mac-release.md)       |

### Research cache use and authority

- [Original brief](../../cauldron-astro/START-HERE.md) is the first entry in the research read order. The brief itself remains untouched in Obsidian.
- [Agreed plan](../../cauldron-astro/CAULDRON-ASTRO-PLAN.md), [approved taste tests](../../cauldron-astro/design/camillo/taste-tests.md) and [starter set](../../cauldron-astro/design/STARTER-SET.md) govern acceptance and the selected content. The audit verified the 24 numbered requirement lines remain unchanged.
- [ADRs](adr/) and [glossary](../GLOSSARY.md) record settled decisions/vocabulary. Both workspace copies match. No ADR decision or glossary definition was altered during this audit.
- `references/source-manifest.json` contains 12 source records; `references/reference-catalog.json` contains 24 URL records. They preserve collection/licence provenance. They are not a backlog of features to implement.
- Stacki runtime/REA findings inform 1.3–1.8; Sitereal/Ycode findings inform shared actions and run undo; Zeku/Pages CMS/Sveltia findings inform content freshness and recovery; HyperFrames research informs agent lifecycle. These supporting sources must be read for the relevant requirement, with superseded foundation recommendations excluded.
- [UI research](../../cauldron-astro/CAULDRON-UI-RESEARCH.md) and its Mobbin evidence support 3.1 and related screens. Its recorded seven decisions govern; the rest remains labelled research/recommendation. The rejected Open Design and earlier direction/catalogue folders remain excluded.
- Earlier Cauldron OS release/unification notes describe the retired application. The current pivot handoff now links this checkpoint and its open findings; archived app plans were not promoted into the new scope.

### Current CI evidence

Run [42316697137](https://github.com/cre8tivoz/cauldron/actions/runs/42316697137) completed successfully at exact head `82fc6c6cd38f9181332dfc2ef4c0bcddc95f8528`. Both `check` and `separate-mac-launch` succeeded. The latter downloaded the actual uploaded ZIP, unpacked it and launched the app on a fresh macOS runner. This closes the earlier pending automated separate-Mac launch observation. Manual unsigned first-launch checks, remaining acceptance gaps and the 4.5 release gate remain recorded above.

## Dependency audit

`npm audit` reports 16 moderate affected development/build packages, cascading from glob/minimatch through Electron Forge. No high or critical advisory in this audit. npm's suggested force fix downgrades Forge 8 to 7, contrary to the current-versions requirement; no forced downgrade or dependency override has been applied.
