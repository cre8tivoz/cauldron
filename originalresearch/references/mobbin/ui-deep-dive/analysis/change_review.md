# change_review

Model: gemini-3.8-flash (direct Google AI Studio call). Search: "AI coding agent showing proposed file changes diff with accept and reject"

## Mobbin links
- 0 Codecademy: https://mobbin.com/screens/3db54285-08df-44c3-a226-cf3e168b5e85
- 1 Cofounder: https://mobbin.com/screens/c50251b3-860c-4f81-be1d-2795eae0182b
- 2 Replit: https://mobbin.com/screens/e92dd0ec-6660-4610-930a-38900c351734
- 3 Neon: https://mobbin.com/screens/9cb22cfd-3f04-4161-94b9-729266bc97b0
- 4 Semrush: https://mobbin.com/screens/ed82aafc-c4dc-442d-87fc-359f7347f940
- 5 Devin: https://mobbin.com/screens/e48cb198-fd26-4a92-b17a-a988aa5cbef8

## Analysis
### 1. Tile Analysis

#### Tile 0: Codecademy
* **What you see:** A full-height, split code comparison view under dark mode (~`#181a20`). The left pane is labeled "My code" (with tabs `style.css` and `index.html`) and the right is labeled "Example solution". Lines 32–36 show CSS code differences highlighted in blue/cyan on the right side. At the bottom-right of the code pane floats a compact two-button action group: a dark gray outline button ("Keep my code") and a solid yellow/gold primary button ("Replace with solution", ~`#f5a623`).
* **Summary & Undo approach:** Line-by-line syntax diff comparing the user's state directly against a target state. Accept/reject is binary and immediate via the floating action group.
* **Non-developer clarity:** Poor for non-developers. Relies completely on understanding raw CSS syntax and line numbers.

#### Tile 1: Cofounder
* **What you see:** A multi-pane interface. The center pane shows "Agent Workspace" with tabs (*Preview*, *Changes*, *Replay*, *Scratchpad*). Under *Changes*, it displays a side-by-side code diff (red deletions left, green additions right) updating tokens in `globals.css`. The right pane displays a dedicated "Build app" agent summary: a header stating *"PR #1 merged to main. Here's a summary of what was built and shipped."*, followed by a structured bulleted breakdown: **What shipped** (e.g., *"Branded homepage"*, *"Design tokens"*, *"Fonts"*, *".gitignore"*) and **Verified** (*"TypeScript: clean"*, *"Biome lint: 0 errors"*). At the bottom sits a chat prompt bar and a green "Open PR" button.
* **Summary & Undo approach:** Dual-layer: human-readable executive summary of features shipped and verified in the chat stream, paired with a code diff tab. 
* **Non-developer clarity:** High. The natural-language "What shipped" section translates technical code edits into plain English design and component deliverables.

#### Tile 2: Replit
* **What you see:** A 3-pane layout: Agent chat (left), side-by-side code diff pane (center, showing `AuthContext.tsx` with red deletions and green additions), and file tree (right). Within the chat stream, an agent task card concludes with a dedicated "Ready for review" block. It summarizes the fixes in two lines, followed by an inline action row: a ghost/white button ("Cancel") and a bright green primary button ("Apply changes to main version", ~`#10a37f`). The top center header features view toggles (*Preview*, *Task review*).
* **Summary & Undo approach:** The decision point is embedded directly in the conversation thread. Changes are inspected in the center diff, but committed or rejected right from the chat card.
* **Non-developer clarity:** Moderate. The inline chat card with clear "Cancel" vs. "Apply" is intuitive, but the primary change inspection requires reading code diffs.

#### Tile 3: Neon
* **What you see:** A dedicated modal titled "Preview historic data" overlaying the dashboard. Top controls include a branch selector (`production`), a precise date/time picker (`02/26/2026, 05:20 AM`), and tab options (*Browse data*, *Query data*, *Compare schemas*). The center shows a side-by-side schema diff highlighting dropped tables in red/pink (~`#ffeef0`) and additions in green (~`#e6ffed`). The footer provides two buttons: "Cancel" (text) and "Proceed to restore" (solid dark button with a rewind/restore icon).
* **Summary & Undo approach:** Point-in-time snapshot rollback. Shows the difference between historical state and current state before executing a one-click atomic restore.
* **Non-developer clarity:** Low-to-moderate. The time-machine restore concept is simple, but the content being reviewed is raw SQL DDL.

#### Tile 4: Semrush
* **What you see:** A modal titled "Review your content" with a top-left "Exit review mode" link. At the top, a metric chip displays "Content score 90% ^ +8" in green against an "Industry Avg. 60%". The body provides a side-by-side rich-text comparison: left column "Original", right column "New". In the "New" column, added copy (headings and bullet points) is highlighted with soft green inline text and background highlights. The bottom floating dock offers two plain-English options: "Keep original version" (subtle text link) and "Continue with new version" (solid teal button, ~`#00c091`).
* **Summary & Undo approach:** Visual, rich-text before/after diff paired with an outcome score improvement. Single-click choice to adopt or revert.
* **Non-developer clarity:** Extremely high. Zero code is visible; changes are shown as formatted layout/copy with explicit value-add metrics.

#### Tile 5: Devin
* **What you see:** A developer-oriented change review workspace. Left pane lists modified files with green/red line count pills (`server.py +2 -2`, `Sidebar.js +89 -55`, `Dashboard.js +75 -41`). Center pane displays stacked diff cards per file with file headers, collapse toggles, line-number diffs, and "Mark as viewed" check buttons. Right sidebar shows PR metadata (Checks, Reviewers, Labels).
* **Summary & Undo approach:** GitHub PR-style code review. Granular file-by-file inspection without high-level executive summaries.
* **Non-developer clarity:** Very poor. Heavily technical and designed for software engineering code review workflows.

---

### 2. Best 2–3

* **Tile 1 (Cofounder):** **Best overall structure.** The structured natural-language summary (**What shipped** + **Verified**) explains the exact impact of an agent turn (e.g., pages created, tokens added, tests passed) without requiring the user to open a diff view.
* **Tile 4 (Semrush):** **Best non-developer visual diff.** Instead of showing raw source code syntax, it compares rendered content directly with inline green additions, backed by a simple outcome summary and plain-English actions ("Keep original version" vs. "Continue with new version").
* **Tile 2 (Replit):** **Best review placement for tight layouts.** Embedding the review card ("Ready for review" with "Apply" and "Cancel") directly in the conversational agent stream saves canvas space and avoids modal takeovers.

---

### 3. Borrow for Cauldron

* **Natural-Language Agent Run Card (from Cofounder & Replit):**
  * *Where:* At the tail of each AI Agent run inside the Chat Panel.
  * *Pattern:* When the agent finishes executing, post a card titled **"Changes Ready for Review"**. Include a bulleted "What was updated" list in plain English (e.g., *"Updated Hero headline"*, *"Changed primary brand token to emerald"*), a small pill showing *"3 files touched"*, and an inline button row: a ghost button **"Discard run"** (reverts the entire batch run instantly) and a filled primary button **"Keep changes"**.
* **Visual "Before / After" Canvas Diff Mode (from Semrush):**
  * *Where:* In the Visual Editor / Live Preview canvas toolbar.
  * *Pattern:* Rather than opening code diffs (which creative directors dislike and which crush the 398px preview), provide a toggle in the top preview bar: **[Live Preview | Compare Before/After]**. In compare mode, modified elements on the canvas receive a soft green outline, and hovering or toggling reveals the previous state without code syntax.
* **Checkpoint Snapshot Timeline with One-Click Restore (from Neon):**
  * *Where:* History dropdown in Cauldron’s top window bar.
  * *Pattern:* Every agent run automatically commits an atomic checkpoint labeled by run intent (e.g., *"Agent: Redesign navbar"* with timestamp). Users can open the history menu and click **"Restore this point"** to cleanly roll back the entire project tree in one click.
* **Collapsible File Impact Badge (from Devin & Cofounder):**
  * *Where:* Attached to the bottom of the agent review card in Chat.
  * *Pattern:* Keep the file list collapsed by default as a small badge (`3 files: +24 / -8`). Clicking it expands a lightweight list of Astro component paths for users who do want to inspect the exact files touched, without pushing out the visual preview.

---

### 4. Avoid

* **Full-Screen Side-by-Side Code Diffs (Tile 0 Codecademy, Tile 3 Neon, Tile 5 Devin):** Forcing users into multi-column code comparisons will completely obliterate Cauldron’s limited preview area (398px at 1024px window width) and overwhelms non-developer creative directors.
* **GitHub PR Boilerplate (Tile 5 Devin):** Avoid developer-specific artifacts like "Mark as viewed", PR checks, reviewers, and assignees.
* **Modal Takeovers for Review (Tile 3 Neon, Tile 4 Semrush):** Launching modal dialogs to review changes blocks interaction with the live website preview. The review state must live natively inside the chat panel and visual preview.
