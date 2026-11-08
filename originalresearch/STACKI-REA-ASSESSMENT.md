# Stacki — REA assessment (official download and evaluated build)

> **Superseded framing (6 Nov 2026):** Cauldron is our own application, not a fork or adaptation of Stacki ([ADR 0001](docs/adr/0001-own-application-not-a-fork.md)). Where this document recommends adapting or building on Stacki, read it as evidence of what works and what breaks. The findings stand; the "use Stacki as the foundation" conclusion does not.

## Historical result — foundation recommendation superseded by ADR 0001

REA was run on two Stacki builds:

1. **The build we evaluated, Stacki 1.0.12.** This is the compiled application in `evaluation/stacki/dist/`, from MIT commit `363b044f284c7875dfb674913d22a814b9ca62e2`, used in the hands-on test. It is a local build, not a packaged release.
2. **The official download, Stacki 0.0.23.** This is `Stacki-0.0.23-universal.dmg`, the latest GitHub release (6 April 2026). SHA-256 `d736b13cd23c24b5a4daa85cd078dd83aae5902528b45b7668b072b4ff4917f1`.

**Recommendation is unchanged:** adapt Stacki's MIT editor and preview foundation from the **repository source only**. Repair stylesheet and source saves, plus their Undo/Redo, first. Design agent operations using Sitereal's patterns, and use Zeku for content editing, recovery and conflict presentation. Electron and equal visual/agent prominence remain locked.

**New from the official download:** it is an older, different product generation. It is labelled `UNLICENSED`, contains no Astro handling and overwrites files without any checks. The Astro editor has no packaged release, so Stacki's packaging, signing and update path for it is untested.

No target code was executed, and neither app was installed or launched for this pass. Everything below comes from static analysis of compiled or shipped code.

## What ran

**1.0.12 build — three successful `analyze-javascript-application` passes, zero parse failures:**

- Core: `main.js`, `preload/preload.js`, `handlers/styleSourceHandlers.js`, `documents/documentWrites.js`, `handlers/pageHandlers.js`, `handlers/devServers.js`. `ev_d4810d3be5f60be68f96721d845b7ee7b1a37b835e03eeae7a4e5b97bca8ea61` (`analysis.json`).
- Boundary/document: `lib/ipcRegistrar.js`, `shared/ipc/ipcPayloads.js`, `app/windowSecurity.js`, `documents/documentActors.js`, `documents/documentDisk.js`, `documents/atomicWrite.js`. `ev_a74eaa7381626515f5754799080c99952c0e4e009f266796fbc2429af26d7fd1` (`boundaries-analysis.json`).
- Re-run of core plus preview/project handlers: `ev_a613f7213ece320a2156d0912938dc4d94c5a99a6cee0af9f3adf0d2fdeee0f5` (`build-1.0.12-analysis.json`). The preload exposes 180 members over 177 literal IPC channels.

**0.0.23 official download:**

- The DMG was mounted read-only (`hdiutil`, no Finder) and detached afterwards. REA cannot extract DMGs directly.
- `rea extract-artifact` on `app.asar`: `ev_4658cca7cac596c860ea0f5373583cad5dc7e9d08a7b80ea6e09b5182f948e4f`, with 4,212 files (4,195 in `node_modules`).
- `rea analyze-javascript-application` on the main process, preload, build script and canvas runtime: `ev_0071d49cee04e43dfc0f3f943ec02e83e5b83543363c84c7d68ce29362ebc7c3`. Zero parse failures; 23/23 literal renderer IPC calls were paired with handlers.

Supporting functions were read directly from the compiled files. All semantic graphs are **partial**, capped at 15,000 retained nodes, and cover the selected files only.

## Findings — 1.0.12 (the version we would adapt)

Paths are relative to `evaluation/stacki/dist/`.

### Page edits already use a strong, reusable operation model

`electron/handlers/pageHandlers.js:69–103` reads a file through its document manager and returns a checksum with the parsed page. An edit is submitted against the checksum it was based on, and the handler returns the new checksum plus inverse operations for Undo. Lines `112–138` check the current version before applying a batch.

`electron/documents/documentActors.js:75–85,93–141` separates full-text writes against an expected checksum from structured edits against a retained authored snapshot. Structured edits return their inverse.

**Implication:** keep this machinery and give agents a carefully scoped version of it. Do not route agent edits through an unversioned whole-file replacement just because it is easier to expose.

### Stylesheet and source saves drop the version they were based on — root cause of the data-loss bug

`shared/ipc/ipcPayloads.js:419` accepts only `filePath` and `css` for `style:writeFile`. `electron/handlers/styleSourceHandlers.js:67–71` forwards only the path and proposed text:

```
ipcMain.handle('style:writeFile', async (_event, { filePath, css }) => {
  … writeProjectText(abs, css);
```

`electron/documents/documentWrites.js:38–50` performs a checked write against the original only when `expectedSource` is supplied. Otherwise it calls `writeCurrent`. `documentActors.js:163–175` then re-reads the current disk contents and treats them as the base for the submitted text.

That protects against disk changes *during* the write, but cannot detect that the submitted CSS was based on an **older** version. Undoing a visual style edit submits an older complete stylesheet, which is accepted as the new file and wipes later outside edits. This matches the reproduced loss of `footer { padding-block: 56px }` exactly.

The general source save, `src:writeText`, has the same gap (`ipcPayloads.js:415`; `styleSourceHandlers.js:115–118`). It was not separately reproduced at runtime.

**Repair gate:** carry the authored file version through forward saves *and* Undo/Redo for both channels, then refuse or merge when disk no longer matches. This means fixing the caller contract and history semantics, not just the final filesystem write. Regression test: visual CSS edit, then an unrelated outside CSS edit, then Undo; the outside edit must survive. Sitereal's retained-baseline merge is a useful design reference.

### IPC goes through a validating registrar

`electron/main.js:87–88` passes a registration facade to handler modules. `electron/lib/ipcRegistrar.js:5–8` validates each payload with its per-channel parser before dispatch. REA's first scoped graph paired zero main-process handlers because registration goes through this facade. That reflects REA's inability to resolve indirect calls; IPC is not missing.

`electron/app/windowSecurity.js:11–28,33–46` contains link-navigation and permission policies. These are code observations, not proof of runtime enforcement.

### Preview frames receive the preload bridge

The main window sets `contextIsolation: true` and `nodeIntegration: false`, but also `nodeIntegrationInSubFrames: true` (`main.js:280–288`). That runs the preload inside preview iframes, the user's own site, so they can report page height. The source comment says the preload guards what each frame type gets; REA did not verify those guards. `sandbox` is not set explicitly on this window.

**Implication:** agents may add third-party scripts to a site, so the preview must never gain editing powers. Audit the frame-type guards and give preview frames a minimal, separate reporting channel. This is a static observation, not a demonstrated vulnerability.

### Preview lifecycle exists; the new-page 404 is still unexplained

`electron/handlers/devServers.js` covers preview startup, cancellation/stop, enhanced preview and a bare fallback. The live test proved the preview works, but a new page stayed on 404 until reload. This static pass did not establish why; it remains an open repair item.

## Findings — 0.0.23 (the official download)

- `package.json` declares `"license": "UNLICENSED"` and `"private": true`.
- The main process and 5 MB renderer bundle contain **zero** references to `astro`. The app saves `.html` entry files (`out/main/index.js:4236–4247`).
- `writeProjectFile` and `saveProjectFiles` (`index.js:4236–4260`) call `fs.writeFileSync` directly: no version check, no comparison with disk, no merge. External changes are silently overwritten.
- One window sets `sandbox: false` (`index.js:5197`).

**Implication:** do not judge or reuse Stacki from its official download. Reusable code comes only from the MIT repository; treat the 0.0.23 contents as research evidence.

## Comparison

| Concern | Stacki 1.0.12 (MIT) | Sitereal 1.0.2 (proprietary) | Zeku 0.1.31 (proprietary) |
|---|---|---|---|
| App shell | Electron | Electron plus a separate per-project engine | Tauri (Rust) |
| Outside-change protection | Versioned page edits; **stylesheet/source saves unversioned** | Retained baseline plus three-way merge; outside edits held | Baseline comparison; explicit "mine / disk" choice for unsaved files |
| Agent support | None built in | MCP bridge, grouped agent runs, conflict-aware agent undo | None, by design |
| Content collections | Schema-driven content handlers | Own content model | Reads `content.config.ts`; tracks schema freshness |
| Evidence | Static **and** hands-on runtime | Static only | Static only (frontend; native backend not decompiled) |
| Reuse | **Code reusable under MIT** | Ideas only | Ideas only |

## Limits and next tests

REA covered selected files only; the dependency tree and the full renderer were not semantically analysed. No claim of whole-app losslessness, production readiness or comprehensive security follows from these results. Runtime evidence remains in `STACKI-RUNTIME-EVALUATION.md`.

Next implementation tests:

1. Version-aware stylesheet saves.
2. Undo/Redo after outside edits.
3. Stale general source saves.
4. New-page preview refresh.
5. Preview-frame preload guards.
6. A packaged, unsigned Mac build of the Astro editor.
7. A first integrated-agent operation using the same selection- and version-aware actions as the visual controls.

## Evidence and handling

Everything is in `evaluation/rea-stacki/` (gitignored via `evaluation/`): raw REA results, the release DMG, the extracted release archive, and `earlier-STACKI-REA-ASSESSMENT.md`. That last file is the first version of this report; an interrupted turn wrote it and it was then replaced and merged here.
