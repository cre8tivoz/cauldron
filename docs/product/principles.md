# What Cauldron believes

Cauldron is a Mac app for making real Astro websites. This document says what counts as good here, and why the app is built the way it is. It is for someone deciding whether the project is worth their time and for someone deciding what to work on.

If a change cuts against something below, open an issue and argue it. Don't quietly work around it.

## The site is ordinary Astro

A site made in Cauldron is a folder of Astro files. It builds with `astro build` and exports a plain `dist/` folder. Cauldron is a tool for getting there, not a runtime the site needs afterwards.

The strongest version of this rule is in the component library. `cataloguePiece()` in `src/main/library-pieces.ts` writes out a `.astro` file with its own markup and CSS. The file header says what it is: "Plain Astro, pure HTML/CSS. Edit freely in your site." A piece that genuinely needs interaction — the command palette, for example — gets a small script, and its content is still in the HTML without that script. That follows ADR 0008: React is kept out of generated sites because it would ship JavaScript nobody asked for.

Design choices live in the site too. `writeDirection()` in `src/main/directions.ts` writes `cauldron/tokens.css`, `cauldron/DESIGN.md` and `cauldron/design.json` inside the site folder. Library pieces are copied into the site, not linked from a shared package (ADR 0007). A person can close Cauldron, open the folder in any editor, and carry on.

So: no feature that makes a generated site depend on Cauldron at runtime. If an idea needs a wrapper around Astro, it is the wrong idea.

## Taste is measured, not a vibe

Cauldron's taste layer does not say "make it look nice". It measures.

The thresholds are in `src/main/contrast.ts`: body text needs 4.5:1, large text needs 3:1, button labels need 4.5:1, and a focus indicator needs 3:1 against what sits behind it. `textContrastRequired()` decides "large" at 24px, or 18.66px when bold. `judgeFocus()` reads the ring's actual colour against its surroundings; a ring that exists but can't be seen fails.

Colour decisions are computed the same way. `onPrimary()` in `src/main/directions.ts` picks black or white by measured contrast, not by a lightness guess. `solidPrimary()` moves a mid-tone primary away from the text colour until small labels clear 4.6:1. `designDocument()` writes the measured pairs into `DESIGN.md` — ink on surface, with the ratio and what the pair may be used for — so the agent reads a limit, not a mood. The threshold is decided before rounding, so 4.46 does not print as 4.5 and get allowed for small text.

There are ten curated directions — Long Lunch, Clear Ground, Solid Ground, Silver Screen, The Edit, After Hours, Open House, Componine, Niki Studio and Henry From Online — each learned from a real site. A person can also paste a reference URL and have tokens measured from it (`src/components/DesignPanel.tsx`). When a measurement can only supply colour and type, `REFERENCE_STRUCTURE` in `src/main/directions.ts` supplies explicit, modest layout rules rather than pretending the source site supplied them.

The other tokens are fixed scales: ten type sizes, eleven spacing steps and five radii in `src/main/directions.ts`. Niki Studio gets its own type scale because its display step needed one; nothing else was bent to fit. A chosen direction is a system, not a palette.

Quality findings say what was checked. `measureTaste()` in `src/main/taste-check.ts` returns findings with a label, a status, a detail line, a page and a width. The Quality panel runs them at 375, 768 and 1280px. `src/main/quality.ts` adds the rest of the report: the build, page loads, horizontal overflow, whether fonts were ready before measuring, axe checks, alternative text, labelled form fields, heading order, page language, link and button text, and the load, script and HTML size at each width.

A finding marked "opinion" is a judgement and says so; it is never counted as a pass or a fail. `quality.ts` adds one on purpose: The overall “AI look” is a person's call. No automatic measurement can decide whether a page feels generic. The report tells you to look at the built page yourself. That line matters more than it sounds: a green report is not a claim that the site is good.

## A site must look like someone made choices

The default is not "clean modern SaaS". `measureTaste()` looks for the tells of a template and fails them:

- Pure black, when the direction hasn't named it.
- Cards inside cards, and a solid bar of 2px or more down one side of a box (`hasSideStripe()`).
- Blue-purple gradients and the stock accents (`#2563eb`, `#3b82f6`, `#7c3aed`, `#6366f1`, `#4f46e5`) when they aren't in the direction.
- Fonts, colours, spacing and radii that aren't on the direction's scales.
- More than five percent of colour and spacing declarations written as hard-coded values rather than `var(--cauldron-*)` tokens.
- Emoji standing in for interface icons. Typographic arrows such as `→` and `↗` count as punctuation, not emoji.
- Truncated button and nav labels.
- Controls that can't be reached with Tab, that don't change on hover, or whose disabled state looks the same as resting.
- Motion that keeps running under `prefers-reduced-motion: reduce`.

When a direction deliberately breaks a rule, the check says so instead of pretending. After Hours names pure black, so the black finding becomes a design opinion with a warning about asking too much of small grey copy. The rule stays visible and the person decides.

There are standards too, carried into the agent prompt and `DESIGN.md`: no unintended overlaps at any width; a real disclosure menu when the nav collapses on mobile, with a visible toggle, a 44px touch target and Escape to close; interaction states that stay distinct. These are defaults, not a layout to stamp onto every site.

## The person stays in charge

Every agent job is an `Agent run`: one job and every change it made, reviewed and undone as a whole. `src/main/runs.ts` keeps a snapshot per changed file and records who wrote it. Undo refuses to touch a file when ownership can't be established — "Who wrote these files cannot be established, so nothing was touched" — and leaves files changed by hand alone. The app does not quietly overwrite work it doesn't own.

Files are the person's files. A library piece is copied into the site, so editing it in any editor is normal. Adding a piece the catalogue doesn't have is refused with a message naming the piece, not swapped for something similar (`src/components/LibraryPanel.tsx`).

A run records what it changed, including files it touched outside Cauldron's checked actions, and shows the changed parts with a Before/After toggle. The person can see what a job did before deciding whether to keep it. Undo is per run, not a mysterious global stack.

Nothing hidden means nothing hidden. There is no telemetry, analytics or tracking. The app goes online only when asked: to load fonts for previews, install site packages, send a request to the chosen AI provider, or deploy to a host the person picked. Keys go into the Mac keychain and only to the chosen provider. A site shown in the preview gets no editing powers (`AGENTS.md`).

## No silent failures

A failure that reaches nobody is a bug. That rule in `AGENTS.md` shows up all over the code, and a contributor should keep it that way.

- If page-side measurement throws, `measureTaste()` throws "The taste checks could not run" with the underlying error. It does not return an empty report that looks clean.
- If the motion check can't start, it records a finding with status `unknown` and the reason, which the Quality panel shows under "checks could not run".
- If the site doesn't build, the Quality panel says there is nothing to measure and shows the build log. It does not show a report full of passes.
- If the component library can't be read, the Library panel shows the error and logs it to the console.
- Publishing code names the usual causes instead of a bare failure: a timed-out deploy, a missing Wrangler login or token, a static build that failed before deployment.
- An agent run has a status of `running`, `finished` or `failed`, and records paths it could not read under `problems` (`src/main/runs.ts`). A failed job is shown as a failed job, not folded into a clean result.

Keep results honest in new code too. Say what was run, on what, and what wasn't. An empty list, a hidden error or a "verified" badge with nothing behind it is worse than a visible problem.

## What done means

Done means it works through the delivered app. Tests passing, a tidy document or a good-looking demo is not the same thing. `AGENTS.md` sets the bar: run `npm run check` before a commit, and `npm run verify:mac` (or `npm run smoke`) before opening or merging a pull request that touches app code. `npm run package` does not type-check, so `PACKAGE=0` is not proof that the code compiles.

If you can't run the Mac checks, say so plainly in the report. That is the same rule as the rest of this document: visible state beats a claim that can't be checked.

Work lands through pull requests, one idea each, with CI green before merge. The maintainer reviews and merges; the one exception is a documentation-only correction made straight to `main`.
