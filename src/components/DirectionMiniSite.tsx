/**
 * A design direction rendered as the site it actually produces.
 *
 * The old card showed a name in a display font and four swatches, which reads as
 * a wireframe. This renders a complete small page in the direction's own tokens —
 * photography, navigation, eyebrow, headline, body, call to action, three-item
 * list and a footer band — at sizes relative to the card, so it looks like a
 * site seen at thumbnail size rather than a diagram of one.
 *
 * Composition borrows from the research board the directions were designed on
 * (`design/camillo/directions-v2/preview.html`): the same kind of hero, the same
 * per-direction shape language. The board is a starting point, not the finished
 * look — the content here is written per direction and the layout responds to
 * the direction's own traits.
 */
import type { CSSProperties } from 'react';
import { directionImages } from '../assets/directions';
import { onPrimary as onPrimaryFor } from '../main/directions';
import type { CauldronDirectionSummary } from '../cauldron-types';

type Sample = {
  business: string;
  eyebrow: string;
  headline: string;
  body: string;
  cta: string;
  nav: string[];
  items: [string, string][];
  next: string;
  nextBody: string;
  meta: string;
};

/** A fictional business per direction, so each card shows its own kind of site. */
const SAMPLES: Record<string, Sample> = {
  'long-lunch': {
    business: 'Morrow Table',
    eyebrow: 'Neighbourhood café · Carlton',
    headline: 'Good food,\nlong mornings.',
    body: 'Coffee from seven. Breakfast until it sells out.',
    cta: 'Book a table',
    nav: ['Menu', 'Our story', 'Visit'],
    items: [
      ['Eggs on toast', '18'],
      ['Market greens', '19'],
      ['Filter coffee', '5'],
    ],
    next: 'On the menu',
    nextBody: 'Coffee, bread and whatever is good this week.',
    meta: 'Carlton · Open until 3pm',
  },
  'clear-ground': {
    business: 'Neighbour Physio',
    eyebrow: 'Physiotherapy · Fremantle',
    headline: 'Move with\nmore confidence.',
    body: 'Practical care for the way you move, work and live.',
    cta: 'Request an appointment',
    nav: ['Services', 'Team', 'Book'],
    items: [
      ['Physiotherapy', '45 min'],
      ['Exercise support', '30 min'],
      ['Return to activity', '60 min'],
    ],
    next: 'How we can help',
    nextBody: 'We listen, assess and make a plan together.',
    meta: 'Fremantle · Open until 6pm',
  },
  'solid-ground': {
    business: 'Northline Build',
    eyebrow: 'Residential builders · Newcastle',
    headline: 'Built properly.\nBuilt to last.',
    body: 'Renovations and thoughtful additions, from measure to handover.',
    cta: 'Discuss a project',
    nav: ['Work', 'Process', 'Contact'],
    items: [
      ['01', 'Renovations'],
      ['02', 'Extensions'],
      ['03', 'Small builds'],
    ],
    next: 'What we build',
    nextBody: 'A compact addition for a growing household.',
    meta: 'Newcastle · Licensed since 2004',
  },
  'silver-screen': {
    business: 'Odd Hours Studio',
    eyebrow: 'Creative studio · Naarm',
    headline: 'MAKE SOME\nNOISE.',
    body: 'Identity, words and digital things for people with a point of view.',
    cta: 'Start a project',
    nav: ['Work', 'Studio', 'Contact'],
    items: [
      ['01', 'Brand worlds'],
      ['02', 'Digital places'],
      ['03', 'Campaigns'],
    ],
    next: 'What we do',
    nextBody: 'A visual identity with a little bit of bite.',
    meta: 'Naarm · Booking Q3',
  },
  'the-edit': {
    business: 'Fold Store',
    eyebrow: 'Independent clothing · Sydney',
    headline: 'A wardrobe,\nconsidered.',
    body: 'Useful pieces chosen for wearing often and keeping longer.',
    cta: 'Explore the edit',
    nav: ['Shop', 'Story', 'Visit'],
    items: [
      ['01', 'Everyday layers'],
      ['02', 'Objects to keep'],
      ['03', 'New arrivals'],
    ],
    next: 'The current edit',
    nextBody: 'A quieter approach to getting dressed.',
    meta: 'Sydney · Open until 5pm',
  },
  'after-hours': {
    business: 'The Lantern Room',
    eyebrow: 'Live music · Wollongong',
    headline: 'GOOD NIGHTS\nLIVE HERE.',
    body: 'Local acts, late sets and a room worth showing up for.',
    cta: 'See the lineup',
    nav: ['Lineup', 'Room', 'Tickets'],
    items: [
      ['FRI 12', 'The Static'],
      ['SAT 13', 'Low Tide'],
      ['SUN 14', 'Sunday Session'],
    ],
    next: 'On the bill',
    nextBody: 'Independent music, good company, no velvet rope.',
    meta: 'Wollongong · Doors 7pm',
  },
  'open-house': {
    business: 'Little Patch',
    eyebrow: 'Family space · Geelong',
    headline: 'Good days\ngrow here.',
    body: 'A friendly place for little people and their grown-ups.',
    cta: "See what's on",
    nav: ['Program', 'Members', 'Visit'],
    items: [
      ['Mon', 'Play and make'],
      ['Wed', 'Story circle'],
      ['Fri', 'Garden morning'],
    ],
    next: 'This week',
    nextBody: 'Messy hands, new mates and a cuppa for grown-ups.',
    meta: 'Geelong · Open until 2pm',
  },
  componine: {
    business: 'Assembly Arts',
    eyebrow: 'Arts programme · Brisbane',
    headline: 'A place for\nwhat comes next.',
    body: 'Exhibitions, performances and conversations for curious locals.',
    cta: 'View the programme',
    nav: ['Programme', 'Visit', 'Support'],
    items: [
      ['12 JUN', 'Open studio'],
      ['19 JUN', 'New voices'],
      ['26 JUN', 'Late viewing'],
    ],
    next: 'Coming up',
    nextBody: 'Three artists consider the idea of home.',
    meta: 'Brisbane · Open until 5pm',
  },
  'niki-studio': {
    business: 'Niki Studio',
    eyebrow: 'Brand studio · Melbourne',
    headline: 'Brands with\na slow pulse.',
    body: 'Identity and packaging for makers who care how things feel.',
    cta: 'See the work',
    nav: ['Work', 'Studio', 'Contact'],
    items: [
      ['01', 'Identity'],
      ['02', 'Packaging'],
      ['03', 'Art direction'],
    ],
    next: 'Selected work',
    nextBody: 'A quieter identity for a skincare house.',
    meta: 'Melbourne · Studio visits',
  },
  'henry-from-online': {
    business: 'Henry From Online',
    eyebrow: 'Writer & designer · Hobart',
    headline: 'Words for\nquiet work.',
    body: 'Essays, editorial design and the occasional long walk.',
    cta: 'Read the latest',
    nav: ['Writing', 'About', 'Contact'],
    items: [
      ['01', 'Essays'],
      ['02', 'Editorial'],
      ['03', 'Notes'],
    ],
    next: 'Recent writing',
    nextBody: 'On making things slowly, and keeping them small.',
    meta: 'Hobart · New issue monthly',
  },
};

type Shape = {
  /** Photo beside the copy, or full-bleed behind it. */
  photo: 'side' | 'overlay';
  control: number | 'pill';
  align: 'left' | 'centre';
  caps?: boolean;
  loud?: boolean;
  /** Which side the photograph sits on. */
  flip?: boolean;
  /** The next section shows rows instead of columns. */
  rows?: boolean;
};

const SHAPES: Record<string, Shape> = {
  'long-lunch': { photo: 'side', control: 10, align: 'left' },
  'clear-ground': { photo: 'side', control: 'pill', align: 'centre' },
  'solid-ground': { photo: 'side', control: 0, align: 'left', caps: true },
  'silver-screen': { photo: 'overlay', control: 0, align: 'left', loud: true },
  'the-edit': { photo: 'overlay', control: 0, align: 'left' },
  'after-hours': {
    photo: 'overlay',
    control: 'pill',
    align: 'left',
    loud: true,
  },
  'open-house': {
    photo: 'side',
    control: 12,
    align: 'left',
    flip: true,
    rows: true,
  },
  componine: { photo: 'overlay', control: 0, align: 'left', rows: true },
  'niki-studio': { photo: 'overlay', control: 4, align: 'left' },
  'henry-from-online': {
    photo: 'overlay',
    control: 0,
    align: 'left',
    rows: true,
  },
};

const DEFAULT_SHAPE: Shape = { photo: 'side', control: 4, align: 'left' };

/** Only reached for a direction measured from a reference URL. */
const FALLBACK: Sample = {
  business: 'Your business',
  eyebrow: 'Measured from a reference',
  headline: 'A direction from\na site you like.',
  body: 'Palette, type and density measured from the reference.',
  cta: 'Get in touch',
  nav: ['About', 'Work', 'Contact'],
  items: [
    ['01', 'A service'],
    ['02', 'Another service'],
    ['03', 'And a third'],
  ],
  next: 'A little more',
  nextBody: 'A short line about the work and who it is for.',
  meta: 'Your suburb · Open today',
};

export function DirectionMiniSite({
  direction,
}: {
  direction: CauldronDirectionSummary;
}) {
  const { colours, fonts } = direction;
  const sample = SAMPLES[direction.id] ?? FALLBACK;
  const shape = SHAPES[direction.id] ?? DEFAULT_SHAPE;
  const image = directionImages[direction.id];

  const bg = colours.bg ?? '#ffffff';
  const ink = colours.ink ?? '#111111';
  const muted = colours.muted ?? ink;
  const surface = colours.surface ?? bg;
  const line = colours.line ?? ink;
  const accent = colours.accent ?? colours.primary ?? ink;
  const primary = colours.primary ?? ink;
  const accentText = colours['primary-text'] ?? primary;
  // Same rule the app writes into a site's tokens (`tokensCss`): a white
  // primary gets black text, not white on white.
  const onPrimary = colours['on-primary'] ?? onPrimaryFor(primary);
  const radius =
    shape.control === 'pill'
      ? '999px'
      : `${Math.max(0, Number(shape.control) || 0)}px`;

  const vars = {
    '--dm-bg': bg,
    '--dm-ink': ink,
    '--dm-muted': muted,
    '--dm-surface': surface,
    '--dm-line': line,
    '--dm-accent': accent,
    '--dm-primary': primary,
    '--dm-accent-text': accentText,
    '--dm-on-primary': onPrimary,
    '--dm-radius': radius,
    '--dm-display': `${fonts.display}, serif`,
    '--dm-body': `${fonts.body}, sans-serif`,
  } as unknown as CSSProperties;

  const url = `${sample.business.toLowerCase().replace(/[^a-z]/g, '')}.com.au`;

  return (
    <div
      className={`dm dm-${shape.photo} ${shape.align === 'centre' ? 'dm-centre' : ''} ${shape.flip ? 'dm-flip' : ''} ${shape.rows ? 'dm-rows' : ''}`}
      style={vars}
      role="img"
      aria-label={`${direction.name}: ${sample.headline.replace(/\n/g, ' ')}`}
    >
      <div className="dm-chrome">
        <span className="dm-dots">
          <span />
          <span />
          <span />
        </span>
        <span className="dm-back" />
        <span className="dm-back dm-back-fwd" />
        <span className="dm-url">
          <span className="dm-lock" />
          {url}
        </span>
      </div>

      <div className="dm-page">
        <header className="dm-nav">
          <span className="dm-brand">{sample.business}</span>
          <span className="dm-meta">{sample.meta}</span>
          <nav className="dm-links">
            {sample.nav.map((item) => (
              <span key={item}>{item}</span>
            ))}
            <span className="dm-util" />
            <span className="dm-util" />
          </nav>
        </header>

        <div className="dm-hero">
          {image ? (
            <img className="dm-photo" src={image} alt="" loading="lazy" />
          ) : (
            <span className="dm-photo dm-photo-empty" />
          )}
          <span className="dm-scrim" />
          <div className="dm-hero-copy">
            <span className="dm-eyebrow">{sample.eyebrow}</span>
            <h3
              className={`dm-headline ${shape.caps ? 'dm-caps' : ''} ${shape.loud ? 'dm-loud' : ''}`}
            >
              {sample.headline}
            </h3>
            <p className="dm-para">{sample.body}</p>
            <span className="dm-cta">{sample.cta}</span>
          </div>
        </div>

        {/* The next section starts and is cut off by the card, the way a real
            page runs past the bottom of the viewport. */}
        <section className="dm-next">
          <span className="dm-next-kicker">
            {sample.next}
            <span className="dm-next-more">View all →</span>
          </span>
          <p className="dm-next-body">{sample.nextBody}</p>
          <div className="dm-list">
            {sample.items.map(([left, right]) => (
              <div className="dm-item" key={left + right}>
                <span className="dm-item-left">{left}</span>
                <span className="dm-item-right">{right}</span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
