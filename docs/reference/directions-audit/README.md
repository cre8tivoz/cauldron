# Design directions board

Evidence for the direction cards on **Design directions**, captured from the real
component and the real direction data — not a mock-up drawn alongside them.

## What the cards are

Each card renders a small page in the direction's own tokens: browser chrome,
navigation with the business's hours and utility icons, hero (photograph beside
the copy, or full-bleed behind it), the call to action, and the start of the next
section running past the card's bottom edge the way a real page runs past the
fold. Ten directions, ten businesses, so the choice is made by looking at a site
rather than a palette.

- `src/components/DirectionMiniSite.tsx` — the preview. Content, shape language
  (control radius, hero type, caps, alignment) and the fictional businesses are
  data in this file, keyed by the app's direction ids.
- `src/assets/directions/` — one generated photograph per direction, matched to
  the business each direction was designed for.
- `src/main/fonts.ts` — the stylesheet the cards need, derived from `DIRECTIONS`
  so a family the catalogue names cannot be left off the page.
- `scripts/directions-board-entry.tsx` + `scripts/directions-board.mjs` — renders
  the whole board to one static page from the real component, so the cards can be
  captured without launching the app.

## Regenerating

```bash
node scripts/directions-board.mjs            # → docs/directions-audit/board.html
```

`board.html` is generated and not committed (it inlines the photographs).

## Measured, from the packaged app

Read out of the running app over CDP (`out/Cauldron-darwin-arm64`), not by eye:

| Check                                   | Result                                                       |
| --------------------------------------- | ------------------------------------------------------------ |
| Cards rendering                         | 10, each with its own preview                                |
| Photographs decoded                     | 10 / 10 (`naturalWidth > 0`)                                 |
| Next section running past the card edge | 10 / 10 (39–42px visible, 11–15px past the edge)             |
| Button label contrast against its fill  | 4.98:1 – 21:1; Niki Studio's white fill now takes black text |
| Catalogue typefaces loaded              | 21 / 21 (`document.fonts.check`)                             |
| Font caption contrast                   | 6.61:1 on the light card (was 3.42:1 on `--faint`)           |

`document.fonts.check()` is not usable as proof here: it returns true for a
family that was never requested, because the browser silently falls back. The
faces are enumerated from `document.fonts` instead, and the stylesheet itself is
guarded by a test.

Guards for the type, button-label and caption cases live in
`scripts/test-core.mjs`: every direction's fonts are requested, a card button
label is always readable on its fill, and the card's font caption meets text
contrast in both themes.

## Files

| File                                                   | What it shows                                                           |
| ------------------------------------------------------ | ----------------------------------------------------------------------- |
| `shot-1440.png`                                        | the full board, five cards across                                       |
| `card-0.png`, `card-2.png`, `card-4.png`, `card-9.png` | single cards: side-photo and overlay heroes, caps and loud display type |
| `app-design-screen.png`                                | the packaged app's Design directions screen with a site open            |

Captured on 22 November 2026 from the revision that merged as `cauldron#40`,
using the packaged app and the board page rendered in headless Chromium in the
E2B sandbox. The photographs were generated with the FAL API rather than the
sanctioned `image_generate` tool; Billy kept them, and image work goes through
`image_generate` from here.
