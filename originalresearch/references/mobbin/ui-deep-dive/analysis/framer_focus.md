# framer_focus

Model: gemini-3.8-flash (direct Google AI Studio call). Search: "Framer editor with left panel collapsed and focused canvas"

## Mobbin links
- 0 Framer: https://mobbin.com/screens/234c2dd7-b09f-4ec5-aebd-7ca95472a769
- 1 Framer: https://mobbin.com/screens/e9b2a738-c4cb-4bc2-a31f-b2e4086374a3
- 2 Framer: https://mobbin.com/screens/ee4b2620-4a2b-4e5a-b506-bb8a07337151
- 3 Framer: https://mobbin.com/screens/6914441d-d1f6-458a-9db3-3f6cc7907fe2
- 4 Framer: https://mobbin.com/screens/01523d7d-bc80-4453-a823-65ee3f19b454
- 5 Framer: https://mobbin.com/screens/d3849017-c706-4107-aef0-08b55493696e

## Analysis
### 1. Tile Analysis

#### Tile 0: Framer (Blank Canvas with AI Agent Sidebar)
* **Canvas**: Very light warm-grey canvas (`~#F3F3F3`) holding an empty white artboard labelled with a top tab: `Desktop 1200` with a plus icon to the right to append another breakpoint.
* **Top Bar**: Fixed 1px hairline border below. Left: dropdown `Canvas`, tool icons (`+`, `T`, Frame/Vector). Center: Project title (`Precious Leadership`) with a Git branch/main indicator. Right: user avatar badge (`AS`), `Invite` text button, and a solid vibrant blue primary button (`Publish`, `~#0099FF`).
* **Left Panel**: Top tabs: `Pages`, `Layers`, `Assets`. Search bar below. Collapsible trees: `Design` and `Pages`.
* **Right Panel**: Distinct segmented top switcher with two equal tabs: `Agent` (selected) and `Style`. Beneath is the Agent interface: `New Chat` with `+`, an empty chat message area, and a bottom docked prompt input box (`Ask Framer...`) featuring a model dropdown (`GPT 5.5` approx) and submit/arrow controls.
* **Floating Bottom Pill**: Rounded pill bar anchored bottom-center holding canvas controls: play/preview icon, viewport tools, zoom dropdown (`50%`), and an `Upgrade Now` pill.

#### Tile 1: Framer (Agent Sidebar with Canvas Content)
* **Canvas**: Displays a populated article card list ("Articles") centered on the white artboard.
* **Left Panel**: `Design` section expanded to show multiple variants (`Design 2` through `Design 6`), with `Pages` below showing `Home`, `/as-mobbin`, `/blog`.
* **Right Panel**: `Agent` tab remains active in default prompt state with the `Ask Framer...` input pinned at the bottom.
* **Proportions**: Three-column layout where left panel is ~240px, right panel is ~260-280px, and canvas takes all remaining center space.

#### Tile 2: Framer (Canvas with Checklist & Page Selection)
* **Left Panel**: Focus is on the `Pages` tree, with `/page` highlighted/selected in soft grey.
* **Canvas**: Shows onboarding/documentation components ("Getting Started", "What's New", "Styling Elements", "Importing Content", "Best Practices") laid out in neat multi-column groups on the canvas.
* **Right Panel**: `Agent` tab remains selected in empty ready state.

#### Tile 3: Framer (AI Agent Active Conversation)
* **Right Panel**: Demonstrates the `Agent` tab with an active dialogue history. Prompt reads: *"Please generate a modern real estate landing page for ASMOB Property Agency. The design should look premium and professional. Please include a hero section with a bold headline, a gallery layout..."* followed by an inline selection chip (`Select ...`) and model selector (`Opus 4.5` approx).
* **Canvas**: Blank `Desktop 1200` frame, ready to receive generated content.
* **Integration**: The AI agent occupies the exact same panel footprint as the style inspector rather than popping out as a floating modal or covering the canvas.

#### Tile 4: Framer (Subpage Canvas View)
* **Left Panel**: `/page` selected under `Pages`.
* **Canvas**: Blank artboard `Desktop 1200`.
* **Right Panel**: AI `Agent` tab active with empty input field at bottom.
* **Hierarchy**: Shows total consistency of the outer chrome across page navigation.

#### Tile 5: Framer (Responsive Breakpoints & Style Inspector)
* **Canvas**: Two responsive breakpoints side-by-side on canvas:
  1. `AS mobbin Desktop 1200` (unselected).
  2. `Laptop 1199` (selected, outlined with a 1px bright blue frame `#0099FF` and blue header tab).
  Both display complex full-bleed site layouts (dark hero section, typography, cards).
* **Right Panel**: Switcher is flipped to **`Style`** tab. Shows dense, categorized inspector sections separated by subtle dividers and text section headers:
  * `Template`, `Breakpoint` (Position `1300`, Width `1024 Fixed`, Height `4160 Fixed`), `Layout`, `Typography` (`Base 16`), `Overlays`, `Cursor`, `Effects`, `Styles` (`Fill #FFFFFF`), `Selection`, `Colors`, `Code Overrides`.
* **Craft Details**: Numeric inputs are compact with small muted unit labels (`Fixed v`). Section headers have subtle `+` add buttons right-aligned.

---

### 2. Best 2-3

1. **Tile 5 (Responsive Canvas + Style Inspector)**: Perfectly demonstrates multi-breakpoint layout directly on the canvas alongside a deep, native-feeling property inspector. The active breakpoint is communicated through a 1px accent blue border and title badge without heavy chrome.
2. **Tile 3 (In-Sidebar AI Agent Conversation)**: Demonstrates how to give AI equal prominence to the inspector. Instead of an intrusive floating drawer or disconnected chat window, it is a peer tab right inside the right utility panel, preserving canvas breathing room.

---

### 3. Borrow for Cauldron

* **Segmented `Agent` / `Style` Tab Switcher (Tile 0, 3, 5)**:
  * *Cauldron Feature*: Right utility panel.
  * *Application*: At 1024px window widths, you cannot fit Left Tree (240px) + Live Preview (600px+) + Inspector (260px) + Chat (300px). By putting `Agent` and `Style` as equal top-level tabs within the same right panel (and auto-switching to `Agent` when the user prompts or AI responds, and `Style` when an element is clicked), both have equal standing without starving the canvas preview.
* **Canvas Breakpoint Framing & Header Badge (Tile 0, 5)**:
  * *Cauldron Feature*: Astro visual preview canvas.
  * *Application*: Render viewport frames with an integrated top tab showing breakpoint name and width (e.g., `Desktop 1200`, `Mobile 390`) and a trailing `+` icon to generate the next Astro container query / media breakpoint frame side-by-side.
* **Floating Bottom-Center Canvas HUD (Tile 0, 1, 5)**:
  * *Cauldron Feature*: Canvas zoom & preview controls.
  * *Application*: Move zoom percentages, device toggle, and test-run/preview buttons into a floating translucent pill (`border-radius: 9999px`, white background with subtle box-shadow and 1px border) docked at the bottom center. This frees the top chrome for project name and git/deployment status.
* **Ultra-Muted Greys & 1px Hairlines (All Tiles)**:
  * *Cauldron Feature*: Global design system.
  * *Application*: High-end craft feel through neutral canvas (`~#F3F4F6`), pure white panels (`#FFFFFF`), single-pixel border dividers (`#E5E7EB`), compact 12px panel typography, and a single saturated accent blue (`#0099FF`) reserved strictly for active selections and the primary action button.

---

### 4. Avoid

* **Strictly Mutually-Exclusive Agent vs Inspector on Large Monitors**: While Framer’s tabbed toggle is essential on narrow windows (like 1024px), on wide monitors (1440px+), creative directors need to see the inspector update *while* the AI is generating code. Avoid hardcoding the inspector and agent as *only* tabs; allow the panel to split or tear out when viewport width permits.
* **Canvas-Floating Controls Obscuring Bottom Content**: The bottom-center floating pill in Tiles 0-5 overlaps the bottom of long pages when scrolled down. Ensure Cauldron provides generous bottom canvas padding so the preview page content never gets hidden behind the floating zoom pill.
* **Blank State Isolation**: In Tiles 0, 3, and 4, the blank artboard gives zero hints about Astro structure (slots, components, layout wrappers). Avoid completely blank frames; provide visual skeleton boundaries for creative directors.
