# Cauldron Astro — UI research (Mobbin deep dive)

**Status:** retained UI research with recorded grilling decisions. The app is built to a partial acceptance checkpoint (`82fc6c6`); implementation remains paused. Current evidence and unresolved UI coverage are in the app's `docs/plan-verification.md` and local finding 04. Suggestions below require traceability to the agreed plan or Billy's recorded decisions before implementation.
**Date:** 6 November 2026.
**Covers plan item 3.1** (workspace layout and the app's own polish), plus the UI for items 1.2, 2.2, 3.2, 3.3, 4.1–4.4 and 5.1.

## What this is

A reference deck built from **real product screens**, not mood words:

- 19 search angles across 116 Mobbin screens.
- Analysed with Gemini 3.8 Flash from labelled contact sheets.
- The 8 most important screens were then checked at full resolution, by transcribing their exact visible text.
- Every pattern below names its source screen, what to take, where it goes in Cauldron, and what to avoid.

**Mobbin collection:** [Cauldron Astro — UI research](https://mobbin.com/collections/5d511baf-5e36-4493-8171-e50f80dfaa37/mobile/screens). It's private to you: 113 screens, made up of 107 desktop web and 6 Canva iPhone. Two off-topic results were left out.

**How sure we can be:** contact-sheet previews are low resolution, so the per-tile notes are directional. Anything marked ✅ was confirmed at full resolution in `hires/verification.md`. Colour values from screenshots are approximate. Proportions are estimates.

## The big decision: where the agent lives

Mobbin shows two camps:

1. **AI builders** (Lovable, Replit, Lindy, Gemini, Base44): chat on the **left**, taking about 30–50%, with the preview on the right. ✅ Lovable's chat is ~30% and its preview ~70%.
2. **Visual builders** (Framer, Wix): the agent squeezed into the **right** utility column. ✅ Framer's Agent and Style are tabs in one ~16% column.

Framer's version is elegant, but at ~16% the agent is clearly secondary. That fails your equal-prominence rule. The AI-builder layout gives the agent real room, but has no proper inspector.

**Recommendation: a hybrid.**

- **Left: the agent.** A full-height conversation column, 380–440px.
- **Centre: the live preview.** It always gets the most space.
- **Right: the inspector**, contextual to the selected element.
- **Far left: a 48px icon rail**, so pages, layers, the section library and content open as a panel that slides over the agent column.

The agent and the visual controls sit on opposite sides of the preview, both always visible, both working on the same selection.

*Alternative for the grill session:* agent on the right, sharing the inspector column through tabs, as Framer does. It's less work, but the agent becomes the junior partner.

## Responsive layout spec (the app window, not the website)

**Core rule:** the website preview always renders at its chosen breakpoint width and is **scaled to fit** its pane. Shrinking the app window must never silently change which breakpoint you're designing. The pane shows a width chip such as "Tablet · 768px · 74%".

| Window width | Layout |
|---|---|
| **XL ≥ 1760px** | Rail · agent column 420 · preview · inspector 300 · pages/layers can dock open beside the rail |
| **L 1280–1759px** | Rail · agent 400 · preview · inspector 280. Pages/layers become an overlay panel from the rail |
| **M 1000–1279px** | Rail · agent 360 · preview. The inspector moves **onto the canvas** as anchored popovers from the selection toolbar (Squarespace pattern), with an optional slide-in panel. The preview pane stays ≥ ~550px |
| **S 720–999px** | Rail · one main area with a segmented switch: **Preview / Agent / Split**. Split is a 50/50 Gemini-style split. Inspector controls appear as a bottom property shelf over the preview (Canva iOS pattern) |
| **XS < 720px** | Single pane with a floating bottom dock: Select · Add · Agent · Device · Publish. Panels open as sheets covering at most half the height. Nothing important is ever more than one tap away |

**Rules at every size:**
- The agent is never hidden behind a menu. At S and XS it is one switch away.
- The selected element shows as a chip in the agent's input box, so the shared context is always visible.
- Panels animate in under 200ms; with "reduce motion" on, they appear instantly.
- Every panel edge can be dragged and collapsed. Sizes are remembered per window size, and you can always restore the defaults.
- Minimum window size: **1280 × 800** (decided by Billy). Control sizes: Camillo's proposal, for Billy's approval.

**Evidence:**
- Savee: one left panel leaves a huge preview.
- Webflow: preview dominance plus a precise breakpoint bar.
- Framer: on-canvas breakpoint labels.
- Squarespace: anchored popovers instead of a fixed inspector.
- Canva iOS: a two-tier bottom shelf, plus a selection action bar attached to the element.

**What to avoid:**
- Four-column sprawl (Webflow).
- A floating layers window covering the preview (Wix).
- Side-by-side artboards at small sizes (Framer/Figma).
- Device bezels (Wix).
- Bottom sheets covering more than half the screen (Linktree, ChatGPT iOS).

## Screen-by-screen patterns

### 1. Main workspace and top bar
- **Take:**
  - One slim top bar, about 40px: project name, Git branch, page breadcrumb (`Pages › blog/[slug] › Hero`), undo/redo, Preview, Publish. (Framer, Linear.)
  - A floating bottom-centre pill for zoom, device and outline toggles (Framer).
  - A visible "Visual edit mode / Done" state when editing directly (MagicPath).
- **Avoid:**
  - Two stacked toolbars (Wix).
  - Upsell badges.
  - Thick coloured enterprise bars (Zoho).
  - The bottom pill covering page content: leave extra bottom padding.

### 2. Agent panel
- **Take, from Lovable ✅:**
  - The thinking line ("Thought for 24s") collapses.
  - Each action is one plain row with an icon: "Edited WorkSection.tsx", "Generated image …", "Installed …", hidden behind a "Hide" toggle.
  - A plain-English summary closes each turn.
  - A version card reads "Previewing latest version" and has a revert icon.
  - Suggestion chips sit above the input.
  - Input controls include **"Visual edits"** (pick an element) and **"Chat"** mode.
- **Take, from Lindy ✅:** a running task shows as a checklist ("✓ Create root layout with header and footer", "◌ Processing…"), and the raw terminal stays behind a separate toggle.
- **Take, from Gumloop:** while the agent is changing the site, a small status pill on the preview ("Step 2/3 · Updating layout") explains why it is refreshing.
- **Take, from Linear's agent:** structured, well-set markdown makes the agent feel like a professional tool, not a chatbot.
- **Cauldron specifics:**
  - The composer shows the selection chip (`Hero › h1`).
  - The agent picker shows which tool is answering (Claude Code, Codex, Hermes).
  - It always states whether the agent is working or just talking.
- **Avoid:**
  - Raw millisecond logs and JSON (n8n).
  - Monospace terminal dumps (Replit).
  - Credit and upgrade nags inside the composer (Emergent).
  - Model names as decoration.

### 3. Reviewing and undoing an agent run (plan 2.2)
- **Take, from Cofounder ✅:** a closing card with **"What shipped"** bullets in plain words and a **"Verified"** list ("TypeScript: clean", "Dev server running…"), plus a collapsed "Ran 35 actions" trigger above it. In Cauldron, "Verified" lists *our measured checks*: built OK, no layout overflow, accessibility unchanged.
- **Take, from Replit ✅:** a rollback confirmation, "Rollback to this checkpoint?", that **lists exactly what gets restored, by category**, with neutral "Cancel" and a filled primary "Rollback to this checkpoint". Cauldron's version: "Undo this agent run?", listing the pages and files that go back. If you've since changed one of them, it says which and doesn't proceed.
- **Take, from Semrush:** compare rendered content, not code. A **Before / After** toggle in the preview bar outlines changed elements on the page itself.
- **Take, from Devin and Cofounder:** a collapsed file badge ("3 files · +24 −8") for when you do want detail.
- **Our design, not seen in Cofounder:** "Undo this run" and "Keep" buttons on the run card.
- **Avoid:**
  - Side-by-side code diffs as the default.
  - GitHub pull-request furniture (reviewers, checks).
  - Review as a modal takeover.

### 4. Conflict: "changed in two places" (plan 1.2)
- **Take:**
  - Zeku's wording, from the earlier REA notes: "Nothing has been written yet."
  - Customer.io's three-button order: a neutral way back on the left, then the secondary destructive option, then the filled primary.
  - Replit's "what each choice affects" lines.
- **Cauldron version:**
  - Title: "This file changed in two places".
  - Body: *Your version: 3 style tweaks, 1 min ago.* *On disk: hero text changed by the agent, 30 sec ago.*
  - Buttons: **Keep editing** · **Use the disk version** · **Keep my version**.
  - Where recovery exists, reassure: "Your edits are kept in recovery either way."
- **Avoid:**
  - Bare SAVE/EXIT (Squarespace).
  - Cancel and Discard styled identically (Salesforce).

### 5. Element selection on the canvas
- **Take:**
  - A thin outline with a name tag (`<Hero>`, `h2`).
  - A small toolbar attached to the selection: duplicate, move, delete, plus **✨ Ask agent** (Wix's "Ask Aria"). Ask agent drops the selection into the composer.
  - Stitch's two choices for direct changes versus agent help: "Edit text" / "Edit with AI".
  - Anchored property popovers at narrower sizes (Squarespace).
  - On-canvas spacing editing for padding and margin (Base44).
- **Avoid:**
  - Fifteen-item menus covering the page (Luma).
  - The same controls repeated in three places (Wix).

### 6. Device preview
- **Take, from Webflow ✅:**
  - Device icons with an editable pixel readout ("320 PX").
  - A drag handle on the preview edge.
  - The key line **"Affects 479px and below"**, telling a non-developer exactly what an edit changes.
- **Take, from Framer:** plain range labels (`1199–810`, `< 810`).
- **Cauldron version:**
  - Desktop / Tablet / Mobile / Fluid.
  - Each shows its range in words ("Tablet · 768–1023px").
  - The selected element's style edits say which sizes they affect.
- **Avoid:**
  - A dropdown of phone models (Replit).
  - Desktop-plus-mobile only, with no tablet (Klaviyo).
  - Device bezels.

### 7. Command palette (⌘K)
- **Take:**
  - Fey's two panes: the thing on the left (page, section, selected element), its actions on the right.
  - Replit's two-line rows: action plus a plain-English explanation.
  - Vapi's tags and keyboard footer (↑↓ navigate · ↵ run).
  - "Ask the agent…" is always the last row.
- **Avoid:**
  - A big centred box hiding the whole preview at small sizes; anchor it to the top bar.
  - Rows with no description.

### 8. Connecting an outside agent (plan 3.3)
- **Take, from Magnific ✅:**
  - A row of agent pills: "Claude Desktop", "Claude Code", "ChatGPT", "Cursor", "Codex", "VS Code", "Gemini", **"Hermes"**.
  - Three numbered steps.
  - A copyable MCP endpoint.
  - **"Add to Claude in 1 click"**.
- **Take, from Stripe:** "Copy prompt", a ready-written instruction you paste into your agent, pre-filled with this project's details.
- **Cauldron version:**
  - One pill per supported agent; we only show agents that have been tested end to end.
  - A one-click install where the tool supports it.
  - A local address with a copy button.
  - A live "Connected ✓ / Waiting for agent…" status.
- **Avoid:**
  - Long text-only setup guides (Customer.io).
  - A lone `npx` line with no context (Vercel).
  - OAuth and secrets jargon (Mintlify).

### 9. Publishing (plan 5.1)
- **Take:**
  - Ferndesk's change list by page and section, with NEW/MODIFIED tags, instead of a Git file list.
  - ElevenLabs' optional description, which becomes the commit message.
  - Lovable's destination plus pre-publish checks at the point of publishing ("Build passed · 2 images missing alt text").
- **Avoid:**
  - Multi-step deploy wizards (Vapi).
  - A cramped flyout for a whole-site action.
  - Raw JSON or code diffs.

### 10. Quality checks (plan 4.4)
- **Take:**
  - Semrush's grouping: Errors / Warnings / Passed, with counts.
  - Profound's plain-English metric cards with Good / Needs work.
  - Lovable's per-issue **"Try to fix"** ✅, which in Cauldron means "Fix with agent".
  - Clicking an issue highlights the element on the page.
- **Caution:** Lovable leads with Lighthouse-style percentage scores ✅ ("Accessibility 96%"). Keep scores secondary. Measured, explained issues come first, as the plan says.
- **Avoid:**
  - "Not enough traffic" analytics states.
  - One opaque overall number.

### 11. Design direction / site styles (plan 4.1)
- **Take:**
  - Polywork's font-pair cards with live sample sentences.
  - Contra's four primitives for a compact panel: heading font, body font, text colour, background, with "Advanced" behind a disclosure.
  - Gamma's **specimen sheet**: a preview mode showing every heading, button, card and form element at once, so a change can be judged site-wide.
- **Avoid:**
  - Separate font dropdowns with no pairing (beehiiv).
  - Mixing Cauldron's own theme settings with the website's (Webflow).

### 12. Section library (plan 4.2)
- **Take:**
  - Squarespace's categories by purpose: Introduce · Sell · Showcase, or for us Hero & intro · Proof · Features · Content · Contact.
  - Wix's real multi-column thumbnails, "+ Blank section" and "Generate with agent".
  - GoDaddy's side drawer that keeps the page visible.
  - "Saved sections" for your own reusable blocks.
- **Avoid:** text-only lists ("Banner", "Image with text") with no previews (Podia, Teachable).

### 13. Content editing (plan 4.3)
- **Take:**
  - beehiiv's split: page content in the main area, structured fields (frontmatter) in tabs on the right: General · SEO · Settings. This matches how Astro content collections are built.
  - Podia's slug field showing the real address (`/blog/my-post`).
  - "/" to insert a component in the text.
- **Avoid:** big card-style admin forms (Kajabi, Uvodo).

### 14. Project home
- **Take:**
  - Jitter's two clear actions: **New site** · **Open folder**.
  - MagicPath's "+ New" card as the first tile.
  - Real screenshots of each site as thumbnails, with path, Git branch and last edited.
  - Grid/list switch.
  - Native actions: Show in Finder, Duplicate, Remove from recents.
- **Avoid:**
  - Consumer hero banners ("What will you design today?", Canva).
  - Team/cloud clutter.

## Making a free app look expensive

Everything here costs nothing. It's craft, restraint and a design system.

**Visual system (proposal):** light and dark themes, both first-class.

- **Surfaces:** layered neutral greys.
  - Dark: canvas `#0B0B0C` / panels `#111214` / raised `#17181B`.
  - Light: canvas `#F3F3F4` / panels `#FFFFFF`.
  - Separate areas with **1px hairlines** (dark `#232428`, light `#E6E6E8`), not shadows. Shadows are only for floating things like popovers and pills.
- **One accent colour**, reserved for the selection outline, the focus ring and the single primary button per view. Everything else stays neutral. This is the Framer/Linear discipline. The exact hue is a Billy decision.
- **Type:** Inter or Geist for the interface, at 12–13px for panels and 11px uppercase-tracked for section labels; tabular numbers in inputs; one monospace (Geist Mono or JetBrains Mono) for code only.
- **Density:** 28px rows and controls, a 4px spacing grid, 6px control corners, 10–12px panel corners, and 9999px pills for floating bars and chips.
- **Icons:** one set at one stroke weight, e.g. Lucide (1.5px). Never mix sets.
- **Motion:** 120–180ms ease-out for panels and popovers, nothing bouncy, and "reduce motion" respected everywhere.

**Behaviour that reads as premium:**
- Instant response.
- An honest saved status ("Saved · 2s ago").
- Keyboard everything, with shortcuts shown in tooltips and the palette.
- Remembered panel sizes.
- Undo for everything.
- Empty states that teach.
- No spinners without words.

**Things that read as cheap, which we never do:**
- Upsell badges and gradient blobs.
- Truncated labels ("Uplo…").
- Faint grey text that fails contrast; Linear goes too faint for this audience.
- Two of anything (toolbars, save buttons).
- Modal takeovers for routine work.
- Mixed icon sets.

**Accessibility is part of "expensive":** all text meets WCAG AA contrast; focus is always visible; every control is reachable by keyboard; nothing relies on colour alone.

**Free assets to verify before bundling:** Inter and Geist (SIL Open Font License), Lucide (ISC), Phosphor (MIT). The licences are as I understand them; check each one's licence file before shipping.

## Decisions for the grill-me session
**Decided by Billy (6 Nov 2026):** agent on the left (the hybrid); desktop window sizes only for v1, so the S and XS tiers are out of v1, and the smallest supported window is 1280 × 800; Before/After compare is in v1; Cauldron follows the Mac's light/dark setting by default; accent colour **Coral** (light `#A13F33`, dark `#FFA99A`) and interface font **Source Sans 3** (SIL OFL), picked by Billy on 7 Nov 2026 from Camillo's options in `design/camillo/app-look/`; Claude Code, Codex and Hermes are all in v1, each tested, with Claude Code built first.

1. **Agent:** left; live preview centre; inspector right.
2. **Default theme:** follow the Mac system setting.
3. **Accent:** Coral — light `#A13F33`, dark `#FFA99A`.
4. **Minimum window:** 1280 × 800; sub-minimum app layouts stay outside v1. Earlier M/S/XS research rows are retained as historical possibilities.
5. **Before / After:** included in v1.
6. **Interface font:** Source Sans 3. Earlier Inter/Geist suggestions are superseded.
7. **Agent support:** Claude Code first, then Codex and Hermes; each path requires end-to-end evidence before support is claimed.

## Files
- `references/mobbin/ui-deep-dive/searches.json`: all 19 searches, 116 screens, Mobbin links.
- `references/mobbin/ui-deep-dive/contact-sheets/`: the labelled sheets.
- `references/mobbin/ui-deep-dive/analysis/<angle>.md`: the full per-angle analysis, one file per search.
- `references/mobbin/ui-deep-dive/hires/`: 8 full-resolution screens, plus `verification.md` with exact transcriptions.
- Scripts: `gemini_analyse.py`, `verify_hires.py`.
