# agent_chat_preview

Model: gemini-3.8-flash (direct Google AI Studio call). Search: "AI app builder with chat panel beside live website preview"

## Mobbin links
- 0 StackAI: https://mobbin.com/screens/789acbc0-f591-4b2f-b40c-18dd456a3c11
- 1 Lovable: https://mobbin.com/screens/b6847b07-4933-471b-9153-0f1838ada822
- 2 Replit: https://mobbin.com/screens/a4285d31-5f9d-4609-b1e5-43fcaca36361
- 3 Emergent: https://mobbin.com/screens/17d5580f-8268-4fec-a024-64e87a056e65
- 4 Wix: https://mobbin.com/screens/2454903c-112d-4d55-8084-983a0a542c75
- 5 Base44: https://mobbin.com/screens/72322a4e-8d14-458e-ad7c-a561da881849
- 6 Framer: https://mobbin.com/screens/4f93ca16-840a-4e4a-9ce3-b334d8231eb8
- 7 Google Gemini: https://mobbin.com/screens/4b99de40-7c78-4042-95e1-fc72086dee52

## Analysis
### 1. Tile Breakdown

#### 0 StackAI
* **Layout & Width Share:** Split-screen layout. Left side (~50% width) hosts the chat conversation/prompt test area (`ASMobbin` prompt and message feed), while the right side (~50% width) displays configuration parameters (`Name`, `Description`, `AI Provider`, `AI Model`, `Instructions`, `Conversation starters`, etc.). This is an AI workflow/agent configuration screen rather than a live website preview.
* **Message Styling & Steps:** Clean, light background (approx. `#FFFFFF` / `#F8F9FA`). Centered assistant logo and bio greeting. User/assistant messages appear as flat text bubbles or cards.
* **Input Box:** Pinned to bottom of the chat panel. Includes an input field ("Write a message..."), attachment/upload icon on left, and send arrow button on right.
* **Preview Controls / Status:** No live website preview present; off-topic for visual site preview, but illustrates a 50/50 configuration-to-chat workbench.

#### 1 Lovable
* **Layout & Width Share:** Left panel is the AI Chat (~35% width); right panel is the live interactive website preview canvas (~65% width) titled "Sarah Chen - UI/UX Designer".
* **Message Styling & Steps:** Linear message stream on white/light grey (`#FBFBFB`). Shows collapsed/collapsible reasoning steps: "Thought for 24s" with expand toggle (`Hide`). Detailed tool execution steps show status icons: green checkmarks beside `Generated image A minimal, elegant...`, `Generated image A serene meditativ...`, `Edited WorkSection.tsx`, `Installed @supabase/supab...`. Summarized change pill at bottom: "Generated 3 beautiful hero images for your portfolio projects and added them to the WorkSection with a smooth hover zoom effect."
* **Artifact / Version Card:** Inline card: "Add real project images >", "Previewing latest version", and `<> Code` toggle button.
* **Input Box:** Bottom floating card with suggestion chips above ("Add scroll animations", "Add project detail pages", "Add testim..."). Input text "Ask Lovable...", attachment plus icon, and a bottom utility bar with `Visual edits` toggle (with cursor/select icon) and `Chat` mode toggle.
* **Preview Controls:** Top bar with `Preview` pill, viewport size/device switcher icons (desktop, tablet, mobile), refresh/undo controls, `Share`, and a green `Publish` button.

#### 2 Replit
* **Layout & Width Share:** Left sidebar/chat panel takes approx. 30–35% width; right live web application preview takes approx. 65–70% width displaying "Brew NYC - New York's best coffee, curated."
* **Message Styling & Steps:** Dark theme (`#1C1D22` approx.). Shows structured step-by-step progress logging:
  * "Three concrete files needed: the req.params.slug type error in app.ts, the missing queryKey in Favorites.tsx, and server-side auth enforcement..."
  * Tool action rollups with pill badges: `5 actions`, `7 actions`, `3 actions`.
  * Status checklist: "Both servers are clean - no runtime errors...", "Marked task #1 (NYC Coffee Shop Discovery App) complete", "Worked for 24 minutes", "Checkpoint made 47 minutes ago".
* **Input Box & Settings Modal:** A floating popover over the chat shows an agent configuration card: Mode selector (`Lite`, `Economy`, `Power`), model indicators (`GPT-5.0 Luna`, `Claude 3 Opus`), and toggles.
* **Preview Controls:** Top bar features navigation bar (`Tools`, `Preview`, address bar `c7...replit.dev/`, refresh, pop-out).

#### 3 Emergent
* **Layout & Width Share:** Left AI Chat takes approx. 40% width; right preview panel takes approx. 60% width showing a "Calendar Todo" sign-in card.
* **Message Styling & Steps:** Grey/off-white background (`#F4F5F7` approx.). Chat shows agent execution cards:
  * File change block: `Created /app/auth_testing.md >` inside an enclosed container.
  * Collapsible diagnostic step: `testing_agent({"original_problem_statement_and_...` with dropdown `3 Testing Agent messages`.
  * System event banner: `Agent has been paused` with a `pause(pause)` badge and timestamp (`Jun 4, 01:36 PM`).
* **Input Box & Status:** Bottom chat input contains "Message Agent" placeholder, utility row below with `Save`, `Fork`, model selector (`Maxx`), and an account status pill ("Running low on credits? Buy more at 20% off", `Credits 20% more`).
* **Preview Controls:** Top right toolbar has `App Preview` label, `Share`, `Deploy`, and window control buttons.

#### 4 Wix
* **Layout & Width Share:** Full canvas visual website editor ("Advanced AI Enterprise Solutions") with an overlay/slide-out floating AI assistant panel ("Aria") docked on the right (~25% width).
* **Message Styling & Steps:** Right-hand panel is styled as an assistant card: avatar circle, "Hello / What can I help you with?", followed by prompt pill buttons (`Generate`, `Add`, `Design`, `How to?`).
* **Input Box:** Pinned bottom card inside the panel: "Let me bring your vision to life" text box, send button, and disclaimer text ("AI can make mistakes...").
* **Preview Controls:** Heavy top visual builder toolbar (Page selector, zoom `Fit (80%)`, viewport toggles, `Preview`, `Publish`).
* **Assessment:** Asymmetrical visual-builder-first layout; AI is an accessory drawer rather than an equal partner.

#### 5 Base44
* **Layout & Width Share:** Left panel contains AI conversation & activity (~35–40% width); right side contains the interactive site canvas (~60–65% width) displaying an apparel brand ("URBAN KINETIC").
* **Message Styling & Steps:** Dark theme. Step breakdown includes:
  * "Thought for 6s" collapsible thinking block.
  * Direct file write indicators: `Wrote base44/mcp/config`.
  * Conversational explanation of technical changes ("Your MCP server is configured for public read-only access...").
  * Timestamp: "5 minutes ago".
* **Input Box:** Suggestion chips (`Add product reviews`, `Enable size guide >`), followed by `Exit edit mode before typing` notice, mode toggle (`Auto` / `Build`), and bottom actions.
* **Canvas & Inspection:** On the preview canvas, an element is selected with a direct floating properties/spacing popover (Margin/Padding box model with inputs `0`, `0`, `0`, `0`, `Edit Element`, `Replace`, alignment icons).
* **Preview Controls:** Top header with `Preview`, `Dashboard`, `Edit`, device dropdown, undo/redo, `Upgrade`, `Publish`.

#### 6 Framer
* **Layout & Width Share:** Multi-column canvas studio layout: far-left tree/layers panel (~15%), center visual freeform canvas showing responsive desktop and tablet artboards side-by-side (~65%), and right-hand inspector/tool panel (~20%).
* **AI Integration:** The right panel shows an `Agent` tab alongside `Style`. Under `Agent`, there is a "New Chat" button, "Ask Framer...", and a model switcher dropdown (`GPT 5.5`).
* **Assessment:** The canvas is an infinite design viewport rather than a dedicated 1:1 responsive preview + chat split. Chat space is constrained into a narrow utility sidebar.

#### 7 Google Gemini
* **Layout & Width Share:** 50/50 split. Left side is AI agent chat (~50% width); right side is an embedded live web app preview titled "Pulsars & The Barycenter" (~50% width).
* **Message Styling & Steps:** High-contrast white canvas. Agent message details the build: "I will generate the SPA infographic analyzing how scientists use pulsars to measure the Solar System Barycenter...". Status block shows an active generating state: `Pulsars & The Barycenter / Generating...`.
* **Right Panel / State:** Live preview card shows an initial empty/loading state: `<>` code icon, "Creating your app...", and "Ready soon" status indicator. Top controls offer `Code` vs `Preview` segmented button, reload, and pop-out.
* **Input Box:** Left bottom bar has "Let's write or build together", `+`, `Canvas`, and model pill (`Flash v`).

---

### 2. Best 2–3

1. **Lovable (Tile 1)**
   * *Why:* Best-in-class execution of the agent-chat + visual preview relationship. It provides structured reasoning ("Thought for 24s"), transparent multi-step tool tracking (displaying exactly which files were modified and which images were generated), and direct version/code toggling right within the message stream, alongside dedicated preview viewport controls.
2. **Base44 (Tile 5)**
   * *Why:* Effectively bridges agent chat with on-canvas visual editing. The preview features a direct visual box-model/spacing inspector on element selection while the chat panel exposes MCP/file write operations and model modes (`Auto` vs `Build`), demonstrating true shared context between chat and canvas.
3. **Google Gemini (Tile 7)**
   * *Why:* Offers a true 50/50 balanced layout where the agent conversation and the live preview hold equal visual weight. The clean, uncrowded chrome and minimal preview toolbar maintain maximum viewable area for both sides.

---

### 3. Borrow for Cauldron

* **Collapsible Tool Steps & File Actions (from Lovable Tile 1 & Base44 Tile 5):**
  * *Cauldron Feature:* `Agent Action Feed` in the Chat Panel.
  * *Pattern:* When Cauldron’s agent executes Astro changes, display expandable pills instead of raw terminal logs: `Thought for Xs`, followed by distinct action rows with green checkmarks (e.g., `Wrote src/components/Hero.astro`, `Installed @astrojs/tailwind`). Keep them collapsed by default with a one-click diff/code view.
* **Direct Visual Box-Model & Overlay Inspector on Selection (from Base44 Tile 5):**
  * *Cauldron Feature:* `Live Canvas Element Selection & Inspector`.
  * *Pattern:* When the creative director clicks an element in the live preview, display a floating, compact floating HUD directly over the canvas (showing margin/padding inputs, tag name, and quick actions: "Edit Style", "Ask Agent about this"). This avoids cluttering the sidebar and keeps the visual preview and chat at a clean 50/50 balance.
* **Bottom Input Bar with Visual Selection & Mode Toggles (from Lovable Tile 1 & Base44 Tile 5):**
  * *Cauldron Feature:* `Chat Prompt Input`.
  * *Pattern:* Place an explicit "Target Selected Element" toggle button directly inside the chat input box (using Lovable’s cursor icon approach). Show a pill representing the currently selected DOM node (e.g., `<Header.astro > div.hero>`) inside or directly above the input box so the creative director knows their prompt is scoped to that element.
* **Balanced 50/50 Viewport Split with Top-Bar Device Emulation (from Google Gemini Tile 7 & Lovable Tile 1):**
  * *Cauldron Feature:* `Main Window Layout & Viewport Bar`.
  * *Pattern:* On narrow screens down to 1024px, maintain an equal split (~500px Chat / ~500px Preview) by nesting the style inspector into floating overlays or an expandable drawer rather than a persistent third column. Use Lovable’s top preview bar with responsive device presets (`Desktop`, `Tablet`, `Mobile`) to scale the Astro site inside an iframe container.

---

### 4. Avoid

* **Narrow 20% Right-Hand Drawer Chat (Wix Tile 4 & Framer Tile 6):** Squeezing the agent chat into a cramped utility inspector forces code snippets, file changes, and agent thoughts to wrap awkwardly. This breaks the requirement for equal prominence.
* **Dense Monospaced Terminal Dumps (Replit Tile 2):** Unformatted lists of technical status messages (`c7...replit.dev/`, raw dependency issues) overwhelm non-developer creative directors.
* **Loss of Live Preview (StackAI Tile 0):** Devoting half the screen to static agent settings forms instead of a real-time rendering of the site.
* **Canvas Clutter on Small Screens (Framer Tile 6):** Rendering multiple freeform responsive artboards simultaneously on screen destroys preview usability at 1024px window widths. Use a single active preview frame with device toggles.
