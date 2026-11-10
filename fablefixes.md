# Fable fixes — full project audit

**Audited:** 9 November 2026, revision `fcd1cfe3` (`main`).
**Scope:** every file of the app (`src/`, `scripts/`, config, CI, docs, tickets). `originalresearch/` was checked for size, secrets and licence risk only, not read line by line.
**Nothing was changed.** This file is a list of findings and suggested fixes only. No app code was touched.

## How to read this

- **P0** = the app tells the person something untrue, or can damage their work. Fix first.
- **P1** = a feature is broken or misleading in normal use.
- **P2** = slow, fragile or inconsistent. Fix when nearby.
- **P3** = tidy-up and things no longer needed.

Each finding is marked:

- **[Tested]** — reproduced with a throwaway script in this audit.
- **[Read]** — confirmed by reading the code; not run.
- **[Check on Mac]** — likely, but needs the real packaged app to be sure.

## What was run, and what could not be

| Check                              | Result                                                                                                                                             |
| ---------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `tsc --noEmit`                     | Pass                                                                                                                                               |
| `oxlint` + `oxfmt --check`         | Pass (4 warnings; see item 62)                                                                                                                     |
| `scripts/test-core.mjs`            | 101 pass, **1 fail** — "an unreadable file makes undo refuse". It fails only because this audit machine runs as root, which can read locked files. |
| `scripts/test-agent.mjs`           | 24 pass                                                                                                                                            |
| `scripts/test-gemini-upgrades.mjs` | 8 pass                                                                                                                                             |
| CI on `main` (run 48)              | Green                                                                                                                                              |
| `npm run smoke`, packaged app      | **Not run.** This audit ran on Linux with Node 24, without the Electron binary. Anything marked [Check on Mac] needs the real app.                 |
| `npm audit`                        | 16 moderate advisories, all in build tooling (`glob`, `minimatch` via Electron Forge). Not shipped in the app.                                     |

---

## P0 — Untrue messages and risk to the person's work

### 1. Outline "Undo" never works [Tested]

`src/components/PageOutline.tsx:69` and `:141` read `srcRes.text`, but the `readSource` action returns the file under `content` (`src/main/actions.ts:181`). The saved copy is therefore always empty, so the undo history is never filled. The Undo button and ⌘Z in the Outline tab do nothing.

The delete prompt (`PageOutline.tsx:221`) tells the person "You can undo with ⤺ Undo or ⌘Z". That is false, so a deleted section is gone unless the site is in Git.

`RESCUE-PLAN.md` §0 item 4 records this as done "with full undo support". No test covers it.

**Fix:** read `content`, add a test that deletes a section and undoes it, and better still route section changes through `sharedAction` so the normal Undo covers them (see item 15).

### 2. Status bar shows made-up numbers [Read]

`src/App.tsx:429-447` falls back to fixed mockup text whenever the real status is "Ready": "Checks finished · 2 to fix", "Ready · 3 changed files", "Component library · 5 pieces", "Content saved", "Saved to site". These appear with no site open and no checks run.

**Fix:** delete the fallback strings. Show real state or nothing.

### 3. "Sunday Table" appears as the site name when no site is open [Read]

`src/components/TopBar.tsx:68`, `PublishPanel.tsx:129`, `QualityPanel.tsx:103` (which also hard-codes "/ Homepage" although every page is checked).

**Fix:** show "No site open".

### 4. Content editor always shows a green "Saved" tick [Read]

`src/components/ContentPanel.tsx:418-428` renders "Saved to the site's content file." permanently, including before anything is saved and after a save fails.

**Fix:** show it only after a successful save.

### 5. Failed publish is shown in green [Read]

`src/components/PublishPanel.tsx:318-325` puts every result, including "The upload failed", in a `notice good` box. After a commit that succeeded but a push that failed, the file list is not refreshed (`:70` only refreshes on full success), so already-committed files still look uncommitted.

**Fix:** use the `bad` style on failure and always refresh the repository state.

### 6. Cloudflare deploy: wrong reason, guessed address, uninvited file [Tested / Read]

- Any failure is reported as "requires Wrangler authentication" (`src/main/publishing.ts:403-414`). In the test run the real cause was "wrangler is not installed". **[Tested]**
- On success, if the address cannot be found in the output, the app invents `https://<name>.pages.dev` and shows it as "Live Edge Preview" (`:416-417`). The rescue plan says it "never" does this. **[Read]**
- It writes `wrangler.toml` into the person's site without asking (`:350-361`), which then shows up as a change to commit. **[Read]**
- The button is labelled "Deploy" but the failure box says "Coming Soon / Setup Required".

**Fix:** report the real error text, never guess an address, do not write files without consent, and either finish the feature or relabel the button "Build for Cloudflare (setup needed)". `RESCUE-PLAN.md` "Park" section already says real deploy needs separate authorisation.

### 7. Saving a date in the content form breaks the site [Tested]

For a `z.date()` field, the form saves `pubDate: "2026-02-02"` (quoted text). Astro then rejects it because it expects a date, so the site stops building. `src/main/content.ts:368` quotes everything that is not a number or true/false.

**Fix:** write date fields unquoted after validating the format.

### 8. Saving one content field throws away typing in the others [Check on Mac]

Each field has its own Save button. After a save, `ContentPanel.tsx` reloads the entry (`save` → `open`) and replaces all field values with the disk version, so unsaved typing in other fields disappears from the form.

**Fix:** keep unsaved values for other fields when reloading, or use one Save for the whole form.

### 9. Section anchors land on the wrong element and accept broken text [Tested]

`src/main/actions.ts:612-618`:

- If the section has no `id` but something inside it has `id=` or `data-id=`, the anchor overwrites that inner value instead (test: `data-id="keep"` became `data-id="intro"`).
- Quotes are not removed, so an anchor like `a" onclick="x` is written straight into the page as a new attribute.

**Fix:** only edit the section's own opening tag using the existing tag parser, and allow letters, numbers, dashes and underscores only.

### 10. An agent can corrupt any file in the site through "edit CSS rule" [Tested]

`editCssRule` (`src/main/actions.ts:796-847`) only checks the file is inside the site. It is not limited to CSS files. In the test it appended CSS text to `package.json` and left it invalid. The same gap applies to the element edit actions. `TEXT_FILES` at `:119` looks like the intended guard but is never used. This defeats the "narrower than a filesystem tool" rule stated at `:121-127`.

**Fix:** restrict `editCssRule` to `.css` and `<style>` in `.astro`, and restrict element edits to markup files.

### 11. "Edit CSS rule" edits the wrong rule and adds duplicates [Tested]

Asking to change `h1 { color }` changed `.hero h1` instead (first text match wins), and added a second `color:` line rather than replacing the first.

**Fix:** match whole selectors only and fix the property pattern. A real CSS parser would be the "one official path".

### 12. Curated photos cannot be saved to the site [Tested]

`src/components/AssetTray.tsx:79` downloads the photo with `fetch`, but the app's security policy (`index.html:7`) only allows Unsplash for showing images, not for downloading. The download is blocked ("Failed to fetch"). The existing test only checks the save-to-disk half.

Also: a saved image silently overwrites an existing file of the same name (`src/main/assets.ts:256`), every photo is saved as `.jpg`, and a failed download page would be saved as an image (no status check).

**Fix:** download in the main process, refuse or rename on a name clash, check the response.

### 13. Photo credits look invented [Check on Mac / needs a person]

`src/main/assets.ts:27-185` credits named photographers with links such as `unsplash.com/photos/coffee-cup`. Those link shapes are not real Unsplash photo addresses, and the names could not be verified here. Wrong credits on real people's work is a licence and trust problem.

**Fix:** verify each photo's real page and photographer, or remove the set.

### 14. Starter sites fail Cauldron's own design rules [Read]

All starter sites in `src/main/templates.ts`:

- use their own colour names (`--c-bg`) and never load `cauldron/tokens.css`, so **changing the design direction does nothing** to a starter site;
- are full of hard-coded sizes, colours and inline styles, which the Quality report counts as failures ("Tokens rather than hard-coded values", type scale, spacing, radii);
- have a navigation row with no mobile menu, against the app's own "generated-site standards" (`src/main/directions.ts:699-717`).

`createProject` also writes a second, unused copy of the tokens to `src/styles/tokens.css` (`src/main/projects.ts:327-345`).

**Fix:** rebuild the starters on the `--cauldron-*` tokens and one tokens file, then run the app's own Quality check on each as a test.

### 15. Outline changes skip the safety net [Read]

Reorder, delete, duplicate, insert and anchor (`src/main/index.ts:1745-1860`) write files directly. They are not recorded in the app's undo history or in a run, and the version check is optional (`if (baseHash && …)` in `actions.ts:494` and four more places), so a caller that omits it overwrites blindly.

**Fix:** make `baseHash` required and route these through `sharedAction`.

---

## P1 — Broken or misleading in normal use

### 16. "Add section here" inserts unstyled Tailwind markup [Read]

`PageOutline.tsx:262-268` inserts sections using Tailwind classes (`py-16`, `text-gray-600`). Cauldron sites are plain Astro with no Tailwind, so they arrive unstyled. The "Features" option is three equal cards, which the taste rules name as the generic AI look (`src/main/tastes.ts`, "generic-feel").

**Fix:** insert library pieces (already token-based) instead of hand-written snippets.

### 17. The agent is told about tools it does not have [Read]

The brief lists 15 actions in camelCase (`actionCatalogue`, `actions.ts:1010-1055`), including six section actions. The agent connection (`src/main/mcp.ts:101-244`) offers 11 tools in snake_case and none of the section ones.

**Fix:** generate the brief's list from the same tool definitions the connection serves.

### 18. Import shortcuts are reported as missing packages [Tested]

`findMissingPackages` (`src/main/dependencies.ts:389-413`) treats path aliases such as `@lib/utils` or `@components/card.astro` as npm packages. The result: a red "Missing packages" banner, the agent run marked "Build failed", and an "Install missing packages" button that tries to install a package of that name from the internet.

**Fix:** read aliases from `tsconfig.json`, and trust a real build over the text scan.

### 19. A page with "error" in its title is treated as a broken build [Read]

`inspectPreviewError` (`src/main/index.ts:451-468`) flags any page whose title contains "error".

**Fix:** only trust the Vite/Astro error overlay.

### 20. Undo and Redo buttons need a selected element [Read]

`src/App.tsx:425-426` reads undo state from the selection. With nothing selected the buttons are disabled even when there is something to undo. The Edit menu's Undo (⌘Z) is the text-box undo, not Cauldron's (`src/app-menu.ts:78-79`).

**Fix:** send undo state on its own channel; wire ⌘Z to Cauldron's undo outside text boxes.

### 21. Errors when opening a project show only in the Element panel [Read]

`problem` is passed only to the Inspector (`App.tsx:767`). On the project home, or with the panel collapsed, the message is invisible apart from the one-line status bar. This is against rule 4 ("Surface every failure").

**Fix:** show `problem` in a banner visible in every view.

### 22. Run history and run undo vanish on restart or project switch [Read]

`Runs` lives in memory (`src/main/runs.ts`). Records are written to disk but never read back, and they hold no file contents, so "Undo run" is gone after quitting.

**Fix:** either persist enough to undo, or say clearly in the UI that undo lasts for this session only. The welcome text "Every run is verified and can be undone cleanly" (`AgentPanel.tsx:310`) overstates it.

### 23. Component screen has five phantom pieces that install the wrong thing [Read]

`LibraryPanel.tsx:23-90` lists five pieces (`nav-simple`, `hero-split-image`, `contact-form`, `proof-quote-wall`, `services-grid`) that do not exist in the catalogue. If shown (when a category is empty or the library fails to load), "Add" installs "Editorial intro" and reports the other name (`:174-177`). `RESCUE-PLAN.md` says this class of bug is fixed.

Also the heading says "Five pieces" (`:543`) while 20 exist, and the preview tiles are hand-drawn mock-ups, not the real piece (the real `previewHtml` is built for all 20 pieces on every load and never used).

**Fix:** delete the phantom list and the fallback; render the real preview.

### 24. The "Mac download" bar in Publishing is never real for users [Read]

`macBuildInfo` (`publishing.ts:269-291`, `index.ts:1594`) looks for Cauldron's own zip beside the installed app, where it never exists. Users always see a placeholder "Cauldron-darwin-arm64.zip — Ready-to-hand-over Mac build". It is about the Cauldron app, not the person's website, so it does not belong on this screen. Its first-launch instructions are never shown and disagree with the README (right-click Open vs "Open Anyway").

**Fix:** remove from the product; keep release notes in the README.

### 25. Publishing details [Read]

- "Remote: origin" is hard-coded (`PublishPanel.tsx:345`).
- Export and Cloudflare are hidden unless the site is a Git repository, though neither needs Git.
- Renamed files and names with spaces are misread from `git status` (`publishing.ts:52-56`).

### 26. Codex follow-up messages drop safety flags [Check on Mac]

On a resumed Codex session the command omits `--sandbox workspace-write` and `-C` (`src/main/agent.ts:471-480`). Confirm the second message in a session can still write, and with what permissions.

### 27. Missing-package install uses the wrong tool as a fallback [Read]

For a pnpm site with no pnpm found, `installMissingPackages` falls back to `npm` but still passes pnpm-only options (`dependencies.ts:447-449`, `:488-493`). It has no timeout and cannot be cancelled.

### 28. New projects need pnpm already installed [Read]

Every new project is created as pnpm-only, pinned to `pnpm@10.34.2` — "as installed on this machine" (`projects.ts:195-196`). A person without pnpm is told to run a terminal command. That conflicts with the goal that nobody needs a terminal.

**Fix:** decide one supported path (npm ships with Node) or offer a consent-gated pnpm setup.

### 29. Design notes still name the font packages the agent must not use [Read]

`DESIGN.md` prints each font with its `@fontsource/...` package name (`directions.ts:813-815`) two lines above "never import @fontsource". This is the exact confusion behind the tinydogs failure.

**Fix:** drop the package names from the document.

### 30. "New page" with the preview stopped waits about 18 seconds on the wrong address [Read]

`createPage` (`index.ts:1956-1994`) falls back to `http://127.0.0.1:4321`, which may be another program, then reports "created, but not ready". The same page-creation code exists twice (`index.ts:1934` and `actions.ts:932`), and only one copy is undoable.

### 31. Outline misreads pages with loops or Windows line endings [Tested]

With CRLF line endings the front matter is scanned as markup (`actions.ts:349-355`): a type like `Array<Item>` became a "section". Components inside `{items.map(...)}` are listed as sections; deleting one leaves broken code.

---

## P2 — Slow, fragile or inconsistent

### Speed and freezing

32. **The window freezes during builds.** `buildSite`, Git, export and deploy use blocking calls (`spawnSync`) in the main process: `quality.ts:162` (up to 5 min), `publishing.ts:27` and `:376`. A full site build also runs after **every** agent job (`index.ts:2258`). Fix: run them asynchronously with a progress message.
33. **Every agent job reads the whole site into memory twice** (`runs.ts:67-93`), including all images, and keeps both copies for the rest of the session. Only `node_modules`, `dist`, `.git`, `.astro`, `.vercel` are skipped. Fix: hash files instead of holding them, drop old snapshots, skip more build folders.
34. **Test evidence recorder never empties.** `mcpToolCalls` (`index.ts:2201`) and `calls` (`mcp.ts:35`) store every agent tool call, including whole file contents, forever.
35. **Quality check is slow by design**: three widths × every page × fixed waits per control (`taste-check.ts:503-572`). It also checks text contrast twice with two different sets of code (`quality.ts` and `taste-check.ts`), which can disagree.
36. **Dead work in the quality probe.** `quality.ts:328-352` and `:391-422` compute fonts, colours, spacing, pure black, cards-in-cards and gradients on every page and never use them. The gradient pattern at `:411` is also broken (colour values parse as `NaN`). **[Tested]** Delete.
37. **A failed login-shell lookup is retried every time** (up to 5 s each, blocking) because failures are not cached (`runtime.ts:126-133`).
38. **Google Fonts are loaded at every app start** for 25 families (`index.html:9-14`) as a blocking stylesheet. README says the interface uses bundled Source Sans 3. Offline or on a slow network this delays or degrades the design screen. Fix: bundle the specimen fonts or load them only on the Design screen.
39. **Pre-commit hook packages the whole app on every commit** (`.githooks/pre-commit`). Minutes per commit invites `--no-verify`. Consider check-only locally and smoke in CI.

### Fragile

40. **Crash-recovery file is not written safely** (`recovery.ts:35-46`): a crash mid-write can corrupt the very file meant to survive crashes. Same for `mcp-codes.json` (`mcp.ts:86`), run undo writes (`runs.ts`), library add (`library.ts:591-595`) and new pages. Use the existing `writeFileAtomic`.
41. **All unexpected errors are swallowed and the app keeps running** (`index.ts:2748`); promise rejections are not handled at all.
42. **`togglePreview` can lock the toolbar** if the call throws (`App.tsx:332-342`, no `finally`).
43. **Library "Add" reuses any existing file of the same name** (`library.ts:591`): if the site already has `Footer.astro`, the piece is not written but the app says it was added.
44. **Preview window has no pop-up or permission rules** (`src/main/preview.ts`). A `target="_blank"` link opens a bare Electron window; camera/location requests are auto-granted by Electron's default.
45. **Agent job has no time limit.** A hung agent blocks opening another project until cancelled. Hermes can wait up to 90 s + 220 s before starting (`index.ts:1098-1141`).
46. **Agent sent from the Quality screen loses its live log**, because the Agent panel is not mounted there (`QualityPanel.tsx:37-47`).
47. **"Discard them" deletes recovery drafts with no confirmation**, and only "Restore the first one" is offered (`App.tsx:617-656`).
48. **`serveDist`** crashes on a malformed address and uses a loose folder check (`quality.ts:185-186`). Local only.
49. **Agent connection code** is accepted in the web address (`mcp.ts:338`), never changes, and is stored in a world-readable file.
50. **Build check assumes `dist/`** (`quality.ts:173`): sites with another output folder are reported as failed. `buildSite` always uses `npm run build` whatever the site's package manager.

### Inconsistent

51. **AGENTS.md contradicts RESCUE-PLAN.md.** AGENTS.md (9 Nov) says of the review findings "Nothing in it is done" and "the Deploy button does not deploy". RESCUE-PLAN.md §0 says "RESOLVED & VERIFIED". The fix commit `bcc6ee3f` updated one and not the other. AGENTS.md also still says only tickets 11–31 are approved and that an implementation pause applies; ticket 32 and the rescue work came later.
52. **"Resolved" items that are not** (per this audit): outline undo (item 1), guessed Cloudflare address (6), wrong-piece install (23), "CSP constrained with necessary hashes" (there are no hashes; the policy still allows inline styles and blocks the photo download, item 12).
53. **Ticket 30 is marked "done"** while AGENTS.md says first launch on a second Mac must not be claimed without evidence. The CI job (`ci.yml` `separate-mac-launch`) runs the binary directly on a build machine; that skips Gatekeeper's quarantine, so it does not prove the download-and-open experience.
54. **The ten `v1screenshots/` are staged, not real.** `scripts/capture-all-v1-screens.mjs:1010-1050` replaces the whole app backend with sample data (fake site, fake quality report, fake runs). README and RESCUE-PLAN present the visual upgrade as "verified on the packaged app". Label them as design renders or retake them from the real app.
55. **README inaccuracies:** "check = type check and lint" (it also runs tests); "run on every push" (CI runs on pushes to `main` and on pull requests only); "This repository is the application only" in AGENTS.md vs 1.1 GB of research in `originalresearch/`.
56. **Glossary vs product wording.** `GLOSSARY.md` says use "Site", avoid "Project"; the menus, home screen and code say "Project" throughout. It also says avoid "blocks, templates"; the app has "starter templates". Pick one and update.
57. **Outside-agent connection is shown in the Agent panel** (`AgentPanel.tsx:232-253`, address and code) although reverse control is "outside v1".
58. **App UI breaks its own taste rule**: emoji as button icons (`PublishPanel.tsx:397`, `:414`).
59. **Internal names in user-facing text**: "Camillo or Billy reviews the built page" (`quality.ts:874`).
60. **Stale comments**: "Astro 6" (`index.ts:1963`, `preview/preload.ts:8`) while the app pins Astro 7.4.7; "Five pieces" in `library.ts:7`.
61. **Three copies of the contrast maths** (`contrast.ts`, `taste-change.ts`, inline in `taste-check.ts`) and two `parseColour` functions.
62. **Lint can never fail on correctness**: `.oxlintrc.json` sets the correctness rules to "warn". Four warnings stand today.
63. **Most recorded proofs are not re-run by anyone.** `npm test`/CI runs three unit scripts. The 19 in-app proof runs in `src/main/e2e.ts`, plus `test:projects`, `test:projects:ui` and `test-project-navigation.mjs`, are manual only, so the features they proved can regress unnoticed.
64. **Hand-written type file** (`src/declarations.d.ts`, 511 lines) duplicates the preload API by hand. Drift between the two is how item 1 slipped through the type check.

---

## P3 — Tidy-up and no longer needed

65. **Test harness ships inside the product.** `src/main/e2e.ts` (5,892 lines), `harnessApi` and about 25 `CAULDRON_*_TEST` switches (`index.ts:2508-2980`) are bundled into the app people install. Move behind a build flag or out of the app bundle.
66. **`originalresearch/` — 1.1 GB, 24,555 files** in the app repository (Git history is 465 MB). It holds full source copies of other products, Mobbin screenshots and reverse-engineering notes on commercial apps. The repository is private today; the README calls Cauldron open source. **Before making it public, move this folder to a separate private repository** (licence and size). No real secrets were found in a pattern scan; only upstream test keys.
67. **`docs/rescue/reference-upload-manifest.json`** — 7.9 MB, 196,549 lines. Goes with item 66.
68. **`icons/`** — 7 MB of source artwork (two 3–4 MB PNGs and an icon set) used by nothing; the app uses `build/icon.icns`.
69. **`docs/checkpoints/documentation-audit.zip`** — a zip committed to Git.
70. **Two overlapping plans in the root**: `upgrades.md` (31 KB) and `gemini-upgrades.md` (23 KB), both "complete", plus `RESCUE-PLAN.md` (58 KB). Archive the finished ones under `docs/`.
71. **`.scratch/`** — tickets 00–10 are still "needs-triage" months on; `next-session.md` and `finish-up-closure.md` are stale; screenshots and a 2,557-line JSON measurement are tracked.
72. **Unused dependency**: `@electron-forge/plugin-auto-unpack-natives` (not in `forge.config.mts`).
73. **Unused code**: `TEXT_FILES` (`actions.ts:119`), `clashNote` (`tastes.ts`), `defaultStoreDir` and `prepareDependenciesCollect` (`dependencies.ts`), `touchRecent` and `missingRecents` (`projects.ts`), `isDraftDue` (`draft-schedule.ts`), the `readFile`/`writeFileAtomic` re-export at the end of `edit.ts`, the hidden `<span className="url">` in `StatusBar.tsx`, and five unused styles in `index.css` (`inspector-add-label`, `inspector-add-select`, `inspector-add-style-row`, `inspector-section-toggle`, `inspector-select-wrap`).
74. **Duplicate data in the screens**: `STARTER_FALLBACK` (`ProjectHome.tsx:3`) repeats `STARTER_TEMPLATES`; `CURATED_LINKS` (`LibraryPanel.tsx:102`) repeats `LINKS_SHELF`.
75. **Personal paths are back** in `scripts/capture-all-v1-screens.mjs` (`/Users/habibi/...`, six places) after the commit that said they were all removed. They are display data only.
76. **`.gitignore` is a generic template** (Next.js, Gatsby, Serverless, DynamoDB…) and lacks `.DS_Store`, which AGENTS.md says to exclude.
77. **`.github/ISSUE_TEMPLATE/task.yml`** exists though the project uses the local Markdown tracker.
78. **Menu items to review**: View → Reload and Toggle Developer Tools are available in the released app (Reload discards unsaved typing); Help → "Cauldron on GitHub" opens a private repository.
79. **Hundreds of inline styles** in the components (for example `Inspector.tsx:117-190`), next to a 2,535-line `index.css`. Low priority; makes the look harder to keep consistent.
80. **App version `0.0.1` is typed in twice** (`package.json` and `mcp.ts:406`).

---

## Suggested order of work

1. Items 1–5 (untrue messages) — small, self-contained, high trust value.
2. Items 9–11, 15 (file safety).
3. Items 7, 8, 12 (content and photo saving).
4. Item 51–55 (make the documents tell one true story) — do this before anyone else relies on them.
5. Item 14 (starter sites) — the first thing a new person sees.
6. Items 32–33 (freezing), then the rest of P1.
7. P3 clean-up, with item 66 decided before the repository goes public.

None of this is authorised work yet. Under `AGENTS.md`, each fix needs Billy's go-ahead and a ticket.
