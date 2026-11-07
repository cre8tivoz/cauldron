# 10: Track the remaining shutdown and dependency risks

Status: needs-triage
Type: task
Plan: 0.1; 5.2; AGENTS.md failure reporting
Blocked by: None for investigation and evidence collection.
Execution: Application development remains paused. This record authorises no implementation.

## Finding

The Claude test drains its renderer IPC before exit and its recorded 12/12 log is clean. Generic smoke still prints IPC sender-refusal warnings during shutdown. The dependency audit reports 16 moderate development/build-package findings through glob/minimatch and Forge; the production-only audit reports zero. No forced downgrade or major override has been authorised.

## Acceptance criteria from the existing plan

- [ ] Retain the shutdown warning as open until reproduced and verified through the affected path.
- [ ] Keep editing IPC sender checks intact.
- [ ] Record the upstream advisory chain and assess an official compatible fix before any dependency change.
- [ ] Keep runtime audit results distinct from development/build exposure.

## Evidence and authority

See [the configured effort source](../spec.md), the agreed plan and approved tests it links, and [the checkpoint audit](../../../docs/plan-verification.md). Created during the process audit after checkpoint `82fc6c6`; this is a retrospective finding record, not evidence of earlier ticket-driven development. No requirement is closed by this record.
