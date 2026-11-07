# 05: Complete content-form and fallback acceptance coverage

Status: needs-triage
Type: task
Plan: 3.4; 1.3–1.6
Blocked by: None for investigation and evidence collection.
Execution: Application development remains paused. This record authorises no implementation.

## Finding

Rudeboycoffee content passes 6/6; WDLsite has no content collections. Schema hashes and safe quoting were added. Parser coverage for unsupported/nested definitions and plain-text fallback remains bounded.

## Acceptance criteria from the existing plan

- [ ] Use the site's own content definitions to populate forms.
- [ ] Warn or refuse when the definition changes before saving.
- [ ] Offer plain-text editing for unsupported structures while preserving unrelated authored data.
- [ ] Exercise unsaved content recovery and publishing refusal.

## Evidence and authority

See [the configured effort source](../spec.md), the agreed plan and approved tests it links, and [the checkpoint audit](../../../docs/plan-verification.md). Created during the process audit after checkpoint `82fc6c6`; this is a retrospective finding record, not evidence of earlier ticket-driven development. No requirement is closed by this record.
