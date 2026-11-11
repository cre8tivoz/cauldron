# Cauldron — current handoff

> **Historical record — not current.** Kept for provenance only. Status claims in this file ("done", "verified", "complete") were true at best when written and several have since been found wrong. The current state and work list is the [Cauldron Linear project](https://linear.app/witchdaddy/project/cauldron-cb61ac6bc02b); the rules and scope are in [`AGENTS.md`](../../AGENTS.md).

## State

- Base: `c33fc6a` (batch 3a), pushed. Done: 11, batch 1 (31,12–16), batch 2 (17–21), 24 and 25. Ticket 23 remains in progress.
- Latest ticket 23 investigation: one real packaged-app feedback run passed 12/12, with a real file edit through Cauldron's tools and measured button contrast improving from 4.2:1 to 16.8:1.
- This proves the path can work, not that earlier intermittent failures were fixed. No launch-path repair was made. Root cause remains unknown; blaming upstream Codex is not established.
- Added an off-by-default diagnostic log in `src/main/mcp.ts`, enabled only by `CAULDRON_MCP_LOG`. Evidence: `~/.hermes/profiles/claudia/cache/scratch/b23finish/`.
- Remaining: 23, then 27/28 (Codex alone versus Codex through Cauldron), 22, 26, 29 (Billy's blind judgement), 30. Future batches need approval.

## Approved approach

Billy approved the lean completion checklist and work on ticket 23 only. One subagent at a time, sequentially in one checkout. Keep meaningful behavioural regression tests and real user-path evidence. Do not repeat unrelated suites or start a test-harness rewrite. Main model reviews briefly and owns commits. Real agent runs use Codex with explicit small budgets.

## Product boundaries

User opens only Cauldron and uses its built-in agent chat. Cauldron starts their installed agent in the background. BYOK and reverse control from other apps are post-v1. Professional-grade, free and open-source, not enterprise process.

## Bloat and memory

The large e2e harness ships as a separate approximately 105 KB bundle, loaded only in test mode. This is not proof of a runtime RAM problem. Actual app memory use remains unmeasured. Do not claim otherwise or start an unapproved cleanup.
