# publish

Model: gemini-3.8-flash (direct Google AI Studio call). Search: "website builder publish dialog showing changes before going live"

## Mobbin links
- 0 Lovable: https://mobbin.com/screens/ffab5d4d-65c1-420f-befc-05fd2e9bb2de
- 1 Ferndesk: https://mobbin.com/screens/e9b110da-714c-4861-82c9-45a510abbb7d
- 2 Vercel: https://mobbin.com/screens/56371ade-be8a-45d7-89a2-b1a3a7ca7db0
- 3 Vapi: https://mobbin.com/screens/5f8324b9-1e1f-4118-b0fb-f575d9b70848
- 4 ElevenLabs: https://mobbin.com/screens/ff16450b-9de9-4c60-8738-770be8df0a5c
- 5 Maze: https://mobbin.com/screens/01d05d14-db28-4bfb-80d0-3dc6d2ed68e3

## Analysis
### 1. Tile Summaries

#### Tile 0: Lovable
* **Type & Position:** Popover menu anchored directly beneath the top-right "Publish" header button.
* **Content & Layout:** 
  * Header: "Publish your app".
  * Destination block: "Published URL" with an info tooltip, explanatory copy ("Enter your URL, or leave empty to auto-generate"), an editable input prefilled with `simobbin.lovable.app`, and inline "Discard" / "Save" actions.
  * Access configuration: "Who can visit the URL?" dropdown set to "Anyone", followed by a "Website info >" navigation row.
  * Pre-flight checks: "Security Scan" showing a yellow/orange "1 Warning ↗" badge and a "Review security" link.
  * CTA: Bottom full-width "Publish" button (light blue/grey disabled or pending state).
* **Tone/Hierarchy:** Compact configuration panel handling domain, permissions, and security status prior to publishing.

#### Tile 1: Ferndesk
* **Type & Position:** Small, centered modal dialog on an obscured backdrop.
* **Content & Layout:**
  * Header: Green team/brand avatar icon, "Publish 1 change" heading, close icon (top-right), and subcopy: "This will update your public help center immediately."
  * Change list: Nested document tree container displaying the path `Documentation` → `Account & billing` → `Reset your password`, tagged with a green "NEW" pill badge.
  * CTA: Full-width dark primary button labeled "⚡ Publish now".
* **Tone/Hierarchy:** Minimalist and non-developer friendly; summarizes exact content pages changed rather than code diffs.

#### Tile 2: Vercel
* **Type & Position:** Centered modal titled "Review Change" over a blurred dashboard.
* **Content & Layout:**
  * Subtitle: "The following changes have been staged and are not yet live. Review them below and click publish to apply them to production."
  * Change summary list: A card showing an icon, text description ("You enabled Bot Protection in log mode"), and a relative timestamp ("Just now").
  * Footer actions: Split alignment—"Cancel" (subtle button) on the left; "Discard All Changes" (text button) and "Publish" (solid black primary button) on the right.
* **Tone/Hierarchy:** Clear staging terminology, explicit discard path, and human-readable audit of changes.

#### Tile 3: Vapi
* **Type & Position:** Large dark-mode multi-step modal ("Publish Assistant").
* **Content & Layout:**
  * Left sidebar: Stepper labeled "PUBLISH STEPS" with 3 steps: 1. "Review Changes" (active, showing `+1 -1`), 2. "Configure Structured Output" (warning badge), 3. "Scorecard".
  * Main panel: "Review Your Changes" header with toggle "Show Unchanged Values", followed by an embedded terminal-style JSON diff container highlighting added code (`startSpeakingPlan: { ... }`) in green.
  * Footer: Step indicator ("Step 1 of 3") on the left; secondary "Skip & Publish ⌘S" and primary teal "Next →" on the right.
* **Tone/Hierarchy:** Heavy, technical code-review workflow.

#### Tile 4: ElevenLabs
* **Type & Position:** Wide modal titled "Review Changes" centered over the configuration canvas.
* **Content & Layout:**
  * Diff viewer: Two-column split-pane diff comparing "Published version Main" against "Current changes Main". Includes collapsible row links ("Expand 77 lines...", "Expand 637 lines...") with red deletion and green addition highlights across configuration keys.
  * Commit metadata: Text input field below the diff with label "Version description (optional)" and placeholder "Describe what changed in this version".
  * Footer: Left-aligned "Cancel" text button; right-aligned solid black "Publish" pill button.
* **Tone/Hierarchy:** Closest to a visual Git commit/PR review interface, combining diff inspection with commit messaging.

#### Tile 5: Maze
* **Type & Position:** Centered modal titled "Update live maze?".
* **Content & Layout:**
  * Caution banner: "Keep a few things in mind" with bullet points and a warning icon explaining impacts ("Your report will be reset...").
  * Scope of changes: "Changes to this maze" listing affected blocks with a colored status dot ("How often do you order meals from Delivery Apps? / This block was updated for participants").
  * Footer: Single right-aligned primary blue "Update" button and top-right "X" close.
* **Tone/Hierarchy:** Emphasizes impact analysis and consequences of going live over technical file changes.

---

### 2. Best 2–3

* **Tile 4 (ElevenLabs):** Best model for a Git-backed publishing flow. It provides a side-by-side comparison of the published branch versus working changes and directly integrates a "Version description (optional)" input that maps cleanly to a Git commit message.
* **Tile 1 (Ferndesk):** Best presentation for non-developer creative directors. Instead of intimidating raw diffs, it summarizes staged work as a clean, nested content tree (`Page` → `Section`) with clear status tags (`NEW`, `MODIFIED`).
* **Tile 0 (Lovable):** Best compact destination management. It displays the production URL, access control, and automated pre-publish health checks (e.g., warnings) directly at the point of deployment without leaving the visual canvas.

---

### 3. Borrow for Cauldron

* **Human-Readable Page/Component Change List (from Ferndesk, Tile 1):**
  * *Cauldron Feature:* Publish Modal → "Review Staged Changes".
  * *Implementation:* Parse Git status into a structured tree showing pages and sections (e.g., `pages/index.astro` → `Hero Section` with a `MODIFIED` badge) rather than showing raw terminal git output. Creative directors can see exactly which visual blocks were altered.
* **Optional Version Description as Git Commit Message (from ElevenLabs, Tile 4):**
  * *Cauldron Feature:* Publish Modal → Footer / Input Field.
  * *Implementation:* Provide a single clean text input labeled `"Publish note (optional)"` with placeholder `"Describe what changed..."`. Behind the scenes, Cauldron uses this string as the Git commit message when pushing to the user's remote repository (defaulting to `"Update site via Cauldron"` if left blank).
* **Pre-flight Health Checks & Target URL Preview (from Lovable, Tile 0):**
  * *Cauldron Feature:* Publish Modal → Target & Diagnostics Header.
  * *Implementation:* Display the destination Git branch / live URL preview alongside a pre-flight checklist row (e.g., "Astro build check: Passed", "Missing alt text: 2 Warnings").
* **Explicit Discard Alternative (from Vercel, Tile 2):**
  * *Cauldron Feature:* Publish Modal Footer.
  * *Implementation:* Pair the primary `"Publish"` button with a subtle `"Discard Unsaved Changes"` (reverts working tree) and `"Cancel"`, giving users an escape hatch if the live preview shows unintended edits.

---

### 4. Avoid

* **Raw Code/JSON Diffs (Vapi Tile 3, ElevenLabs Tile 4):** Exposing raw JSON syntax trees or code diffs alienates creative directors. Change reviews must focus on modified visual components and page paths.
* **Multi-Step Deploy Wizards (Vapi Tile 3):** Forcing a 3-step wizard ("Review" → "Configure" → "Scorecard") turns publishing into high-friction friction. Deploying should be an instant single-dialog confirmation.
* **Floating Dropdown for Major Deploys (Lovable Tile 0):** A tiny 300px flyout attached to a header button creates cramped text fields and scannability issues. For committing and deploying an entire Astro site, use a focused, centered modal.
