# 02: Verify shared actions and each supported agent path

Status: needs-triage
Type: task
Plan: 2.1; 3.2; 3.3
Blocked by: None for investigation and evidence collection.
Execution: Application development remains paused. This record authorises no implementation.

## Finding

Claude passes 12/12 with real MCP use and resume. The adapter configures the Cauldron MCP connection for Claude; the Codex and Hermes branches do not receive an equivalent configured connection. Earlier single-turn results leave their revised continuity and outside-agent paths unproven. Catalogue text alone does not establish use of shared actions.

## Acceptance criteria from the existing plan

- [ ] Exercise the same version-checked actions through visual controls, the integrated agents and each claimed outside-agent connection.
- [ ] Verify real edits, progress, cancellation, failure reporting and conversation continuity for Claude Code, Codex and Hermes.
- [ ] Claim outside-agent support only for clients actually exercised end to end.
- [ ] Preserve per-site localhost access control and the requirement that Cauldron remains open.

## Evidence and authority

See [the configured effort source](../spec.md), the agreed plan and approved tests it links, and [the checkpoint audit](../../../docs/plan-verification.md). Created during the process audit after checkpoint `82fc6c6`; this is a retrospective finding record, not evidence of earlier ticket-driven development. No requirement is closed by this record.
