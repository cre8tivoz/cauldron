# Security model — Cauldron

Status: v1, 17 November 2026. Devin security scans read this file as this repository's security model. It is the **Cauldron** component of the cre8tivoz portfolio threat model (six independent repositories, no shared backend). Facts marked **[Billy]** are the owner's decisions; everything else describes the code as it stands. It does not replace `AGENTS.md`, which stays the entry point.

## System overview

A local macOS Electron app (unsigned Apple Silicon build from GitHub Releases) that creates and edits ordinary Astro sites in the person's own folder. It spawns Claude Code, Codex and Hermes agents, package managers, dev servers and Git, and shows the site in a preview.

Code: `src/main/**`, `src/preload.ts`, `src/preview/preload.ts`, the renderer under `src/`.

## Trust boundaries and entry points

- **Renderer to main:** `contextBridge.exposeInMainWorld('cauldron', api)` in `src/preload.ts`, served by `ipcMain.handle` handlers in `src/main/`. Every handler is a privileged entry point.
- **Preview to editor:** the site preview (`src/main/preview.ts`, `src/preview/preload.ts`) is sandboxed and context-isolated, with window opening denied. AGENTS.md rule 8: the preview can never reach editing powers.
- **Main to the machine:** agents (`src/main/agent.ts`), package managers (`src/main/dependencies.ts`), dev servers (`src/main/site.ts`), Git publishing (`src/main/publishing.ts`) and MCP (`src/main/mcp.ts`).
- **Untrusted inputs:** opened site folders and their `package.json` scripts, scripts running in the preview, agent output, templates and library pieces.

## Assets

- The person's Mac and files outside the open site folder.
- Their Git credentials and agent configuration.
- Integrity of the site they are editing.

## Attackers

**[Billy] In scope:**

- Malicious sites or projects opened in Cauldron, including scripts running in the preview.
- Hostile agent output steering privileged actions.

## Existing controls

`contextIsolation: true`, `nodeIntegration: false` and `sandbox: true` on every window and the preview. The editor window blocks navigation and handles window opening (`src/main/index.ts`). The preview runs in its own session with pop-ups and device permissions denied (`configurePreviewSecurity` in `src/main/preview.ts`); it has no navigation blocker, so a previewed site can navigate its own view. Codex runs with a workspace-write sandbox limited to the site root.

## Out of scope / accepted risk

None stated by the owner for this repository.

## Open questions

- Is the unsigned build / Gatekeeper "Open Anyway" distribution accepted risk? It is a settled product decision in AGENTS.md, but not yet stated as accepted security risk.
