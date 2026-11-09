# Cauldron

A Mac desktop app for designing and building real Astro websites, with design taste built in. Electron, React and TypeScript. MIT.

## Rescue handoff — current entry point (8 Nov 2026)

Read `RESCUE-PLAN.md` before implementation or completion claims. Billy requested this consolidated, prioritised handoff after the delivered app failed his tinydogs workflow. It supplies the current scope amendments, known failure, whole-product acceptance checklist and execution order. The older pause/batch/ticket status sections below are historical where they conflict with that plan; they are not proof of readiness or permission to omit core functionality. Preserve safety rules and work only under Billy's actual implementation authorisation. This documentation handoff makes no application repair or release-ready claim.

## Review findings & fix plan — UNFINISHED (added 9 November 2026)

`RESCUE-PLAN.md` section 0 records two code-review rounds and two Jev assessments over the rescue work and the
"Gemini upgrades" round, with a prioritised fix plan. **Nothing in it is done.** Read it before claiming any
phase complete.

The headline items: the "Deploy to Cloudflare Pages" button does not deploy (it shows a live URL that is not
live); the "100% Verified" claim is unsupported by any test; and the imagery tray is a static list rather than
the advertised Unsplash/Pexels APIs. The editorial tools (starter sites, catalogue, outline, asset tray,
static export) are real and work.

## What this repository is

The application only. Research, design references and the delivered plan live outside this repository, in Billy's research workspace, and are reference only: nothing is copied from them as code (see `docs/adr/0002`).

## Rules

### Required source order for this project

Read Billy's original `WEB BUILDER IDEAS.md`, then the agreed plan in the sibling `cauldron-astro/CAULDRON-ASTRO-PLAN.md`, its `design/STARTER-SET.md` and `design/camillo/taste-tests.md`, then the relevant ADRs and glossary. The local research workspace's `START-HERE.md` is the entry point. Research suggestions and superseded prototypes carry no authority to expand the agreed scope.

Before implementation, read the relevant local ticket and its exact plan/acceptance references. Update that ticket with actual evidence and remaining gaps. Generic skill suggestions about prefactoring, redesign or improvements do not authorise extra work.

### Current state and authorisation

- Tickets **11–28 and 31** are recorded as done. **Billy has accepted the reviewed PeNtA iteration as the design win. That judgement is closed:** preserve earlier comparison results as history, but do not require another Moretti win, another blind judgement or another site generation. Ticket **29** remains open only for the bounded technical finish-up below; ticket **30** still requires final distribution and independent-Mac verification, which must not be claimed without evidence.
- The supplied app icon and startup splash are integrated. The ten enriched directions include **Componine, Niki Studio and Henry From Online** (`df28b3f`). The recovered Claude-through-Cauldron PeNtA build and its three reviewed corrections are the approved existing output; mobile-navigation and overlap safeguards are in standard guidance (`79aef82`). Preserve it; no redesign.
- **Billy's current authorisation: one finish-up batch for tickets 29 and 30, with one subagent implementing/testing while Claudia orchestrates and reviews.** Correct demonstrated checker false positives (screen-reader helpers, ordinary arrow symbols, descendant hover feedback and SVG wordmark hierarchy) with focused behavioural regression tests; fix genuine interaction-state defects, including selected controls and disabled gallery filters where confirmed; carry reusable state guidance into standard Cauldron work. Do not weaken accessibility thresholds, suppress real failures or tune assertions merely to pass this site.
- Recheck the existing PeNtA output once after fixes, including gallery filtering, contact behaviour and relevant mobile/keyboard paths. Record actual findings, tested revision and remaining limitations. The old 65-row report is historical, includes repeated measurements, and is not evidence of 65 current distinct bugs. No new generation or paid agent runs are needed for this batch.
- Prepare and verify the final unsigned Mac distribution and concise download/first-launch instructions. A local package or same-Mac smoke test does not prove first launch on a second Mac. Leave that requirement explicitly pending until Billy or a tester supplies real evidence; do not fake it or reopen the accepted design decision.
- Use **one cheaper subagent**, sequentially in the current checkout. It owns implementation, focused red/green tests, real-path proof and a short draft record; Claudia owns this rules file, targeted diff/evidence review, ticket completion decisions and authorised commits/pushes. No separate review-agent chain, unrelated repeated suites, oversized harnesses, new features, libraries, installs or refactors. No agent configuration or credential changes. Subagents must not edit this file. This explicit authorisation resumes only the finish-up work; the implementation-pause wording below does not block this batch.
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
