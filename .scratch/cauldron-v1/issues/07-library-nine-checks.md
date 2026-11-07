# 07: Complete every approved component-library check

Status: needs-triage
Type: task
Plan: 4.3; ADR 0007; ADR 0008; taste-tests.md 4.3
Blocked by: None for investigation and evidence collection.
Execution: Application development remains paused. This record authorises no implementation.

## Finding

Both site copies pass the expanded 11/11 library harness, including builds, direction/state checks, widths and axe. That count does not establish all nine approved per-component checks: exact touched-file boundaries, new-warning comparison, built client-script accounting, keyboard operation and same-category Replace followed by exact undo still need explicit evidence.

## Acceptance criteria from the existing plan

- [ ] Exercise each of the five selected components in both real-site copies against all nine approved checks.
- [ ] Keep added pieces editable in the site and plain Astro unless real interaction requires otherwise.
- [ ] Record source, licence and code-allowed status without inventing provenance.
- [ ] Replace a component within the same category, undo, and compare the exact previous files.

## Evidence and authority

See [the configured effort source](../spec.md), the agreed plan and approved tests it links, and [the checkpoint audit](../../../docs/plan-verification.md). Created during the process audit after checkpoint `82fc6c6`; this is a retrospective finding record, not evidence of earlier ticket-driven development. No requirement is closed by this record.
