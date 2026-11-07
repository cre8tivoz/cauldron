import fs from 'node:fs';
import path from 'node:path';
import { isInside } from './files';

/**
 * The seven design directions in Cauldron's starter set (design/STARTER-SET.md),
 * each learned from a real site, with free (SIL OFL) type to stand in for paid fonts.
 * A chosen direction is saved inside the site as tokens plus a design document the
 * agent reads on every job (plan 4.2).
 */

export type FontChoice = { family: string; package: string; weights: number[] };

export type DesignDirection = {
  id: string;
  name: string;
  forWhom: string;
  learnedFrom: string;
  colours: Record<string, string>;
  fonts: { display: FontChoice; body: FontChoice };
  typeScale: number[];
  spacing: number[];
  radii: number[];
  motion: { quick: string; settle: string; easing: string };
  character: string;
  watch: string;
};

const TYPE_SCALE = [13, 15, 17, 20, 25, 31, 39, 49, 61, 76];
const SPACING = [0, 1, 4, 8, 12, 16, 24, 32, 48, 64, 96];
const RADII = [0, 4, 10, 20, 999];

export const DIRECTIONS: DesignDirection[] = [
  {
    id: 'long-lunch',
    name: 'Long Lunch',
    forWhom: 'Cafés and restaurants',
    learnedFrom: 'montecafe.com.au',
    colours: {
      bg: '#f8f4e9',
      surface: '#fffdf7',
      ink: '#2a1712',
      muted: '#6b5a52',
      primary: '#b84b30',
      'primary-deep': '#5f1d1a',
      accent: '#d99a5b',
      line: '#e3d9c8',
    },
    fonts: {
      display: {
        family: 'Fraunces',
        package: '@fontsource/fraunces',
        weights: [500, 700],
      },
      body: {
        family: 'Karla',
        package: '@fontsource/karla',
        weights: [400, 600],
      },
    },
    typeScale: TYPE_SCALE,
    spacing: SPACING,
    radii: RADII,
    motion: {
      quick: '140ms',
      settle: '240ms',
      easing: 'cubic-bezier(0.2, 0.7, 0.3, 1)',
    },
    character:
      'Mediterranean warmth: cream paper, terracotta and deep red, generous margins, calm serif headings with a friendly sans body. Feels like a well-run dining room, not a startup.',
    watch:
      'Keep the cream warm, never yellow. Photographs carry the appetite: give food real space rather than small tiles.',
  },
  {
    id: 'clear-ground',
    name: 'Clear Ground',
    forWhom: 'Health, physio and wellness',
    learnedFrom: 'kihealth.com',
    colours: {
      bg: '#fffcf8',
      surface: '#ffffff',
      ink: '#14201f',
      muted: '#55605e',
      primary: '#003f3c',
      'primary-soft': '#dfeae8',
      accent: '#f2d06b',
      line: '#e4e0d8',
    },
    fonts: {
      display: {
        family: 'Newsreader',
        package: '@fontsource/newsreader',
        weights: [400, 600],
      },
      body: {
        family: 'Public Sans',
        package: '@fontsource/public-sans',
        weights: [400, 600],
      },
    },
    typeScale: TYPE_SCALE,
    spacing: SPACING,
    radii: RADII,
    motion: {
      quick: '160ms',
      settle: '260ms',
      easing: 'cubic-bezier(0.25, 0.6, 0.3, 1)',
    },
    character:
      'Calm, not clinical: warm white, deep forest green, soft yellow highlights. Airy line lengths and quiet borders. Reassuring rather than medical.',
    watch:
      'Never let green turn minty or the page turn sterile. Keep body text large enough for older readers and every tap target generous.',
  },
  {
    id: 'solid-ground',
    name: 'Solid Ground',
    forWhom: 'Trades and builders',
    learnedFrom: 'quechua-lookbook.com',
    colours: {
      bg: '#f0ece3',
      surface: '#ffffff',
      ink: '#23252a',
      muted: '#8b8681',
      primary: '#a9714b',
      'primary-deep': '#3a2a1f',
      accent: '#2f3438',
      line: '#dad5c9',
    },
    fonts: {
      display: {
        family: 'Archivo',
        package: '@fontsource/archivo',
        weights: [600, 700],
      },
      body: {
        family: 'Work Sans',
        package: '@fontsource/work-sans',
        weights: [400, 500],
      },
    },
    typeScale: TYPE_SCALE,
    spacing: SPACING,
    radii: RADII,
    motion: {
      quick: '120ms',
      settle: '200ms',
      easing: 'cubic-bezier(0.2, 0.6, 0.3, 1)',
    },
    character:
      'Practical workwear: charcoal, bone, stone and toffee. Square-ish corners, sturdy weights, information laid out like a job sheet.',
    watch:
      'Do not turn it into a corporate brochure. Real jobs, real materials, real names; prices and availability easy to find.',
  },
  {
    id: 'silver-screen',
    name: 'Silver Screen',
    forWhom: 'Creative studios',
    learnedFrom: 'thelinestudio.com',
    colours: {
      bg: '#dddee2',
      surface: '#ffffff',
      ink: '#0b0b0c',
      muted: '#6e7076',
      primary: '#e2401b',
      'primary-soft': '#f4d9d2',
      line: '#c8c9ce',
    },
    fonts: {
      display: {
        family: 'Anton',
        package: '@fontsource/anton',
        weights: [400],
      },
      body: {
        family: 'Space Grotesk',
        package: '@fontsource/space-grotesk',
        weights: [400, 500],
      },
    },
    typeScale: TYPE_SCALE,
    spacing: SPACING,
    radii: RADII,
    motion: {
      quick: '180ms',
      settle: '320ms',
      easing: 'cubic-bezier(0.16, 1, 0.3, 1)',
    },
    character:
      'Cool cinematic silver, near-black type, one red-orange signal colour, oversized lettering that does the designing. Work is the hero; the interface gets out of the way.',
    watch:
      'Keep the red-orange to a single signal per screen. Oversized type needs real contrast and generous line breaks, not shouting.',
  },
  {
    id: 'the-edit',
    name: 'The Edit',
    forWhom: 'Boutique retail and fashion',
    learnedFrom: 'comingsoonnewyork.com',
    colours: {
      bg: '#ffffff',
      surface: '#f7f7f5',
      ink: '#101820',
      muted: '#5a6472',
      primary: '#4a4af4',
      'primary-soft': '#e6e6fe',
      line: '#e6e7ea',
    },
    fonts: {
      display: {
        family: 'Playfair Display',
        package: '@fontsource/playfair-display',
        weights: [500, 600],
      },
      body: {
        family: 'Jost',
        package: '@fontsource/jost',
        weights: [400, 500],
      },
    },
    typeScale: TYPE_SCALE,
    spacing: SPACING,
    radii: RADII,
    motion: {
      quick: '150ms',
      settle: '260ms',
      easing: 'cubic-bezier(0.3, 0.7, 0.2, 1)',
    },
    character:
      'Editorial white with ink and one vivid indigo. Tight grids, tall images, small caps labels, lots of white space around product.',
    watch:
      'One accent only. Do not let indigo creep onto body copy; save it for actions and marks.',
  },
  {
    id: 'after-hours',
    name: 'After Hours',
    forWhom: 'Arts, film and venues',
    learnedFrom: 'siena.film',
    colours: {
      bg: '#000000',
      surface: '#0a0a0a',
      ink: '#efe6d5',
      muted: '#9a9384',
      primary: '#b08d57',
      'primary-soft': '#262421',
      line: '#262421',
    },
    fonts: {
      display: {
        family: 'Cormorant Garamond',
        package: '@fontsource/cormorant-garamond',
        weights: [300, 500],
      },
      body: {
        family: 'Libre Franklin',
        package: '@fontsource/libre-franklin',
        weights: [300, 400],
      },
    },
    typeScale: TYPE_SCALE,
    spacing: SPACING,
    radii: RADII,
    motion: {
      quick: '200ms',
      settle: '380ms',
      easing: 'cubic-bezier(0.22, 0.61, 0.36, 1)',
    },
    character:
      'Dark theatre black with antique-ivory type and a brass hairline. Programme-like listings, restrained serif, images allowed to glow.',
    watch:
      "This direction names pure black for its background, which Cauldron's taste rules normally avoid. It works here because the ivory type carries the contrast; keep text at 4.5:1 or better and never put small grey copy on black.",
  },
  {
    id: 'open-house',
    name: 'Open House',
    forWhom: 'Makers, food producers and families',
    learnedFrom: 'busybeehoney.com',
    colours: {
      bg: '#fff6e5',
      surface: '#ffffff',
      ink: '#2b1d12',
      muted: '#6b5744',
      primary: '#c6621f',
      'primary-soft': '#f7e3cd',
      accent: '#e8b23a',
      line: '#eadfcb',
    },
    fonts: {
      display: {
        family: 'Lora',
        package: '@fontsource/lora',
        weights: [500, 600],
      },
      body: {
        family: 'Bitter',
        package: '@fontsource/bitter',
        weights: [400, 500],
      },
    },
    typeScale: TYPE_SCALE,
    spacing: SPACING,
    radii: RADII,
    motion: {
      quick: '150ms',
      settle: '240ms',
      easing: 'cubic-bezier(0.3, 0.6, 0.3, 1)',
    },
    character:
      'Heritage label: warm honey paper, amber and burnt orange, crafted serif with a sturdy slab body. Playful details kept small so the product stays believable.',
    watch:
      'Warmth is not clutter. Keep playful touches to labels and dividers, not to body copy.',
  },
];

export function findDirection(id: string): DesignDirection | null {
  return DIRECTIONS.find((direction) => direction.id === id) ?? null;
}

export function tokensCss(direction: DesignDirection): string {
  const colours = Object.entries(direction.colours)
    .map(([name, value]) => `  --cauldron-c-${name}: ${value};`)
    .join('\n');
  const sizes = direction.typeScale
    .map((size, index) => `  --cauldron-size-${index + 1}: ${size / 16}rem;`)
    .join('\n');
  const spacing = direction.spacing
    .map((step, index) => `  --cauldron-space-${index}: ${step / 16}rem;`)
    .join('\n');
  const radii = direction.radii
    .map((radius, index) => `  --cauldron-radius-${index}: ${radius}px;`)
    .join('\n');

  const families = [direction.fonts.display, direction.fonts.body]
    .filter((font) => font.package.startsWith('@fontsource/'))
    .map(
      (font) =>
        `family=${encodeURIComponent(font.family).replace(/%20/g, '+')}:wght@${font.weights.join(';')}`,
    );
  const fontImport = families.length
    ? `@import url('https://fonts.googleapis.com/css2?${[...new Set(families)].join('&')}&display=swap');\n`
    : '';
  return `${fontImport}/* ${direction.name} — chosen in Cauldron. The site owns this file. */
:root {
${colours}
${sizes}
${spacing}
${radii}
  --cauldron-font-display: '${direction.fonts.display.family}', Georgia, serif;
  --cauldron-font-body: '${direction.fonts.body.family}', ui-sans-serif, sans-serif;
  --cauldron-motion-quick: ${direction.motion.quick};
  --cauldron-motion-settle: ${direction.motion.settle};
  --cauldron-motion-easing: ${direction.motion.easing};
}

@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
`;
}

export function designDocument(direction: DesignDirection): string {
  const colours = Object.entries(direction.colours)
    .map(([name, value]) => `| ${name} | \`${value}\` |`)
    .join('\n');

  return `# ${direction.name}

Chosen in Cauldron for: **${direction.forWhom}**. Learned from ${direction.learnedFrom}.

${direction.character}

## Colours

| Token | Value |
|---|---|
${colours}

Every colour on the page comes from this table. Nothing else.

## Type

- Display: ${direction.fonts.display.family} (${direction.fonts.display.package}), weights ${direction.fonts.display.weights.join(', ')}
- Body: ${direction.fonts.body.family} (${direction.fonts.body.package}), weights ${direction.fonts.body.weights.join(', ')}

Sizes, in rem: ${direction.typeScale.map((size) => size / 16).join(', ')}.
No other sizes.

## Spacing

Steps, in rem: ${direction.spacing.map((step) => step / 16).join(', ')}.

## Corners

Radii in px: ${direction.radii.join(', ')}.

## Motion

${direction.motion.quick} for small changes, ${direction.motion.settle} for larger ones, easing \`${direction.motion.easing}\`.
Everything stops under \`prefers-reduced-motion: reduce\`.

## Watch out

${direction.watch}

## Token names

Every token is prefixed \`cauldron-\` so it cannot collide with a variable your site already
defines (many sites use short names like \`--c-bg\`).

## How to use this

Read \`cauldron/tokens.css\` and use \`var(--cauldron-c-…)\`, \`var(--cauldron-size-…)\`, \`var(--cauldron-space-…)\` and
\`var(--cauldron-radius-…)\` everywhere. Do not hard-code a colour, size or spacing value.
`;
}

export type DirectionWrite =
  | { ok: true; id: string; folder: string }
  | { ok: false; problem: string };

/** Saves the direction inside the site, so the site owns it and works without Cauldron. */
export function writeDirection(
  root: string,
  direction: DesignDirection,
): DirectionWrite {
  const folder = path.join(root, 'cauldron');
  if (!isInside(root, folder))
    return { ok: false, problem: 'That folder is outside the site.' };
  fs.mkdirSync(folder, { recursive: true });
  fs.writeFileSync(
    path.join(folder, 'tokens.css'),
    tokensCss(direction),
    'utf8',
  );
  fs.writeFileSync(
    path.join(folder, 'DESIGN.md'),
    designDocument(direction),
    'utf8',
  );
  fs.writeFileSync(
    path.join(folder, 'design.json'),
    JSON.stringify(
      { id: direction.id, name: direction.name, tokens: direction },
      null,
      2,
    ),
    'utf8',
  );
  return { ok: true, id: direction.id, folder: 'cauldron' };
}

export type DirectionRead = {
  direction: DesignDirection | null;
  problem: string | null;
};

/** A missing design.json means no direction; a damaged one is reported (plan 4.2). */
export function readDirection(root: string): DirectionRead {
  const target = path.join(root, 'cauldron/design.json');
  let text: string;
  try {
    text = fs.readFileSync(target, 'utf8');
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT')
      return { direction: null, problem: null };
    const problem = `The design setting could not be read: ${
      error instanceof Error ? error.message : String(error)
    }`;
    console.error(problem);
    return { direction: null, problem };
  }
  try {
    const parsed = JSON.parse(text) as {
      id?: string;
      tokens?: DesignDirection;
    };
    if (
      parsed.tokens &&
      parsed.tokens.id === parsed.id &&
      Array.isArray(parsed.tokens.typeScale) &&
      parsed.tokens.fonts?.display?.family &&
      parsed.tokens.colours
    )
      return { direction: parsed.tokens, problem: null };
    return {
      direction: parsed.id ? findDirection(parsed.id) : null,
      problem: null,
    };
  } catch (error) {
    const problem = `The design setting could not be read: ${
      error instanceof Error ? error.message : String(error)
    }`;
    console.error(problem);
    return { direction: null, problem };
  }
}
