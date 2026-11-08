# Contrast-threshold correction + measurement probe

## Fix (src/main/directions.ts)

- `DESIGN.md` text/button rows now classify on the **raw** `contrastRatio`, not `round1`.
- Thresholds use existing `TEXT_CONTRAST` (4.5), `LARGE_TEXT_CONTRAST` (3), `BUTTON_CONTRAST` (4.5) from `contrast.ts`. No new limits.
- Three classes: `>=4.5` small text and above; `>=3` large text only; `<3` "decorative fills only, no text".
- Button labels require raw `>=4.5`, even when the rounded display says 4.5.
- Prose updated: large text may use 3:1 _or better_; sub-3 colours are never text.

## Evidence

- Synthetic pair `#777777` on `#ffffff` = 4.4781 → displayed 4.5: rows now say **large text only**, buttons **not for button labels**.
- `#959595` on white = 2.9953 → displayed 3.0: row now says **decorative fills only, no text**.
- Regression test added in `scripts/test-core.mjs`; existing direction-table test now asserts on raw ratios.
- `node scripts/test-core.mjs` and `npm run check` pass (exit 0).

## Local measurement (one frozen site, no model)

- Packaged current tree (`npm run package`), then ran the **existing** `runQualityTest` (`CAULDRON_QUALITY_TEST=1`) against a disposable copy of the saved Moretti source; userData isolated.
- Result: **15/15 checks passed**, 250 findings, 30 failures (all type/spacing off the direction scale). Focus/keyboard is deterministic: "0 without an indicator, 0 under 3:1, 0 control(s) not reached". Axe: no WCAG 2.1 AA violations. Text contrast lowest 4.7:1, buttons lowest 5.1:1.
- Caveat: the harness sets `long-lunch` before measuring, so contrast figures reflect that direction's tokens, not `open-house`. This proves the new measurement code executes end-to-end without crashing or keyboard double-counting; it does **not** claim the old site is fixed. Duplicate-id namespacing is covered by the passing unit test, not exposed by this harness output.

## Next-proof direction recommendation

Use **The Edit** (`the-edit`) for the Moretti proof. It is the starter's genuinely editorial option: white/ink, Playfair Display + Jost, tall images, tight grids, small-caps labels, generous white space — matching "editorial and provenance-led, warm and grown-up" better than reusing honey/amber `open-house`. Long Lunch is warmer but reads as café/hospitality (terracotta, Fraunces), not modern clean editorial. No new direction and no change to production selection behaviour.
