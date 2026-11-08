# compact_editor_canva_ios

Model: gemini-3.8-flash (direct Google AI Studio call). Search: "Canva design editor (iOS)"

## Mobbin links
- 0 Canva: https://mobbin.com/screens/a7d2e8f9-cf06-4b76-bd09-50d1a2315114
- 1 Canva: https://mobbin.com/screens/e84f88d0-8ba7-4f37-a60e-2f97994ee6b4
- 2 Canva: https://mobbin.com/screens/570321fe-c277-46c2-a54d-7497bf3861cf
- 3 Canva: https://mobbin.com/screens/b6a1f743-ffeb-4064-8eb4-cb25d88f3058
- 4 Canva: https://mobbin.com/screens/6d5edce8-0408-4636-b74a-03c7f8f5f7d4
- 5 Canva: https://mobbin.com/screens/55a82524-ba78-49e4-8bdd-2fc4dfd376e2

## Analysis
### Tile 0 — Canva (Layers Sheet)
* **Canvas:** Dark food poster with a selected banner element ("NEW PRODUCT ALERT!"). The selected text box displays white corner handles, edge mid-points, and an external rotation handle.
* **Bottom Sheet (Layers):** A docked sheet occupies the bottom ~45% of the viewport. 
  * Header has a left-aligned tab switcher ("Select" vs. "Layers"), a title, and a right-aligned `✕` close button.
  * Sub-segmented control toggles between "All" and "Overlapping".
  * Layer list presents horizontal row cards featuring a 6-dot drag handle on the left, an inline visual thumbnail, and a lock/focus icon on the right. The currently selected layer is outlined in purple (approx. `#7C3AED`).

### Tile 1 — Canva (Default Resting Editor)
* **Top Bar:** Gradient banner (cyan approx. `#00C4CC` to purple approx. `#7D2AE8`) containing: hamburger menu, undo/redo arrows, overflow (`...`), canvas status indicator, comment trigger, download arrow, and export button.
* **Canvas:** Maximum allocation. A blank white square canvas is centered on an empty grey workspace without any floating panels.
* **Bottom Toolbar:** Single-row persistent creation dock with 6 text-and-icon tabs: "Design", "Elements", "Text", "Camera...", "Brand", "Uploads".

### Tile 2 — Canva (Animate Action Sheet)
* **Canvas:** Composition centered, active banner selected.
* **Action Sheet:** Half-height modal sheet titled "Animate" with an `✕` dismiss button.
* **Content:** Feature banner card ("Create an Animation: Drag elements around the canvas to create your own animations") with an illustrated thumbnail.
* **Sub-Navigation:** Bottom pill tabs classify animation presets: "All", "Custom" (active with purple fill), "General", and "Suggested" (partially visible).

### Tile 3 — Canva (Grid Overlay Mode)
* **Canvas Viewport:** Canvas centers squarely; purple vertical layout grid lines (approx. `#6B21A8`) overlay the artwork to guide alignment without opening a side inspector.
* **Bottom Bar:** Remains in the root tool-switching state ("Design", "Elements", "Text", "Camera...", "Brand", "Uploads"), demonstrating that canvas diagnostics do not displace the tool shelf.

### Tile 4 — Canva (Contextual Element Toolbar & Quick Chips)
* **Canvas HUD:** A floating white pill rests directly above the selected bounding box, containing immediate high-frequency actions: "Ungroup", Duplicate icon, Trash icon, and overflow (`...`).
* **Contextual Inspector Shelf:** Replaces the main creation dock at the bottom:
  * **Top Sub-Row (Quick Chips):** Horizontal scroll of font families ("League Spartan", "Anton", "DM Sans", plus upload arrow button).
  * **Bottom Action Row:** Icon buttons for deep adjustments: "Edit", "Font", "Text styles", "Font size", "Color" (partially visible), terminated by an `✕` dismiss button on the right.

### Tile 5 — Canva (Position / Numeric Inspector Drawer)
* **Bottom Drawer:** Deep property editor titled "Position" with an `✕` close icon.
* **Numeric Inputs:** Two-column grid with labeled fields:
  * Row 1: "Width" (`864 px`), "Height" (`288.6 px`), and an aspect ratio lock toggle button.
  * Row 2: "X" (`108 px`), "Y" (`0 px`), "Rotate" (`0°`).
* **Sub-tabs:** Segmented pill bar at drawer base: "Arrange", "Align", and "Advanced" (active, highlighted in pale purple approx. `#EDE9FE`).

---

### Best 2–3
* **Tile 4 (Canva):** Combines an attached floating canvas HUD (for destructive/structure actions: delete, ungroup, duplicate) with a dual-tiered bottom strip (font chip presets on top, attribute buttons below). It provides immediate property control without consuming horizontal width.
* **Tile 5 (Canva):** Numeric transform panel inside a bottom sheet. Consolidates precise geometric inputs (dimensions, coordinates, rotation, aspect ratio lock) into a compact vertical drawer that preserves horizontal canvas margins on narrow viewports.

---

### Borrow for Cauldron
* **Canvas Selection HUD for Structure Actions (from Tile 4):**
  * *Cauldron Feature:* Component selection overlay.
  * *Implementation:* When the desktop window drops below 1100px or when the AI Chat panel expands to 50% width, move DOM actions ("Wrap in Div", "Duplicate", "Delete", "Convert to Component") into a floating pill directly attached to the selected element on the preview canvas rather than in a side panel.
* **Horizontal Bottom Property Shelf (from Tile 4):**
  * *Cauldron Feature:* Style Inspector in narrow/split mode.
  * *Implementation:* Collapse the standard 300px right-hand CSS inspector into a single horizontal bottom dock. For a selected typography element, show quick-select font and size chips in a scrollable horizontal strip directly above action buttons (`Font`, `Spacing`, `Colors`, `Flex/Grid`).
* **Transient Bottom Sheet for Deep Styling (from Tile 5):**
  * *Cauldron Feature:* Layout & Box Model Inspector.
  * *Implementation:* Instead of shrinking the site preview down to an unusable 398px, let complex CSS grid/flexbox and box-model parameters slide up from the bottom as a transient sheet over the lower third of the canvas, dismissible via an `✕` or clicking the preview.
* **"Overlapping" Filter for DOM Inspection (from Tile 0):**
  * *Cauldron Feature:* Element Tree / Layer Explorer.
  * *Implementation:* In narrow viewports, replace the full page DOM tree with an "Overlapping / Context" view that only lists the parent container, direct siblings, and active children of the clicked element.

---

### Avoid
* **Tall Decorative Title Bars:** The top navigation bar in Canva uses significant vertical real estate for brand gradients and non-contextual export actions. In Cauldron desktop, vertical space is precious when using bottom drawers; keep the header bar ultra-compact and utilitarian.
* **Truncated Text Labels in Toolbars:** Labels like `Camera...` and `Uplo...` (Tile 1, Tile 3) degrade visual polish. Use clear icons with tooltips on desktop instead of truncated micro-labels.
* **Modal Covering Canvas During Direct Manipulation:** The "Animate" modal (Tile 2) covers nearly half the workspace while instructing the user to "Drag elements around the canvas". Any sheet in Cauldron that requires canvas interaction must either be minimized to a floating bar or allow pass-through interaction.
