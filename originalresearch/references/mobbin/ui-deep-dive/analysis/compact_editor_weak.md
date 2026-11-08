# compact_editor_weak

Model: gemini-3.8-flash (direct Google AI Studio call). Search: "design editor app on a small screen with bottom toolbar and properties sheet"

## Mobbin links
- 0 Play: https://mobbin.com/screens/4d19830b-583c-43ab-8378-d6e09558db5a
- 1 Craft: https://mobbin.com/screens/9525e22e-a29a-4913-bd2b-40440046506b
- 2 Linktree: https://mobbin.com/screens/3a795edb-c8ae-4277-9fe1-cd7fa67d8515
- 3 ChatGPT: https://mobbin.com/screens/cffc33b7-eb53-4e9c-9482-91bdd0922665

## Analysis
### 1. Tile Analysis

#### Tile 0: Play
* **Observed UI**: Mobile canvas editor for interface design. The top bar has a project title ("My New Project"), a close button ("✕"), a centered page selector dropdown ("Page 1" with pagination dots), and a green (approx. `#22C55E`) play/preview button at the top right. The main viewport shows a mobile artboard flanked by subtle canvas edge-resize handles. At the bottom, a floating modal/popover is anchored to the bottom-left above an icon bar (grid icon and share sheet icon). The popover contains "Editor Appearance" (segmented control: System 'A', Light, Dark), "Project Appearance" (System 'A', Light, Dark), a checked toggle for "Outlines", and a menu item for "Touch Indicator".
* **Relevance**: Highly relevant. Demonstrates how to decouple editor chrome theme from preview document theme, and how to use compact floating popovers for canvas settings without consuming permanent horizontal space.

#### Tile 1: Craft
* **Observed UI**: Infinite canvas / whiteboard document. The top bar displays a chevron back button, a "Done" button, canvas zoom ("89%"), Undo, Redo, and a magic-wand/tools icon. A floating properties popover sits on the right side over a dotted grid canvas with sticky notes ("landing pa..."). The popover contains clean visual sections: "BACKGROUND" (2×2 visual swatch tiles: Blank, Legal Pad, Blueprint, Cardstock), "GRID" (2×2 visual tiles: Blank, Dotgrid, Squared, Ruled), and "SETTINGS" with a "Smart Align" toggle switch (off state). At the bottom center floats a pill-shaped dock with pan (hand), select (cursor), rectangle, shape, and an overflow menu ("...").
* **Relevance**: Highly relevant. The floating bottom dock and visual preset cards (2×2 grids with clear iconography) provide a clean solution for property editing on constrained screen widths.

#### Tile 2: Linktree
* **Observed UI**: Mobile site customizer with a split-pane bottom sheet. The top navigation header includes a back chevron, undo/redo icons, a text "Cancel" button, and a solid purple (approx. `#7C3AED`) "Save" pill button. The top half shows a live preview card (profile photo with overlay badges). The bottom half is a structured properties bottom sheet titled "Style" with a close "✕". It uses an underlined segment tab bar ("Text", "Buttons" [active], "Colors"). Under "Button Style", it presents segmented visual pill buttons ("Fill", "Glass" with an active black border). Under "Button options", it shows a "Corners" slider ranging from "Square" to "Round" with an active drag thumb.
* **Relevance**: Relevant. It demonstrates responsive visual editing for non-technical users (creative directors) via tactile styling controls (Fill/Glass chips, corner radius slider) rather than CSS input fields.

#### Tile 3: ChatGPT
* **Observed UI**: In-app drawing/canvas modal sheet within ChatGPT. The background shows ChatGPT navigation ("Upgrade" pill, hamburger menu, refresh icon) and pill tags ("Trending", "Templates") with sticker cards. An overlaid modal features drawing tools: pen, heart/stamp, eraser, undo, a vertical stroke-thickness slider on the left, a canvas area with drawn hearts, and a horizontal palette of color dots (approx. black, red, orange, yellow, green) with a blue checkmark confirmation button.
* **Relevance**: Largely off-topic. This is a freehand sketch pad rather than a site editor or agent-assisted design workspace; however, it shows how an overlay tool panel can sit neatly over an underlying document.

---

### 2. Best 2–3

* **Tile 1 (Craft)**: The combination of a floating bottom tool dock and compact, visual preset cards (2×2 grids) allows the live preview to breathe. It avoids rigid full-height sidebars that crush the preview width.
* **Tile 0 (Play)**: Provides an ultra-compact popover for preview-critical toggles (separating editor appearance from site preview appearance, and toggling component outlines), preserving maximum screen area.
* **Tile 2 (Linktree)**: Offers clear, non-developer visual controls (segmented visual style chips and labeled sliders) packed into a clean tabbed sheet, directly fitting the creative director persona.

---

### 3. Borrow for Cauldron

* **Floating Canvas Tool Dock (from Tile 1 - Craft)**:
  * *Cauldron Feature*: Global viewport / mode switcher.
  * *Implementation*: When the Electron window is resized below 1100px, collapse the rigid top or left toolbars into a floating bottom pill containing Select, Pan, Add Component, and Chat Toggle. This frees up 100% of horizontal width for the live Astro preview.
* **Dual Appearance & Viewport Toggles (from Tile 0 - Play)**:
  * *Cauldron Feature*: Canvas Viewport Settings overlay.
  * *Implementation*: Anchor a small floating popover in the canvas corner to control "Editor Theme" (Light/Dark), "Site Theme" (Astro site's light/dark mode preview), and "Element Outlines" (bounding boxes for visual selection).
* **Visual Style Presets & Sliders (from Tile 2 - Linktree)**:
  * *Cauldron Feature*: Style & Content Inspector (Narrow Window Mode).
  * *Implementation*: Replace raw CSS box-model inputs with visual option chips (e.g., variant pickers like "Solid", "Glass", "Outline") and physical sliders (e.g., Border Radius: "Sharp" to "Round"). When space is tight, organize the inspector into segmented tabs (`Text` | `Layout` | `Style`) so it fits into a collapsible side drawer or floating overlay without crowding the AI chat panel.

---

### 4. Avoid

* **Heavy Bottom Sheets that Cover >50% of the Screen (Tile 2 Linktree, Tile 3 ChatGPT)**: On a desktop Electron app, massive bottom sheets feel like unpolished mobile web ports. Use floating, draggable, or docking panels instead.
* **Full Occlusion of Context (Tile 3 ChatGPT)**: Launching full-screen modal overlays prevents the creative director from seeing how changes affect the live Astro page layout in real time.
* **Hiding AI Chat Behind Submenus**: In Cauldron, the AI agent shares equal prominence with visual editing; avoiding patterns where toolbars completely crowd out conversational UI space.
