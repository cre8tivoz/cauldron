# Cauldron

A Mac desktop app for designing and building real Astro websites, with design taste built in. Electron, React and TypeScript. MIT.

**This file is the entry point.** If another document disagrees with this file or with Linear, that document is out of date.

## The three live documents

| Document                                                                                     | What it is for                                                     |
| -------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| `AGENTS.md` (this file)                                                                      | What the product is, what is settled, the rules, how to work here. |
| [Linear: Cauldron](https://linear.app/witchdaddy/project/cauldron-cb61ac6bc02b)               | **The one work list.** Open, in-progress and done work lives there. |
| [`README.md`](README.md)                                                                     | The short public description and how to run the app.               |

Supporting reference, still current: [`GLOSSARY.md`](GLOSSARY.md), the decisions in [`docs/adr/`](docs/adr/), [`CONTRIBUTING.md`](CONTRIBUTING.md) and [`REFERENCE-MATERIAL.md`](REFERENCE-MATERIAL.md).

Everything else is **history** (see "History" at the end). Read it for background if you need it. Do not treat any "done", "verified" or "complete" in it as true today.

## The job

Deliver a working Mac app. A person opens Cauldron, creates or opens a site, asks the built-in agent to work, sees the result, and can edit, review, undo and publish it. They must not need a terminal or a separate agent app to keep things going.

The site stays ordinary Astro files in the person's own folder, buildable without Cauldron.

**Done means it works through the delivered app.** Passing tests, a tidy document or a good-looking demo is not that.

## Where things honestly stand (10 November 2026)

- The foundations are real: project creation and opening, safe versioned saves, crash recovery, the agent wiring for Claude Code, Codex and Hermes, quality checks, and Git publishing.
- A full audit on 9 November found 80 problems, including screens that said untrue things. They are now Linear issues (see the mapping in [`fablefixes.md`](fablefixes.md)).
- Type check, lint and the three unit suites pass. CI on `main` is green.
- **Not proven:** opening the downloaded app on a second Mac by hand (Gatekeeper), publishing to a real hosted Git account, and a full walkthrough of every screen in the packaged app after the audit. Do not claim these without fresh evidence.

## What is settled — do not reopen

- **In v1:** new site, open existing, a persistent recent list, shared dependency storage. The built-in chat drives installed Claude Code, Codex and Hermes in the background.
- **Outside v1:** other agent apps controlling Cauldron from outside, bring-your-own API keys, Windows and Linux, a cloud platform. Real one-click Cloudflare deploy is parked until Billy authorises it separately.
- **Design judgement is closed.** Billy accepted the reviewed PeNtA iteration. No further blind comparisons or regeneration are required.
- **Ten design directions**, including Componine, Niki Studio and Henry From Online. Keep them.
- **App look:** Source Sans 3, Coral, system light/dark. Agent on the left, preview in the centre, inspector on the right. Minimum window 1280 × 800. The websites it makes must still work at phone, tablet and desktop widths.
- The app icon and startup splash are final.

## Rules

1. **Do what was asked, and nothing more.** No unrequested features, redesigns, new libraries or refactors. If a change seems needed but wasn't asked for, say so instead of building it.
2. **One official path.** Prefer the plain, documented way of doing something over workarounds, wrappers or clever patches.
3. **Never install anything silently.** Anything that needs installing, say so and ask first.
4. **Surface every failure.** Errors reach the person using the app as a visible message, and go to the console. A silent failure is a bug.
5. **Plain Astro in the sites Cauldron makes.** React only where real interaction needs it (`docs/adr/0008`).
6. **Nothing copied from studied products.** Read for understanding, write our own code (`docs/adr/0001`, `docs/adr/0002`).
7. **Current versions only.** Before adding a package, check its latest release.
8. **The website preview can never reach the editor.** A site, or a script in one, gets no editing powers.
9. **Tell the truth in the app and in the documents.** No placeholder text presented as real state. No "verified" without saying what was actually run, on which revision. If something was not checked, say so.

## How work is tracked

- **Linear is the single source of truth for work.** The project is [Cauldron](https://linear.app/witchdaddy/project/cauldron-cb61ac6bc02b) on the Witchdaddy Labs (WDL) team. Agents pick up tickets there. Do not start work that is not on a Linear issue.
- **Work through pull requests, not direct commits to `main`.**
- **Every branch name or pull-request title must include the WDL issue ID** (for example `wdl-170-linear-source-of-truth` or `WDL-170: …`). Linear then moves the issue to In Review when the PR opens, and to Done when it merges.
- **Never assign Linear issues to agents.** Assign only to Billy (and later Claudia).
- **All commits must be authored and committed as** `Billy <119015637+cre8tivoz@users.noreply.github.com>`. Never Claude, `noreply@anthropic.com`, or any other identity.
- [`fablefixes.md`](fablefixes.md) is the original 9–10 November 2026 audit. Its items are now Linear tickets; see the mapping at the top of that file. Do not treat it as the live work list.
- The files under `.scratch/` are history. Do not start another plan, upgrade or rescue document. If the plan changes, change this file or a Linear issue.
- Report anything unexpected that falls outside what you were asked to do. Add it as a Linear issue rather than quietly fixing or ignoring it.

## Safety

- Work on fresh, disposable copies of sites and fresh test user-data. Never edit a person's original site.
- Do not open or drive desktop apps on Billy's Mac without permission.
- No changes to agent configuration or credentials. No fake models or servers.
- Never commit Finder `.DS_Store` files, dependency folders or secrets.
- Do not weaken accessibility thresholds or tune a check just to make it pass.

## Working here

```bash
npm install          # Node 26.13 (.nvmrc), npm 12
npm start            # run the app in development
npm run check        # type check, lint and unit tests — must pass
npm run smoke        # package the app, open it hidden, confirm the interface renders
```

Run `npm run check` and `npm run smoke` before every commit. CI runs the same on pushes to `main` and on pull requests, and must be green. If you cannot run one of them (for example, no Mac), say so plainly in your report.

## Vocabulary and decisions

Vocabulary is fixed in `GLOSSARY.md`. Decisions are in `docs/adr/`; read them before proposing anything that contradicts one.

## History — background only

| Where                                                                                 | What it was                                                                                                  |
| ------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `docs/history/RESCUE-PLAN.md`                                                         | The 8 November rescue handoff. Its §5 walkthrough table is still a useful checklist of what the app must do. |
| `docs/history/upgrades.md`, `docs/history/gemini-upgrades.md`                         | The visual upgrade and "Gemini upgrades" plans.                                                              |
| `docs/plan-verification.md`, `docs/cauldron-retro.md`, `docs/cauldron-code-review.md` | Earlier audits and a retrospective.                                                                          |
| `docs/rescue/`                                                                        | Snapshots of the original plan, starter set and taste tests, plus audit evidence.                            |
| `.scratch/`, `docs/agents/`                                                           | The old ticket tracker (tickets 00–32) and its settings.                                                     |
| [`fablefixes.md`](fablefixes.md)                                                      | The 9–10 November 2026 full-project audit. Items are now Linear tickets; see the mapping in that file.       |
| `originalresearch/`                                                                   | Billy's original research and evaluation material. Reference only; never copy code from it.                  |
| `v1screenshots/`                                                                      | Design renders made with sample data. They are not screenshots of the real app in use.                       |
