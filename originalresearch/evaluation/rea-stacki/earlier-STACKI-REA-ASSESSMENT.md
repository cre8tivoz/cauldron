# Stacki 1.0.12 — REA assessment of the built application

## Result and provenance

REA was run against the **compiled application used in the earlier hands-on evaluation**, under `evaluation/stacki/dist/`, at source commit `363b044f284c7875dfb674913d22a814b9ca62e2`. This is a local build, not a separately downloaded official release or a packaged-release audit. The checkout was clean before this analysis. No source changes, rebuild, install or app launch were needed.

**Recommendation remains:** adapt Stacki's MIT editor/preview foundation, repair the stale stylesheet write and undo paths first, and design agent operations using the concrete patterns found in Sitereal. Use Zeku to inform content editing, recovery and conflict presentation. Electron and equal visual/agent prominence remain locked.

## Actual REA execution

Ran `analyze-javascript-application` twice with explicit source selection and bounded analysis resources:

1. `electron/main.js`, `electron/preload/preload.js`, `electron/handlers/styleSourceHandlers.js`, `electron/documents/documentWrites.js`, `electron/handlers/pageHandlers.js`, `electron/handlers/devServers.js`.
2. `electron/lib/ipcRegistrar.js`, `shared/ipc/ipcPayloads.js`, `electron/app/windowSecurity.js`, `electron/documents/documentActors.js`, `electron/documents/documentDisk.js`, `electron/documents/atomicWrite.js`.

Both calls completed successfully with six parsed files and zero parse failures each. Twelve distinct compiled JavaScript files were selected across the two passes. Supporting functions were read directly from those compiled files. Raw results are in `evaluation/rea-stacki/analysis.json` and `boundaries-analysis.json`.

- Core analysis: `ev_d4810d3be5f60be68f96721d845b7ee7b1a37b835e03eeae7a4e5b97bca8ea61`.
- Boundary/document analysis: `ev_a74eaa7381626515f5754799080c99952c0e4e009f266796fbc2429af26d7fd1`.
- Recorded compiled-directory artifact identity: `0d480c31871269e63feadec6affba9d5400b6b8b087030b79eaa38d0d0195f30`.

## Concrete findings

Paths below are relative to `evaluation/stacki/dist/`.

### Page edits already use a useful shared operation model

`electron/handlers/pageHandlers.js:69–103` reads the file through its document manager, returns a checksum with the parsed page, submits a visual/code edit against the checksum it was authored against, and returns the new checksum plus inverse operations for Undo. `112–138` checks the current version before applying a batch and returns inverse operations after a successful write.

`electron/documents/documentActors.js:75–85,93–141` distinguishes full-text writes against an expected checksum from structured edits against a retained authored snapshot. Applied structured edits return the inverse splices.

**Cauldron implication:** preserve this connected editing machinery and expose a carefully scoped version of it to agents. Rebuilding page editing from scratch is unnecessary. Do not route agent edits through an unversioned generic file replacement just because it is easier to expose.

### The stylesheet boundary loses the information needed to detect stale proposals

`shared/ipc/ipcPayloads.js:419` accepts only `filePath` and `css` for `style:writeFile`. `electron/handlers/styleSourceHandlers.js:67–70` forwards only the path and proposed text to `writeProjectText`.

`electron/documents/documentWrites.js:42–49` chooses `writeCurrent` when no expected source was supplied. `electron/documents/documentActors.js:163–175` then refreshes the current disk snapshot and treats that snapshot as the base of the proposed replacement.

That distinction matters: it protects against disk changes during the commit operation, but it cannot establish that the submitted CSS was based on the refreshed disk content. A stale editor/history snapshot can therefore be accepted as the desired new text. This is consistent with, and helps explain, the previously reproduced stylesheet-Undo data loss; this static pass did not rerun the GUI reproduction.

The sibling `src:writeText` payload and handler also carry only the desired text (`shared/ipc/ipcPayloads.js:415`; `styleSourceHandlers.js:115–118`). Its stale-draft risk should be covered by the same repair design. No separate runtime data-loss reproduction was performed for that channel.

**Repair gate:** carry authored file versions through forward writes and Undo/Redo, and test preservation of unrelated outside edits. Fix the caller contract/history semantics, not just the final filesystem write.

### The native boundary has explicit parsing; automatic zero counts are not an absence finding

`electron/main.js:87–88` passes a registration facade to handler modules. `electron/lib/ipcRegistrar.js:5–8` validates each incoming payload through the per-channel parser before dispatching it.

REA's first scoped graph reported zero main handlers paired with the preload transmissions. Direct compiled-code reading shows why this must not be treated as missing IPC or a vulnerability: registration passes through an injected facade rather than a direct Electron call in each handler. REA explicitly leaves dynamic/indirect relationships unresolved.

`electron/app/windowSecurity.js:11–28,33–46` contains browser-link/app-navigation and private-permission policies. These are code observations, not proof that every runtime window enforces every policy. This was not a security audit.

**Cauldron implication:** keep narrow parsed operations and project-path checks when introducing agent access. Distinguish payload validation, path containment, origin/sender validation and execution permission rather than calling the whole boundary “safe”.

### Preview lifecycle exists; the new-page problem remains a separate repair

`electron/handlers/devServers.js` contains preview startup, cancellation/stop handling, enhanced-preview startup and a bare fallback path. The earlier live evaluation proved that the actual Astro preview worked, but also showed a new page remaining on 404 until reload.

The static inspection does not establish the cause of that refresh failure. Keep it as an unresolved lifecycle defect; do not promote a timing hypothesis to a root-cause claim.

## Comparison and resulting direction

- **Stacki:** the reusable MIT visual editor, Astro preview, page operations and existing desktop machinery. Both code evidence and earlier runtime evidence exist. Stylesheet/history safety needs repair.
- **Sitereal:** actual bundled code demonstrates a per-project engine serving visual/MCP operations, retained baselines and guarded merging, per-item stale-write responses, and grouped agent-run undo with later-change conflict checks. The direct code-save merge and generated-write merge use different conflict-side preferences; do not assume blanket losslessness or copy its implementation.
- **Zeku:** recovered frontend code demonstrates typed-schema freshness, dirty-buffer conflict choices, recovery checkpoints, preview states and unsaved-tab guards around Git actions. Its native Rust backend was not decompiled, so atomic writes, Git command details and process cleanup remain unknown. Its Tauri stack does not reopen the locked Electron decision.

The three tools have complementary roles. Stacki's earlier hands-on result is stronger runtime evidence than the other two static assessments, but that does not make their implementation lessons irrelevant.

## Limits and next implementation tests

The REA graphs cover selected files only and are explicitly partial; the entire dependency tree and renderer were not semantically analysed. Target code was not executed during this pass. Stacki's earlier runtime tests are retained separately in `STACKI-RUNTIME-EVALUATION.md`. No claim of whole-app losslessness, production readiness or comprehensive security follows from these results.

Next implementation tests remain: version-aware stylesheet saves; Undo/Redo after outside edits; stale generic source saves; new-page preview refresh; and a first integrated-agent operation using the same selection/version-aware action layer as the visual controls.
