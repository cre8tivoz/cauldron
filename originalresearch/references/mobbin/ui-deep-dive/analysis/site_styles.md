# site_styles

Model: gemini-3.8-flash (direct Google AI Studio call). Search: "website builder site styles panel for fonts and colours"

## Mobbin links
- 0 Savee: https://mobbin.com/screens/1c33edec-04b9-46c3-aa6c-fc601bbfbd79
- 1 Contra: https://mobbin.com/screens/2f14f29b-43ff-4db3-bc94-213866e861dd
- 2 Gamma: https://mobbin.com/screens/d5cb7477-bb1c-4fb0-b818-9221545de6cc
- 3 Polywork: https://mobbin.com/screens/e1c3e76e-1625-4355-be2e-478c72275fea
- 4 beehiiv: https://mobbin.com/screens/e22fe3ce-d610-4604-ba4f-ab0b989f8fec
- 5 Webflow: https://mobbin.com/screens/02270f56-5c4a-4efb-823e-37c298a1b58e

## Analysis
### 0 Savee
* **Layout & Structure:** Dark-themed left inspector sidebar (~260px wide) alongside a white canvas preview area displaying hero text and placeholders.
* **Style Controls:** Divided vertically into `COMPONENT` and `SITE` sections. 
  * Under `COMPONENT`: Font picker dropdown (`Brat`), weight (`Regular 700`), font size (`30`), alignment icon group, letter spacing (`11`), line height (`1.05`), and a hex color field (`#040404`, `100%`) directly above an expanded square saturation/brightness color picker with a hue slider and an `Inherit from page` toggle.
  * Under `SITE`: Collapsed/secondary block specifying global font (`Inter`) and weight (`Regular`).
* **Observation:** Mixing component-level overrides directly above site-level inheritance in a single panel eats vertical space, especially with an expanded inline color picker.

---

### 1 Contra
* **Layout & Structure:** Clean, light-themed 3-column composition: live portfolio preview centered ("SAM LEE"), right-aligned `Customize` drawer (~300px wide).
* **Style Controls:** Tabbed at the top into `Styles` and `Logo`. 
  * **Font:** Strict pairing model with two dropdowns: `Headline` (`Cabinet`) and `Body` (`Satoshi`).
  * **Colors:** Minimalist token list. `Font color` (Primary swatch with hex `#131313`) and `Background color` (Primary swatch with hex `#FFFFFF`).
  * **Footer:** Pinned action buttons: full-width dark pill `Publish` and text-button `Reset to default`.
* **Observation:** Minimal, high-level creative direction model. Abstracts away low-level CSS knobs into two font choices and two core color tokens, taking minimal horizontal space.

---

### 2 Gamma
* **Layout & Structure:** Full-screen modal or dedicated theme view. Divided into a left navigation sub-list, a center configuration panel (~340px wide), and a right live-preview canvas.
* **Navigation & Categories:** Left list categorizes theme tokens into `Colors`, `Fonts` (active, highlighted blue), `Logo`, `Design`, and `Images`.
* **Style Controls:** 
  * Under `Headings`: Font dropdown (`MuseoModerno`), weight (`Medium`), duotone/gradient color chips (e.g. `#3D3E44 0%`, `#AAAE06 100%`), and an `Advanced` disclosure.
  * Under `Body`: Font dropdown (`Inter`), weight (`Light`), single color swatch (`#3D3E44`), and an `Advanced` disclosure.
  * Accessibility callout at bottom: *"Note: text colors may be lightened or darkened for contrast and accessibility."*
* **Live Preview:** Dedicated preview pane with a tab switcher: `Test page` vs. `Current page`. The `Test page` renders a complete design-system specimen sheet (headings, body copy, inline links, colored buttons, and card timeline layouts).

---

### 3 Polywork
* **Layout & Structure:** Top navigation with an `Editor` sub-bar (tabs: `Layout`, `Color`, `Type` [active], `Blocks`). Left sidebar panel (~320px wide) over a centered profile page live preview.
* **Style Controls:** Labeled "Choose your typography", structured as selectable "Font Pack" cards:
  * `Font Pack 1 (Free)`: Shows display name `DM Sans`, paired secondary font `Cormorant Garamond`, and a live rendered specimen sentence (*"The Purple And Blue Cosmos Turned To A Red And Green Sunset"*).
  * `Font Pack 2 (Premium)`: Shows `IBM Plex Sans` paired with `IBM Plex Mono` with specimen preview.
* **Observation:** Treats typography as pre-curated design pairings rather than forcing the user to configure individual font families and weights from scratch.

---

### 4 beehiiv
* **Layout & Structure:** Top header with breadcrumbs (`Styles > Layout > Settings`). Left sub-navigation showing `← Typography` with a live newsletter preview on the right.
* **Style Controls:** Granular breakdown by element role:
  * `Global Headings`: Font family dropdown (`Inter`).
  * `Global Body`: Active dropdown displaying a searchable font list (`Inter`, `Arial`, `Bitter`, `Courier`, `Didot`, and an explicit `+ Add Google Font` button).
  * `Global Button`: Dedicated font dropdown (`Inter`).
* **Observation:** Highly functional and supports external font imports, but separates headings, body, and buttons into disconnected dropdowns without visual specimen previews.

---

### 5 Webflow
* **Layout & Scope:** Dark-themed workspace displaying a project settings modal under `Interface > Appearance`.
* **Relevance:** **Off-topic.** This panel controls the Webflow designer's own editor UI theme (`Darker`, `Default`, `Brighter` interface swatches with size and height tokens), rather than site-wide design styles or tokens for the website being built.

---

### Best 2–3

1. **Gamma (Tile 2):** Best end-to-end design token architecture. Pairing font roles (Headings + Body) with immediate color assignments and a dedicated "Test page" preview mode lets a creative director test the entire design system on real UI elements (buttons, cards, text hierarchy) at once.
2. **Contra (Tile 1):** Best compact footprint for responsive constraints. Reduces global design direction to four clean primitives (Headline font, Body font, Text color, Background color). Fits into a narrow sidebar without choking the visual canvas.
3. **Polywork (Tile 3):** Best presentation for non-developers. "Font Packs" present pre-composed typography pairings with live specimen sentences in the card, eliminating the trial-and-error of picking individual font families.

---

### Borrow for Cauldron

* **Curated Typography Pairing Cards (Polywork Tile 3 + Contra Tile 1):**
  * *Cauldron Feature:* **Site Design Panel / Typography Tab.**
  * *Implementation:* Instead of isolated font pickers, provide curated pairing cards (e.g., "Editorial Serif", "Neo-Grotesque Tech") displaying Heading font + Body font with a 1-line specimen preview. Selecting a card immediately binds global Astro typography tokens (`--font-heading`, `--font-body`).
* **"Style Guide / Specimen" Canvas Mode (Gamma Tile 2):**
  * *Cauldron Feature:* **Live Canvas Viewport Toggle.**
  * *Implementation:* Add a segmented control in the canvas toolbar: `Page Preview` | `Design System Sheet`. When editing global styles, switching to the Design System sheet shows all Astro components (H1–H6, buttons, inputs, cards) together so the user can verify contrast and scale instantly without navigating across pages.
* **High-Level Token Abstraction in a Narrow Panel (Contra Tile 1):**
  * *Cauldron Feature:* **Global Styles Inspector (Right Sidebar).**
  * *Implementation:* To preserve space for the AI chat panel and live preview at 1024px, limit the default global design panel to a compact ~260px drawer containing four core swatches: Headline Font, Body Font, Brand/Accent Color, and Base Background Color, with an "Advanced" accordion disclosure for granular CSS variable overrides.

---

### Avoid

* **Component Overrides Mixed into Global Panels (Savee Tile 0):** Placing component-level adjustments and full inline HSV color pickers directly above global site tokens causes visual confusion and bloats vertical space.
* **Uncurated Multi-Dropdown Sprawl (beehiiv Tile 4):** Avoid separate, disconnected font dropdowns for Headings, Body, and Buttons without pairing suggestions or visual previews; it forces creative directors into tedious menu hunting.
* **Workspace Theme vs. Site Theme Ambiguity (Webflow Tile 5):** Keep Cauldron's own UI appearance settings strictly separated from the site-wide styles applied to the user's Astro project.
