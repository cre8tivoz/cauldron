# Contributing

Cauldron is MIT licensed. Small, clear changes are easiest to review.

## Before you start

- Read `AGENTS.md` and the decisions in `docs/adr/`.
- Check [`fablefixes.md`](fablefixes.md), the one work list. When you fix an item, update its status there in the same change and say what you actually ran.

## Making a change

```bash
npm install
npm run check     # type check, lint and unit tests
npm run smoke     # package the app, open it hidden, confirm it renders
```

Both must pass. CI runs the same commands on pushes to `main` and on pull requests.

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
