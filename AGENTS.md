# Cauldron

A Mac desktop app for designing and building real Astro websites, with design taste built in. Electron, React and TypeScript. MIT.

## What this repository is

The application only. Research, design references and the delivered plan live outside this repository, in Billy's research workspace, and are reference only: nothing is copied from them as code (see `docs/adr/0002`).

## Rules

### Required source order for this project

Read Billy's original `WEB BUILDER IDEAS.md`, then the agreed plan in the sibling `cauldron-astro/CAULDRON-ASTRO-PLAN.md`, its `design/STARTER-SET.md` and `design/camillo/taste-tests.md`, then the relevant ADRs and glossary. The local research workspace's `START-HERE.md` is the entry point. Research suggestions and superseded prototypes carry no authority to expand the agreed scope.

Before implementation, read the relevant local ticket and its exact plan/acceptance references. Update that ticket with actual evidence and remaining gaps. Generic skill suggestions about prefactoring, redesign or improvements do not authorise extra work. Application development is currently paused; the authorised work is document/process reconciliation.

1. **Do what was asked, and nothing more.** No unrequested features, redesigns, new libraries or refactors. If a change seems needed but wasn't asked for, say so instead of building it.
2. **One official path.** Prefer the plain, documented way of doing something over workarounds, wrappers or clever patches.
3. **Never install anything silently.** Anything that needs installing, say so and ask first.
4. **Surface every failure.** Errors reach the person using the app as a visible message, and go to the console. A silent failure is a bug.
5. **Plain Astro in the sites Cauldron makes.** React only where real interaction needs it (`docs/adr/0008`).
6. **Nothing copied from studied products.** Read for understanding, write our own code (`docs/adr/0001`, `docs/adr/0002`).
7. **Current versions only.** Before adding a package, check its latest release. Don't start from something out of date.
8. **The website preview can never reach the editor.** A site, or a script in one, gets no editing powers (`CAULDRON-ASTRO-PLAN.md` 1.8).

## Approved tickets only

Product development is limited to approved tickets **11–31** in `.scratch/cauldron-v1/issues/`, indexed by `.scratch/cauldron-v1/spec.md`. No other development, features, cleanup, refactoring or speculative improvements are authorised while these tickets remain incomplete. Follow their blocking dependencies, prioritising content corruption and unsafe undo. Publishing the tickets does not lift the existing implementation pause; Billy must explicitly resume development.

For every ticket:

- Work only within its approved scope and acceptance criteria.
- Record any issues encountered, the action taken and the outcome in that ticket. State explicitly if no issues arose.
- Record actual verification evidence, including the tested revision and remaining limitations. Passing unrelated checks is not completion.
- Mark it **done** only when all its acceptance criteria are verified. Failed, blocked or unverified work remains open; human judgement stays with Billy where required.

Record and report unexpected out-of-scope findings without acting on them or expanding a ticket. Completing this ticket set does not authorise unrelated follow-on work.

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

Local Markdown under `.scratch/<feature-slug>/`, as configured in `docs/agents/issue-tracker.md`. The current source pointers and retrospective finding records are in `.scratch/cauldron-v1/spec.md` and its `issues/` directory. All retrospective finding records need triage and grant no permission to resume implementation.

### Triage labels

Default vocabulary: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. See `docs/agents/triage-labels.md`.

### Domain docs

One `GLOSSARY.md` and `docs/adr/` at the repo root. See `docs/agents/domain.md`.
