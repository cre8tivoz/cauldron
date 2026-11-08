# Sitereal — shipped-application REA assessment

**Historical research:** the Stacki-foundation recommendation below was superseded by ADR 0001. Technical observations remain evidence for independently written Cauldron behaviour. Current implementation status is in the app's `docs/plan-verification.md`.

## Result

REA was run successfully against the official **Sitereal 1.0.2 Apple Silicon application**, downloaded from `https://sitereal.app/builds/sitereal-1.0.2-arm64.dmg`. This assessment examines implementation shipped in the application, not just documentation. The application was not installed, launched, signed into, modified or used to create a project.

**Recommendation:** retain Stacki as the evaluated editor foundation, and use Sitereal as a major architectural/workflow reference for shared agent/visual editing, conflict-aware writes and grouped agent undo. Independently implement those ideas; do not incorporate Sitereal's proprietary application code into Cauldron.

## What actually ran

- `rea extract-artifact` on the DMG failed with `unsupported_target`: this version has no DMG extraction reader. The failed result is retained.
- Mounted the DMG read-only, without opening Finder or the app, using macOS `hdiutil`.
- `rea extract-artifact` successfully materialised the app's `Contents/Resources/app.asar`.
- `rea analyze-javascript-application` successfully parsed the selected `package.json`, `dist/main.cjs`, and `dist/preload.cjs`.
- A second REA analysis successfully parsed `dist/engine.mjs` and `dist/mcp.mjs`.
- Read specific functions from the extracted shipped bundles to establish control flow that the bounded automatic semantic graphs could not completely resolve.
- No target application code was executed. This is static implementation evidence, not a live functionality test.

Raw evidence and extracted files are under `evaluation/rea-sitereal/` (gitignored).

## Concrete findings

### 1. Electron shell plus a separate per-project Node engine

`extracted/dist/main.cjs:13969–14000` starts `engine.mjs` as a child process using Electron's executable with `ELECTRON_RUN_AS_NODE=1`, the project folder as its working directory, a project port and a session token. It also passes the bundled MCP bridge command and arguments. The bridge discovers the changing engine port through `.strata/engine.json`.

`main.cjs:14100–14103` explicitly enables context isolation and disables Node integration for the project view. `preload.cjs:18–140` exposes named project, tab, settings and shell APIs through `contextBridge`, rather than a general-purpose filesystem API.

REA's shell analysis observed two exposed bridge APIs and paired all 53 literal renderer IPC transmissions with main handlers in the selected scope. Those are static matches, not proof of runtime enforcement or a security audit.

**Cauldron lesson:** a single project engine can serve both the visual editor and external agents, with an isolated desktop shell handling native operations. Keep that operation boundary explicit.

### 2. Actual three-way file merging, with a retained baseline

`extracted/dist/engine.mjs:38413–38414` defines `.sitereal/held` and `.sitereal/base`. The write guard records prior content hashes and retains a textual baseline.

`engine.mjs:38568–38596` compares baseline, proposed output and current disk text, and performs a three-way merge when the baseline is trustworthy. `38598–38637` checks current disk hashes before deciding whether to write, preserve an outside edit, or merge. Previously recorded files deleted externally go into the held path instead of being immediately recreated (`38611–38614`).

`engine.mjs:48919–48935` checks merged Astro/JSON parseability where it can, and `48948–48955` uses Astro syntax-tree and CSS-rule splicing to preserve hand-edited structure/formatting. The guard also refuses writes through links outside the project (`38467–38478`).

**Cauldron lesson:** preserve the read baseline all the way through writes; compare against disk before saving; retain outside work when safe reconciliation is not possible. This directly addresses the class of collision reproduced in Stacki. It does not prove Sitereal's undo or concurrent-file safety under every scenario.

### 3. Collision policy matters: it is not simply “all conflicts preserved”

`engine.mjs:35486–35544` implements line-based three-way merging. For overlapping unequal replacements without an explicit resolver, the algorithm selects its `theirs` side and increments a conflict count. Independent changes are combined; simultaneous insertions have their own ordering rule.

The normal generated-write path calls this as baseline / canvas output / disk (`38580–38581`), so the disk side wins overlapping replacements. However, the direct file-save path calls it as baseline / current disk / submitted content (`49353–49355`), which reverses the practical meaning of that preference. That caller consumes the merged text without inspecting the conflict count.

**Cauldron lesson:** do not blindly reproduce a merge helper. Define and test the intended policy separately for visual writes, direct code saves and undo. Static reading identifies this distinction; it has not been exercised as a runtime defect.

### 4. Agent actions are grouped into reviewable, undoable runs

`engine.mjs:49660–49719` tracks agent identity and activity, captures before/after project snapshots, groups changes into a run after a quiet interval, labels affected pages/settings and emits an `agent-run` event.

`engine.mjs:49721–49751` compares the current affected project sections with the expected post-run state before undo/redo. If later work conflicts, it returns the conflicting sections instead of applying the operation unless an explicit force flag is supplied. Only changed project parts/pages are submitted back through the ordinary API handlers.

**Cauldron lesson:** show “what the agent changed” as a first-class item with conflict-aware undo. Reuse the same mutation path as visual controls rather than introducing an unrelated agent writer. This is evidence of the intended implementation, not proof that all file-level history edge cases are safe.

### 5. External MCP is an implementation, not a homepage claim

The shipped archive contains `dist/mcp.mjs` and `dist/engine.mjs`. `extracted/dist/mcp.mjs:41459–41467` reads a page, sends an updated page through `/api/page` with the revision obtained from that read, then reads it back. The tools include page-outline reading and targeted node/rule editing, not just full-file text replacement.

`engine.mjs:57473–57487` provides per-item revision validation and a structured HTTP 409 stale response. The template update handler applies that check inside its project update (`57509–57521`). This check is conditional on a supplied base; it should not be described as universal optimistic locking.

`engine.mjs:55760–55810` includes host/origin/session-token checks and revocable agent-session access in the request path. Host binding defaults to `127.0.0.1` (`35734`). These are static observations; no penetration or runtime authentication test was performed.

**Cauldron lesson:** expose a compact shared action API with selected-element context, revision-aware mutations and structured error responses. External tools and the integrated agent should use that same API.

## Evidence identity and limits

- ASAR SHA-256: `505b79ee9aa7e56cf6e27426c3b29953e28b31df62900a495d3a9a460f34a468`.
- Extraction: `ev_a86898ac895f922c47e8cc503c9ad3eed6a69e9285c7a1f4b3a69f3708d5cd24`.
- Shell/preload analysis: `ev_9ea9c7dc46f8e24879a5400e2e46701c5c00ceb95b1184dc49a7aeb891cf2eff`.
- Engine/MCP analysis: `ev_a8e4cd9153b04cfc4bfbbbc6d9cc7013a1b9ffeb05235d4aad64f506f860042b`.
- Both JavaScript analyses completed with zero parse failures. Their semantic graphs are **partial**, bounded to 10,000 and 15,000 retained semantic nodes respectively, and dynamic relationships remain unknown.
- The renderer UI bundle and Astro parser WASM were inventoried/extracted but not semantically analysed in this pass. Code references above point to the actual shipped, readable bundles, retaining their source-module comments; these are not original repository source files.
- The licence remains proprietary. Extracted application files and raw evidence stay in ignored evaluation storage; no application code was copied into Cauldron's implementation.

## Specific build requirements informed by this pass

1. One project operation layer for visual controls, integrated chat and external MCP.
2. Baseline-aware writes and explicit handling of conflicting changes; tests must include undo after an unrelated external edit.
3. Agent-run summaries, grouped undo and refusal when later work would be overwritten.
4. Structural Astro/CSS edits that preserve authored files wherever possible.
5. Clear native-shell/project-engine boundaries and project-local, authenticated agent access.
