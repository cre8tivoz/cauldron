# Cauldron

A Mac desktop app for designing and building real Astro websites, with design taste built in. Electron, React and TypeScript. MIT.

## What this repository is

The application only. Research, design references and the delivered plan live outside this repository, in Billy's research workspace, and are reference only: nothing is copied from them as code (see `docs/adr/0002`).

## Rules

1. **Do what was asked, and nothing more.** No unrequested features, redesigns, new libraries or refactors. If a change seems needed but wasn't asked for, say so instead of building it.
2. **One official path.** Prefer the plain, documented way of doing something over workarounds, wrappers or clever patches.
3. **Never install anything silently.** Anything that needs installing, say so and ask first.
4. **Surface every failure.** Errors reach the person using the app as a visible message, and go to the console. A silent failure is a bug.
5. **Plain Astro in the sites Cauldron makes.** React only where real interaction needs it (`docs/adr/0008`).
6. **Nothing copied from studied products.** Read for understanding, write our own code (`docs/adr/0001`, `docs/adr/0002`).
7. **Current versions only.** Before adding a package, check its latest release. Don't start from something out of date.
8. **The website preview can never reach the editor.** A site, or a script in one, gets no editing powers (`CAULDRON-ASTRO-PLAN.md` 1.8).

## Decisions

Recorded in `docs/adr/`. Read them before proposing anything that contradicts one. Vocabulary is fixed in `GLOSSARY.md`.

## Working here

```bash
npm install          # Node 26.13 (.nvmrc), npm 12
npm start            # run the app in development
npm run check        # type check and lint — must pass
npm run smoke        # package, open hidden, confirm the interface renders
```

Run `npm run check` and `npm run smoke` before every commit. Both also run in CI, and CI must be green.

## Agent skills

### Issue tracker

GitHub issues on `cre8tivoz/cauldron`. Specs and working notes live as local markdown under `.scratch/<feature-slug>/`. See `docs/agents/issue-tracker.md`.

### Triage labels

Default vocabulary: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. See `docs/agents/triage-labels.md`.

### Domain docs

One `GLOSSARY.md` and `docs/adr/` at the repo root. See `docs/agents/domain.md`.
