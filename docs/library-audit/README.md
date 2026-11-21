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

- **Contrast:** 131 visible text nodes were checked against the rendered pixels
  behind them. There were **0 WCAG AA failures**. The marquee is excluded from
  the automated check because its text animates and repeats; it was confirmed
  readable by eye.
- **Phone width:** 0 of 25 specimens overflow or clip at 375px.
- **Packaged app:** 50 frames captured, 0 blank.
- **Tests:** `npm run check` and `npm run test:projects` (20/20) pass. The new
  `WDL-263` test holds every piece to the same bar: plain Astro, no script,
  design tokens, visible focus, multi-column layouts that collapse on phones,
  motion that stops under reduced motion, and no placeholder imagery.

## History

- WDL-259: fixed phone-width clipping in the preview wrapper and replaced a
  placeholder photo.
- WDL-261: varied colour and type per specimen.
- WDL-263: rebuilt the catalogue as distinct components, the subject of these captures.
