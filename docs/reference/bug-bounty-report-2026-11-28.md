# Cauldron (`v0.150.0`) — Undocumented Bug Bounty Report

- **Target repository:** `cre8tivoz/cauldron`
- **Audited revision:** `61a17986c3072a5602567ed29ff58d8a1c2b90c1` (`v0.150.0`)
- **Audit date:** 2026-11-28
- **Last updated:** 2026-11-28 (through PR #65 `a4dac6b` + Batch A `M1`–`M4` in `fix/medium-lifecycle-processes-packaging`)
- **Environment:** Debian 12 (`x64`), Node.js `v26.13.0`, npm `12.2.2`
- **Scope & exclusions:** Full static audit across `src/main/`, `src/preview/`, and `src/components/`, with key parser, symlink, and state findings reproduced under Node `26.13.0`. Known/intentional items from `AGENTS.md`, `SECURITY_MODEL.md`, `docs/product/roadmap.md`, and `docs/architecture/` (macOS-only scope, unsigned/unnotarised builds, unblocked preview navigation, disabled stock-search UI, unimplemented Netlify deploy) are excluded.

## Remediation Progress

| Severity  |  Total |  Fixed |   Open | Merged PRs                                                                                                                                                                                              |
| --------- | -----: | -----: | -----: | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Critical  |      4 |      4 |      0 | [#58](https://github.com/cre8tivoz/cauldron/pull/58) (`C1`–`C4`)                                                                                                                                        |
| High      |     15 |     15 |      0 | [#59](https://github.com/cre8tivoz/cauldron/pull/59) (`H1`–`H6`), [#60](https://github.com/cre8tivoz/cauldron/pull/60) (`H7`–`H12`), [#61](https://github.com/cre8tivoz/cauldron/pull/61) (`H13`–`H15`) |
| Medium    |     22 |     13 |      9 | [#62](https://github.com/cre8tivoz/cauldron/pull/62) (`M17`–`M22`), [#63](https://github.com/cre8tivoz/cauldron/pull/63) (`M10`–`M16`) — open: `M1`–`M9`                                                |
| Low       |     13 |      0 |     13 | Open: `L1`–`L13` (note: `files.ts` `writeFileAtomic` random suffix from `L8` landed in [#58](https://github.com/cre8tivoz/cauldron/pull/58))                                                            |
| **Total** | **54** | **41** | **13** | All Critical, High, and Medium findings resolved; only Low (`L1`–`L13`) remain                                                                                                                          |

### Merged Remediation PRs

| PR                                                   | Scope                                                               | Merge Commit | Notes                                                                                                      |
| ---------------------------------------------------- | ------------------------------------------------------------------- | ------------ | ---------------------------------------------------------------------------------------------------------- |
| [#57](https://github.com/cre8tivoz/cauldron/pull/57) | Initial bug bounty report                                           | `5e0bcba`    | Added this audit report                                                                                    |
| [#58](https://github.com/cre8tivoz/cauldron/pull/58) | Critical `C1`–`C4`                                                  | `16205d4`    | Also hardened `writeFileAtomic` (`flag: 'wx'` + random suffix) per Codex review                            |
| [#59](https://github.com/cre8tivoz/cauldron/pull/59) | High `H1`–`H6` (Security & Isolation)                               | `e8c08b5`    | Also tightened leading-dot GitHub repo validation per Codex review                                         |
| [#60](https://github.com/cre8tivoz/cauldron/pull/60) | High `H7`–`H12` (Editing, Parsers & Undo)                           | `00b3884`    | Also handled JS regex literals in `skipExpressionBlock` and raw `<script>`/`<style>` text per Codex review |
| [#61](https://github.com/cre8tivoz/cauldron/pull/61) | High `H13`–`H15` (Renderer UI & State)                              | `1343990`    | Codex approved with no changes requested                                                                   |
| [#62](https://github.com/cre8tivoz/cauldron/pull/62) | Medium `M17`–`M22` (Renderer UI & Async State)                      | `58830b2`    | Also logged and surfaced `repoState()` refresh failures after publish per Codex review                     |
| [#63](https://github.com/cre8tivoz/cauldron/pull/63) | Medium `M10`–`M16` (Parsers, Content, History, SEO & Library)       | `0f00e3f`    | Also excluded Astro frontmatter from HTML comment masking in SEO per Codex review                          |
| [#64](https://github.com/cre8tivoz/cauldron/pull/64) | Bug bounty report status update                                     | `e511d83`    | Recorded progress through PR #63                                                                           |
| [#65](https://github.com/cre8tivoz/cauldron/pull/65) | Medium `M5`–`M9` (Preview, Quality, Publishing & Runtime)           | `a4dac6b`    | Per-frame compare partitions, `loadSeq` guards, URL parsers, runtime discovery                             |
| Batch A PR                                           | Medium `M1`–`M4` (Lifecycle, Processes & Packaging) + report update | _this PR_    | Resolves final Medium batch; all 41 Critical/High/Medium findings closed                                   |

## Summary by Subsystem

| Subsystem                                 | Critical |   High | Medium |    Low |
| ----------------------------------------- | -------: | -----: | -----: | -----: |
| Security, IPC, Preview Isolation & Agents |        2 |      4 |      4 |      2 |
| Editing, Parsers, Runs, Content & SEO     |        0 |      6 |      7 |      5 |
| Preview, Publishing, Quality & Runtime    |        2 |      2 |      5 |      4 |
| Renderer UI & State                       |        0 |      3 |      6 |      2 |
| **Total**                                 |    **4** | **15** | **22** | **13** |

---

## Critical Findings

### C1. Preview-to-Editor Sandbox Escape via DOM-Controlled `inline-text` and `reorder-sections` IPC _(Fixed in [PR #58](https://github.com/cre8tivoz/cauldron/pull/58) — `16205d4`)_

- **Location:** `src/preview/preload.ts:116-129, 346-372, 443-544, 672-691`; `src/main/index.ts:3022-3050, 3161-3262`
- **Root cause:** Although `src/main/preview.ts:30-32` states the preview can only report height and clicks, `ipcMain.on('preview:report')` accepts mutating write intents (`inline-text` and `reorder-sections`) directly from the preview without verifying `event.senderFrame.url` against `state.server.url`. Because `src/preview/preload.ts` shares the DOM with untrusted scripts in the previewed site:
  - After a single trusted keystroke sets `editingUserTouched = true`, a page script can mutate `editingEl.textContent`, `data-cauldron-source-file`, and `data-cauldron-source-loc` before `finishInlineEdit()` runs. `handleInlineTextEdit()` then calls `handlePick(edit)` to switch `state.selection` to the attacker-supplied file/location and immediately executes `writeSelection({ kind: 'text', value: edit.value })`.
  - During a section drag, a page script can call `history.replaceState` before `pointerup` so `window.location.href` points to a different route; `handleCanvasSectionReorder()` fetches a fresh `baseHash` for that route and commits `reorderPageSections` without confirmation.
  - The floating selection pill (`pillEl`) is appended directly to `document.body` rather than a closed Shadow DOM, allowing page scripts to reposition or tamper with its buttons.
- **Trigger:** Open an Astro site whose client script watches for `data-cauldron-editing="1"`, rewrites `data-cauldron-source-file`/`data-cauldron-source-loc` to another `.astro`/`.html`/`.md`/`.mdx` file and replaces `textContent`, then waits for the user to finish editing.
- **Recommended fix:** Enforce `event.senderFrame.url` origin matching `state.server.url` on every `preview:report` message; bind inline edits strictly to the already-validated `state.selection` without calling `handlePick()` on untrusted payloads; isolate overlay UI in a closed Shadow DOM.

### C2. Dangling Symlink Escape & Arbitrary File Write Outside Site Root (`isInside` & `writeDirection`) _(Fixed in [PR #58](https://github.com/cre8tivoz/cauldron/pull/58) — `16205d4`)_

- **Location:** `src/main/files.ts:68-85`; `src/main/directions.ts:924-952`
- **Root cause:**
  - `isInside()` checks `if (fs.existsSync(absolute)) return fs.realpathSync(absolute);`. Because `fs.existsSync()` follows symlinks, it returns `false` for **dangling symlinks** (whose target does not yet exist). `real()` then falls through to `path.join(real(parent), path.basename(absolute))` without resolving the symlink target, returning `true` even when the link points outside `root` (verified in Node `26.13.0`).
  - `writeDirection()` only calls `isInside(root, folder)` on `<root>/cauldron` and writes `tokens.css`, `DESIGN.md`, and `design.json` via raw `fs.writeFileSync` without checking whether those files are symlinks or using atomic rename.
- **Trigger:** Open a site containing a symlink at `cauldron/tokens.css` (or `DESIGN.md` / `design.json`) pointing outside the site root, then apply a design direction (`cauldron:set-direction` or `cauldron:reference-direction`).
- **Recommended fix:** Use `fs.lstatSync` in `isInside()` to detect symlinks (including dangling ones) and resolve their targets via `fs.readlinkSync` before verifying containment. In `writeDirection()`, reject symlinks via `lstatSync` and write with `writeFileAtomic`.

### C3. Git Flag Injection Leading to Local Command Execution in `publish` / `publishAsync` _(Fixed in [PR #58](https://github.com/cre8tivoz/cauldron/pull/58) — `16205d4`)_

- **Location:** `src/main/publishing.ts:509-514, 587-592` (remote selection at `169-178, 264-265, 312`)
- **Root cause:** When no upstream tracking branch is set, `publish` and `publishAsync` run `git push --set-upstream <remote> <branch>` without `--` and without rejecting `-`-prefixed remote or branch names. `pickRemoteFromConfigs` returns the sole configured remote name verbatim from `git remote`.
- **Trigger:** Opening a malicious repository whose `.git/config` defines a single remote named `--receive-pack=<cmd>` or `--exec=<cmd>` causes `git push` to parse the remote name as a CLI flag and execute `<cmd>` locally when the user publishes.
- **Recommended fix:** Reject remote and branch names starting with `-` (validate against strict ref/remote allowlists) and pass `--` where supported.

### C4. Package Manager Flag Injection via Permissive `pkgNameRe` and Missing `--` _(Fixed in [PR #58](https://github.com/cre8tivoz/cauldron/pull/58) — `16205d4`)_

- **Location:** `src/main/dependencies.ts:557, 710-734, 749-750`
- **Root cause:** `pkgNameRe` (`^(?:@[a-z0-9-~][a-z0-9-._~]*\/)?[a-z0-9-~][a-z0-9-._~]*$`) includes a literal `-` in the leading character class, allowing CLI flags such as `--userconfig`, `--prefix`, `--global`, or `-g` to pass validation. `planMissingPackageInstall` appends `...packages` directly to `npm install`, `pnpm add`, and `yarn add` without `--`.
- **Trigger:** An untrusted Astro site imports `--userconfig` alongside a local `rc` file; `findMissingPackages` sorts results lexicographically (`-` before `a-z`), both pass `pkgNameRe`, and the package manager parses the first argument as an option taking the second as its value.
- **Recommended fix:** Disallow leading `-` and `.` in `pkgNameRe` (start with `[a-z0-9~]`) and insert `--` before package names.

---

## High Findings

### Security & Isolation

#### H1. CLI Argument Injection via Unvalidated `sessionId` from Agent Output _(Fixed in [PR #59](https://github.com/cre8tivoz/cauldron/pull/59) — `e8c08b5`)_

- **Location:** `src/main/agent.ts:238-239, 330-346, 446, 480-495, 510`; `src/main/index.ts:1568-1575`
- **Root cause:** `normaliseClaude()` and `normaliseJsonLines()` extract `session_id`/`thread_id`/`message.id` directly from untrusted agent stdout JSON without validation. On subsequent turns, `runAgent()` passes `sessionId` as a positional argument (`['exec', 'resume', sessionId, prompt, ...]`) without `--`, allowing a `-`-prefixed ID to inject CLI flags.
- **Trigger:** A prompt-injected or hostile agent emits a JSON line with a `-`-prefixed `thread_id`; the next user turn injects that flag into the spawned CLI.
- **Recommended fix:** Validate `sessionId` against `/^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/` and pass `--` before positional arguments where supported.

#### H2. MCP Per-Session Access Code Exposed in Process `argv` and Persisted in Hermes `.env` _(Fixed in [PR #59](https://github.com/cre8tivoz/cauldron/pull/59) — `e8c08b5`)_

- **Location:** `src/main/agent.ts:36-56, 431-445, 452-468, 537-544`; `src/main/mcp.ts:78-94`
- **Root cause:** Although `mcp.ts` deletes legacy `mcp-codes.json` to keep `x-cauldron-code` in memory, `runAgent()` embeds `options.mcp.code` directly in CLI arguments for Claude (`--mcp-config` JSON) and Codex (`-c mcp_servers.cauldron.http_headers=...`), exposing it to any local process via `ps`. For Hermes, `writeHermesConnection()` writes `CAULDRON_MCP_CODE` to `~/.hermes/profiles/cauldron/.env` and never removes it on site close or app quit.
- **Trigger:** Run any Claude or Codex job and inspect `ps -axo args`, or inspect `~/.hermes/profiles/cauldron/.env` after quitting Cauldron.
- **Recommended fix:** Pass the MCP secret via environment variables or a `0600` temp file cleaned up on exit, and scrub `CAULDRON_MCP_URL`/`CAULDRON_MCP_CODE` from the Hermes `.env` on close/quit.

#### H3. `</style>` Breakout & Arbitrary Markup Injection in `editCssRule` _(Fixed in [PR #59](https://github.com/cre8tivoz/cauldron/pull/59) — `e8c08b5`)_

- **Location:** `src/main/actions.ts:1255-1274, 1310-1326`
- **Root cause:** `editCssRule()` validates `cleanProp` and `cleanValue` against `{`, `}`, `;`, and `</style>`, but `normalizedTarget = normalizeCssSelector(selector)` only strips comments and collapses whitespace. When no existing rule matches, `normalizedTarget` is interpolated verbatim inside `.astro` `<style>` blocks.
- **Trigger:** Call `edit_css_rule` with selector `</style><script>alert(1)</script><style>.x` on an `.astro` page (verified: injects an executable `<script>` tag outside `<style>`).
- **Recommended fix:** Reject `selector` values containing `{`, `}`, `;`, `@import`, or `</style>` (case-insensitive).

#### H4. SSRF, Shared Default Session, and Unbounded Buffering/Hang in `directionFromUrl` & `downloadAndSaveStockPhoto` _(Fixed in [PR #59](https://github.com/cre8tivoz/cauldron/pull/59) — `e8c08b5`)_

- **Location:** `src/main/reference.ts:7-37, 99-102`; `src/main/assets.ts:189-267`
- **Root cause:**
  - `directionFromUrl()` only checks `http:`/`https:` (no loopback/RFC 1918/link-local block, no redirect guard), uses Electron's `session.defaultSession` without a dedicated `partition` or `configurePreviewSecurity()`, and runs `await document.fonts.ready` inside `executeJavaScript()` with no timeout.
  - `downloadAndSaveStockPhoto()` (`cauldron:save-stock-photo`) has no host allowlist or private-IP check, uses `redirect: 'follow'`, and buffers chunked responses with `await response.arrayBuffer()` before checking `MAX_STOCK_PHOTO_BYTES` (25 MB).
- **Trigger:** Pass a loopback/internal URL or stalling-font page to `cauldron:reference-direction`, or pass an `https://` redirect to localhost or an unbounded chunked stream to `cauldron:save-stock-photo`.
- **Recommended fix:** Isolate `directionFromUrl` in an ephemeral `partition`, call `configurePreviewSecurity()`, validate resolved IPs across redirects, and bound `document.fonts.ready`. Restrict `downloadAndSaveStockPhoto` hosts, re-validate redirects, and stream-read with a hard byte cap.

#### H5. Quality Check `inspectionWindow` Shares Default Session Without Lockdown; `serveDist` Symlink Traversal & Unhandled Stream Crash _(Fixed in [PR #59](https://github.com/cre8tivoz/cauldron/pull/59) — `e8c08b5`)_

- **Location:** `src/main/quality.ts:448-469, 711-725`
- **Root cause:**
  - `inspectionWindow()` creates a `BrowserWindow` without an isolated `partition` and without `configurePreviewSecurity()`, letting untrusted site scripts call `window.open()` and share `session.defaultSession`.
  - `serveDist` checks path containment lexically (`file.startsWith(dist + path.sep)`) without `fs.realpathSync` and pipes `fs.createReadStream(file).pipe(response)` without an `'error'` listener (an unreadable file, broken symlink, or directory named `index.html` crashes the Electron main process).
- **Trigger:** Place a symlink in `public/` pointing outside the site (or to a missing target) or include `window.open()` in a site, then run Quality Checks.
- **Recommended fix:** Give `inspectionWindow` an ephemeral `partition` and `configurePreviewSecurity()`; canonicalize paths with `fs.realpathSync` in `serveDist`, check `stat.isFile()`, and handle read-stream `'error'` events.

#### H6. Flag Injection, API Path Traversal, and Unquoted Shell Interpolation in `deployGitHubPagesAsync` _(Fixed in [PR #59](https://github.com/cre8tivoz/cauldron/pull/59) — `e8c08b5`)_

- **Location:** `src/main/publishing.ts:1184-1194, 1371-1386, 1413-1418, 1439-1518`
- **Root cause:** `parseGitHubRepoFromRemote` matches `([^/\s]+\/[^/\s]+?)`, allowing leading `-` (flag injection into `gh repo view/create`), `..`, `?`, or `#` into `gh api repos/${repoSlug}/pages`. Line 1417 passes `-c credential.helper=!${ghBin} auth git-credential`, which `git` runs via `/bin/sh -c` without quoting `ghBin`.
- **Trigger:** Deploy a repo with a crafted `origin` URL (e.g. `https://github.com/--flag/repo` or `https://github.com/owner/repo?x=y`), or run with `gh` in a path containing spaces/metacharacters.
- **Recommended fix:** Restrict `parseGitHubRepoFromRemote` to `/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/` (rejecting `.`, `..`, and leading `-`) and shell-quote `ghBin`.

### Editing, Parsers & Undo Integrity

#### H7. Inline `style` Editing Self-Corrupts Styles Containing Quotes or HTML Entities _(Fixed in [PR #60](https://github.com/cre8tivoz/cauldron/pull/60) — `00b3884`)_

- **Location:** `src/main/edit.ts:316-326, 509-516`
- **Root cause:** `applyEdit` (`kind: 'style'`) writes escaped entities (`&quot;`, `&#39;`, `&amp;`), but on the next edit passes the raw un-decoded `styleAttribute.value` into `parseStyle()`, which splits blindly on `;`—slicing through `&quot;`/`&#39;` and double-escaping leftovers.
- **Trigger:** Set `font-family: '"Source Sans 3", sans-serif'` on `<p>Hello</p>`, then set `color: 'red'`. Verified output: `<p style="font-family: &amp;quot; color: red">Hello</p>`.
- **Recommended fix:** Decode HTML entities before parsing `style`, and split declarations outside quoted strings and `url(...)`.

#### H8. Empty Frontmatter (`---\n---\n`) Breaks Frontmatter Parsing in SEO and Section Editing _(Fixed in [PR #60](https://github.com/cre8tivoz/cauldron/pull/60) — `00b3884`)_

- **Location:** `src/main/seo.ts:177, 284-286, 734-796, 876-880`; `src/main/actions.ts:399, 473`
- **Root cause:** `/^---\r?\n([\s\S]*?)\r?\n---[ \t]*(?:\r?\n|$)/` requires two newlines around the body, so `---\n---\n` (which `createPageFile` generates) does not match. Without a later `---`, `ensureLayoutSupportsSeoProps` prepends a duplicate `---` fence; with a later `---` (such as a Markdown horizontal rule), the regex swallows body content as frontmatter (verified).
- **Recommended fix:** Allow empty frontmatter via `/^---\r?\n(?:([\s\S]*?)\r?\n)?---[ \t]*(?:\r?\n|$)/`.

#### H9. Conflict Check (`baseHash`) Silently Bypassed When Adding a New Attribute _(Fixed in [PR #60](https://github.com/cre8tivoz/cauldron/pull/60) — `00b3884`)_

- **Location:** `src/main/actions.ts:916-932, 1373-1386`; `src/main/edit.ts:462-471`; `src/main/index.ts:1385-1399`
- **Root cause:** `expected.attributes` only contains attributes present at selection time (plus `style: ''`). In `runAction`, `Boolean(request.expected)` disables the `disk.hash !== baseHash` check, and `applyEdit` only checks conflicts when `operation.name in expected.attributes`. Adding a new attribute (`alt`, `href`, `class`) silently overwrites concurrent disk edits to that attribute (verified).
- **Recommended fix:** Record explicit absence (`undefined`/`null`) or verify the attribute is still absent on disk when `!(operation.name in expected.attributes)` and `disk.hash !== baseHash`.

#### H10. `findClosingTag` Matches Tags Inside HTML Comments, Strings, and Astro Expressions _(Fixed in [PR #60](https://github.com/cre8tivoz/cauldron/pull/60) — `00b3884`)_

- **Location:** `src/main/edit.ts:236-265`; callers in `src/main/actions.ts:540-546, 636-651, 680-686`
- **Root cause:** Scans raw text with `/<(/?)${tag.name}(?=[\s/>])/gi` without skipping `<!-- ... -->`, `<script>`/`<style>`, quoted attributes, or `{ ... }`.
- **Trigger:** `deletePageSection` on `<section><!-- </section> --><p>Real</p></section>` deletes up to the commented tag, leaving ` --><p>Real</p></section>` (verified).
- **Recommended fix:** Tokenize/skip HTML comments, quoted strings, raw text elements, and Astro expressions while balancing tags.

#### H11. `ensureLayoutSupportsSeoProps` Corrupts Nested `interface Props` and `Astro.props` Object Defaults _(Fixed in [PR #60](https://github.com/cre8tivoz/cauldron/pull/60) — `00b3884`)_

- **Location:** `src/main/seo.ts:737-786`
- **Root cause:** `interface\s+Props\s*\{([\s\S]*?)\}` stops at the first `}` inside nested object types (`author?: { name: string }`), and `const\s*\{([^}]*)\}\s*=\s*Astro\.props` fails on `{ ... }` default values and appends a duplicate destructuring (verified).
- **Recommended fix:** Balance braces `{ ... }` (respecting strings/comments) when locating `interface Props` and `Astro.props` destructuring.

#### H12. Any File Created by Cauldron's Editor During an Agent Run Permanently Blocks Run Undo _(Fixed in [PR #60](https://github.com/cre8tivoz/cauldron/pull/60) — `00b3884`)_

- **Location:** `src/main/runs.ts:386-396, 407, 413-422`
- **Root cause:** For a file absent at run start, `wasHash` is `null`, while `outside` stores `firstBefore` as a string (`hashOf('')` or `''`). Line 416's `other.firstBefore !== wasHash` is always `true`, marking the file `uncertain` and causing `Runs.undo()` to refuse (verified).
- **Recommended fix:** Preserve `null` for newly created files in `firstBefore` (or treat `wasHash === null && other.firstBefore === hashOf('')` as matching).

### Renderer UI & State

#### H13. Uncontrolled Inspector Attribute Inputs Keyed Only by `attribute.name` Bleed Values Across Elements _(Fixed in [PR #61](https://github.com/cre8tivoz/cauldron/pull/61) — `1343990`)_

- **Location:** `src/components/Inspector.tsx:528-565` (`key={`attr-row-${attribute.name}`}` at line 531, `defaultValue={attribute.value}` at line 542)
- **Root cause:** Switching selection between two elements sharing `href`, `class`, `src`, `alt`, or `id` (or pressing Undo) reuses the DOM `<input>` with the stale value. Focusing and blurring triggers `onApplyAttribute` with the previous element's value, silently overwriting the new element.
- **Recommended fix:** Key attribute rows by `${selection.id}:${attribute.name}:${attribute.value}` (matching style override inputs at line 468) or make the inputs controlled.

#### H14. Draft Recovery State Desyncs: Stale `unsavedEdits` After Restore, Over-Broad Clear on `apply()`, Leak on Conflict Resolution _(Fixed in [PR #61](https://github.com/cre8tivoz/cauldron/pull/61) — `1343990`)_

- **Location:** `src/App.tsx:396-408, 605-644, 758-825, 1146-1186`
- **Root cause:**
  - Restoring drafts does not prune `draftValues.current` or reset `unsavedEdits`, leaving Publish blocked (`unsavedBuffers > 0`), triggering false "Unsaved edits" dialogs on site switch, and re-uploading restored drafts on the next edit.
  - `apply()` clears _every_ key in `draftValues.current` instead of only the applied field/element, deleting unrelated buffered drafts.
  - `keepMine()` and `useDisk()` never clear `draftValues.current`, `draftTimer.current`, `unsavedEdits`, or recovery storage.
- **Recommended fix:** Prune only the restored/applied/resolved draft keys from `draftValues.current` and update `unsavedEdits = draftValues.current.size` in all three paths.

#### H15. Compare Widths Native Views Cover `<ConfirmDialog>` Modals and Get Stuck When Toggling Sidebars _(Fixed in [PR #61](https://github.com/cre8tivoz/cauldron/pull/61) — `1343990`)_

- **Location:** `src/App.tsx:546-582, 1291-1305`; `src/components/PreviewStage.tsx:79-126`
- **Root cause:** `App.tsx` hides the single preview `WebContentsView` on `modalBlockingPreview`, but never hides Compare Widths views. In `PreviewStage`, `ResizeObserver` observes only `slotRefs.current` (which unmount when `tooNarrow` becomes `true`), so collapsing the Agent or Inspector sidebar never flips `tooNarrow` back to `false` or re-attaches observers.
- **Recommended fix:** Pass `modalBlockingPreview` to `PreviewStage` to hide compare views while modals are open; observe `stageRef.current` directly and include `tooNarrow` in the effect dependencies.

---

## Medium Findings

| ID  | Status                                                          | Area       | Location                                                                                                                 | Issue                                                                                                                                                                                                                    |
| --- | --------------------------------------------------------------- | ---------- | ------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| M1  | Fixed (Batch A)                                                 | Lifecycle  | `src/main/index.ts:931, 1522, 3380-3463`                                                                                 | `finishAgentRun` clears `state.agent` before async teardown/build, allowing a second run or site switch to race and push old `buildError` onto a new site.                                                               |
| M2  | Fixed (Batch A)                                                 | Processes  | `src/main/agent.ts:550, 608-621`; `src/main/dependencies.ts:237-302`; `src/main/index.ts:4139-4142, 4238-4245`           | `before-quit` exits before detached agent `SIGKILL` escalation and skips `state.installPackages`; `prepareDependencies` isn't `detached`, orphans child processes on cancel, and emits `progress` after terminal `done`. |
| M3  | Fixed (Batch A)                                                 | Actions    | `src/main/actions.ts:903-913, 1331-1401`                                                                                 | `runAction` calls `expectedFor()` (`fs.readFileSync`) before `writeChecked()` checks file existence/extension, throwing uncaught `ENOENT`/`EISDIR`.                                                                      |
| M4  | Fixed (Batch A)                                                 | Packaging  | `src/main/index.ts:179-185, 681-685`                                                                                     | `CAULDRON_TEST_USER_DATA` (`--use-mock-keychain`) and `CAULDRON_TEST_AI_BASE_URL` remain active in packaged production builds.                                                                                           |
| M5  | Fixed ([PR #65](https://github.com/cre8tivoz/cauldron/pull/65)) | Quality    | `src/main/taste-check.ts:494-772`                                                                                        | `debugger.attach('1.3')` is outside `try/finally`; a mid-probe exception leaves the debugger attached and breaks all remaining taste checks in the same quality run.                                                     |
| M6  | Fixed ([PR #65](https://github.com/cre8tivoz/cauldron/pull/65)) | Compare    | `src/main/preview-compare.ts:286-318`                                                                                    | All compare frames share partition `'cauldron-preview-compare'` on the same origin, so per-origin `setZoomFactor` overwrites sibling frames.                                                                             |
| M7  | Fixed ([PR #65](https://github.com/cre8tivoz/cauldron/pull/65)) | Preview    | `src/main/preview.ts:110-129`; `src/main/preview-compare.ts:90-113`                                                      | `ERR_ABORTED` catch retries `loadURL` without a navigation token, so rapid navigation can snap back to a stale page.                                                                                                     |
| M8  | Fixed ([PR #65](https://github.com/cre8tivoz/cauldron/pull/65)) | Publishing | `src/main/publishing.ts:1053-1065, 1196-1200, 1456-1458`                                                                 | `parseVercelUrl` misses `Production:`/`Aliased:` colons; `parseGitHubPagesUrl` drops custom `CNAME` domains (`*.github.io`-only regex).                                                                                  |
| M9  | Fixed ([PR #65](https://github.com/cre8tivoz/cauldron/pull/65)) | Runtime    | `src/main/runtime.ts:67-150, 196-241`                                                                                    | `nodePath` ignores `PATH`/`fnm`/`volta`/`mise`; `firstExisting` accepts executable directories; `loginShellDirs` breaks on `fish` (space-separated `$PATH`) and noisy shell banners.                                     |
| M10 | Fixed ([PR #63](https://github.com/cre8tivoz/cauldron/pull/63)) | Responsive | `src/main/responsive-css.ts:230-260, 326-337, 611-628`                                                                   | Strips `[data-cauldron-r="..."]` off compound selectors leaving invalid CSS (`@media (...) { body }`) and duplicates/resurrects rules outside managed markers.                                                           |
| M11 | Fixed ([PR #63](https://github.com/cre8tivoz/cauldron/pull/63)) | Content    | `src/main/content.ts:192-194, 369-372`                                                                                   | Schema-less ISO dates (`2026-11-28`) match `/^[-\d.]+$/`, get inferred as `number`, and fail `saveEntry` validation.                                                                                                     |
| M12 | Fixed ([PR #63](https://github.com/cre8tivoz/cauldron/pull/63)) | Content    | `src/main/content.ts:33-44, 158-176, 277, 306, 405`                                                                      | `z.array(z.number())` / `z.array(z.enum(...))` misclassified because scalar checks precede `z.array(`; `z.coerce.date()` becomes `unknown`; CRLF frontmatter fails.                                                      |
| M13 | Fixed ([PR #63](https://github.com/cre8tivoz/cauldron/pull/63)) | History    | `src/main/history.ts:102-139, 194-204`                                                                                   | `writtenSince()` includes undone entries above `this.cursor` and misses manual Undos of pre-run edits.                                                                                                                   |
| M14 | Fixed ([PR #63](https://github.com/cre8tivoz/cauldron/pull/63)) | SEO        | `src/main/seo.ts:430-496, 581-598, 913-921`                                                                              | String-concatenation props (`{"Home" + " \| " + site}`) are parsed as editable literals; `inspectHead()` edits inside `<!-- ... -->` HTML comments.                                                                      |
| M15 | Fixed ([PR #63](https://github.com/cre8tivoz/cauldron/pull/63)) | Library    | `src/main/library.ts:645-649`                                                                                            | `addPiece()` checks `startsWith('---\n')` instead of `/^---\r?\n/`, prepending a duplicate frontmatter block on CRLF `.astro` pages.                                                                                     |
| M16 | Fixed ([PR #63](https://github.com/cre8tivoz/cauldron/pull/63)) | Actions    | `src/main/actions.ts:782-796`; `src/main/responsive-css.ts:135-151`                                                      | `duplicatePageSection` writes `cauldron/responsive.css` directly without undo `History` or MCP `checkedFiles` tracking.                                                                                                  |
| M17 | Fixed ([PR #62](https://github.com/cre8tivoz/cauldron/pull/62)) | UI         | `src/App.tsx:1163-1171`                                                                                                  | Stray copy-pasted "Cancel install" button renders inside the "Unsaved edits" draft banner.                                                                                                                               |
| M18 | Fixed ([PR #62](https://github.com/cre8tivoz/cauldron/pull/62)) | UI         | `src/components/PublishPanel.tsx:42-78`; `src/components/QualityPanel.tsx:40-50`                                         | Missing `try/finally` around IPC calls permanently locks Publish / Run checks buttons on rejection.                                                                                                                      |
| M19 | Fixed ([PR #62](https://github.com/cre8tivoz/cauldron/pull/62)) | UI         | `src/components/QualityPanel.tsx:335-347`                                                                                | Agent `<select>` is missing the `"key"` ("Your AI key") option.                                                                                                                                                          |
| M20 | Fixed ([PR #62](https://github.com/cre8tivoz/cauldron/pull/62)) | UI         | `src/components/LibrarySpecimen.tsx:25-35`                                                                               | Stale closure captures `available` container height at mount time (freezing at `0` inside closed `<dialog>`s and ignoring vertical window resizes).                                                                      |
| M21 | Fixed ([PR #62](https://github.com/cre8tivoz/cauldron/pull/62)) | UI         | `src/components/AgentPanel.tsx:368-390`                                                                                  | Per-run "Install missing packages" button swallows failures and ignores the returned `site` update.                                                                                                                      |
| M22 | Fixed ([PR #62](https://github.com/cre8tivoz/cauldron/pull/62)) | UI         | `src/App.tsx:206-227, 314-363, 1088-1107`; `src/components/SeoPanel.tsx:80-121`; `src/components/ContentPanel.tsx:34-55` | Async race conditions on rapid site/page switching (`setSite`, `seoRead`, `collections`/`entry`) and stale `ContentPanel` / `installError` state when switching sites or opening a site with 0 collections.              |

---

## Low Findings

- **L1 (`src/main/ai-agent.ts:154-170`):** `trimHistory(messages, 40)` wipes the entire BYOK conversation history to `[]` after any 20+ step turn (`KEY_AGENT_MAX_STEPS = 24` produces up to 49 messages, slicing off the initial `user` message).
- **L2 (`src/main/taste-check.ts:49-51`):** `focusOutcome` interpolates `${input.invisible}` instead of `${failedCount}`, reporting `"0 reached control(s)..."` when all failures are low-contrast focus rings.
- **L3 (`src/main/runs.ts:279-333`):** `Runs.load()` drops persisted `directEdits` and overwrites in-flight `running` run files on disk as `failed` before checking `activeIds`.
- **L4 (`src/main/actions.ts:840-854`):** `insertPageSection` (`afterIndex: -1`) on a sectionless layout-wrapped page appends after `</Base>` instead of inside it.
- **L5 (`src/main/content.ts:215, 260, 313-316, 354-357`):** `schemaHash` mismatch between `readCollections()` and `readEntry()`/`saveEntry()` blocks saves when both `src/content.config.ts` and `src/content/config.ts` exist.
- **L6 (`src/main/edit.ts:72-85, 584-604`):** `differsOnlyOnce()` is a tautology (always returns `true`); `parseTag()` spread-attribute parsing breaks on `"}"` inside strings.
- **L7 (`src/main/site.ts:234-242, 296-299`):** `ps -o lstart=` omits `LC_ALL=C`, causing `Date.parse` to return `NaN` on non-English locales and skipping orphaned Astro dev-server cleanup.
- **L8 (`src/main/ai-keys.ts:182-186`; `src/main/projects.ts:71-76` — `src/main/files.ts` fixed in [PR #58](https://github.com/cre8tivoz/cauldron/pull/58)):** Deterministic temp filenames (`process.pid` or static `.cauldron-tmp`) risk same-process races on concurrent async IPC calls.
- **L9 (`src/main/preview-compare.ts:148-152`):** `setFrames` drops removed views from `this.views` without deleting stale entries from `this.errors` and `this.zoomFor`.
- **L10 (`src/main/quality.ts:681-687`):** `runAxe` awaits `document.fonts.ready` with no timeout and calls `animation.effect.getComputedTiming()` without guarding `animation.effect === null`.
- **L11 (`src/main/publishing.ts:791-797, 994-1002`):** Default Cloudflare Pages slug allows leading hyphens when folder names start with `-`, `_`, or whitespace.
- **L12 (`src/components/DesignPanel.tsx:44, 85-87, 113-117`):** Renders error messages (`result.problem`) with green `notice good` styling and no `role="alert"`.
- **L13 (`src/components/AssetTray.tsx:48-66, 142-174`; `src/components/PageOutline.tsx:429-455, 568-580, 719-840`; `src/App.tsx:1342`):** `App.tsx` drops `targetPage` when jumping from Outline to Library; `AssetTray` upload dropzone lacks keyboard/button semantics and doesn't reset `<input type="file">` value; `PageOutline` icon buttons and inputs lack `aria-label`s.
