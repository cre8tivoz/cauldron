# Taste tests: pass/fail checks for Phase 4 (Camillo)

Tightened from the drafts in `CAULDRON-ASTRO-PLAN.md` Phase 4. Each test is automatic unless marked **human review**. Every test runs on four targets: copies of WDLsite and rudeboycoffee, plus the two blind-test briefs. A test passes only if it passes on all four.

**Shared setup for every test:** build the site with its own build command (`npm run build`). Serve the built output, not a dev server. Render it in a headless browser at **375, 768 and 1280px** wide, with the page fully loaded and fonts ready.

## 4.1 Taste rules: no anti-patterns in the agent's output

Only what the agent added or changed is checked, in its run's files. Existing site code is not counted against the agent.

| # | Anti-pattern | How it's detected | Fail if |
|---|---|---|---|
| 1 | Lazy default font: Inter, Roboto, Arial or system-ui used as a site's *chosen* display or body font, unless the site's design direction names it | Computed `font-family` of `h1`–`h3`, body text and buttons, compared with the direction's font tokens | A default font appears that the direction doesn't name |
| 2 | Pure black | Computed colour and background of every visible element | Any `#000000` / `rgb(0,0,0)` used as text or a large background (over 10% of the viewport), unless the direction names it |
| 3 | Cards inside cards | DOM walk: an element with border or shadow plus a radius, containing another such element with the same treatment | Any nesting depth of 2 or more |
| 4 | Tired SaaS gradient | Parse built CSS for `linear-gradient`/`radial-gradient` | A gradient whose stops are both in the blue–purple range (hue 210°–290°), unless the direction names it |
| 5 | Generic SaaS accents | Colours in built CSS | `#2563eb`, `#3b82f6`, `#7c3aed`, `#6366f1`, `#4f46e5` or their Tailwind equivalents appear, unless the direction names them |
| 6 | Missing interaction states | For each button, link and form control: compare computed styles at default, `:hover`, `:focus-visible` and `:disabled` (where applicable) | Any control has no visible change on hover or focus-visible |
| 7 | Invisible focus | Tab through the page; measure the focus indicator | No indicator, or the indicator is under 3:1 against its surroundings |
| 8 | Off-scale spacing | Margin/padding/gap values in the agent's CSS | A value is not on the direction's spacing scale (allowing 0 and 1px hairlines) |
| 9 | Off-scale type | Font sizes in the agent's CSS | A font size is not on the direction's type scale |
| 10 | Motion ignoring reduced-motion | Render with `prefers-reduced-motion: reduce` | Any animation or transition over 0.01s still runs |
| 11 | Emoji used as icons | Text nodes inside buttons, nav and list markers | Emoji characters in interface elements |
| 12 | Truncated labels | Elements with `text-overflow: ellipsis`, or a scroll width greater than the client width, in buttons and nav | Any button or nav label is truncated at 1280px |
| 13 | "AI look" overall feel | **Human review**: Camillo or Billy | Reviewer marks it generic |

**Clash rule:** when a site's design direction deliberately uses something on this list, that item doesn't fail. Cauldron must still show its explanation and recommendation (Billy's decision), and the test checks that the explanation was shown.

## 4.2 Design direction: the output actually uses the site's look

| # | Check | How | Fail if |
|---|---|---|---|
| 1 | Colours | Every colour in the agent's CSS is compared with the direction's colour tokens (exact, or derived through `color-mix` from a token) | Any stray colour value |
| 2 | Fonts | Computed `font-family` on rendered headings, body and buttons | First font isn't the direction's display or body font |
| 3 | Spacing | Same as 4.1 #8, against the direction's tokens | Any stray value |
| 4 | Radius | `border-radius` values in the agent's CSS | Not one of the direction's radius tokens |
| 5 | Tokens, not hard-coded values | The agent's new CSS uses `var(--token)` | More than 5% of colour/spacing declarations are hard-coded |
| 6 | Text contrast | Computed contrast for every text node | Body text under 4.5:1; large text (24px+, or 18.66px+ bold) under 3:1 |
| 7 | Button contrast | Button text on its background | Under 4.5:1 |

## 4.3 Component library: every starter component works in real sites

For each starter component, in each of the two test-site copies:

| # | Check | How | Fail if |
|---|---|---|---|
| 1 | Drops in | Add it through Cauldron's "add" action | The add fails, or touches files other than the new component file and the page it's placed on |
| 2 | Builds | `npm run build` | Build error, or a new warning |
| 3 | Plain Astro by default | Inspect the built output | Client-side JavaScript ships for a component not marked as needing interaction |
| 4 | Adopts the direction | Run the 4.2 checks on the component's area | Any 4.2 failure |
| 5 | Accessible | axe-core on the page | Any serious or critical violation |
| 6 | No overflow | Document scroll width vs viewport at 375, 768 and 1280px | Horizontal overflow at any width |
| 7 | Keyboard | Tab through the component | An interactive part can't be reached or used by keyboard |
| 8 | Licence recorded | Component metadata | Missing source, licence or "code allowed" status |
| 9 | Replace works | Swap it for another component in the same category, then undo | The site doesn't return to exactly the previous files |

## What was vague in the drafts, and how it's fixed

- "None of the listed anti-patterns": there was no list. Now there are 13 numbered items, 12 of them automatic.
- "Checked automatically": the method is now stated for each item.
- "No stray values": now defined as exact token matches, or values derived from a token.
- "Adopts the site's direction": now means the component passes all the 4.2 checks.
- "Passes the accessibility checks": now means zero serious or critical axe-core violations, plus contrast and keyboard checks.
- Added: the clash rule (direction wins, explanation shown), the reduced-motion check, the replace-and-undo check, and only judging what the agent changed.

**Limitation:** "generic AI look" (4.1 #13) can't be fully automated. It stays a human check, alongside the blind test in 4.5.
