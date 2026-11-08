# Cauldron Astro - Foundation assessment

> **Superseded framing (6 Nov 2026):** Cauldron is our own application, not a fork or adaptation of Stacki ([ADR 0001](docs/adr/0001-own-application-not-a-fork.md)). Where this document recommends adapting or building on Stacki, read it as evidence of what works and what breaks. The findings stand; the "use Stacki as the foundation" conclusion does not.

**Follow-up:** the hands-on evaluation is now complete; see [STACKI-RUNTIME-EVALUATION.md](STACKI-RUNTIME-EVALUATION.md). Build and core editing worked. Stylesheet undo was reproduced discarding an unrelated external change; a new-page preview also required a manual reload. The source-only assessment below is retained as its original evidence baseline.

## Historical assessment after runtime and REA work — superseded recommendation

The source-only baseline below is historical. Hands-on Stacki testing and actual application-code REA analysis are now complete; there is no remaining requirement to repeat the initial foundation evaluation before planning adaptation.

- [Stacki REA](STACKI-REA-ASSESSMENT.md): evaluated 1.0.12 build (three passes) and the official 0.0.23 download analysed. Version-aware page editing is reusable; stylesheet and general source saves omit the version they were based on, the root cause of the reproduced stylesheet-Undo data loss, which is still unfixed. Reuse only the MIT repository source: the official download is an older `UNLICENSED` HTML-only app.
- [Sitereal REA](SITEREAL-REA-ASSESSMENT.md): shared project engine/MCP operations, retained file baselines, guarded merges, stale-list responses and conflict-aware grouped agent undo were found in the shipped code. Its conflict-side policy differs between save paths; it is no blanket safety guarantee.
- [Zeku REA](ZEKU-REA-ASSESSMENT.md): recovered frontend confirms schema freshness, unsaved-content conflict handling, recovery and preview/publish state patterns. Native backend implementation remains partly unverified.

**Recommendation remains:** adapt Stacki's MIT editor and preview, repair versioned stylesheet/source saves and history, resolve new-page preview refresh, then implement the equal-prominence visual/agent workspace using one action layer. Independently implement Sitereal/Zeku workflow lessons; do not incorporate proprietary code. No Cauldron application scaffold or repairs have been made.

## Historical source-review decision

**Use a maintained adaptation of Stacki's Electron/React editor as the first implementation candidate.** Keep its editing, file handling and Astro preview as a connected foundation. Build Cauldron's integrated agent experience and design library on top. This is a source-based recommendation; the foundation still needs a real-project execution check before adaptation begins.

Locked constraints: Electron; free/open-source; integrated agent interaction and visual editing have equal prominence; externally driven workflows also supported; no preservation requirement for old Cauldron OS. Standalone means the user can work inside Cauldron, with a plugged-in agent using existing credentials. Optional direct model keys remain undecided.

## Evidence baseline

Stacki snapshot: `references/source/stacki`, commit `363b044` (full SHA in `references/source-manifest.json`). Root MIT licence verified. Source review only: no installs, builds, GUI launches or existing user-project changes. Reference source trees remained unmodified during this review.

## What to retain together

Paths below are relative to `references/source/stacki/`.

- **Open project and preview:** `electron/handlers/projectHandlers.ts`, `src/app/state/appNavigation.ts`, `electron/handlers/devServers.ts`, `electron/previewServer/`. Handles a real Astro project and its own preview process. Startup may install missing project dependencies; make that action explicit in Cauldron. A fallback preview may render without selection/edit overlays, so expose capability state rather than pretending every preview is fully editable.
- **Safe page editing:** `electron/handlers/pageHandlers.ts:33–105` reads the file version shown, applies edits against that version, returns the updated page and inverse operations for undo. Keep `shared/engine/`, `electron/documents/`, `electron/parse/`, `src/editor/` and their contracts together initially.
- **Manual/external coordination:** retain watcher/conflict paths and checksum-based edit requests. Multiple cooperating writes are safer through the shared operations. Arbitrary external tools can still race with a file replacement; do not claim absolute concurrency safety.
- **Agent selection context:** `src/app/model/appKeys.ts:381–405` flushes edits and copies a selected element's file/line trail. Expose structured selection + current file version to integrated agents and external tools. Clipboard copying can remain a user convenience.
- **Existing page/content/style/asset tools:** use the existing editor screens and operations as working material while designing Cauldron's own layout. Avoid lifting isolated UI files without the contracts they rely on.

## Concrete issue to address before concurrent agent work

**An old visual stylesheet draft can overwrite an agent's newer stylesheet changes.**

Verified source chain:

1. `src/features/style/model/webflow.ts:380–404` passes the original stylesheet as `base` with the edited CSS.
2. `shared/ipc/ipcPayloads.ts:436` accepts only `filePath` and `css` for `style:writeFile`.
3. `electron/handlers/styleSourceHandlers.ts:38–41` writes the supplied CSS without the expected original text.
4. `electron/documents/documentWrites.ts:42–53` uses `writeCurrent` when no original source is supplied.

Proposed acceptance test: open CSS in the visual editor; externally change a different rule; perform the visual edit; verify either both changes survive or a clear conflict blocks the stale save. Repeat with undo. The source shows the risk; no runtime reproduction has been performed yet.

The existing round-trip fixture expectations also record formatting deviations (`test/corpus/expectations.json`). A green upstream gate can include explicitly expected failures. Source-preservation claims need fixture-level review, not only a final green badge.

## How the other references contribute

### Ycode: a shared action catalogue

`references/source/ycode/lib/agent/tools/registry.ts:29–70` reuses the same tool registrations for an external MCP server and its in-app agent. `lib/agent/runtime.ts:27–74` supplies selection context, streamed progress/results and change snapshots for undo.

**Apply the pattern to Cauldron:** one set of project operations for manual UI, integrated agents and external clients. Operations cover pages, components, styles, assets, selections and checks. Keep project paths and permissions enforced in Electron. Ycode's database-backed website model is not an Astro filesystem implementation; adopting that whole backend would add unrelated infrastructure.

### HyperFrames: agent connections and conversation lifecycle

Use the inspected installed app as the behavioural reference for agent discovery, existing logins, session continuity, cancellation, progress/error state and selection context. Its plugin installation/versioning conventions complement its desktop execution adapters. Reuse rights for packaged code have not been established; implement from documented interfaces and observed patterns unless a suitable source licence is verified.

### Sveltia / Pages CMS: content editing

`references/source/pages-cms/lib/serialization.ts` separates frontmatter/body parsing from serialization. Sveltia's `src/lib/services/contents/editor/save.js` explicitly handles conflict/save/error outcomes. Use these patterns when designing file-backed content editing. Preserve authored formatting/comments where required and test MDX cases; parsing and printing are not inherently lossless.

Stacki already has content tools, so inspect those first. Add another CMS only for an established gap or client-editing requirement.

### Meno Astro: explicit editing limits

The public runtime is MIT and has parser/emitter machinery in `lib/dialect/`. Unsupported authored constructs must remain intact and accessible through source editing. Meno's own runtime/dialect dependencies mean swapping its parser into Stacki is not an automatic win. Keep as a comparator and edge-case reference.

### Design sources: one curated local library

- Design Bites: structured typography/colour/reference material.
- Stageshow: craft rules, examples, review loop; its chat scenes are presentation examples.
- OriginKit plugin: searchable category/tag/dependency metadata (`tools/originkit_browse.ts:1–38`). Source retrieval requires a separate service/key (`tools/originkit_get.ts:1–19`) and is not a core dependency.
- ThreeUI: selective reviewed effects/components, with explicit framework and runtime requirements.
- Superdesign skill: route/component/layout/theme context grouping; external CLI references do not establish a local standalone runtime.

Every reusable library entry should carry source, licence/asset status, supported framework, dependencies, editable fields and preview. Astro-native sections should be the default. Restricted and commercial references remain separated.

## Proposed first adaptation sequence

1. **Foundation gate:** install/build Stacki in an isolated evaluation checkout after reviewing scripts; run document/selection/style/round-trip suites. Then exercise create/open/edit/preview/undo on a disposable Astro site. Obtain permission before opening a visible app.
2. **Write safety:** reproduce and repair the stylesheet base/version issue in the future working app, with conflict/undo regression tests. Establish a single project-edit protocol for cooperating agents and UI.
3. **Agent connection:** one integrated conversation panel and one verified existing-agent adapter; pass selected element/file/version context; stream progress, support stop/retry, show changes and real failures. Preserve external-agent access through the same operations.
4. **Workspace composition:** pages/sections and library on the left, real Astro preview in the centre, contextual visual controls and agent conversation readily accessible. Resizable panels; equal first-class status; compact windows collapse panels predictably. Actual layout remains a design decision to prototype with Billy.
5. **Taste library:** add a small reviewed selection of Astro sections and complete design directions. Build two different real site briefs and inspect desktop/mobile output.
6. **Release:** project opens without terminal setup; editor resizes correctly; changes and undo preserve work; output builds independently; documented unsigned Mac first-launch route. Preserve upstream MIT notices, change app identifiers/update feed, and exclude private research assets.

## Outcome and remaining decision

The source gives sufficient grounds to proceed to hands-on Stacki evaluation. The most important risk is safe coexistence of manual and agent writes. The biggest missing product capability is the integrated, session-aware agent workflow. No need to reopen Electron or preserve the old Alpine pipeline.
