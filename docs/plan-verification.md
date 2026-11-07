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

Current starting point d67ed5d: remote CI 42252292115 succeeded. Earlier claims that Phase 2 and the close fix had green CI were wrong; their logs show formatting failures. No historical failed run is deleted or relabelled.

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

## Dependency audit

`npm audit` reports 16 moderate affected development/build packages, cascading from glob/minimatch through Electron Forge. No high or critical advisory in this audit. npm's suggested force fix downgrades Forge 8 to 7, contrary to the current-versions requirement; no forced downgrade or dependency override has been applied.
