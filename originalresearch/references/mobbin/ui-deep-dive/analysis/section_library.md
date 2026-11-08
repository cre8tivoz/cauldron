# section_library

Model: gemini-3.8-flash (direct Google AI Studio call). Search: "website builder add section panel with prebuilt section templates"

## Mobbin links
- 0 GoDaddy: https://mobbin.com/screens/29203181-afea-4156-8940-0174b0834069
- 1 Wix: https://mobbin.com/screens/d03568f8-2df6-48b8-9896-874d11c8a7ce
- 2 Squarespace: https://mobbin.com/screens/043d9866-d11c-4729-a54e-c86c1b84e3d4
- 3 Biosites: https://mobbin.com/screens/c9518646-c846-44b0-8667-c44c6fd9ac5d
- 4 Podia: https://mobbin.com/screens/a316a13a-86d7-40ec-9d81-a2d467bcc444
- 5 Teachable: https://mobbin.com/screens/e8c9d329-97d8-4b04-aa1c-843d6912c117

## Analysis
### 1. Tile Analyses

#### 0 GoDaddy
* **Layout & Position:** Right-aligned slide-out drawer/modal covering roughly 40% of the screen width over a dimmed canvas preview.
* **Navigation & Structure:** Split into two internal panes:
  * Left sub-rail (dark grey background, approx. `#222`): search input at top (`Search`), followed by system groupings (`Recommended`, `Popular`, `Premium` with star icon) and topical categories (`Audio & Video`, `Blog & Newsletter`, `Commerce`, `Contact`, `Files & Web`, `General`, `Image Gallery`, `Restaurant`, `Scheduling`, `Social Links`).
  * Right thumbnail feed (darker background): vertical stack of prebuilt card templates. Each card has a visual thumbnail preview, a category tag/header (e.g., `BLOG`, `COUNTDOWN TIMER`), descriptive text, and a prominent white `Add` button.
* **Dismissal:** Top-right `✕` icon.

#### 1 Wix
* **Layout & Position:** Large centered floating modal dialog spanning ~75% width and ~80% height over a dimmed canvas.
* **Navigation & Structure:**
  * Header: Title `Add Section`, secondary button `Generate with AI` (with sparkle icon) at top-right, and close button `✕`.
  * Left sidebar (white, ~20% width): `+ Blank Section` primary action at top, followed by a vertical category list (`Welcome`, `About`, `Portfolio`, `Services`, `Contact Info`, `Products`, `Features`, `Promote & Engage`, `Call to Action`, `Reviews & Credibility`, `Events`, `Blog & Resources`, `Pricing`, `Resume`).
  * Main content grid (~80% width): multi-column visual grid showing rendered wireframe/full-color section preview cards (approx. 3 columns visible), some badged with tag chips (e.g., blue `Wix Stores`).
* **Interaction:** Hovering/clicking thumbnails presumably inserts them onto the active page insertion marker.

#### 2 Squarespace
* **Layout & Position:** Massive centered floating modal covering ~85% of screen width, light theme with high whitespace.
* **Navigation & Structure:**
  * Top bar: `CLOSE` button, title `Add a Section`, search bar (`Q Search`), view switcher icons (grid/list view toggle), and sort dropdown (`DATE CREATED`).
  * Left category sidebar: Action items (`+ Add Blank`, `♡ Saved`), followed by grouped functional categories:
    * *Introduce:* `Intro`, `About`, `Contact`, `Team`, `FAQs`.
    * *Sell:* `Products`, `Services`, `Group Events`, `Content & Memberships`, `Scheduling`, `Donations`.
    * *Showcase:* `Images`, `Portfolio`, `Testimonials`.
  * Main preview panel: Large rendered section thumbnail display (showing realistic typography, imagery, and layout, labeled `Section 2`).

#### 3 Biosites
* **Layout & Position:** Left-hand docking panel (~45% screen width) alongside an active mobile phone canvas preview on the right.
* **Content:** This screen shows `My Sections` (an outline of currently placed sections: `Profile`, `Podcast Recommendation`, `Social`, `Links`, `Latest YouTube Video`, `Visit My Instagram`) and a lower section `CONTENT` with add buttons (`+`) for atomic blocks (`Links`, `Text Box`, `Linked TikTok Feed`, `Video`, `Music / Podcast`).
* **Fit:** Off-focus for prebuilt composite sections; it models link-in-bio widget stacks and slot management rather than a responsive website section template catalog.

#### 4 Podia
* **Layout & Position:** Left drawer (~25% screen width) titled `Insert section` pushing or overlaying the live site preview.
* **Navigation & Structure:** Plain text list of section categories: `Saved sections`, `About`, `Call to action`, `Categories`, `Email form`, `FAQs`, `Image`, `Links`, `Plans`, `Products`, `Testimonials`, `Text`, `Video`.
* **Interaction:** Pure hierarchical text navigation with chevron arrows (`>`); selecting a category likely expands into variants or immediately adds a bare template. Lacks visual thumbnails in this initial state.

#### 5 Teachable
* **Layout & Position:** Left-docked narrow utility drawer (~20% screen width) titled `< Add New Block`.
* **Structure:** Single column split into two sub-headers:
  * `BASICS`: `Image`, `Text`, `Button`, `Video`, `Email Leads Form` (with an active green `ADD` pill button next to it).
  * `LAYOUTS`: `Upsell`, `Image with Text`, `Banner`, `Text with Image Grid`, `Featured Products`.
* **Interaction:** Text-heavy, minimal visual preview. Adding appears to append the block directly to the active curriculum/landing page layout shown on the right.

---

### 2. Best 2–3

* **Tile 1 (Wix) — Best for visual browsing and AI parity:**
  * *Why:* Clean separation between quick categories, blank escape hatches (`+ Blank Section`), an explicit `Generate with AI` entry point directly inside the section chooser, and dense, realistic multi-column thumbnails that let a creative director evaluate layout density instantly.
* **Tile 2 (Squarespace) — Best information architecture and curation:**
  * *Why:* Grouping categories by business intent (*Introduce*, *Sell*, *Showcase*) rather than generic technical types helps non-coders find appropriate sections quickly. The inclusion of `Saved` sections provides a workflow for design reusability.
* **Tile 0 (GoDaddy) — Best compact side-drawer model:**
  * *Why:* Keeps the main page visible behind it rather than blanking out the editor. Clear card layout with explicit `Add` buttons and short category tags prevents accidental mis-clicks.

---

### 3. Borrow for Cauldron

* **Intent-driven Category Taxonomy (from Squarespace, Tile 2):**
  * *Cauldron Location:* `Add Section` panel / Command palette.
  * *Pattern:* Group Astro component templates by goal (`Hero & Intro`, `Social Proof & Reviews`, `Feature Grids`, `Content & Blog`, `Conversion / CTA`) rather than Astro component filenames.
* **`Generate with AI` header hook alongside prebuilts (from Wix, Tile 1):**
  * *Cauldron Location:* Section library header directly integrated with the AI Agent panel.
  * *Pattern:* When browsing prebuilts, provide a persistent action: `✨ Generate with AI`. Clicking it shifts focus to the chat panel with a prefilled prompt context: `"Generate a new custom section for [selected category] matching the current design tokens"`.
* **Overlay Drawer vs. Full Modal based on viewport width (from GoDaddy Tile 0 & Wix Tile 1):**
  * *Cauldron Location:* Window responsiveness architecture.
  * *Pattern:* On wide desktop screens (>1440px), open the Section Library as an overlay drawer (Tile 0) from the right or left edge to preserve visual canvas context. On compact windows (1024px, where canvas is only 398px), open it as a focused modal sheet (Tile 1/2) that temporarily covers preview and chat, returning 100% of the canvas once a section is dropped.
* **Licence-Safe Section Model (Tailwind/HTML Astro blocks):**
  * *Cauldron Implementation:* Prebuilt sections should be pure open-source MIT Astro/Tailwind snippets stored locally on disk. Provide `+ Blank Section` (Tile 1) and `Saved` / `Custom Components` (Tile 2), allowing users to save any container on their canvas into their personal offline template bank.

---

### 4. Avoid

* **Blind Text-Only Lists (Podia Tile 4 & Teachable Tile 5):** Text labels like `Banner` or `Image with Text` without live layout previews force creative directors to guess aspect ratios and padding before inserting.
* **Tiny Mobile-Only Block Paradigms (Biosites Tile 3):** Treating sections as generic mobile app slots strips out desktop layout variations, multi-column grids, and breakpoint controls.
* **Overwhelming Full-Screen Modals at Standard Breakpoints (Squarespace Tile 2):** Covering 90%+ of the viewport disconnects the user from the visual flow of the page, making it impossible to see preceding and succeeding section spacing.
