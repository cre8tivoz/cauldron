# project_home

Model: gemini-3.8-flash (direct Google AI Studio call). Search: "design tool home screen with recent projects grid"

## Mobbin links
- 0 Figma: https://mobbin.com/screens/41148519-a75e-4cd7-b8b2-726771086607
- 1 MagicPath: https://mobbin.com/screens/77bb103c-dca2-4181-b1b3-a60d7cd0f96b
- 2 Canva: https://mobbin.com/screens/d60d997d-1815-490c-9033-7cfa02fabe23
- 3 Descript: https://mobbin.com/screens/ea11b53d-998a-4a3d-b750-f5f289253833
- 4 Jitter: https://mobbin.com/screens/29b3592c-bd47-499b-966c-75f6b50d8352
- 5 Relume: https://mobbin.com/screens/8d2dd836-86bf-4b3a-ab5d-7a78b12af667

## Analysis
### 1. Tile Analysis

#### 0 Figma
* **Layout & Style:** Dark-themed workspace (~`#1E1E1E` canvas, `#2C2C2C` sidebar/card headers).
* **Left Sidebar:** User/team switcher (`Alex Smith`), global search, primary navigation (`Recents`, `Templates and tools`, team drafts, `Trash`, `Starred`).
* **Top Bar:** Multi-type creation chips (`Design`, `FigJam`, `Slides`, `Buzz`, `Site`, `Make`). Filter/sort dropdowns aligned right (`All organizations`, `All files`, `Last viewed`).
* **Project Grid:** 3-column grid of rectangular project cards. Cards feature a 16:9 canvas thumbnail with live design previews on an off-white background, framed by a dark footer containing the project type icon, title (e.g., `Brunch Is Here to Stay`, `Auto layout components`), and relative edit time (`Edited 19 hours ago`).

#### 1 MagicPath
* **Layout & Style:** Clean, high-density light mode with subtle gray borders (~`#E5E7EB`).
* **Left Sidebar:** Workspace selector, section navigation (`My files`, `Shared with me`, `Favorites`), resource links (`Community`, `Documentation`), and a bottom link to `Download macOS app`.
* **Toolbar:** View filter tabs (`All`, `Files`, `Libraries`), search icon, `Last modified` dropdown, view toggle (grid/list), and an accent green primary CTA button (`+ New file`).
* **Project Grid:** Begins with a dashed/ghost "Create a new design" card containing a centered `+` icon. Project cards render real UI wireframe previews with a bottom metadata row (status color pill, project name, `Edited X ago`). An open context menu on one card displays: `Duplicate project`, `Share`, `Turn into a library`, `Delete`.

#### 2 Canva
* **Layout & Style:** Prosumer light theme dominated by a large pastel gradient hero banner (`#D8B4FE` to `#93C5FD` approximate).
* **Header / Search Area:** Prominent headline *"What will you design today?"*, wide search bar with scope pills (`Your designs`, `Templates`, `Canva AI`), followed by secondary filter pills (`Type`, `Category`, Owner, Date modified).
* **Main Content:** Section titled `Designs` showing vertical-aspect cards with full-bleed graphic template thumbnails. Footer text lists title, design type (`Presentation`, `Instagram Post`), and timestamp (`Edited 1 hour ago`).
* **Fit:** Off-topic/too consumer-oriented; banner takes up excessive vertical real estate for a professional desktop tool.

#### 3 Descript
* **Layout & Style:** Minimalist, high-density light-mode list view rather than a card grid.
* **Header & Controls:** Global search bar at top center. Right-side actions include a pill button `Record` and a solid black primary CTA `New project`. Section header `Recents` with segmented toggle (`All` / `Owned by me`) and list/grid switch.
* **Content Structure:** Detailed data table with columns: `Name` (tiny thumbnail icon + filename), `Duration`, `Workspace` (with lock icons), `Owner`, `Created`, and `Last Viewed`.
* **Fit:** Audio/video specific metadata (duration), but provides a strong reference for a secondary dense list view.

#### 4 Jitter
* **Layout & Style:** Highly polished, minimalist light mode with generous whitespace and editorial typographic craft.
* **Header & Greeting:** Top utility navigation (`Templates`, `Pricing`, `Changelog`, `My files` pill). Main view opens with an editorial greeting: *"Happy Monday!"* in bold display type.
* **Primary Actions:** Two large, prominent pill CTAs side-by-side: solid violet (`+ Create new file`) and cyan (`Import from Figma`).
* **Grid & Cards:** Generous 2-column card layout displaying rich mobile device frame mockups against dark backgrounds. Metadata is clean and uncluttered: title (`Design Mockup`, `Showreel Grid Mobile [remix]`) and precise timestamp (`Last edited on April 15, 2024 at 6:56 PM`).

#### 5 Relume
* **Layout & Style:** SaaS dashboard layout with utility top bar and left navigation (`Site Builder`, `Personal`, component libraries).
* **Top Bar:** Search input (`Search for a project or a component`), secondary button `Import`, and primary purple button `+ New Project`.
* **Main Content:** Section header `Recent Projects` with invite and trial countdown banners. Projects are presented as horizontal rectangular cards showing text details (`Banking Landing Page`, `Edited 16 hours ago`, three-dot action button) adjacent to a featured tutorial video card (`Getting Started Tutorials`). Thumbnails are minimal or absent in the visible row.

---

### 2. Best 2–3

1. **Tile 1 (MagicPath) — Best Overall Architecture:**
   * Combines an inline empty/create state (the dashed `+ Create a new design` card as the first slot) with live visual site thumbnails, explicit sorting/filtering, and a complete project-level context menu (`Duplicate`, `Delete`, `Rename`). Perfect balance of desktop utility and visual clarity.
2. **Tile 4 (Jitter) — Best Craft & Action Hierarchy:**
   * The dual-CTA pattern (`+ Create new file` and `Import from...`) directly maps to desktop website builders (`New Astro Project` vs `Open Existing Folder`). The editorial typography and large visual project previews convey high-end design tool polish without relying on heavy illustrations or enterprise clutter.

---

### 3. Borrow for Cauldron

* **Dual Primary Action Bar (from Tile 4 - Jitter):**
  * *Cauldron Feature:* Home / Launch screen.
  * *Implementation:* Place two prominent side-by-side buttons at the top of the home screen: `+ New Astro Site` (scaffolds blank or template) and `Open Local Folder` (opens an existing Astro project from disk). Creative directors work with existing repos or client folders and need immediate access to both paths.
* **Inline "Create" First-Card Slot (from Tile 1 - MagicPath):**
  * *Cauldron Feature:* Recent Projects Grid.
  * *Implementation:* The first card in the project grid should be an outline/ghost card with a centered `+` icon and text `New Project`. This guarantees that even in an empty state (zero recent projects), the user has a clear, discoverable target without navigating sub-menus.
* **Live Site Thumbnail Cards with File Context (from Tile 0 - Figma & Tile 1 - MagicPath):**
  * *Cauldron Feature:* Project Cards.
  * *Implementation:* Render a real headless screenshot of the Astro project's `index.html` as the card cover (16:9). In the card footer, show the project title, local directory path (truncated), relative edit time, and a 3-dot menu with desktop-native actions (`Show in Finder/Explorer`, `Duplicate`, `Remove from Recents`).
* **Density Switcher (Grid vs. List) (from Tile 1 - MagicPath & Tile 3 - Descript):**
  * *Cauldron Feature:* Home screen navigation bar.
  * *Implementation:* Provide an icon toggle between a visual preview grid (for creative directors assessing visual style) and a compact list/table view showing Path, Branch, and Last Modified (for rapid switching across multiple client sites on smaller screens).

---

### 4. Avoid

* **Marketing/Consumer Hero Banners (Tile 2 - Canva):** Massive gradient banners with promotional search prompts (`"What will you design today?"`) waste vertical height and feel like consumer web apps rather than a pro desktop IDE.
* **Cloud/Collaboration Heavy Sidebar Clutter (Tile 0 - Figma, Tile 5 - Relume):** Complex team hierarchies (`Drafts`, `Workspaces`, `Invite team`, `Upgrade / Billing banners`) are irrelevant and distracting for a free, open-source local Electron application.
* **Non-Visual Dense Lists as the Only View (Tile 3 - Descript):** Stripping thumbnail previews entirely alienates creative directors who identify web projects by visual layout rather than directory or repo names.
