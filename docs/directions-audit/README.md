# Design directions board

Evidence for the direction cards on **Design directions**, captured from the real
component and the real direction data — not a mock-up drawn alongside them.

## What the cards are

Each card renders a small page in the direction's own tokens: browser chrome,
navigation with hours and utility icons, hero (photograph beside the copy, or
full-bleed behind it), the call to action, and the start of the next section cut
off by the card edge. Ten directions, ten different businesses, so the choice is
made by looking at a site rather than a palette.

- `src/components/DirectionMiniSite.tsx` — the preview. Content, shape language
  (control radius, hero type, caps, alignment) and the fictional businesses are
  data in this file, keyed by the app's direction ids.
- `src/assets/directions/` — one generated photograph per direction, matched to
  the business each direction was designed for.
- `scripts/directions-board-entry.tsx` + `scripts/directions-board.mjs` — renders
  the whole board to one static page from the real component, so the cards can be
  captured without launching the app.

## Regenerating

```bash
node scripts/directions-board.mjs            # → docs/directions-audit/board.html
```

`board.html` is generated and not committed (it inlines the photographs).

## Files

| File                                                   | What it shows                                                           |
| ------------------------------------------------------ | ----------------------------------------------------------------------- |
| `shot-1440.png`                                        | the full board, five cards across                                       |
| `card-0.png`, `card-2.png`, `card-4.png`, `card-9.png` | single cards: side-photo and overlay heroes, caps and loud display type |
| `app-design-screen.png`                                | the packaged app's Design directions screen with a site open            |

Captured on 22 November 2026 from the packaged `Cauldron.app` and from the board
page rendered in headless Chromium in the E2B sandbox.
