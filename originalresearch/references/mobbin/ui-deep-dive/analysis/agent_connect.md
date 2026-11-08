# agent_connect

Model: gemini-3.8-flash (direct Google AI Studio call). Search: "connect AI coding agent integration setup screen with MCP instructions"

## Mobbin links
- 0 Mintlify: https://mobbin.com/screens/7b23e95a-7215-4db8-8d84-58ac039ab68d
- 1 Greptile: https://mobbin.com/screens/b568ca14-4814-436f-878d-85a4e4282108
- 2 Customer.io: https://mobbin.com/screens/b2434437-426e-4845-9c4a-132ca940cf07
- 3 Magnific: https://mobbin.com/screens/6c752779-eef2-4420-a780-18d568dce6db
- 4 Vercel: https://mobbin.com/screens/d6205dc6-60f5-429f-824d-906c1f5751c5
- 5 Stripe: https://mobbin.com/screens/311b0ba2-0de8-4297-84ed-2aab2e80ae98

## Analysis
### 1. Tile Summaries

#### Tile 0: Mintlify
* **Layout & Style:** Dark theme (background ~#0c1015, cards ~#161b22) inside an Admin settings view (`Admin > MCP Beta`).
* **Components & Structure:** 
  * Header: "Connect your site with AI apps" with explanatory subtext.
  * Integration selector: Top segment shows tabs for target tools (`Claude`, `Cursor`, `Others`). Underneath, a card details the "Official Claude Connector" with an external launch action: `Install Connector ↗`.
  * Configuration fields: Below is an "Allowed OAuth redirect URIs" section with an input (`example.com or myapp://callback`), an `+ Add domain` button, and active pills (`myapp://callback ✕`).
  * Credentials block: "Client credentials" section with empty state "No active credentials" and a button `+ Create MCP client credential`.
* **State & Controls:** Form-based admin dashboard mixing OAuth URI management, tabbed agent connectors, and programmatic client credential creation.

#### Tile 1: Greptile
* **Layout & Style:** Clean light-mode onboarding/configuration wizard step with a horizontal stepper at the top (`PR ANALYSIS`, `COMMENT SCOPE`, `COMMIT BEHAVIOR`, and active `DEVELOPER TOOLS`).
* **Components & Structure:**
  * Header: "Integrate Greptile with your coding agents."
  * Left control column: Includes a toggle switch for "Prompt to Fix with AI" and an agent selector row ("Coding Agents") with an `+ Add Agent` button and an active pill `Fix in Claude`.
  * Right preview column: Visual mock of a GitHub PR review comment illustrating exactly how the generated "Fix in Claude" action button appears inside their existing workflow.
  * Footer: Bottom sticky nav bar with `Back` and a bright green primary button `Next →`.

#### Tile 2: Customer.io
* **Layout & Style:** Light-mode documentation-style view within workspace settings (`MCP > Connection guide`).
* **Components & Structure:**
  * Horizontal sub-tabs for agent selection: `ChatGPT`, `Claude Desktop`, `Cursor` (`ChatGPT` active).
  * Content: Dense, purely textual instructions divided into "Prerequisites", "Setup Instructions" (5 numbered steps detailing menu navigation, MCP Server URL `https://mcp.customer.io/mcp`, and OAuth auth), and "Using Customer.io in Conversations".
  * Actions: Bottom right secondary `Cancel` and green primary `Save` buttons. Very text-heavy with no one-click copy blocks or direct integrations.

#### Tile 3: Magnific
* **Layout & Style:** Modern light-mode app settings page under an `MCP` sidebar item.
* **Components & Structure:**
  * Header: "Integrate Magnific's AI into your product" with descriptive body text.
  * Agent selection bar: Horizontal row of pill buttons displaying icons and names: `Claude Desktop` (active black pill), `Claude Code`, `ChatGPT`, `Cursor`, `Codex`, `VS Code`, `Gemini`, and `Hermes`.
  * Instruction card: Clean 3-step numbered guide (`1. Open Settings → Connectors`, `2. Click + Add connector...`, `3. Select the MCP...`).
  * Connection inputs & actions: Read-only URL box displaying `https://mcp.magnific.com/mcp` with an embedded right-aligned copy icon button, a secondary text link `Read the full setup docs ↗`, and a prominent dedicated button: `+ Add to Claude in 1 click` with Claude branding.

#### Tile 4: Vercel
* **Layout & Style:** Minimalist dark-mode modal (~#000000 background) centered over project setup.
* **Components & Structure:**
  * Header: Centered title "Install Coding Agent Plugin" with circular agent icons (Claude, Cursor, Codex).
  * Body: Brief instruction: "Turn your coding agent into a Vercel expert. Simply copy and run this in your terminal to install the plugin."
  * Terminal block: Single-line dark code field showing `$ npx plugins add vercel/vercel-plugin` with a copy/check icon on the right.
  * Secondary checklist: "Next Steps" list beneath (e.g. Instant Previews, Spend Management) with chevron links.
  * Footer: Full-width dark button `Continue to Dashboard`.

#### Tile 5: Stripe
* **Layout & Style:** Centered light-mode setup workflow (~#f8f9fa background).
* **Components & Structure:**
  * Header: "Use an AI agent to set up Stripe for you. Copy the prompt below into your AI coding tool to start your integration."
  * Agent selector tabs: Horizontal tabs with active underlines: `Claude Code`, `Cursor`, `Codex`, `ChatGPT`, `Skills (npx)` (`Claude Code` active).
  * Prompt card: Label "Your integration prompt" accompanied by a prominent right-aligned `Copy prompt ⧉` button. The container is a deep navy code block (~#0a2540) containing a pre-filled, context-aware prompt:
    ```text
    Help me get started building on Stripe. Here's my context:
    Business: content-mobbin.xyz
    Stripe products I need: Payments, Billing, Terminal, Invoicing
    ```
  * Credentials card: "Your sandbox API keys" box below, listing `Publishable key` (`pk_test_...`) and masked `Secret key` (`sk_test_...`), each with dedicated copy buttons.
  * Footer: Bottom navigation with `← Back` text link on the left and a blue `Continue` button on the right.

---

### 2. Best 2–3

* **Tile 3 (Magnific):** Best overall architecture for agent connection. The horizontal pill bar directly targets the user's agent ecosystem (`Claude Code`, `Codex`, `Hermes`, `Cursor`, etc.), pairing a clear 3-step guide with an explicit copyable MCP server endpoint and a friction-reducing `Add in 1 click` CTA.
* **Tile 5 (Stripe):** Best approach for non-developer mental models. Instead of forcing manual setup or command-line scripting, it formats a contextual, natural-language prompt containing current project details alongside sandbox credentials, reducible to a single "Copy prompt" action.

---

### 3. Borrow for Cauldron

* **Agent Selection Pill Bar (from Magnific, Tile 3):**
  * *Where it fits:* The initial setup modal / empty state of Cauldron's Agent Chat panel when no local agent is connected.
  * *Implementation:* A horizontal pill tab row at the top containing icons for `Claude Code`, `Codex`, `Hermes`, and `Cursor`. Clicking a tab dynamically adapts the instructions and endpoint formatting for that specific agent.
* **Context-Aware Pre-filled Prompt Box (from Stripe, Tile 5):**
  * *Where it fits:* Agent onboarding modal for CLI-based agents like Claude Code or Codex.
  * *Implementation:* A high-contrast code box titled "Integration Prompt" with a prominent `Copy Prompt ⧉` button. The snippet is auto-populated with Cauldron's local environment details (e.g., `Connect to Cauldron MCP at http://localhost:PORT/mcp. My current project is 'Landing-Page' using Astro...`). The creative director simply clicks copy, pastes into their terminal agent, and returns.
* **One-Click Protocol Handler + Fallback Copy Field (from Magnific Tile 3 & Mintlify Tile 0):**
  * *Where it fits:* Connection Settings pane for desktop agents (e.g. Claude Desktop / Cursor).
  * *Implementation:* Provide a prominent primary button (`Connect to Claude Desktop in 1-Click` using a custom protocol/deep link) paired with a secondary, read-only field displaying the local MCP server endpoint (`http://127.0.0.1:4117/mcp`) with an inline copy button for manual fallback.
* **Visual "Connected State" Graphic (from Greptile, Tile 1):**
  * *Where it fits:* Right side of the setup dialog before connecting.
  * *Implementation:* A lightweight visual mockup showing how the agent chat and canvas inspector link together once active, reassuring non-technical users of what the connection achieves.

---

### 4. Avoid

* **Text-Dense Documentation Walkthroughs (Customer.io, Tile 2):** Avoid long, unassisted numbered text guides that instruct users to navigate external settings menus without interactive copy buttons, pre-filled inputs, or automation.
* **Raw Terminal Snippets with No Context (Vercel, Tile 4):** A single `$ npx ...` line assumes terminal fluency. Creative directors need contextual guidance or deep links rather than isolated command-line strings.
* **Manual OAuth and Secret Management (Mintlify, Tile 0):** Avoid surfacing technical authorization primitives (defining OAuth redirect callback URLs, creating machine-to-machine client credentials) inside the visual design workspace. Local desktop MCP communication should bind via loopback or local tokens automatically.
