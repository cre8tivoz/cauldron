# Library specimen audit

Evidence that the Cauldron component library shows **genuinely distinct, real
components**, not recoloured copies of one card template, and that every one
renders correctly at desktop and phone widths.

Captured from the **packaged Mac app** (`Cauldron.app`). The script opens a
disposable Astro site, then selects each of the 25 components in the Components
panel. Each specimen was captured at desktop (960px) and phone (375px) width,
then checked by pixel sampling and by eye.

## Contents

- `contact-sheet-desktop.jpg`: all 25 components at desktop width, each labelled with its name and category.
- `contact-sheet-phone.jpg`: all 25 components at 375px phone width.
- `components/NN-name-desktop.png` / `components/NN-name-phone.png`: the 50 individual captures, numbered in catalogue order.

## The catalogue (WDL-263)

Billy rejected the earlier library as uniform section cards in different
colours. The catalogue was rebuilt from the original research archive
(`cauldronresearchbackup`). That archive holds React Bits' categories
(TextAnimations, Backgrounds, Components), OriginKit's component index
(text, interactive, gallery, background, button), ThreeUI's effects and
Design Bites' real-site design files. Following ADR 0001/0002, these were read
for understanding and every piece is our own plain HTML/CSS.

Twenty distinct pieces across seven kinds:

| Kind         | Pieces                                                                 |
| ------------ | ---------------------------------------------------------------------- |
| Text effects | Gradient Headline · Shiny Sweep · Marquee Strip                        |
| Backgrounds  | Aurora Field · Dot Matrix · Grain Gradient                             |
| Cards        | Spotlight Card · Bento Grid · Holo Card                                |
| Galleries    | Masonry Gallery (CC0 Hokusai prints) · Coverflow (3D, with reflection) |
| Navigation   | Command Palette · Dock Navigation · Pill Navigation                    |
| Buttons      | Specular Button · Glow Call to Action                                  |
| Sections     | Process Stepper · Stat Band · Editorial Hero · Pricing Ticket          |

The five credited ThreeUI starters remain as recorded in the starter set. The
library now opens on a **Featured** set of the strongest pieces, not the first
five entries in the file.

## Verification

- **Works in every direction:** each of the 20 pieces was rendered in all ten
  real design directions (200 combinations), and 1,210 text nodes were checked
  against the pixels behind them. **0 failures are caused by the components.**
  Text on a site's primary picks black or white from the primary's lightness, so
  no piece assumes a light surface, a light accent or a dark primary.
- **Inherited, not caused:** Solid Ground, Silver Screen and Open House define
  text tokens below AA on their own backgrounds:
  - Solid Ground: muted on bg 3.06:1.
  - Silver Screen: primary on bg 3.13:1.
  - Open House: primary on bg 3.79:1.

  Any piece using those tokens, including the starters, inherits that. The
  directions are settled design, so this is recorded on WDL-263 for Billy's
  decision rather than changed here.

- **Showcase:** 128 visible text nodes, 0 AA failures. Holo Card was checked at
  its worst animation frame (sheen frozen at nine positions, across all
  palettes): body 6.09:1, title 5.19:1, chip 5.9:1.
- **Text-clipped headlines:** Shiny Sweep's sheen is visible in all 11 palettes,
  and its worst frame measures 3.86:1 against the field (large text needs 3).
  Gradient Headline and Shiny Sweep both pad their descenders. A hole test
  renders each glyph clipped and solid and compares the two: 0 missing pixels in
  every palette, against 19 missing (a severed "y") with the padding removed.
- **Phone width:** 0 of 25 specimens overflow or clip at 375px.
- **Packaged app:** 50 frames captured, 0 blank.
- **Tests:** `npm run check` and `npm run test:projects` (20/20) pass. The
  `WDL-263` test holds every piece to the same bar: plain Astro, no script,
  design tokens, visible focus, multi-column layouts that collapse on phones,
  motion that stops under reduced motion and no placeholder imagery. It also
  checks that the outline's quick-insert menu only names real pieces.

## History

All of this sits on one issue, WDL-263. Earlier passes:

- WDL-259: fixed phone-width clipping in the preview wrapper and replaced a
  placeholder photo.
- WDL-261: varied colour and type per specimen.
