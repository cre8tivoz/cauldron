import { DIRECTIONS, type DesignDirection } from './directions';

/**
 * The library is a showcase: each component is demonstrated in a vibrant,
 * polished palette drawn from the researched colour families (terracotta,
 * forest, indigo, gold, ember, magenta, teal, olive), so browsing shows real,
 * varied colour and type — not one flat default. Inserting a component still
 * adopts the open site's own direction (see addPiece / tokens.css); this only
 * chooses the palette the specimen is shown in.
 *
 * Every palette is contrast-verified for the showcase: body ink on the field
 * >= 9:1, muted text on the field >= 4.7:1, white on primary >= 4.9:1, and the
 * light accent on the dark ink field >= 7.7:1 (used by the dark-section pieces
 * — footers and the shader hero — that paint --cauldron-c-ink as a dark field).
 * Each palette borrows its type pairing from a settled source-led direction.
 */
type Palette = {
  label: string;
  base: string;
  colours: Record<string, string>;
};

const PALETTES: Record<string, Palette> = {
  terracotta: {
    label: 'Terracotta',
    base: 'long-lunch',
    colours: {
      bg: '#fdf0e7',
      surface: '#ffffff',
      ink: '#4a1510',
      muted: '#8a5a4a',
      primary: '#b84b30',
      'primary-deep': '#7c2d12',
      accent: '#f2b26b',
      line: '#f0d9c8',
    },
  },
  forest: {
    label: 'Forest',
    base: 'clear-ground',
    colours: {
      bg: '#eaf4ee',
      surface: '#ffffff',
      ink: '#06302b',
      muted: '#4f6f66',
      primary: '#0f766e',
      'primary-deep': '#134e4a',
      accent: '#f2d06b',
      line: '#d4e6dd',
    },
  },
  indigo: {
    label: 'Indigo',
    base: 'the-edit',
    colours: {
      bg: '#eceefb',
      surface: '#ffffff',
      ink: '#1e1b4b',
      muted: '#5a5f9e',
      primary: '#4338ca',
      'primary-deep': '#3730a3',
      accent: '#67e8f9',
      line: '#d8dcf5',
    },
  },
  gold: {
    label: 'Gold Noir',
    base: 'after-hours',
    colours: {
      bg: '#f7f0df',
      surface: '#ffffff',
      ink: '#211d16',
      muted: '#6f675a',
      primary: '#8a6a2f',
      'primary-deep': '#6f5626',
      accent: '#fbbf24',
      line: '#e8dcc4',
    },
  },
  ember: {
    label: 'Ember',
    base: 'open-house',
    colours: {
      bg: '#fdeee2',
      surface: '#ffffff',
      ink: '#431407',
      muted: '#9a5b3a',
      primary: '#c2410c',
      'primary-deep': '#9a3412',
      accent: '#fdba74',
      line: '#f8d8c0',
    },
  },
  magenta: {
    label: 'Magenta',
    base: 'niki-studio',
    colours: {
      bg: '#fceef5',
      surface: '#ffffff',
      ink: '#4a0d2e',
      muted: '#9d4a72',
      primary: '#be185d',
      'primary-deep': '#9d174d',
      accent: '#f0abfc',
      line: '#f4d4e4',
    },
  },
  teal: {
    label: 'Teal',
    base: 'silver-screen',
    colours: {
      bg: '#e6f5f3',
      surface: '#ffffff',
      ink: '#11423e',
      muted: '#456b67',
      primary: '#0f766e',
      'primary-deep': '#115e59',
      accent: '#fcd34d',
      line: '#cfe9e6',
    },
  },
  olive: {
    label: 'Olive',
    base: 'solid-ground',
    colours: {
      bg: '#f0f2e2',
      surface: '#ffffff',
      ink: '#37421c',
      muted: '#5f6a3e',
      primary: '#4d7c0f',
      'primary-deep': '#3f6212',
      accent: '#fde047',
      line: '#e0e4c8',
    },
  },
};

const PIECE_PALETTE: Record<string, string> = {
  'editorial-intro': 'terracotta',
  'newsletter-footer': 'gold',
  'glow-action': 'indigo',
  'heading-reveal': 'magenta',
  'woven-cloth': 'terracotta',
  'centered-brand-nav': 'indigo',
  'split-studio-nav': 'forest',
  'sticky-pill-nav': 'teal',
  'split-editorial-hero': 'ember',
  'typographic-statement-hero': 'indigo',
  'threeui-shader-hero': 'indigo',
  'tabbed-menu': 'terracotta',
  'trade-bento-grid': 'olive',
  'capability-cards': 'forest',
  'editorial-pullquote': 'gold',
  'masonry-reviews': 'ember',
  'trade-accreditations': 'forest',
  'studio-contact-hours': 'teal',
  'accordion-faq': 'gold',
  'studio-directory': 'gold',
  'mobile-slide-menu': 'magenta',
  'card-carousel-hero': 'ember',
  'hover-reveal-work': 'olive',
  'masonry-photo-lookbook': 'terracotta',
  'before-after-compare': 'indigo',
  'product-showcase-grid': 'magenta',
  'tiered-pricing-cards': 'forest',
  'comparison-pricing-strip': 'olive',
  'map-directions-card': 'ember',
  'editorial-newsletter-footer': 'gold',
};

export function demoDirectionFor(pieceId: string): DesignDirection {
  const key = PIECE_PALETTE[pieceId] ?? 'terracotta';
  const palette = PALETTES[key];
  const base =
    DIRECTIONS.find((direction) => direction.id === palette.base) ??
    DIRECTIONS[0];
  return {
    ...base,
    id: `demo-${key}`,
    name: palette.label,
    colours: palette.colours,
  };
}
