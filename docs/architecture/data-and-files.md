# Cauldron architecture: data and files on disk

This document lists what Cauldron writes and where. Read `docs/architecture/overview.md` first for the process and IPC model.

The governing rule is simple: **the site on disk is the product, and the app's own state lives in the OS user-data directory, never inside the user's site.** Cauldron does write some files inside the site it edits, but those are site files meant to travel with it — design tokens, a design document, the Cauldron-managed block in a responsive stylesheet, copied components, uploaded images. Library records, thumbnails, run records, drafts, conflict copies, AI settings and dev-server PIDs are app state. They stay out of the site.

Two roots, never mixed:

| Root                                 | Examples                                                            | Lifetime                                                                                |
| ------------------------------------ | ------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| The site folder chosen by the person | `src/pages/`, `cauldron/tokens.css`, `public/images/`               | Travels with the site, builds without Cauldron, may be version-controlled by the person |
| `app.getPath('userData')`            | `recent-projects.json`, `runs/`, `recovery/`, `project-thumbnails/` | App state, safe to throw away between sessions, never needed by the built site          |
| `app.getPath('appData')/Cauldron`    | `pnpm-store/`                                                       | Shared download store, deliberately outside any site and outside test user data         |

## What a created site contains

`createProject()` in `src/main/projects.ts` creates the folder exclusively with `fs.mkdirSync(root, { mode: 0o755 })`; an existing path is never written into. The tested Astro version is pinned in `src/main/index.ts` as `ASTRO_VERSION_TESTED` (`7.4.7`), and `createProject()` writes it exactly into `package.json`.

The built-in starters come from `STARTER_TEMPLATES` in `src/main/templates.ts`: `sunday-table`, `penta`, `good-trade`, `the-desk` and `minimal`. A named starter writes its layout and pages through `getTemplateFiles()` and saves its design direction with `writeDirection()`. The `minimal` path writes `MINIMAL_STARTER_CSS` into `cauldron/tokens.css` and uses the default layout. `validateProjectName()` refuses separators, dotfiles, control characters and names over 100 characters, so a new project is always one plain folder inside the chosen parent.

| Path in the site                                  | Written by                                                                                          | Purpose                                                                                                                                       |
| ------------------------------------------------- | --------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `package.json`                                    | `createProject()`                                                                                   | Plain Astro manifest with `dev`, `build` and `preview` scripts; declares `packageManager` when pnpm is available                              |
| `astro.config.mjs`, `tsconfig.json`, `.gitignore` | `createProject()`                                                                                   | Ordinary Astro project files; `.gitignore` excludes `node_modules/`, `dist/` and `.astro/`                                                    |
| `src/pages/`                                      | `createProject()`, `getTemplateFiles()`, `createPageFile()` in `src/main/actions.ts`                | Pages. `listPages()` walks this folder to build routes and the page list                                                                      |
| `src/layouts/`                                    | `createProject()`, starter templates                                                                | Layouts, including `Base.astro` in the built-in starters                                                                                      |
| `src/components/`                                 | Starter templates, `addPiece()` in `src/main/library.ts`                                            | Ordinary editable `.astro` components. Library pieces are copied in, not linked                                                               |
| `src/styles/`                                     | Optional, from the site or an agent                                                                 | The only CSS folder whole-file source actions accept                                                                                          |
| `src/content/` and `src/content.config.ts`        | The site and the person                                                                             | Content collections. `src/main/content.ts` also accepts `src/content/config.ts` and `src/content/config.js` as schema locations               |
| `cauldron/tokens.css`                             | `writeDirection()` in `src/main/directions.ts`, or `MINIMAL_STARTER_CSS` in `src/main/templates.ts` | Colour, type, spacing and font tokens under `--cauldron-*`; the site's stylesheets import it                                                  |
| `cauldron/DESIGN.md`                              | `writeDirection()`                                                                                  | The direction brief the agent reads                                                                                                           |
| `cauldron/design.json`                            | `writeDirection()`                                                                                  | Machine-readable direction record: `id`, `name` and the token object                                                                          |
| `cauldron/responsive.css`                         | `src/main/responsive-css.ts` (`RESPONSIVE_CSS_REL`)                                                 | Responsive edits, wrapped between `/* cauldron:responsive:start */` and `/* cauldron:responsive:end */`; only that managed block is rewritten |
| `public/images/`                                  | `saveAssetFile()` in `src/main/assets.ts`                                                           | Uploaded and dropped images, saved into the site as ordinary assets                                                                           |

`node_modules/`, `dist/`, `.astro/` and the other build folders are produced by installs and builds, not by the app's editor. `snapshot()` in `src/main/runs.ts` skips them when it hashes a site.

## App state in user data

`app.getPath('userData')` is the root for app state. Test harnesses can point it elsewhere with `CAULDRON_TEST_USER_DATA`; `src/main/site.ts` and `src/main/runs.ts` also read a `globalThis.__cauldronUserData` override for unit tests.

| Path under user data               | Shape                                                                                                                    | Owner                                                                                                                                          |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `recent-projects.json`             | JSON list of `{ path, name, addedAt, lastOpenedAt }`                                                                     | `recentsStorePath()` in `src/main/index.ts`; read and written by `loadRecents()`, `addRecent()` and `removeRecent()` in `src/main/projects.ts` |
| `project-thumbnails/<hash>.jpg`    | One JPEG per project, named from the first 24 hex characters of the SHA-256 of its canonical path                        | `thumbnailFilePath()` in `src/main/thumbnails.ts`; captures come from `Preview.captureThumbnail()` in `src/main/preview.ts`                    |
| `runs/<hash>/`                     | Per-site run history. `<hash>` is the first 12 hex characters of the SHA-256 of the site root                            | `siteRunsDir()` in `src/main/runs.ts`                                                                                                          |
| `runs/<hash>/<run-id>.json`        | One persisted `Run` record: tool, prompt, timestamps, status, changed files with hashes, ownership, highlights and notes | `Runs.persist()`                                                                                                                               |
| `runs/<hash>/blobs/<sha256>`       | Content-addressed pre-run copies of files that actually changed                                                          | `Runs.start()`, read back by `readBeforeBlob()` for undo                                                                                       |
| `recovery/<hash>.json`             | Typed-but-unsaved edits for one site. `<hash>` is the first 16 hex characters of the SHA-256 of the site root            | `fileFor()`, `saveDrafts()` and `loadDrafts()` in `src/main/recovery.ts`                                                                       |
| `conflicts/<timestamp>-<filename>` | A copy of the current disk text when a person chooses to keep their own version                                          | `saveConflictCopy()` in `src/main/index.ts`                                                                                                    |
| `ai/settings.json`                 | Provider and model choice for the built-in AI key agent                                                                  | `KeyStore` in `src/main/ai-keys.ts`                                                                                                            |
| `ai/keys/<provider>.bin`           | Encrypted key material via Electron `safeStorage` async APIs                                                             | `KeyStore`; the renderer sees settings and a per-provider boolean, never key bytes                                                             |
| `preview-servers.json`             | Tracked dev-server PIDs, roots, ports and process start times                                                            | `recordDevServerPid()` and `removeDevServerPid()` in `src/main/site.ts`                                                                        |

One store sits outside user data on purpose: `pnpmStoreDir()` in `src/main/index.ts` returns `app.getPath('appData')/Cauldron/pnpm-store`. It is shared by all projects and survives a change of test user-data folder, so dependency preparation can reuse downloaded packages. It is passed to installs with `--store-dir`; no global package-manager settings are changed.

`KeyStore` in `src/main/ai-keys.ts` creates `ai/keys/` and `settings.json` lazily. It uses Electron's async `safeStorage` calls for encryption. `cauldron:ai-status` returns the provider and model settings, whether the keychain is available, and a boolean per provider; key bytes never cross the bridge.

## How a site becomes a recent project

`recordRecent()` in `src/main/index.ts` calls `addRecent()` with the site root. It runs in two places: `openSiteAt()` records any folder that passes `detectSite()`, even when the open is then refused for missing dependencies, and the `cauldron:create-project` handler records a newly created project. `addRecent()` deduplicates by `canonicalProjectPath()`, which resolves symlinks, and moves the entry to the front with a fresh `lastOpenedAt`.

`cauldron:projects-home` reads the store and adds live detail for the cards: whether the folder still exists (`missing`), whether its Astro binary is present (`prepared`), a cached thumbnail data URL, and a palette read from the site's own `cauldron/tokens.css` by `readProjectThemePalette()` in `src/main/thumbnails.ts`.

`loadRecents()` in `src/main/projects.ts` treats a missing file as an empty library, but a file that cannot be read or parsed is reported and left exactly where it is. A failed save returns a problem saying the projects themselves are untouched. This is the general pattern for app state: damage is surfaced, never silently repaired by deleting data.

A missing folder keeps its entry so the person can remove it. `removeRecent()` changes only the store; `cauldron:remove-recent` also removes the cached thumbnail. Neither touches the project folder.

Thumbnails are written after a debounced preview capture from the home page. `scheduleThumbnailCapture()` skips a capture when the preview is showing a Vite error overlay, and only overwrites an existing thumbnail while the preview URL is the site root. A JPEG is capped at 512 KB by `MAX_THUMBNAIL_BYTES`.

`Preview.captureThumbnail()` in `src/main/preview.ts` returns null unless the view is visible and at least 160 × 120 px. It captures the child view's own page, resizes to 480 px wide and encodes JPEG quality 82. A parent-window screenshot is not a substitute: native `WebContentsView` children are omitted from it, which is why thumbnail and comparison captures are taken from each child.

## Runs, drafts and undo backups

A run is an agent job kept reviewable. `Runs.start()` in `src/main/runs.ts` takes a streamed SHA-256 snapshot of the site and copies the current bytes of every file into `blobs/` under its hash.

The snapshot skips `node_modules`, `.git` and `.pnpm-store` at any depth, and the build folders (`dist`, `.astro`, `.vercel`, `.netlify`, `.output`, `build`, `out` and others) at the root. Unreadable paths are recorded as problems; they are not silently treated as unchanged.

`Runs.finish()` takes a second snapshot, diffs hashes and records each changed file as `added`, `changed` or `removed`, with `ownership` of `run`, `outside` or `uncertain`. Files edited by Cauldron's own controls during the run are listed in `outside` and left alone. Files that could not be read, or whose ownership cannot be established, are `uncertain` and block undo.

`Runs.undo()` checks every file and every backup before writing anything. A clash with the file's post-run hash or an uncertain file refuses the whole run. Only the most recent 30 undoable runs keep their blobs; `pruneUnusedBlobs()` skips pruning when a site's history failed to load, so damaged data is never quietly discarded. A run interrupted before finishing is loaded as `failed` with an honest note, not left running.

When Cauldron started the run itself, `finish()` also receives the post-action hashes of files changed through checked actions. A changed file missing from that map, or with a different final hash, is listed in `directEdits`: an edit made outside the stale-file guards. The run record keeps this as a fact rather than treating every difference as the agent's work.

Separately, `History` in `src/main/history.ts` holds the editor's own changes in memory: before and after text and hashes, a `created` flag for new files, and the site root for containment checks. `sharedAction()` in `src/main/index.ts` records a change there for each successful action. Undo re-applies the earlier text only if the current file still matches; a created file is deleted only if unchanged, and redo recreates it only when the path is still inside the same site and still absent. When the file has moved on, `mergeRegion()` takes 80 characters of context either side of the original change and re-applies it only if that context appears exactly once; otherwise undo refuses.

Draft recovery is for text typed in the interface but not yet saved. `saveDrafts()` writes the list to user data, outside the site, so a crash cannot leave Cauldron's working files in a person's repo. A missing file means no saved edits; a damaged file is reported rather than treated as empty.

Each `Draft` in `src/main/recovery.ts` records `key`, `file`, `line`, `column`, `name`, `field`, `value`, `savedAt` and optional `baseHash` and `schemaHash`. The key is `file:line:column:field` in the renderer, so one field on one element has one draft. `clearDrafts()` deletes the file when the last unsaved edit is resolved; restoring a draft goes back through the hash-checked action path.

Dev-server PIDs are another app-state file with strict checks. `recordDevServerPid()` stores the PID, root, port, start time and process start string in `preview-servers.json`. `cleanupOrphanedDevServers()` sends `SIGTERM`, then `SIGKILL` after 600 ms, but only to a process whose start time, Astro dev flags and site ownership all match the record. A stale or borrowed PID is dropped from the file without a signal.

## App-written files and the person's files

The app writes these files inside the site: the `cauldron/` design files and managed responsive block, pages and components it creates or copies, image uploads in `public/images/`, and frontmatter or SEO fields saved through `saveEntry()` and `seoSave()` in `src/main/content.ts` and `src/main/seo.ts`. They are ordinary files the person can edit; the site owns them.

Everything else in the site belongs to the person or to their build tools. Cauldron does not keep an in-memory mirror that it later syncs over those files. When a save is based on old text, it is refused with a conflict rather than applied; a conflict copy can be kept in user data if the person chooses to reapply their edit.

`saveConflictCopy()` in `src/main/index.ts` writes to `userData/conflicts/` with an ISO timestamp in the filename, so a series of conflicts overwrites nothing. `saveContent()` can then apply `keepMine`: the current disk version is preserved as a copy and the person's edit is re-applied on top of it. Otherwise a stale save is refused outright. The site file is changed only through that explicit choice.

## What Cauldron does not write into the site

`sourceAt()` in `src/main/actions.ts` is the boundary for whole-file writes: only `.astro` under `src/pages`, `src/layouts` or `src/components`, and `.css` under `src/styles`. Package manifests, scripts, configuration and image assets are outside that boundary. `saveAssetFile()` is the deliberate asset exception, and it writes only into `public/images/` with a cleaned filename and an exclusive create.

Library pieces are copied into `src/components/` as plain Astro files (`addPiece()` in `src/main/library.ts`); they are not a runtime dependency on Cauldron. The source-writing boundary does not include the site's `package.json`, and the app does not add a Cauldron runtime package to it. It never installs packages into the site without an explicit consent step in the interface. A site built by Cauldron builds and runs with Cauldron closed.

On open, `openSiteAt()` replaces `state.runs` with a fresh `Runs` and calls `load(detected.root)`. That reads each `<run-id>.json` in the site's runs folder, marks interrupted runs as failed, and prunes unused blobs only when the history was read completely. A damaged record is named in a problem message; the remaining records stay available.

Canonical paths matter for two caches. `canonicalProjectPath()` resolves symlinks before `addRecent()` and before `thumbnailFilePath()` hashes the path, so two paths to the same folder share one library entry and one thumbnail. `isInside()` resolves existing ancestors before comparing, so a swapped symlink cannot redirect a write outside the open site.

## Safety rules the layout implies

- **Hash-conflict refusal.** `readFile()` in `src/main/files.ts` returns the text and its SHA-256. Whole-source writes (`writeSource()` in `src/main/actions.ts`), content saves, SEO saves, section edits and draft restores all require a `baseHash` from a matching read. A stale hash returns a problem, often with the current disk text; it never overwrites.
- **Atomic writes.** `writeFileAtomic()` writes a sibling named `.${basename}.cauldron-${pid}` and renames it into place, so a half-written file is never published. `createFileAtomic()` uses a unique temporary sibling and a hard link that fails with `EEXIST` if the destination appeared in the meantime. Thumbnails, run records, development state and `recent-projects.json` use the same staging-then-rename pattern.
- **Exclusive creation.** `createProject()` uses a non-recursive `mkdir`, so a racing or existing folder is left untouched. `createFileAtomic()` and the null-hash rule for `writeSource()` give new files the same guarantee.
- **Containment.** `isInside()` in `src/main/files.ts` resolves existing ancestors before comparing paths. `sourceAt()` adds extension and folder rules and refuses symlinked source files. `validateProjectName()` in `src/main/projects.ts` keeps a new project as one plain folder inside the chosen parent.
- **Undo before overwrite.** `History.undo()`, `History.redo()` and `Runs.undo()` verify the current file and the saved backup before any write; a refusal leaves the site unchanged. Recovery drafts and conflict copies exist for the same reason: nothing is silently lost when two writers touch one file.

Deleting the user-data folder loses the library, thumbnails, drafts, run backups and AI settings. It does not touch any site. Removing a run's blobs by hand makes that run's undo unavailable: `canUndo()` checks that each backup exists before offering it.
