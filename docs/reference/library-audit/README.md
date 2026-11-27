# Library specimen audit

Evidence for the Cauldron component library, and the two runners that produce
it. Nothing here is a claim without a command behind it.

```bash
npm run test:library:render                  # every piece, every palette, measured pixels
npm run package && npm run test:library:ui   # the real packaged app
```

Both runners exit non-zero on any failure. The render runner also writes
[`render-audit.json`](render-audit.json): the revision it ran against, page and
run counts, and the worst pair per piece.

## Contents

- `contact-sheet-desktop.jpg`: all 25 components at desktop width.
- `contact-sheet-phone.jpg`: all 25 components at 375px phone width.
- `components/NN-name-desktop.png` / `components/NN-name-phone.png`: the 50
  individual captures, numbered in catalogue order, refreshed by
  `npm run test:library:ui -- --capture`.
- `render-audit.json`: the render runner's summary for a revision.
- `direction-text-colours.jpg`: before/after of the three direction fixes.

## The catalogue

Billy rejected the earlier library as uniform section cards in different
colours. The catalogue was rebuilt from the original research archive
(`cauldronresearchbackup`), which holds React Bits' categories
(TextAnimations, Backgrounds, Components), OriginKit's component index (text,
interactive, gallery, background, button), ThreeUI's effects and Design Bites'
real-site design files. Following ADR 0001/0002 those were read for
understanding; every piece is our own plain HTML/CSS.

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

The five credited ThreeUI starters remain. The library opens on a **Featured**
set of the strongest pieces.

## How contrast is measured

Not by reading CSS. For every page and every frozen animation frame the runner
takes three real captures of the same frame:

1. the page as it renders;
2. the same frame with all text made transparent — what is actually behind it;
3. the same frame with all text replaced by opaque magenta — a glyph mask.

A pixel counts as glyph only where capture 3 is at least 98% of the page's
maximum coverage, so anti-aliasing fringes are not scored as text (a 13px stroke
read 4.43:1 at a 95% floor and 4.80:1 at its actual colour). Contrast is then
computed per glyph pixel between capture 1 and capture 2, and the 5th percentile
is compared with WCAG: **4.5:1**, or **3:1** for 24px+ text, or 18.66px+ bold.

- **Text-clipped gradients are included.** Their painted background is removed
  before capture 2, so a gradient headline is measured against the page, not
  against itself.
- **Looping animations are sampled at eight evenly spaced frames** (a sheen, a
  drift, a marquee). Worst frame wins.
- **One-shot entrance animations are judged at their settled state.** A 700ms
  fade is not a contrast failure at 12% opacity; the state a person reads is.
- **Faded text is judged, never skipped.** Text painted below the page's full
  opacity (an opacity `0.7` back card, a word under a scrim) is measured at the
  colour it is actually painted, and the failure says how much was painted. This
  is what caught Coverflow's depth-dimmed cards at 3.69–4.42:1.
- **Only text with no painted pixel at all is skipped**, and the count is
  printed: that is text occluded by another element or scrolled out, which is
  not visible text. It is never counted as a pass.
- The marquee has no vignette any more: a fade washes out a pill's own
  background along with the word leaving, which drops the pair to 4:1 at the
  edge.

## What the render runner covers

`npm run test:library:render` — **25 pieces × (their showcase palette + all ten
design directions)**, plus Command Palette and Coverflow as a real site runs
them: 297 rendered pages, 4,527 measured text runs, 4,875 assertions, all
passing.

Per page it checks every visible text run, at 375px it checks for horizontal
overflow, and for the two interactive pieces it drives real input
(`sendInputEvent`) and reads the result:

- palette: a click focuses the combobox, typing "pri" leaves only Pricing and
  hides empty groups, Escape clears and restores all six, "zzz" shows the empty
  message, keywords match ("book" finds Book a call), arrows move
  `aria-selected` and `aria-activedescendant` and wrap, Enter follows the
  active link, `/` focuses from the page;
- coverflow: controls appear, next / left arrow / wrap, a side card comes
  forward without navigating, the centre card follows its link, and a drag with
  the button held advances one project without firing a link;
- both with **JavaScript disabled**: every destination is still a real `href`,
  and no dead control is visible.

It also fails if any piece other than those two ships a script (ADR 0008), or if
one of them ships a fake input or a `href="#"`.

## What the packaged-app runner covers

`npm run test:library:ui` drives the **packaged `Cauldron.app`** over CDP with a
disposable Astro site:

- the category bar is fully visible — `clientHeight >= scrollHeight`, and every
  pill fully inside it — at the supported **1280×800** minimum and at
  **1440×900**;
- every category answers a real mouse click at a point verified with
  `elementFromPoint`, selects, and lists its components;
- Enter on a focused pill selects it, and Tab moves between pills;
- all 25 components open at desktop (960px) and phone (375px).

## Direction colours

Solid Ground, Silver Screen and Open House defined small-text colours below AA
on their own backgrounds (worst: Solid Ground muted 3.06:1, Silver Screen
primary 3.13:1, Open House primary 3.79:1). Darkening primary outright turned
the big fills muddy, so each keeps its vivid primary for fills and gains a
darker `primary-text` of the same hue for small text:

| Direction     | muted                  | primary (fills, unchanged) | primary-text (new) |
| ------------- | ---------------------- | -------------------------- | ------------------ |
| Solid Ground  | `#8b8681` → `#6b6661`  | `#a9714b`                  | `#905a35`          |
| Silver Screen | `#6e7076` → `#5c5e64`  | `#e2401b`                  | `#bd1000`          |
| Open House    | `#6b5744` (already AA) | `#c6621f`                  | `#b25000`          |

Two tokens make text on a primary fill exact rather than approximate:

- `--cauldron-c-on-primary` — black or white, chosen by real contrast ratio. An
  oklch lightness threshold picked the weaker colour, because a saturated hue
  can be bright at a low lightness (Gold Noir and Solid Ground both lost about
  0.3:1 that way).
- `--cauldron-c-primary-solid` — the same fill, moved away from the text colour
  only where _neither_ black nor white clears 4.5:1. Gold Noir's "03" label sat
  at 4.43:1 with no legal text colour; it now sits on a fill that passes.

Sites created before this change keep the colours in their own
`cauldron/tokens.css`; new sites get the fixed ones.

## Defects this audit found in the components

Fixing the measurement surfaced real problems, all fixed:

| Piece                          | Defect                                                       | Measured    |
| ------------------------------ | ------------------------------------------------------------ | ----------- |
| Newsletter footer, Glow action | `surface` on `primary` button labels                         | 4.06–4.21:1 |
| Specular Button                | soft-light sheen swept _through_ the label, lifting the fill | 2.83:1      |
| Aurora Field                   | white type over an unscrimmed bright drift phase             | 1.00:1      |
| Dot Matrix                     | muted subtitle over the dot field                            | 4.00:1      |
| Command Palette                | muted group labels; tinted icon square under the active row  | 3.43:1      |
| Marquee Strip                  | vignette washing out whole pills at the row edge             | 4.00:1      |
| Pricing Ticket                 | gradient lightened the fill under small text                 | 4.48:1      |
| Coverflow                      | centre-card index label on an impossible primary pair        | 4.43:1      |
| Gradient Headline              | light gradient stops on a pale field, worst frame            | 1.30:1      |

## Known cosmetic items

- The packaged-app capture of **Coverflow** crops at the specimen frame's edge.
  The piece's own geometry is verified in the render audit (cards sit at
  106–414px in a 520px frame, nothing outside), so this is a capture-path
  quirk, not a layout defect: the sandboxed specimen iframe paints taller than
  the frame the screenshot is clipped to for that one piece.
- Bento Grid is 2px taller than the 520px frame (padding only).

## Older checks still standing

- **Shiny Sweep** keeps its sheen visible in all 11 palettes (worst frame
  3.86:1, large text needs 3), and both text-clipped headlines pad their
  descenders: a hole test finds 0 missing glyph pixels in every palette, against
  19 with the padding removed.
- **Holo Card** at its worst sheen position across all palettes: body 6.09:1,
  title 5.19:1, chip 5.9:1.
- **The structural test** holds every piece to one bar: plain Astro, design
  tokens, visible focus, multi-column layouts that collapse on phones, motion
  that stops under reduced motion, no placeholder imagery, and an outline
  quick-insert menu that only names real pieces.

## History

- Phone-width clipping in the preview wrapper was fixed, and a placeholder photo
  replaced.
- Colour and type were varied per specimen, so the library stops looking like one
  look repeated.
- The three defects an independent review reproduced on `main` — the
  category bar clipped to 2px, Command Palette and Coverflow static despite
  promising interaction, and Gradient Headline at 1.26:1 on its showcase. The
  old "0 failures" claim did not cover text-clipped gradients; this one does.
