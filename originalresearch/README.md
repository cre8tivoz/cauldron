# Cauldron Astro

> **Superseded framing (6 Nov 2026):** Cauldron is our own application, not a fork or adaptation of Stacki ([ADR 0001](docs/adr/0001-own-application-not-a-fork.md)). Where this document recommends adapting or building on Stacki, read it as evidence of what works and what breaks. The findings stand; the "use Stacki as the foundation" conclusion does not.

Research and source workspace for a new, free, open-source Astro website design and builder application.

## Current state

The app is checkpointed at `82fc6c6` in the sibling `cauldron` repository. Its `docs/plan-verification.md` records exercised results, plan gaps, retrospective issues and risks. Development is paused. Read `START-HERE.md`, `CAULDRON-ASTRO-PLAN.md`, the approved taste tests and starter set for the current baseline. The 12 collected source roots and evaluation records below remain research evidence; original snapshots are preserved.

- `references/source-manifest.json` — complete inventory: 12 source roots, exact commits, original URLs, local licence texts, reuse classification and clean-state verification.
- `references/reference-catalog.json` — all 24 URLs from Billy's working note, with source folders or an explicit reference-only/unverified-source disposition.
- `references/public-page-extracts.json` — saved initial public-page extracts; some pages are truncated or sparse, as recorded in their content.
- `references/mobbin/` — two full-resolution design-research images and canonical Mobbin citations. Private references; not application assets.
- `references/collection.jsonl` and `references/sources.json` — original 11-repository collection records; `source-manifest.json` includes the subsequent Meno runtime collection.

## Historical foundation proposal — superseded by ADR 0001

The remaining investigation sections retain their original proposals and observations. Their adaptation steps and unresolved choices are historical. The agreed plan and ADRs govern current work; BYOK is parked, and the app is written independently. These sections grant no additional implementation scope.

**Locked by Billy: Electron is the application framework for the first version.** Evaluate Stacki within that decision. Visual editing and integrated agent interaction have equal prominence; external-agent operation remains available. Distribution initially needs to accommodate unsigned Mac downloads and documented first-launch approval.

Use **Stacki's MIT desktop editor** as the adaptation candidate. Its Electron/React editor successfully opened and edited a real Astro project in the hands-on evaluation. Repair stylesheet conflict/undo safety before integrated-agent use; see [runtime evaluation](STACKI-RUNTIME-EVALUATION.md).

Use the **MIT repository source only**. Stacki's latest official download (0.0.23, April 2026) is an older HTML editor labelled `UNLICENSED`, with no Astro support and unchecked file overwrites. The Astro editor has no packaged release, so its packaging, signing and updates are untested. See [Stacki REA assessment](STACKI-REA-ASSESSMENT.md).

The existing Cauldron browser/Alpine frame has no preservation requirement. Astro is the generated website format. The desktop editor can use React/Electron, as Stacki does; there is no requirement to implement the editor itself in Astro. Opening a project should manage its local preview automatically.

A native-wrapper rewrite would add a separate engineering project. The existing desktop architecture has demonstrated useful editing behaviour. One warmed-up evaluation process-tree RSS sample was 922.8 MiB, with shared-memory double-counting possible; broader resource/performance and supported-OS testing remains outstanding.

## Source roles

- **Stacki:** primary Astro visual editor/foundation candidate.
- **Ycode:** visual editing and CMS/agent workflows; its Next.js/Supabase architecture is not assumed appropriate for local Astro files.
- **Meno Astro:** MIT runtime/dialect reference. The public mirror excludes closed build-time internals; it is not the Meno desktop editor.
- **Sveltia CMS / Pages CMS:** content editing and client-handoff candidates.
- **Stageshow:** MIT craft guidance, examples and UI demo primitives. Retain its asset notices.
- **ThreeUI community:** MIT graphics/component source; evaluate per component for Astro/runtime fit.
- **Design Bites:** MIT design-reference material; third-party marks/images remain separate.
- **Superdesign skill:** MIT agent-guidance source, distinct from the app.
- **OriginKit plugin:** MIT integration code; its licence does not grant rights to the hosted component catalogue.
- **React Bits:** restricted source study only. Its licence prohibits component-library redistribution, including bundles/ports. Exclude from a bundled Cauldron component library unless separate permission establishes compatibility.
- **Superdesign app:** mixed AGPL/enterprise source study only. File-level licence review is required before adoption; enterprise code is not a free MIT source.

All MIT references require attribution preservation; root licences are not complete dependency/asset audits. Keep upstream snapshots untouched. Do not publish this collection wholesale as Cauldron source.

## Product direction

A usable desktop workspace with a real Astro preview; page/section navigation; content/style editing; design references and reusable compatible sections; agent operation through a documented interface; undo/change review; responsive preview; explicit build/accessibility/performance findings. External-agent operation requires no Cauldron model key. Optional standalone BYOK remains undecided.

**Locked by Billy: visual editing and agent interaction have equal prominence.** Both operate on the same Astro project and current selection. Keep both readily available, with resizable/collapsible panels as window space changes. Avoid forcing the user into a separate mode or restarting the project when switching between manual and agent edits.

## HyperFrames integration reference — inspected locally

Billy identified the installed HyperFrames desktop app as the reference for multi-agent integration. Inspected its bundled integration files read-only; no launch, configuration change or source incorporation.

- `/Applications/HyperFrames.app/Contents/Resources/app.asar.unpacked/node_modules/@app/studio-contracts/src/harnessCatalog.mjs` declares Claude Code, Codex, Antigravity, OpenCode, Hermes Agent, Copilot, Grok, OpenClaw and its own agent. Entries include command names and setup/sign-in/version information. This proves declared integration coverage; each agent has not been exercised here.
- `.../@app/agent-runtime/src/runs/agentDeclarations.mjs` handles agent-specific event formats, session identifiers and shared editing-status declarations. It teaches agents how to target the selected element and leaves completion/failure state to the application process lifecycle.
- `.../vendor/hyperframes/scripts/plugin-cli.mjs` resolves client plugin manifests and runs a matching CLI release with versioned bundled skills. Client plugin managers own updates. The installed skill's `references/plugin-installation.md` documents this convention.
- `.../vendor/desktop-agent/src/hosts/claude/mod/.claude-plugin/plugin.json` identifies a Claude-specific event-forwarding bridge. Do not conflate the external-agent skill/plugin installation path with the app's embedded agent execution adapters; both contribute useful design patterns.

Cauldron adoption proposal: one versioned set of Astro design/build instructions and project commands; client-specific installation adapters; use the user's existing agent authentication; pass selection/file context; preserve agent session continuity; show running/failed/finished states and changed files; refresh the same preview after edits. Build and test a small real integration set before expanding declared support. Installed HyperFrames code is a behavioural reference; its presence on disk does not establish permission to redistribute it.

## Foundation evaluation completed

Source review: [FOUNDATION-ASSESSMENT.md](FOUNDATION-ASSESSMENT.md). Hands-on results and evidence: [STACKI-RUNTIME-EVALUATION.md](STACKI-RUNTIME-EVALUATION.md).

- Build succeeded; all six targeted editing suites passed after installing the separate studio dependencies.
- Real component-prop/style edits, ordinary undo, external page refresh and subsequent visual editing worked. The disposable Astro site built independently.
- Native window sizes 1440×900, 1100×800 and 1024×640 retained their controls; 375px phone preview rendered without horizontal overflow.
- **Confirmed data-loss bug:** undoing a visual stylesheet edit discarded an unrelated later external CSS edit. Forward stylesheet saves also omit their original-file baseline at the desktop boundary, as established in source inspection.
- **Confirmed preview issue:** a newly created page remained on 404 until Reload preview, even though its route subsequently returned HTTP 200.
- Integrated-agent operation, arbitrary complex-project losslessness, full keyboard/accessibility review, large-project performance and release packaging remain untested. Component insertion was not exercised in this run.

Next adaptation gate: fix versioned stylesheet saves and undo/redo with regressions; resolve new-page preview refresh; then implement the equal-prominence visual/agent workspace. No fixes were applied during evaluation. The test window was closed and its preview/debugging services stopped.

## Application-code REA assessments

**Combined plan, stress-tested with Jev:** [CAULDRON-ASTRO-PLAN.md](CAULDRON-ASTRO-PLAN.md). Planning only; it will be reviewed decision by decision before any building.

- [Stacki](STACKI-REA-ASSESSMENT.md): REA run on the evaluated 1.0.12 build (three passes) and the official 0.0.23 download. 1.0.12: version-aware page edits are reusable; stylesheet and general source saves drop the version they were based on, which is the root cause of the reproduced stylesheet-Undo data loss and remains the first repair gate. Preview iframes receive the preload bridge (`nodeIntegrationInSubFrames`), which needs auditing before agents edit sites. 0.0.23: older `UNLICENSED` HTML-only app with raw overwrites; not a reuse source.
- [Zeku 0.1.31](ZEKU-REA-ASSESSMENT.md): inspected the official Mac binary and ran REA on its recovered embedded frontend. Concrete references for schema freshness, unsaved-content conflicts, recovery checkpoints, preview status and unsaved-tab guards around Git operations. Native Rust backend behaviour remains partly unknown; no native decompiler or runtime test was used. Evidence: `evaluation/rea-zeku/`.

[Sitereal 1.0.2](SITEREAL-REA-ASSESSMENT.md): downloaded the official Mac application, extracted its Electron archive and ran REA on its desktop shell, preload, project engine and MCP bridge. Read the actual bundled save/merge and agent-undo functions. The implementation provides concrete references for baseline-aware writes, shared visual/MCP operations, stale-write responses and conflict-aware agent-run undo. Its direct code-save merge has a different conflict-side preference from its generated-write merge; do not assume blanket losslessness. Static analysis only: no installation, launch, login or application-code incorporation. Evidence is retained under ignored `evaluation/rea-sitereal/`.

**Combined direction:** Stacki supplies the reusable MIT editor; Sitereal informs shared agent/visual actions and change review; Zeku informs content editing and recovery. Build Cauldron's own implementation of proprietary-product ideas. REA evidence is static and bounded; only Stacki has also been exercised in the running app. Research material under `evaluation/` is excluded by `.gitignore`; this workspace itself is not currently a Git repository, so publication exclusion must be rechecked if a repository is created.

## Mobbin patterns inspected

[GoDaddy editor](https://mobbin.com/screens/c0047eda-bff8-4d3a-820d-dff82b2f7733): large live page preview, highlighted selected text, contextual right-side fields and visible saved status. Apply the contextual controls to Cauldron's selected section; keep preview/save/error state explicit. Avoid loading promotional setup nags into the editing surface.

[Canva section/template panel](https://mobbin.com/screens/e98b8bde-f666-4031-b93f-ab0664921f38): section thumbnails, an explicit “Apply all 6 sections” action, and grouped palette/type choices. Apply to Cauldron's section library and design-direction panel, with replace/append previews. Avoid hiding most of the site under a permanent wide overlay at smaller window widths.

Mobbin informs interaction design. Stacki and other upstream projects provide inspectable implementation candidates. Both require evaluation against actual tasks.
