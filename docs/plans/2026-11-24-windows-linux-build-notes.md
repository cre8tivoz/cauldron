# Windows and Linux builds for Cauldron — notes only

**Summary (read this first)**

Starquix packages with `electron-builder` from a `desktop/` subfolder, and has separate Windows, Linux and release workflows that install the built app and run one gating e2e test before publishing. Cauldron packages with `electron-forge` and only has a macOS ZIP maker; its CI already runs a Linux smoke test but makes no Linux or Windows download and has no publish step. The main code work is not packaging — it is `src/main/runtime.ts`, which assumes POSIX paths, `:` PATH separators and a zsh login shell. Rough effort: Linux download 1–2 days, Windows 3–5 days, release automation about a day.

## How Starquix does it (verified)

**Packaging.** `electron-builder` config lives in `desktop/package.json:29-100`: `appId: com.starquix.desktop`, `asar: false`, `extraResources` for the bundled editor/preview-template/native deps, targets `dmg` + `zip` on Mac (`:69-77`), `nsis` on Windows (`:78-85`), `AppImage` + `deb` on Linux (`:86-95`). No `forge.config` anywhere. Note the Mac signing/notarisation in `release.yml:43-127` — **not relevant to Cauldron**, whose Mac signing is closed.

**Windows workflow** (`.github/workflows/windows.yml`): `workflow_dispatch`, `workflow_call` and pushes to `main` / `feat/windows-**` (`:7-11`). The matrix is **x64 only** — arm64 (`windows-11-arm`) was dropped because its install folder lost every `.exe`/`.dll`, and a `continue-on-error` job still turned the commit red (`:24-29`). Real-machine fixes worth copying: `core.autocrlf false` so templates stay LF (`:36-37`), and long-form `TEMP`/`TMP` because Vite 8 refuses 8.3-looking paths on Windows (`:38-42`). Then `electron-builder --win nsis`, a silent per-user install, one e2e spec against the installed app as the gate, and the full suite advisory (`continue-on-error`, 5 of 30 specs failing) (`:76-115`).

**Linux workflow** (`.github/workflows/linux.yml`): x64 on `ubuntu-24.04` plus arm64 on `ubuntu-24.04-arm`, with the note "free on public repos only" (`:23-28`). Installs `xvfb build-essential python3` and disables the AppArmor restriction on unprivileged user namespaces so Electron can start (`:31-37`). Packages with `electron-builder --linux AppImage deb`, installs the `.deb` with `sudo apt-get install`, checks `/opt/Starquix/starquix`, then runs the installed-app e2e under `xvfb-run` (`:63-96`).

**Release** (`.github/workflows/release.yml`): a `vX.Y.Z` tag on a commit in `main`, tag must equal `desktop/package.json` version (`:14-28`); calls the CI, Windows and Linux workflows (`:30-41`); builds the Mac app separately (`:43-127`); the release job downloads all artefacts, writes `SHA256SUMS` and creates a GitHub Release with install notes (`:129-151`). The Windows note is exactly the honest line we would want: "Not code-signed yet: SmartScreen → More info → Run anyway" (`:148`).

**Platform fixes in the code** (git history is shallow here — one commit — so I checked source, not log):

- Shell resolver `desktop/src/terminal.mjs:46-68`: Windows uses `powershell.exe`, matches the `PATH` key case-insensitively (`Path`) and joins with `;` (`:50-58`). On Unix it falls back to `/bin/bash` when `SHELL` is unset because most Linux installs have no zsh (`:59`).
- Update notifier `desktop/src/update-check.mjs:10-12`: per-platform asset suffixes; Linux x64 AppImage is named `x86_64`, not `x64` — easy to get wrong.
- `docs/plans/2026-11-19-windows-signing-plan.md` exists as a draft. We are not proposing a signing plan; leave it as "unsigned for now, SmartScreen warning, optional later".

## Cauldron today

- `forge.config.mts:18-19`: **only** `new MakerZIP({}, ['darwin'])`; the comment says Windows and Linux are parked until after the first Mac release. `asar: true`, Vite plugin and fuses are fine as-is (`:8-16,20-55`). `package.json:34-37` has only `@electron-forge/cli`, `maker-zip`, `plugin-fuses`, `plugin-vite` — no Windows or Linux makers.
- `.github/workflows/ci.yml`: cheap checks on `ubuntu-latest` (`:20-57`), Mac build only on tag or manual dispatch (`:59-85`). It **already** disables the AppArmor restriction and runs `xvfb-run -a npm run smoke` (`:51-57`), so the Linux display/sandbox problem is solved for tests. There is no release/publish job and no artefact upload.
- `src/main/runtime.ts` is the real portability problem:
  - `CANDIDATE_NODE_PATHS` (`:67-92`) searches `~/.nvm/versions/node`, `/opt/homebrew/bin`, `/usr/local/bin`, `~/.local/bin`, `~/.hermes/node/bin`. On Windows nvm installs under `%APPDATA%\nvm`, Node under Program Files, and executables need `.exe`.
  - `loginShellDirs` (`:114-150`) runs `process.env.SHELL || '/bin/zsh'` with `spawnSync(shell, ['-l', '-c', 'printf %s "$PATH"'])`. Windows has no `SHELL` and no zsh. Linux without `SHELL` would try zsh.
  - `parsePathDirs` (`:153-162`) splits on `:` and every PATH write joins on `:` (`:238-241`, `:269-272`). On Windows the separator is `;`, and a bare `:` split also mangles `C:\...`.
  - Tool names passed as bare `node`, `npm`, `pnpm`, `claude`, `codex`, `hermes` (`:172-179`) are checked with `path.join(dir, name)` (`:225-228`) — no `.exe` suffix handling.
- Some platform awareness already exists, so don't redo it: `app-menu.ts:3` (`isMac`), `site.ts:227` (no `ps` on Windows), `site.ts:249-262` (`/proc` on Linux, `lsof` on Mac), and `detached: process.platform !== 'win32'` in `agent.ts:550`, `quality.ts:380`, `publishing.ts:51`, `dependencies.ts:807`. The Mac-only smoke/e2e exits are in `index.ts:3708-3782`.

## What Cauldron needs for Windows

1. **Maker.** Either add an official Forge Windows maker (`@electron-forge/maker-squirrel` for an `.exe` installer, or `maker-wix` for MSI), or keep Forge for Mac/Linux and call `electron-builder --win nsis` in the Windows job like Starquix does. The second reuses the known-good NSIS path but adds a second packaging tool. Pick one before writing CI.
2. **CI job.** A separate `windows.yml` with `workflow_dispatch` + `workflow_call` + tag/manual only — **not** on every PR. Runner `windows-latest` x64. Reuse Starquix's `core.autocrlf false` and long `TEMP`/`TMP` steps. Gate on a single packaged-app smoke/e2e; keep anything flaky advisory.
3. **Runtime/PATH work.** Use `path.delimiter` instead of hard-coded `:`; treat the `Path`/`PATH` key as case-insensitive; append `.exe` when checking tools on Windows; add nvm-windows and Program Files Node locations; skip the login-shell probe on Windows or use PowerShell, copying the shape of `terminal.mjs:50-58`. On Linux, fall back to `/bin/bash` when `SHELL` is unset (`terminal.mjs:59`).
4. **Paths and shells.** Most file access already goes through `path.join` (`actions.ts:163`, `site.ts`), which is good. Spot-check any code that splits a path on `/` or assumes `~` expands, and any `execFileSync` of a bare Unix command. Native modules: Starquix needed `build-essential` + `python3` for `node-pty` (`linux.yml:31-37`); check which natives Cauldron actually has before copying that step.
5. **Signing.** Ship unsigned. Put "SmartScreen → More info → Run anyway" in the release notes. No plan, no secrets, no cert work.

## What Cauldron needs for Linux

1. **Makers.** Add `@electron-forge/maker-deb` and `@electron-forge/maker-appimage` (and optionally `maker-rpm`) to `forge.config.mts:19`, with maintainer/category and artefact names. Mac ZIP stays.
2. **CI.** Extend the existing `check` job with a `make` step on `ubuntu-24.04`, reusing the already-present xvfb and AppArmor setup (`ci.yml:51-56`). Install the `.deb` and run the smoke test against the installed binary, mirroring `linux.yml:68-81`. Arm64 on `ubuntu-24.04-arm` is free on public repos (`linux.yml:27`) but can wait.
3. **Runtime.** The POSIX resolver is already right for Linux apart from the zsh fallback; no `/opt/homebrew` hits matter (it just won't exist). Keep the login-shell probe, it is useful on Linux.

## Rough effort and the minutes warning

- Linux download + CI gate: about 1–2 days. Windows: about 3–5 days, most of it `runtime.ts` and PATH/shell fixes. Release automation with `SHA256SUMS`: about a day. These are rough, not a quote.
- Billy's account has a **2,000 min/month shared private quota**; Windows runners bill 2× and macOS 10×. Cauldron is **public**, so standard runners are free and that private quota is not consumed — but keep jobs lean anyway: ubuntu for all default checks, Windows only on tag or manual, and leave the Mac build tag/manual as it is today (`ci.yml:59-63`). Do not put Windows in the PR path.

## Do not copy

Starquix's name, logo and assets; its signing/notarisation setup; its monorepo layout (no need to reshape Cauldron into `app/` + `desktop/`); its Playwright suite; its five-failing-spec advisory state.

## Open questions (genuine decisions)

Forge maker vs electron-builder for Windows (one tool or two?). Ship arm64 Windows at all, given Starquix's installer bug? Which native modules actually need a compiler on Linux?
