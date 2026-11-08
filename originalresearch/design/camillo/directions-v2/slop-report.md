# Automated slop check

Static token and source checks; not computed browser styles. WCAG contrast uses unrounded sRGB ratios.

| Direction | body / bg | body / surface | muted / bg | muted / surface | large / bg | button | Result |
|---|---:|---:|---:|---:|---:|---:|---|
| Long Lunch | 13.39:1 | 11.66:1 | 7.80:1 | 6.79:1 | 13.39:1 | 8.11:1 | PASS |
| Solid Ground | 12.09:1 | 13.66:1 | 6.55:1 | 7.40:1 | 12.09:1 | 9.22:1 | PASS |
| Good Measure | 11.06:1 | 12.26:1 | 7.14:1 | 7.92:1 | 11.06:1 | 7.98:1 | PASS |
| Soft Ritual | 11.97:1 | 13.21:1 | 7.09:1 | 7.82:1 | 11.97:1 | 8.48:1 | PASS |
| Big Idea | 10.37:1 | 12.35:1 | 6.26:1 | 7.46:1 | 10.37:1 | 11.87:1 | PASS |
| Quiet Frame | 13.73:1 | 15.27:1 | 7.04:1 | 7.84:1 | 13.73:1 | 8.25:1 | PASS |
| Open House | 13.14:1 | 14.96:1 | 6.81:1 | 7.75:1 | 13.14:1 | 8.98:1 | PASS |
| The Edit | 13.52:1 | 14.98:1 | 7.10:1 | 7.87:1 | 13.52:1 | 9.04:1 | PASS |
| Little Neighbours | 9.85:1 | 11.21:1 | 6.37:1 | 7.24:1 | 9.85:1 | 8.23:1 | PASS |
| After Hours | 14.47:1 | 10.88:1 | 11.04:1 | 8.30:1 | 14.47:1 | 12.22:1 | PASS |

## Source checks

- Directions present: 10; unique: 10; expected: 10.
- Banned chosen fonts in CSS/font declarations: none.
- Pure black literal in HTML/CSS: none.
- Banned accent literal in HTML/CSS: none.
- Blue–purple or unresolved gradients in stylesheet: none.
- Nested card/panel/tile class names: none. This heuristic does not compute actual borders, shadows or radius.

## Scope and limitations

Ratios test token pairs used by the preview: primary and muted text on both page and surface, large text on page, and action text on accent. Alternate light theme is checked if supplied. They do not prove every rendered text node or background: no browser, inherited styles, compositing, focus indicator, font loading, overflow, mobile layout or manual AI-look review is assessed. The source scan does not recognise every colour syntax, computed CSS, dynamically injected style, or every form of nesting. A passing report is not a pass of taste tests 4.1 and 4.2.
