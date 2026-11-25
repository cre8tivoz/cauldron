# Cauldron

A Mac desktop app for designing and building real Astro websites, with design taste built in. Electron, React and TypeScript. MIT.

**This file is the entry point.** If another document disagrees with this file or with Linear, that document is out of date.

## The three live documents

| Document                                                                        | What it is for                                                      |
| ------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| `AGENTS.md` (this file)                                                         | What the product is, what is settled, the rules, how to work here.  |
| [Linear: Cauldron](https://linear.app/witchdaddy/project/cauldron-cb61ac6bc02b) | **The one work list.** Open, in-progress and done work lives there. |
| [`README.md`](README.md)                                                        | The short public description and how to run the app.                |

Supporting reference, still current: [`GLOSSARY.md`](GLOSSARY.md), the decisions in [`docs/adr/`](docs/adr/), and [`CONTRIBUTING.md`](CONTRIBUTING.md).

Everything else is **history** (see "History" at the end). Read it for background if you need it. Do not treat any "done", "verified" or "complete" in it as true today.

## The job

Deliver a working Mac app. A person opens Cauldron, creates or opens a site, asks the built-in agent to work, sees the result, and can edit, review, undo and publish it. They must not need a terminal or a separate agent app to keep things going.

The site stays ordinary Astro files in the person's own folder, buildable without Cauldron.

**Done means it works through the delivered app.** Passing tests, a tidy document or a good-looking demo is not that.

## Where things honestly stand (26 November 2026)

- Repository is public under MIT (`v0.10.0`), with `originalresearch/` and third-party study codebases removed and purged from Git history (`WDL-153`).
- The foundations are real: project creation and opening (with `pnpm` shared store or automatic `npm` fallback), safe versioned saves, crash recovery, agent wiring for Claude Code, Codex, Hermes, and Your AI key (OpenRouter, Anthropic, OpenAI, or local Ollama, encrypted in the Mac keychain under `WDL-243`), quality checks, and Git / one-click static publishing (`WDL-241`).
- Type check, lint, unit suites, and smoke packaging pass (`npm run check`). CI runs Linux checks on pull requests; Apple Silicon build & launch verification (`mac-build`) runs on release tags (`v*`) or manual `workflow_dispatch` with zero artifact uploads, while routine Mac verification runs locally via `npm run verify:mac`.
- **Driven and verified in the packaged app over CDP**, not just in tests: creating a project, opening one from the library, Design directions "Use this direction" rewriting `cauldron/tokens.css`, the ten direction cards rendering as miniature real pages in their own tokens, Compare widths showing 375 / 768 / 1280 side by side (frames report 373 / 765 / 1277 CSS px at zoom 0.252), and rail location/site context with honest no-site empty states (`WDL-265`).
- Workspace chrome and flow polish (`WDL-267`): `Publish` primary top-right action when a site is open, preview-stage page switcher and reload, visual token pickers in the Inspector, `ProjectHome` showing existing projects first with a native modal for new projects, and starter prompt chips in the Agent panel.
- **Not yet built:** live-API Unsplash/Pexels stock search (disabled with a "COMING SOON" overlay under `WDL-189` / `WDL-171`). Remaining active v1/post-v1 items live in Linear (`WDL-266` SEO panel, `WDL-244` interactive canvas follow-ups).

## What is settled — do not reopen

- **In v1:** new site, open existing, a persistent recent list with project-card thumbnails (`WDL-174`), shared dependency storage (`pnpm` when installed, seamless `npm` fallback otherwise), built-in chat driving installed Claude Code, Codex and Hermes — or running on the person's own AI key (OpenRouter, Anthropic, OpenAI, or a local Ollama), encrypted by the Mac's keychain (`WDL-243`) — and one-click publishing to Cloudflare Pages, Vercel, and GitHub Pages (`WDL-241`, live-verified).
- **Outside v1:** other agent apps controlling Cauldron from outside, Windows and Linux, a cloud platform, and one-click Netlify deploy (moved to Backlog under `WDL-255`).
- **macOS distribution & signing (closed):** Cauldron distributes through **GitHub Releases** as an **unsigned** Apple Silicon build (`Cauldron-darwin-arm64-<version>.zip`) with **"Open Anyway"** instructions in [`README.md`](README.md). Do not reopen Apple Developer code signing/notarisation (Billy has no Apple Developer account), a `witchdaddylabs.com` download page (`WDL-178` canceled), or manual Gatekeeper testing on a second Mac (no second Mac is available; ruled out permanently and must not be added to any backlog or "not proven" list).
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
6. **Reuse permissively licensed code, with attribution.** MIT (or equally permissive) code may be taken into Cauldron when it fits, recorded in `THIRD_PARTY_NOTICES.md` (`docs/adr/0002`). Read the licence first; never take code whose licence forbids it, and never take names, logos or assets. Prefer our own version only where it is genuinely better.
7. **Current versions only.** Before adding a package, check its latest release.
8. **The website preview can never reach the editor.** A site, or a script in one, gets no editing powers.
9. **Tell the truth in the app and in the documents.** No placeholder text presented as real state. No "verified" without saying what was actually run, on which revision. If something was not checked, say so.

## How work is tracked

- **Linear is the single source of truth for work.** The project is [Cauldron](https://linear.app/witchdaddy/project/cauldron-cb61ac6bc02b) on the Witchdaddy Labs (WDL) team. Agents pick up tickets there. Do not start work that is not on a Linear issue.
- **Work through pull requests, not direct commits to `main`.** The exception is a documentation-only correction Billy has asked for by name, which may go straight to `main`.
- **The agent merges.** Once CI is green, the PR is `MERGEABLE`/`CLEAN` and every review thread is resolved, the agent squash-merges, deletes the branch and verifies `main`. Do not leave a finished PR open for Billy, and do not ask him to merge it.
- **Every branch name or pull-request title must include the WDL issue ID** (for example `wdl-170-linear-source-of-truth` or `WDL-170: …`). Linear then moves the issue to In Review when the PR opens, and to Done when it merges.
- **Never assign Linear issues to agents.** Assign only to Billy (and later Claudia).
- **All commits must be authored and committed as** `Billy <119015637+cre8tivoz@users.noreply.github.com>`. Never Claude, `noreply@anthropic.com`, or any other identity.
- [`fablefixes.md`](fablefixes.md) is the original 9–10 November 2026 audit. Its items are now Linear tickets; see the mapping at the top of that file. Do not treat it as the live work list.
- The files under `.scratch/` are history. Do not start another plan, upgrade or rescue document. If the plan changes, change this file or a Linear issue.
- Report anything unexpected that falls outside what you were asked to do. Add it as a Linear issue rather than quietly fixing or ignoring it.

## Review guidelines (for Codex and other automated reviewers)

- Judge commit identity only from the commits actually published on the pull request (the PR's Commits tab, or `git rev-list <base>..<head>` on the PR head). Each published commit must be authored and committed as `119015637+cre8tivoz@users.noreply.github.com`.
- Your own review sandbox may create a local working commit under its own identity (for example `Codex <codex@openai.com>`). That commit is never pushed and is not part of the PR. Do not report it as an identity violation. Before flagging identity, confirm the SHA appears in the PR's published commits.
- Raise an identity finding only when a published PR commit has the wrong author or committer.

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
npm run verify:mac   # run check + local Mac smoke verification before opening a PR
```

**`npm run package` does not type-check.** electron-vite strips types without checking them, so a build can exit 0 with `tsc` errors in it and produce an app that misbehaves at runtime. Run `npm run typecheck` (or `npm run check`) before every package, and never read `PACKAGE=0` as proof the code compiles.

Run `npm run check` before every commit (`npm run hooks:install` once per checkout makes the pre-commit hook do it) and run `npm run verify:mac` (or `npm run smoke`) locally on your Mac before opening or merging a PR that touches app code. CI runs `check` (including Linux `smoke`) on pull requests and must be green. The `mac-build` job (packaging and unzipping/launching the `.zip` in one macOS job with zero Actions artifact storage) runs on `v*` release tags or by hand from the Actions tab (Run workflow) — run it before cutting a release. If you cannot run local Mac verification (for example, no Mac), say so plainly in your report.

## Vocabulary and decisions

Vocabulary is fixed in `GLOSSARY.md`. Decisions are in `docs/adr/`; read them before proposing anything that contradicts one.

## History — background only

| Where                                                                                 | What it was                                                                                                           |
| ------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `docs/history/RESCUE-PLAN.md`                                                         | The 8 November rescue handoff. Its §5 walkthrough table is still a useful checklist of what the app must do.          |
| `docs/history/upgrades.md`, `docs/history/gemini-upgrades.md`                         | The visual upgrade and "Gemini upgrades" plans.                                                                       |
| `docs/plan-verification.md`, `docs/cauldron-retro.md`, `docs/cauldron-code-review.md` | Earlier audits and a retrospective.                                                                                   |
| `docs/rescue/`                                                                        | Snapshots of the original plan, starter set and taste tests, plus audit evidence.                                     |
| `.scratch/`, `docs/agents/`                                                           | The old ticket tracker (tickets 00–32) and its settings.                                                              |
| [`fablefixes.md`](fablefixes.md)                                                      | The 9–10 November 2026 full-project audit. Items are now Linear tickets; see the mapping in that file.                |
| `v1screenshots/` _(removed under `WDL-218`)_                                          | Design renders made with sample data; removed from the repository under `WDL-218`.                                    |
| `originalresearch/` _(removed under `WDL-153`)_                                       | Billy's original research and third-party study codebases; purged from the public repository and archived externally. |
