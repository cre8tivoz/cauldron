import { DIRECTIONS } from './directions';

/**
 * The faces the design directions are built from, and the stylesheet that loads
 * them.
 *
 * The direction cards render real type in each direction's own fonts, so every
 * family the catalogue names has to be on the page or the card lies about how
 * that direction looks. Two hand-maintained font lists drifted from the
 * catalogue and dropped DM Sans, Hanken Grotesk, Instrument Sans and IBM Plex
 * Mono. This derives the list from `DIRECTIONS` instead, and the tests assert
 * the stylesheet covers the catalogue.
 */

/** Families already requested by the app's own interface stylesheet. */
const APP_FONTS = [
  'Anton',
  'Archivo',
  'Archivo Black',
  'Bitter',
  'Bodoni Moda',
  'Bricolage Grotesque',
  'Cormorant Garamond',
  'EB Garamond',
  'Figtree',
  'Fraunces',
  'Geist',
  'Instrument Serif',
  'Jost',
  'Karla',
  'Libre Franklin',
  'Lora',
  'Manrope',
  'Newsreader',
  'Nunito',
  'Playfair Display',
  'Public Sans',
  'Space Grotesk',
  'Syne',
  'Work Sans',
  'Young Serif',
];

export type FontUse = { family: string; weights: number[] };

/** Every family and weight the catalogue's directions use, unioned. */
export function directionFontUses(): FontUse[] {
  const uses = new Map<string, Set<number>>();
  for (const direction of DIRECTIONS) {
    // Every role the catalogue declares, including the optional `detail` face —
    // skipping it is how IBM Plex Mono went missing.
    for (const role of [
      direction.fonts.display,
      direction.fonts.body,
      direction.fonts.detail,
    ]) {
      if (!role) continue;
      const weights = uses.get(role.family) ?? new Set<number>();
      for (const weight of role.weights) weights.add(weight);
      uses.set(role.family, weights);
    }
  }
  return [...uses.entries()]
    .map(([family, weights]) => ({
      family,
      weights: [...weights].sort((a, b) => a - b),
    }))
    .sort((a, b) => a.family.localeCompare(b.family));
}

const familyParameter = (use: FontUse): string => {
  const name = use.family.replace(/ /g, '+');
  return use.weights.length > 0
    ? `family=${name}:wght@${use.weights.join(';')}`
    : `family=${name}`;
};

/** The stylesheet the direction cards need, whatever the base list already has. */
export function directionFontsHref(base: string): string {
  const requested = new Set(
    [...base.matchAll(/family=([^&:]+)/g)].map((m) => m[1].replace(/\+/g, ' ')),
  );
  const missing = directionFontUses().filter((u) => !requested.has(u.family));
  if (missing.length === 0) return base;
  return `${base}&${missing.map(familyParameter).join('&')}`;
}

/** Families the catalogue needs that a stylesheet does not load. Empty is correct. */
export function missingDirectionFamilies(href: string): string[] {
  const requested = new Set(
    [...href.matchAll(/family=([^&:]+)/g)].map((m) => m[1].replace(/\+/g, ' ')),
  );
  return directionFontUses()
    .map((u) => u.family)
    .filter((family) => !requested.has(family));
}

export { APP_FONTS };
