# Quality checks on a generated site

This is what Cauldron measures when you run Quality on a site. The code lives in `src/main/quality.ts` (page and site findings), `src/main/taste-check.ts` (the taste pass), `src/main/contrast.ts` (contrast maths) and `src/main/seo.ts` (SEO findings). Findings are `pass`, `fail`, `unknown` (a check could not run) or `info` (an opinion).

Each page is checked at 375, 768 and 1280px. Per-width findings carry the width in the id; structure and SEO checks use the 1280px pass. Findings about an agent run's own output are labelled "Agent changes:" and use `taste-change-*` ids, so they cannot collide with the whole-site rows.

Thresholds below are the ones in the source. Where the code records a number but does not set a pass bar, this page says so.

## The contrast bars

`src/main/contrast.ts` exports four constants. A large text node is one with `fontSize >= 24`, or `fontWeight >= 700` and `fontSize >= 18.66`.

| Constant              | Value | Applies to                                        |
| --------------------- | ----- | ------------------------------------------------- |
| `TEXT_CONTRAST`       | 4.5:1 | Body text                                         |
| `LARGE_TEXT_CONTRAST` | 3:1   | Large text                                        |
| `BUTTON_CONTRAST`     | 4.5:1 | Button labels                                     |
| `FOCUS_CONTRAST`      | 3:1   | Keyboard focus indicator against its surroundings |

Ratios are computed from parsed hex, `rgb()/rgba()`, `hsl()/hsla()` or the small set of named colours. Translucent colours are painted over the colour behind them first. If a colour cannot be parsed, the ratio is 0.

## Page and site findings

Pass conditions in this table are exact: the code compares counts to zero unless it says otherwise.

| Check                              | What it measures                                         | Pass condition                                                                                                          | Why it matters                                                            |
| ---------------------------------- | -------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| The site builds                    | The Astro build result                                   | Build succeeds; otherwise the finding fails with the log tail                                                           | There is nothing to review if the build is broken                         |
| The page loads                     | A probe response at each width                           | Probe returns data                                                                                                      | Without it, every other check on that width is skipped                    |
| No horizontal overflow             | `scrollWidth` against `clientWidth`                      | Fails when scroll width exceeds client width by more than 2px                                                           | Sideways scroll on a phone is a real layout fault                         |
| Fonts were ready before measuring  | `document.fonts.status` on the 1280px pass               | `loaded`; otherwise `unknown`, not a pass                                                                               | Text size, spacing and contrast may have been measured on a fallback font |
| Text has enough contrast           | Sampled text nodes from `h1`–`h6`, `p`, `button` and `a` | Every sample meets its 4.5:1 or 3:1 threshold; detail reports the lowest ratio                                          | Small pale text is the most common measured failure                       |
| Button text has enough contrast    | Sampled button nodes                                     | Every button label reaches 4.5:1; "No buttons" is a pass                                                                | A tinted fill can still fail against its label                            |
| Automated accessibility (axe)      | axe rules against WCAG 2.1 A and AA                      | Zero violations; `unknown` if axe cannot run                                                                            | Catches a broad class of markup and ARIA faults                           |
| Images have alternative text       | Images with no `alt` attribute                           | Count is zero                                                                                                           | Missing alt is a concrete, fixable fault                                  |
| Form fields are labelled           | Fields with no label                                     | Count is zero                                                                                                           | Unlabelled fields are unusable with a screen reader                       |
| Headings are in order              | `h1` count and heading levels in DOM order               | Exactly one `h1`, and no level jumps by more than one                                                                   | A skipped level breaks the document outline                               |
| The page says what language it is  | `lang` on `<html>` and a `<main>` landmark               | Both present                                                                                                            | Assistive tech and landmarks need both                                    |
| Buttons and links say what they do | Controls with no accessible name                         | Count is zero                                                                                                           | A nameless control cannot be announced                                    |
| The hierarchy is clear             | Visible computed heading sizes by level versus body size | Only when a direction is supplied: sizes step down strictly by level, and the smallest heading is larger than body text | Size ordering is the visible half of hierarchy                            |
| Internal links work                | Each distinct same-origin link, first 60                 | Every fetch returns under HTTP 400                                                                                      | Broken internal links are easy to miss by eye                             |
| Every page has a title             | Non-empty `<title>` from the built page                  | No page has an empty title                                                                                              | Basic SEO and tab identity                                                |
| Every page has a description       | Meta description length                                  | Non-empty and at most 160 characters (`SEO_DESCRIPTION_MAX`)                                                            | Search snippets need a bounded description                                |
| Share images have alternative text | `og:image:alt` where `og:image` is set                   | Every page with a share image has alt text                                                                              | Shared cards need the same alt discipline as page images                  |

Load time, script count and HTML size are also recorded as measured values per page and width. The code records no pass threshold for them, so they are not findings.

## Taste findings

`measureTaste` runs on the rendered page when a design direction is chosen. Most findings pass when the violation count is zero.

| Check                                        | What it measures                                                                  | Pass condition or threshold                                                                                    | Why it matters                                                                         |
| -------------------------------------------- | --------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| No unchosen default fonts                    | First computed font family of `h1`–`h6`, `p`, `button`, `a`                       | Must be the direction's display or body family; Inter, Roboto, Arial and system-ui are flagged when not chosen | Default fonts undo the chosen direction                                                |
| No pure black                                | Pure black text or a large black fill                                             | None, unless the direction names pure black (then the failure is waived and an opinion is added)               | Harsh contrast on large areas                                                          |
| No cards inside cards                        | Rounded, bordered or shadowed boxes nested inside another such box                | Zero                                                                                                           | Nested cards read as generated UI                                                      |
| No side stripes                              | Solid one-sided left/right bars of 2px or more, or the inset-shadow equivalent    | Zero                                                                                                           | The even border or tinted box is preferred; hairlines and dashed rules are not stripes |
| No tired blue-purple gradients               | Gradient stops in the blue-purple hue range 210–290                               | Zero, unless the direction names two or more blue-purple colours                                               | The default SaaS look                                                                  |
| No unchosen generic SaaS accents             | Five known blue/purple accent colours                                             | Zero when the colour is not in the direction's palette                                                         | Stops an off-palette highlight slipping in                                             |
| First fonts match the direction              | Computed first font family                                                        | Matches display or body family                                                                                 | Pairs with the default-font check                                                      |
| Colours follow the direction                 | Computed `color` and `background-color`                                           | Value is in the direction palette, or a `color-mix()` that references a `--cauldron-*` token                   | Keeps the site on its own tokens                                                       |
| Spacing, type and radii follow the direction | Computed margins, padding, gaps, font sizes and corner radii                      | Each value within 0.6px of a scale token                                                                       | Small drift is tolerated; larger drift fails                                           |
| Tokens rather than hard-coded values         | Declarations of colour, border colour, margin, padding or gap on matched elements | At most 5% of those declarations may be hard-coded (`hardcoded / declarations > 0.05` fails)                   | Hard-coded values stop the direction from applying                                     |
| No emoji used as interface icons             | Emoji in `button`, `nav` and `li` text                                            | Zero; Unicode arrows U+2190–U+21FF are excluded                                                                | Typographic arrows are punctuation, not icons                                          |
| Labels are not truncated                     | `text-overflow: ellipsis` or overflowing scroll width on `button` and `nav a`     | Zero                                                                                                           | A cut-off label hides the action                                                       |
| Interactive parts can be reached by keyboard | Real Tab presses over focusable controls                                          | Every audited control is reached                                                                               | Unreachable controls are a keyboard failure                                            |
| Focus is visible on controls                 | Focus indicator after Tab                                                         | Every reached control has one; alpha below 0.5 counts as missing                                               | A ring that is absent fails here                                                       |
| Focus indicator is visible at 3:1 or better  | Same sample, judged against the page behind it (or the parent when offset)        | 3:1; weaker rings fail with the measured ratio                                                                 | Presence alone was the old false pass                                                  |
| Controls have a visible hover state          | Computed style signature before and after forced `:hover`                         | Signature must change                                                                                          | Selected and pressed states do not excuse a missing hover                              |
| Controls have a visible disabled state       | Same signature with `disabled` applied, where supported                           | Must differ from resting style when the control has a disabled state                                           | Disabled is not the same as resting                                                    |
| Motion respects reduced-motion               | Animation and transition durations with reduced motion emulated                   | No duration above 0.01s                                                                                        | Respect the user's setting                                                             |

The hover/disabled signature covers the control and up to its first 40 descendants, across `color`, `backgroundColor`, `borderColor`, `boxShadow`, `outline`, `textDecoration`, `textDecorationThickness`, `textUnderlineOffset`, `opacity`, `transform` and `filter`. The focus and hover probes use forced pseudo-states and synthetic Tab events; details name the controls that failed.

`checkSite` passes `includeContrast: false` to the taste pass because it has already done its own text and button contrast pass. The taste pass does the rest. A pure-black or blue-purple direction gets an extra `info` opinion once per page, at the desktop width, saying the choice is deliberate but risky.

## Reading a report

- `info` rows are opinions, not failures. Read them; do not count them as defects.
- `unknown` means the check could not run. It is not a pass.
- Details name the page, often the width, and usually the element or control. Start there rather than at the status column.
- A control that cannot be reached by Tab is counted by `keyboard`, not by `focus`. The code separates the two on purpose.
- Direction exceptions are narrow: pure black is waived when the direction names it, and blue-purple gradients are waived when the direction names two or more blue-purple colours. Both get an `info` opinion. Nothing else in the taste table is waived.

## What the checks cannot catch

- **Overall "AI look" is a person's call.** The code says so explicitly and reports it as `info`, not a measurement. Look at the built page yourself.
- **axe is automated WCAG 2.1 A and AA.** It does not replace screen-reader or manual keyboard testing. The focus checks use forced pseudo-states and synthetic Tab presses, so assistive-technology behaviour is outside their scope.
- **Contrast sampling is limited.** The dedicated contrast pass samples text in headings, paragraphs, buttons and links only. The background walk skips gradients. Focus rings with alpha below 0.5 are treated as missing rather than measured.
- **Taste thresholds are deliberately loose in places.** Spacing, type and radius use a 0.6px tolerance; up to 5% of the scanned declarations can be hard-coded; a side stripe must be at least 2px on a box at least 16px tall; emoji and truncated-label checks look only at specific element types.
- **SEO is three fields.** Title, description length and share-image alt. Nothing here checks canonical tags, keywords, structured data or schema.
- **The link check fetches the first 60 distinct internal links** and judges HTTP status only. It does not check link text, external links or what the target page says.
- **A check that cannot run is reported as `unknown`,** never silently as a pass. That includes fonts not finishing within five seconds, a failed probe, or axe throwing. Read the detail before calling a report clean.
- **Measurements are of built output at three widths.** Source files, editor behaviour and anything outside those widths are not covered by these checks.
