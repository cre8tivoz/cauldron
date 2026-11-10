import fs from 'node:fs';
import path from 'node:path';
import { isInside } from './files';
import {
  BUTTON_CONTRAST,
  LARGE_TEXT_CONTRAST,
  TEXT_CONTRAST,
  contrastRatio,
  round1,
} from './contrast';

/**
 * The ten design directions in Cauldron's starter set (design/STARTER-SET.md),
 * each learned from a real site, with free (SIL OFL) type to stand in for paid fonts.
 * A chosen direction is saved inside the site as tokens plus a design document the
 * agent reads on every job (plan 4.2).
 */

export type FontChoice = {
  family: string;
  package: string;
  weights: number[];
  /** Correct generic fallback while the web font loads or if it fails. */
  generic?: 'serif' | 'sans-serif' | 'monospace';
};

/**
 * The layout, type treatment, surface, state and mobile rules the source design
 * files describe. These are our own translations, written against Cauldron's
 * allowed token scales, not copied prose. They are rendered into DESIGN.md and
 * carried on every agent job so a direction is a system, not just a palette.
 */
export type DirectionStructure = {
  density: string;
  displayType: string;
  surfaces: string;
  states: string;
  mobile: string;
};

export type DesignDirection = {
  id: string;
  name: string;
  forWhom: string;
  learnedFrom: string;
  colours: Record<string, string>;
  fonts: { display: FontChoice; body: FontChoice; detail?: FontChoice };
  typeScale: number[];
  spacing: number[];
  radii: number[];
  motion: { quick: string; settle: string; easing: string };
  character: string;
  watch: string;
  structure: DirectionStructure;
};

const TYPE_SCALE = [13, 15, 17, 20, 25, 31, 39, 49, 61, 76];
const SPACING = [0, 1, 4, 8, 12, 16, 24, 32, 48, 64, 96];
const RADII = [0, 4, 10, 20, 999];
// Niki Studio needs a display step above the shared scale without forcing every
// other direction to grow. Body stays at 16px or above for readability.
const NIKI_TYPE_SCALE = [14, 16, 18, 22, 28, 36, 46, 58, 72, 92];

/**
 * Used only for directions measured from a reference URL. The measurement does
 * not describe structure, so a safe, explicit default keeps old imports valid
 * without pretending the reference supplied layout rules.
 */
export const REFERENCE_STRUCTURE: DirectionStructure = {
  density:
    'Use a centred content column capped at 72rem. Section padding comes from the spacing scale (space-8 or space-9); card and grid gutters from space-5 or space-6. Keep body text in a 60-75 character measure rather than stretching it to the full shell.',
  displayType:
    'Hierarchy comes from the measured size scale, not invented in-between sizes. Keep body copy at size-3 (17px) or larger; use size-2 (15px) only for short labels, never for essential body text. Leave case and tracking neutral unless the measured site clearly uses them.',
  surfaces:
    'Prefer flat measured colour fields and 1px line hairlines. Do not add shadows or extra surfaces that were not measured; depth must come from the measured palette until a person chooses a starter direction.',
  states:
    'Every control still needs a visible hover and focus-visible change: darken or lighten the measured primary by one step on hover, and use a 2px ink or primary outline at 3:1 or better on focus-visible. Disabled controls keep readable text at 4.5:1; never simulate disabled with low-opacity text.',
  mobile:
    'Below 768px collapse multi-column layouts to one column, keep section padding at space-8 (48px), and let display type scale down without changing family or weight. Navigation becomes a labelled text menu. All motion stops under prefers-reduced-motion: reduce.',
};

function completeStructure(
  value: unknown,
  fallback: DirectionStructure,
): DirectionStructure {
  const saved = (value ?? {}) as Partial<DirectionStructure>;
  const field = (key: keyof DirectionStructure) =>
    typeof saved[key] === 'string' && saved[key]!.trim()
      ? saved[key]!
      : fallback[key];
  return {
    density: field('density'),
    displayType: field('displayType'),
    surfaces: field('surfaces'),
    states: field('states'),
    mobile: field('mobile'),
  };
}

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
      detail: {
        family: 'IBM Plex Mono',
        package: '@fontsource/ibm-plex-mono',
        weights: [400, 500],
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
    structure: {
      density:
        'Content caps at 76rem, centred, with outer gutters of space-9 (64px) and section padding of space-9 or space-10. Menu and story sections alternate a cream field with full-bleed photography; dish cards use a three-column grid with space-5 (16px) gutters, never a single narrow reading column.',
      displayType:
        'Headings are uppercase at weight 400 only, tracking 0.02em, leading 1.2; H2 at size-6 (31px) is the menu-board voice and H3 at size-3 (17px) keeps the uppercase label language. Body is sentence case at size-3 or size-4 (17-20px). The detail mono runs at size-2 (15px) for prices and small details, never for essential body copy.',
      surfaces:
        'Flat colour fields: cream bg, white form fields, terracotta sections and a full-bleed terracotta footer with cream text. No shadows. Separate layers with a 1px line hairline or a change of colour field, not elevation.',
      states:
        'Buttons and links: terracotta fill to primary-deep fill on hover (one step darker), with a 2px ink underline on focus-visible and a 3:1 ring. Disabled keeps the shape but uses muted text on surface with a line border; never lower text below 4.5:1.',
      mobile:
        'Below 768px the three-column dish grid becomes one column with space-5 gaps and the carousel shows one image. The nav collapses to a full-width menu panel under the header, section padding drops to space-8 (48px), and headings keep uppercase but drop one size step. Stop parallax and autoplay under reduced motion.',
    },
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
      danger: '#eb0000',
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
    structure: {
      density:
        'Content caps at 80rem with space-9 (64px) side padding on desktop; sections use space-9 top and bottom, cards use a space-3 (8px) gutter, and the service grid is two columns that become one below 768px. Keep a narrower 42rem text column inside the wide shell for 60-75 character measures.',
      displayType:
        'One humanist sans for everything; headings sit at weight 400 at size-7 or size-8, separated by size and space rather than weight. Body is size-3 or size-4 (17-20px) with 1.6 leading; labels are size-2 (15px) with 0.02em tracking, uppercase only on short badges. Use 600 only for inline emphasis.',
      surfaces:
        'Soft but restrained: cream bg, white cards with a 1px line hairline and at most one small shadow mixed from line. Media is square-cornered (radius-0); cards may use radius-1 or radius-2. No stacked shadows; modals use a scrim rather than floating glass.',
      states:
        'Primary buttons: deep green fill to ink fill on hover, with a 3:1 accent ring on focus-visible. Secondary buttons are green text on bg with a line border. Inputs are surface with a line border; danger is for validation text and icons only. Disabled uses muted text with a line border and no shadow.',
      mobile:
        'The header collapses to one labelled menu button in a sticky bar no taller than space-10; the desktop 8px grid becomes vertical stacking with space-6 (24px) gaps. Section padding drops to space-8 (48px), body stays at least size-3 (17px), and the slide-in entrance is removed under reduced motion.',
    },
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
        generic: 'sans-serif',
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
    structure: {
      density:
        'Full-bleed photography panels run edge to edge with a bone content band between them; text columns cap at 68rem on a 12-column grid with space-5 (16px) gutters. Job-sheet blocks run three across on desktop and stack at 768px; section padding is space-9 (64px) with space-4 (12px) internal gaps.',
      displayType:
        'Sturdy sans headings at weight 600 or 700, size-9 or size-10 for hero words, leading 1.05-1.15 and tracking -0.01em; section headings sit at size-6 or size-7. Body is size-3 or size-4 (17-20px) with 1.55 leading. Labels are sentence case or uppercase at size-2 (15px) with 0.04em tracking; no condensed or decorative faces.',
      surfaces:
        'Flat bone and white panels; depth comes from photography and a 1px line hairline. Use radius-1 (4px) on controls and radius-2 (10px) on medium cards, with no shadows on cards or images. Pricing and availability sit on a white surface against bone, not in a floating card.',
      states:
        'Buttons use toffee or primary-deep fills with light text; hover darkens by one step, focus-visible adds a 2px accent outline with 2px offset. Secondary actions are ink text with a line underline on hover. Disabled is a line-bordered surface with muted text; sold or complete states use ink labels plus a rule, not colour alone.',
      mobile:
        'Below 768px the three-across job blocks become one column, full-bleed images keep their 3:4 or 16:9 ratios, and the nav becomes a compact labelled menu row, not icons alone. Section padding drops to space-8 (48px); display type scales down without changing weight; no sticky parallax.',
    },
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
        generic: 'sans-serif',
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
    structure: {
      density:
        'Viewport-led: huge display type may run near full width, but body and listings cap at 72rem with space-6 (24px) gutters. Sections are tall (space-10 padding) and separated by luminance shifts, not rules; the work grid is two-up on desktop and one-up below 768px.',
      displayType:
        'Two extremes, no middle: display at size-10 with tight tracking -0.04em and leading 0.9-1; micro labels at size-1 (13px) uppercase with 0.08em tracking. Body sits at size-3 or size-4 (17-20px) with 1.5 leading. Never bold display type; scale and space carry hierarchy.',
      surfaces:
        'Sharp corners (radius-0) and no shadows. Depth comes from the silver canvas, a near-white intro panel and the one red-orange footer or active state. A 1px line hairline is the only divider. No glass, no gradients, no card shadows.',
      states:
        'Links are ink with a red-orange underline; hover moves the label to primary, focus-visible draws a 2px primary outline with 2px offset. Keep red-orange to one signal per screen: active nav or footer, not both plus buttons. Disabled is muted text with no strike-through and no opacity trick.',
      mobile:
        'Display type clamps to roughly half its desktop size while keeping tight leading; below 768px the work grid is one column with space-5 gaps and the nav collapses to a minimal text row. Section padding drops to space-9 (64px); scroll and hover motion stop under reduced motion.',
    },
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
      danger: '#de1c24',
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
    structure: {
      density:
        'Editorial shell capped at 80rem; product grids use three or four columns with space-5 (16px) gutters, and section padding is space-9 (64px) with a space-10 (96px) gap before the footer. Images are tall (4:5 or 3:4) and text blocks stay in a 60-70 character measure. Keep product density visible above the fold rather than a hero-only page.',
      displayType:
        'Display serif at weight 500, size-8 or size-9, leading 1.05, tracking -0.01em, sentence case. Body is a geometric sans at size-3 or size-4 (17-20px) with 1.5 leading. Small-caps labels at size-2 (15px) with 0.06em tracking are the only uppercase. No weight above 600 and no second accent colour.',
      surfaces:
        'Hard white and ink editorial surfaces, sharp corners (radius-0, or radius-1 on inputs), no shadows; 1px line hairlines separate grid rows. The footer is a black field with white text. Indigo is an event: one CTA or mark, never a background wash. Danger is reserved for sold-out or alert states.',
      states:
        'Primary buttons: indigo fill with surface text to ink on hover; focus-visible is a 2px indigo outline with 2px offset. Secondary buttons are ink text with a line border and invert to an ink fill on hover. Sold-out uses danger fill with white text and a non-interactive cursor; disabled is muted text on surface with a line border.',
      mobile:
        'Below 768px the product grid becomes two columns, and one column under 480px, with space-4 gaps; the nav collapses to a labelled text menu, not icons alone. Section padding drops to space-8 (48px), display drops two size steps, and image ratios stay 4:5. Transitions stay at 100-150ms and stop under reduced motion.',
    },
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
    structure: {
      density:
        'Cinema-wide: hero and film stills run full-bleed, while programme text caps at 66rem and listings use a two-column grid with space-6 (24px) gutters. Sections are tall (space-10 padding) and alternate dense type blocks with full-bleed images; never centre a small card in a sea of black.',
      displayType:
        'Display at size-10 uppercase, tracking -0.03em, leading 0.9-1 for title cards; a second, open tracking of 0.06em at size-2 (15px) is for labels. Body sits at size-4 or size-5 (20-25px) at weight 400 with 1.5 leading, ivory on black. One weight only: hierarchy by size, case and tracking, never bold.',
      surfaces:
        'Pure black is the named exception; depth is photography and the ivory-on-black contrast, not shadow. Use radius-1 (4px) on controls and radius-4 for programme pills. No glass panels, no grey cards, no gradients.',
      states:
        'Text buttons only: ivory label with a 1px ivory underline; hover brightens to ink and thickens the rule, focus-visible draws a 2px ivory outline with 3px offset. Never introduce a chromatic hover. Disabled is muted ivory at 4.5:1 or better with the rule removed; a selected programme row uses an ivory left rule, not a fill.',
      mobile:
        'Below 768px the programme grid becomes one column, hero display drops to roughly half its desktop size while keeping uppercase and tracking, and the nav collapses to a minimal labelled text row. Section padding drops to space-9 (64px); preserve black and ivory contrast, and stop video autoplay under reduced motion.',
    },
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
    structure: {
      density:
        'Story-driven full-bleed sections; content caps at 76rem with product grids of three or four cards and space-6 (24px) gutters. Sections use space-10 (96px) padding and end on an accent footer. Keep the rhythm dense: oversized display followed immediately by short reading copy, not a hero with empty space.',
      displayType:
        'Display at weight 400 only, uppercase at the top of the scale (size-9 or size-10), leading 0.85-0.95; mid headings drop to sentence case at size-7 or size-8. Body is size-3 or size-4 (17-20px) with 1.6 leading. Labels and CTAs use the display face at size-2 (15px); never bold any text.',
      surfaces:
        'No shadows. Depth is colour: cream ground, white inputs, full-bleed accent (honey-gold) and primary (burnt orange) section grounds, and circle-wipe transitions. Everything rounds to pills or circles (radius-4); the footer commits to accent with ink text. Primary and accent belong to transitions and grounds, not persistent chrome.',
      states:
        'Buttons are outline-only: transparent fill, ink text and an ink 1px border; hover fills with primary-soft while keeping ink text, and focus-visible draws a 3:1 ink outline with 2px offset. Links use the primary animated underline. Disabled uses muted text with a dashed line border; never lower text below 4.5:1.',
      mobile:
        'Below 700px every type role drops one or two steps (display stays at 40px or more but body stays at size-3/17px or larger), the product grid becomes one column with space-5 gaps, and the nav switches to the display face in a full-width panel. Circle wipes shorten or become simple fades, and all motion stops under reduced motion.',
    },
  },
  {
    id: 'componine',
    name: 'Componine',
    forWhom: 'Creative studios and art-led portfolios',
    learnedFrom: 'componine.com — https://www.componine.com/',
    colours: {
      bg: '#0d0b09',
      surface: '#1e140f',
      ink: '#f2f1ef',
      muted: '#b9b0a4',
      primary: '#f9a602',
      'primary-soft': '#373828',
      line: '#373828',
    },
    fonts: {
      display: {
        family: 'Instrument Serif',
        package: '@fontsource/instrument-serif',
        weights: [400],
      },
      body: {
        family: 'Instrument Sans',
        package: '@fontsource/instrument-sans',
        weights: [400, 500, 600],
      },
    },
    typeScale: TYPE_SCALE,
    spacing: SPACING,
    radii: RADII,
    motion: {
      quick: '180ms',
      settle: '340ms',
      easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
    },
    character:
      'Warm-dark editorial theatre: a near-black with a brown cast, warm off-white type, patterned serif headings and one amber flame of an accent. The work and a single motion layer carry the drama, not chrome.',
    watch:
      'The near-black must stay warm, never cool grey or pure black. Amber is the only saturated colour: one highlight per screen, never body copy.',
    structure: {
      density:
        'Centred dark stage capped at 72rem, with section padding of space-9 or space-10 and space-6 (24px) gutters. Prose stays in a 58-65 character column; feature blocks may run wider but not edge to edge. Generous dark space below the hero is deliberate, but each section must follow with substance rather than empty scroll.',
      displayType:
        'Display serif at weight 400 only, size-6 or size-7 (31-39px), tracking -0.01em and leading 1.12-1.2; a larger display step is allowed for one hero line. Body is a neutral sans at size-3 (17px) with 1.4 leading; labels are size-2 (15px) at normal tracking. Never bold the display; hierarchy comes from size and the amber accent.',
      surfaces:
        'Warm-dark stack: bg near-black, a slightly warmer surface for featured sections, line as separator and one light panel filled with ink as the only light surface. No shadows; depth comes from colour and a single motion layer. Use radius-3 (20px) on major containers and radius-4 for pills, not a different radius on every card.',
      states:
        'Buttons use a surface fill with ink text; hover raises the surface one step and adds a 1px primary border, focus-visible draws a 2px primary outline with 2px offset. Primary is the sole accent: one highlighted element per screen. Disabled is surface with muted text and no primary border; never use primary on body copy.',
      mobile:
        'Below 768px the stage becomes one column with space-8 (48px) section padding and space-5 gutters; display drops one or two size steps but keeps tight tracking. The nav collapses to a full-width panel over the dark ground; reduce the motion layer to a static image and stop all motion under reduced motion. Body stays at least size-3 (17px).',
    },
  },
  {
    id: 'niki-studio',
    name: 'Niki Studio',
    forWhom: 'Branding studios and artist portfolios',
    learnedFrom:
      'bynikistudio.com — https://sparkbites.dev/website/Niki%20Studio',
    colours: {
      bg: '#0a0a0a',
      surface: '#1a1a1a',
      ink: '#ffffff',
      muted: '#a3a3a3',
      primary: '#ffffff',
      'primary-soft': '#2b2b2b',
      line: '#2b2b2b',
    },
    fonts: {
      display: {
        family: 'Archivo Black',
        package: '@fontsource/archivo-black',
        weights: [400],
        generic: 'sans-serif',
      },
      body: {
        family: 'DM Sans',
        package: '@fontsource/dm-sans',
        weights: [400, 500],
      },
    },
    typeScale: NIKI_TYPE_SCALE,
    spacing: SPACING,
    radii: RADII,
    motion: {
      quick: '180ms',
      settle: '320ms',
      easing: 'cubic-bezier(0.16, 1, 0.3, 1)',
    },
    character:
      'Unapologetically bold and luxury-dark: near-black canvas, pure white type and glass-thin surfaces. One extended display face performs the whole brand, with a binary scale of huge statement and tiny utility.',
    watch:
      'The display statement needs to overwhelm, not sit politely in a card. Keep the canvas near-black rather than pure black, use no accent hue, and never let utility text drop below readable size.',
    structure: {
      density:
        'Cinematic single-stage layout: one oversized statement fills the first viewport, then a narrow 64rem content band and a two-column work index with space-6 (24px) gutters. Sections use space-10 padding. Do not add a third content column; the emptiness around the statement is the layout.',
      displayType:
        'One extended display sans at size-10 (92px), weight 400 with the weight baked into the family, tracking -0.01em and leading 0.75-0.8. Body and utility text are plain sans at size-2 or size-3 (16-18px) with 1.5 leading. Hierarchy is binary: statement versus utility. Never add a mid-weight heading or a second display face.',
      surfaces:
        'Monochrome glass, no colour: near-black canvas, a 10% white button glass, a 17% white panel and one darker glass step. Depth comes from opacity, not shadow. Sharp corners are the default; if a radius is used, keep it at radius-1 (4px) or radius-4, never on the display block. No gradients and no accent hue.',
      states:
        'Glass buttons: a 10% white fill to a 17% white fill on hover with an ink border, focus-visible a 2px ink outline with 2px offset. Text links brighten from muted to ink on hover. Disabled is 10% glass with muted text at 4.5:1 or better and no border shift; never use colour to signal state.',
      mobile:
        'The 92px statement scales to roughly 40-52px below 768px while keeping negative tracking and leading under 0.9; body stays at size-2 (16px) or larger. The work index becomes one column, the nav a single labelled text menu, and section padding drops to space-9 (64px). Backdrop blur is optional: fall back to a solid surface where unsupported, and stop all motion under reduced motion.',
    },
  },
  {
    id: 'henry-from-online',
    name: 'Henry From Online',
    forWhom: 'Designers and writer-portfolios',
    learnedFrom: 'henry.codes — https://henry.codes/',
    colours: {
      bg: '#fafafa',
      surface: '#f2f1ed',
      ink: '#2a2722',
      muted: '#6b655e',
      primary: '#2a2722',
      'primary-soft': '#e8e4dc',
      line: '#dedad2',
    },
    fonts: {
      display: {
        family: 'Bodoni Moda',
        package: '@fontsource/bodoni-moda',
        weights: [400, 500],
      },
      body: {
        family: 'Hanken Grotesk',
        package: '@fontsource/hanken-grotesk',
        weights: [400, 500],
      },
    },
    typeScale: TYPE_SCALE,
    spacing: SPACING,
    radii: RADII,
    motion: {
      quick: '120ms',
      settle: '200ms',
      easing: 'cubic-bezier(0.25, 0.1, 0.25, 1)',
    },
    character:
      'Typographically rigorous and analogue: warm off-white paper, warm brown-black ink, uppercase running as the default grammar, and one high-contrast display serif that sits quieter than the body. A full footer inversion is the only colour event.',
    watch:
      'No accent colour, no bold and no rounded corners: the restraint is the identity. Keep uppercase body only if line length and size stay readable; switch long prose to sentence case rather than shrinking it.',
    structure: {
      density:
        'Newspaper-tight: content in a narrow 60-68 character measure capped at 64rem, with space-5 (16px) section padding and space-9 (64px) chapter gaps. The page can run long and text-led; do not spread it into a wide marketing grid. Use a single column for prose and at most two columns for an index or list.',
      displayType:
        'H1 display serif uppercase at size-6 (31px), weight 400, leading 0.9 and normal tracking, set in muted grey rather than ink. H2, H3 and body use the geometric sans, uppercase for headings and labels; body is size-3 (17px) with 1.5 leading. No bold anywhere and no accent colour.',
      surfaces:
        'Two surfaces only: a near-white page and a full footer inversion to ink brown with near-white text. Sharp corners (radius-0), no shadows and no card borders; 1px line rules may separate lists. The inverted footer is the only depth event.',
      states:
        'Links are muted with a 1px line underline; hover removes the underline and shifts to ink, focus-visible draws a 2px ink outline with 2px offset. Buttons, where needed, are uppercase text-only with a line rule; disabled uses muted grey at 4.5:1 or better and keeps the rule. No state colour beyond the ink and grey pair.',
      mobile:
        'Below 768px keep the single reading column, drop H1 to size-5 or size-6 while keeping leading at 0.9-1, and keep body at size-3 (17px) or larger; section padding stays space-5 while chapter gaps drop to space-8 (48px). The nav becomes a text-only list, the footer inverts as on desktop, and link and focus transitions stop under reduced motion.',
    },
  },
];

export function findDirection(id: string): DesignDirection | null {
  return DIRECTIONS.find((direction) => direction.id === id) ?? null;
}

function fontFallback(font: FontChoice, fallback: string): string {
  if (font.generic === 'sans-serif') return 'ui-sans-serif, sans-serif';
  if (font.generic === 'monospace') return 'ui-monospace, monospace';
  return fallback;
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

  const families = [
    direction.fonts.display,
    direction.fonts.body,
    direction.fonts.detail,
  ]
    .filter((font): font is FontChoice => Boolean(font))
    .filter((font) => font.package.startsWith('@fontsource/'))
    .map(
      (font) =>
        `family=${encodeURIComponent(font.family).replace(/%20/g, '+')}:wght@${font.weights.join(';')}`,
    );
  const fontImport = families.length
    ? `@import url('https://fonts.googleapis.com/css2?${[...new Set(families)].join('&')}&display=swap');\n`
    : '';
  const detailFont = direction.fonts.detail
    ? `  --cauldron-font-detail: '${direction.fonts.detail.family}', ui-monospace, monospace;\n`
    : '';
  return `${fontImport}/* ${direction.name} — chosen in Cauldron. The site owns this file. */
:root {
${colours}
${sizes}
${spacing}
${radii}
  --cauldron-font-display: '${direction.fonts.display.family}', ${fontFallback(direction.fonts.display, 'Georgia, serif')};
  --cauldron-font-body: '${direction.fonts.body.family}', ${fontFallback(direction.fonts.body, 'ui-sans-serif, sans-serif')};
${direction.fonts.detail ? detailFont : ''}  --cauldron-motion-quick: ${direction.motion.quick};
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

/**
 * Standards every generated site must meet, carried into both the agent prompt
 * and the saved DESIGN.md (ticket 29 PeNtA feedback: SVG wordmark overlap with
 * the kicker, desktop nav shipped inline on mobile, decorative imagery rules).
 */
export const generatedSiteStandards = `## Generated-site standards

- No unintended overlaps. Text, SVG wordmarks, headings and images must not collide at any
width. If an SVG wordmark or heading relies on a loaded webfont, verify the layout with that
font actually loaded (\`document.fonts.ready\`, not the fallback) and size its viewBox or
flow to the real glyph box. Glyphs must never escape a short viewBox over other content.
- When the main navigation collapses on mobile, it becomes a usable disclosure menu: a small
native \`details\`/\`summary\` is enough. It needs a visible toggle, an accessible
"Menu" label, a 44px touch target, visible keyboard focus, Escape to close, and no focusable
links while closed. Keep inline links on desktop. This is a default, not a template: do not
force every site into the same layout.
- Decorative faded imagery behind a text section is a contextual option, not a requirement
across directions. Use it only when it suits the direction or the person asks. Keep it
low-opacity, non-interactive and behind the text, and only when body text still measures
4.5:1 (large text 3:1) against the actual composite background.
- Interaction states are visible and distinct on every control: a hover change, a pressed
or selected state that stays readable when hovered (a selected filter button must not
turn into light text on a light background), and a clearly different disabled style.
Typographic arrows (→, ↗) in labels are punctuation, not emoji icons.`;

/**
 * DESIGN.md is read by the agent. Naming an npm font package beside each font
 * invited the very import the document forbids (the tinydogs failure), so a
 * hosted font carries no note; only a reference font says what it needs.
 */
function fontNote(font: FontChoice): string {
  return font.package.startsWith('@fontsource/') ? '' : ` (${font.package})`;
}

export function designDocument(direction: DesignDirection): string {
  const colours = Object.entries(direction.colours)
    .map(([name, value]) => `| ${name} | \`${value}\` |`)
    .join('\n');

  // Real-brief evidence (ticket 29): directions whose muted or primary sat
  // under 4.5:1 were used for small labels, links and button text anyway,
  // because the document said "every colour comes from this table" and never
  // gave the measured limits. State the measured pairs instead of guessing.
  // The threshold is decided on the unrounded ratio; rounding is only for
  // display. Otherwise 4.46 prints as 4.5 and is wrongly allowed for small
  // text, and 2.99 prints as 3.0 and is wrongly offered for large text.
  const textPairs = ['ink', 'muted', 'primary', 'danger']
    .filter((name) => direction.colours[name])
    .flatMap((name) =>
      ['bg', 'surface']
        .filter((background) => direction.colours[background])
        .map((background) => {
          const raw = contrastRatio(
            direction.colours[name],
            direction.colours[background],
          );
          const use =
            raw >= TEXT_CONTRAST
              ? 'small text and above'
              : raw >= LARGE_TEXT_CONTRAST
                ? 'large text (24px+, or 18.66px+ bold) only'
                : 'decorative fills only, no text';
          return `| ${name} on ${background} | ${round1(raw)}:1 | ${use} |`;
        }),
    )
    .join('\n');
  const buttonPairs = ['surface', 'bg']
    .filter((name) => direction.colours[name] && direction.colours.primary)
    .map((name) => {
      const raw = contrastRatio(
        direction.colours[name],
        direction.colours.primary,
      );
      const use =
        raw >= BUTTON_CONTRAST
          ? 'button labels allowed'
          : 'not for button labels';
      return `| ${name} on primary fill | ${round1(raw)}:1 | ${use} |`;
    })
    .join('\n');

  return `# ${direction.name}

Chosen in Cauldron for: **${direction.forWhom}**. Learned from ${direction.learnedFrom}.

${direction.character}

## Colours

| Token | Value |
|---|---|
${colours}

Every colour on the page comes from this table. Nothing else.

## Layout and structure

These are Cauldron's own translations of the published design notes for
${direction.learnedFrom}, written against this direction's spacing and type
scales. Where the source used a value that is not on the scale, it has been
snapped to the nearest allowed token.

- **Density and grid:** ${direction.structure.density}
- **Display type:** ${direction.structure.displayType}
- **Surfaces and depth:** ${direction.structure.surfaces}
- **States:** ${direction.structure.states}
- **Mobile:** ${direction.structure.mobile}

## Text and buttons

Measured from this direction's own colours:

| Pair | Ratio | Use |
|---|---|---|
${textPairs}
${buttonPairs}

Small text (under 24px) must use a pair at 4.5:1 or better. Large text (24px+,
or 18.66px+ bold) may use a pair at 3:1 or better, and only at 3:1 or better.
Button labels must be 4.5:1 or better against the colour behind them. A colour
marked "decorative fills only, no text" measures under 3:1, so it is for
backgrounds, borders and rules only: never use it for text at any size. Use
\`ink\` for small labels and links, with an underline for links. If a button fill
cannot carry button text at 4.5:1, use \`ink\` as the fill or an \`ink\` border on
\`bg\` instead.

## Type

- Display: ${direction.fonts.display.family}${fontNote(direction.fonts.display)}, weights ${direction.fonts.display.weights.join(', ')}
- Body: ${direction.fonts.body.family}${fontNote(direction.fonts.body)}, weights ${direction.fonts.body.weights.join(', ')}
${direction.fonts.detail ? `- Detail mono: ${direction.fonts.detail.family}${fontNote(direction.fonts.detail)}, weights ${direction.fonts.detail.weights.join(', ')}. Use it for prices, codes and small metadata, never for essential body copy.` : ''}

The fonts are loaded directly by \`cauldron/tokens.css\` using Google Fonts stylesheet links, and the CSS variables \`var(--cauldron-font-display)\` and \`var(--cauldron-font-body)\`${direction.fonts.detail ? ' (and `var(--cauldron-font-detail)`)' : ''} are already defined there. Pages and layouts should import \`cauldron/tokens.css\` (for example \`@import '../../cauldron/tokens.css';\` in \`src/styles/global.css\`) and use those CSS variables directly. Never add \`import '@fontsource/...'\` or other npm package imports unless the package is already installed in \`package.json\`.

Sizes, in rem: ${direction.typeScale.map((size) => size / 16).join(', ')}.
No other sizes.

## Spacing

Steps, in rem: ${direction.spacing.map((step) => step / 16).join(', ')}.

Sizes and spacing are rem values measured against a 16px root. Leave \`html\` at
the browser's default size and apply size tokens to \`body\`, headings and text
elements. Never set \`html { font-size: <a rem token> }\`: that multiplies every
size and spacing token and takes all of them off this scale.

## Corners

Radii in px: ${direction.radii.join(', ')}.

## Motion

${direction.motion.quick} for small changes, ${direction.motion.settle} for larger ones, easing \`${direction.motion.easing}\`.
Everything stops under \`prefers-reduced-motion: reduce\`.

## Watch out

${direction.watch}

${generatedSiteStandards}

## Token names

Every token is prefixed \`cauldron-\` so it cannot collide with a variable your site already
defines (many sites use short names like \`--c-bg\`).

## How to use this

Read \`cauldron/tokens.css\` and use \`var(--cauldron-c-…)\`, \`var(--cauldron-size-…)\`, \`var(--cauldron-space-…)\` and
\`var(--cauldron-radius-…)\` everywhere. Do not hard-code a colour, size or spacing value.
Import \`cauldron/tokens.css\` in your global styles to get fonts and tokens; do not add uninstalled npm font packages.
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
    ) {
      // Sites saved before ticket 29 have no structure block and, for Long
      // Lunch, no detail font. Fill those from the matching starter direction
      // without touching the saved colours or other overrides. A measured
      // reference direction has no preset, so it gets the explicit reference
      // default rather than crashing on an undefined structure.
      const preset = findDirection(parsed.tokens.id);
      const fonts = parsed.tokens.fonts;
      return {
        direction: {
          ...parsed.tokens,
          structure: completeStructure(
            parsed.tokens.structure,
            preset?.structure ?? REFERENCE_STRUCTURE,
          ),
          fonts: {
            ...fonts,
            detail: fonts.detail ?? preset?.fonts.detail,
          },
        },
        problem: null,
      };
    }
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
