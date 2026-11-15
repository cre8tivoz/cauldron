# Contributing

Cauldron is MIT licensed. Small, clear changes are easiest to review.

## Before you start

- Read `AGENTS.md` and the decisions in `docs/adr/`.
- Work is tracked in [Linear](https://linear.app/witchdaddy/project/cauldron-cb61ac6bc02b), the one work list. Only start work that has a Linear issue, and put its WDL ID in your branch name or pull-request title (for example `WDL-170: …`), so Linear can follow the change.
- In the pull request, say what you actually ran to check it.
- [`fablefixes.md`](fablefixes.md) is the 9–10 November 2026 audit. Its items are now Linear issues; it is not the work list.

## Making a change

```bash
npm install
npm run check     # type check, lint and unit tests
npm run smoke     # package the app, open it hidden, confirm it renders
```

Both must pass. CI runs the same commands on pushes to `main` and on pull requests.

## Running the internal E2E harness (`WDL-238`, `WDL-253`)

Production packages (`npm run package` / `npm run make`) exclude the internal E2E test harness (`src/main/e2e.ts`, `harnessApi`, and the `CAULDRON_*_TEST` switches). It is enabled in development (`npm start`), or can be opted into when packaging for full-app E2E verification:

```bash
CAULDRON_BUNDLE_E2E=1 npm run package
```

The Claude protocol proof suite (`CAULDRON_CLAUDE_TEST=1`) reads these optional environment settings (and creates temporary defaults when omitted for log/state/fixture paths):

- `CAULDRON_AGENT_ARGS_LOG`: JSONL path recording exact spawned agent CLI arguments (used to inspect briefs and `--resume` flags).
- `CAULDRON_STANDIN_STATE`: JSON file storing state across invocations of `scripts/fixtures/claude-standin.mjs`.
- `CAULDRON_CLAUDE_STANDIN_DIR`: Directory containing an executable `claude` wrapper that runs `scripts/fixtures/claude-standin.mjs`.
- `CAULDRON_CLAUDE_FIXTURE_SITE`: Separate disposable Astro site copy used for fixture provider runs so sessions never collide with real CLI runs.

## Style

- TypeScript, strict. Prefer plain functions and small files over abstractions.
- Comments say why, not what.
- Keep UI text in plain Australian English, no jargon.
- Don't reformat files you're not changing.

## Commits

One purpose per commit, imperative subject line, no more than about 72 characters. Explain why in the body when it isn't obvious.

This repository ships a tracked pre-commit hook in `.githooks/`. It is not installed automatically; run this once in each checkout you work in:

```bash
npm run hooks:install
```

The hook checks the Node version against `.nvmrc` and runs `npm run check` and `npm run smoke`, blocking the commit if either fails. `git commit --no-verify` bypasses it and must not be used to commit failing work.
