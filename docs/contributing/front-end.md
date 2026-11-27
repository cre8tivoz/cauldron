# Front-end conventions in Cauldron

This is about Cauldron's own interface: the React chrome you see when the app opens. The sites Cauldron builds are different. They are plain Astro files with `--cauldron-*` tokens, and they live in the user's folder. For those, read `docs/adr/0008-library-components-are-plain-astro.md` and `CONTRIBUTING.md`.

If you can write CSS, you can work here. Keep it small, keep it token-based, and run the guard tests.

## The window and the layout contract

The main window opens at 1440 x 900 and cannot go below 1280 x 800 (`src/main/index.ts`). The `.app` shell in `src/index.css` also sets `min-width: 1280px` and hides overflow. Do not design a flow that needs a narrower window.

| Region          | Size                                           | Source       |
| --------------- | ---------------------------------------------- | ------------ |
| Navigation rail | 68px fixed, full height                        | `.rail`      |
| Top bar         | 48px, inside the workspace                     | `.topbar`    |
| Panes row       | fills the space between top bar and status bar | `.panes`     |
| Status bar      | 28px                                           | `.statusbar` |
| Splitters       | 6px, `col-resize`                              | `.splitter`  |

Within `.panes`, the build view is three columns: agent on the left (default 400px), preview stage in the middle, inspector on the right (default 310px). Both side columns are clamped by splitters. The centre is a `stage-wrap` containing a `stage-toolbar` (page switcher, width presets, Compare, reload) and the stage proper.

| File                              | What it owns                                                                      |
| --------------------------------- | --------------------------------------------------------------------------------- |
| `src/index.css`                   | Tokens, base layout, rail, top bar, buttons, notices, inspector and dialog styles |
| `src/App.tsx`                     | Rail, view switching, splitters, modal state, preview bounds                      |
| `src/components/TopBar.tsx`       | Toolbar, panel toggles, history, Select and Publish                               |
| `src/components/PreviewStage.tsx` | Preview toolbar, page creation, compare slots                                     |
| `src/components/Inspector.tsx`    | Element, Outline and Photos tabs                                                  |
| `src/preview/preload.ts`          | Isolated observation of the previewed page                                        |

The preview is **not** a DOM element in the middle column. It is a separate, sandboxed native view laid over a rectangle the React stage reports through `setPreviewBounds`. Compare mode lays three views over three empty slots (375, 768 and 1280px wide, in the same proportion in CSS) using `setCompareFrames`. When a modal dialog is open, or Compare is on, App sends a zero-sized preview rectangle: a native child view would otherwise sit above the dialog. `src/preview/preload.ts` is isolated and has no editor or filesystem power; the main process validates and writes every change.

If the stage is too narrow for three real widths, `PreviewStage` shows "Not enough room to compare" and clears the frames rather than letting them overlap the panels.

## Rail and views

`WorkspaceView` in `src/components/TopBar.tsx` lists the screens: `projects`, `build`, `design`, `content`, `seo`, `library`, `quality`, `publish`. The rail in `src/App.tsx` exposes all eight.

| Rail item  | View       | What the screen owns                               |
| ---------- | ---------- | -------------------------------------------------- |
| Projects   | `projects` | Project home; the only item outside the site group |
| Editor     | `build`    | Agent + preview + inspector                        |
| Content    | `content`  | Content panel                                      |
| SEO        | `seo`      | SEO panel for the current page                     |
| Components | `library`  | Component browser                                  |
| Design     | `design`   | Direction picker; choosing one returns to Editor   |
| Quality    | `quality`  | Agent + Quality panel instead of the preview       |
| Publishing | `publish`  | Publish panel                                      |

The current item carries `aria-current="page"`. The seven site tools sit in one `role="group"` labelled by `#rail-site-name`, which shows the open site's name or "No site open". That caption is text, so it uses `--muted`, not `--faint`. The top bar shows the Agent toggle on build and quality, the Element toggle on build only, and Publish as the primary call to action.

## The inspector

`src/components/Inspector.tsx` has three tabs: **Element**, **Outline** and **Photos**. Outline renders `PageOutline`; Photos renders `AssetTray`. Element starts empty with a hint until the user picks something in the preview.

A selected element gets a header (tag, file, line and column), then three accordion sections:

- **Text** — a textarea; commit on blur or Cmd/Ctrl+Enter. If the element holds children, say why it cannot be edited directly.
- **Styles** — an editing-layer bar (base and breakpoint layers from `src/responsive-layer.ts`), token groups from `src/inspector-tokens.ts` (colour, font, radius), and inline overrides. A breakpoint layer writes to `cauldron/responsive.css` and is independent of the preview width.
- **Settings** — the element's attributes, plus an "Add a setting" row.

A disk conflict shows a `notice bad` with "Keep mine" and "Use the disk version". Do not silently pick one.

## Tokens and theming

`src/index.css` defines everything on `:root`, then overrides the same names inside `@media (prefers-color-scheme: dark)`. The base sets `color-scheme: light dark` and a 14px Source Sans 3 stack.

| Group    | Tokens                                                              |
| -------- | ------------------------------------------------------------------- |
| Surfaces | `--canvas`, `--panel`, `--panel-sunken`, `--panel-raised`, `--card` |
| Text     | `--text`, `--muted`, `--faint`                                      |
| Lines    | `--hairline`                                                        |
| Actions  | `--primary`, `--primary-hover`, `--primary-text`                    |
| Accent   | `--accent`, `--accent-text`, `--accent-soft`, `--accent-border`     |
| Status   | `--danger`, `--danger-soft`, `--ok`                                 |

Use the pairs as they are used in the source: `--text`/`--muted` for text on `--panel` or `--canvas`; `--primary` with `--primary-text` for filled buttons; `--accent-soft` + `--accent-border` + `--accent` for selected and pressed states. Notices tint the whole box with `color-mix(in srgb, var(--danger) 7%, var(--panel-sunken))` rather than adding an edge stripe. Focus is a 2px `--accent` outline with a 1px offset. `--faint` is for non-text decoration; the CSS notes it measures 3.42:1 on a light card, so gallery metadata uses `--muted` instead.

**Every `var()` name must be defined in both themes.** An undefined custom property makes the declaration invalid at computed-value time, so the browser's initial or inherited value wins. That is how a light-mode panel quietly loses its surface or text colour. Site tokens (`--cauldron-*`) and direction-card tokens (`--dm-*`) are a separate namespace and are exempt from the app-chrome guard.

## Hard rules, and the tests that guard them

These came out of real defects. `scripts/test-core.mjs` checks the source text, so a regression fails `npm test` without needing a Mac.

| Rule                                               | Do this instead                                                                                                                                                                       | Guard in `scripts/test-core.mjs`                                                                                           |
| -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| No coloured side stripes on cards, notices or rows | Even border, tinted background, or a full-width rule. Stripes are solid left/right borders of 2px+ (0.125rem/em+) or inset shadow bars; 1px hairlines and dashed tear lines are fine. | The side-stripe tests: one for the app's own surfaces, one for the shape a generated site can produce.                     |
| No undefined tokens                                | Define the name in both theme blocks before using it.                                                                                                                                 | The "every token is defined, so light mode never falls back to dark" test.                                                 |
| Contrast for every text and button pair            | 4.5:1 for body text, 3:1 for large text (24px, or 700 weight at 18.66px+). Direction ink, muted and primary-text must hold 4.5:1 on both page and card surfaces in both themes.       | The contrast and focus tests, the direction text-colour test, and the rail test that covers `--muted` on the site caption. |
| Modal flows use a native dialog                    | `<dialog>` plus `showModal()`, labelled with `aria-labelledby`. OS folder pickers stay in the main process (`dialog.showOpenDialog`).                                                 | The workspace-chrome and native-dialog test.                                                                               |

**Never close a dialog in an effect cleanup.** React StrictMode re-runs effects on the same node; a cleanup `close()` fires the `close` event, which `onClose` reads as Cancel, so the dialog vanishes within milliseconds. A real unmount does not close it at all. `ConfirmDialog` only calls `showModal()` when the node is not already open. There is a guard test for exactly this in `scripts/test-core.mjs`.

## Library pieces

New pieces go in `src/main/library-pieces.ts` as plain Astro markup plus their own CSS, built from `--cauldron-*` site tokens. Keep `:focus-visible` states. No script unless the interaction is the point, and keep the content present without it. The guard suite checks every piece for no script, token use and focus styling. The reason is in ADR 0008: shipping framework JavaScript into every site is not worth it.

## Checks to run

`npm run check` runs types, lint, format and the unit suites, including the guards above. `npm run verify:mac` adds a packaged-app smoke launch. `npm run test:app:shell` and `npm run test:library:ui` drive the real app over CDP if you change a rail, menu or inspector flow. Say plainly which of these you actually ran.
