# Starter design directions (Camillo)

**Source:** the latest Open Design, commit `87a4f91`, Apache 2.0. Ten picks for Cauldron's people: creatives, hospitality, trades, health and local business. They're all style packages, not brand-named ones, so there's no trademark question. Every contrast figure is computed from the package's own colour file; every font is SIL Open Font Licence, verified in Google Fonts' official repository.

## The honest picture first

- **The pack is thinner than "151" sounds.** 60 packages have only a short design note, and only 120 colour sets are distinct (up to 7 packages share one).
- **Most generic packages fail Cauldron's taste rules as shipped:** Inter by default, Georgia headings, tired blue or purple accents. That's why every pick below gets Camillo's fixes.
- **As shipped, 4 of the 10 failed the button-text readability check.** After the fixes, all 10 pass.

## The ten, with Cauldron's fixes

| Direction | Package | Suits | Fonts (display / body) | Button colour → contrast | What changed |
|---|---|---|---|---|---|
| **Warm Editorial**: Serif-led magazine look: terracotta on warm paper. Reads as crafted, not corporate. | `warm-editorial` | Cafés, restaurants, florists, writers, small food brands | Fraunces / Source Sans 3 | `#9b5b32` → 5.34:1 | Body font swapped from Inter. Terracotta stays an accent, never a background. |
| **Ink & Paper**: Print-quality paper system: ink-blue on parchment, serif hierarchy. The richest package in the set (22 KB of guidance). | `kami` | Consultants, architects, solo professionals, portfolios, CVs | EB Garamond / Source Serif 4 | `#1b365d` → 11.51:1 | Japanese fonts swapped for a Latin serif pairing for English sites. |
| **Gallery Press**: Print-editorial grid with a confident red and Franklin Gothic/Georgia pairing. | `publication` | Galleries, arts organisations, festivals, magazines, theatres | Archivo / Source Serif 4 | `#c1121f` → 6.22:1 | Franklin Gothic (not free to bundle) swapped for Archivo. Text #0b0b0b is near-black, not pure black, so it's allowed. |
| **Workshop Modern**: Neutral canvas, one vermillion accent, sharp corners, hard shadows: practical and confident. | `tom-modern` | Builders, trades, architects, joiners, design studios | Geist / Geist | `#cf4900` → 4.56:1 | Button accent darkened so white button text passes; the bright orange stays for large decorative use only. |
| **Studio Collage**: Magazine-grade, collage-driven monochrome system: lets imagery carry the colour. | `atelier-zero` | Photographers, artists, creative studios, fashion | Instrument Serif / Instrument Sans | `#111111` → 18.88:1 | Accent matches the text colour, so each site sets its own accent. Helvetica Neue (not web-licensed) swapped. |
| **Midnight Gold**: Dark, monochrome, gold-accented premium look with high-contrast display type. | `luxury` | Wine bars, salons, jewellers, boutique hotels, premium hospitality | Bodoni Moda / Jost | `#c6a15b` → 8.29:1 | Didot and Avenir Next (Apple system fonts, not licensed for websites) swapped for free equivalents. Background is near-black, not pure black, so it's allowed. |
| **Garden Green**: Calm green on warm off-white; the one genuinely 'calm health' palette in the set. | `levels` | Physios, wellness, landscapers, nurseries, health clinics | Young Serif / Figtree | `#2c8742` → 4.51:1 | Green darkened so button text passes. Inter swapped. |
| **Loud & Raw**: Bold borders, vivid rust accent on warm yellow, heavy display type. | `neobrutalism` | Streetwear, music, bars, indie brands, events | Archivo Black / Space Grotesk | `#ce491e` → 4.57:1 | Accent darkened a touch so button text passes. Arial Black swapped for Archivo Black. |
| **Sunny Play**: Lively orange on lemon; playful energy without going childish. | `vibrant` | Childcare, kids' activities, community groups, family cafés | Bricolage Grotesque / Nunito | `#c75300` → 4.5:1 | Orange darkened for buttons and any text. The bright orange stays for large shapes only. Inter swapped. |
| **Night Festival**: Deep night canvas with violet glow; the most atmospheric dark option. | `totality-festival` | Music venues, nightlife, festivals, gig posters | Syne / Manrope | `#c084fc` → 7.43:1 | Inter swapped. Keep it to night and music sites: violet sits close to the purple 'AI look'. |

Text contrast on background is 13.9:1 or better for all ten.

## Left out, and why

- **The blue/purple corporate family** (bento, contemporary, corporate, flat, professional, simple, perspective, modern, expressive, gradient): the tired SaaS look the taste rules ban.
- **Brand-named packages** (Stripe, Airbnb, Starbucks and so on): trademark risk, and they suit big tech rather than small businesses. They stay available as "inspired by" references, not starters.
- **Near-duplicates:** cafe, editorial, elegant, refined, artistic and storytelling share Warm Editorial's colours; friendly, colorful, creative, doodle and energetic share Sunny Play's.
- **Novelty themes** (pacman, tetris, hud, trading-terminal): fun, but not starter material.

Names are Camillo's proposals, for Billy's approval.