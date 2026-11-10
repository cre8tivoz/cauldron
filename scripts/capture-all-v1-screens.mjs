import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import net from 'node:net';
import os from 'node:os';
import { pathToFileURL } from 'node:url';
import { spawn } from 'node:child_process';
import { registerHooks } from 'node:module';
import electron from 'electron';

const electronStub = path.join(
  fs.mkdtempSync(path.join(os.tmpdir(), 'cauldron-electron-screens-')),
  'electron.mjs',
);
fs.writeFileSync(
  electronStub,
  `export const app = { getAppPath: () => process.cwd(), getPath: () => os.tmpdir() };\nexport class BrowserWindow {}\nexport default { app };\n`,
);

registerHooks({
  load(url, context, next) {
    return next(url, {
      ...context,
      format: url.endsWith('.ts') ? 'module-typescript' : context.format,
    });
  },
  resolve(specifier, context, next) {
    if (specifier === 'electron') {
      return next(pathToFileURL(electronStub).href, context);
    }
    if (specifier.startsWith('.') && !path.extname(specifier)) {
      return next(`${specifier}.ts`, context);
    }
    return next(specifier, context);
  },
});

const electronExe =
  typeof electron === 'string'
    ? electron
    : path.resolve(
        'node_modules/electron/dist/Electron.app/Contents/MacOS/Electron',
      );

const rendererRoot = path.resolve('.vite/renderer/main_window');
if (!fs.existsSync(rendererRoot)) {
  throw new Error(
    'Build the renderer first (.vite/renderer/main_window missing).',
  );
}

const outDir = path.resolve('v1screenshots');
fs.mkdirSync(outDir, { recursive: true });

// Import starter templates, extended library, and curated stock photos
const { STARTER_TEMPLATES } = await import('../src/main/templates.ts');
const { EXTENDED_LIBRARY } = await import('../src/main/library-pieces.ts');
const { LIBRARY } = await import('../src/main/library.ts');
const { CURATED_STOCK_PHOTOS } = await import('../src/main/assets.ts');

const allPieces = [...LIBRARY, ...EXTENDED_LIBRARY];

// Full definitions for the 10 approved design directions matching STARTER-SET.md
const RAW_DIRECTIONS = [
  {
    id: 'long-lunch',
    name: 'Long Lunch',
    forWhom: 'Cafés, bakeries, food craftspeople, slow hospitality',
    learnedFrom: 'Long Lunch Design Co.',
    colours: {
      bg: '#f8f4e9',
      surface: '#fffdf7',
      text: '#2a1712',
      accent: '#b84b30',
      muted: '#6b5a52',
      line: '#e3d9c8',
    },
    fonts: {
      display: {
        family: 'Fraunces',
        package: '@fontsource/fraunces',
        weights: [400, 600, 700],
      },
      body: {
        family: 'Karla',
        package: '@fontsource/karla',
        weights: [400, 500, 600],
      },
    },
    typeScale: [14, 16, 20, 24, 32, 44, 60],
    spacing: [4, 8, 12, 16, 24, 32, 48, 64],
    radii: [0, 4, 8, 16, 24, 9999],
  },
  {
    id: 'the-edit',
    name: 'The Edit (PeNtA Studio)',
    forWhom:
      'Architecture, industrial design, ceramicists, editorial lookbooks',
    learnedFrom: 'PeNtA Architecture',
    colours: {
      bg: '#111111',
      surface: '#1a1a1a',
      text: '#f5f5f5',
      accent: '#e5e5e5',
      muted: '#888888',
      line: '#262626',
    },
    fonts: {
      display: {
        family: 'Cabinet Grotesk',
        package: '@fontsource/cabinet-grotesk',
        weights: [700, 800],
      },
      body: {
        family: 'Supreme',
        package: '@fontsource/supreme',
        weights: [400, 500],
      },
    },
    typeScale: [13, 15, 18, 22, 30, 42, 58],
    spacing: [4, 8, 12, 16, 24, 32, 48, 64],
    radii: [0, 2, 4, 8, 12, 9999],
  },
  {
    id: 'solid-ground',
    name: 'Solid Ground (Good Trade)',
    forWhom: 'Builders, joiners, metalworkers, industrial trades',
    learnedFrom: 'Hard Hat Trade',
    colours: {
      bg: '#f0ece3',
      surface: '#ffffff',
      text: '#23252a',
      accent: '#a9714b',
      muted: '#8b8681',
      line: '#d7d2c8',
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
    typeScale: [14, 16, 20, 24, 32, 44, 56],
    spacing: [4, 8, 12, 16, 24, 32, 48, 64],
    radii: [0, 2, 4, 6, 8, 9999],
  },
  {
    id: 'the-desk',
    name: 'The Desk (Henry From Online)',
    forWhom: 'Writers, journalists, essayists, long-form journals',
    learnedFrom: 'Henry From Online',
    colours: {
      bg: '#f7f4ef',
      surface: '#ffffff',
      text: '#1e1e1e',
      accent: '#8b263e',
      muted: '#6e6a64',
      line: '#e8e2d8',
    },
    fonts: {
      display: {
        family: 'Bodoni Moda',
        package: '@fontsource/bodoni-moda',
        weights: [600, 700],
      },
      body: {
        family: 'Karla',
        package: '@fontsource/karla',
        weights: [400, 500],
      },
    },
    typeScale: [14, 16, 19, 23, 30, 40, 54],
    spacing: [4, 8, 12, 16, 24, 32, 48, 64],
    radii: [0, 3, 6, 12, 16, 9999],
  },
  {
    id: 'warm-contemporary',
    name: 'Warm Contemporary',
    forWhom: 'Independent lifestyle brands, boutique hotels, physical studios',
    learnedFrom: 'Camillo Architecture',
    colours: {
      bg: '#fdfbf7',
      surface: '#f4efe6',
      text: '#3a352f',
      accent: '#c86d51',
      muted: '#756c63',
      line: '#e6ded4',
    },
    fonts: {
      display: {
        family: 'Fraunces',
        package: '@fontsource/fraunces',
        weights: [600, 700],
      },
      body: {
        family: 'Jost',
        package: '@fontsource/jost',
        weights: [400, 500],
      },
    },
    typeScale: [14, 16, 20, 24, 32, 44, 60],
    spacing: [4, 8, 12, 16, 24, 32, 48, 64],
    radii: [0, 4, 8, 16, 24, 9999],
  },
  {
    id: 'crisp-studio',
    name: 'Crisp Studio',
    forWhom: 'Graphic designers, creative technologists, agencies',
    learnedFrom: 'Crisp Design',
    colours: {
      bg: '#ffffff',
      surface: '#f5f6f8',
      text: '#111315',
      accent: '#2b6cb0',
      muted: '#4a5568',
      line: '#e2e8f0',
    },
    fonts: {
      display: {
        family: 'Space Grotesk',
        package: '@fontsource/space-grotesk',
        weights: [600, 700],
      },
      body: {
        family: 'Inter',
        package: '@fontsource/inter',
        weights: [400, 500],
      },
    },
    typeScale: [13, 15, 18, 22, 30, 42, 58],
    spacing: [4, 8, 12, 16, 24, 32, 48, 64],
    radii: [0, 4, 8, 12, 16, 9999],
  },
  {
    id: 'componine',
    name: 'Componine',
    forWhom: 'Printmakers, literary publishers, cultural institutions',
    learnedFrom: 'Componine Press',
    colours: {
      bg: '#faf8f5',
      surface: '#f5f0e8',
      text: '#1c1917',
      accent: '#b45309',
      muted: '#78716c',
      line: '#e7e2d9',
    },
    fonts: {
      display: {
        family: 'Instrument Serif',
        package: '@fontsource/instrument-serif',
        weights: [400],
      },
      body: {
        family: 'Public Sans',
        package: '@fontsource/public-sans',
        weights: [400, 500],
      },
    },
    typeScale: [14, 16, 20, 26, 36, 48, 64],
    spacing: [4, 8, 12, 16, 24, 32, 48, 64],
    radii: [0, 2, 4, 8, 12, 9999],
  },
  {
    id: 'niki-studio',
    name: 'Niki Studio',
    forWhom: 'Experimental artists, electronic music, bold portfolios',
    learnedFrom: 'Niki Studio Paris',
    colours: {
      bg: '#0f0f0f',
      surface: '#171717',
      text: '#ffffff',
      accent: '#f97316',
      muted: '#737373',
      line: '#262626',
    },
    fonts: {
      display: {
        family: 'Syne',
        package: '@fontsource/syne',
        weights: [700, 800],
      },
      body: {
        family: 'Manrope',
        package: '@fontsource/manrope',
        weights: [400, 500],
      },
    },
    typeScale: [14, 16, 20, 26, 36, 50, 68],
    spacing: [4, 8, 12, 16, 24, 32, 48, 64],
    radii: [0, 2, 4, 8, 16, 9999],
  },
  {
    id: 'vibrant-craft',
    name: 'Vibrant Craft',
    forWhom: 'Ceramicists, textile makers, slow pottery studios',
    learnedFrom: 'Vibrant Clay',
    colours: {
      bg: '#fefae0',
      surface: '#faedcd',
      text: '#283618',
      accent: '#bc6c25',
      muted: '#606c38',
      line: '#d4a373',
    },
    fonts: {
      display: {
        family: 'Bricolage Grotesque',
        package: '@fontsource/bricolage-grotesque',
        weights: [700],
      },
      body: {
        family: 'Figtree',
        package: '@fontsource/figtree',
        weights: [400, 500],
      },
    },
    typeScale: [14, 16, 20, 24, 32, 44, 60],
    spacing: [4, 8, 12, 16, 24, 32, 48, 64],
    radii: [0, 6, 12, 20, 28, 9999],
  },
  {
    id: 'technical-calm',
    name: 'Technical Calm',
    forWhom: 'Toolmakers, hardware engineers, data craftspeople',
    learnedFrom: 'Calm Engineering',
    colours: {
      bg: '#09090b',
      surface: '#18181b',
      text: '#fafafa',
      accent: '#3b82f6',
      muted: '#71717a',
      line: '#27272a',
    },
    fonts: {
      display: {
        family: 'Geist',
        package: '@fontsource/geist',
        weights: [600, 700],
      },
      body: {
        family: 'Geist Mono',
        package: '@fontsource/geist-mono',
        weights: [400, 500],
      },
    },
    typeScale: [13, 15, 18, 22, 28, 38, 52],
    spacing: [4, 8, 12, 16, 24, 32, 48, 64],
    radii: [0, 2, 4, 6, 8, 9999],
  },
];

const sampleStructure = {
  density:
    'Content caps at 76rem, centred, with outer gutters of space-9 (64px).',
  displayType:
    'Headings uppercase at weight 400 only, tracking 0.02em, leading 1.2.',
  surfaces: 'Warm off-white paper canvas with subtle hairline borders.',
  states:
    'Interactive elements invert or underline on hover with quick transitions.',
  mobile: 'Single-column stacking below 768px with full-bleed touch targets.',
};

const DIRECTIONS = RAW_DIRECTIONS.map((d) => ({
  ...d,
  fonts: { display: d.fonts.display.family, body: d.fonts.body.family },
  character: d.character || 'Warm and editorial system',
  structure: sampleStructure,
}));

const currentDirection = DIRECTIONS[0];

const initialSite = {
  root: '/Users/you/Projects/sunday-table',
  name: 'Sunday Table',
  astroVersion: '7.4.7',
  packageManager: 'pnpm',
  hasDependencies: true,
};

const sampleRun = {
  id: 'run-1794228000',
  tool: 'claude',
  prompt:
    'Design a warm, seasonal bakery and hearth dining website with daily menu and reservation links',
  status: 'finished',
  note: 'Applied Long Lunch direction with Fraunces headlines, created daily seasonal menu, and added local producer provenance sections.',
  startedAt: Date.now() - 120000,
  finishedAt: Date.now() - 40000,
  files: [
    'src/layouts/Base.astro',
    'src/pages/index.astro',
    'src/pages/menu.astro',
  ],
  problems: [],
  highlighted: [
    {
      file: 'src/pages/index.astro',
      loc: '12:4',
      text: '<h1 class="brand-title">Sunday Table</h1>',
      label: 'Editorial heading with Fraunces serif type',
    },
    {
      file: 'src/pages/menu.astro',
      loc: '24:2',
      text: '<section class="daily-menu">',
      label: 'Added daily hearth menu section',
    },
  ],
};

const sampleSelection = {
  id: 'heading-1',
  file: 'src/pages/index.astro',
  line: 12,
  column: 4,
  name: 'h1',
  text: 'Sunday Table',
  baseHash: 'hash-abc-123',
  textEditable: true,
  attributes: [
    { name: 'class', value: 'brand-title' },
    { name: 'id', value: 'main-heading' },
  ],
  style: {
    color: '#2a1712',
    'font-family': "'Fraunces', serif",
    'font-size': '52px',
    'font-weight': '700',
    'line-height': '1.15',
    padding: '0px 0px 16px 0px',
  },
  pageUrl: '/',
  domPath: 'main > section.hero > h1.brand-title',
  history: { canUndo: true, canRedo: false },
};

const sampleSections = [
  { tag: 'header', start: 100, end: 320, id: 'site-nav' },
  { tag: 'section', start: 340, end: 890, id: 'hero' },
  { tag: 'section', start: 910, end: 1420, id: 'daily-menu' },
  { tag: 'section', start: 1440, end: 1890, id: 'hours-location' },
  { tag: 'footer', start: 1910, end: 2300, id: 'site-footer' },
];

const sampleQualityReport = {
  ok: true,
  built: true,
  findings: [
    {
      id: 'contrast',
      label: 'Text contrast',
      detail: 'Meets WCAG AA (7.4:1 ratio)',
      kind: 'measured',
      status: 'pass',
      scope: 'site',
    },
    {
      id: 'heading-order',
      label: 'Semantic headings',
      detail: 'Hierarchy valid (h1 -> h2 -> h3)',
      kind: 'measured',
      status: 'pass',
      scope: 'site',
    },
    {
      id: 'touch-targets',
      label: 'Touch targets',
      detail: 'All controls exceed 44px',
      kind: 'measured',
      status: 'pass',
      scope: 'site',
    },
    {
      id: 'font-scale',
      label: 'Typography scale',
      detail: 'Conforms to Fraunces + Karla system',
      kind: 'measured',
      status: 'pass',
      scope: 'site',
    },
    {
      id: 'color-tokens',
      label: 'Palette tokens',
      detail: '100% mapped to Long Lunch CSS variables',
      kind: 'measured',
      status: 'pass',
      scope: 'site',
    },
    {
      id: 'viewport-meta',
      label: 'Responsive viewport',
      detail: 'Width=device-width present on all pages',
      kind: 'measured',
      status: 'pass',
      scope: 'site',
    },
    {
      id: 'landmarks',
      label: 'ARIA landmarks',
      detail: 'header, main, nav, footer defined',
      kind: 'measured',
      status: 'pass',
      scope: 'site',
    },
    {
      id: 'fast-paint',
      label: 'Zero JS runtime',
      detail: 'Pure static HTML/CSS delivery',
      kind: 'measured',
      status: 'pass',
      scope: 'site',
    },
    {
      id: 'img-alt',
      label: 'Alt text',
      detail: '1 decorative photo in gallery missing alt text',
      kind: 'measured',
      status: 'fail',
      scope: 'site',
    },
  ],
  measured: [
    { label: 'Display font', value: 'Fraunces 700' },
    { label: 'Body font', value: 'Karla 400' },
    { label: 'Background', value: '#f8f4e9' },
    { label: 'Accent', value: '#b84b30' },
    { label: 'Contrast ratio', value: '7.42 : 1' },
    { label: 'Bundle size', value: '0.0 kB JS' },
  ],
};

const sampleCollections = [
  {
    name: 'dishes',
    schemaHash: 'hash-dishes-schema',
    fields: [
      { name: 'title', type: 'text', optional: false },
      { name: 'price', type: 'text', optional: false },
      { name: 'description', type: 'text', optional: true },
      {
        name: 'category',
        type: 'text',
        options: [
          'Morning Hearth',
          'Midday Table',
          'Afternoon Provisions',
          'Cellar & Ferments',
        ],
        optional: false,
      },
      { name: 'available', type: 'boolean', optional: false },
    ],
    entries: [
      {
        id: 'sourdough-toast',
        file: 'src/content/dishes/sourdough-toast.md',
        hash: 'hash-toast-1',
      },
      {
        id: 'herb-omelette',
        file: 'src/content/dishes/herb-omelette.md',
        hash: 'hash-omelette-2',
      },
      {
        id: 'porchetta-sandwich',
        file: 'src/content/dishes/porchetta-sandwich.md',
        hash: 'hash-porchetta-3',
      },
    ],
  },
  {
    name: 'stories',
    schemaHash: 'hash-stories-schema',
    fields: [
      { name: 'title', type: 'text', optional: false },
      { name: 'author', type: 'text', optional: false },
      { name: 'date', type: 'date', optional: false },
      { name: 'summary', type: 'text', optional: true },
    ],
    entries: [
      {
        id: 'local-milling',
        file: 'src/content/stories/local-milling.md',
        hash: 'hash-milling-1',
      },
      {
        id: 'morning-harvest',
        file: 'src/content/stories/morning-harvest.md',
        hash: 'hash-harvest-2',
      },
    ],
  },
];

const sampleRepoState = {
  isRepo: true,
  branch: 'main',
  hasRemote: true,
  lastCommit: 'a1b2c3d (feat: add seasonal provisions menu)',
  unpushed: 1,
  changes: [
    { file: 'src/pages/index.astro', status: 'M' },
    { file: 'src/styles/tokens.css', status: 'M' },
    { file: 'public/images/bakery-hearth.jpg', status: 'A' },
  ],
  remoteUrl: 'https://github.com/cre8tivoz/sunday-table.git',
};

// HTML for live preview inside the central stage
const sundayTablePreviewHtml = `
<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;600;700&family=Karla:wght@400;500;600&display=swap" rel="stylesheet" />
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: #f8f4e9;
      color: #2a1712;
      font-family: 'Karla', sans-serif;
      padding: 0;
      margin: 0;
      overflow-x: hidden;
    }
    header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1.25rem 2.5rem;
      border-bottom: 1px solid #e3d9c8;
      background: #fffdf7;
    }
    .logo {
      font-family: 'Fraunces', serif;
      font-size: 1.6rem;
      font-weight: 700;
      color: #2a1712;
      letter-spacing: -0.02em;
    }
    nav a {
      margin-left: 2rem;
      text-decoration: none;
      color: #2a1712;
      font-weight: 500;
      font-size: 0.95rem;
    }
    .btn {
      background: #b84b30;
      color: #fff !important;
      padding: 0.55rem 1.25rem;
      border-radius: 9999px;
      font-weight: 600;
      text-decoration: none;
      display: inline-block;
    }
    .hero {
      text-align: center;
      padding: 4.5rem 2rem 3rem;
      max-width: 820px;
      margin: 0 auto;
    }
    .tag {
      text-transform: uppercase;
      letter-spacing: 0.12em;
      font-size: 0.8rem;
      font-weight: 700;
      color: #b84b30;
      margin-bottom: 1rem;
      display: inline-block;
    }
    h1 {
      font-family: 'Fraunces', serif;
      font-size: 3.5rem;
      line-height: 1.1;
      margin-bottom: 1.25rem;
      font-weight: 700;
      letter-spacing: -0.03em;
    }
    p.lead {
      font-size: 1.25rem;
      color: #6b5a52;
      line-height: 1.55;
      margin-bottom: 2.25rem;
    }
    .cta-row {
      display: flex;
      gap: 1rem;
      justify-content: center;
    }
    .btn-secondary {
      background: transparent;
      border: 1.5px solid #e3d9c8;
      color: #2a1712;
      padding: 0.55rem 1.35rem;
      border-radius: 9999px;
      text-decoration: none;
      font-weight: 600;
    }
    .cards {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 1.5rem;
      padding: 3rem 2.5rem;
      max-width: 1100px;
      margin: 0 auto;
    }
    .card {
      background: #fffdf7;
      border: 1px solid #e3d9c8;
      border-radius: 14px;
      padding: 1.75rem;
    }
    .card h3 {
      font-family: 'Fraunces', serif;
      font-size: 1.35rem;
      margin-bottom: 0.65rem;
    }
    .card p {
      color: #6b5a52;
      font-size: 0.95rem;
      line-height: 1.5;
    }
  </style>
</head>
<body>
  <header>
    <div class="logo">Sunday Table</div>
    <nav>
      <a href="#">Daily Menu</a>
      <a href="#">Provenance</a>
      <a href="#">Visit & Hours</a>
      <a href="#" class="btn">Book a Table</a>
    </nav>
  </header>
  <main>
    <div class="hero">
      <span class="tag">Local Hearth & Bakery Dining</span>
      <h1>Wood-fired stone baking and long communal lunches.</h1>
      <p class="lead">Slow mornings, seasonal ingredients harvested from valley growers, and natural regional wines poured by the glass.</p>
      <div class="cta-row">
        <a href="#" class="btn" style="padding: 0.75rem 1.75rem; font-size: 1.05rem;">View Seasonal Menu</a>
        <a href="#" class="btn-secondary" style="padding: 0.75rem 1.75rem; font-size: 1.05rem;">Hours & Location</a>
      </div>
    </div>
    <div class="cards">
      <div class="card">
        <h3>Morning Hearth</h3>
        <p>Laminated sourdough pastries, raw honey, and cultured jersey butter from 7:00 am daily.</p>
      </div>
      <div class="card">
        <h3>The Long Lunch</h3>
        <p>Four-course shared plates cooked over olive wood, accompanied by natural regional wines.</p>
      </div>
      <div class="card">
        <h3>Local Harvest</h3>
        <p>Heritage grains milled in the valley, dairy from small pasture herds, and organic vegetables.</p>
      </div>
    </div>
  </main>
</body>
</html>
`;

// Start test HTTP server
const server = http.createServer((req, res) => {
  const urlPath = req.url.split('?')[0];
  const file = path.join(
    rendererRoot,
    decodeURIComponent(urlPath === '/' ? '/index.html' : urlPath),
  );
  if (!file.startsWith(rendererRoot + path.sep) || !fs.existsSync(file)) {
    res.writeHead(404).end();
    return;
  }
  res.setHeader(
    'Content-Type',
    file.endsWith('.js')
      ? 'text/javascript'
      : file.endsWith('.css')
        ? 'text/css'
        : 'text/html',
  );
  res.end(fs.readFileSync(file));
});

await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const port = server.address().port;

// Allocate free debugging port
const cdpPort = await new Promise((resolve) => {
  const s = net.createServer();
  s.listen(0, '127.0.0.1', () => {
    const p = s.address().port;
    s.close(() => resolve(p));
  });
});

const child = spawn(
  electronExe,
  [
    '--headless',
    `--remote-debugging-port=${cdpPort}`,
    '--disable-gpu',
    '--no-sandbox',
    '--disable-dev-shm-usage',
  ],
  {
    env: {
      ...process.env,
      ELECTRON_ENABLE_LOGGING: '0',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  },
);
child.stdout.on('data', (d) => console.log('[app]', d.toString()));
child.stderr.on('data', (d) => console.error('[app:err]', d.toString()));

async function connectCdp(timeoutMs = 15000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`http://127.0.0.1:${cdpPort}/json/list`);
      const list = await res.json();
      const page = list.find((t) => t.type === 'page');
      if (page) {
        const ws = new WebSocket(page.webSocketDebuggerUrl);
        await new Promise((resolve, reject) => {
          ws.addEventListener('open', resolve, { once: true });
          ws.addEventListener('error', reject, { once: true });
        });
        let idCounter = 1;
        const pending = new Map();
        ws.addEventListener('message', (event) => {
          const msg = JSON.parse(event.data);
          if (msg.id && pending.has(msg.id)) {
            const { resolve, reject } = pending.get(msg.id);
            pending.delete(msg.id);
            if (msg.error) reject(new Error(msg.error.message));
            else resolve(msg.result);
          }
        });
        const send = (method, params = {}) =>
          new Promise((resolve, reject) => {
            const id = idCounter++;
            pending.set(id, { resolve, reject });
            ws.send(JSON.stringify({ id, method, params }));
          });
        return {
          ws,
          send,
          evaluate: async (expression) => {
            const result = await send('Runtime.evaluate', {
              expression,
              returnByValue: true,
              awaitPromise: true,
            });
            if (result.exceptionDetails) {
              throw new Error(
                result.exceptionDetails.exception?.description ?? 'exception',
              );
            }
            return result.result?.value;
          },
          screenshot: async (filename) => {
            const shot = await send('Page.captureScreenshot', {
              format: 'png',
            });
            const filePath = path.join(outDir, filename);
            fs.writeFileSync(filePath, Buffer.from(shot.data, 'base64'));
            console.log(`Saved screenshot: ${filePath}`);
          },
        };
      }
    } catch {}
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error('CDP connection failed');
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

try {
  const cdp = await connectCdp();
  await cdp.send('Page.enable');

  // Provide initial mock bridge in browser
  await cdp.send('Page.addScriptToEvaluateOnNewDocument', {
    source: `
      window.__initialData = {
        site: ${JSON.stringify(initialSite)},
        direction: ${JSON.stringify(currentDirection)},
        directions: ${JSON.stringify(DIRECTIONS)},
        run: ${JSON.stringify(sampleRun)},
        selection: ${JSON.stringify(sampleSelection)},
        sections: ${JSON.stringify(sampleSections)},
        quality: ${JSON.stringify(sampleQualityReport)},
        collections: ${JSON.stringify(sampleCollections)},
        repoState: ${JSON.stringify(sampleRepoState)},
        starterTemplates: ${JSON.stringify(STARTER_TEMPLATES)},
        library: ${JSON.stringify(allPieces)},
        stockPhotos: ${JSON.stringify(CURATED_STOCK_PHOTOS)},
      };

      const listeners = new Map();
      const emit = (channel, val) => {
        for (const fn of listeners.get(channel) || []) fn(val);
      };

      const baseCauldron = {
        state: async () => ({
          site: window.__initialData.site,
          running: true,
          url: 'http://127.0.0.1:4321',
          selection: window.__initialData.selection,
          drafts: [],
          status: ['Preview running at http://127.0.0.1:4321'],
        }),
        direction: async () => window.__initialData.direction,
        directions: async () => window.__initialData.directions,
        runs: async () => [window.__initialData.run],
        projectsHome: async () => ({
          projects: [
            {
              path: '/Users/you/Projects/sunday-table',
              name: 'Sunday Table',
              lastOpened: 'Just now',
              direction: 'Long Lunch',
              badge: 'Hospitality',
              ready: true,
            },
            {
              path: '/Users/you/Projects/penta-studio',
              name: 'PeNtA Architecture',
              lastOpened: '2 hours ago',
              direction: 'The Edit',
              badge: 'Portfolio',
              ready: true,
            },
            {
              path: '/Users/you/Projects/good-trade',
              name: 'Good Trade Joinery',
              lastOpened: 'Yesterday',
              direction: 'Solid Ground',
              badge: 'Trades',
              ready: true,
            },
          ],
          problem: null,
        }),
        starterTemplates: async () => window.__initialData.starterTemplates,
        library: async () => ({
          pieces: window.__initialData.library,
          links: [
            { name: 'Unsection', url: 'https://unsection.com', why: 'Astro component collection' },
            { name: 'Lander blocks', url: 'https://landerblocks.com', why: 'Marketing sections' },
            { name: 'Gradient Deck', url: 'https://gradientdeck.com', why: 'Editorial patterns' },
          ],
        }),
        pageSections: async () => ({
          ok: true,
          file: 'src/pages/index.astro',
          sections: window.__initialData.sections,
          hash: 'hash-abc-123',
        }),
        reorderPageSections: async () => ({ ok: true }),
        duplicatePageSection: async () => ({ ok: true }),
        insertPageSection: async () => ({ ok: true }),
        deletePageSection: async () => ({ ok: true }),
        setPageSectionAnchor: async () => ({ ok: true }),
        pages: async () => ['/', '/menu', '/visit'],
        qualityRun: async () => window.__initialData.quality,
        collections: async () => ({
          ok: true,
          collections: window.__initialData.collections,
        }),
        entry: async (file) => ({
          ok: true,
          file,
          hash: 'hash-toast-123',
          schemaHash: 'hash-dishes-schema',
          frontmatter: true,
          text: ${JSON.stringify(
            '---\ntitle: "Country Sourdough Toast & Cultured Butter"\nprice: "$9.50"\ndescription: "Served with rooftop honeycomb or spiced blood plum preserve (V)"\ncategory: "Morning Hearth"\navailable: true\n---\n\nOur signature country sourdough toast, stone-milled in-house from organic heritage grains and baked fresh every dawn in our wood-fired hearth.',
          )},
          values: {
            title: 'Country Sourdough Toast & Cultured Butter',
            price: '$9.50',
            description: 'Served with rooftop honeycomb or spiced blood plum preserve (V)',
            category: 'Morning Hearth',
            available: 'true',
          },
        }),
        repoState: async () => window.__initialData.repoState,
        macBuild: async () => ({
          zip: 'Cauldron-darwin-arm64-0.0.1.zip',
          instructions: 'Built for macOS Apple Silicon. Unsigned developer build.',
        }),
        exportStatic: async () => ({ ok: true, distPath: 'dist/' }),
        deployCloudflare: async () => ({
          ok: false,
          problem: 'Cloudflare Pages deployment requires Wrangler authentication or CLOUDFLARE_API_TOKEN. Static site was built to dist/.',
        }),
        stockPhotos: async () => window.__initialData.stockPhotos,
        runAction: async ({ action }) => {
          if (action === 'listPages') {
            return {
              ok: true,
              pages: [
                { page: '/', file: 'src/pages/index.astro' },
                { page: '/menu', file: 'src/pages/menu.astro' },
                { page: '/visit', file: 'src/pages/visit.astro' },
              ],
            };
          }
          return { ok: true };
        },
        saveAssetImage: async () => ({ ok: true, path: '/images/test.jpg' }),
        mcpInfo: async () => ({ url: 'http://127.0.0.1:40123', code: 'cauldron-agent-active' }),
        openSiteDialog: async () => ({ picked: '/Users/you/Projects/sunday-table' }),
        openSite: async () => ({ site: window.__initialData.site }),
        chooseProjectParent: async () => ({ cancelled: false, path: '/Users/you/Projects' }),
        createProject: async () => ({ ok: true, project: window.__initialData.site }),
        prepareDependencies: async () => ({ ok: true }),
        discardDrafts: async () => true,
        setPreviewBounds: async () => true,
        setPickMode: async () => true,
        on: (channel, fn) => {
          const set = listeners.get(channel) || new Set();
          set.add(fn);
          listeners.set(channel, set);
          return () => set.delete(fn);
        },
      };

      window.cauldron = new Proxy(baseCauldron, {
        get: (target, key) => target[key] || (async () => true),
      });
    `,
  });

  // Navigate to renderer
  await cdp.send('Page.navigate', { url: `http://127.0.0.1:${port}/` });
  await sleep(1500);

  const html = await cdp.evaluate('document.body.innerHTML');
  console.log(
    'Renderer document.body.innerHTML length:',
    html.length,
    html.slice(0, 200),
  );

  // Set standard desktop retina metrics (1440x900 @ 2x)
  await cdp.send('Emulation.setDeviceMetricsOverride', {
    width: 1440,
    height: 900,
    deviceScaleFactor: 2,
    mobile: false,
  });
  await sleep(500);

  // Helper to mount the Sunday Table preview into .stage
  const mountPreview = async () => {
    await cdp.evaluate(`
      (() => {
        const stage = document.querySelector('.stage');
        if (stage && !stage.querySelector('iframe')) {
          stage.innerHTML = '';
          const iframe = document.createElement('iframe');
          iframe.style.width = '100%';
          iframe.style.height = '100%';
          iframe.style.border = 'none';
          iframe.srcdoc = ${JSON.stringify(sundayTablePreviewHtml)};
          stage.appendChild(iframe);
        }
      })()
    `);
  };

  // 1. Projects Home
  console.log('Capturing 01-projects-home.png...');
  await cdp.evaluate(`
    (() => {
      const projectsBtn = [...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Projects');
      if (projectsBtn) projectsBtn.click();
    })()
  `);
  await sleep(800);
  await cdp.screenshot('01-projects-home.png');

  // Navigate to Workspace / Build view
  await cdp.evaluate(`
    (() => {
      const sitesBtn = document.querySelector('button[title="Sites"]');
      if (sitesBtn) sitesBtn.click();
    })()
  `);
  await sleep(600);
  await mountPreview();
  await sleep(600);

  // 2. Main Workspace
  console.log('Capturing 02-workspace-main.png...');
  await cdp.screenshot('02-workspace-main.png');

  // 3. Inspector - Element Tab
  console.log('Capturing 03-inspector-element.png...');
  await cdp.evaluate(`
    (() => {
      const tabBtns = [...document.querySelectorAll('button')];
      const elTab = tabBtns.find(b => b.textContent.trim() === 'Element');
      if (elTab) elTab.click();
    })()
  `);
  await sleep(400);
  await cdp.screenshot('03-inspector-element.png');

  // 4. Inspector - Outline Tab
  console.log('Capturing 04-inspector-outline.png...');
  await cdp.evaluate(`
    (() => {
      const tabBtns = [...document.querySelectorAll('button')];
      const outlineTab = tabBtns.find(b => b.textContent.trim() === 'Outline');
      if (outlineTab) outlineTab.click();
    })()
  `);
  await sleep(500);
  await cdp.screenshot('04-inspector-outline.png');

  // 5. Inspector - Photos Tab
  console.log('Capturing 05-inspector-photos.png...');
  await cdp.evaluate(`
    (() => {
      const tabBtns = [...document.querySelectorAll('button')];
      const photosTab = tabBtns.find(b => b.textContent.trim() === 'Photos');
      if (photosTab) photosTab.click();
    })()
  `);
  await sleep(500);
  await cdp.screenshot('05-inspector-photos.png');

  // 6. Content Editor
  console.log('Capturing 06-content-editor.png...');
  await cdp.evaluate(`
    (() => {
      const btn = document.querySelector('button[title="Content"]');
      if (btn) btn.click();
    })()
  `);
  await sleep(600);
  await cdp.screenshot('06-content-editor.png');

  // 7. Component Library
  console.log('Capturing 07-component-library.png...');
  await cdp.evaluate(`
    (() => {
      const btn = document.querySelector('button[title="Components"]');
      if (btn) btn.click();
    })()
  `);
  await sleep(600);
  await cdp.screenshot('07-component-library.png');

  // 8. Design Directions
  console.log('Capturing 08-design-directions.png...');
  await cdp.evaluate(`
    (() => {
      const btn = document.querySelector('button[title="Design directions"]');
      if (btn) btn.click();
    })()
  `);
  await sleep(600);
  await cdp.screenshot('08-design-directions.png');

  // 9. Quality Report
  console.log('Capturing 09-quality-report.png...');
  await cdp.evaluate(`
    (() => {
      const btn = document.querySelector('button[title="Quality checks"]');
      if (btn) btn.click();
    })()
  `);
  await sleep(600);
  await cdp.evaluate(`
    (() => {
      const runBtn = [...document.querySelectorAll('button')].find(b => b.textContent.includes('Run the checks'));
      if (runBtn) runBtn.click();
    })()
  `);
  await sleep(800);
  await cdp.screenshot('09-quality-report.png');

  // 10. Publishing
  console.log('Capturing 10-publishing-deploy.png...');
  await cdp.evaluate(`
    (() => {
      const btn = document.querySelector('button[title="Publishing"]');
      if (btn) btn.click();
    })()
  `);
  await sleep(600);
  await cdp.screenshot('10-publishing-deploy.png');

  console.log(
    '\nAll 10 v1 screenshots successfully captured into v1screenshots/ folder!',
  );
} finally {
  child.kill('SIGTERM');
  setTimeout(() => child.kill('SIGKILL'), 1500).unref();
  await new Promise((resolve) => server.close(resolve));
}
