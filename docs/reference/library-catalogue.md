# Library catalogue

What ships in the component browser today: 20 pieces in seven categories, plus the five credited starters that stay in **All**.

The source of truth is `src/main/library-pieces.ts` — if this table and the code disagree, the code is right and this table is a bug. Adding a piece means adding a row here in the same pull request.

| Piece                   | Category     | What it is                                                                                                         | Script |
| ----------------------- | ------------ | ------------------------------------------------------------------------------------------------------------------ | ------ |
| **Gradient Headline**   | Text effects | A display headline filled with a slowly drifting multi-colour gradient and a soft glow                             | —      |
| **Shiny Sweep**         | Text effects | A bright sheen sweeps across a headline on an endless loop                                                         | —      |
| **Marquee Strip**       | Text effects | Two counter-scrolling rows — client wordmarks and discipline pills                                                 | —      |
| **Aurora Field**        | Backgrounds  | A dark field with drifting aurora light and a headline over it                                                     | —      |
| **Dot Matrix**          | Backgrounds  | A fading dot grid with a warm glow and a centred statement                                                         | —      |
| **Grain Gradient**      | Backgrounds  | A rich gradient wash with a fine film-grain texture                                                                | —      |
| **Spotlight Card**      | Cards        | A card lit by a soft spotlight, with grain and a gradient border                                                   | —      |
| **Bento Grid**          | Cards        | A bento of mixed-size cells — a stat, a quote, a glow, a list                                                      | —      |
| **Holo Card**           | Cards        | An iridescent holographic card with a moving sheen                                                                 | —      |
| **Masonry Gallery**     | Galleries    | Staggered columns of real prints with captions                                                                     | —      |
| **Coverflow**           | Galleries    | A 3D carousel with perspective tilt and a floor reflection: arrows, swipe or click a side card to bring it forward | yes    |
| **Command Palette**     | Navigation   | A keyboard command menu: type to filter, arrow keys to move, Enter to go, "/" to open it from anywhere             | yes    |
| **Dock Navigation**     | Navigation   | A macOS-style dock of icon tiles on a glass shelf                                                                  | —      |
| **Pill Navigation**     | Navigation   | A floating glass pill with an active indicator                                                                     | —      |
| **Specular Button**     | Buttons      | A button with a gradient edge and a specular shine sweep                                                           | —      |
| **Glow Call to Action** | Buttons      | A pulsing glow around a single decisive button                                                                     | —      |
| **Process Stepper**     | Sections     | A numbered process with a live progress track and a highlighted current step                                       | —      |
| **Stat Band**           | Sections     | Oversized figures in a glowing band with hairline dividers and trend chips                                         | —      |
| **Editorial Hero**      | Sections     | A split hero — kicker, serif headline and actions beside a real photograph                                         | —      |
| **Pricing Ticket**      | Sections     | A perforated ticket-stub price card, not a generic box                                                             | —      |

## Where the gaps are

| Category     | Pieces |
| ------------ | ------ |
| Text effects | 3      |
| Backgrounds  | 3      |
| Cards        | 3      |
| Galleries    | 2      |
| Navigation   | 3      |
| Buttons      | 2      |
| Sections     | 4      |

Galleries (2) and Buttons (2) are the thinnest, and there is no piece yet for pricing, teams, testimonials, process or logos — all common on real small-business sites. A suggestion for any of those is welcome as an issue, no code required.

## How a piece is built

Each one is a single `cataloguePiece(...)` call: plain Astro markup and scoped CSS, built from the site's own tokens. See [../contributing/components.md](../contributing/components.md) for the four rules and how to prove a new one.
