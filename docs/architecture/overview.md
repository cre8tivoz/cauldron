# Cauldron architecture: the running app

Cauldron is an Electron + React + TypeScript Mac desktop app (version 0.150.0, MIT) for building real Astro sites. This document describes the shape of the running app: which context owns what, how a change travels from the interface to a file, and where a developer should make a change. `AGENTS.md` and `docs/adr/` hold the working rules and the decisions behind them; this document describes the code as it stands.

Read `docs/architecture/data-and-files.md` alongside it for the files themselves.

## Three execution contexts

| Context        | Where the code lives                                                                                                                                                        | What it owns                                                                                                                                                                |
| -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Electron main  | `src/main.ts` calls `start()` in `src/main/index.ts`; the rest of `src/main/*.ts`                                                                                           | The `BrowserWindow`, the application menu, every IPC handler, the site's dev server, file writes, agent jobs, the local MCP connection, runs, history and app state on disk |
| React renderer | `src/renderer.tsx` mounts `App` from `src/App.tsx` under `ErrorScreen` and `StrictMode`; screens and controls in `src/components/`, shared types in `src/cauldron-types.ts` | The interface, selection and draft UI, measuring the preview stage, and calling the main process through `window.cauldron`                                                  |
| Astro preview  | Hosted by `src/main/preview.ts`, with one extra view per breakpoint in `src/main/preview-compare.ts`; its page-side preload is `src/preview/preload.ts`                     | Showing the built site in a native `WebContentsView`, observing clicks and edits, and reporting intent back to main                                                         |

The preview is its own native view, not a React component. `Preview.attach()` in `src/main/preview.ts` creates a `WebContentsView` with the partition `cauldron-preview`, adds it to the window's content view, and calls `configurePreviewSecurity()` to deny new windows and all device permissions. `PreviewCompare.createView()` does the same with the partition `cauldron-preview-compare`, deliberately separate so Chromium's per-host zoom in one session cannot override the other. Each view has its own Chromium renderer process; no site page shares the editor's context.

The site itself runs in a fourth, short-lived child process: `startDevServer()` in `src/main/site.ts` spawns the site's own `node_modules/.bin/astro dev`. The preview loads that local URL. The app does not parse or render Astro itself.

## Startup and the window

`src/main.ts` is three lines: it calls `start()` from `src/main/index.ts`. `start()` asks for the single-instance lock and quits if another copy already holds it; a `second-instance` event focuses the existing window instead of opening a second one. Once `app.whenReady()` fires, it runs `cleanupOrphanedDevServers()`, registers IPC and creates the window through `createWindow()`.

The main window refuses in-app navigation with `will-navigate`, and `setWindowOpenHandler()` sends `http:` and `https:` links to `shell.openExternal()` while denying the new window. The editor renderer loads into that one `BrowserWindow`; `src/renderer.tsx` mounts `App` into `#root` and wraps it in `ErrorScreen`, so a renderer error surfaces as a screen rather than a blank window.

The build is split by `forge.config.mts` and the Vite configs: `vite.main.config.mts` defines `__CAULDRON_E2E__` so production packages drop the harness, `vite.preload.config.mts` builds both `preload.js` and `preview-preload.js`, and `vite.renderer.config.mts` applies the React plugin. Forge packages for macOS (`darwin`) with ASAR and Electron fuses.

## Who owns the preview rectangle

The renderer owns the geometry; main only places the native view.

`src/App.tsx` holds `stageRef`, measures the `.stage` element with `getBoundingClientRect()`, and sends the rectangle through `window.cauldron.setPreviewBounds()`. A `ResizeObserver` and a window `resize` listener call the same measure function, so a splitter drag or panel collapse updates the native view without a React re-render of the view itself. `computePreviewBounds()` in `src/preview-viewport.ts` narrows the rectangle to 768px or 375px for tablet and phone presets and centres it; desktop uses the full stage width.

The `cauldron:preview-bounds` handler in `src/main/index.ts` passes the rectangle to `Preview.setBounds()` in `src/main/preview.ts`. That method rounds the numbers, clamps width and height to zero or more, calls `view.setBounds()`, and sets visibility from the result. **Zero width or height means hidden.** `src/App.tsx` sends `{ x: 0, y: 0, width: 0, height: 0 }` when compare mode is on, when a modal dialog is open, or when the active view is not `build`. A native child view sits above DOM content, so it must be hidden rather than covered. Compare mode uses the same idea from the other side: `src/components/PreviewStage.tsx` measures its own columns and sends frame rectangles to `cauldron:preview-compare`; main places those views and never reloads them on a geometry update.

## The IPC surface

`src/preload.ts` is the only bridge from the renderer to main. It builds one `api` object, exposes it with `contextBridge.exposeInMainWorld('cauldron', api)`, and exports its type as `CauldronApi`. `src/declarations.d.ts` declares `Window.cauldron` as that type, so the renderer gets typed calls and typed event names. The event names are the `EVENTS` list in `src/preload.ts`; `api.on()` refuses any channel outside that list and returns an unsubscribe function.

The main window is created with `contextIsolation: true`, `nodeIntegration: false` and `sandbox: true` in `src/main/index.ts`. The preview views set the same flags. The renderer has no filesystem, child-process or dialog power: the native folder picker, installs, publishing and every file write are main-process handlers.

The channels are grouped by job in `src/preload.ts`:

| Group              | Representative calls                                                                                                                              |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| Projects           | `openSiteDialog`, `openSite`, `projectsHome`, `createProject`, `chooseProjectParent`, `detectDependencies`, `prepareDependencies`, `removeRecent` |
| State and preview  | `state`, `startPreview`, `stopPreview`, `reloadPreview`, `openPreviewPage`, `setPreviewBounds`, `setCompareFrames`, `pickMode`                    |
| Editing            | `applyText`, `applyAttribute`, `applyStyle`, `forceWrite`, `undo`, `redo`, `refreshSelection`, `runAction`                                        |
| Runs               | `startRun`, `finishRun`, `undoRun`, `runs`, `highlight`, `actionCatalogue`                                                                        |
| Design and content | `directions`, `direction`, `setDirection`, `collections`, `entry`, `saveEntry`, `seoList`, `seoSave`, `addPiece`, `qualityRun`                    |
| Publishing         | `repoState`, `publish`, `exportStatic`, `deployCloudflare`, `deployVercel`, `deployGitHubPages`                                                   |
| Agent and AI key   | `agentSend`, `agentCancel`, `aiStatus`, `aiSettings`, `aiSaveKey`, `aiRemoveKey`, `aiTest`                                                        |
| Drafts             | `contentDraft`, `saveDrafts`, `mergeDrafts`, `removeDrafts`, `discardDrafts`, `restoreDraft`, `restoreAllDrafts`                                  |

Most calls are `ipcRenderer.invoke()` requests answered by an `ipcMain.handle()`; main pushes state changes back on the event channels in `EVENTS`. `aiSaveKey()` is one-way: the key goes in and is never handed back.

The `handle()` wrapper in `src/main/index.ts` runs each editing handler through `isAuthorizedEditorIpc()`, which accepts a call only from the editor window's own main frame. A script in the previewed site cannot call those handlers. In the other direction, the `preview:report` listener checks that the sender is the main preview or a compare frame and that the message comes from its main frame. It accepts only `pick`, `height`, `inline-text` and `reorder-sections` reports; main validates each one before writing anything. `src/preview/preload.ts` exposes no `cauldron` API to the site.

## The site's dev server and build

`detectSite()` in `src/main/site.ts` checks that the folder exists, has a `package.json`, has an Astro dependency or config, and has `src/pages`.
`startDevServer()` then spawns `astro dev --host 127.0.0.1 --port <port>`, preferring port 4321 and falling back to an ephemeral one.

It waits for the local URL on stdout, gives up after 60 seconds, and refuses to start when dependencies are missing. `childEnvForTools()` in `src/main/runtime.ts` supplies a usable PATH for a GUI launch, and `ASTRO_DEV_BACKGROUND` stops Astro 7 from detaching itself.

Spawned PIDs are recorded in user data so `cleanupOrphanedDevServers()` can reclaim them after a crash; that check runs at startup. Before signalling a tracked PID, `isOwnedAstroProcess()` checks its start time, its command line for the Astro dev flags and its working directory. A reused PID or another tool's process is pruned without being killed. `stopPreview()` in `src/main/index.ts` stops the child, closes the MCP connection and hides the view.

`Preview.load()` in `src/main/preview.ts` retries once on `ERR_ABORTED`, which Astro's route watcher can cause while a navigation is in flight. A genuine failure reaches the interface as a problem; the compare views record their own failures rather than showing an empty column as success.

Builds go through the site's own package-manager script. `buildSiteAsync()` in `src/main/quality.ts` spawns it asynchronously with a 300-second timeout and returns the log and `dist` path. `refreshSiteHealth()` in `src/main/index.ts` uses a static import scan, then a real build to confirm a suspected missing package before reporting a problem. `checkSite()` in the same quality module measures the built site rather than guessing from source.

## Actions: one way to change a site

`src/main/actions.ts` defines `ActionRequest` and `runAction()`. This is the single set of actions used by the inspector, the agent panel and outside agents. The `cauldron:run-action` handler in `src/main/index.ts` routes renderer calls into `sharedAction()`, which calls `runAction()`, records the change in `History`, and refreshes the selection. Agent calls reach the same function through the local MCP server in `src/main/mcp.ts`: `toolsFor()` defines the tools, `toRequest()` turns tool arguments into an `ActionRequest`, and the server calls `runAction()` on the main thread. `actionCatalogue()` generates the agent's tool list from those same definitions. This is ADR 0006: the actions run inside the open app, so an outside agent needs Cauldron open.

Edits go through actions rather than direct writes for three reasons:

- **Checked paths.** `sourceAt()` in `src/main/actions.ts` limits whole-file reads and writes to `.astro` under `src/pages`, `src/layouts` or `src/components` and `.css` under `src/styles`. It refuses absolute paths, dot segments, symlinks and paths outside the site.
- **Checked versions.** Element, CSS and source writes require the hash returned by the matching read. A changed file is refused with a reason and the current text, not silently overwritten. New files require an explicit null hash and are created exclusively.
- **Shared undo and run ownership.** `sharedAction()` records every successful write in `History`; writes from the agent connection are tagged so a run never claims the person's own edits. Read-only actions such as `readSource` are listed in `isReadOnlyAction()` and do not claim ownership during a run.

Element edits are narrower again. `writeChecked()` in `src/main/actions.ts` accepts only `.astro`, `.html`, `.md` and `.mdx` files, compares the hash, and passes an `expected` text and attribute map to `applyEdit()` in `src/main/edit.ts`. If the hash has moved on, the action stops and returns the current disk text; it does not guess a new expectation from the changed file. Section actions (`reorderPageSections()`, `deletePageSection()`, `setPageSectionAnchor()` and the rest) take a page name and a `baseHash`, resolve the page with `resolvePageFile()`, and return the updated section list and new hash.

The preview can ask for an edit, but it cannot perform one. The `inline-text` and `reorder-sections` reports are turned into the same hash-checked action requests by handlers in `src/main/index.ts`.

## Files are the truth

There is no private working copy of the site. Reads go to disk and writes go back to disk through the actions layer. The preview is a view of the dev server's output; selection maps back to source through Astro's `data-astro-source-file` and `data-astro-source-loc` attributes, which `src/preview/preload.ts` copies under `data-cauldron-*` before Astro moves its own annotations. Design direction is saved in the site (`cauldron/tokens.css`, `cauldron/DESIGN.md`, `cauldron/design.json` from `writeDirection()` in `src/main/directions.ts`). Library pieces are copied into the site as editable files by `addPiece()` in `src/main/library.ts` (ADR 0007). A site built by Cauldron works without Cauldron.

`History` and `Runs` keep before/after text, hashes and content-addressed backups, but those exist for undo. They are not a competing copy that gets synced back.

`openSiteAt()` in `src/main/index.ts` makes the order explicit: stop the old preview, detect and record the new site, reset `History` and `Runs`, load saved runs, push a site snapshot to the renderer, start the preview, then refresh site health. `readSiteStateSnapshot()` reads recovery drafts and the saved direction; a damaged file is returned as a problem rather than reported as "nothing saved" or "no direction". Problems from those reads, the preview and the run history are joined into one message so a later status line cannot bury an earlier failure.

Every state change is pushed on an event channel. `cauldron:site` carries the site summary, drafts and direction; `cauldron:status`, `cauldron:problem`, `cauldron:selection`, `cauldron:history` and `cauldron:drafts` carry the rest. The renderer keeps a view of that state for its controls, but never writes it back to disk itself.

## Quality and taste checks

`src/main/quality.ts` runs the measured checks: layout overflow, keyboard use, axe accessibility rules, broken links, speed and how closely a page follows the site's own direction. Its findings carry a status (`pass`, `fail`, `unknown`, `info`) and a kind (`measured`, `failure`, `opinion`), so a measured result is never confused with a design judgement.

`checkSite()` takes a site root, the current direction, the pages to check and, for a run review, only the files that run changed. It calls `buildSiteAsync()` first; a failed build returns one `fail` finding with the tail of the log. The axe engine is bundled at build time from `axe-core/axe.min.js?raw`, because a packaged app has no `node_modules` to read from.

`src/main/taste-check.ts` supplies the taste rules and `measureTaste()`: focus outcomes, visually hidden elements, emoji-as-icon detection, side stripes and interaction properties. `src/main/contrast.ts` does the colour maths: `contrastRatio()`, `judgeFocus()` and the approved thresholds `TEXT_CONTRAST` 4.5, `LARGE_TEXT_CONTRAST` 3, `BUTTON_CONTRAST` 4.5 and `FOCUS_CONTRAST` 3. `src/main/taste-change.ts` narrows the same checks to a run's changed CSS. Taste is a version-one pillar (ADR 0005); the thresholds are not to be relaxed to make a check pass.

## Where to change what

| Task                                                 | Files that own it                                                                                    |
| ---------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| Add or rename an IPC call                            | `src/preload.ts`, `src/declarations.d.ts`, the handlers in `src/main/index.ts`                       |
| Change preview placement or breakpoint widths        | `src/App.tsx`, `src/components/PreviewStage.tsx`, `src/preview-viewport.ts`, `src/main/preview.ts`   |
| Change what the previewed page may report            | `src/preview/preload.ts`, the `preview:report` listener in `src/main/index.ts`                       |
| Add a compare-view behaviour                         | `src/main/preview-compare.ts`, `src/components/PreviewStage.tsx`                                     |
| Change dev-server startup or crash cleanup           | `src/main/site.ts`, `src/main/runtime.ts`                                                            |
| Add a site-editing action                            | `src/main/actions.ts`, `src/main/mcp.ts`, `sharedAction()` in `src/main/index.ts`                    |
| Change starter files or direction tokens             | `src/main/templates.ts`, `src/main/directions.ts`, `src/main/responsive-css.ts`                      |
| Change run records or undo safety                    | `src/main/runs.ts`, `src/main/history.ts`                                                            |
| Change recent projects, thumbnails or recovery files | `src/main/projects.ts`, `src/main/thumbnails.ts`, `src/main/recovery.ts`, `src/main/index.ts`        |
| Change quality or contrast checks                    | `src/main/quality.ts`, `src/main/taste-check.ts`, `src/main/contrast.ts`, `src/main/taste-change.ts` |
| Change packaging or process fuses                    | `forge.config.mts`, `vite.main.config.mts`, `vite.preload.config.mts`, `vite.renderer.config.mts`    |

Run `npm run check` before packaging: electron-vite strips types without checking them, so a successful `npm run package` says nothing about compile errors.

Do not add a second bridge. A new renderer capability belongs in `src/preload.ts` with a guarded handler in `src/main/index.ts`; a new piece of page-side observation belongs in `src/preview/preload.ts` and must stay intent-only.
