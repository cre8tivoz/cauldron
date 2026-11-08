# editor_workspace

Model: gemini-3.8-flash (direct Google AI Studio call). Search: "website builder editor with canvas, layers panel and properties panel"

## Mobbin links
- 0 Subframe: https://mobbin.com/screens/c8c5f1fe-f673-455c-9254-bff1715b5acd
- 1 Framer: https://mobbin.com/screens/b9342420-e6c8-4183-8194-c56791fc13f8
- 2 Figma: https://mobbin.com/screens/b62f7a88-50de-4ef0-bd2f-a238d83dd36a
- 3 Webflow: https://mobbin.com/screens/6c7126d9-4bfa-46b3-bbb9-d14a22208f32
- 4 Zoho CRM: https://mobbin.com/screens/8a140e48-2c78-4aaf-b445-676372778c9c
- 5 Savee: https://mobbin.com/screens/dcaf21e2-a50e-47a3-af36-2e956d752bca
- 6 Wix: https://mobbin.com/screens/1e331425-5719-4b48-8cdb-72a0f226c96c
- 7 MagicPath: https://mobbin.com/screens/5485ae30-ed88-48a5-be51-718ae263fb0a

## Analysis
### 1. Tile Analysis

#### 0 Subframe
* **Panel Layout**: Three-column layout. Left panel (pages, layers tree), center canvas, right inspector (Page Contents, Breakpoints, Quick Style, visual Layout/Padding box model). Top bar contains breadcrumb, "Design / Code" switcher, and an "Ask AI" button at top-right.
* **Approximate Width Shares**: Left ~20%, Center ~55%, Right ~25%.
* **Preview Framing**: Centered canvas artboard on a cool-neutral background (`#F3F4F6`), blue outline around active element.
* **Inspector Density & Signals**: Extremely clean, high-density inspector using segmented buttons, icon-assisted gap selectors, and nested visual padding inputs. High-craft, modern SaaS aesthetic.

#### 1 Framer
* **Panel Layout**: Dark-theme three-column editor. Left panel (Pages, Layers, Assets tabs), center canvas, right inspector (Layout, Styles, Effects, Transforms).
* **Approximate Width Shares**: Left ~18%, Center ~60%, Right ~22%.
* **Preview Framing**: Framed responsive canvas (`Desktop 1200` label) floating over a dark background (`#161616`), accompanied by floating bottom canvas zoom controls (`62%`).
* **Top Bar & Signals**: Ultra-slim top bar with integrated breadcrumbs, avatar, and blue Publish button. High-end pro desktop craft achieved through subtle borders, restrained typography, and unified monochrome accents.

#### 2 Figma
* **Panel Layout**: Standard four-zone layout: top menu bar, left sidebar (Pages top, Layers/Components bottom), center infinite canvas, right multi-tab inspector (Design, Prototype).
* **Approximate Width Shares**: Left ~18%, Center ~62%, Right ~20%.
* **Preview Framing**: Freeform infinite canvas displaying multiple artboards side-by-side with connection lines, not an isolated 1:1 site preview. Floating bottom pill toolbar.
* **Density & Signals**: Highly compact property values and steppers. Utilitarian, standard design-tool feel rather than an opinionated visual website builder.

#### 3 Webflow
* **Panel Layout**: Dark-themed multi-tier layout: far-left icon dock (~4%), expanded element drawer (~16%), center live canvas (~56%), right inspector (~24%) with Style/Settings/Interactions tabs.
* **Approximate Width Shares**: Side rails occupy ~44% of total width combined.
* **Preview Framing**: Full bleed live web page rendering with responsive breakpoint bar directly above the viewport.
* **Density & Signals**: Extremely dense, technical CSS terminology (box models, flex/grid configs). Powerful but overwhelming for a non-coding creative director; would severely compress viewport at 1024px.

#### 4 Zoho CRM
* **Panel Layout**: Left icon rail + configuration drawer, center canvas area displaying form/wireframe boxes, right panel ("Properties", currently displaying "No Properties Found").
* **Approximate Width Shares**: Left ~22%, Center ~58%, Right ~20%.
* **Preview Framing**: Embedded canvas container with top toolbar (zoom `62%`, canvas name input, Save/Close buttons).
* **Density & Signals**: Low visual craft. Bulky solid blue-gray top bar, loose field spacing, unrefined typography. Clear signal of legacy corporate enterprise software.

#### 5 Savee
* **Panel Layout**: Two-column layout: left dark sidebar containing all controls (Components, Pages, Site branding/typography/colors), right side completely dedicated to live portfolio grid preview.
* **Approximate Width Shares**: Left ~26%, Right preview ~74%. No right-hand panel.
* **Preview Framing**: Edge-to-edge live rendering with minimal black top utility strip showing site URL (`alexsmith.savee.site`) and viewport toggles.
* **Density & Signals**: Highly curated, minimalist, editorial. Maximizes preview real estate by consolidating all tools into a single side panel.

#### 6 Wix
* **Panel Layout**: Top navigation bar, floating layers panel on canvas left, center site preview, and a full-height right AI assistant panel ("Aria") with chat history, suggestions, and input box.
* **Approximate Width Shares**: Center preview ~68%, Right AI rail ~32% (excluding the floating left popover).
* **Preview Framing**: Scaled browser viewport framed with fit/zoom dropdowns (`Fit (80%)`).
* **Density & Signals**: Prosumer builder aesthetic. Demonstrates an explicit side-by-side AI chat panel, but the floating "Manage Layers" panel awkwardly obscures canvas content.

#### 7 MagicPath
* **Panel Layout**: Left icon dock + tree panel, center canvas displaying a mobile viewport (`402 x 874`), right properties inspector (Session Setup, Typography, Appearance, Effects).
* **Approximate Width Shares**: Left ~22%, Center ~50%, Right ~28%.
* **Preview Framing**: Explicit framed device container on warm off-white canvas with floating context toolbar over the artboard.
* **Density & Signals**: High visual craft. Crisp hairline borders, segmented font chips, structured color pickers, and clean pill badges ("Visual edit mode").

---

### 2. Best 2–3

* **Tile 1 (Framer)**: Best-in-class canvas framing and density. The artboard container (`Desktop 1200` pill) floats cleanly in the workspace with scale/zoom controls at the bottom, maintaining a professional studio environment while keeping UI chrome thin and unobtrusive.
* **Tile 5 (Savee)**: The optimal layout strategy for narrow windows. By eliminating the right rail entirely and consolidating layers, styles, and page controls into a single left sidebar (~26%), it leaves nearly 75% of window width for the preview.
* **Tile 6 (Wix)**: The only tile demonstrating an integrated AI chat panel alongside a site preview. It provides the architectural blueprint for an AI co-pilot sharing horizontal space with the visual canvas.

---

### 3. Borrow for Cauldron

* **Single-Rail Inspector/Navigation (from Savee, Tile 5)**:
  * *Cauldron Feature*: Main layout architecture at ≤1280px widths.
  * *Implementation*: Combine page tree, element tree, and visual inspector tabs into a single left sidebar (~280px–320px). This frees the remaining 700px+ of width to be split evenly between the visual preview canvas and the AI chat panel, preventing the canvas from collapsing to 398px.
* **Framed Scaled Viewport Container (from Framer, Tile 1 & MagicPath, Tile 7)**:
  * *Cauldron Feature*: Visual editing preview pane.
  * *Implementation*: Instead of forcing the preview to be full-bleed edge-to-edge, embed the Astro preview inside a framed artboard with a top device pill (showing breakpoint width/zoom) and auto-fit scaling. When the AI chat panel expands, the preview smoothly scales down inside its container rather than breaking layout media queries.
* **Persistent AI Assistant Rail with Selection Context (from Wix, Tile 6)**:
  * *Cauldron Feature*: AI Agent chat panel.
  * *Implementation*: Position the AI agent as a dedicated 50/50 split right-hand rail with an inline prompt bar ("Ask me anything...", quick action chips). Display the currently selected element as a chip above the chat input to reinforce that the AI and visual inspector share the exact same selection.
* **Visual Layout & Spacing Controls (from Subframe, Tile 0)**:
  * *Cauldron Feature*: Style inspector for creative directors.
  * *Implementation*: Adopt Subframe's nested visual padding/margin boxes and segmented alignment buttons rather than raw CSS inputs (like Webflow's), offering intuitive visual editing without developer jargon.

---

### 4. Avoid

* **Four-Column / Multi-Dock Sprawl (Webflow, Tile 3)**: Combining an icon rail, an open flyout drawer, a visual canvas, and a dense inspector eats over 40% of the screen before AI chat is even introduced.
* **Floating Popovers Over Canvas (Wix, Tile 6)**: The floating "Manage Layers" modal obscures the preview area, frustrating creative visual inspection.
* **Bulky Legacy Chrome (Zoho CRM, Tile 4)**: Thick colored top navigation bars, loose padding, and low-contrast grey-on-blue controls signal cheap enterprise software rather than a refined creative studio tool.
* **Unconstrained Infinite Canvas (Figma, Tile 2)**: For an Astro builder, creative directors need 1:1 responsive viewport testing with clear page bounds, not a sprawling multi-board infinite plane.
