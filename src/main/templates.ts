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

export function getTemplateFiles(
  templateId: string,
  projectName: string,
): Record<string, string> {
  const safeName = JSON.stringify(projectName);

  switch (templateId) {
    case 'sunday-table': {
      return {
        'src/layouts/Base.astro': `---
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
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;600;700&family=Karla:wght@400;500;600&display=swap" rel="stylesheet" />
    <style is:global>
      :root {
        --c-bg: #f8f4e9;
        --c-surface: #fffdf7;
        --c-text: #2a1712;
        --c-accent: #b84b30;
        --c-accent-hover: #9c3b24;
        --c-muted: #6b5a52;
        --c-line: #e3d9c8;
        --font-display: 'Fraunces', serif;
        --font-body: 'Karla', sans-serif;
      }
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body {
        background-color: var(--c-bg);
        color: var(--c-text);
        font-family: var(--font-body);
        line-height: 1.6;
        min-height: 100vh;
        display: flex;
        flex-direction: column;
      }
      a { color: inherit; text-decoration: none; }
      .container { max-width: 1080px; margin: 0 auto; padding: 0 1.5rem; width: 100%; }
      header.site-header {
        border-bottom: 1px solid var(--c-line);
        background: var(--c-surface);
        padding: 1.25rem 0;
      }
      .nav-row { display: flex; align-items: center; justify-content: space-between; gap: 1.5rem; }
      .brand-title { font-family: var(--font-display); font-size: 1.5rem; font-weight: 700; color: var(--c-text); }
      .nav-links { display: flex; align-items: center; gap: 1.75rem; }
      .nav-links a { font-weight: 500; font-size: 0.95rem; }
      .nav-links a:hover { color: var(--c-accent); }
      .btn {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        padding: 0.65rem 1.4rem;
        border-radius: 9999px;
        font-weight: 600;
        font-size: 0.95rem;
        cursor: pointer;
        transition: all 0.2s ease;
      }
      .btn-primary { background: var(--c-accent); color: #fff; }
      .btn-primary:hover { background: var(--c-accent-hover); }
      .btn-outline { border: 1.5px solid var(--c-line); background: transparent; }
      .btn-outline:hover { border-color: var(--c-text); }
      footer.site-footer {
        margin-top: auto;
        border-top: 1px solid var(--c-line);
        background: var(--c-surface);
        padding: 3rem 0 2rem;
        font-size: 0.9rem;
        color: var(--c-muted);
      }
    </style>
  </head>
  <body>
    <header class="site-header">
      <div class="container nav-row">
        <a href="/" class="brand-title">{title}</a>
        <nav class="nav-links">
          <a href="/menu">Menu</a>
          <a href="/visit">Hours & Location</a>
          <a href="/visit" class="btn btn-primary">Book a Table</a>
        </nav>
      </div>
    </header>
    <slot />
    <footer class="site-footer">
      <div class="container">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 2rem; margin-bottom: 2rem;">
          <div>
            <h4 style="font-family: var(--font-display); color: var(--c-text); font-size: 1.15rem; margin-bottom: 0.5rem;">{title}</h4>
            <p>42 Victoria Lane, Melbourne VIC 3000</p>
            <p>Direct inquiries: hello@example.com</p>
          </div>
          <div>
            <h5 style="color: var(--c-text); margin-bottom: 0.5rem;">Daily Service</h5>
            <p>Morning Hearth: 7:00 am – 11:30 am</p>
            <p>Long Lunch: 12:00 pm – 3:30 pm</p>
          </div>
        </div>
        <p style="border-top: 1px solid var(--c-line); padding-top: 1.5rem; font-size: 0.85rem;">© {new Date().getFullYear()} {title}. Built with Cauldron.</p>
      </div>
    </footer>
  </body>
</html>
`,
        'src/pages/index.astro': `---
import Base from '../layouts/Base.astro';

// The project's display name, kept as data.
const projectName = ${safeName};
---

<Base title={projectName}>
  <main class="container" style="padding: 4rem 1.5rem;">
    <section class="hero" style="text-align: center; max-width: 760px; margin: 0 auto 5rem;">
      <span style="display: inline-block; text-transform: uppercase; letter-spacing: 0.1em; font-size: 0.8rem; font-weight: 600; color: var(--c-accent); margin-bottom: 1rem;">Local Bakery & Hearth Dining</span>
      <h1 style="font-family: var(--font-display); font-size: 3.25rem; line-height: 1.15; margin-bottom: 1.5rem; color: var(--c-text);">{projectName}</h1>
      <p style="font-size: 1.25rem; color: var(--c-muted); margin-bottom: 2.5rem; line-height: 1.5;">Slow mornings, wood-fired stone baking, and long communal lunches crafted from morning harvest market produce.</p>
      <div style="display: flex; gap: 1rem; justify-content: center; flex-wrap: wrap;">
        <a href="/menu" class="btn btn-primary">View Daily Menu</a>
        <a href="/visit" class="btn btn-outline">Visit the Dining Room</a>
      </div>
    </section>

    <section class="grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 2rem; margin-bottom: 5rem;">
      <article style="background: var(--c-surface); border: 1px solid var(--c-line); border-radius: 16px; padding: 2rem;">
        <h3 style="font-family: var(--font-display); font-size: 1.4rem; margin-bottom: 0.75rem; color: var(--c-text);">Morning Hearth</h3>
        <p style="color: var(--c-muted); line-height: 1.55;">Hand-laminated sourdough pastries, cultured jersey butter, and seasonal stone-fruit preserves from 7:00 am daily.</p>
      </article>
      <article style="background: var(--c-surface); border: 1px solid var(--c-line); border-radius: 16px; padding: 2rem;">
        <h3 style="font-family: var(--font-display); font-size: 1.4rem; margin-bottom: 0.75rem; color: var(--c-text);">The Long Lunch</h3>
        <p style="color: var(--c-muted); line-height: 1.55;">Four-course shared plates cooked over olive wood, accompanied by natural regional wines poured by the glass.</p>
      </article>
      <article style="background: var(--c-surface); border: 1px solid var(--c-line); border-radius: 16px; padding: 2rem;">
        <h3 style="font-family: var(--font-display); font-size: 1.4rem; margin-bottom: 0.75rem; color: var(--c-text);">Local Provenance</h3>
        <p style="color: var(--c-muted); line-height: 1.55;">Heritage grains milled in the valley, dairy from small pasture herds, and organic vegetables harvested each dawn.</p>
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
  <main class="container" style="padding: 4rem 1.5rem; max-width: 820px;">
    <header style="margin-bottom: 3.5rem; text-align: center;">
      <a href="/" style="font-size: 0.9rem; color: var(--c-accent); font-weight: 500; margin-bottom: 1rem; display: inline-block;">← Back to Home</a>
      <h1 style="font-family: var(--font-display); font-size: 2.75rem; color: var(--c-text); margin-bottom: 0.5rem;">Daily Seasonal Menu</h1>
      <p style="color: var(--c-muted); font-size: 1.1rem;">Updated each morning depending on what arrived from local growers.</p>
    </header>

    <section style="margin-bottom: 3.5rem;">
      <h2 style="font-family: var(--font-display); font-size: 1.75rem; border-bottom: 1.5px solid var(--c-line); padding-bottom: 0.75rem; margin-bottom: 1.75rem; color: var(--c-text);">Morning Hearth (7:00 – 11:30)</h2>
      <div style="display: flex; flex-direction: column; gap: 1.75rem;">
        <article style="display: flex; justify-content: space-between; align-items: baseline; gap: 1rem; border-bottom: 1px dashed var(--c-line); padding-bottom: 1.25rem;">
          <div>
            <h3 style="font-size: 1.15rem; font-weight: 600; color: var(--c-text);">Country Sourdough Toast & Cultured Butter</h3>
            <p style="color: var(--c-muted); font-size: 0.95rem; margin-top: 0.25rem;">Served with rooftop honeycomb or spiced blood plum preserve (V)</p>
          </div>
          <span style="font-weight: 700; font-size: 1.1rem; color: var(--c-accent);">$9.50</span>
        </article>
        <article style="display: flex; justify-content: space-between; align-items: baseline; gap: 1rem; border-bottom: 1px dashed var(--c-line); padding-bottom: 1.25rem;">
          <div>
            <h3 style="font-size: 1.15rem; font-weight: 600; color: var(--c-text);">Soft Herb & Farm Egg Omelette</h3>
            <p style="color: var(--c-muted); font-size: 0.95rem; margin-top: 0.25rem;">Locally smoked trout, fresh tarragon, crème fraîche, shaved fennel (GF)</p>
          </div>
          <span style="font-weight: 700; font-size: 1.1rem; color: var(--c-accent);">$24.00</span>
        </article>
      </div>
    </section>

    <section style="margin-bottom: 3.5rem;">
      <h2 style="font-family: var(--font-display); font-size: 1.75rem; border-bottom: 1.5px solid var(--c-line); padding-bottom: 0.75rem; margin-bottom: 1.75rem; color: var(--c-text);">Long Lunch (12:00 – 15:30)</h2>
      <div style="display: flex; flex-direction: column; gap: 1.75rem;">
        <article style="display: flex; justify-content: space-between; align-items: baseline; gap: 1rem; border-bottom: 1px dashed var(--c-line); padding-bottom: 1.25rem;">
          <div>
            <h3 style="font-size: 1.15rem; font-weight: 600; color: var(--c-text);">Wood-Fired Porchetta & Salsa Verde</h3>
            <p style="color: var(--c-muted); font-size: 0.95rem; margin-top: 0.25rem;">Crisp crackling, pickled mustard seeds, charred bitter leaves</p>
          </div>
          <span style="font-weight: 700; font-size: 1.1rem; color: var(--c-accent);">$36.00</span>
        </article>
        <article style="display: flex; justify-content: space-between; align-items: baseline; gap: 1rem; border-bottom: 1px dashed var(--c-line); padding-bottom: 1.25rem;">
          <div>
            <h3 style="font-size: 1.15rem; font-weight: 600; color: var(--c-text);">Handmade Ricotta Gnocchi</h3>
            <p style="color: var(--c-muted); font-size: 0.95rem; margin-top: 0.25rem;">Brown butter, crispy sage, roasted butternut squash, toasted pine nuts (V)</p>
          </div>
          <span style="font-weight: 700; font-size: 1.1rem; color: var(--c-accent);">$28.00</span>
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
  <main class="container" style="padding: 4rem 1.5rem; max-width: 820px;">
    <header style="margin-bottom: 3.5rem; text-align: center;">
      <a href="/" style="font-size: 0.9rem; color: var(--c-accent); font-weight: 500; margin-bottom: 1rem; display: inline-block;">← Back to Home</a>
      <h1 style="font-family: var(--font-display); font-size: 2.75rem; color: var(--c-text); margin-bottom: 0.5rem;">Join Us at the Table</h1>
      <p style="color: var(--c-muted); font-size: 1.1rem;">Walk-ins welcome for bakery service; reservations recommended for lunch.</p>
    </header>

    <div style="background: var(--c-surface); border: 1px solid var(--c-line); border-radius: 16px; padding: 2.5rem; margin-bottom: 3rem;">
      <h2 style="font-family: var(--font-display); font-size: 1.6rem; margin-bottom: 1rem; color: var(--c-text);">Hours & Service Times</h2>
      <ul style="list-style: none; display: flex; flex-direction: column; gap: 0.75rem; color: var(--c-muted);">
        <li style="display: flex; justify-content: space-between; border-bottom: 1px solid var(--c-line); padding-bottom: 0.5rem;">
          <strong>Wednesday – Friday</strong>
          <span>7:30 am – 3:30 pm</span>
        </li>
        <li style="display: flex; justify-content: space-between; border-bottom: 1px solid var(--c-line); padding-bottom: 0.5rem;">
          <strong>Saturday & Sunday</strong>
          <span>8:00 am – 4:00 pm</span>
        </li>
        <li style="display: flex; justify-content: space-between; color: var(--c-accent); font-weight: 600;">
          <strong>Monday & Tuesday</strong>
          <span>Closed for foraging & baking</span>
        </li>
      </ul>
    </div>

    <div style="background: var(--c-surface); border: 1px solid var(--c-line); border-radius: 16px; padding: 2.5rem;">
      <h2 style="font-family: var(--font-display); font-size: 1.6rem; margin-bottom: 1rem; color: var(--c-text);">Location & Parking</h2>
      <p style="color: var(--c-muted); margin-bottom: 1.5rem; line-height: 1.6;">
        Located on the corner of Victoria Lane and Little Collins. Dedicated visitor parking is situated behind the mill building, with step-free wheelchair access from the street entrance.
      </p>
      <a href="mailto:bookings@example.com" class="btn btn-primary">Book a Table via Email</a>
    </div>
  </main>
</Base>
`,
      };
    }

    case 'penta': {
      return {
        'src/layouts/Base.astro': `---
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
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Syne:wght@500;700;800&family=Plus+Jakarta+Sans:wght@400;500;600&display=swap" rel="stylesheet" />
    <style is:global>
      :root {
        --c-bg: #111111;
        --c-surface: #1a1a1a;
        --c-text: #f5f5f5;
        --c-accent: #ffffff;
        --c-muted: #999999;
        --c-line: #2a2a2a;
        --font-display: 'Syne', sans-serif;
        --font-body: 'Plus Jakarta Sans', sans-serif;
      }
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body {
        background-color: var(--c-bg);
        color: var(--c-text);
        font-family: var(--font-body);
        line-height: 1.5;
        min-height: 100vh;
        display: flex;
        flex-direction: column;
      }
      a { color: inherit; text-decoration: none; }
      .container { max-width: 1200px; margin: 0 auto; padding: 0 2rem; width: 100%; }
      header.site-header {
        border-bottom: 1px solid var(--c-line);
        padding: 1.5rem 0;
      }
      .nav-row { display: flex; align-items: center; justify-content: space-between; }
      .brand-title { font-family: var(--font-display); font-size: 1.4rem; font-weight: 800; letter-spacing: -0.02em; }
      .nav-links { display: flex; align-items: center; gap: 2rem; }
      .nav-links a { font-size: 0.9rem; font-weight: 500; text-transform: uppercase; letter-spacing: 0.05em; color: var(--c-muted); }
      .nav-links a:hover { color: var(--c-accent); }
      footer.site-footer {
        margin-top: auto;
        border-top: 1px solid var(--c-line);
        padding: 3rem 0;
        font-size: 0.85rem;
        color: var(--c-muted);
      }
    </style>
  </head>
  <body>
    <header class="site-header">
      <div class="container nav-row">
        <a href="/" class="brand-title">{title}</a>
        <nav class="nav-links">
          <a href="/work">Work</a>
          <a href="/about">Practice</a>
          <a href="/about" style="color: var(--c-accent); border: 1px solid var(--c-line); padding: 0.4rem 1rem; border-radius: 4px;">Contact</a>
        </nav>
      </div>
    </header>
    <slot />
    <footer class="site-footer">
      <div class="container" style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem;">
        <p>© {new Date().getFullYear()} {title}. Architectural and spatial design practice.</p>
        <p style="letter-spacing: 0.05em;">Melbourne · Tokyo · Zürich</p>
      </div>
    </footer>
  </body>
</html>
`,
        'src/pages/index.astro': `---
import Base from '../layouts/Base.astro';

// The project's display name, kept as data.
const projectName = ${safeName};
---

<Base title={projectName}>
  <main class="container" style="padding: 5rem 2rem;">
    <section style="margin-bottom: 6rem;">
      <span style="font-size: 0.85rem; text-transform: uppercase; letter-spacing: 0.15em; color: var(--c-muted); display: block; margin-bottom: 1.5rem;">Architecture & Spatial Design</span>
      <h1 style="font-family: var(--font-display); font-size: clamp(2.5rem, 6vw, 5rem); font-weight: 800; line-height: 1.05; letter-spacing: -0.03em; margin-bottom: 2rem; max-width: 960px;">
        {projectName}
      </h1>
      <p style="font-size: 1.35rem; color: var(--c-muted); max-width: 680px; line-height: 1.5;">
        Permanent structures shaped by monolithic masonry, acoustic silence, and unyielding material integrity.
      </p>
    </section>

    <section style="margin-bottom: 6rem;">
      <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 2.5rem; border-bottom: 1px solid var(--c-line); padding-bottom: 1rem;">
        <h2 style="font-family: var(--font-display); font-size: 1.5rem; font-weight: 700;">Selected Commissions</h2>
        <a href="/work" style="font-size: 0.9rem; text-transform: uppercase; letter-spacing: 0.05em; color: var(--c-muted);">View Index →</a>
      </div>

      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 2.5rem;">
        <article style="background: var(--c-surface); border: 1px solid var(--c-line); padding: 2rem; border-radius: 4px;">
          <div style="height: 220px; background: #222222; border-radius: 2px; margin-bottom: 1.5rem; display: flex; align-items: center; justify-content: center; color: #555; font-size: 0.9rem;">
            [Project Photography]
          </div>
          <span style="font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.1em; color: var(--c-muted);">2025 · Residential</span>
          <h3 style="font-family: var(--font-display); font-size: 1.35rem; margin-top: 0.5rem;">House in the Dunes</h3>
          <p style="color: var(--c-muted); font-size: 0.95rem; margin-top: 0.5rem;">Flinders, Mornington Peninsula</p>
        </article>

        <article style="background: var(--c-surface); border: 1px solid var(--c-line); padding: 2rem; border-radius: 4px;">
          <div style="height: 220px; background: #222222; border-radius: 2px; margin-bottom: 1.5rem; display: flex; align-items: center; justify-content: center; color: #555; font-size: 0.9rem;">
            [Project Photography]
          </div>
          <span style="font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.1em; color: var(--c-muted);">2024 · Civic</span>
          <h3 style="font-family: var(--font-display); font-size: 1.35rem; margin-top: 0.5rem;">Concrete & Glass Pavilions</h3>
          <p style="color: var(--c-muted); font-size: 0.95rem; margin-top: 0.5rem;">Kyoto Forest Reserve</p>
        </article>

        <article style="background: var(--c-surface); border: 1px solid var(--c-line); padding: 2rem; border-radius: 4px;">
          <div style="height: 220px; background: #222222; border-radius: 2px; margin-bottom: 1.5rem; display: flex; align-items: center; justify-content: center; color: #555; font-size: 0.9rem;">
            [Project Photography]
          </div>
          <span style="font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.1em; color: var(--c-muted);">2024 · Alpine</span>
          <h3 style="font-family: var(--font-display); font-size: 1.35rem; margin-top: 0.5rem;">Charred Timber Refuge</h3>
          <p style="color: var(--c-muted); font-size: 0.95rem; margin-top: 0.5rem;">Mount Buller Summit</p>
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
  <main class="container" style="padding: 5rem 2rem;">
    <header style="margin-bottom: 4rem;">
      <a href="/" style="font-size: 0.85rem; text-transform: uppercase; letter-spacing: 0.1em; color: var(--c-muted); display: inline-block; margin-bottom: 1.5rem;">← Back to Studio</a>
      <h1 style="font-family: var(--font-display); font-size: 3rem; font-weight: 800; letter-spacing: -0.02em;">Project Index</h1>
      <p style="color: var(--c-muted); font-size: 1.15rem; margin-top: 0.5rem;">Archive of built works, installations, and competitions (2020–2026).</p>
    </header>

    <div style="display: flex; flex-direction: column; gap: 1.5rem;">
      <div style="display: grid; grid-template-columns: 80px 1fr 200px 140px; border-bottom: 1px solid var(--c-line); padding-bottom: 1rem; color: var(--c-muted); font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.1em;">
        <span>Year</span>
        <span>Project</span>
        <span>Typology</span>
        <span style="text-align: right;">Location</span>
      </div>
      <article style="display: grid; grid-template-columns: 80px 1fr 200px 140px; padding: 1.25rem 0; border-bottom: 1px solid var(--c-line); font-size: 1.05rem;">
        <span style="color: var(--c-muted);">2025</span>
        <strong style="color: var(--c-accent);">House in the Dunes</strong>
        <span style="color: var(--c-muted);">Private Residence</span>
        <span style="text-align: right; color: var(--c-muted);">Flinders</span>
      </article>
      <article style="display: grid; grid-template-columns: 80px 1fr 200px 140px; padding: 1.25rem 0; border-bottom: 1px solid var(--c-line); font-size: 1.05rem;">
        <span style="color: var(--c-muted);">2024</span>
        <strong style="color: var(--c-accent);">Concrete & Glass Pavilions</strong>
        <span style="color: var(--c-muted);">Exhibition Gallery</span>
        <span style="text-align: right; color: var(--c-muted);">Kyoto</span>
      </article>
      <article style="display: grid; grid-template-columns: 80px 1fr 200px 140px; padding: 1.25rem 0; border-bottom: 1px solid var(--c-line); font-size: 1.05rem;">
        <span style="color: var(--c-muted);">2024</span>
        <strong style="color: var(--c-accent);">Charred Timber Refuge</strong>
        <span style="color: var(--c-muted);">Alpine Shelter</span>
        <span style="text-align: right; color: var(--c-muted);">Mount Buller</span>
      </article>
      <article style="display: grid; grid-template-columns: 80px 1fr 200px 140px; padding: 1.25rem 0; border-bottom: 1px solid var(--c-line); font-size: 1.05rem;">
        <span style="color: var(--c-muted);">2023</span>
        <strong style="color: var(--c-accent);">The Brick Workshop</strong>
        <span style="color: var(--c-muted);">Adaptive Reuse</span>
        <span style="text-align: right; color: var(--c-muted);">Collingwood</span>
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
  <main class="container" style="padding: 5rem 2rem; max-width: 860px;">
    <header style="margin-bottom: 4rem;">
      <a href="/" style="font-size: 0.85rem; text-transform: uppercase; letter-spacing: 0.1em; color: var(--c-muted); display: inline-block; margin-bottom: 1.5rem;">← Back to Studio</a>
      <h1 style="font-family: var(--font-display); font-size: 3rem; font-weight: 800; letter-spacing: -0.02em;">Practice Manifesto</h1>
    </header>

    <div style="font-size: 1.25rem; line-height: 1.7; color: var(--c-text); display: flex; flex-direction: column; gap: 2rem;">
      <p>
        We reject disposable novelty. Our practice is committed to buildings that mature with dignity over centuries rather than decaying over decades.
      </p>
      <p style="color: var(--c-muted);">
        Every project begins with geological survey, climate orientation, and acoustic isolation. We treat light as a structural material and weight as an emotional anchor.
      </p>
    </div>

    <section style="margin-top: 5rem; border-top: 1px solid var(--c-line); padding-top: 3rem;">
      <h2 style="font-family: var(--font-display); font-size: 1.5rem; margin-bottom: 1.5rem;">Inquiries & Appointments</h2>
      <p style="color: var(--c-muted); margin-bottom: 1rem;">Direct client inquiries and competition submissions:</p>
      <p style="font-size: 1.15rem; color: var(--c-accent);">studio@example.com · +61 3 9419 0000</p>
    </section>
  </main>
</Base>
`,
      };
    }

    case 'good-trade': {
      return {
        'src/layouts/Base.astro': `---
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
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Archivo:wght@600;700;800&family=Work+Sans:wght@400;500;600&display=swap" rel="stylesheet" />
    <style is:global>
      :root {
        --c-bg: #f0ece3;
        --c-surface: #ffffff;
        --c-text: #23252a;
        --c-accent: #a9714b;
        --c-accent-hover: #8e5c3b;
        --c-muted: #736e68;
        --c-line: #dad5c9;
        --font-display: 'Archivo', sans-serif;
        --font-body: 'Work Sans', sans-serif;
      }
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body {
        background-color: var(--c-bg);
        color: var(--c-text);
        font-family: var(--font-body);
        line-height: 1.55;
        min-height: 100vh;
        display: flex;
        flex-direction: column;
      }
      a { color: inherit; text-decoration: none; }
      .container { max-width: 1100px; margin: 0 auto; padding: 0 1.5rem; width: 100%; }
      header.site-header {
        background: var(--c-surface);
        border-bottom: 2px solid var(--c-line);
        padding: 1rem 0;
      }
      .nav-row { display: flex; align-items: center; justify-content: space-between; gap: 1rem; }
      .brand-title { font-family: var(--font-display); font-size: 1.4rem; font-weight: 800; color: var(--c-text); text-transform: uppercase; }
      .nav-links { display: flex; align-items: center; gap: 1.5rem; font-weight: 600; font-size: 0.95rem; }
      .nav-links a:hover { color: var(--c-accent); }
      .btn {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        padding: 0.65rem 1.3rem;
        border-radius: 4px;
        font-weight: 700;
        font-size: 0.9rem;
        text-transform: uppercase;
        letter-spacing: 0.04em;
        cursor: pointer;
        transition: background 0.15s ease;
      }
      .btn-primary { background: var(--c-accent); color: #fff; }
      .btn-primary:hover { background: var(--c-accent-hover); }
      footer.site-footer {
        margin-top: auto;
        background: var(--c-text);
        color: #ddd;
        padding: 3rem 0;
        font-size: 0.9rem;
      }
    </style>
  </head>
  <body>
    <header class="site-header">
      <div class="container nav-row">
        <div>
          <a href="/" class="brand-title">{title}</a>
          <span style="display: block; font-size: 0.75rem; font-weight: 600; color: var(--c-accent); text-transform: uppercase; letter-spacing: 0.05em;">Licensed Builders & Carpenters #381920C</span>
        </div>
        <nav class="nav-links">
          <a href="/services">Services</a>
          <a href="/quote" class="btn btn-primary">Request a Quote</a>
        </nav>
      </div>
    </header>
    <slot />
    <footer class="site-footer">
      <div class="container" style="display: flex; justify-content: space-between; flex-wrap: wrap; gap: 2rem;">
        <div>
          <h4 style="font-family: var(--font-display); font-size: 1.1rem; color: #fff; margin-bottom: 0.5rem; text-transform: uppercase;">{title}</h4>
          <p>Master Builders Association Member</p>
          <p>Public Liability Insurance $20M</p>
        </div>
        <div>
          <h5 style="color: #fff; margin-bottom: 0.5rem; text-transform: uppercase;">Service Areas</h5>
          <p>Inner Melbourne & Northern Suburbs</p>
          <p>Direct line: 1300 000 888</p>
        </div>
      </div>
    </footer>
  </body>
</html>
`,
        'src/pages/index.astro': `---
import Base from '../layouts/Base.astro';

// The project's display name, kept as data.
const projectName = ${safeName};
---

<Base title={projectName}>
  <main class="container" style="padding: 4rem 1.5rem;">
    <section style="background: var(--c-surface); border: 2px solid var(--c-line); padding: 3rem 2.5rem; border-radius: 6px; margin-bottom: 4rem;">
      <span style="font-size: 0.85rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: var(--c-accent); display: block; margin-bottom: 0.75rem;">Master Builders & Carpentry</span>
      <h1 style="font-family: var(--font-display); font-size: clamp(2.2rem, 4.5vw, 3.5rem); font-weight: 800; line-height: 1.15; margin-bottom: 1.25rem; text-transform: uppercase;">
        {projectName}
      </h1>
      <p style="font-size: 1.2rem; color: var(--c-muted); max-width: 680px; margin-bottom: 2rem; line-height: 1.5;">
        Solid structural framing, architectural timber extensions, and honest, reliable site craftsmanship. Fully licensed and guaranteed for 20 years.
      </p>
      <div style="display: flex; gap: 1rem; flex-wrap: wrap;">
        <a href="/quote" class="btn btn-primary">Get an Upfront Quote</a>
        <a href="/services" class="btn" style="background: var(--c-bg); border: 1.5px solid var(--c-line);">View Our Services</a>
      </div>
    </section>

    <section style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 2rem; margin-bottom: 4rem;">
      <article style="background: var(--c-surface); border: 1.5px solid var(--c-line); padding: 2rem; border-radius: 4px;">
        <h3 style="font-family: var(--font-display); font-size: 1.25rem; font-weight: 700; text-transform: uppercase; margin-bottom: 0.5rem;">Structural Framing</h3>
        <p style="color: var(--c-muted);">Heavy timber wall frames, roof trusses, sub-floor rectification, and load-bearing beam installations.</p>
      </article>
      <article style="background: var(--c-surface); border: 1.5px solid var(--c-line); padding: 2rem; border-radius: 4px;">
        <h3 style="font-family: var(--font-display); font-size: 1.25rem; font-weight: 700; text-transform: uppercase; margin-bottom: 0.5rem;">Extensions & Decks</h3>
        <p style="color: var(--c-muted);">Architectural spotted gum and blackbutt hardwood decks, pergolas, and seamless indoor-outdoor living additions.</p>
      </article>
      <article style="background: var(--c-surface); border: 1.5px solid var(--c-line); padding: 2rem; border-radius: 4px;">
        <h3 style="font-family: var(--font-display); font-size: 1.25rem; font-weight: 700; text-transform: uppercase; margin-bottom: 0.5rem;">Heritage Restorations</h3>
        <p style="color: var(--c-muted);">Victorian and Edwardian weatherboard repairs, sash window rebuilding, and ornamental timber fretwork.</p>
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
  <main class="container" style="padding: 4rem 1.5rem; max-width: 900px;">
    <header style="margin-bottom: 3.5rem;">
      <a href="/" style="font-size: 0.9rem; font-weight: 600; text-transform: uppercase; color: var(--c-accent); display: inline-block; margin-bottom: 1rem;">← Back to Home</a>
      <h1 style="font-family: var(--font-display); font-size: 2.75rem; text-transform: uppercase; font-weight: 800;">Trade Capabilities</h1>
      <p style="color: var(--c-muted); font-size: 1.15rem; margin-top: 0.5rem;">Scope of works, compliance standards, and contractor management.</p>
    </header>

    <div style="display: flex; flex-direction: column; gap: 2rem;">
      <section style="background: var(--c-surface); border: 1.5px solid var(--c-line); padding: 2rem; border-radius: 4px;">
        <h2 style="font-family: var(--font-display); font-size: 1.4rem; text-transform: uppercase; margin-bottom: 0.75rem;">1. Residential Extensions & Renovations</h2>
        <p style="color: var(--c-muted); margin-bottom: 1rem;">We manage the build from council permit sign-off through lockup and handover. Complete project supervision with daily photo reports.</p>
        <span style="font-weight: 600; color: var(--c-accent);">Typical duration: 8–16 weeks</span>
      </section>

      <section style="background: var(--c-surface); border: 1.5px solid var(--c-line); padding: 2rem; border-radius: 4px;">
        <h2 style="font-family: var(--font-display); font-size: 1.4rem; text-transform: uppercase; margin-bottom: 0.75rem;">2. Structural Alterations & Wall Removals</h2>
        <p style="color: var(--c-muted); margin-bottom: 1rem;">Certified engineer-stamped structural steel and LVL installation to create open-plan kitchen and living zones safely.</p>
        <span style="font-weight: 600; color: var(--c-accent);">Fully engineered & signed off</span>
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
  <main class="container" style="padding: 4rem 1.5rem; max-width: 760px;">
    <header style="margin-bottom: 3rem; text-align: center;">
      <a href="/" style="font-size: 0.9rem; font-weight: 600; text-transform: uppercase; color: var(--c-accent); display: inline-block; margin-bottom: 1rem;">← Back to Home</a>
      <h1 style="font-family: var(--font-display); font-size: 2.75rem; text-transform: uppercase; font-weight: 800;">Request an Itemised Quote</h1>
      <p style="color: var(--c-muted); font-size: 1.15rem; margin-top: 0.5rem;">We provide transparent, line-item estimates with zero hidden margins.</p>
    </header>

    <div style="background: var(--c-surface); border: 2px solid var(--c-line); padding: 2.5rem; border-radius: 6px;">
      <form style="display: flex; flex-direction: column; gap: 1.5rem;">
        <div>
          <label style="display: block; font-weight: 700; font-size: 0.9rem; text-transform: uppercase; margin-bottom: 0.5rem;">Full Name</label>
          <input type="text" placeholder="e.g. David Campbell" style="width: 100%; padding: 0.75rem; border: 1.5px solid var(--c-line); border-radius: 4px; font-family: inherit; font-size: 1rem;" />
        </div>
        <div>
          <label style="display: block; font-weight: 700; font-size: 0.9rem; text-transform: uppercase; margin-bottom: 0.5rem;">Phone Number</label>
          <input type="tel" placeholder="0400 000 000" style="width: 100%; padding: 0.75rem; border: 1.5px solid var(--c-line); border-radius: 4px; font-family: inherit; font-size: 1rem;" />
        </div>
        <div>
          <label style="display: block; font-weight: 700; font-size: 0.9rem; text-transform: uppercase; margin-bottom: 0.5rem;">Project Suburb & Postcode</label>
          <input type="text" placeholder="e.g. Northcote 3070" style="width: 100%; padding: 0.75rem; border: 1.5px solid var(--c-line); border-radius: 4px; font-family: inherit; font-size: 1rem;" />
        </div>
        <div>
          <label style="display: block; font-weight: 700; font-size: 0.9rem; text-transform: uppercase; margin-bottom: 0.5rem;">Project Scope</label>
          <textarea rows="4" placeholder="Briefly describe your project (e.g. timber deck, rear extension, wall removal)" style="width: 100%; padding: 0.75rem; border: 1.5px solid var(--c-line); border-radius: 4px; font-family: inherit; font-size: 1rem;"></textarea>
        </div>
        <button type="button" class="btn btn-primary" style="padding: 1rem; font-size: 1rem; margin-top: 0.5rem;">Submit Quote Request</button>
      </form>
    </div>
  </main>
</Base>
`,
      };
    }

    case 'the-desk': {
      return {
        'src/layouts/Base.astro': `---
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
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Bodoni+Moda:ital,opsz,wght@0,6..96,400;0,6..96,600;1,6..96,400&family=Hanken+Grotesk:wght@400;500;600&display=swap" rel="stylesheet" />
    <style is:global>
      :root {
        --c-bg: #faf8f5;
        --c-surface: #ffffff;
        --c-text: #211e1b;
        --c-accent: #111111;
        --c-muted: #736e65;
        --c-line: #e5e0d8;
        --font-display: 'Bodoni Moda', serif;
        --font-body: 'Hanken Grotesk', sans-serif;
      }
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body {
        background-color: var(--c-bg);
        color: var(--c-text);
        font-family: var(--font-body);
        line-height: 1.65;
        min-height: 100vh;
        display: flex;
        flex-direction: column;
      }
      a { color: inherit; text-decoration: none; }
      .container { max-width: 780px; margin: 0 auto; padding: 0 1.5rem; width: 100%; }
      header.site-header {
        border-bottom: 1px solid var(--c-line);
        padding: 2.5rem 0 1.5rem;
      }
      .masthead { text-align: center; }
      .brand-title { font-family: var(--font-display); font-size: 2.2rem; font-weight: 600; letter-spacing: -0.01em; color: var(--c-accent); }
      .nav-links { display: flex; justify-content: center; gap: 2rem; margin-top: 1.25rem; font-size: 0.95rem; font-weight: 500; color: var(--c-muted); }
      .nav-links a:hover { color: var(--c-accent); text-decoration: underline; text-underline-offset: 4px; }
      footer.site-footer {
        margin-top: auto;
        border-top: 1px solid var(--c-line);
        padding: 3rem 0;
        text-align: center;
        font-size: 0.85rem;
        color: var(--c-muted);
      }
    </style>
  </head>
  <body>
    <header class="site-header">
      <div class="container masthead">
        <a href="/" class="brand-title">{title}</a>
        <nav class="nav-links">
          <a href="/">Dispatch</a>
          <a href="/essays">Essay Archive</a>
        </nav>
      </div>
    </header>
    <slot />
    <footer class="site-footer">
      <div class="container">
        <p>© {new Date().getFullYear()} {title}. Published with independent editorial care.</p>
        <p style="margin-top: 0.5rem;">Typography set in Bodoni Moda and Hanken Grotesk.</p>
      </div>
    </footer>
  </body>
</html>
`,
        'src/pages/index.astro': `---
import Base from '../layouts/Base.astro';

// The project's display name, kept as data.
const projectName = ${safeName};
---

<Base title={projectName}>
  <main class="container" style="padding: 4rem 1.5rem;">
    <section style="margin-bottom: 4.5rem;">
      <span style="font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.12em; color: var(--c-muted); display: block; margin-bottom: 1rem;">Featured Lead Essay</span>
      <h1 style="font-family: var(--font-display); font-size: clamp(2rem, 5vw, 3.2rem); line-height: 1.2; margin-bottom: 1.25rem; font-weight: 600;">
        {projectName}
      </h1>
      <p style="font-size: 1.25rem; line-height: 1.6; color: var(--c-text); margin-bottom: 1.5rem; font-style: italic;">
        “In an era consumed by automated production, deliberate slowness and tactile attention become the most radical virtues an author can practice.”
      </p>
      <div style="display: flex; align-items: center; gap: 1rem; font-size: 0.85rem; color: var(--c-muted); border-top: 1px solid var(--c-line); padding-top: 1rem;">
        <span>November 2026</span>
        <span>·</span>
        <span>8 min read</span>
        <span>·</span>
        <span style="color: var(--c-accent); font-weight: 600;">On Physical Craft</span>
      </div>
    </section>

    <section style="margin-bottom: 5rem;">
      <h2 style="font-family: var(--font-display); font-size: 1.6rem; border-bottom: 1px solid var(--c-line); padding-bottom: 0.75rem; margin-bottom: 2rem;">Recent Dispatches</h2>
      <div style="display: flex; flex-direction: column; gap: 2.5rem;">
        <article>
          <span style="font-size: 0.8rem; color: var(--c-muted);">October 24, 2026 · 6 min read</span>
          <h3 style="font-family: var(--font-display); font-size: 1.45rem; margin: 0.35rem 0 0.5rem;"><a href="/essays">The Architecture of the Personal Archive</a></h3>
          <p style="color: var(--c-muted); line-height: 1.6;">How local markdown notes, plain text libraries, and static generation preserve writing across decades of platform churn.</p>
        </article>
        <article>
          <span style="font-size: 0.8rem; color: var(--c-muted);">September 18, 2026 · 4 min read</span>
          <h3 style="font-family: var(--font-display); font-size: 1.45rem; margin: 0.35rem 0 0.5rem;"><a href="/essays">The Quiet Room: Setting Up an Atelier for Focus</a></h3>
          <p style="color: var(--c-muted); line-height: 1.6;">Reflections on physical desks, natural daylight, fountain pen ink, and the rituals of drafting without notifications.</p>
        </article>
      </div>
    </section>

    <section style="background: var(--c-surface); border: 1px solid var(--c-line); padding: 2.5rem; border-radius: 8px; text-align: center;">
      <h3 style="font-family: var(--font-display); font-size: 1.5rem; margin-bottom: 0.5rem;">Quiet Dispatches in Your Inbox</h3>
      <p style="color: var(--c-muted); font-size: 0.95rem; margin-bottom: 1.5rem; max-width: 480px; margin-left: auto; margin-right: auto;">
        Sent twice a month on quiet Sunday mornings. No tracking, no sponsors, no automated funnels.
      </p>
      <form style="display: flex; justify-content: center; gap: 0.5rem; max-width: 420px; margin: 0 auto; flex-wrap: wrap;">
        <input type="email" placeholder="you@domain.com" style="flex: 1; min-width: 200px; padding: 0.65rem 1rem; border: 1px solid var(--c-line); border-radius: 4px; font-family: inherit;" />
        <button type="button" style="background: var(--c-accent); color: #fff; padding: 0.65rem 1.25rem; border: none; border-radius: 4px; font-weight: 600; cursor: pointer;">Subscribe</button>
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
  <main class="container" style="padding: 4rem 1.5rem;">
    <header style="margin-bottom: 3.5rem;">
      <a href="/" style="font-size: 0.85rem; color: var(--c-muted); display: inline-block; margin-bottom: 1rem;">← Back to Dispatch</a>
      <h1 style="font-family: var(--font-display); font-size: 2.75rem; font-weight: 600;">The Essay Archive</h1>
      <p style="color: var(--c-muted); font-size: 1.1rem; margin-top: 0.5rem;">Chronological index of published manuscripts and field notes.</p>
    </header>

    <div style="display: flex; flex-direction: column; gap: 2rem;">
      <article style="border-bottom: 1px solid var(--c-line); padding-bottom: 1.5rem;">
        <span style="font-size: 0.8rem; color: var(--c-muted);">November 2026 · Essay</span>
        <h2 style="font-family: var(--font-display); font-size: 1.4rem; margin: 0.25rem 0;">Deliberate Slowness and Tactile Attention</h2>
        <p style="color: var(--c-muted);">On resisting instantaneous production in favor of crafted durability.</p>
      </article>
      <article style="border-bottom: 1px solid var(--c-line); padding-bottom: 1.5rem;">
        <span style="font-size: 0.8rem; color: var(--c-muted);">October 2026 · Field Note</span>
        <h2 style="font-family: var(--font-display); font-size: 1.4rem; margin: 0.25rem 0;">The Architecture of the Personal Archive</h2>
        <p style="color: var(--c-muted);">Preserving writing with local markdown files and static site generators.</p>
      </article>
      <article style="border-bottom: 1px solid var(--c-line); padding-bottom: 1.5rem;">
        <span style="font-size: 0.8rem; color: var(--c-muted);">September 2026 · Essay</span>
        <h2 style="font-family: var(--font-display); font-size: 1.4rem; margin: 0.25rem 0;">The Quiet Room: Setting Up an Atelier for Focus</h2>
        <p style="color: var(--c-muted);">Physical desks, morning light, and drafting without notifications.</p>
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
