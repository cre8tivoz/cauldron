# Measurements — tickets 27/28 (post-repair run)

Unchanged agreed checks, run through the app's own `qualityRun` (`checkSite`) at the same
thresholds; every failure is kept as measured. Only `output-2` of each pair was measured —
the existing agreement applies the checks to the app-side output. The other output was only
confirmed to build.

Machine-readable copies: `~/.hermes/profiles/claudia/cache/scratch/t27-28-complete/measure/`
(`summary.json`, `A-quality.json`, `B-quality.json`) and
`~/.hermes/profiles/claudia/cache/scratch/t28-resume/measure/B-quality.json` (resumed run).

## Pair A — `output-2`

- Build: `npm run build` passes; three routes (`/`, `/oils`, `/visit`).
- Findings: 446. Failures: 120 — `/` 36, `/oils` 33, `/visit` 51 (3 pages × 3 widths).
- Failed checks: text contrast (axe `color-contrast`), button contrast, spacing off the
  direction scale (e.g. 17px padding), type sizes off scale (26.5625px, 15.9375px), hover
  states, focus reachability/indicator, keyboard reachability (5/7 controls), disabled states
  on `/visit`.
- Distinctive character: real content on all three pages — hero, provenance and process copy,
  three products with tiers/prices/tasting notes, cellar-door details and a front-end enquiry
  form; supplied photography on every page.

## Pair B — `output-2`

- Build: `npm run build` passes; three routes (`/`, `/gallery`, `/contact`).
- Findings: 452. Failures: 52 — `/` 10, `/gallery` 15, `/contact` 27 (3 pages × 3 widths).
- Failed checks: text contrast (axe `color-contrast`, lowest 3.68:1 against 4.5:1; repeated on
  figcaptions and work-index labels), axe `label-content-name-mismatch` on gallery and home
  links, no visible disabled state on three contact controls, focus indicator under 3:1 for one
  unreachable control, missing hover state on one gallery control, keyboard reachability 8/9 on
  home and contact and 11/12 on gallery at 768px.
- Distinctive character: real content on all three pages — oversized split `PeN/tA` wordmark,
  process/manifesto copy, four selected works, a ten-item archive with a working Stills/Video
  filter and poster links for video, studio address, email and a labelled mail-client form;
  fourteen supplied images used; monochrome type-led treatment (the direction's colour signal
  was deliberately omitted per the brief's "no colour accents").
- Run note: built through the app in one Codex run at revision `e99b008`; five source files
  written through `write_source` and the production build passes. The earlier usage-limit
  shell attempt is retained only in scratch (`t27-28-complete/sites/B-cauldron`, with its log
  and measurement report); it is not part of this pair.
