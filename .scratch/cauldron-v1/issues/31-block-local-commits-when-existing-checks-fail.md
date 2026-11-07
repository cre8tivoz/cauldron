# 31: Block local commits when existing checks fail

**What to build:** An explicitly installed local commit check runs the existing required commands and stops a failing commit without changing approval settings.

**Blocked by:** None (can start once implementation is authorised).

**Status:** done

**Parent findings:** [00: process and traceability](00-process-and-traceability.md)

**Plan:** Approved retrospective safeguard 31; retro recommendation 4

**Execution:** Billy approved ticket publication, including safeguard 31, then authorised it in batch 1 on 7 Nov 2026.

## Acceptance criteria

- [x] Use the existing project check commands and keep the packaged launch gate required by the project.
- [x] Prove a deliberate failing check blocks the local commit path and a passing check permits it.
- [x] Verify actual installation in this checkout; a tracked hook file alone is not proof.
- [x] Retain the existing CI and approval settings. Billy separately approved this workflow safeguard when approving ticket publication; other environment changes still require their own approval.
- [x] For any confirmed bug fixed here, retain a permanent regression test that fails before the fix and passes afterwards.
- [x] Record the exercised user-path results and exact revision; satisfy the existing project checks before committing. Distinguish failures, blocked work and unverified behaviour.

## Sources and boundaries

- [Approved retrospective proposal](../../../docs/cauldron-retro.md): recommendation 4. This ticket adopts only the commit safeguard Billy approved.

Use the existing implementation and tracker. Preserve the original sites, settled decisions and accepted scope. No speculative restructuring, additional features or weaker assertions. Keep parent finding records unchanged; completion evidence belongs with this child ticket.

## Comments

Ticket breakdown approved by Billy through the to-tickets approval form.

### Completion record — 7 Nov 2026 (batch 1)

**Revision:** batch 1 commit `fix: batch 1, protect people's work`, built on `e67dad9`. Node 26.13.0. Developed by a subagent in a separate worktree; verified and installed by the orchestrator.

**What was built:** `.githooks/pre-commit` runs `npm run check` then `npm run smoke` (the packaged launch gate) and blocks the commit with `Commit blocked: <command> failed` if either fails. It checks Node against `.nvmrc` (switching through nvm if needed) and fails loudly when the version is wrong, never passing silently. `scripts/install-hooks.mjs` (`npm run hooks:install`) installs it explicitly per checkout by setting `core.hooksPath`; nothing installs it automatically. `CONTRIBUTING.md` says to install it once and not to use `--no-verify` for failing work. `.github/workflows/ci.yml` and approval settings are unchanged.

**Issues:** a formatting failure in the installer was fixed with `oxfmt`. No product bugs, so no regression test applies.

**Verification evidence:**

- Throwaway repositories (subagent): a failing check blocked the commit (exit 1, commit count unchanged); a passing check committed; a failing smoke and a wrong Node version both blocked.
- This checkout (orchestrator): `npm run hooks:install`, then `git config --get core.hooksPath` returned `.githooks`. A deliberately broken staged file was refused: `error TS2322 … Commit blocked: npm run check failed`, exit 1, HEAD unchanged. The temporary file was removed.
- The passing path in this checkout: the batch 1 commit itself went through the hook (`npm run check` and `npm run smoke` both passed) before it was created.

**Limitations:** `git commit --no-verify` can still bypass the hook; this is documented. The hook adds a packaging run (roughly 1–2 minutes) to every commit.
