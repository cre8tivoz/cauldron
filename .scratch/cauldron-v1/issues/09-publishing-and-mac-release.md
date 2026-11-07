# 09: Finish publishing and Mac acceptance evidence

Status: needs-triage
Type: task
Plan: 5.1; 5.2
Blocked by: None for investigation and evidence collection.
Execution: Application development remains paused. This record authorises no implementation.

## Finding

Publishing has local throwaway-repository evidence and additional safeguards. Remote-push/retry and unsaved-content coverage need completion. CI run 42316697137 at checkpoint 82fc6c6 successfully made/uploaded a Mac zip and downloaded/unzipped/launched it on a fresh macOS runner; this verifies the automated separate-machine launch slice. Manual downloaded-app/Gatekeeper instructions and the full user path remain separate checks.

## Acceptance criteria from the existing plan

- [ ] Show changed files and publish only after the user asks, through the opened site's own Git repository.
- [ ] Refuse publishing while visual or content edits remain unsaved.
- [ ] Exercise real remote-push/retry in an isolated test remote without touching production sites.
- [ ] Preserve CI launch evidence and verify unsigned first-launch instructions.
- [ ] Keep release blocked by the agreed 4.5 proof.

## Evidence and authority

See [the configured effort source](../spec.md), the agreed plan and approved tests it links, and [the checkpoint audit](../../../docs/plan-verification.md). Created during the process audit after checkpoint `82fc6c6`; this is a retrospective finding record, not evidence of earlier ticket-driven development. No requirement is closed by this record.
