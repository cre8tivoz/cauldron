# Testing Cauldron

There are two kinds of check in this repo. Source checks run on any machine with Node and catch broken code early. Packaged-app checks drive the real `Cauldron.app` on a Mac and are the evidence that a user journey works. A green source check is not proof the app works.

## The gate: `npm run check`

`npm run check` is exactly `npm run typecheck && npm run lint && npm test`. It stops at the first failure, so a red check is a stop signal, not something to work around.

| Layer       | Command         | What it catches                                                    |
| ----------- | --------------- | ------------------------------------------------------------------ |
| Types       | `tsc --noEmit`  | Type errors across the source. Nothing is emitted.                 |
| Lint        | `oxlint`        | Code that parses but breaks repo rules: unused code, bad patterns. |
| Format      | `oxfmt --check` | Files not in the repo's format, including Markdown docs.           |
| Unit suites | `npm test`      | Behaviour regressions in the main-process and fixture code.        |

`npm run lint` runs `oxlint` first, then `oxfmt --check`. To apply the fixes, run `npm run lint:fix` (`oxlint --fix && oxfmt --write`) and then re-run `npm run check`.

`npm test` runs three scripts in order, stopping on the first failure:

| Script                                  | What it covers                                                                                                                                                                                        |
| --------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `node scripts/test-core.mjs`            | The broad headless suite: file and path safety, edits that must not clobber outside changes, undo and recovery, content forms, publishing behaviour, and the release/README consistency check.        |
| `node scripts/test-agent.mjs`           | Agent protocol fixtures only. It checks CLI output parsing, error handling, tool paths, session ids and cancellation using stand-in executables. No model is called and no real agent job is claimed. |
| `node scripts/test-gemini-upgrades.mjs` | The five upgrade areas: starter templates, the extended catalogue, page-outline AST operations and safety, asset saving and curated photos, and static export plus honest deploy diagnostics.         |

`npm run test:upgrades` runs only the third script when you want a narrow loop.

## The Mac layer

| Command              | What it actually does                                                                                                       |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `npm run package`    | `electron-forge package`. It builds `out/Cauldron-darwin-arm64/Cauldron.app`.                                               |
| `npm run smoke`      | Repackages with `npx electron-forge package`, then launches the app hidden with `CAULDRON_SMOKE=1` and a 60-second timeout. |
| `npm run verify:mac` | `npm run check`, then `npm run smoke`. This is the local gate before opening or merging a PR that touches app code.         |

**`npm run package` does not type-check.** electron-vite strips types without checking them, so packaging can exit 0 with type errors in it and produce an app that throws at runtime. Run `npm run typecheck` or `npm run check` before every package. `PACKAGE=0` says nothing about whether the code compiles.

Smoke is shell-render evidence only: a window is created and the interface renders. It does not prove buttons, IPC, project creation, agent chat or library loading. Say what it proved, nothing more.

## What a failure means

| Result                                 | What it means                                                                           | Next move                                                                                                                              |
| -------------------------------------- | --------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `tsc --noEmit` error                   | The source does not type-check. Packaging would strip the type and still exit 0.        | Fix the types. Do not turn this into a cast that hides the error.                                                                      |
| `oxlint` error                         | The code parses but breaks a repo rule.                                                 | Fix the code named in the message.                                                                                                     |
| `oxfmt --check` error                  | A file is not in the repo's format. Markdown docs count.                                | Run `npm run lint:fix`, then re-run `npm run check`.                                                                                   |
| `FAIL` line in a unit suite            | A named behaviour is broken. The message should name the assertion.                     | Re-run the named script to reproduce, then fix the product.                                                                            |
| `Package the app first (out/ missing)` | A packaged-app script was run before a bundle existed.                                  | Run `npm run check` and `npm run package`, then re-run the suite.                                                                      |
| Smoke exits non-zero                   | The packaged app did not open a window or render the interface in that run.             | Read the app output printed on failure. This is not evidence about features beyond the shell.                                          |
| A packaged suite hangs                 | Often a hidden test app left holding the single-instance lock for its user-data folder. | Check processes belonging to your own test and its scratch profile before blaming the feature. Don't stop someone's ordinary Cauldron. |

## Packaged-app and workflow suites

Run these after `npm run package`, from the repo root. They print `ok`/`PASS` and `FAIL` lines and exit non-zero on failure.

| Script                        | Needs the packaged app?                                       | What it proves                                                                                                                                                                                                                                                                                                                                                                                                          |
| ----------------------------- | ------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run test:app:shell`      | Yes, over CDP                                                 | The no-site empty states say what is missing and offer the two real actions, and "Create and prepare" lands you in the new project. Nothing in this suite needs a site to exist first.                                                                                                                                                                                                                                  |
| `npm run test:projects:ui`    | Yes, over CDP                                                 | The renderer, preload, IPC and backend together: a new project through the form with a real pnpm install into the app-managed shared store, preview HTTP, reopening from the persisted library after a restart, missing-folder reporting, removing a recent entry without deleting the project, and cancel then retry of an install. The native Finder picker is explicitly not claimed as verified.                    |
| `npm run test:library:ui`     | Yes, over CDP                                                 | The component browser at the supported 1280×800 minimum and at 1440×900: the category bar stays visible, every category answers a mouse click and the keyboard, and every component can be selected at desktop and phone width. `-- --capture` refreshes `docs/reference/library-audit/components/*.png`.                                                                                                               |
| `npm run test:ai-key:ui`      | Yes, hidden over its CDP debug port                           | "Your AI key" on a scratch profile with Chromium's mock keychain against a local OpenAI-compatible stand-in: saving a key (never returned to the window), testing it, a job that edits the site through Cauldron's own actions, and removing the key. No real provider is called and no money is spent.                                                                                                                 |
| `npm run test:library:render` | No; it renders the real components in the repo's own Electron | Every library piece, starters and catalogue, in its showcase palette and in all ten design directions. It measures contrast on actual glyph pixels at eight frozen animation frames, checks for horizontal overflow at 375px, and exercises the interactive pieces with real keyboard and mouse input, including the JavaScript-off fallback. `--write` refreshes the evidence JSON; `--only=<id,...>` narrows the run. |
| `npm run test:projects`       | No; this is the real-workflow proof, also run in CI           | Unit regressions plus a genuine backend run: two Astro projects created through `createProject`, installed with pnpm 10.34.2 into one shared content-addressable store, an offline install reusing that store, hardlink-level reuse checked on disk, and a real Astro dev server started under a GUI-restricted PATH.                                                                                                   |

The CDP suites launch the actual `out/Cauldron-darwin-arm64/Cauldron.app` with a scratch user-data folder. They catch broken wiring that unit tests structurally cannot. If a flow's end state changes, update the test to wait on the end state matched by identity (the project's name), not on "any site is open" — an earlier fixture's state would satisfy that instantly.

## Pre-commit hook and CI

`npm run hooks:install` is opt-in, once per checkout. It sets `core.hooksPath` to `.githooks` for that checkout only; nothing installs it automatically. The tracked hook checks the Node version against `.nvmrc`, exports `NODE_ENV=development`, and runs `npm run check`. `git commit --no-verify` can skip it, but don't use that to land failing work.

One wrinkle: the installer prints "pre-commit runs: npm run check, then npm run smoke". The tracked hook currently runs only `npm run check`. Run `npm run verify:mac` yourself before a PR that touches app code.

CI on a pull request is the Linux `check` job: `npm ci`, typecheck, lint, `npm test`, then `npm run test:projects` and `xvfb-run -a npm run smoke`, with pnpm installed for the project proof. The `mac-build` job runs only on `v*` tags or manual dispatch from the Actions tab. It waits for `check`, runs `npm run make`, unzips the archive into the runner's temp folder and launches it with `CAULDRON_SMOKE=1`. It uploads no Actions artifacts; downloads come from GitHub Releases.

## Writing a test that fails when the behaviour breaks

Write the assertion against the outcome a person sees or the file on disk, not against an internal helper. Give the test a name that states the behaviour, and make it fail when that behaviour is missing. One behaviour per test is easier to trust than a bundle of checks.

Then check the test itself:

1. Break the behaviour deliberately — revert the fix, or change the one line that implements it.
2. Run the real entry point (`npm run check`, `npm test`, or the named script). A bare exit code is not enough; confirm the output contains this test's own assertion message so a missing script or unrelated error cannot pass as a failure.
3. Restore the code and confirm the test passes again, then run the full gate.

For interface work, the meaningful proof is the packaged app over CDP, including failed and cancelled requests and a busy control that recovers. Harness and direct backend calls are supplementary evidence, not a substitute. Use a fresh scratch user-data folder per run; a hidden test app left holding the single-instance lock makes later launches quit silently.

Never weaken a check to make it pass. AGENTS.md is explicit: don't lower accessibility thresholds or tune a check to silence a failure. If a widened check surfaces real failures, fix the product. If a test is measuring the wrong thing, fix the measurement and say so. No `--no-verify` on failing work.

## When you cannot run the Mac half

If you are not on a Mac, or cannot run a packaged-app suite, say so plainly in the PR and in your report. Run `npm run check` and the headless suites that do work, list the Mac suites you skipped, and don't describe a journey as verified. A PR with an honest gap is better than one with a claimed result nobody actually ran.
