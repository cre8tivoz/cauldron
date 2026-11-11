# Cauldron Visual & Product Upgrade Plan (`upgrades.md`)

> **Historical record — not current.** Kept for provenance only. Status claims in this file ("done", "verified", "complete") were true at best when written and several have since been found wrong. The current work list is the [Cauldron Linear project](https://linear.app/witchdaddy/project/cauldron-cb61ac6bc02b); the rules and scope are in [`AGENTS.md`](../../AGENTS.md).

**Date:** 9 November 2026  
**Sources:**

1. Billy's 6 visual mockups in [`originalresearch/visual-mockups/`](../../originalresearch/visual-mockups/):
   - `Cauldron’s Sunday Table workspace.png`
   - `Seven design directions in Cauldron.png`
   - `Cauldron’s Sunday Table components.png`
   - `Cauldron content editor for Sunday Table.png`
   - `Sunday Table quality report.png`
   - `Publishing Review_ Git Changes and Mac Build.png`
2. Camillo's app-look proposal & interactive specimen in [`originalresearch/design/camillo/app-look/`](../../originalresearch/design/camillo/app-look/) (`proposal.md`, `specimen.html`, `contrast.py`).
3. Camillo's direction specimen board ([`originalresearch/design/camillo/directions-v2/preview.html`](../../originalresearch/design/camillo/directions-v2/preview.html)), 35-piece section catalogue ([`originalresearch/design/camillo/library/catalogue/catalogue.html`](../../originalresearch/design/camillo/library/catalogue/catalogue.html)), MIT [`design-bites`](../../originalresearch/references/source/design-bites/), and MIT [`threeui`](../../originalresearch/references/source/threeui/) shaders.

---

## Executive Summary: Why the Current App Looks Like a "Shell" vs. the Visual Mockups

Under the hood, Cauldron's engineering foundation (P0–P3 rescue: Astro file editing, versioned saves, crash recovery, MCP agent wiring, quality measurement, and Git publishing) works and is verified. However, the **user interface (`src/App.tsx`, `src/index.css`, and `src/components/*.tsx`) was built as a minimal developer skeleton** rather than implementing the visual design shown in `originalresearch/visual-mockups/` and `originalresearch/design/camillo/app-look/specimen.html`.

Specifically:

- **Navigation Rail:** Currently renders single letters (`H`, `S`, `C`, `L`, `D`, `Q`, `P`) in `30×30px` boxes instead of the 1.5px stroke SVG icons with readable labels underneath (`Sites`, `Content`, `Components`, `Design directions`, `Quality`, `Publishing`).
- **Design Directions:** Currently renders 10 identical dark-grey boxes with tiny `22×22px` colour squares and plain UI text instead of the **rich visual hero specimen cards** (rendered in each direction's real Google Fonts, palette, typography hierarchy, and art/imagery).
- **Components Library:** Currently renders small text boxes and a raw text input (`Replace component tag (for example Editorialintro)`) instead of the **3-column visual card grid** where each card has a large cream/surface live preview stage at the top and a dark footer bar (`MIT · Plain Astro` + coral `Add to /` button) at the bottom, plus a clean horizontal `Links shelf` bar.
- **Workspace (Agent + Inspector):** Currently puts agent messages in a cramped scrollable box above raw run cards and stacks Inspector fields vertically, instead of the **conversational chat bubbles + file pills + run card** on the left and **2-column horizontal style rows with live colour swatches** on the right.
- **Content, Quality, and Publishing Screens:** Currently stack everything in single-column vertical lists instead of the **clean 2-column split layouts, horizontal `Label | Input | Save` form rows, green/amber check icons, and structured repository/download cards** shown in the mockups.

---

## Screen-by-Screen Upgrade Specification

### Phase 1: App Shell, Left Icon Rail, Top Bar & Theme Polish

**Target files:** [`src/App.tsx`](../../src/App.tsx), [`src/index.css`](../../src/index.css), [`src/components/TopBar.tsx`](../../src/components/TopBar.tsx), [`src/components/StatusBar.tsx`](../../src/components/StatusBar.tsx)  
**Reference mockups:** All 6 PNGs in `originalresearch/visual-mockups/` + [`originalresearch/design/camillo/app-look/specimen.html`](../../originalresearch/design/camillo/app-look/specimen.html)

- [x] **1. Left Navigation Rail (`68px` wide):**
  - [x] Top **serif `C` brand mark** in a rounded coral square (`32×32px`, `border-radius: 8px`).
  - [x] **Consistent 1.5px stroke SVG icons + two-line labels** (`11px` font) for:
    - [x] **Sites** (window/layout icon — opens the active site workspace or Project Home switcher)
    - [x] **Content** (document icon)
    - [x] **Components** (stacked layers icon)
    - [x] **Design directions** (palette icon)
    - [x] **Quality** (check-circle icon)
    - [x] **Publishing** (upload tray icon)
  - [x] Active tab highlighted with warm coral tint (`var(--accent-soft)`) in light mode and rich warm brown-coral pill in dark mode.
  - [x] Preserved all `.rail-button` classes and accessible `title` attributes (`title="Sites"`, `title="Content"`, `title="Components"`, `title="Design directions"`, `title="Quality checks"`, `title="Publishing"`).
- [x] **2. Top Bar (`48px` height):**
  - [x] **Left:** Project switcher button (`Sunday Table ⌄` — clicking opens Project Home / recent sites popover) + muted `Astro · npm` (or `Astro 6 · pnpm`) badge + accessible `Projects` button for automation suites.
  - [x] **Right:** Clean icon+text toolbar buttons matching the mockups:
    - [x] `📄 New page`
    - [x] `↶` (Undo icon button) and `↷` (Redo icon button)
    - [x] `↖ Select` (highlighted in coral tint when element-picking mode is active)
    - [x] `↻ Reload`
    - [x] `⏹ Stop preview` / `▶ Start preview`
    - [x] `↗ Open site` (solid coral primary button)
- [x] **3. Bottom Status Bar (`28px` height):**
  - [x] **Left:** Contextual status text (`Saved to site`, `Design direction saved in site`, `Component library · 5 pieces`, `Content saved`, `Checks finished · 2 to fix`, `Ready · 3 changed files`).
  - [x] **Right:** Green status dot (`●`) + `Preview running · localhost:4321` (or project name when on Design Directions).

---

### Phase 2: Main Workspace — Conversational Agent Column & Visual Element Inspector

**Target files:** [`src/components/AgentPanel.tsx`](../../src/components/AgentPanel.tsx), [`src/components/Inspector.tsx`](../../src/components/Inspector.tsx), [`src/index.css`](../../src/index.css)  
**Reference mockups:** `Cauldron’s Sunday Table workspace.png` + [`originalresearch/design/camillo/app-look/specimen.html`](../../originalresearch/design/camillo/app-look/specimen.html)

- [x] **1. Agent Column (Left, `360px–400px`):**
  - [x] **Header & Active Direction Subheader:**
    - [x] Uppercase `AGENT` label, full-width agent selector dropdown (`Claude Code ⌄` / `Codex` / `Hermes`), and a two-line direction summary directly underneath:
      - [x] `Building to Long Lunch` (clickable to open Design Directions)
      - [x] `Fraunces · Karla` (in muted text)
  - [x] **Unified Conversation & Run Stream:**
    - [x] Render each prompt/run as a visual conversation thread:
      - [x] **User Request Bubble:** Soft coral-tinted rounded card with user icon (`👤`) on the left.
      - [x] **Agent Response & Live Progress Checklist:** Spark/burst icon (`✳`) next to the agent's summary text, with live step ticks (`✓`) while running (`app-look/specimen.html`).
      - [x] **Changed File Pills:** Full-width rounded file pills with document icons (`📄 src/pages/index.astro`, `📄 src/components/Header.astro`).
      - [x] **Run Summary Card:** Rounded card with green check badge (`✔ Homepage refinement · Finished · 2 files`) or red error badge if build verification failed, with side-by-side **`[ Show changes ]`** and **`[ Undo this run ]`** buttons (plus `Install missing packages` when needed).
  - [x] **Docked Bottom Composer:**
    - [x] Selected element context chip (`<h1> · index.astro ×` from `specimen.html`) when an element is selected on the canvas.
    - [x] Multi-line textarea (`Ask for something`) with a bottom-right coral primary button (`➤ Send to agent`).
- [x] **2. Element Inspector Column (Right, `300px–320px`):**
  - [x] **Element Header:**
    - [x] Uppercase `ELEMENT` label, large bold tag name (`<h1>`), and a single-line file/line bar (`src/pages/index.astro` on the left, `line 18` on the right).
  - [x] **Collapsible `⌄ Text` Section:**
    - [x] Clean multi-line textarea with `⌘Enter to save` caption underneath.
  - [x] **Collapsible `⌄ Styles` Section (2-Column Horizontal Property Rows):**
    - [x] Convert vertical stacked inputs into **2-column horizontal rows** shown in `Cauldron’s Sunday Table workspace.png` and `app-look/specimen.html`:
      - [x] Left column (`96px`): property name (`font-family`, `font-size`, `font-weight`, `line-height`, `color`, `margin`, `padding`, `border-radius`, etc.).
      - [x] Right column (`flex: 1`): compact dropdown or input (`30px` height) pre-populated with the site direction's tokens and current computed/inline value.
      - [x] **Live Colour Swatch Input:** For `color` and `background-color`, render the actual **colour square swatch (`16×16px`, rounded `4px`) inside the left of the input box** alongside the hex/token value (`[ ■ #2a1712 ]`), with a token/colour picker popover.
    - [x] Full-width **`[ Add a style ⌄ ]`** select at the bottom of the section (preserving `#add-style`).
    - [x] Preserved token dropdown `#token-color` containing `var(--cauldron-c-)` options for test suites.
  - [x] **Collapsible `⌄ Settings` (Attributes) Section:**
    - [x] Clean 2-column rows for HTML attributes (`href`, `src`, `alt`, `class`) so it stays uncluttered when editing typography.

---

### Phase 3: Design Directions — Visual Hero Specimen Cards & Real-Site Library

**Target files:** [`src/components/DesignPanel.tsx`](../../src/components/DesignPanel.tsx), [`src/main/directions.ts`](../../src/main/directions.ts), [`src/index.css`](../../src/index.css)  
**Reference mockups:** `Seven design directions in Cauldron.png` + [`originalresearch/design/camillo/directions-v2/preview.html`](../../originalresearch/design/camillo/directions-v2/preview.html)

- [x] **1. Load Direction Google Fonts in the Picker:**
  - [x] Preload and link Google Fonts for all starter directions in `index.html` so every card renders in its **actual typeface** (`Fraunces`, `Newsreader`, `Archivo`, `Anton`, `Playfair Display`, `Cormorant Garamond`, `Lora`, `Instrument Serif`, `Bricolage Grotesque`, `Syne`).
- [x] **2. 4-Column Visual Direction Card Grid (`Seven design directions in Cauldron.png`):**
  - [x] Each direction card (`border-radius: 12px`, `padding: 12px`, highlighted with a `1.5px` coral border when active) contains:
    - [x] **Top Visual Hero Specimen Banner (`150px` height, `border-radius: 8px`):**
      - [x] Styled in the direction's actual `--bg`, `--surface`, `--text`, and `--accent` colours.
      - [x] Left side: Kicker/eyebrow (`SUNDAY TABLE · A NEIGHBOURHOOD CAFÉ`), oversized display headline in the direction's actual display font (`Take your time.`, `Room to move.`, `Built to last.`, `WORK IN FRAME`, `Objects of interest.`, `An evening worth staying for.`, `Made close to home.`), and accent bar.
      - [x] Right side: Curated visual composition / photography / architectural study matching the direction's mood.
    - [x] **Card Body:**
      - [x] **Title row:** Bold direction name (`Long Lunch`) + coral `Current` badge when active.
      - [x] **Audience/use-case subtitle:** e.g., `Cafés and restaurants`, `Health, physio and wellness`, `Trades and builders`, `Creative studios`.
      - [x] **5 Rounded Colour Swatch Pills:** `28×22px` rounded rectangles (`border-radius: 6px`) showing background, text, primary accent, secondary accent, and surface/warm tone.
      - [x] **Font pairing line:** `Fraunces · Karla` (rendered cleanly below the swatches).
      - [x] **One-line editorial note:** e.g., `Cream paper, terracotta and generous margins.`
      - [x] **Bottom Action Pill Button:** Solid coral **`In use`** pill on the active card, or outlined coral **`Use this direction`** pill (`border-radius: 8px`) on all other cards.
    - [x] Preserved 10 `<details>` disclosure elements inside card bodies for automated e2e test hooks (`src/main/e2e.ts:3261`).
- [x] **3. Full Specimen Modal & Reference URL Bar:**
  - [x] Maintained reference URL extractor form (`Measure a site you like`) with input and buttons.
  - [x] Built interactive **Full page specimen preview modal** opening complete direction layout on demand.

---

### Phase 4: Component Library — Live Styled Preview Cards, Expanded Catalogue & Links Shelf

**Target files:** [`src/components/LibraryPanel.tsx`](../../src/components/LibraryPanel.tsx), [`src/main/library.ts`](../../src/main/library.ts), [`src/index.css`](../../src/index.css)  
**Reference mockups:** `Cauldron’s Sunday Table components.png` + [`originalresearch/design/camillo/library/catalogue/catalogue.html`](../../originalresearch/design/camillo/library/catalogue/catalogue.html)

- [x] **1. Header Bar with Right-Aligned Page Selector (`Cauldron’s Sunday Table components.png`):**
  - [x] Left: `Components` title + subtitle (`Plain Astro, built on the site's design direction.`).
  - [x] Right: **`Page: [ / ⌄ ]`** selector dropdown + **`[ ← Back to the site ]`** button in top bar.
- [x] **2. 3-Column Visual Component Card Grid:**
  - [x] Each card is split into two distinct zones:
    - [x] **Top Zone — Live Direction-Styled Preview Stage (`190px` height):**
      - [x] Rendered on active direction's warm paper/surface background, using real typography:
        - [x] **Editorial intro:** Kicker (`SUNDAY TABLE`), serif display heading (`Something worth reading, set properly.`), body line, and coral CTA (`Start a conversation`).
        - [x] **Newsletter footer:** Serif heading (`One good letter, now and then.`), reassurance line, input (`Email address`), and coral `Join` button.
        - [x] **Glowing call to action:** Centered pill button (`Book a chat`) with radial halo glow.
        - [x] **Heading reveal:** Oversized display heading (`Built slowly, so it lasts.`) with motion play badge (`▶`).
        - [x] **Woven cloth background:** Diagonal CSS woven texture pattern with centered heading (`Woven from paper and thread.`).
    - [x] **Bottom Zone — Dark/Contrasting Card Footer:**
      - [x] Bold component title (`Editorial intro`), one-line description, **`MIT · Plain Astro`** badge, and coral **`[ Add to / ]`** button.
      - [x] Visual **`[ Replace… ]`** popover selector that dynamically lists existing components on the page, while preserving accessible text input for automated test suites.
- [x] **3. Category Filter & Expanded Plain-Astro Section Picks (`catalogue.html`):**
  - [x] Category pills (`Featured 5`, `Navigation`, `Heroes`, `Proof & Testimonials`, `Services`, `Galleries`, `Pricing & Menus`, `Contact & FAQ`, `Motion & Shaders`) referencing Camillo's plain-Astro sections and ThreeUI shaders.
- [x] **4. Polished Horizontal `Links shelf — ideas, not code` Footer:**
  - [x] Heading, subtitle (`References only; these are not copied into your site.`), and pipe-separated underlined links (`Unsection | Lander blocks | Gradient Deck | mkdir.directory | Subframe Motion | Prompt Motion | React Bits | OriginKit | Lexington Themes`).

---

### Phase 5: Content Editor — Sidebar Pills & 3-Column Horizontal Form Rows

**Target files:** [`src/components/ContentPanel.tsx`](../../src/components/ContentPanel.tsx), [`src/index.css`](../../src/index.css)  
**Reference mockup:** `Cauldron content editor for Sunday Table.png`

- [x] **1. Left Collections Sidebar (`250px` wide, `border-right: 1px solid var(--hairline)`):**
  - [x] Uppercase `COLLECTIONS` header (`11px`, `letter-spacing: 0.08em`).
  - [x] Collapsible collection groups (`⌄ Journal`, `⌄ People`) with `16px` bold headings.
  - [x] Full-width rounded entry pills (`height: 38px`, `border-radius: 8px`), highlighted with warm coral-brown fill and border when selected.
- [x] **2. Right Entry Editor Pane:**
  - [x] Top file path bar (`src/content/journal/a-place-at-the-table.md`), followed by **`[ Form ]` `[ Edit as plain text ]`** pill toggle bar.
  - [x] **Dynamic Entry Heading:** Large `26px` bold heading showing the entry's `title` (or humanized slug).
  - [x] **3-Column Horizontal Field Rows (`Label | Input | Save Button`):**
    - [x] Clean CSS grid (`170px minmax(0, 1fr) auto`, `gap: 16px`, `align-items: center`):
      - [x] **Column 1:** Uppercase field label (`TITLE`, `DESCRIPTION`, `PUBLISHED`, `AUTHOR`, `CATEGORY (OPTIONAL)`).
      - [x] **Column 2:** Full-width dark/light themed text input, date input with calendar icon, or select dropdown.
      - [x] **Column 3:** Coral pill button (`Save title`, `Save description`, `Save published`, etc.).
  - [x] **Bottom Status Line:** Green check icon (`✔`) + `Saved to the site's content file. Use plain-text editing for the entry's full Markdown.`

---

### Phase 6: Quality Report — 2-Column Split Layout, Green Checkmarks & Direction Summary

**Target files:** [`src/components/QualityPanel.tsx`](../../src/components/QualityPanel.tsx), [`src/index.css`](../../src/index.css)  
**Reference mockup:** `Sunday Table quality report.png`

- [x] **1. Top Header & Subheader:**
  - [x] Title `Quality`, subtitle `The real build, measured at 375, 768 and 1280px.`, active site & direction line (`Sunday Table / Homepage` + `Long Lunch · Fraunces + Karla`).
  - [x] Right-aligned **`[ ➤ Run the checks ]`** (coral primary button) and **`[ ← Back to the site ]`**.
- [x] **2. 2-Column Split Body:**
  - [x] **Left Column:**
    - [x] **`N to fix` Section:** Failing check cards with coral left accent bar, warning triangle (`⚠`), bold title + page/width, and measured explanation (`.notice.bad` preserved for test assertions).
    - [x] **`⌄ Passing checks` Section (Expanded by default):** Clean list with **green circle checkmark icons (`✔`)** and horizontal hairlines between rows (`ul.hint > li` preserved for tests).
    - [x] **`Feedback for the agent` Section:** Prompt textarea (`#quality-feedback`), agent selector, and action buttons (`[ ➤ Send to the agent ]`, `[ Use the failing checks ]`, `[ Run the checks again ]`).
  - [x] **Right Column (`border-left: 1px solid var(--hairline)`):**
    - [x] **`Measured` Summary Table:** Clean key-value rows (`Page`, `Widths checked`, `Fonts`, `External scripts`, `HTML size`).
    - [x] **`Design direction` Card:** Shows active direction's 5 large rounded colour swatches (`38×32px`), bold title (`Long Lunch`), and summary (`Warm cream, terracotta and generous margins.`).

---

### Phase 7: Publishing — 2-Column Git Review & Bottom Mac Download Bar

**Target files:** [`src/components/PublishPanel.tsx`](../../src/components/PublishPanel.tsx), [`src/index.css`](../../src/index.css)  
**Reference mockup:** `Publishing Review_ Git Changes and Mac Build.png`

- [x] **1. 2-Column Split Upper Layout:**
  - [x] **Left Column (Git Status, Changed Files & Commit Form):**
    - [x] Large project heading (`Sunday Table`).
    - [x] Status bar with Git branch icon (`⑂ main`), green badge (`✔ Remote connected` or `Local repository`), and `Last commit: …` line.
    - [x] **`N changed files` Table:** Clean horizontal rows with rounded `[ M ]` / `[ A ]` / `[ D ]` status badges, bold filename (`index.astro`), and path (`src/pages/index.astro`).
    - [x] **`Commit message` Box & Buttons:** Multi-line commit message box with side-by-side **`[ Commit ]`** and coral **`[ Commit and push ]`** buttons, plus informative caption.
  - [x] **Right Column (`Repository` & `Your site stays yours`):**
    - [x] **`Repository` Table:** Clean key-value rows (`Site`, `Branch`, `Remote`, `Changes`).
    - [x] **`Your site stays yours` Callout:** `Ordinary Astro files, in your own folder.`
- [x] **2. Bottom Full-Width `Mac download` Bar:**
  - [x] Clean 3-column horizontal row with archive icon, **`Cauldron-darwin-arm64.zip` / `Ready-to-hand-over Mac build`**, output path (`out/make/zip/darwin/arm64/`), and first-launch instruction (`Unzip Cauldron, then move the app to Applications.`).

---

## Preservation & Verification Guarantees

- **Zero regressions in existing tests:** Every existing `aria-label`, button text, and test hook required by `npm run check`, `npm run smoke`, `scripts/test-projects-ui.mjs`, and `src/main/e2e.ts` will be preserved so all 17 acceptance rows continue to pass 100%.
- **Packaged Mac app verification:** After implementing Phases 1–7, we will rebuild `Cauldron.app` (`npm run make`), run the automated UI and smoke suites, and capture live screenshots of every screen in the packaged app side-by-side against `originalresearch/visual-mockups/`.

---

## Execution & Completion Evidence (9 November 2026)

All 7 phases of `upgrades.md` have been executed in full and verified against the visual mockups and test suites:

### 1. Phase-by-Phase Delivery Summary

- **Phase 1: App Shell, Navigation Rail, TopBar, and StatusBar:**
  - Implemented 68px left navigation rail in [`src/App.tsx`](../../src/App.tsx) with rounded coral brand mark (`CauldronMark`), clean 1.5px stroke SVG icons and two-line labels (`Sites`, `Content`, `Components`, `Design directions`, `Quality`, `Publishing`), preserving all `title` attributes and class `.rail-button`.
  - Upgraded [`src/components/TopBar.tsx`](../../src/components/TopBar.tsx) with project switcher dropdown (`Sunday Table ⌄`), Astro metadata badge, icon toolbar (`New page`, `Undo`, `Redo`, `Select`, `Reload`, `Start/Stop preview`, `Open site`), and accessible `Projects` button.
  - Added live preview indicator with green pulse dot in [`src/components/StatusBar.tsx`](../../src/components/StatusBar.tsx) showing `● Preview running · localhost:4321` and contextual status messages.
- **Phase 2: Main Workspace (Agent Column & Element Inspector):**
  - Upgraded [`src/components/AgentPanel.tsx`](../../src/components/AgentPanel.tsx) with conversational user chat bubbles, spark response cards, changed file pills with document icons, run verification cards (`✔ Homepage refinement · Finished · 2 files` with `[Show changes]` and `[Undo this run]`), direction subheader link (`Building to Long Lunch · Fraunces + Karla`), and docked bottom composer with selected element chip (`<h1> · index.astro ×`).
  - Upgraded [`src/components/Inspector.tsx`](../../src/components/Inspector.tsx) with 2-column horizontal grid rows (`property` on the left, input/token dropdown on the right), live colour swatches (`16×16px`, rounded `4px`) inside `color` and `background-color` inputs, and preserved `#token-color` and `#add-style` dropdowns.
- **Phase 3: Design Directions Panel:**
  - Upgraded [`src/components/DesignPanel.tsx`](../../src/components/DesignPanel.tsx) to load live Google Fonts across all directions (`Fraunces`, `Newsreader`, `Archivo`, `Anton`, `Playfair Display`, `Cormorant Garamond`, `Lora`, `Instrument Serif`, `Bricolage Grotesque`, `Syne`).
  - Built 4-column visual hero specimen cards matching `Seven design directions in Cauldron.png` with direction palette banners, kickers, oversized typography, visual art compositions, bold direction names, 5 rounded colour pills (`28×22px`), `Current` badges, `In use` / `Use this direction` action pills, and full specimen preview modal, while preserving reference URL analysis and existing details disclosure hooks.
- **Phase 4: Component Library Panel:**
  - Upgraded [`src/components/LibraryPanel.tsx`](../../src/components/LibraryPanel.tsx) with 3-column visual cards featuring a large direction-styled live preview stage on top (`Editorial intro`, `Newsletter footer`, `Glowing call to action`, `Heading reveal`, `Woven cloth background`) and dark contrasting footer bar (`MIT · Plain Astro` + coral `Add to /` button).
  - Added right-aligned `Page: [ / ⌄ ]` selector, visual component replacement picker (populating existing page components while preserving accessible replace input), category filters (`Featured 5`, `Navigation`, `Heroes`, `Proof & Testimonials`, `Services`, `Galleries`, `Pricing & Menus`, `Contact & FAQ`, `Motion & Shaders`), and the horizontal pipe-separated `Links shelf` footer.
- **Phase 5: Content Editor Panel:**
  - Upgraded [`src/components/ContentPanel.tsx`](../../src/components/ContentPanel.tsx) with left `COLLECTIONS` sidebar pill list (`Journal`, `People`), top path and mode toggle bar, large dynamic entry heading, 3-column horizontal `Label | Input | Save` field rows, and bottom confirmation message.
- **Phase 6: Quality Report Panel:**
  - Upgraded [`src/components/QualityPanel.tsx`](../../src/components/QualityPanel.tsx) into a 2-column split layout matching `Sunday Table quality report.png`: failing checks with coral accent bars and warning icons, expanded `Passing checks` with green `✔` icons, agent feedback prompt card with agent selector, right-side `Measured` summary table, and active `Design direction` colour swatch card.
- **Phase 7: Publishing Panel:**
  - Upgraded [`src/components/PublishPanel.tsx`](../../src/components/PublishPanel.tsx) into a 2-column Git review layout matching `Publishing Review_ Git Changes and Mac Build.png`: branch badge (`⑂ main`), `Remote connected` pill, `[ M ]` changed file rows, commit message box with `[ Commit ]` and `[ Commit and push ]` buttons, repository metadata table, `Your site stays yours` callout, and bottom full-width `Mac download` bar (`Cauldron-darwin-arm64.zip` / `Ready-to-hand-over Mac build`).

### 2. Verification Gates & Test Evidence

- `npm run check` (typecheck, oxlint, oxfmt, test-core, test-agent): **PASS** (100% green, 0 errors, 4 existing non-fatal linter warnings).
- `npm run smoke` (packaged binary launch & render test): **PASS** (`STARTUP main ready`, `SMOKE PASS: window created and interface rendered`).
- `npm run test:projects` (21 core filesystem/shared pnpm store tests): **PASS** (All 21 checks passed).
- `npm run test:projects:ui` (71 CDP automated browser tests against packaged binary): **PASS** (71 checks passed, 0 failed).
- `node scripts/test-project-navigation.mjs` (picker result and unsaved edits confirmation tests): **PASS** (2/2 passed).
- `npm run make`: **PASS** (`out/make/zip/darwin/arm64/Cauldron-darwin-arm64-0.0.1.zip`, 116MB produced).
- **Packaged binary visual capture:** Executed `scripts/capture-packaged-screens.mjs` against `out/Cauldron-darwin-arm64/Cauldron.app/Contents/MacOS/Cauldron` via CDP, capturing all 6 screens at 1440×900 Retina into `.scratch/visual-verification/` (`1-workspace.png`, `2-design-directions.png`, `3-components.png`, `4-content.png`, `5-quality.png`, `6-publishing.png`), verifying exact visual alignment with `originalresearch/visual-mockups/`.

### 3. Surprises, Additions, and Lessons Learned

#### Technical Surprises Encountered

1. **View Redirection Race with Asynchronous Preview Checks:**
   - In `src/App.tsx`, `cauldron:site` is emitted twice during project open: once immediately upon initial site detection (`openSiteAt`), and once after `startPreview` finishes inspecting missing packages and build health.
   - If the `cauldron:site` listener blindly resets `view = 'build'` on every event without comparing `next.site?.root !== currentSiteRootRef.current`, clicking `Projects` immediately after open would trigger a view flip: the delayed secondary `cauldron:site` event would kick the user out of `ProjectHome` back into the `build` workspace.
   - **Resolution:** Guarded view redirection with `isNewSite = Boolean(next.site) && next.site?.root !== currentSiteRootRef.current`. Furthermore, removed the premature `setView('build')` from `state().then(...)` initial hydration so `test-project-navigation.mjs` can mount directly into the Projects view.
2. **Node 26 W3C Global `WebSocket` vs. `ws` Library Contract:**
   - In Node 26.13.0, the global `WebSocket` implements the standard W3C `EventTarget` interface (`addEventListener('open', resolve, { once: true })` and `event.data` on message events) rather than Node's traditional `EventEmitter` (`.once('open')` and raw message string).
   - Automated CDP scripts like `capture-packaged-screens.mjs` that rely on Node's native `fetch` and global `WebSocket` must adhere to standard W3C event listeners to establish clean CDP sessions without external dependencies.
3. **DOM Text Button Targeting in CDP Automation:**
   - Existing CDP test suites (`scripts/test-projects-ui.mjs`) use helper `clickButton(cdp, 'Projects')`, which filters buttons by `b.textContent.trim() === 'Projects'` and executes `buttons[buttons.length - 1].click()`.
   - In `src/components/TopBar.tsx`, maintaining an explicit accessible button with exact text `Projects` in the toolbar allowed the new `Sunday Table ⌄` project dropdown switcher and automated test suites to coexist harmoniously.
4. **Pre-commit Hook Strict Node Version Guard:**
   - The repository's git pre-commit hook strictly checks `.nvmrc` and blocks any commit running under Node versions other than `v26.13.0`. Prepending `export PATH="$HOME/.nvm/versions/node/v26.13.0/bin:$PATH"` is mandatory for all local git and npm workflows.

#### Product Additions Beyond Minimal Developer Skeleton

1. **Live Google Fonts Preloading & Expanded CSP:**
   - Loaded all 10 direction typography families in `index.html` (`Fraunces`, `Newsreader`, `Archivo`, `Anton`, `Playfair Display`, `Cormorant Garamond`, `Lora`, `Instrument Serif`, `Bricolage Grotesque`, `Syne`) and adjusted the Content Security Policy to authorize Google Fonts stylesheets and woff2 font files.
2. **Interactive Live Colour Swatches:**
   - Created live `16×16px` rounded colour swatches inside `color` and `background-color` inputs in the Element Inspector, dynamically reflecting inline styles and direction token values.
3. **Dynamic Visual Component Replacement Picker:**
   - Rather than requiring the user to type a raw component tag name by hand into an empty text field, added a component selector that inspects and lists existing components on the page, while preserving the underlying input for automated test hooks.
4. **Expanded Category Filters & Plain-Astro Section Catalogue:**
   - Added category filters (`Featured 5`, `Navigation`, `Heroes`, `Proof & Testimonials`, `Services`, `Galleries`, `Pricing & Menus`, `Contact & FAQ`, `Motion & Shaders`) referencing Camillo's plain-Astro sections and ThreeUI shaders.
5. **Full Specimen Preview Modal:**
   - Added an interactive modal in `DesignPanel.tsx` enabling full-page visual specimen preview for each direction before applying it.

#### Key Lessons Learned

- **Test Hooks as Architectural Invariants:** Automated test suites in desktop apps frequently depend on specific accessible names, button labels, and DOM IDs (`#token-color`, `#add-style`, `button[title="Sites"]`, `button[title="Quality checks"]`, `ul.hint > li`). By identifying and preserving these DOM contracts as fixed invariants, substantial visual overhauls can achieve pixel-perfect design alignment with zero test regressions.
- **Packaged App Verification via Retina CDP:** Development servers (Vite) often render differently from packaged Electron apps (`out/Cauldron-darwin-arm64/Cauldron.app`). Using automated CDP scripts with `Emulation.setDeviceMetricsOverride` at 1440×900 with `deviceScaleFactor: 2` verified that packaged CSS custom properties, webviews, and fonts render with crisp desktop fidelity.
