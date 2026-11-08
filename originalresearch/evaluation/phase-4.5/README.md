# Phase 4.5 — the blind proof

The plan's gate: two contrasting real briefs, each built twice — once with Claude Code on its own,
once with Claude Code inside Cauldron. Billy judges the results blind. Cauldron's versions must win
and pass the measured checks, or version one doesn't ship.

**Status: not run.** The existing brief texts are illustrative drafts with no recorded real-brief provenance. They do not satisfy the plan's two-real-brief requirement. Claude authentication was exercised successfully at checkpoint `82fc6c6`. Application work is paused; Billy's blind judgement remains required after the actual outputs are prepared.

## What exists

- `brief-a.md`, `brief-b.md` — retained illustrative drafts; real comparison inputs have not been established.
- `judging-sheet.md` — what Billy is asked, and what gets measured.

## How the run goes

1. Establish two contrasting real briefs and record their provenance. The agreed plan contains no extra mandatory brief-approval step.
2. For each brief, build the site twice:
   - **On its own:** open an empty Astro site and give Claude Code the brief directly, with no
     Cauldron taste rules and no design tokens.
   - **Inside Cauldron:** open the same empty Astro site in Cauldron, choose a design direction,
     and give Claude Code the same brief through the agent panel.
3. Each of the four results is built (`npm run build`), served, and measured with Cauldron's own
   quality checks: overflow at 375/768/1280, contrast, axe against WCAG 2.1 AA, focus, links,
   type scale, spacing rhythm, hierarchy, and the three anti-pattern checks.
4. The four builds are renamed to A, B, C, D in a random order by someone other than the judge,
   and Billy looks at them without knowing which is which.
5. Billy ranks them and says what is better and why. The ranking is written down before the key is
   opened.

## What decides it

- Cauldron's version must be ranked above its own brief's solo version, on both briefs.
- Cauldron's version must pass the measured checks on both briefs. The plan imposes no requirement for the solo versions to fail.
- If either fails, version one does not ship, and the reason is recorded here.

## Rules

- No hints, no direction given to the solo build beyond the brief.
- The same brief text goes to both, word for word.
- The judge sees the built sites, not the code or the folder names.
