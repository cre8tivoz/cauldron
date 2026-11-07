# 20: Finish and prove Hermes support

**What to build:** Hermes has the configured Cauldron action connection and completes the same real editing and conversation workflow.

**Blocked by:** [18: Prove Claude works through the repaired app](18-prove-claude-works-through-the-repaired-app.md)

**Status:** done

**Parent findings:** [02: shared actions and agent support](02-shared-actions-and-agent-support.md)

**Plan:** 3.2; 3.3

**Execution:** Billy approved ticket publication, including safeguard 31. Application development remains paused until explicitly resumed. Readiness does not start work.

## Acceptance criteria

- [x] Prove a real in-app edit and authenticated outside connection using the shared actions.
- [x] Exercise conversation continuation, selected-element context, progress, cancellation and genuine failure reporting.
- [x] Retain the agreed approval-respecting launch mode and record design/taste context plus safe run undo.
- [x] Claim support only for the real paths actually exercised.
- [x] For any confirmed bug fixed here, retain a permanent regression test that fails before the fix and passes afterwards.
- [x] Record the exercised user-path results and exact revision; satisfy the existing project checks before committing. Distinguish failures, blocked work and unverified behaviour.

## Sources and boundaries

- [Agreed development plan](../../../../cauldron-astro/CAULDRON-ASTRO-PLAN.md): the numbered requirements above.
- [Whole-repository review](../../../docs/cauldron-code-review.md): evidence of the relevant faults and remaining acceptance work.
- [Retrospective](../../../docs/cauldron-retro.md): regression-test and evidence guidance; other environment changes require their own approval.

Use the existing implementation and tracker. Preserve the original sites, settled decisions and accepted scope. No speculative restructuring, additional features or weaker assertions. Keep parent finding records unchanged; completion evidence belongs with this child ticket.

## Comments

Ticket breakdown approved by Billy through the to-tickets approval form. Implementation has not started.

### Completion record — 7 Nov 2026 (batch 2)

**Revision:** batch 2 commit `fix: batch 2, one set of editing actions and all three agents`, built on `28f9135`. Node 26.13.0. Work by subagents in separate worktrees; merged, re-run and verified by the orchestrator on the final merged code.

**Issues found and fixed:**

1. Hermes was started with no profile and no connection. Fix (`src/main/agent.ts`): Cauldron runs `hermes -p cauldron chat -q … --format stream-json -Q` (`--resume <id>` to continue). The `cauldron` Hermes profile was created by the orchestrator with Billy's approval, cloned from the claudia profile (cloud model), with one connection entry that reads `${CAULDRON_MCP_URL}` and `${CAULDRON_MCP_CODE}`.
2. The connection never reached Hermes (reproduced): Hermes's shared gateway reads a profile's values only from that profile's `.env`, never from the process that launches it (`profile's .env or secret source` refusal in `~/.hermes/profiles/cauldron/logs/agent.log`). Fix: Cauldron writes those two lines into `~/.hermes/profiles/cauldron/.env` when a site's connection starts and before a Hermes job, replacing only those two lines, never creating the profile.
3. The gateway rereads that file on a 30-second timer (picked up 78 s into one run, after the job had stalled). Fix: a Hermes job sent within 90 s of a connection change shows "Waiting for Hermes to connect to this site…" and starts once it has been picked up; cancel works during the wait.

**Regression tests:** `scripts/test-agent.mjs`: Hermes runs the cauldron profile with the site connection (red: `'chat' !== '-p'`); continues with `--resume`; a failing Hermes run is an error; the connection is written to the profile file with other settings kept, not rewritten when unchanged, no profile created when missing, and a fresh change makes Hermes wait (red against the previous `agent.ts`: the file was never written). Fixture runs use a throwaway file, never the real profile.

**Verification evidence:** packaged app, fresh WDLsite copies, real installed Hermes 0.22.7 on the cauldron profile, all re-run on the final code:

- `CAULDRON_HERMES_TEST=1`: **13/13**. Waited for the connection, called `read_selection` then `edit_element_text` on `src/layouts/Base.astro:45`, Cauldron reported the edit as successful, the file changed, the run listed it and whole-run undo restored it.
- `cancel`: **7/7**, no Hermes process left. `fail` (a failing `hermes` first on PATH): **5/5**.
- `CAULDRON_AGENT_TEST` with Hermes: **11/11**, including the resumed job remembering the earlier request (one run first failed because the test joined streamed reply pieces with line breaks; the test was fixed, not the product).
- Launch mode is `chat -q` with stream-json; no `--yolo` or auto-approve flags.

**Limitations:** the 90-second wait is a fixed allowance based on the gateway's 30-second timer and one observed 78-second pickup, not a confirmation from Hermes. Hermes still has its own file tools; edits it makes with them are refused by run undo as not attributable (batch 1 safety, kept).
