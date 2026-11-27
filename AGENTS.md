# Cauldron

Cauldron is a free, open-source Mac desktop app for designing and building real Astro websites, with design taste built in. Electron, React and TypeScript. MIT.

This file is the entry point for contributors and AI assistants: what the product is, the rules, and how work happens here. Decisions live in `docs/adr/`; this file covers how to work.

## Documents

| Document                 | What it is for                                        |
| ------------------------ | ----------------------------------------------------- |
| `AGENTS.md` (this file)  | What the product is, the rules, how to work here.     |
| `README.md`              | The public description and how to run the app.        |
| `CONTRIBUTING.md`        | How to contribute, for non-developers and developers. |
| `CODE_OF_CONDUCT.md`     | The behaviour bar.                                    |
| `SECURITY.md`            | How to report a vulnerability privately.              |
| `GLOSSARY.md`            | The words used in the app and the docs.               |
| `docs/adr/`              | Architecture decisions and why they were made.        |
| `THIRD_PARTY_NOTICES.md` | Attribution for reused permissively licensed code.    |

## The job

A person opens Cauldron, creates or opens a site, asks the built-in agent to work, sees the result, and can edit, review, undo and publish it. They must not need a terminal or a separate agent app to keep things going.

The site stays ordinary Astro files in the person's own folder and must build without Cauldron.

**Done means it works through the delivered app.** Passing tests, a tidy document or a good-looking demo is not that.

## Rules

1. **Do what was asked, and nothing more.** No unrequested features, redesigns, new libraries or refactors. If a change seems needed but wasn't asked for, say so instead of building it.
2. **One official path.** Prefer the plain, documented way of doing something over workarounds, wrappers or clever patches.
3. **Never install anything silently.** If something needs installing, say so and ask first.
4. **Surface every failure.** Errors reach the person using the app as a visible message, and go to the console. A silent failure is a bug.
5. **Plain Astro in the sites Cauldron makes.** React only where real interaction needs it; see `docs/adr/0008`.
6. **Reuse permissively licensed code, with attribution.** MIT (or equally permissive) code may be taken into Cauldron when it fits, recorded in `THIRD_PARTY_NOTICES.md` (`docs/adr/0002`). Read the licence first. Never take code whose licence forbids it, and never take names, logos or assets. Prefer our own version only where it is genuinely better.
7. **Current versions only.** Before adding a package, check its latest release.
8. **The website preview can never reach the editor.** A site, or a script in one, gets no editing powers.
9. **Tell the truth in the app and in the documents.** No placeholder text presented as real state. No "verified" without saying what was actually run, on which revision. If something was not checked, say so.

## Settled — do not reopen

These are decisions, not oversights. Want to argue one? Open an issue. Don't quietly change it.

- **The app look.** Source Sans 3, system light and dark. Ink buttons, violet selection (`--primary` and `--accent` in `src/index.css`). Agent panel on the left, live preview in the centre, inspector on the right. Minimum window 1280 × 800. The websites it makes must still work at phone, tablet and desktop widths.
- **The ten design directions.** Keep them all, including Componine, Niki Studio and Henry From Online.
- **Unsigned Mac distribution.** Releases are an unsigned Apple Silicon build (`Cauldron-darwin-arm64-<version>.zip`) on GitHub Releases, with "Open Anyway" instructions in `README.md`. There is no Apple Developer certificate, so code signing and notarisation are not available. Don't plan them or open work for them.
- **Mac-only for now.** Windows and Linux aren't supported yet; don't add half-finished platform code for them.
- **The generated site is the product.** Anything that would make a site Cauldron makes depend on Cauldron at runtime is out, and the same goes for the app icon and startup splash — they're final.

## How work is tracked

- **GitHub Issues on this repo is the tracker.** No special ticket or invitation is needed: anyone can open an issue, comment and send a pull request.
- **Work lands through pull requests, not direct commits to `main`.** The exception is a documentation-only correction made by the maintainer, which may go straight to `main`.
- **Keep pull requests small and focused.** One idea each; they're quicker to review and land.
- **CI must be green before merge.** The maintainer reviews and merges.
- If you find something unexpected outside what you were asked to do, report it in the pull request or an issue rather than quietly fixing or ignoring it.

The exploratory planning documents that predate publication are gone from the repository; Git history still has them for anyone who wants the background. They are not a work list.

## Review guidance for automated reviewers

- Judge only the commits actually published on the pull request (the PR's Commits tab, or `git rev-list <base>..<head>` on the PR head).
- Your own review sandbox may create a local working commit under its own identity. That commit is never pushed and is not part of the PR; don't report it as a problem with the PR.
- Raise a finding only when the issue is in a published PR commit. Confirm the SHA appears in the PR's published commits first.

## Safety

- Work on fresh, disposable copies of sites and fresh test user-data. Never edit a person's original site.
- Don't drive someone else's desktop apps or interfere with their machine without permission.
- No changes to agent configuration or credentials. No fake models or servers.
- Never commit Finder `.DS_Store` files, dependency folders or secrets.
- Don't weaken accessibility thresholds or tune a check just to make it pass.

## Working here

```bash
npm install          # Node 26.13 (.nvmrc), npm 12
npm start            # run the app in development
npm run check        # type check, lint and unit tests — must pass
npm run smoke        # package the app, open it hidden, confirm the interface renders
npm run verify:mac   # run check + local Mac smoke verification before opening a PR
```

**`npm run package` does not type-check.** electron-vite strips types without checking them, so a build can exit 0 with `tsc` errors in it and produce an app that misbehaves at runtime. Run `npm run typecheck` (or `npm run check`) before every package, and never read `PACKAGE=0` as proof the code compiles.

Run `npm run check` before every commit (`npm run hooks:install` once per checkout makes the pre-commit hook do it), and run `npm run verify:mac` (or `npm run smoke`) locally before opening or merging a pull request that touches app code.

CI runs `check` (type check, lint, unit tests and Linux `smoke`) on pull requests, and it must be green. The `mac-build` job packages and launches the Mac download only on `v*` release tags or manual dispatch from the Actions tab (Run workflow) — run it before cutting a release. Never upload Actions artifacts from that job: it would burn the free storage quota. If you can't run local Mac verification (say, you're not on a Mac), say so plainly in your report.

## Vocabulary and decisions

Vocabulary is fixed in `GLOSSARY.md`. Decisions are in `docs/adr/`; read them before proposing anything that contradicts one.
