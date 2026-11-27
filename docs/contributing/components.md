# Building a component

The component library is where a contribution lands deepest. This page is the whole job: what a piece is, the four rules it has to meet, a worked example, and how to prove it before you send it.

If you'd rather not write code, you don't have to — open a **Component suggestion** issue with a screenshot or a link to a real site and it can still happen. This page is for when you want to do the build yourself.

## What a piece is

Every piece is one call in `src/main/library-pieces.ts`:

```ts
cataloguePiece(
  id, // kebab-case, unique: 'stat-row'
  name, // what the library shows: 'Stat Row'
  category, // one of the seven real categories
  description, // one sentence, sentence case, no full stop needed
  markup, // HTML as a template string
  styles, // CSS as a template string
  script, // optional, plain DOM, no imports
);
```

The function does the fiddly parts for you: it prefixes every class and rule with `.cauldron-<id>` so your piece cannot collide with another, doubles the prefix for specificity, adds the shared typography/motion/box-sizing base and a visible focus ring, and assembles the finished plain-Astro file (`<section>`, scoped `<style>`, optional `<script>`). You write markup and CSS; it writes the catalogue entry.

The result is copied into the person's site as an ordinary `.astro` file. It has no dependency on Cauldron and no build step of its own — that is [ADR 0007](../adr/0007-library-components-are-copied-into-the-site.md).

Put your piece in the block for its category, keeping the existing order, with a short `//` comment only where the CSS does something surprising.

## The four rules

A piece that breaks one of these will be measured and rejected — not because of taste, because the harness fails it.

**1. Plain Astro, and it works with JavaScript off.** Markup and CSS only, unless interaction _is_ the point (a command palette, a coverflow). Even then, the content must be in the HTML, and anything that needs the script must start hidden rather than flashing wrong. No imports, no frameworks, no `type="module"` CDN scripts.

**2. Text clears contrast against the site's own tokens.** Body text at 4.5:1, large text (24px, or 700 weight at 18.66px and up) at 3:1, focus indicators at 3:1. Never hard-code a colour: use the direction's tokens (`--cauldron-c-bg`, `--cauldron-c-surface`, `--cauldron-c-ink`, `--cauldron-c-muted`, `--cauldron-c-primary`, `--cauldron-c-primary-text`, `--cauldron-c-accent`) so the piece survives all ten design directions. Where a token may be missing, give a fallback with `var(--token, ...)`.

**3. No one-sided coloured accent bars.** A solid bar of 2px or more down one edge of a card, callout or row, with no matching edge, is out — it is the single most recognisable sign of a template. Use an even border, a tinted background, or a full-width rule. Hairlines, dashed tear lines and even borders are all fine.

**4. Use the scales, and respect motion preferences.** Spacing and type come from the token scales (`--cauldron-space-*`, `--cauldron-size-*`); display type uses `--cauldron-font-display`. An animation runs as normal, and `@media (prefers-reduced-motion: reduce)` turns it off and leaves the settled state — never the other way round. Any layout with more than one column must collapse at phone width.

Two more that aren't measured but matter: **no emoji in place of icons**, and **don't nest cards in cards** — pick one surface.

## A worked example

A pull quote — one sentence, a name, a hairline rule. Nothing in the catalogue does this yet, and it needs no script, no accent colour and no motion, which makes it a good first piece.

```ts
cataloguePiece(
  'pull-quote',
  'Pull Quote',
  'Sections',
  'One sentence from a client, with their name under it',
  `<figure class="pq-wrap">
  <blockquote class="pq-quote">They rebuilt the menu in an afternoon and the room has not been quiet since.</blockquote>
  <figcaption class="pq-caption">Marco Dell'Aqua, Sunday Table</figcaption>
</figure>`,
  `.cauldron-pull-quote { background: var(--cauldron-c-bg); color: var(--cauldron-c-ink); padding: var(--cauldron-space-8) var(--cauldron-space-6); }
.cauldron-pull-quote .pq-wrap { max-width: 760px; margin: 0 auto; padding-top: var(--cauldron-space-6); border-top: 1px solid color-mix(in srgb, var(--cauldron-c-ink) 18%, transparent); }
.cauldron-pull-quote .pq-quote { font-family: var(--cauldron-font-display); font-size: var(--cauldron-size-6); line-height: 1.2; margin: 0 0 var(--cauldron-space-4); }
.cauldron-pull-quote .pq-caption { font-size: var(--cauldron-size-2); letter-spacing: 0.06em; text-transform: uppercase; color: var(--cauldron-c-muted); }`,
);
```

It passes every direction because it uses `--cauldron-c-ink` for the quote and `--cauldron-c-muted` for the caption, both of which each direction has already balanced against its own background. The rule at the top is a `color-mix` of the ink so it follows the direction instead of being a fixed grey.

The moment you reach for `--cauldron-c-primary` as a text colour, use `--cauldron-c-primary-text` with the primary as a fallback — `var(--cauldron-c-primary-text, var(--cauldron-c-primary))`. That token exists because on a direction with a pale primary, painted primary text is unreadable; the fallback keeps the piece working on sites whose tokens predate it. This is the difference between a piece that passes in all ten directions and one that only looks right in three.

## Proving it

```bash
npm run test:library:render            # measures real pixels: contrast, overflow, keyboard, JS-off
npm run test:library:render -- --only=stat-row   # just yours, while you work
npm run package && npm run test:library:ui       # the real packaged app's component browser
```

`test:library:render` renders every piece, starters and catalogue, in its showcase palette and in all ten directions. It measures contrast on actual glyph pixels at eight frozen animation frames, checks for horizontal overflow at 375px, exercises interactive pieces with real keyboard and mouse input, and checks the JavaScript-off fallback. If your piece is wrong, this is the thing that says so.

Once it passes, refresh the evidence:

```bash
npm run test:library:render -- --write
```

That updates `docs/reference/library-audit/render-audit.json`, which is the record of the whole catalogue being held to the bar. Commit it with your piece.

## Licensing and credit

Everything in the catalogue today is Cauldron's own plain HTML/CSS, written from the taste rules. If you take code from somewhere, it must be MIT or equally permissive: read the licence first, never take names, logos or assets, and record it in `THIRD_PARTY_NOTICES.md`. If you're adapting a _look_ you saw somewhere, credit it as a reference in the piece's description rather than pretending it's original. [ADR 0002](../adr/0002-studied-code-is-reference-not-source.md) covers the reasoning.

## The rejection list

Fastest way to have a piece sent back:

- a script that the content needs to exist at all;
- hard-coded colours, or a palette baked in instead of the direction's tokens;
- text that only clears 4.5:1 against the palette you happened to be looking at;
- a 2px+ coloured bar down one edge;
- animation with no reduced-motion state;
- placeholder imagery, lorem ipsum, or an emoji standing in for an icon;
- three columns that don't collapse on a phone;
- a second card inside a card.

None of these are opinions — each one is a defect that shipped in an earlier version of the catalogue.

They are not all caught the same way. `test:library:render` measures contrast on real glyph pixels, horizontal overflow at 375px, keyboard and mouse interaction, and the JavaScript-off fallback. `npm run check` catches hard-coded colours in a few structural ways, and its token rules cover the pieces it knows about. The rest — placeholder copy, emoji standing in for icons, a card inside a card, three columns that do not collapse — are **reviewed by eye**, so a green harness is not a green light. Expect a maintainer to say so in review, and say what you checked yourself in the pull request.
