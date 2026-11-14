export type StarterTemplate = {
  id: 'sunday-table' | 'penta' | 'good-trade' | 'the-desk' | 'minimal';
  name: string;
  category: string;
  description: string;
  direction: string;
  directionId: string;
  badge: string;
  swatches: string[];
  fonts: string;
  pages: string[];
};

export const STARTER_TEMPLATES: StarterTemplate[] = [
  {
    id: 'sunday-table',
    name: 'Sunday Table',
    category: 'Café, Bakery & Dining',
    description:
      'Warm Mediterranean hospitality: daily seasonal menu, dining hours, reservation links, and warm terracotta tones.',
    direction: 'Long Lunch',
    directionId: 'long-lunch',
    badge: 'Hospitality',
    swatches: ['#f8f4e9', '#fffdf7', '#b84b30', '#d99a5b', '#2a1712'],
    fonts: 'Fraunces + Karla',
    pages: ['/', '/menu', '/visit'],
  },
  {
    id: 'penta',
    name: 'PeNtA Studio',
    category: 'Architecture & Design Studio',
    description:
      'High-contrast brutalist elegance: full-bleed typography, project masonry lookbook, practice manifesto, and stark layout.',
    direction: 'The Edit',
    directionId: 'the-edit',
    badge: 'Portfolio',
    swatches: ['#111111', '#1a1a1a', '#f5f5f5', '#888888', '#262626'],
    fonts: 'Cabinet Grotesk + Supreme',
    pages: ['/', '/work', '/about'],
  },
  {
    id: 'good-trade',
    name: 'Good Trade / Hard Hat',
    category: 'Trades, Builders & Joinery',
    description:
      'Practical, sturdy job-sheet aesthetic: clear service capability cards, instant quote request form, and solid bone/stone tones.',
    direction: 'Solid Ground',
    directionId: 'solid-ground',
    badge: 'Trades',
    swatches: ['#f0ece3', '#ffffff', '#a9714b', '#23252a', '#8b8681'],
    fonts: 'Archivo + Work Sans',
    pages: ['/', '/services', '/quote'],
  },
  {
    id: 'the-desk',
    name: 'The Desk / Atelier',
    category: 'Writers, Authors & Creators',
    description:
      'Refined editorial publication: curated reading lists, long-form essay collection with reading times, and newsletter capture.',
    direction: 'Henry From Online',
    directionId: 'henry-from-online',
    badge: 'Editorial',
    swatches: ['#faf8f5', '#ffffff', '#211e1b', '#736e65', '#e5e0d8'],
    fonts: 'Bodoni Moda + Hanken Grotesk',
    pages: ['/', '/essays'],
  },
  {
    id: 'minimal',
    name: 'Blank Canvas',
    category: 'Clean Minimal Starter',
    description:
      'Pure, unstyled Astro foundation with clean Base layout, ready for bespoke design from scratch.',
    direction: 'Minimal',
    directionId: 'minimal',
    badge: 'Blank',
    swatches: ['#ffffff', '#f8fafc', '#0f172a', '#64748b', '#e2e8f0'],
    fonts: 'System Sans',
    pages: ['/'],
  },
];

type NavLinkItem = { href: string; label: string; cta?: boolean };

function renderNavLinks(links: NavLinkItem[], forMobile: boolean): string {
  return links
    .map((item) => {
      const cls =
        item.cta && !forMobile
          ? ' class="btn btn-primary"'
          : ' class="nav-link"';
      return `<a href="${item.href}"${cls}>${item.label}</a>`;
    })
    .join('\n          ');
}

function renderStarterBase(options: {
  navLinks: NavLinkItem[];
  subtitle?: string;
  centeredHeader?: boolean;
  cardRadius?: string;
  buttonRadius?: string;
  headerBorderWidth?: string;
  footerLeft: string;
  footerRight: string;
  extraCss?: string;
}): string {
  const cardRadius = options.cardRadius ?? 'var(--cauldron-radius-2)';
  const buttonRadius = options.buttonRadius ?? 'var(--cauldron-radius-1)';
  const headerBorder = options.headerBorderWidth ?? '1px';
  const navMarkup = renderNavLinks(options.navLinks, false);
  const mobileNavMarkup = renderNavLinks(options.navLinks, true);
  const subtitleHtml = options.subtitle
    ? `\n          <p class="brand-subtitle">${options.subtitle}</p>`
    : '';
  return `---
import '../../cauldron/tokens.css';

interface Props {
  title: string;
}
const { title } = Astro.props;
---
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>{title}</title>
    <style is:global>
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body {
        background-color: var(--cauldron-c-bg);
        color: var(--cauldron-c-ink);
        font-family: var(--cauldron-font-body);
        font-size: var(--cauldron-size-3);
        line-height: 1.6;
        min-height: 100vh;
        display: flex;
        flex-direction: column;
      }
      a {
        color: inherit;
        text-decoration: underline;
        text-decoration-color: transparent;
        text-underline-offset: 4px;
        transition: color var(--cauldron-motion-quick) var(--cauldron-motion-easing),
          background-color var(--cauldron-motion-quick) var(--cauldron-motion-easing),
          border-color var(--cauldron-motion-quick) var(--cauldron-motion-easing),
          text-decoration-color var(--cauldron-motion-quick) var(--cauldron-motion-easing),
          box-shadow var(--cauldron-motion-quick) var(--cauldron-motion-easing);
      }
      a:hover {
        color: var(--cauldron-c-primary-deep, var(--cauldron-c-ink));
        text-decoration-color: currentColor;
        text-decoration-thickness: 2px;
      }
      a:focus-visible,
      button:focus-visible,
      summary:focus-visible,
      input:focus-visible,
      textarea:focus-visible {
        outline: 2px solid var(--cauldron-c-ink);
        outline-offset: 2px;
      }
      button,
      input,
      textarea {
        font-family: inherit;
        font-size: var(--cauldron-size-2);
        color: var(--cauldron-c-ink);
      }
      button:disabled,
      input:disabled,
      textarea:disabled {
        opacity: 0.45;
        cursor: not-allowed;
      }
      .container {
        max-width: 1080px;
        margin-left: auto;
        margin-right: auto;
        padding-left: var(--cauldron-space-6);
        padding-right: var(--cauldron-space-6);
        width: 100%;
      }
      .container-narrow {
        max-width: 820px;
      }
      header.site-header {
        border-bottom: ${headerBorder} solid var(--cauldron-c-line);
        background-color: var(--cauldron-c-surface);
        padding-top: var(--cauldron-space-5);
        padding-bottom: var(--cauldron-space-5);
      }
      .nav-row {
        display: flex;
        align-items: center;
        justify-content: ${options.centeredHeader ? 'center' : 'space-between'};
        flex-wrap: wrap;
        gap: var(--cauldron-space-5);
      }
      .brand-group {
        display: flex;
        flex-direction: column;
        gap: var(--cauldron-space-2);
      }
      .brand-title {
        font-family: var(--cauldron-font-display);
        font-size: var(--cauldron-size-5);
        font-weight: 700;
        color: var(--cauldron-c-ink);
        line-height: 1.2;
      }
      .brand-subtitle {
        font-size: var(--cauldron-size-1);
        font-weight: 600;
        color: var(--cauldron-c-ink);
        text-transform: uppercase;
        letter-spacing: 0.05em;
      }
      .desktop-nav {
        display: none;
        align-items: center;
        gap: var(--cauldron-space-6);
      }
      .nav-link {
        font-size: var(--cauldron-size-2);
        font-weight: 600;
        padding-top: var(--cauldron-space-3);
        padding-bottom: var(--cauldron-space-3);
      }
      .mobile-nav {
        position: relative;
      }
      .mobile-nav-toggle {
        list-style: none;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-height: 44px;
        min-width: 44px;
        padding-left: var(--cauldron-space-5);
        padding-right: var(--cauldron-space-5);
        border: 1px solid var(--cauldron-c-ink);
        border-radius: ${buttonRadius};
        background-color: var(--cauldron-c-bg);
        color: var(--cauldron-c-ink);
        font-size: var(--cauldron-size-2);
        font-weight: 600;
        cursor: pointer;
      }
      .mobile-nav-toggle::-webkit-details-marker {
        display: none;
      }
      .mobile-nav-toggle:hover {
        background-color: var(--cauldron-c-surface);
        box-shadow: 0 2px 6px var(--cauldron-c-line);
      }
      .mobile-nav-panel {
        margin-top: var(--cauldron-space-3);
        padding: var(--cauldron-space-4);
        background-color: var(--cauldron-c-bg);
        border: 1px solid var(--cauldron-c-line);
        border-radius: ${cardRadius};
        display: flex;
        flex-direction: column;
        gap: var(--cauldron-space-3);
      }
      .mobile-nav-panel a {
        min-height: 44px;
        display: flex;
        align-items: center;
        padding-left: var(--cauldron-space-3);
        padding-right: var(--cauldron-space-3);
      }
      @media (min-width: 768px) {
        .desktop-nav {
          display: flex;
        }
        .mobile-nav {
          display: none;
        }
      }
      .btn {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        padding: var(--cauldron-space-4) var(--cauldron-space-6);
        border-radius: ${buttonRadius};
        border: 1px solid transparent;
        font-weight: 600;
        font-size: var(--cauldron-size-2);
        cursor: pointer;
        text-decoration: none;
        transition: background-color var(--cauldron-motion-quick) var(--cauldron-motion-easing),
          border-color var(--cauldron-motion-quick) var(--cauldron-motion-easing),
          box-shadow var(--cauldron-motion-quick) var(--cauldron-motion-easing),
          opacity var(--cauldron-motion-quick) var(--cauldron-motion-easing);
      }
      .btn-primary {
        background-color: var(--cauldron-c-ink);
        color: var(--cauldron-c-bg);
        border-color: var(--cauldron-c-ink);
      }
      .btn-primary:hover {
        color: var(--cauldron-c-bg);
        text-decoration: none;
        opacity: 0.88;
        box-shadow: inset 0 0 0 2px var(--cauldron-c-line);
      }
      .btn-outline {
        border: 1px solid var(--cauldron-c-ink);
        background-color: transparent;
        color: var(--cauldron-c-ink);
      }
      .btn-outline:hover {
        text-decoration: none;
        background-color: var(--cauldron-c-surface);
        border-color: var(--cauldron-c-primary);
        box-shadow: 0 2px 6px var(--cauldron-c-line);
      }
      .page-main {
        padding-top: var(--cauldron-space-9);
        padding-bottom: var(--cauldron-space-9);
        flex: 1;
      }
      .hero {
        margin-bottom: var(--cauldron-space-9);
        max-width: 760px;
      }
      .hero-centered {
        margin-left: auto;
        margin-right: auto;
        text-align: center;
      }
      .eyebrow {
        display: block;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        font-size: var(--cauldron-size-1);
        font-weight: 600;
        color: var(--cauldron-c-ink);
        margin-bottom: var(--cauldron-space-4);
      }
      h1 {
        font-family: var(--cauldron-font-display);
        font-size: var(--cauldron-size-6);
        line-height: 1.12;
        margin-bottom: var(--cauldron-space-5);
        color: var(--cauldron-c-ink);
      }
      @media (min-width: 768px) {
        h1 {
          font-size: var(--cauldron-size-8);
        }
      }
      h2 {
        font-family: var(--cauldron-font-display);
        font-size: var(--cauldron-size-5);
        line-height: 1.25;
        color: var(--cauldron-c-ink);
      }
      h3 {
        font-family: var(--cauldron-font-display);
        font-size: var(--cauldron-size-4);
        line-height: 1.3;
        color: var(--cauldron-c-ink);
      }
      .lead {
        font-size: var(--cauldron-size-4);
        color: var(--cauldron-c-ink);
        line-height: 1.5;
        margin-bottom: var(--cauldron-space-6);
      }
      .actions {
        display: flex;
        gap: var(--cauldron-space-5);
        flex-wrap: wrap;
      }
      .actions-centered {
        justify-content: center;
      }
      .section-block {
        margin-bottom: var(--cauldron-space-9);
      }
      .section-heading-row {
        display: flex;
        justify-content: space-between;
        align-items: flex-end;
        gap: var(--cauldron-space-5);
        flex-wrap: wrap;
        border-bottom: 1px solid var(--cauldron-c-line);
        padding-bottom: var(--cauldron-space-4);
        margin-bottom: var(--cauldron-space-6);
      }
      .grid-3 {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(min(100%, 260px), 1fr));
        gap: var(--cauldron-space-6);
      }
      .card {
        background-color: var(--cauldron-c-surface);
        border: 1px solid var(--cauldron-c-line);
        border-radius: ${cardRadius};
        padding: var(--cauldron-space-7);
      }
      .card h3 {
        margin-bottom: var(--cauldron-space-3);
      }
      .media-placeholder {
        height: 180px;
        background-color: var(--cauldron-c-bg);
        border: 1px solid var(--cauldron-c-line);
        border-radius: var(--cauldron-radius-1);
        margin-bottom: var(--cauldron-space-5);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: var(--cauldron-size-2);
        color: var(--cauldron-c-ink);
      }
      .stack-list {
        display: flex;
        flex-direction: column;
        gap: var(--cauldron-space-6);
      }
      .row-item {
        display: flex;
        justify-content: space-between;
        align-items: baseline;
        flex-wrap: wrap;
        gap: var(--cauldron-space-4);
        border-bottom: 1px solid var(--cauldron-c-line);
        padding-bottom: var(--cauldron-space-5);
      }
      .index-row {
        display: grid;
        grid-template-columns: 1fr;
        gap: var(--cauldron-space-2);
        padding-top: var(--cauldron-space-5);
        padding-bottom: var(--cauldron-space-5);
        border-bottom: 1px solid var(--cauldron-c-line);
        font-size: var(--cauldron-size-3);
      }
      @media (min-width: 768px) {
        .index-row {
          grid-template-columns: 80px 1fr 200px 140px;
          gap: var(--cauldron-space-5);
        }
      }
      .back-link {
        display: inline-block;
        font-size: var(--cauldron-size-2);
        font-weight: 600;
        margin-bottom: var(--cauldron-space-5);
      }
      .meta-row {
        display: flex;
        align-items: center;
        flex-wrap: wrap;
        gap: var(--cauldron-space-4);
        font-size: var(--cauldron-size-2);
        border-top: 1px solid var(--cauldron-c-line);
        padding-top: var(--cauldron-space-5);
      }
      .meta-label {
        font-size: var(--cauldron-size-1);
        text-transform: uppercase;
        letter-spacing: 0.06em;
        font-weight: 600;
      }
      .price {
        font-weight: 700;
        font-size: var(--cauldron-size-3);
      }
      .form-stack {
        display: flex;
        flex-direction: column;
        gap: var(--cauldron-space-5);
      }
      .form-inline {
        display: flex;
        justify-content: center;
        gap: var(--cauldron-space-3);
        max-width: 440px;
        margin-left: auto;
        margin-right: auto;
        flex-wrap: wrap;
      }
      .field-label {
        display: block;
        font-weight: 600;
        font-size: var(--cauldron-size-2);
        margin-bottom: var(--cauldron-space-2);
      }
      .field-input {
        width: 100%;
        padding: var(--cauldron-space-4);
        border: 1px solid var(--cauldron-c-ink);
        border-radius: var(--cauldron-radius-1);
        background-color: var(--cauldron-c-surface);
        color: var(--cauldron-c-ink);
      }
      .field-input:hover {
        border-color: var(--cauldron-c-primary);
        box-shadow: 0 0 0 1px var(--cauldron-c-ink);
      }
      footer.site-footer {
        margin-top: auto;
        border-top: 1px solid var(--cauldron-c-line);
        background-color: var(--cauldron-c-surface);
        padding-top: var(--cauldron-space-8);
        padding-bottom: var(--cauldron-space-7);
        font-size: var(--cauldron-size-2);
        color: var(--cauldron-c-ink);
      }
      .footer-grid {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        flex-wrap: wrap;
        gap: var(--cauldron-space-7);
        margin-bottom: var(--cauldron-space-7);
      }
      .footer-heading {
        font-family: var(--cauldron-font-display);
        font-size: var(--cauldron-size-4);
        margin-bottom: var(--cauldron-space-3);
      }
      .footer-legal {
        border-top: 1px solid var(--cauldron-c-line);
        padding-top: var(--cauldron-space-5);
        font-size: var(--cauldron-size-1);
      }${options.extraCss ? `\n${options.extraCss}` : ''}
    </style>
  </head>
  <body>
    <header class="site-header">
      <div class="container nav-row">
        <div class="brand-group">
          <a href="/" class="brand-title">{title}</a>${subtitleHtml}
        </div>
        <nav class="desktop-nav" aria-label="Primary">
          ${navMarkup}
        </nav>
        <details class="mobile-nav">
          <summary class="mobile-nav-toggle" aria-label="Menu">Menu</summary>
          <div class="mobile-nav-panel">
            ${mobileNavMarkup}
          </div>
        </details>
      </div>
    </header>
    <slot />
    <footer class="site-footer">
      <div class="container">
        <div class="footer-grid">
          <div>
            ${options.footerLeft}
          </div>
          <div>
            ${options.footerRight}
          </div>
        </div>
        <p class="footer-legal">© {new Date().getFullYear()} {title}. Built with Cauldron.</p>
      </div>
    </footer>
    <script>
      document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') {
          for (const details of document.querySelectorAll('details.mobile-nav[open]')) {
            details.removeAttribute('open');
          }
        }
      });
    </script>
  </body>
</html>
`;
}

export function getTemplateFiles(
  templateId: string,
  projectName: string,
): Record<string, string> {
  const safeName = JSON.stringify(projectName);

  switch (templateId) {
    case 'sunday-table': {
      return {
        'src/layouts/Base.astro': renderStarterBase({
          navLinks: [
            { href: '/menu', label: 'Menu' },
            { href: '/visit', label: 'Hours & Location' },
            { href: '/visit', label: 'Book a Table', cta: true },
          ],
          cardRadius: 'var(--cauldron-radius-3)',
          buttonRadius: 'var(--cauldron-radius-4)',
          footerLeft: `<h2 class="footer-heading">{title}</h2>
            <p>42 Victoria Lane, Melbourne VIC 3000</p>
            <p>Direct inquiries: hello@example.com</p>`,
          footerRight: `<h2 class="footer-heading">Daily Service</h2>
            <p>Morning Hearth: 7:00 am – 11:30 am</p>
            <p>Long Lunch: 12:00 pm – 3:30 pm</p>`,
        }),
        'src/pages/index.astro': `---
import Base from '../layouts/Base.astro';

// The project's display name, kept as data.
const projectName = ${safeName};
---

<Base title={projectName}>
  <main class="container page-main">
    <section class="hero hero-centered">
      <span class="eyebrow">Local Bakery & Hearth Dining</span>
      <h1>{projectName}</h1>
      <p class="lead">Slow mornings, wood-fired stone baking, and long communal lunches crafted from morning harvest market produce.</p>
      <div class="actions actions-centered">
        <a href="/menu" class="btn btn-primary">View Daily Menu</a>
        <a href="/visit" class="btn btn-outline">Visit the Dining Room</a>
      </div>
    </section>

    <section class="grid-3 section-block">
      <article class="card">
        <h3>Morning Hearth</h3>
        <p>Hand-laminated sourdough pastries, cultured jersey butter, and seasonal stone-fruit preserves from 7:00 am daily.</p>
      </article>
      <article class="card">
        <h3>The Long Lunch</h3>
        <p>Four-course shared plates cooked over olive wood, accompanied by natural regional wines poured by the glass.</p>
      </article>
      <article class="card">
        <h3>Local Provenance</h3>
        <p>Heritage grains milled in the valley, dairy from small pasture herds, and organic vegetables harvested each dawn.</p>
      </article>
    </section>
  </main>
</Base>
`,
        'src/pages/menu.astro': `---
import Base from '../layouts/Base.astro';

const projectName = ${safeName};
---

<Base title={\`Seasonal Menu | \${projectName}\`}>
  <main class="container container-narrow page-main">
    <header class="hero hero-centered">
      <a href="/" class="back-link">← Back to Home</a>
      <h1>Daily Seasonal Menu</h1>
      <p class="lead">Updated each morning depending on what arrived from local growers.</p>
    </header>

    <section class="section-block">
      <div class="section-heading-row">
        <h2>Morning Hearth (7:00 – 11:30)</h2>
      </div>
      <div class="stack-list">
        <article class="row-item">
          <div>
            <h3>Country Sourdough Toast & Cultured Butter</h3>
            <p>Served with rooftop honeycomb or spiced blood plum preserve (V)</p>
          </div>
          <span class="price">$9.50</span>
        </article>
        <article class="row-item">
          <div>
            <h3>Soft Herb & Farm Egg Omelette</h3>
            <p>Locally smoked trout, fresh tarragon, crème fraîche, shaved fennel (GF)</p>
          </div>
          <span class="price">$24.00</span>
        </article>
      </div>
    </section>

    <section class="section-block">
      <div class="section-heading-row">
        <h2>Long Lunch (12:00 – 15:30)</h2>
      </div>
      <div class="stack-list">
        <article class="row-item">
          <div>
            <h3>Wood-Fired Porchetta & Salsa Verde</h3>
            <p>Crisp crackling, pickled mustard seeds, charred bitter leaves</p>
          </div>
          <span class="price">$36.00</span>
        </article>
        <article class="row-item">
          <div>
            <h3>Handmade Ricotta Gnocchi</h3>
            <p>Brown butter, crispy sage, roasted butternut squash, toasted pine nuts (V)</p>
          </div>
          <span class="price">$28.00</span>
        </article>
      </div>
    </section>
  </main>
</Base>
`,
        'src/pages/visit.astro': `---
import Base from '../layouts/Base.astro';

const projectName = ${safeName};
---

<Base title={\`Visit & Location | \${projectName}\`}>
  <main class="container container-narrow page-main">
    <header class="hero hero-centered">
      <a href="/" class="back-link">← Back to Home</a>
      <h1>Join Us at the Table</h1>
      <p class="lead">Walk-ins welcome for bakery service; reservations recommended for lunch.</p>
    </header>

    <section class="card section-block">
      <h2>Hours & Service Times</h2>
      <ul class="stack-list">
        <li class="row-item">
          <strong>Wednesday – Friday</strong>
          <span>7:30 am – 3:30 pm</span>
        </li>
        <li class="row-item">
          <strong>Saturday & Sunday</strong>
          <span>8:00 am – 4:00 pm</span>
        </li>
        <li class="row-item">
          <strong>Monday & Tuesday</strong>
          <span>Closed for foraging & baking</span>
        </li>
      </ul>
    </section>

    <section class="card">
      <h2>Location & Parking</h2>
      <p class="lead">
        Located on the corner of Victoria Lane and Little Collins. Dedicated visitor parking is situated behind the mill building, with step-free wheelchair access from the street entrance.
      </p>
      <a href="mailto:bookings@example.com" class="btn btn-primary">Book a Table via Email</a>
    </section>
  </main>
</Base>
`,
      };
    }

    case 'penta': {
      return {
        'src/layouts/Base.astro': renderStarterBase({
          navLinks: [
            { href: '/work', label: 'Work' },
            { href: '/about', label: 'Practice' },
            { href: '/about', label: 'Contact', cta: true },
          ],
          cardRadius: 'var(--cauldron-radius-1)',
          buttonRadius: 'var(--cauldron-radius-1)',
          footerLeft: `<h2 class="footer-heading">{title}</h2>
            <p>Architectural and spatial design practice.</p>`,
          footerRight: `<h2 class="footer-heading">Studios</h2>
            <p>Melbourne · Tokyo · Zürich</p>`,
        }),
        'src/pages/index.astro': `---
import Base from '../layouts/Base.astro';

// The project's display name, kept as data.
const projectName = ${safeName};
---

<Base title={projectName}>
  <main class="container page-main">
    <section class="hero">
      <span class="eyebrow">Architecture & Spatial Design</span>
      <h1>{projectName}</h1>
      <p class="lead">
        Permanent structures shaped by monolithic masonry, acoustic silence, and unyielding material integrity.
      </p>
    </section>

    <section class="section-block">
      <div class="section-heading-row">
        <h2>Selected Commissions</h2>
        <a href="/work" class="meta-label">View Index →</a>
      </div>

      <div class="grid-3">
        <article class="card">
          <div class="media-placeholder">[Project Photography]</div>
          <span class="meta-label">2025 · Residential</span>
          <h3>House in the Dunes</h3>
          <p>Flinders, Mornington Peninsula</p>
        </article>

        <article class="card">
          <div class="media-placeholder">[Project Photography]</div>
          <span class="meta-label">2024 · Civic</span>
          <h3>Concrete & Glass Pavilions</h3>
          <p>Kyoto Forest Reserve</p>
        </article>

        <article class="card">
          <div class="media-placeholder">[Project Photography]</div>
          <span class="meta-label">2024 · Alpine</span>
          <h3>Charred Timber Refuge</h3>
          <p>Mount Buller Summit</p>
        </article>
      </div>
    </section>
  </main>
</Base>
`,
        'src/pages/work.astro': `---
import Base from '../layouts/Base.astro';

const projectName = ${safeName};
---

<Base title={\`Work Archive | \${projectName}\`}>
  <main class="container page-main">
    <header class="hero">
      <a href="/" class="back-link">← Back to Studio</a>
      <h1>Project Index</h1>
      <p class="lead">Archive of built works, installations, and competitions (2020–2026).</p>
    </header>

    <div class="stack-list">
      <div class="index-row">
        <span class="meta-label">Year</span>
        <span class="meta-label">Project</span>
        <span class="meta-label">Typology</span>
        <span class="meta-label">Location</span>
      </div>
      <article class="index-row">
        <span>2025</span>
        <strong>House in the Dunes</strong>
        <span>Private Residence</span>
        <span>Flinders</span>
      </article>
      <article class="index-row">
        <span>2024</span>
        <strong>Concrete & Glass Pavilions</strong>
        <span>Exhibition Gallery</span>
        <span>Kyoto</span>
      </article>
      <article class="index-row">
        <span>2024</span>
        <strong>Charred Timber Refuge</strong>
        <span>Alpine Shelter</span>
        <span>Mount Buller</span>
      </article>
      <article class="index-row">
        <span>2023</span>
        <strong>The Brick Workshop</strong>
        <span>Adaptive Reuse</span>
        <span>Collingwood</span>
      </article>
    </div>
  </main>
</Base>
`,
        'src/pages/about.astro': `---
import Base from '../layouts/Base.astro';

const projectName = ${safeName};
---

<Base title={\`Practice & Manifesto | \${projectName}\`}>
  <main class="container container-narrow page-main">
    <header class="hero">
      <a href="/" class="back-link">← Back to Studio</a>
      <h1>Practice Manifesto</h1>
    </header>

    <div class="stack-list">
      <p class="lead">
        We reject disposable novelty. Our practice is committed to buildings that mature with dignity over centuries rather than decaying over decades.
      </p>
      <p>
        Every project begins with geological survey, climate orientation, and acoustic isolation. We treat light as a structural material and weight as an emotional anchor.
      </p>
    </div>

    <section class="section-block card">
      <h2>Inquiries & Appointments</h2>
      <p>Direct client inquiries and competition submissions:</p>
      <p><strong>studio@example.com · +61 3 9419 0000</strong></p>
    </section>
  </main>
</Base>
`,
      };
    }

    case 'good-trade': {
      return {
        'src/layouts/Base.astro': renderStarterBase({
          navLinks: [
            { href: '/services', label: 'Services' },
            { href: '/quote', label: 'Request a Quote', cta: true },
          ],
          subtitle: 'Licensed Builders & Carpenters #381920C',
          headerBorderWidth: '2px',
          cardRadius: 'var(--cauldron-radius-1)',
          buttonRadius: 'var(--cauldron-radius-1)',
          footerLeft: `<h2 class="footer-heading">{title}</h2>
            <p>Master Builders Association Member</p>
            <p>Public Liability Insurance $20M</p>`,
          footerRight: `<h2 class="footer-heading">Service Areas</h2>
            <p>Inner Melbourne & Northern Suburbs</p>
            <p>Direct line: 1300 000 888</p>`,
        }),
        'src/pages/index.astro': `---
import Base from '../layouts/Base.astro';

// The project's display name, kept as data.
const projectName = ${safeName};
---

<Base title={projectName}>
  <main class="container page-main">
    <section class="card hero">
      <span class="eyebrow">Master Builders & Carpentry</span>
      <h1>{projectName}</h1>
      <p class="lead">
        Solid structural framing, architectural timber extensions, and honest, reliable site craftsmanship. Fully licensed and guaranteed for 20 years.
      </p>
      <div class="actions">
        <a href="/quote" class="btn btn-primary">Get an Upfront Quote</a>
        <a href="/services" class="btn btn-outline">View Our Services</a>
      </div>
    </section>

    <section class="grid-3 section-block">
      <article class="card">
        <h3>Structural Framing</h3>
        <p>Heavy timber wall frames, roof trusses, sub-floor rectification, and load-bearing beam installations.</p>
      </article>
      <article class="card">
        <h3>Extensions & Decks</h3>
        <p>Architectural spotted gum and blackbutt hardwood decks, pergolas, and seamless indoor-outdoor living additions.</p>
      </article>
      <article class="card">
        <h3>Heritage Restorations</h3>
        <p>Victorian and Edwardian weatherboard repairs, sash window rebuilding, and ornamental timber fretwork.</p>
      </article>
    </section>
  </main>
</Base>
`,
        'src/pages/services.astro': `---
import Base from '../layouts/Base.astro';

const projectName = ${safeName};
---

<Base title={\`Services & Capabilities | \${projectName}\`}>
  <main class="container container-narrow page-main">
    <header class="hero">
      <a href="/" class="back-link">← Back to Home</a>
      <h1>Trade Capabilities</h1>
      <p class="lead">Scope of works, compliance standards, and contractor management.</p>
    </header>

    <div class="stack-list">
      <section class="card">
        <h2>1. Residential Extensions & Renovations</h2>
        <p>We manage the build from council permit sign-off through lockup and handover. Complete project supervision with daily photo reports.</p>
        <p class="meta-label">Typical duration: 8–16 weeks</p>
      </section>

      <section class="card">
        <h2>2. Structural Alterations & Wall Removals</h2>
        <p>Certified engineer-stamped structural steel and LVL installation to create open-plan kitchen and living zones safely.</p>
        <p class="meta-label">Fully engineered & signed off</p>
      </section>
    </div>
  </main>
</Base>
`,
        'src/pages/quote.astro': `---
import Base from '../layouts/Base.astro';

const projectName = ${safeName};
---

<Base title={\`Request a Quote | \${projectName}\`}>
  <main class="container container-narrow page-main">
    <header class="hero hero-centered">
      <a href="/" class="back-link">← Back to Home</a>
      <h1>Request an Itemised Quote</h1>
      <p class="lead">We provide transparent, line-item estimates with zero hidden margins.</p>
    </header>

    <div class="card">
      <form class="form-stack">
        <div>
          <label class="field-label" for="quote-name">Full Name</label>
          <input id="quote-name" class="field-input" type="text" placeholder="e.g. David Campbell" />
        </div>
        <div>
          <label class="field-label" for="quote-phone">Phone Number</label>
          <input id="quote-phone" class="field-input" type="tel" placeholder="0400 000 000" />
        </div>
        <div>
          <label class="field-label" for="quote-suburb">Project Suburb & Postcode</label>
          <input id="quote-suburb" class="field-input" type="text" placeholder="e.g. Northcote 3070" />
        </div>
        <div>
          <label class="field-label" for="quote-scope">Project Scope</label>
          <textarea id="quote-scope" class="field-input" rows="4" placeholder="Briefly describe your project (e.g. timber deck, rear extension, wall removal)"></textarea>
        </div>
        <button type="button" class="btn btn-primary">Submit Quote Request</button>
      </form>
    </div>
  </main>
</Base>
`,
      };
    }

    case 'the-desk': {
      return {
        'src/layouts/Base.astro': renderStarterBase({
          navLinks: [
            { href: '/', label: 'Dispatch' },
            { href: '/essays', label: 'Essay Archive' },
          ],
          centeredHeader: true,
          cardRadius: 'var(--cauldron-radius-2)',
          buttonRadius: 'var(--cauldron-radius-1)',
          footerLeft: `<h2 class="footer-heading">{title}</h2>
            <p>Published with independent editorial care.</p>`,
          footerRight: `<h2 class="footer-heading">Colophon</h2>
            <p>Typography driven by Cauldron direction tokens.</p>`,
        }),
        'src/pages/index.astro': `---
import Base from '../layouts/Base.astro';

// The project's display name, kept as data.
const projectName = ${safeName};
---

<Base title={projectName}>
  <main class="container container-narrow page-main">
    <section class="hero">
      <span class="eyebrow">Featured Lead Essay</span>
      <h1>{projectName}</h1>
      <p class="lead">
        “In an era consumed by automated production, deliberate slowness and tactile attention become the most radical virtues an author can practice.”
      </p>
      <div class="meta-row">
        <span>November 2026</span>
        <span>·</span>
        <span>8 min read</span>
        <span>·</span>
        <strong>On Physical Craft</strong>
      </div>
    </section>

    <section class="section-block">
      <div class="section-heading-row">
        <h2>Recent Dispatches</h2>
      </div>
      <div class="stack-list">
        <article>
          <span class="meta-label">October 24, 2026 · 6 min read</span>
          <h3><a href="/essays">The Architecture of the Personal Archive</a></h3>
          <p>How local markdown notes, plain text libraries, and static generation preserve writing across decades of platform churn.</p>
        </article>
        <article>
          <span class="meta-label">September 18, 2026 · 4 min read</span>
          <h3><a href="/essays">The Quiet Room: Setting Up an Atelier for Focus</a></h3>
          <p>Reflections on physical desks, natural daylight, fountain pen ink, and the rituals of drafting without notifications.</p>
        </article>
      </div>
    </section>

    <section class="card hero-centered">
      <h2>Quiet Dispatches in Your Inbox</h2>
      <p class="lead">
        Sent twice a month on quiet Sunday mornings. No tracking, no sponsors, no automated funnels.
      </p>
      <form class="form-inline">
        <label class="field-label" for="subscribe-email">Email address</label>
        <input id="subscribe-email" class="field-input" type="email" placeholder="you@domain.com" />
        <button type="button" class="btn btn-primary">Subscribe</button>
      </form>
    </section>
  </main>
</Base>
`,
        'src/pages/essays.astro': `---
import Base from '../layouts/Base.astro';

const projectName = ${safeName};
---

<Base title={\`Essay Archive | \${projectName}\`}>
  <main class="container container-narrow page-main">
    <header class="hero">
      <a href="/" class="back-link">← Back to Dispatch</a>
      <h1>The Essay Archive</h1>
      <p class="lead">Chronological index of published manuscripts and field notes.</p>
    </header>

    <div class="stack-list">
      <article class="row-item">
        <div>
          <span class="meta-label">November 2026 · Essay</span>
          <h2>Deliberate Slowness and Tactile Attention</h2>
          <p>On resisting instantaneous production in favor of crafted durability.</p>
        </div>
      </article>
      <article class="row-item">
        <div>
          <span class="meta-label">October 2026 · Field Note</span>
          <h2>The Architecture of the Personal Archive</h2>
          <p>Preserving writing with local markdown files and static site generators.</p>
        </div>
      </article>
      <article class="row-item">
        <div>
          <span class="meta-label">September 2026 · Essay</span>
          <h2>The Quiet Room: Setting Up an Atelier for Focus</h2>
          <p>Physical desks, morning light, and drafting without notifications.</p>
        </div>
      </article>
    </div>
  </main>
</Base>
`,
      };
    }

    default: {
      return {
        'src/layouts/Base.astro': `---
import '../../cauldron/tokens.css';

interface Props {
  title: string;
}
const { title } = Astro.props;
---
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>{title}</title>
    <style is:global>
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body {
        background-color: var(--cauldron-c-bg);
        color: var(--cauldron-c-ink);
        font-family: var(--cauldron-font-body);
        font-size: var(--cauldron-size-3);
        line-height: 1.6;
        padding: var(--cauldron-space-7);
      }
      h1 {
        font-family: var(--cauldron-font-display);
        font-size: var(--cauldron-size-7);
        margin-bottom: var(--cauldron-space-4);
      }
    </style>
  </head>
  <body>
    <slot />
  </body>
</html>
`,
        'src/pages/index.astro': `---
import Base from '../layouts/Base.astro';

// The project's display name, kept as data. Astro renders {projectName} as
// plain text, so any characters it contains stay text.
const projectName = ${safeName};
---
<Base title={projectName}>
  <main>
    <h1>{projectName}</h1>
    <p>A new Astro site, ready to design.</p>
  </main>
</Base>
`,
      };
    }
  }
}
