# quality_report

Model: gemini-3.8-flash (direct Google AI Studio call). Search: "website performance and accessibility audit report with scores and issues list"

## Mobbin links
- 0 Lovable: https://mobbin.com/screens/91e4caa2-3908-478a-92e5-50ed9843795d
- 1 Semrush: https://mobbin.com/screens/2b10b36e-e9ce-424a-b603-e85f59bfbd07
- 2 Visitors: https://mobbin.com/screens/87c9a97b-b15d-459a-b30a-dfc2383d42e8
- 3 Profound: https://mobbin.com/screens/f745335b-5517-4cbf-a0e3-f21cb23645a2
- 4 Sentry: https://mobbin.com/screens/8dc7d225-2bcc-463d-a833-c94787a4c1e6
- 5 Wix: https://mobbin.com/screens/e410bcaf-02f3-4c4c-ae00-0e99c82a2d67

## Analysis
### 1. Tile Summaries

#### Tile 0: Lovable
* **Layout & Structure:** Two-column split with an AI conversational agent on the left and an audit report on the right. 
* **Header & Scores:** Top bar shows audit timestamp, device toggle (Desktop/Mobile), and a row of four summary cards for standard Lighthouse categories: Performance (100%), Accessibility (96%), Best Practices (100%), and SEO (100%) in light-grey rounded containers (`#F4F4F6` approx).
* **Issues List:** Under "Performance Issues (3 issues)", expandable rows list specific problems: "Network dependency tree", "Reduce unused JavaScript", and "Use efficient cache lifetimes". Each row contains explanatory text, external documentation links, and a prominent black pill button: **"Try to fix"**.
* **Context & Chat:** Bottom shows a rendered "Page Screenshot" of the site. The left AI drawer prompts: *"Would you like me to create a plan to address any of these improvements?"* with quick-action chips.

#### Tile 1: Semrush
* **Layout & Structure:** Dense desktop web audit panel with secondary navigation tabs (*Overview, Issues, Crawled Pages, Statistics, etc.*).
* **Filter Bar:** Horizontal pill filters categorize issues by severity and scope: *All, AI Search, Crawling, Content, Meta tags, Errors (0), Warnings (3), Notices (0), With issues*.
* **Issue Rows:** Clean list grouped under "Warnings (3)". Each row displays:
  * Issue title in blue (e.g., *"2 pages have low text-HTML ratio"*, *"1 page doesn't have an h1 heading"*).
  * Inline link: *"How to fix"*.
  * Count badge: *"2 new issues"*, *"1 new issue"*.
  * Action dropdown: *"Send to..."* (task management integration).

#### Tile 2: Visitors
* **Layout & Structure:** Real-user monitoring (RUM) performance page.
* **Metrics:** Left-hand circular gauge displays a composite "67 - Needs work" score (orange, `#E67E22` approx) with three tier thresholds (*0–49, 50–89, 90+*). Top right shows raw Core Web Vitals values: *CLS (0.000), TTFB (0.56s), FCP (3.32s), LCP (3.44s), INP (248ms)*.
* **Main Area:** Dominated by a 7-day historical trend line chart. 
* **Relevance:** Off-topic for local pre-flight design audits; relies entirely on aggregated production visitor traffic.

#### Tile 3: Profound
* **Layout & Structure:** Clean "Page Health Analysis" dashboard for a specific route (`/(Home)`).
* **Metric Cards:** 2×3 grid of Core Web Vitals cards (*First Contentful Paint, Largest Contentful Paint, Time to Interactive, Speed Index, Total Blocking Time, Cumulative Layout Shift*).
* **Card Anatomy:** 
  * Large numerical value + unit (e.g., `0.2 s`, `20 ms`, `0`).
  * Top-right green badge: `"Good"` (`#E8F5E9` background, `#2E7D32` text approx).
  * Explanatory footer: one-line plain-English description (e.g., *"Time until first content is painted on the screen"*, *"Time until the page is fully interactive"*).
* **Table:** Lower section lists related pages with indexing/referral metrics.

#### Tile 4: Sentry
* **Layout & Structure:** Developer telemetry frontend overview.
* **Scores & Gauge:** Donut chart for "Performance Score (89)" broken down by metric slices (TTFB, FCP, LCP, INP, CLS), followed by a timeline breakdown.
* **Metric Strip:** Key vitals with qualitative status tags: *LCP 1.50s (Meh 87), FCP 1.50s (Meh 77), INP 40ms (Good 100), CLS 0 (Good 100), TTFB 1.02s (Meh 60)* using green and muted orange pills.
* **Table:** Dense breakdown per page route showing request counts and vital thresholds. Highly technical and developer-focused.

#### Tile 5: Wix
* **Layout & Structure:** Multi-widget high-level site overview dashboard.
* **Audit Cards:** 
  * *SEO*: Circular progress indicator (68%) with summary counts (*1 Issue, 5 Recommendations, 13 Completed tasks*).
  * *Site Performance*: Traffic-dependent placeholder card (*"Not enough traffic at the moment"*).
  * *Accessibility*: Minimal notification card stating *"Your live site has detected issues"* with a single text link *"Fix issues"*.
* **Relevance:** High-level portal/marketing overview; lacks immediate diagnostic granularity on-screen.

---

### 2. Best 2–3

* **Tile 0 (Lovable):** **Best overall model for Cauldron.** Directly pairs category scores (Lighthouse-style 0–100) with a list of discrete issues that feature an explicit **"Try to fix"** trigger wired directly into an AI assistant pane.
* **Tile 3 (Profound):** **Best metric presentation for creative directors.** Translates raw speed/layout telemetry into digestible cards featuring plain-English definitions (e.g., *"Time until the page is fully interactive"*) alongside concrete numbers and clear "Good" / "Needs Work" badges, eliminating developer jargon confusion.
* **Tile 1 (Semrush):** **Best issue hierarchy and grouping.** Clean classification into *Errors / Warnings / Notices* with occurrence counts and inline *"How to fix"* explainer modals.

---

### 3. Borrow for Cauldron

* **AI-Actionable Issue Rows (from Tile 0):**
  * *Where:* Cauldron's **Audit / Pre-flight Drawer** (accessible from top toolbar or bottom dock).
  * *Pattern:* Each detected performance or accessibility violation (e.g., missing image `alt`, unoptimized Astro `<Image />`, missing `<h1>`, CLS-inducing layout shift) gets a row with title, brief context, and a primary action button: **"Fix with AI"**. Clicking it passes the element ID and issue context straight into the AI agent chat pane to draft the fix.
* **Plain-English Metric Explanations (from Tile 3):**
  * *Where:* **Site Health / Performance Inspector Tab**.
  * *Pattern:* Present measured Core Web Vitals (synthesized locally via headless Chromium in Electron) as cards containing the actual value, a color-coded status badge (*Good / Needs Improvement / Poor*), and an exact plain-language definition of what that metric means visually (e.g., *"Visual stability: measures unexpected movement while loading"* instead of just *"CLS: 0.15"*).
* **Severity Grouping & Element Badges (from Tile 1):**
  * *Where:* **Audit Results Tree & Canvas Overlay**.
  * *Pattern:* Group audit findings into **Errors** (blocking accessibility/build issues), **Warnings** (optimization advice), and **Passed**. Show badge counts on the inspector tab header. Clicking an issue highlights the offending DOM element directly on the visual canvas.

---

### 4. Avoid

* **RUM / Traffic-Dependent Vanity Scores (Tiles 2, 4, 5):** Do not show blank states like *"Not enough traffic"* or historical line charts. Cauldron is an authoring tool: audits must be computed locally on the built Astro preview, providing immediate deterministic results.
* **Opaque Composite Scores without Context (Tile 2):** Avoid single arbitrary vanity numbers (e.g., "Score: 67 - Needs work") without immediate attribution to whether layout, images, scripts, or accessibility are at fault.
* **Developer-Only Jargon without Microcopy (Tile 4):** Avoid dense telemetry terminology (*TTFB, FCP, INP*) presented purely as raw milliseconds without plain-English explanations tailored to creative directors.
