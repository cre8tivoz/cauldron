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

These captures are the post-fix state.
