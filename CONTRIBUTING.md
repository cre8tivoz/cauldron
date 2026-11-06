# Contributing

Cauldron is MIT licensed. Small, clear changes are easiest to review.

## Before you start

- Read `AGENTS.md` and the decisions in `docs/adr/`.
- Check the issue you're working from. If there isn't one, open one first.

## Making a change

```bash
npm install
npm run check     # type check and lint
npm run smoke     # package the app, open it hidden, confirm it renders
```

Both must pass. CI runs the same commands on every push and pull request.

## Style

- TypeScript, strict. Prefer plain functions and small files over abstractions.
- Comments say why, not what.
- Keep UI text in plain Australian English, no jargon.
- Don't reformat files you're not changing.

## Commits

One purpose per commit, imperative subject line, no more than about 72 characters. Explain why in the body when it isn't obvious.
