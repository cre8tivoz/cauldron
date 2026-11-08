> Historical specification snapshot, preserved for the rescue handoff. Source: `CAULDRON-ASTRO-PLAN.md` in the sibling research workspace. Current scope, amendments and execution order: [RESCUE-PLAN.md](../../RESCUE-PLAN.md). Old status/pause/release claims below are not current.

# Cauldron — development plan

**Status: application development paused, 7 Nov 2026.** Corrective checkpoint `82fc6c6` is pushed and its two CI jobs succeeded. Billy authorised the current documentation/process audit; its record changes remain local. Verified results, all numbered plan references, deviations, issues and risks are in the app's `docs/plan-verification.md` and this workspace's `START-HERE.md`. The full plan remains incomplete and v1 release remains gated by 4.5.
**Date:** 6 November 2026. Rewritten the same day: Cauldron is **our own application**, not a fork.
**Repository:** [github.com/cre8tivoz/cauldron](https://github.com/cre8tivoz/cauldron) (public). Checkpoint `82fc6c6` is pushed. The 24 numbered requirements and approved taste tests remain the baseline. Current evidence, issues and risks are recorded in the app's `docs/plan-verification.md`; the local finding records are under `.scratch/cauldron-v1/` in the app checkout.
**Already decided:** [ADR 0001](docs/adr/0001-own-application-not-a-fork.md) (our own app, not a fork) and [ADR 0002](docs/adr/0002-studied-code-is-reference-not-source.md) (research and studied code are used as reference; nothing is copied).

## What we're making

A free, open-source **Electron** desktop app for designing and building **real Astro websites that look genuinely good**. Visual editing and an AI agent sit side by side with **equal prominence**, working on the same site and the same selected element.

**Version one stands on three pillars, all core:** visual editing, the agent, and **built-in design taste**. Taste is what sets Cauldron apart from every other visual builder, so it isn't a later add-on. It carries on from Cauldron OS, which had taste built into every generation, and from the design references Billy gathered at the start of this research. Every site Cauldron helps make draws on it from the first agent job, and version one doesn't ship until it's proven to work (4.5).

- The agent uses the tools you already have (Claude Code, Codex, Hermes), so no Cauldron API key is needed.
- Those same agents can also drive Cauldron from outside the app.
- Real Astro files are always the truth. The old prototype-and-handoff Cauldron is retired.
- Cauldron's code is all ours. The research shows how others did it, what broke, and what we must do better.

## What the research gives us

None of these is a starting codebase. Each one was studied, and its lessons become our requirements.

| Source                                   | What we learned                                                                                                                                                                                                                                                                                                                   |
| ---------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Stacki 1.0.12** (MIT, tested hands-on) | A desktop Astro editor works: opening a site, live preview, selecting and editing elements, undo. And where it breaks: undoing a style change wiped an outside edit; a new page showed "404" until reload; the preview could reach the editor's internals; fixed side panels left the preview only 398px wide in a 1024px window. |
| **Sitereal**                             | How visual edits and agent edits can share one set of actions; merging outside changes safely; undoing a whole agent job. Also a mistake to avoid: two save paths with opposite conflict rules.                                                                                                                                   |
| **Zeku**                                 | Content forms built from the site's own content definitions; the "keep mine / use the disk version" choice; crash recovery.                                                                                                                                                                                                       |
| **Ycode**                                | One list of actions shared by the in-app agent and outside agents.                                                                                                                                                                                                                                                                |
| **Meno**                                 | A clean visual builder to borrow interface ideas from.                                                                                                                                                                                                                                                                            |
| Prosefly, Splitleaf                      | Hosted CMS and builder workflows, as reference.                                                                                                                                                                                                                                                                                   |
| HyperFrames                              | The model for how AI and agent tools plug in: connecting several agent tools, keeping conversations going, showing progress and errors.                                                                                                                                                                                           |
| Sveltia, Pages CMS                       | Saving content files without mangling them.                                                                                                                                                                                                                                                                                       |
| Stageshow, Design Bites, Mobbin          | Design guidance and the app's own look; see [CAULDRON-UI-RESEARCH.md](CAULDRON-UI-RESEARCH.md).                                                                                                                                                                                                                                   |

## Where the design taste comes from

| Source                                                                                                                                                                                                                                                                                                                                        | What it gives Cauldron                                                                                                                                                                                                                                                                                 |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Cauldron OS** (Billy's own MIT app, `cre8tivoz/cauldron-os`; reference only, rewritten fresh)                                                                                                                                                                                                                                               | Its built-in taste layer: rules against the generic AI look and for premium craft; picking a design system before anything is made; pulling fonts, colours and layout from a reference URL; scoring hierarchy, spacing, contrast and accessibility; a critique loop where plain feedback gets applied. |
| **Billy's built library** (from the `WEB BUILDER IDEAS` note: "sexy sections and components and design files that could become part of a built library or links"): Gradient Deck, mkdir.directory, Unsection, ThreeUI, Superdesign, React Bits, Subframe Motion, Prompt Motion, Design Bites, Lander blocks ("fantastic resource"), OriginKit | **The whole point of Cauldron:** reusable sections, components and design files that people drop into their own site to build it. Each source becomes library content where its licence allows, or a linked reference where it doesn't. React Bits is link only; its licence forbids redistribution.   |
| **Theme factories:** Lexington Themes                                                                                                                                                                                                                                                                                                         | How complete themes are packaged and offered.                                                                                                                                                                                                                                                          |
| **Anti-patterns:** Design With Intent                                                                                                                                                                                                                                                                                                         | What the taste checks must catch.                                                                                                                                                                                                                                                                      |
| **Speed and quality:** Templens                                                                                                                                                                                                                                                                                                               | The page-speed and quality-report ideas for 4.4.                                                                                                                                                                                                                                                       |
| **Open Design systems** (Apache 2.0)                                                                                                                                                                                                                                                                                                          | **Not used (Billy, 7 Nov 2026).** Its packages are variants of the same template: a check found 84 of the 152 package folders share one template. A copy stays in `references/open-design/` for reference only.                                                                                        |
| **Design Bites** (MIT)                                                                                                                                                                                                                                                                                                                        | 295 more design notes from real sites. Can be bundled (found by Camillo, 7 Nov 2026).                                                                                                                                                                                                                  |
| **Gradient Deck**                                                                                                                                                                                                                                                                                                                             | Real-site design notes (the site says 1,286; not independently counted). **No licence found, so link only:** nothing from it is bundled or imported.                                                                                                                                                   |
| **Refero**                                                                                                                                                                                                                                                                                                                                    | Live style search, as Cauldron OS did.                                                                                                                                                                                                                                                                 |

**Status of the design work (7 Nov 2026):**

- **Decided by Billy:** Cauldron's own look uses the **Coral** accent and **Source Sans 3**, and follows the Mac's light/dark setting. The taste tests in `design/camillo/taste-tests.md` are **approved** as v1's pass/fail bar.
- **Rejected by Billy; don't reuse:** both earlier sets of starter directions (`design/camillo/directions/`, `design/camillo/directions-v2/`) and the generic 35-piece library list (`design/camillo/library/`). Each folder has a `SUPERSEDED.md`.
- **Starter set (Claudia's picks, 7 Nov 2026, on Billy's instruction to decide).** Full list: `design/STARTER-SET.md`.
  - Directions: 7 Design Bites design files.
  - Components: 5 built-in ThreeUI pieces.
  - Plus a shelf of links to Billy's other references.

**Assignment update after the earlier Camillo proposal:** Billy delegated the final starter picks to Claudia and stopped further Camillo/subagent work. Earlier attribution below describes the proposal history. `design/STARTER-SET.md` records the resulting seven directions, five pieces and links shelf. This changes no functional requirement or approved test.

## The plan, in order

### Phase 0 — Groundwork

**0.1 Set up the repository.** ✅ **Done 7 Nov 2026** (`5cb4d64`, `42d7508`, `b494c85`). In `cre8tivoz/cauldron`: MIT licence, README, an Electron app that opens a window, and automatic checks on every change. Also in there: Mac menu, single instance, error screen, provisional icon, `AGENTS.md`, `CONTRIBUTING.md`, the decision records and glossary. Everything on current versions (Electron 45, React 19, TypeScript 7, Node 26.13, npm 12). CI green.
_Decided:_ MIT licence; React + TypeScript.

**0.2 Reference rule.** Research stays in this workspace, outside the Cauldron repository. We use it to understand how things work, then write our own code ([ADR 0002](docs/adr/0002-studied-code-is-reference-not-source.md)).

**0.3 Choose the test sites.** Copies of real sites, with layouts, components, content collections and images. Cauldron is tested against them from its first working build, not just against a tiny practice site. Jev flagged that exact gap.
_Decided:_ copies of WDLsite, then rudeboycoffee.
_Initial discovery, 7 Nov 2026:_ originals are at `~/hermes/website-designs/WDLsite` and `~/hermes/website-designs/rudeboycoffee`. Copies have since been created and exercised. At checkpoint `82fc6c6`, both copied editor suites pass 23/23; their installed Astro versions are 7.3.5 and 6.4.8. Original-site discovery observations are historical; originals remain excluded from test edits.

### Phase 1 — The core editor, safe from day one

This is the biggest piece of work. Stacki showed that the hard part is reading and writing real Astro files without damaging them. We build that safety in from the start, rather than repairing it later.

**1.1 Open and preview a site.** Open a folder, confirm it's an Astro site, and start its live preview automatically. If something needs installing, say so and ask. Never install silently.

**1.2 Select and edit.** Click an element in the preview to select it, then change its text, settings and styles. Changes land in the real Astro files and appear in the preview.

**1.3 Every save knows what it was based on.** Page, style and source saves, plus Undo and Redo, all carry the version of the file they started from. If the file has changed since, merge or ask; never overwrite. Test: change a style, edit something else in the same file outside the app, press Undo, and the outside edit must survive. (This is exactly where Stacki fails.)

**1.4 One rule for outside changes.** When a file changes on disk, merge automatically if the changes don't overlap. If they do, keep both and ask "keep mine / use the disk version". Every save path follows the same rule.

**1.5 Files keep their shape.** Anything Cauldron doesn't understand in a file stays exactly as written. Tested on the Phase 0.3 sites, not assumed.

**1.6 Crash recovery.** Unsaved edits are saved every few seconds to a recovery area outside the site, and offered back after a crash.

**1.7 New pages appear straight away.** A newly created page shows in the preview without a reload.

**1.8 The preview can't reach the editor.** The website preview only gets a small reporting channel, for things like its page height. A website, or a script an agent adds to one, can never reach editing powers.

### Phase 2 — The shared backbone

**2.1 One set of actions.** For example: read the selection, read a page's outline, edit an element, edit a CSS rule, create a page. The visual controls, the agent panel and outside agents all use these same actions. Every change states which version it was based on; out-of-date changes are refused with a clear message.
_Decided:_ inside the main app for v1 (ADR 0006).

**2.2 Reviewable agent runs.** Each agent job becomes a run, with a plain summary of which pages and files it changed. A whole run can be undone in one step. Cauldron refuses if you've since changed the same thing, and shows what clashes. **Version one also has a Before/After toggle** in the preview that highlights the parts of the page a run changed (Billy's decision).

### Phase 3 — The workspace and the agent side

**3.1 Workspace layout and the app's look.** Agent column on the left, live preview in the centre, visual controls on the right (Billy's decision). Resizable, collapsible panels so they share space properly at every **desktop** window size; narrow-window layouts are not in version one. Smallest supported window: **1280 × 800**. Research and a proposed layout: [CAULDRON-UI-RESEARCH.md](CAULDRON-UI-RESEARCH.md). Jev found **no plan item covering a good-looking app**; this fixes that.
_Decided:_ Camillo leads, Billy approves.

**3.2 Agent panel.** Runs the agent tool you already have, with the selected element as context. It remembers the conversation and clearly shows running, finished and failed. **Version one supports Claude Code, Codex and Hermes**, each tested end to end before support is claimed (Billy's decision). Claude Code is built first; Codex and Hermes follow once it works. Checked on Billy's Mac: Codex 0.152.0 has `codex exec` (non-interactive) with `--json` event output, `resume` and MCP support. Hermes 0.22.7 has `hermes chat -q … --format stream-json` (streamed progress), `--resume SESSION_ID` and MCP support. Note: its `-z/--oneshot` mode skips approvals, so Cauldron should use `chat -q` with stream-json instead.
_Ordering:_ the panel's design can be built alongside Phases 1–2, but it must not change files until 1.3 and 2.1 are done.

**3.3 Outside agent access.** The same actions are offered to Claude Code, Codex, Hermes and others through a local MCP connection (the standard way agent tools plug into apps). It works only on this computer, with a per-site access code. Each tool is tested before we claim support, starting with one.

**3.4 Content editing.** Forms built from your site's Astro content definitions, with a warning when they're out of date and plain-text editing as a fallback.

### Phase 4 — Design taste, built in (core of version one)

_Ordering:_ built alongside Phases 1–3, not after them. The taste rules and the site's design direction (4.1, 4.2) must exist before the agent panel's first real job, so Cauldron's very first agent run already uses them.

_Tests:_ each of 4.1–4.3 gets its own pass/fail test (Billy's decision). Claudia drafts them, Camillo checks them and Billy approves. Drafts:

- **4.1 taste rules:** on both test sites and both blind-test briefs, the agent's output contains none of the listed anti-patterns, checked automatically.
- **4.2 design direction:** the site's chosen colours, fonts and spacing tokens are what the output actually uses, with no stray values, checked automatically.
- **4.3 component library:** every starter component drops into copies of both test sites, builds, adopts the site's direction and passes the accessibility checks.

**4.1 Taste rules, always on.** Every agent job carries Cauldron's taste rules: what to avoid (the generic AI look: default fonts, pure black, cards inside cards, tired blue gradients) and what to insist on (spacing, type, states, small interactions). This carries on from Cauldron OS's taste layer. When a site's chosen direction clashes with a taste rule, **the direction wins**, but Cauldron tells the person why it may not be the best approach, with evidence and a recommendation (Billy's decision).

**4.2 A design direction for every site.** Each site gets a chosen direction from Cauldron's **small starter set**, picked from the real-site **design files** (Design Bites, MIT), or a look pulled from a reference URL. Camillo picks the handful and Billy approves. **Open Design is not used: its packages are variants of the same template** (Billy's decision, 7 Nov 2026). It's saved inside the site as design tokens plus a plain design document the agent reads on every job. The visual controls offer those tokens first, so hand edits stay on-brand too.

**4.3 The component library: the heart of Cauldron.** A **small starter set**, drawn from Billy's design references; Camillo picks and Billy approves. A piece is built in only where its licence allows; otherwise its source is a link. Built-in pieces drop into a site with previews and "add" or "replace", as in the Canva pattern. Each one is shaped by the site's direction when it's added. Code is included only where the licence allows.

- **Added components are copied into the site** as its own normal, editable files. The site owns them and works with or without Cauldron ([ADR 0007](docs/adr/0007-library-components-are-copied-into-the-site.md)).
- **Components are converted to plain Astro**, keeping React only where a component genuinely needs interaction, so sites stay light and fast ([ADR 0008](docs/adr/0008-library-components-are-plain-astro.md)).

**4.4 Quality and critique.** Build the actual site, then measure: layout overflow at phone/tablet/desktop sizes, keyboard use, automated accessibility, broken links and speed. Then taste checks against the site's own direction: type scale, spacing rhythm, contrast and hierarchy. Plain-English feedback ("tighter spacing", "make the header bolder") goes to the agent to apply. Measured results stay separate from design opinion.

**4.5 Proof that it works.** Two contrasting real briefs, each built twice: once with Claude Code on its own, once with Claude Code inside Cauldron. Billy judges the results blind, without knowing which is which. Cauldron's versions must win, and pass the measured checks. If they don't, version one doesn't ship. (Agreed by Billy.)

### Phase 5 — Ship it

**5.1 Publishing.** Show changed files and publish through your own Git repository. No publishing with unsaved edits, and nothing is ever committed without you asking.

**5.2 Mac download.** An unsigned download with first-launch instructions, tested on a separate Mac.

### Parked until later

- Optional bring-your-own-key, once the agent paths work.
- Windows and Linux releases.
- Supporting all eight agent tools at once.

## Decisions for the grill session

1. ~~Licence~~ **Decided: MIT** ([ADR 0003](docs/adr/0003-mit-licence.md)).
2. ~~Main building blocks~~ **Decided: React + TypeScript** ([ADR 0004](docs/adr/0004-react-typescript-interface.md)).
3. ~~Which real sites~~ **Decided:** copies of `website-designs/WDLsite` first, then `website-designs/rudeboycoffee`. Never the originals.
4. ~~Where shared actions live~~ **Decided:** inside the app for v1. Outside agents can edit a site only while Cauldron is open ([ADR 0006](docs/adr/0006-actions-run-inside-the-app.md)).
5. ~~First agent~~ **Decided: Claude Code first; Codex and Hermes also in v1**, each tested. Checked on Billy's Mac: version 2.1.318 has hands-off mode, live progress output, conversation resume and MCP connections.
6. ~~Windows and Linux~~ **Decided:** parked until after the first Mac release.
7. ~~Design taste sources~~ **Decided:** Cauldron OS's taste layer is rewritten fresh, with Cauldron OS as reference only ([ADR 0002](docs/adr/0002-studied-code-is-reference-not-source.md)). **Camillo curates** a small starter set of directions (from the Design Bites design files) and components (from Billy's design references in his `WEB BUILDER IDEAS` note); Billy approves.
8. ~~"Good-looking app"~~ **Decided:** Camillo leads the look of Cauldron itself using the Mobbin research. Billy picked: follow the Mac's light/dark setting, **Coral** accent, **Source Sans 3**.
9. ~~Bring-your-own-key~~ **Decided:** parked until after the first Mac release.
10. ~~What "done" looks like for version one~~ **Decided:** every phase, 0 to 5, is in version one, including all of Phase 4 ([ADR 0005](docs/adr/0005-design-taste-is-core-to-v1.md)), content editing (3.4) and publishing (5.1). The component library launches with a starter set across the main section types, which Camillo picks and Billy approves. Smallest supported window: 1280 × 800. The proof is the blind comparison in 4.5; Cauldron must win.

The UI research decisions are settled too; see [CAULDRON-UI-RESEARCH.md](CAULDRON-UI-RESEARCH.md).

## How this plan held up under Jev

Jev (TypeSafe `jev-1.14.0`) stress-tested **this plan** on 6 Nov 2026: 252 yes/no questions across 60 requests, about **US$0.003**, plus a small follow-up probe. Inputs, ledger and scripts: `evaluation/plan-review-v2/`. Jev judges evidence; it didn't write this plan.

- **Controls:** 22 of 23 passed. It rejected all five false claims (for example "React Bits can be freely bundled" and "Claude Code has already been tested inside Cauldron") and the three things a version-one plan must not include (a cloud service, a phone app, Windows/Linux in v1). The one miss, as last time: "let the agent change files before saves are safe" scored _needs work_, not _rejected_. It stays rejected here.
- **Bad alternatives rejected:** forking Stacki, taste later, copying Sitereal, bundling React Bits, a linked component package, keeping components in React, the old design systems, and a separate engine.
- **Coverage:** all 15 requirements from Billy's brief and decisions are covered, including taste as a core pillar (0.99), the component library (0.99), the latest design systems (0.99) and the proof test (0.80).
- **What Jev changed:**
  - **More agents.** Billy's note says agents plug in "like HyperFrames"; the plan only committed to Claude Code. Now: Claude Code, Codex and Hermes in v1, each tested (3.2).
  - **Testable taste.** The taste rules, design direction and library were hard to test as written. Each now gets a pass/fail test (Phase 4).
- **Where Jev and the plan disagree (Billy's call: the plan's order stands):**
  - Taste rules before the agent's first job: Jev sees it as a product choice, not a technical need. Billy keeps it.
  - Preview lockdown before the agent can change sites: Jev disagreed for the second time. Billy keeps it as a safety rule.
- **Now moot (Open Design isn't used):** whether the Open Design systems can be included in an MIT app (Jev 0.27). The repository has one Apache 2.0 licence covering everything, and no NOTICE file or per-package licences. Apache 2.0 allows copying, changing and redistributing, including inside an MIT app, on three conditions: ship a copy of the Apache licence with them, mark any files we change, and keep their licence for those files rather than relabelling them MIT. Apache 2.0 gives no trademark rights, so systems named after brands (Stripe, Vercel and so on) must be presented as "inspired by", never as endorsed. Not legal advice.

The earlier, fork-based review is in `/Users/habibi/hermes/cauldron-pivot-research/plan-review/`; its fork-specific items no longer apply.
