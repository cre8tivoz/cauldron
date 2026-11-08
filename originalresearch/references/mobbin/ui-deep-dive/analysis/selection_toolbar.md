# selection_toolbar

Model: gemini-3.8-flash (direct Google AI Studio call). Search: "website editor with selected element and floating contextual toolbar on canvas"

## Mobbin links
- 0 Stitch: https://mobbin.com/screens/e287470a-7c98-4ec3-bab5-7becfc91de73
- 1 Wix: https://mobbin.com/screens/cb9a4bf2-d1be-4e82-8da6-bc455da9ef9d
- 2 Base44: https://mobbin.com/screens/a3de0192-b9d6-4791-9be4-2878adb2f680
- 3 Squarespace: https://mobbin.com/screens/a8cdb079-b310-4b4c-b4a6-8aeddd374aad
- 4 Luma: https://mobbin.com/screens/5da60a2b-9552-41ae-a173-ba10bac7cda0
- 5 Craft: https://mobbin.com/screens/4e29de68-c73c-44cb-9136-1d326b32ee90

## Analysis
### Tile 0: Stitch
* **Selection Visuals:** Selected component card is highlighted with a faint blue outline. 
* **Floating Contextual Menu:** A compact white floating popover card is anchored directly to the selected element ("New York"). Header displays `Edit Element`. Contains two distinct primary actions with icons: `I Edit Text` (direct inline manipulation) and `✨ Edit With AI` (agentic generation trigger).
* **Environment:** Three-column split with tokens/components on the left, canvas in the center, and inspector on the right. A global prompt bar (`What would you like to change or create?`) is docked at the canvas bottom.

### Tile 1: Wix
* **Selection Visuals:** Selected text element (`ADVANCED AI ENTERPRISE SOLUTIONS`) has a solid blue bounding box (approx. `#2563EB`) with 8 resize handles (4 square corners, 4 edge midpoints) and a small blue pill label anchored to the top-left edge reading `Text` with an icon.
* **Floating Contextual Toolbar:** Positioned directly below the selected text box as a dark pill toolbar. Features icon buttons for edit, settings, link, animation, and a high-visibility text/icon button: `✨ Ask Aria`.
* **AI Entry Point:** Clicking `Ask Aria` connects selection context directly to the docked AI chat panel on the right (`Hello / What can I help you with?` with Aria suggestions). Property options (font, size `88`, bold, etc.) are duplicated in the top application bar.

### Tile 2: Base44
* **Selection Visuals:** An image container (t-shirt asset) on an artboard is selected with a thin white/light-gray bounding box and 4 small circular/square corner drag handles.
* **Floating Contextual Toolbar:** A dark rounded pill toolbar floats directly beneath the element, offering specific direct-manipulation image actions: an image icon, text button `Replace image`, and two action icons (aspect ratio/crop, fullscreen expand).
* **AI Entry Point:** No element-level AI button on the floating toolbar; AI interaction occurs via the global bottom prompt dock (`What would you like to build?`).

### Tile 3: Squarespace
* **Selection Visuals:** Selected paragraph block is enclosed by a blue dashed/dotted outline with solid square blue drag handles on corners and sides.
* **Floating Contextual Toolbar:** Floats directly above the text box. Offers rich-text controls: paragraph level dropdown (`Paragraph 2 v`), formatting icons (`B`, `I`, link, alignment, lists, clear formatting), and a sub-inspector trigger.
* **Attached Property Popover:** A secondary white popover panel is anchored to the right edge of the selection for deep micro-edits (`Highlight`: color swatch, thickness `0.25em`, end caps `Square` / `Round`, animation toggle), keeping edits local to the element without needing a full-page reload.

### Tile 4: Luma
* **Selection Visuals:** Selected media node triggers an extensive contextual action menu over the canvas.
* **Contextual Menu:** A tall vertical cascading menu anchored to the node. Top tier is dedicated entirely to AI generative tasks: `> Create Video`, `> Create Image`, `> Modify Image`, `Latent Blend`, `Reframe`, followed by standard direct manipulation (`Labels`, `Copy`, `Edit in Timeline`, `Export`).
* **AI Entry Point:** Generative menu actions feed directly into the right-hand agent thread panel (`Cold Brew Coffee Ad`, showing prompt status, version history, and execution logs).

### Tile 5: Craft
* **Selection Visuals:** A red branded icon on a canvas whiteboard is selected with a red dashed bounding box matching the element's primary color (approx. `#EF4444`).
* **Contextual Popovers:** Rather than an all-in-one toolbar, controls are split: a floating vertical palette on the left canvas margin (stroke, fill, font size pills `S` `M` `L` `XL`, opacity `100`), and a contextual popover pinned next to the element showing `In this scene` typography options (`Excalifont`, `Comic Shanns`, `Nunito`).

---

### Best 2–3

* **Tile 1 (Wix):** Best complete model for a visual site builder. Combines an unambiguous element badge (`Text`), clear bounding box handles, and a floating toolbar that explicitly bridges visual selection to the AI assistant via the dedicated `✨ Ask Aria` button.
* **Tile 0 (Stitch):** Best minimalist interaction. The tiny attached menu offering explicit branching—`Edit Text` (manual) vs `Edit With AI` (prompt agent)—perfectly serves a creative director who needs to alternate between quick direct tweaks and delegating heavy lifting.
* **Tile 3 (Squarespace):** Best viewport-saving architecture. By using a floating rich-text bar above and an attached property popover (e.g., Highlight options) anchored beside the element, deep property inspection happens on-canvas without consuming 300px+ of fixed horizontal sidebar width.

---

### Borrow for Cauldron

* **Floating Selection Pill with "Ask AI" Action (from Wix & Stitch):**
  * *Cauldron Feature:* Canvas Selection Overlay.
  * *Pattern:* When an Astro component/HTML tag is clicked, display a thin outline with an attached tag (`<HeroSection>`, `<h2>`, `<Card>`). Floating immediately above/below it is a compact pill toolbar containing direct actions (Delete, Reorder, Duplicate) plus a prominent `✨ Ask AI` button. Clicking it focuses the equal-prominence AI agent chat, automatically inserting `@selection (<tag#id>)` into the prompt input.
* **Anchored Micro-Property Popovers (from Squarespace):**
  * *Cauldron Feature:* Style & Content Inspector on small viewports (e.g., 1024px window).
  * *Pattern:* Instead of forcing a permanently docked right inspector panel that squashes the live preview to 398px, trigger contextual micro-popovers (color picker, typography, spacing) directly from the floating canvas toolbar. This allows the AI chat and preview to share the main screen space evenly.
* **Dual "Direct Edit vs. Prompt AI" Toggle (from Stitch):**
  * *Cauldron Feature:* Component Content Editing.
  * *Pattern:* Double-clicking a text or image element displays a two-button quick card: `Edit Locally` (enables inline text editing / file upload) and `Prompt Agent` (prompts: *"Rewrite headline for younger audience"* or *"Swap with Unsplash image"*).

---

### Avoid

* **Overwhelming Multi-Tier Vertical Menus (Tile 4 - Luma):** Menus with 15+ stacked items (`Create Video`, `Latent Blend`, `Reframe`, `Edit in Layer Editor`, etc.) cover the preview completely, disorienting creative directors who rely on visual feedback.
* **Triple Control Redundancy (Tile 1 - Wix):** Displaying text controls simultaneously on the top global header, the floating canvas toolbar, and the right panel wastes precious vertical and horizontal space.
* **Detached Left Canvas Palettes (Tile 5 - Craft):** Placing element styling bars far away along the left viewport edge disconnects the controls from the visual element being modified, creating unnecessary mouse travel.
