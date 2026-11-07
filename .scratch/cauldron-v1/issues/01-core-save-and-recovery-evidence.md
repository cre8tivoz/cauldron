# 01: Complete the core editor safety evidence

Status: needs-triage
Type: task
Plan: 1.1–1.8
Blocked by: None for investigation and evidence collection.
Execution: Application development remains paused. This record authorises no implementation.

## Finding

Both editor suites pass 23/23 and deterministic regressions cover stale writes, non-overlapping undo, symlink escape and opaque Astro syntax. These assertions leave broader save/style/source, conflict-choice and actual crash/restart coverage incomplete.

## Acceptance criteria from the existing plan

- [ ] Exercise the original style-edit / unrelated outside edit / Undo acceptance scenario across every applicable save path.
- [ ] Verify merge-or-refuse and explicit keep-mine/use-disk choices without losing either draft.
- [ ] Exercise actual crash/restart recovery with source and schema provenance.
- [ ] Retain proof that unsupported source stays byte-for-byte intact and that the preview cannot invoke editing powers.

## Evidence and authority

See [the configured effort source](../spec.md), the agreed plan and approved tests it links, and [the checkpoint audit](../../../docs/plan-verification.md). Created during the process audit after checkpoint `82fc6c6`; this is a retrospective finding record, not evidence of earlier ticket-driven development. No requirement is closed by this record.
