# Library specimen audit

Evidence that every component in the Cauldron library renders as a real, styled
specimen — not a placeholder — at desktop and phone widths.

Captured 21 November 2026 from the **packaged Mac app** (`Cauldron.app`), opening a
disposable Astro site and selecting each of the 30 components in the Components
panel. Each specimen was screenshotted at desktop (960px) and phone (375px) width,
then checked for blank frames pixel-by-pixel and reviewed visually.

## Contents

- `contact-sheet-desktop.jpg` — all 30 components at desktop width.
- `contact-sheet-phone.jpg` — all 30 components at 375px phone width.
- `components/NN-name-desktop.png` / `components/NN-name-phone.png` — the 60
  individual full-resolution captures, numbered in catalogue order.

## Result

All 30 render cleanly at both widths. The audit found two real defects, fixed in
[WDL-259](https://linear.app/witchdaddy/issue/WDL-259) (PR #31, `f6a7aed`):

1. **Phone-width clipping.** The specimen preview wrapper used a grid body, which
   let two `auto-fit minmax` grids (Capability Cards, Masonry Review Cards) inflate
   past the 375px frame and clip. The shipped components collapse correctly in
   normal block flow; only the preview was wrong. Fixed with `body > section { min-width: 0 }`.
2. **Placeholder imagery.** Split Editorial Hero shipped a
   `[ Photography: Stone & Wood Pavilion ]` label. Replaced with a real, credited
   CC0 photograph (Perumal Temple, Madurai — Cleveland Museum of Art Open Access).

The ThreeUI Shader Hero's apparent overflow was a false positive: a decorative
gradient mesh clipped by `overflow:hidden`.

## Colour and type — WDL-261

A follow-up review flagged that every specimen still rendered in one cream
palette and one font. Fixed in [WDL-261](https://linear.app/witchdaddy/issue/WDL-261)
(PR #33, `7330d17`): each component is now showcased in its own vibrant palette
drawn from the researched colour families — terracotta, forest, indigo, gold,
ember, magenta, teal, olive — with its own font pairing from a settled direction
(Fraunces, Newsreader, Playfair Display, Cormorant Garamond, Lora, Archivo Black,
Anton, Archivo). Inserting a component still adopts the open site's own direction.

Verification:

- **Contrast:** an objective WCAG audit (alpha-composited backgrounds) reports
  **0 failures** across all 30 specimens, plus explicit Solid Ground insertion
  probes for the dark-section pieces. Every palette is contrast-verified
  (ink/field ≥ 9:1, muted/field ≥ 4.7:1, white/primary ≥ 4.9:1, accent/dark-ink ≥ 7.7:1).
- **Fonts:** confirmed loading and distinct (8 pairings).
- **Phone width:** 0 blank frames, 0 clipping/overflow.

These captures are the post-fix state.
