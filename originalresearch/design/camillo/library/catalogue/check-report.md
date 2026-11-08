# Catalogue static check

- PASS: **All 35 ids exactly once** — 35/35 exact matches
- PASS: **Each piece has a heading** — 35/35; hidden semantic headings count for navigation
- PASS: **No banned fonts in CSS** — []
- PASS: **No pure black** — CSS scan
- PASS: **No blue–purple gradients** — 8 gradients scanned for hex stops; 0 flagged
- PASS: **Declared body colour pairs >= 4.5:1** — #1E1C19/#F7F5F0: 15.60:1; #1E1C19/#ffffff: 17.00:1; #F7F5F0/#1E1C19: 15.60:1; #F7F5F0/#574238: 8.60:1; #A13F33/#F7F5F0: 5.89:1; #A13F33/#ffffff: 6.41:1
- PASS: **No detectable nested card classes** — DOM class=card nesting only; visual card treatments need human/computed-style review
- PASS: **Reduced motion rule present** — Static presence check only

Scope: static source inspection, not a browser render, axe audit, complete computed-colour audit, or keyboard test. Contrast checks cover declared text/background pairs, not every computed pixel; decorative illustrations and maps are excluded. Gradient detection covers literal hex stops. Nested-card check detects only explicit `card` class nesting.
