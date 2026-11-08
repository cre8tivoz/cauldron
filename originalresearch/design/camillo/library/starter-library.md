# Starter component library (Camillo)

For Billy's approval. Every licence was checked against the source's own licence file or website on 7 Nov 2026.

## The honest picture first

Of the 11 sources in your note, **only ThreeUI Community ships reusable component code under a licence that lets Cauldron include it** (MIT). Its 48 components are mostly animated and 3D effects, plus three ready-made sections.
The rest split three ways:

- **Design-direction libraries, not components:**
  - **Design Bites:** 295 design notes from real sites, MIT, so it can be bundled. It's another direction source, alongside Open Design.
  - **Gradient Deck:** 1,286 design notes from real sites. It's free and invites you to "copy any site's DESIGN.md into your repo", but there's **no licence or terms page**. So Cauldron offers it as an import the person does into their own site, not something Cauldron ships.
- **Visual inspiration only (no reuse licence or terms page found):**
  - Unsection (5,575 sections from real sites);
  - Lander blocks (Figma blocks);
  - mkdir.directory (a list of 38 galleries);
  - Subframe Motion and Prompt Motion.
- **Guidance for the taste rules, not components:**
  - Superdesign skill (MIT);
  - Stageshow (MIT; its kit is for animated product demos, and its brand icons carry separate licences);
  - OriginKit (the plugin is MIT, but its component catalogue is hosted with separate rights).
  - React Bits stays link-only: its licence forbids redistributing the components.

**So the starter library is mostly Cauldron's own sections**, built in plain Astro and designed from the patterns in your galleries (patterns, never copies). ThreeUI's sections and effects sit on top as optional extras.

**35 picks across 10 categories:** 8 use ThreeUI code (MIT); 27 are Cauldron-authored from pattern references. 29 are plain Astro with no JavaScript; 6 genuinely need interaction.

## Navigation & header

| Pick | Why | Suits | Source | Licence | Plain Astro? |
|---|---|---|---|---|---|
| **Simple bar with one call to action** | The workhorse: logo, 4–5 links, one button. Most small sites need nothing more. | All | https://www.unsection.com | Ours; pattern reference only | Yes. Plain Astro; mobile menu uses <details>, no JavaScript. |
| **Centred logo, split links** | Reads as boutique and editorial without extra cost. | Cafés, salons, galleries, fashion | https://www.unsection.com | Ours; pattern reference only | Yes. Plain Astro. |
| **Full-screen overlay menu** | For image-led sites that want a clean first screen. | Photographers, studios, venues | https://www.unsection.com | Ours; pattern reference only | Yes. Plain Astro with <details>; focus-trapped when open. |

## Hero & intro

| Pick | Why | Suits | Source | Licence | Plain Astro? |
|---|---|---|---|---|---|
| **Editorial intro section** | A real, licence-clean section from ThreeUI: a strong editorial opening. | Studios, writers, arts organisations | `references/source/threeui/src/shaders/section-elements/SectionElements.tsx` | Code allowed: MIT (ThreeUI) | Yes. Export EditorialIntroSection. Convert to plain Astro: it's layout and type only. |
| **Split: headline + photo** | The most useful hero for service businesses: what you do, a photo, a button. | Trades, health, hospitality, local services | https://www.unsection.com | Ours; pattern reference only | Yes. Plain Astro. |
| **Full-bleed photo with overlaid headline** | Image-first; lets the photography sell. | Cafés, venues, accommodation, photographers | https://blocks.lander.studio/?category=website | Ours; pattern reference only | Yes. Plain Astro; overlay contrast enforced by the taste tests. |
| **Big type statement** | Type-only hero for brands with a strong voice. | Studios, consultants, music, streetwear | https://www.unsection.com | Ours; pattern reference only | Yes. Plain Astro. |
| **Hero with booking/enquiry call to action** | Puts the money action (book, quote, call) first. | Salons, physios, trades, restaurants | https://www.unsection.com | Ours; pattern reference only | Yes. Plain Astro; links to the site's own booking tool. |

## Proof

| Pick | Why | Suits | Source | Licence | Plain Astro? |
|---|---|---|---|---|---|
| **Testimonial wall** | Social proof without carousels nobody clicks. | All | https://www.unsection.com | Ours; pattern reference only | Yes. Plain Astro. ThreeUI's testimonial illustration SVGs (section-elements/assets) are MIT and may be reused. |
| **Client/partner logo strip** | Quick credibility for B2B-ish small businesses. | Studios, consultants, trades (supplier logos) | https://www.unsection.com | Ours; pattern reference only | Yes. Plain Astro; logos are the site owner's responsibility. |
| **Stats row** | Numbers that matter: years, jobs done, rating. | Trades, health, services | https://www.unsection.com | Ours; pattern reference only | Yes. Plain Astro; tabular numbers. |
| **Review summary with star rating** | Mirrors how locals actually choose (ratings). | Cafés, trades, health, hospitality | https://www.unsection.com | Ours; pattern reference only | Yes. Plain Astro; static content, no third-party widget. |

## Features & services

| Pick | Why | Suits | Source | Licence | Plain Astro? |
|---|---|---|---|---|---|
| **Services grid (flat, no cards-in-cards)** | Clear list of what you offer, scannable. | Trades, health, services | https://www.unsection.com | Ours; pattern reference only | Yes. Plain Astro. |
| **Alternating image and text rows** | Room to explain each service with a photo. | Studios, health, hospitality | https://blocks.lander.studio/?category=website | Ours; pattern reference only | Yes. Plain Astro. |
| **How it works: 3–4 steps** | Removes fear for first-time customers. | Trades, health, consultants | https://www.unsection.com | Ours; pattern reference only | Yes. Plain Astro. |

## Showcase & portfolio

| Pick | Why | Suits | Source | Licence | Plain Astro? |
|---|---|---|---|---|---|
| **Masonry photo gallery** | Portfolio staple; pure CSS columns. | Photographers, artists, venues, trades (job photos) | https://www.unsection.com | Ours; pattern reference only | Yes. Plain Astro; Astro image optimisation. |
| **Project/case grid** | Work with titles and short outcomes. | Studios, architects, builders | https://www.unsection.com | Ours; pattern reference only | Yes. Plain Astro; can read from a content collection. |
| **Before/after slider** | Proves results instantly. | Trades, renovators, salons, landscapers | https://www.unsection.com | Ours; pattern reference only | Needs a small script: Needs interaction: small script (range input). Keyboard accessible. |
| **Animated WebGL gallery** | A showpiece moment for image-led sites. | Photographers, galleries, fashion | `references/source/threeui/src/shaders/gallery/Gallery.tsx` | Code allowed: MIT (ThreeUI) | Needs a small script: React island with three.js. Bundle three.js locally; respects reduced motion; optional accent, never required. |

## Content

| Pick | Why | Suits | Source | Licence | Plain Astro? |
|---|---|---|---|---|---|
| **Blog/news list** | Reads the site's Astro content collection. | All with news or blog | https://www.unsection.com | Ours; pattern reference only | Yes. Plain Astro. |
| **Article layout** | Comfortable long-form reading. | Writers, cafés with stories, clinics with advice | https://www.unsection.com | Ours; pattern reference only | Yes. Plain Astro. |
| **FAQ** | Answers the phone calls before they happen. | Trades, health, hospitality | https://www.unsection.com | Ours; pattern reference only | Yes. Plain Astro with <details>, no JavaScript. |

## Pricing & booking

| Pick | Why | Suits | Source | Licence | Plain Astro? |
|---|---|---|---|---|---|
| **Pricing tiers** | Simple package comparison. | Studios, consultants, trades packages | https://www.unsection.com | Ours; pattern reference only | Yes. Plain Astro. |
| **Menu / price list** | Food menus and service price lists, dotted leaders. | Cafés, restaurants, salons, barbers | https://blocks.lander.studio/?category=website | Ours; pattern reference only | Yes. Plain Astro; can read from a content collection. |
| **Opening hours + booking link** | The two things locals look for. | Cafés, clinics, shops | https://www.unsection.com | Ours; pattern reference only | Yes. Plain Astro. |

## Contact & location

| Pick | Why | Suits | Source | Licence | Plain Astro? |
|---|---|---|---|---|---|
| **Contact / quote form** | The conversion point for service sites. | All | https://www.unsection.com | Ours; pattern reference only | Yes. Plain Astro form; where it sends (email service, form provider) is a per-site setting. |
| **Address, map link and directions** | Finds the shop; no heavy map embed by default. | Shops, cafés, clinics | https://www.unsection.com | Ours; pattern reference only | Yes. Plain Astro; static map image with a link out. |
| **Contact details card** | Phone, email, ABN, socials, service area. | Trades, sole traders | https://www.unsection.com | Ours; pattern reference only | Yes. Plain Astro; Australian fields (ABN, service area) included. |

## Footer

| Pick | Why | Suits | Source | Licence | Plain Astro? |
|---|---|---|---|---|---|
| **Simple footer** | Links, contact, legal. | All | https://www.unsection.com | Ours; pattern reference only | Yes. Plain Astro. |
| **Newsletter footer** | Real, licence-clean section from ThreeUI. | Cafés, studios, shops | `references/source/threeui/src/shaders/section-elements/SectionElements.tsx` | Code allowed: MIT (ThreeUI) | Yes. Export NewsletterFooterSection; uses React state for the form, so convert to plain Astro with a normal form post. |

## Motion & effects accents

| Pick | Why | Suits | Source | Licence | Plain Astro? |
|---|---|---|---|---|---|
| **Glowing call-to-action button** | Premium button moment. | Studios, venues, launches | `references/source/threeui/src/shaders/lumen-cta/LumenCta.tsx` | Code allowed: MIT (ThreeUI) | Yes. CSS-driven; convert to Astro. Replace its Google Fonts request with the site's fonts. |
| **Heading text-decode reveal** | Subtle editorial motion on headings. | Studios, tech-leaning creatives, festivals | `references/source/threeui/src/shaders/article-headings/ArticleHeadings.tsx` | Code allowed: MIT (ThreeUI) | Needs a small script: Small script; off under reduced motion. |
| **Ribbon field background** | Atmospheric hero background. | Music, festivals, nightlife | `references/source/threeui/src/shaders/ribbon-field/RibbonFieldBackground.tsx` | Code allowed: MIT (ThreeUI) | Needs a small script: WebGL shader; reduced-motion fallback to a still frame. |
| **Woven cloth texture (atelier / washi)** | Tactile, crafted backdrop. | Fashion, craft, florists, boutiques | `references/source/threeui/src/shaders/woven-cloth/WovenCloth.tsx` | Code allowed: MIT (ThreeUI) | Needs a small script: Loads three.js from a CDN: bundle it locally instead. |
| **Spark badge** | Small 'new' or 'open now' highlight. | Cafés, shops, events | `references/source/threeui/src/shaders/spark-badge/SparkBadge.tsx` | Code allowed: MIT (ThreeUI) | Needs a small script: Tiny accent; off under reduced motion. |

## Left out, and why

- **React Bits:** its licence forbids redistributing the components, even as ported versions. Link only.
- **Most of ThreeUI's 48 effects:** novelty 3D scenes (temple, koi, bookshelf, CRT and so on) don't suit small-business sites, so only the effects above are in the starter set.
- **Anything from Unsection or Lander as copied code or images:** no reuse terms found. They inform the patterns only.

## Conditions for the ThreeUI pieces

- Keep ThreeUI's MIT notice and font licences (SIL OFL) with them.
- Bundle three.js and fonts locally. Two effects currently load from a CDN or Google Fonts.
- Every effect must stop under "reduce motion" and pass the taste tests in `design/camillo/taste-tests.md`.