# Cauldron

A Mac desktop app for designing and building real Astro websites, with design taste built in. Electron, React and TypeScript. MIT.

## What this repository is

The application only. Research, design references and the delivered plan live outside this repository, in Billy's research workspace, and are reference only: nothing is copied from them as code (see `docs/adr/0002`).

## Rules

### Required source order for this project

Read Billy's original `WEB BUILDER IDEAS.md`, then the agreed plan in the sibling `cauldron-astro/CAULDRON-ASTRO-PLAN.md`, its `design/STARTER-SET.md` and `design/camillo/taste-tests.md`, then the relevant ADRs and glossary. The local research workspace's `START-HERE.md` is the entry point. Research suggestions and superseded prototypes carry no authority to expand the agreed scope.

Before implementation, read the relevant local ticket and its exact plan/acceptance references. Update that ticket with actual evidence and remaining gaps. Generic skill suggestions about prefactoring, redesign or improvements do not authorise extra work.

### Current state and authorisation

- Tickets **11–28 and 31** are recorded as done. Ticket **29** remains open: both blind rounds favoured Codex alone for Moretti Estate and Cauldron for PeNtA; measured quality failures also remain. Ticket **30** is blocked by that release gate and still requires final Mac download/first-launch verification. Do not waive either gate without Billy's explicit decision.
- The supplied app icon and startup splash are integrated. The ten design directions include **Componine, Niki Studio and Henry From Online**; all ten now carry source-led layout, typography, surface, interaction-state and mobile guidance into the saved design document and agent prompt (`df28b3f`). No generated-site improvement is claimed from those code changes alone.
- **Billy's current instruction: update this file first, then run ONE PeNtA site build through Cauldron using the enriched guidance. Do not rebuild Moretti Estate or either standalone baseline.** Preserve earlier outputs and verdicts. Record the selected direction, actual changed files, built routes and unchanged quality measurements; leave the output unedited for Billy's review. No automatic retries or extra generation rounds.
- Use **one cheaper subagent**, working sequentially in the current checkout. It implements, runs focused tests and real-app proof, and drafts a concise record; Claudia reviews the relevant changes and evidence and owns authorised commits/pushes. Preserve meaningful checks without repeating unrelated suites or adding oversized test machinery.
- The PeNtA generation uses the existing signed-in **Claude Code** setup, as Billy specifically requested for this test to compare how different agents handle the enriched guidance. This overrides the earlier Codex choice for this run only. No local backends, alternate providers, invented/invalid models, configuration changes or credential changes. One real generation run maximum; if the provider refuses it, preserve the error and do not substitute another setup.
- Work on fresh disposable site copies and fresh test user-data only. Never edit original sites or foreground desktop apps without permission. Exclude Finder `.DS_Store` files from commits.
- Cauldron is an Astro site builder driven from its own built-in agent chat. Reverse control from other agent apps and BYOK are **outside v1**. The Witch Daddy Labs website subpage is not part of this work.

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
