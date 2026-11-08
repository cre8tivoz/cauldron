# device_preview

Model: gemini-3.8-flash (direct Google AI Studio call). Search: "website builder responsive preview with desktop, tablet and mobile breakpoint switcher"

## Mobbin links
- 0 Framer: https://mobbin.com/screens/f6a4f3a1-4979-4f6c-b545-b60f749d6461
- 1 Webflow: https://mobbin.com/screens/42c43a9a-b19b-479d-abf8-17b951c6d1a8
- 2 Figma: https://mobbin.com/screens/6f26ce58-d438-4e67-a4db-84d493b94789
- 3 Replit: https://mobbin.com/screens/f45415a4-69ea-41ee-8cae-428ae8d29a84
- 4 Wix: https://mobbin.com/screens/2f4fb217-bef2-44d0-96d0-48494458ee0e
- 5 Klaviyo: https://mobbin.com/screens/c775f746-d62f-478b-9bed-5218f42c8cbe

## Analysis
### 1. Tile Analysis

#### 0 Framer
* **Layout & Presentation:** Infinite 2D canvas displaying responsive breakpoints side-by-side as three distinct frames: `Desktop 1200`, `Tablet 1199 - 810`, and `Phone < 810`. 
* **Breakpoint Communication:** The frame headers directly display the device name and the active pixel range (e.g., `1199 - 810`). The left sidebar layer tree mirrors this hierarchy, listing each viewport variant with its bound limits.
* **Controls:** Canvas zoom control (`30%`) at the bottom. An AI agent chat panel (`Agent`, `Ask Framer...`) is docked on the far right.
* **Color:** Light gray canvas background (approx. `#EBEBEB`), white artboard surfaces.

#### 1 Webflow
* **Layout & Presentation:** Single-viewport preview centered against a dark canvas (approx. `#1E1E1E`), flanked by draggable lateral handles to resize the canvas manually.
* **Breakpoint Controls:** Top toolbar features a centered cluster of device icon buttons: Desktop (monitor), Tablet (portrait tablet), Mobile Landscape (horizontal phone), and Mobile Portrait (vertical phone). 
* **Readout & Feedback:** An editable pixel width input (`320 PX`) sits immediately beside the icons. A vertical label on the left margin of the frame explicitly communicates cascade inheritance: `"Mobile (P) Affects 479px and below"`.

#### 2 Figma
* **Layout & Presentation:** Side-by-side responsive frames arranged horizontally across an infinite canvas (`Desktop - Primary 1280`, `Tablet 800 - 1279`, `Mobile 1 - ...`).
* **Breakpoint Communication:** Canvas frame titles include the target viewport name and min/max width bounds. 
* **Controls:** Bottom-right canvas navigation pills. The right sidebar handles design/prototype properties rather than direct breakpoint simulation toggles. Off-topic regarding interactive web preview switching, but shows visual documentation of breakpoint ranges.

#### 3 Replit
* **Layout & Presentation:** Two-column split layout: conversational agent chat on the left (`Message Agent...`), interactive web preview on the right.
* **Breakpoint Controls:** The preview pane includes an internal browser address bar. The breakpoint selector is implemented as a dropdown menu labelled `Full size ▾`.
* **Readout & Feedback:** Opening the dropdown reveals a vertical list of preset physical devices grouped by brand (`iPhone SE`, `iPhone 17`, `Pixel 10`, `Samsung Galaxy S25`, etc.). There is no visible direct pixel-width readout or continuous drag handle.

#### 4 Wix
* **Layout & Presentation:** Single active preview centered on a light neutral canvas. The preview is displayed inside a stylized mobile phone frame with simulated hardware notch/status bar.
* **Breakpoint Controls:** Top bar contains a page switcher (`Page: Home ▾`) adjacent to small device toggles (desktop and mobile icons). A zoom readout sits in the center (`100% ▾`).
* **Readout & Feedback:** Binary presentation (mobile vs. desktop). Lacks tablet intermediate view or explicit pixel width readouts.

#### 5 Klaviyo
* **Layout & Presentation:** Single preview frame centered within an email/page template builder.
* **Breakpoint Controls:** Top-right utility bar features a segmented icon-and-label switch: `Desktop` (monitor icon) and `Mobile` (phone icon).
* **Readout & Feedback:** Strict binary toggle. There is no tablet breakpoint, custom width scrubbing, or pixel readout. Left sidebar hosts styling controls (color picker, text properties).

---

### 2. Best 2–3

* **Tile 1 (Webflow):** The gold standard for space-constrained responsive authoring. It combines 1-click icon toggles for key device categories, an editable precise pixel readout (`320 PX`), lateral drag handles for arbitrary viewport scrubbing, and explicit text explaining CSS cascade direction (`Affects 479px and below`).
* **Tile 0 (Framer):** Best communication of responsive ranges. Labeling frames directly with their exact range bounds (`1199 - 810`, `< 810`) provides immediate clarity without requiring deep CSS breakpoint knowledge, and shows chat and canvas coexisting cleanly.

---

### 3. Borrow for Cauldron

* **Top-Center Segmented Breakpoint Bar (from Webflow, Tile 1):**
  * *Cauldron Location:* Top toolbar of the visual preview pane.
  * *Pattern:* Place four standard toggles (`Desktop`, `Tablet`, `Mobile`, plus a `Fluid/Full` mode) directly above the preview iframe. This allows the creative director to jump to standard breakpoints with a single click without opening menus.
* **Direct Pixel Readout + Drag Handles (from Webflow, Tile 1):**
  * *Cauldron Location:* Preview frame border.
  * *Pattern:* Flank the live Astro preview iframe with subtle vertical grab-bars. As the user drags to resize, show a floating tooltip or header pill with the current width in pixels (e.g., `768px`). At narrow window sizes (such as a 1024px window where chat and inspector leave under 400px of width), auto-snap the preview to the `Mobile` preset.
* **Human-Readable Breakpoint Range Labels (from Framer, Tile 0):**
  * *Cauldron Location:* Breakpoint switcher tooltip / header badge.
  * *Pattern:* Instead of just showing device icons, display the target media query range in plain language: `Desktop (≥1024px)`, `Tablet (768–1023px)`, `Mobile (<768px)`. This grounds the non-developer creative director in the site’s actual CSS rules.
* **Split Agent Chat / Preview Balance (from Replit, Tile 3):**
  * *Cauldron Location:* Main workspace split layout.
  * *Pattern:* Adopt the equal-prominence split pane where the AI chat input is anchored on the left and the preview toolbar sits cleanly within the right pane's local header bar.

---

### 4. Avoid

* **Mandatory Side-by-Side Artboards (Framer Tile 0, Figma Tile 2):** Impossible to support when Cauldron is run in a 1024px window alongside an AI chat panel and style inspector. Side-by-side layout requires massive horizontal screen real estate.
* **Device-Name Dropdown Menus (Replit, Tile 3):** Burying breakpoints behind a dropdown (`iPhone 17 Pro`, `Pixel 10`) adds extra clicks for routine visual checks and reinforces ephemeral hardware marketing names rather than responsive web design ranges.
* **Skeuomorphic Device Bezels (Wix, Tile 4):** Drawing phone notches, status bars, and bezels consumes precious horizontal pixels inside an already cramped preview viewport.
* **Binary Desktop/Mobile Only (Klaviyo, Tile 5):** Disregarding tablet viewports is acceptable for email design, but fails for real Astro websites where responsive typography and navigation break most often in the 768px–1024px range.
