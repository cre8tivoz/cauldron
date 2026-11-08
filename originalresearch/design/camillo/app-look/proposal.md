# Cauldron app look: choices for Billy

**My pick: Moss + IBM Plex Sans.** Moss is distinctive without taking over the site being edited; Plex has a little character while staying practical at panel sizes.

## Accent options

One accent at a time, reserved for the selected-element outline, keyboard focus and the single primary button. The two theme values are deliberately different so they hold up against their surroundings.

Ratios below are computed with `python3 contrast.py`, using WCAG relative luminance. Canvas/panel columns are also the focus-ring contrasts because the ring uses the same accent. Button text is white `#FFFFFF` in light mode and near-black `#111214` in dark mode. Figures are rounded to two decimals.

| Choice | Theme | Accent | vs canvas | vs panel | Button text on accent | Focus vs canvas / panel |
|---|---|---|---:|---:|---:|---:|
| **Moss** | Light | `#37643A` | 6.22:1 | 6.89:1 | 6.89:1 | 6.22 / 6.89:1 |
| | Dark | `#9DD89E` | 11.94:1 | 11.38:1 | 11.38:1 | 11.94 / 11.38:1 |
| Cobalt | Light | `#3159A0` | 6.17:1 | 6.85:1 | 6.85:1 | 6.17 / 6.85:1 |
| | Dark | `#A7C1FF` | 10.98:1 | 10.46:1 | 10.46:1 | 10.98 / 10.46:1 |
| Coral | Light | `#A13F33` | 5.78:1 | 6.41:1 | 6.41:1 | 5.78 / 6.41:1 |
| | Dark | `#FFA99A` | 10.67:1 | 10.17:1 | 10.17:1 | 10.67 / 10.17:1 |

Canvas: light `#F3F3F4`, dark `#0B0B0C`. Panel: light `#FFFFFF`, dark `#111214`. All listed focus ratios exceed 3:1; all listed button-text ratios exceed 4.5:1. The selection can sit on arbitrary website colours, so a fixed accent alone cannot guarantee 3:1 there: the real editor needs a contrasting backing or dual outline, checked against the actual page. These numbers do not certify every control or hover state.

## Interface type

1. **IBM Plex Sans, recommended**: crisp, open shapes with a bit more identity than the usual editor UI. [IBM's licence](https://github.com/IBM/plex/blob/master/LICENSE.txt): SIL Open Font License 1.1.
2. **Inter**: the familiar, unobtrusive choice; excellent if Billy prefers the type to disappear. [Creator's licence](https://github.com/rsms/inter/blob/master/LICENSE.txt): SIL Open Font License 1.1.
3. **Source Sans 3**: slightly warmer and open, useful for longer agent replies. [Adobe's licence](https://github.com/adobe-fonts/source-sans/blob/release/LICENSE.md): SIL Open Font License 1.1.

All three permit bundling subject to their licence conditions; ship the relevant copyright and licence notices. The specimen requests Google Fonts, with a system sans-serif fallback if offline. Bundle the chosen font locally in the real app, not via a network request.

## Sizing and behaviour

- Desktop only; minimum **1280 × 800px**. At that width: rail **48px**, agent **400px**, inspector **280px**, preview **552px**. Preview takes the remaining width.
- Top bar **40px**. Standard row **28px**, control **28px**, inspector field spacing **36px**. The sample's bottom comparison strip is review-only, not app chrome.
- Panel type **13px**, secondary text **12px**, uppercase section labels **11px** with **0.08em** tracking. Tabular figures for values. Spacing grid **4px**.
- Control corners **6px**, panel/composer corners **10px**, chips **9999px**. Hairlines **1px**; light `#E6E6E8`, dark `#303136` in the specimen. Dark surfaces `#0B0B0C`, `#111214`, `#17181B`; light `#F3F3F4`, `#FFFFFF`.
- Focus outline **2px**, offset **2px**. Motion, if introduced: **150ms ease-out**, instant under reduced motion. Use one consistent 1.5px icon set in the real app.
- Follow the Mac's light/dark setting by default. The specimen's theme selector exists for comparison, not as a proposed app toolbar.

The workspace arrangement follows Billy's brief and the existing [Mobbin research collection](https://mobbin.com/collections/5d511baf-5e36-4493-8171-e50f80dfaa37/mobile/screens): Lovable's left-hand agent and Lindy's run checklist informed the mock. The centre site is illustrative, not a real live preview; controls other than the appearance selectors and agent picker are visual examples. The specimen is not an accessibility certification or working editor.
