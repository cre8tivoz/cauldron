# craft_linear

Model: gemini-3.8-flash (direct Google AI Studio call). Search: "Linear issue detail view"

## Mobbin links
- 0 Linear: https://mobbin.com/screens/cef36326-d8ec-4c6f-acd4-a9f1e1060d33
- 1 Linear: https://mobbin.com/screens/16e4d0c7-bf36-4daa-98f5-d3d31882cfec
- 2 Linear: https://mobbin.com/screens/953e88d0-de6c-4eaf-9921-cd0c55bb8412
- 3 Linear: https://mobbin.com/screens/beb9d6b3-ec34-46d7-9332-320fcb32a338
- 4 Linear: https://mobbin.com/screens/00bd911e-49f4-4e9c-998b-5f6ac25c0dfb
- 5 Linear: https://mobbin.com/screens/136da279-adbd-4b9f-9f50-4034c458a851

## Analysis
### 1. Tile Breakdown

#### Tile 0 (Linear)
* **Layout & Structure:** 3-column architecture (collapsible left app navigation ~220px, central content stage for issue details/activity ~650px, right contextual metadata inspector ~240px). 
* **Layering & Borders:** Pure white background (`~#FFFFFF`) for the canvas; left sidebar uses a virtually imperceptible ultra-light warm grey (`~#FAFAFA` to `#F7F8F9`). Vertical dividers are single-pixel hairlines (`~#EAEAEA` / `#E5E7EB`).
* **Typography & Hierarchy:** High-contrast sans-serif type hierarchy. Large title (`~20px`, semi-bold `#111827`), body copy (`~14px`, regular `#374151`), secondary metadata labels (`~11–12px`, muted `#6B7280`).
* **Inspector Treatment:** Right-hand inspector groups fields under compact section headers (`Properties`, `Labels`, `Project`) in muted uppercase/small-caps styling (`~11px`). Values are rendered as ghost chips/rows (e.g., circular icon + `Todo`, `--- Set priority`, `Assign`) with generous horizontal hit-targets and faint hover boundaries.
* **Input Box:** Bottom comment composer floating with hairline top border, muted placeholder text (`Leave a comment...`), and subtle right-aligned action triggers.

#### Tile 1 (Linear)
* **Sub-issue / Data List Density:** Nested list view ("Sub-issues 0/4") embedded directly within the content stream. Row height is strictly constrained (`~28–32px`).
* **Row Anatomy:** Left-aligned circular completion icon (`12–14px`), followed by issue title in crisp `13px` regular text.
* **Inline Chips & Metadata:** Right-aligned metadata cluster on each row: solid/tinted mini-pills for labels (e.g., orange-tinted `Feature`, yellow-tinted `UI`), estimate icon/badge (`1w`), and circular assignee avatar (`~16px`).
* **Visual Rhythm:** No heavy borders between list items; rows are separated purely by subtle whitespace and hairline dividers, maintaining high information density without clutter.

#### Tile 2 (Linear)
* **Inline Child Creation Card:** Activating "+ Add sub-issue" expands an inline card directly inside the reading flow without triggering a modal or navigating away.
* **Card Anatomy:** Bounded by a crisp hairline border (`~1px solid #E5E7EB`) with subtle rounded corners (`~6px`). Contains two text levels: primary `Issue title` input and secondary `Add description...`.
* **Action Footer:** Embedded bottom toolbar inside the card featuring compact metadata assignment buttons (`Priority`, `Assignee`, `Estimate`, `Labels`) accompanied by low-profile `Cancel` and primary `Create` action buttons.

#### Tile 3 (Linear)
* **Master-Detail Multi-Column View:** Shows Linear accommodating a multi-panel layout (Left Navigation -> Middle "Inbox" List -> Right "Issue Detail + Properties").
* **List Row States:** Middle inbox list uses micro-avatars, status circles, bold/medium issue titles, and right-aligned relative timestamps (`13min`, `22min`) in `11px` muted grey. Active selection is indicated by a subtle grey tint across the row.
* **Header Micro-Navigation:** Top breadcrumb bar (`AS-9 Define problem statement & hypothesis`) shares vertical space with global actions (star, notifications, close/collapse), conserving vertical viewport height (`~36–40px` total header height).

#### Tile 4 (Linear)
* **Horizontal Property Bar:** Rather than a tall right-hand inspector, the top of the project page arranges key attributes horizontally: `Properties`, `Backlog` (chip with icon), `No priority`, `Lead`, `Target date`.
* **Activity & Document Stream:** Combines structured text with rich media blocks (large high-contrast visual card `AS_MOB` embedded within update comments).
* **Sidebar Grouping:** Right sidebar provides clear categorized blocks (`Properties`, `Dates`, `Teams`, `Slack`, `Labels`, `Milestones`) with a subtle "+ add" or chevron indicator per row.

#### Tile 5 (Linear)
* **AI Agent Conversational Pane ("Ask Linear"):** Full-height dedicated agent conversation view ("Generate Linear issues from UI design").
* **Message Formatting:** Structured agent responses formatted with clean markdown hierarchy: bold labels (`• Acceptance Criteria:`, `• Priority: Medium`), clear indentation, and inline mention tokens (`@SLMobbin`).
* **Input Bar & Capabilities Pill:** Bottom chat input field with rounded container, placeholder text (`Reply...`), right-aligned submission icon, and an embedded `Skills` badge/button showing tool execution capabilities.

---

### 2. Best 2–3

* **Tile 1 (Linear):** Best benchmark for compact, ultra-dense metadata styling. Shows how status glyphs, tiny color-coded tag pills, estimate badges, and micro-avatars can sit on a single `28px` row without visual vibration.
* **Tile 2 (Linear):** Best inline contextual creation pattern. The border treatment, subtle background separation, and inline toolbar provide immediate editing ergonomics while preserving parent context.
* **Tile 5 (Linear):** Essential benchmark for the AI agent panel. Demonstrates how an AI conversation can feel like a rigorous professional tool (markdown hierarchies, tokenized pills, "Skills" dropdown) rather than a toy chatbot.

---

### 3. Borrow for Cauldron

* **Collapsible / Floating Breadcrumb Header Bar (from Tiles 0 & 3):**
  * *Cauldron Screen/Feature:* Top bar of the visual site builder.
  * *Implementation:* Restrict the top header to `36px` height. Place page path breadcrumbs (`Pages > blog / [slug].astro > <header.hero>`) alongside viewport controls and zoom level. Use `11–12px` medium text with faint separator chevrons to reclaim maximum vertical space for the canvas.
* **Inline Property Inspector with Ghost Hit-Targets (from Tiles 0 & 4):**
  * *Cauldron Screen/Feature:* Style/Content Inspector (when paired alongside the live preview).
  * *Implementation:* Instead of heavy input boxes, render CSS attributes (e.g., `Display: flex`, `Gap: 16px`, `Font: Inter`) as hairline ghost chips with `11px` uppercase category headers. Clicking immediately transforms the chip into an inline micro-slider or dropdown, reducing visual weight and saving horizontal space on a 1024px window.
* **Compact "Skills" Agent Composer (from Tile 5):**
  * *Cauldron Screen/Feature:* AI Agent Chat Panel (sharing 50% split with preview).
  * *Implementation:* Build the chat input with a bottom pill dock containing an agent mode/scope indicator (e.g., `⚡ Active Scope: <section.hero>`) and quick-action tokens. Format AI suggestions with the clean bulleted, bolded Linear markdown structure so proposed Astro component changes appear as structured diffs rather than unstructured conversational text.
* **Inline Insertion Card Pattern (from Tile 2):**
  * *Cauldron Screen/Feature:* Component / Section Inserter within the live DOM tree or page preview.
  * *Implementation:* When adding a child Astro component or slot, expand an inline insertion box within the layer list or inspector with immediate inline inputs (`Component name`, `Props template`, `Cancel`, `Insert`) instead of opening a modal over the preview canvas.

---

### 4. Avoid

* **Fixed Multi-Column Layouts (Tile 3):** Linear's 3-pane layout (nav + list + detail inspector) works on widescreen monitors but fails on narrow 1024px windows. For Cauldron, do not use persistent multi-column sidebars; the layout must allow panels (inspector/layers) to fold into overlay drawers or split modes so the live Astro preview and AI chat maintain adequate width.
* **Low-Contrast Micro-Labels for Critical Actions:** Linear’s ultra-faint grey labels (`#6B7280` down to `~#9CA3AF`) and ghost buttons rely heavily on expert muscle memory. Creative directors need immediate visual clarity; avoid hiding interactive bounds so completely that users cannot distinguish editable style fields from static text.
* **Scattered Property Inspector Attributes (Tile 4 right sidebar):** Spreading properties down a tall vertical list with excessive blank space between categories leaves no room for concurrent AI interaction; group related design tokens into horizontal multi-segmented controls instead.
