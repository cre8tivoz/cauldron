# content_forms

Model: gemini-3.8-flash (direct Google AI Studio call). Search: "CMS collection item editor form for a blog post"

## Mobbin links
- 0 Kajabi: https://mobbin.com/screens/e5540745-d1f5-4e2d-a407-411595342ae1
- 1 beehiiv: https://mobbin.com/screens/52781f20-57a5-4d5a-9160-9a32b1f0ce70
- 2 GoDaddy: https://mobbin.com/screens/f0c4bd12-a5aa-4a90-a3a2-235d585357a3
- 3 Uvodo: https://mobbin.com/screens/70a366db-4a9a-4821-83ce-5b3145bd9589
- 4 Podia: https://mobbin.com/screens/b0d4c84b-d693-4ec1-8181-66ca3ead1c8c
- 5 Front: https://mobbin.com/screens/cf4c6d09-c61d-44ad-a010-c01ff9f01676

## Analysis
### 1. Tile Summaries

#### Tile 0: Kajabi
* **Layout & Structure:** Traditional web CMS layout with a dark left sidebar navigation (~220px) and a white multi-card form split into a main content column (~65% width) and a right metadata column (~35% width).
* **Components & Fields:** 
  * "Media" card: Radio-style icon cards to select Video or Audio attachment.
  * "Post Details" card: Single-line text input for "Title", followed by a rich text editor with a classic top toolbar (Formats, B, I, alignment, lists, links, image insert).
  * Right column: "Visibility" card with radio buttons ("Published" with green badge vs. "Unpublished") and a "Set a specific publishing date" link. "Blog Image" card with a dashed upload box (showing `1280×720` specs), an upload button, and explicit text inputs for "Image Alt Attribute" and "Image Alt Text".
* **Tone/UX:** Heavy administrative form style; disjointed card containers consume large horizontal margins.

#### Tile 1: beehiiv
* **Layout & Structure:** Clean, modern newsletter/blog composer. Wide central document canvas with an open slash-command/block overlay, paired with a dense right-hand settings rail (~320px).
* **Components & Fields:**
  * Document Canvas: Title, subtitle, inline boundary ("Subscriber break"), and a dark popover menu (`#18181B` approx.) showing categorized blocks: Basics (Lists, Image, Code Block, Table, Columns), Headings (H1–H6), Embeds, and Dynamic/Paywall elements.
  * Right Rail ("Post Settings"): Tabbed header with `Post`, `Email`, `Website`, `SEO`, `Delivery`. Contains Title/Subtitle inputs with visibility toggles ("Show title in email"), Content Tags pill input, Authors selector with removable pills, guest author management, and feed toggles. Bottom action bar has Preview, Send Test, and an accent "Schedule" button.
* **Tone/UX:** Highly polished, modular, and directly parallels frontmatter metadata (sidebar) versus MDX document content (canvas).

#### Tile 2: GoDaddy
* **Layout & Structure:** Visual website builder view. Left navigation bar, central live WYSIWYG canvas showing full-width visual banner blocks, and a compact right rail (~260px) for page-level publishing properties.
* **Components & Fields:**
  * Canvas: Rendered visual sections ("Asmobbin - Your Best Web Designers", embedded YouTube player) with a floating `+` circle button between sections to add blocks.
  * Right Rail: "Featured Image" card with thumbnail preview and "Change" action button; "Categories" checklist ("web design") with inline add-category text input; draft timestamp status ("Draft saved at 7:14 pm"); secondary "Set Publish Date" button and primary dark "Publish" button.
* **Tone/UX:** Visual-first rather than text-first; settings are kept narrow to maximize canvas width.

#### Tile 3: Uvodo
* **Layout & Structure:** E-commerce/CMS blog form. Left navigation rail, broad content form on the left, and a minimal right rail showing only a publishing status dropdown.
* **Components & Fields:**
  * Top status: Simple dropdown selector ("Published").
  * Main Column: "Content" section with text input for "Title", a rich text box for "Description" with an inline text toolbar (formatting, headers, links, image/video embeds), and a dedicated "Image" card below with a dashed drag-and-drop zone (`1080 × 1080 recommended`) and an alternative "+ Add media from URL" text button.
* **Tone/UX:** Generic CRUD database entry form. Stacks media and body vertically, wasting vast horizontal space while providing minimal metadata depth.

#### Tile 4: Podia
* **Layout & Structure:** Streamlined document editor. Top utility bar with breadcrumbs (`Posts / Post / Edit`) and right-aligned "Save" / "Publish" buttons. Split screen: ~70% document canvas and ~30% right-hand inspector panel.
* **Components & Fields:**
  * Canvas: Large editable post heading, inline subtext prompt ("Type / to format and insert"), and clean rendered rich text/markdown body.
  * Right Inspector: Segmented tabs (`Summary`, `Details`, `SEO`). Under "Summary": "Publish date" dropdown ("Immediately"), "Author" dropdown ("Sam Lee"), and "Post URL" slug input with the full generated URL preview displayed beneath it. Destructive "Delete post..." action at the bottom.
* **Tone/UX:** Minimalist and calm; focuses on typography and distraction-free editing with metadata tucked neatly into inspector tabs.

#### Tile 5: Front
* **Layout & Structure:** Multi-pane knowledge-base article editor. Thin app sidebar, secondary folder navigation panel, central editor canvas, and a narrow right rail for article tags.
* **Components & Fields:**
  * Top Bar: Breadcrumb/title, green "Published" badge, "Saved" indicator, preview icon, action buttons ("Preview changes", "Unpublish", "Publish changes").
  * Canvas: Full-width article reading view with standard text formatting.
  * Floating Toolbar: Docked at the bottom center of the canvas containing text style (`Paragraph`), formatting icons (B, I, U, alignment, lists, quotes, code block, formula).
  * Right Rail: Clean, single-purpose panel for metadata ("Add article keywords" input with tag generation on Enter).
* **Tone/UX:** Clean documentation authoring; bottom-docked formatting toolbar leaves top headers uncluttered.

---

### 2. Best 2–3

* **Tile 1 (beehiiv):** The strongest architecture for Astro content collections. Astro collections strictly separate **Frontmatter** (structured metadata) from **Body** (Markdown/MDX). beehiiv mirrors this exact mental model: the right panel handles structured typed metadata with tabbed domains (`Website`, `SEO`, `Post`), while the canvas uses inline slash-commands for rich components.
* **Tile 4 (Podia):** Outstanding model for narrow viewport management. By putting post settings (`Summary`, `Details`, `SEO`) into a tabbed right inspector rather than large form cards, the main canvas retains maximum horizontal space, making it compatible with tight responsive desktop layouts.

---

### 3. Borrow for Cauldron

* **Schema-Driven Frontmatter Inspector (from beehiiv & Podia):**
  * *Cauldron Location:* Right Inspector panel when viewing/editing a `.md` or `.mdx` Content Collection entry.
  * *Pattern:* Instead of a sprawling full-page form (like Kajabi or Uvodo), generate the frontmatter schema dynamically inside the existing right inspector rail. Use Podia’s tabbed organization (`Frontmatter / General`, `SEO`, `Collection Schema`) to manage fields (date pickers, tag pills, author dropdowns, image picker, boolean draft toggles) without crowding the central visual canvas.
* **Slash-Command Block Inserter for MDX Components (from beehiiv):**
  * *Cauldron Location:* Central MDX Content Editor canvas.
  * *Pattern:* When editing collection copy, allow creative directors to trigger `/` to insert custom Astro components (callouts, image galleries, newsletter signups) visually, matching beehiiv’s dark categorized popover menu.
* **Bottom-Docked Contextual Text Toolbar (from Front):**
  * *Cauldron Location:* Canvas / Live Preview overlay during inline text editing.
  * *Pattern:* Place rich text controls (headings, bold, links, lists) in a floating pill docked at the bottom of the active editing pane. This saves 40–50px of vertical header space and avoids header toolbar clutter when previewing at 1024px window widths.
* **Integrated URL Slug & Live Preview Previewer (from Podia):**
  * *Cauldron Location:* Frontmatter Inspector → General tab.
  * *Pattern:* An editable `slug` input that directly renders the computed Astro route below it (e.g., `mysite.dev/blog/[slug]`), giving instant feedback on the live routing structure.

---

### 4. Avoid

* **Heavy Card-Based Administrative Forms (Kajabi, Uvodo):** Full-screen stacked cards with wide borders, large padding, and independent "Save" zones turn content creation into back-office database entry. They swallow horizontal width and eliminate any room for live site preview or the AI chat panel.
* **Separate "Alt Text" and "Alt Attribute" Duplicate Inputs (Kajabi):** Exposing low-level duplicate HTML attribute fields confuses non-developer creative directors; image inputs should bundle alt-text directly into a single media popover.
* **Empty/Unused Multi-Column Rails (Uvodo):** Dedicating an entire vertical column to a single "Published" dropdown wastes ~300px of width that Cauldron desperately needs for visual canvas and AI agent panels.
