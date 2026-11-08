# conflict_dialogs

Model: gemini-3.8-flash (direct Google AI Studio call). Search: "unsaved changes or edit conflict warning dialog"

## Mobbin links
- 0 Lindy: https://mobbin.com/screens/36cbbac6-42aa-415a-9f8f-72b60cc19c40
- 1 Squarespace: https://mobbin.com/screens/9825b5a3-da36-4ae9-8a15-7c9d78f08f1b
- 2 Customer.io: https://mobbin.com/screens/25eb3dc6-8fb5-4b98-a213-7503d661e8ab
- 3 OpenAI Platform: https://mobbin.com/screens/27ee1460-45f9-4307-a0f3-da5ce1b4a250
- 4 Salesforce: https://mobbin.com/screens/ff8c986b-e12e-4bee-8b31-53740c045b5f
- 5 Replit: https://mobbin.com/screens/7f85ac6c-42a5-4440-8ea9-0b2bbcb902ea

## Analysis
### 1. Tile Summaries

#### Tile 0: Lindy
* **Components & Layout:** Centered compact modal card over a heavily blurred, washed-out workspace.
* **Wording:** 
  * Title: *"You have unpublished changes"*
  * Body: *"Your recent edits are saved as a draft. Publish them before leaving to make the updates live in your agent."*
* **Hierarchy:** Bottom-right button cluster: neutral text button (`Cancel`) alongside a solid vibrant blue primary (`Publish Changes`).
* **Tone:** Reassuring rather than panicked; explicitly informs the user that work is not lost, merely kept as a draft.

#### Tile 1: Squarespace
* **Components & Layout:** Compact, high-contrast white card anchored near the top-left toolbar rather than fully centered.
* **Wording:** 
  * Title: *"Exit Without Saving?"*
  * Body: *"Any unsaved changes will be discarded when you exit."*
* **Hierarchy:** Bottom-right text-only links in all-caps: `SAVE` (dark text) and `EXIT` (muted/reddish text). Minimal visual differentiation between the safe and destructive actions.

#### Tile 2: Customer.io
* **Components & Layout:** Centered white modal card over an email builder canvas, with an explicit close (`✕`) button in the top-right corner.
* **Wording:** 
  * Title: *"Just a minute!"*
  * Body: *"You have unsaved changes. Please save your changes or discard them to continue."*
* **Hierarchy:** Split button footer:
  * Left: `Go back` (low-emphasis neutral link to abort navigation).
  * Right: `Discard changes` (red text outline/ghost button) and `Save & Continue` (solid dark green/black primary fill).
* **Tone:** Clear tri-state architecture separating aborting the action, discarding data, and saving forward progress.

#### Tile 3: OpenAI Platform
* **Components & Layout:** Floating modal card placed over a dataset/prompt table.
* **Wording:** 
  * Title: *"Leave without saving?"*
  * Body: *"You have unsaved changes in your dataset. If you leave now, they will be lost."*
* **Hierarchy:** Asymmetrical split footer:
  * Far-left: `Leave` as a solid red destructive button.
  * Far-right: `Cancel` (ghost button) paired with `Save and Leave` (solid black primary button).
* **Spatial Safety:** Separates the immediate destructive exit physically to the left, preventing misclicks when reaching for the primary save flow.

#### Tile 4: Salesforce
* **Components & Layout:** Wide, centered card over a dimmed backdrop with a circular `✕` close button top-right.
* **Wording:** 
  * Title: *"Save changes to this segment?"*
  * Body: *"Closing this page without saving, discards the changes you made to your segment."*
* **Hierarchy:** Clustered together at bottom-right: `Cancel` (subtle border), `Discard` (subtle border), and `Save` (solid blue).
* **Defect:** `Cancel` and `Discard` share identical neutral outline styling side-by-side, making it easy for a user to confuse aborting the dialog with throwing away edits.

#### Tile 5: Replit
* **Components & Layout:** Centered modal over a split IDE/preview workspace. Includes structured content cards detailing checkpoint impacts.
* **Wording:** 
  * Title: *"Rollback to this checkpoint?"*
  * Metadata: Commit/checkpoint description (*"Update API server logic..."*) + timestamp (*"Aug 13, 2024, 10:52 AM"*).
  * Section Header: *"What will be impacted"*
  * Structured bullets:
    * *Files:* *"All files in your app will be restored to the state they were in at the time of this checkpoint."*
    * *Database:* *"Your development database will be restored..."*
    * *Agent memory:* *"The Agent's memory will reset to what it knew about your app at the time of this checkpoint."*
* **Hierarchy:** Bottom-right actions: text `Cancel` next to solid blue `Rollback to this checkpoint`.
* **Clarity:** Outstanding explanation of blast radius across files, data, and AI context.

---

### 2. Best 2–3

* **Tile 5 (Replit) — Best for Complex Conflict / State Overwrite:**
  Instead of generic warnings (*"Changes will be lost"*), Replit explicitly lists the blast radius by category (*Files*, *Database*, *Agent memory*). In an app shared by a visual editor and an AI agent, this concrete scope gives creative directors the clarity needed to make a destructive choice without fear.
* **Tile 2 (Customer.io) — Best Button Layout & Action Hierarchy:**
  The 3-way choice is crystal clear: `Go back` stays where you are; `Discard changes` is clearly styled as a secondary destructive option; `Save & Continue` is the dominant solid primary. Positioning `Go back` on the left isolates navigation cancellation from committing changes.

---

### 3. Borrow for Cauldron

* **Structured Impact Card (from Tile 5 - Replit):**
  * *Cauldron Feature:* Disk vs. Editor Conflict Dialog (e.g., when the AI agent modifies an Astro component on disk while the creative director is editing inline in preview).
  * *Pattern:* When prompting *"File changed on disk. Which version do you want to keep?"*, show a 2-part impact breakdown:
    * **Your Editor Version:** *"Has 3 visual style tweaks made 1m ago. Overwrites disk."*
    * **Disk / Agent Version:** *"Updated hero copy and added 1 component via AI agent 30s ago."*
* **Tri-State Action Hierarchy (from Tile 2 - Customer.io & Tile 3 - OpenAI):**
  * *Cauldron Feature:* Document switch / project close dialog.
  * *Pattern:* Avoid ambiguous labels like "Yes / No". Use explicit action verbs:
    * Far-left: `Keep Editing` (neutral abort).
    * Right group: `Revert to Disk` (red outline or muted destructive) + `Keep My Changes` (high-contrast solid primary).
* **Reassuring Draft Tone (from Tile 0 - Lindy):**
  * *Cauldron Feature:* Live Astro development server state vs. production build.
  * *Pattern:* Use wording like *"Your visual edits are preserved locally"* rather than punitive *"You have unsaved changes that will be permanently lost"* whenever auto-save or snapshot recovery is available.

---

### 4. Avoid

* **Identical Secondary Styling for Discard and Cancel (Tile 4 - Salesforce):** Placing `Cancel` directly next to `Discard` with the exact same visual weight (plain outline buttons) risks accidental data loss.
* **Vague Single-Word Labels (Tile 1 - Squarespace):** `SAVE` and `EXIT` provide no context on *what* exits or *what* happens to unsaved items if `EXIT` is pressed.
* **Tiny Unstyled Text Links for Danger Actions (Tile 1 - Squarespace):** All-caps naked text links lack affordance and fail to communicate the weight of discarding work.
