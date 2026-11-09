import type { LibraryPiece } from './library';

function cataloguePiece(
  id: string,
  name: string,
  category: string,
  description: string,
  markup: string,
  styles: string,
): LibraryPiece {
  const doubled = `.cauldron-${id}.cauldron-${id}`;
  const common = `
.cauldron-${id} { font-family: var(--cauldron-font-body); font-size: var(--cauldron-size-3); }
.cauldron-${id}, .cauldron-${id} * { box-sizing: border-box; }
.cauldron-${id} p, .cauldron-${id} label, .cauldron-${id} input, .cauldron-${id} button, .cauldron-${id} a { font-family: var(--cauldron-font-body); }
.cauldron-${id} a:focus-visible, .cauldron-${id} button:focus-visible, .cauldron-${id} input:focus-visible { outline: 2px solid var(--cauldron-c-primary); outline-offset: 2px; }
`;
  const strongStyles = (common + styles).split(`.cauldron-${id}`).join(doubled);

  const astro = `---
// ${name} — Cauldron catalogue piece.
// Plain Astro, pure HTML/CSS. Edit freely in your site.
---

<section class="cauldron-${id}">
${markup
  .split('\n')
  .map((line) => (line.trim() === '' ? '' : `  ${line}`))
  .join('\n')}
</section>

<style>
${strongStyles}
</style>
`;

  return {
    id,
    name,
    category,
    description,
    licence: 'MIT (Plain Astro). Cauldron starter set, MIT.',
    source: 'Cauldron Section Catalogue',
    needsScript: false,
    codeAllowed: true,
    astro,
    code: astro,
    plainAstro: true,
    styles: common + styles,
    markup,
  };
}

export const EXTENDED_LIBRARY: LibraryPiece[] = [
  // 1. Navigation & Headers
  cataloguePiece(
    'centered-brand-nav',
    'Centered Brand Nav',
    'Navigation',
    'Logo in center, navigation links split evenly to the left and right.',
    `<nav class="nav-bar">
  <div class="nav-links left">
    <a href="/work">Work</a>
    <a href="/services">Services</a>
  </div>
  <a href="/" class="brand-logo">STUDIO</a>
  <div class="nav-links right">
    <a href="/about">About</a>
    <a href="/contact" class="nav-btn">Contact</a>
  </div>
</nav>`,
    `.cauldron-centered-brand-nav {
  background: var(--cauldron-c-surface);
  border-bottom: 1px solid var(--cauldron-c-line);
  padding: var(--cauldron-space-3) var(--cauldron-space-5);
}
.cauldron-centered-brand-nav .nav-bar {
  max-width: 1100px;
  margin: 0 auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.cauldron-centered-brand-nav .brand-logo {
  font-family: var(--cauldron-font-display);
  font-size: var(--cauldron-size-5);
  font-weight: 700;
  text-decoration: none;
  color: var(--cauldron-c-ink);
  letter-spacing: -0.02em;
}
.cauldron-centered-brand-nav .nav-links {
  display: flex;
  align-items: center;
  gap: var(--cauldron-space-4);
}
.cauldron-centered-brand-nav .nav-links a {
  text-decoration: none;
  color: var(--cauldron-c-muted);
  font-size: var(--cauldron-size-2);
  transition: color var(--cauldron-motion-quick) var(--cauldron-motion-easing);
}
.cauldron-centered-brand-nav .nav-links a:hover {
  color: var(--cauldron-c-ink);
}
.cauldron-centered-brand-nav .nav-btn {
  background: var(--cauldron-c-primary);
  color: var(--cauldron-c-surface) !important;
  padding: var(--cauldron-space-2) var(--cauldron-space-3);
  border-radius: var(--cauldron-radius-1);
  font-weight: 600;
}`,
  ),

  cataloguePiece(
    'split-studio-nav',
    'Split Studio Nav',
    'Navigation',
    'Left-aligned title with live commission status indicator, right contact pill.',
    `<header class="studio-header">
  <div class="brand-group">
    <a href="/" class="brand-name">Atelier Practice</a>
    <span class="status-pill"><span class="pulse-dot"></span> Available for Q1 commissions</span>
  </div>
  <div class="header-actions">
    <a href="/work">Selected Work</a>
    <a href="/contact" class="action-pill">Inquire →</a>
  </div>
</header>`,
    `.cauldron-split-studio-nav {
  background: var(--cauldron-c-bg);
  border-bottom: 1px solid var(--cauldron-c-line);
  padding: var(--cauldron-space-4) var(--cauldron-space-6);
}
.cauldron-split-studio-nav .studio-header {
  max-width: 1200px;
  margin: 0 auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: var(--cauldron-space-3);
}
.cauldron-split-studio-nav .brand-group {
  display: flex;
  align-items: center;
  gap: var(--cauldron-space-3);
}
.cauldron-split-studio-nav .brand-name {
  font-family: var(--cauldron-font-display);
  font-size: var(--cauldron-size-4);
  font-weight: 700;
  text-decoration: none;
  color: var(--cauldron-c-ink);
}
.cauldron-split-studio-nav .status-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: var(--cauldron-size-1);
  color: var(--cauldron-c-muted);
  border: 1px solid var(--cauldron-c-line);
  padding: 3px 8px;
  border-radius: var(--cauldron-radius-4);
}
.cauldron-split-studio-nav .pulse-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #22c55e;
}
.cauldron-split-studio-nav .header-actions {
  display: flex;
  align-items: center;
  gap: var(--cauldron-space-4);
}
.cauldron-split-studio-nav .header-actions a {
  text-decoration: none;
  color: var(--cauldron-c-ink);
  font-size: var(--cauldron-size-2);
}
.cauldron-split-studio-nav .action-pill {
  background: var(--cauldron-c-ink);
  color: var(--cauldron-c-surface) !important;
  padding: var(--cauldron-space-2) var(--cauldron-space-4);
  border-radius: var(--cauldron-radius-4);
  font-weight: 600;
}`,
  ),

  cataloguePiece(
    'sticky-pill-nav',
    'Sticky Pill Nav',
    'Navigation',
    'Compact blurred backdrop pill navbar that floats over page content.',
    `<div class="floating-wrap">
  <nav class="pill-bar">
    <a href="/" class="brand-mark">● Studio</a>
    <div class="pill-links">
      <a href="/work">Work</a>
      <a href="/journal">Journal</a>
      <a href="/about">About</a>
    </div>
    <a href="/contact" class="cta">Let's talk</a>
  </nav>
</div>`,
    `.cauldron-sticky-pill-nav {
  position: sticky;
  top: var(--cauldron-space-4);
  z-index: 100;
  padding: 0 var(--cauldron-space-4);
}
.cauldron-sticky-pill-nav .floating-wrap {
  display: flex;
  justify-content: center;
}
.cauldron-sticky-pill-nav .pill-bar {
  display: flex;
  align-items: center;
  gap: var(--cauldron-space-4);
  background: color-mix(in srgb, var(--cauldron-c-surface) 85%, transparent);
  backdrop-filter: blur(12px);
  border: 1px solid var(--cauldron-c-line);
  padding: var(--cauldron-space-2) var(--cauldron-space-4);
  border-radius: var(--cauldron-radius-4);
  box-shadow: 0 4px 16px color-mix(in srgb, var(--cauldron-c-ink) 8%, transparent);
}
.cauldron-sticky-pill-nav a {
  text-decoration: none;
  font-size: var(--cauldron-size-2);
  color: var(--cauldron-c-ink);
}
.cauldron-sticky-pill-nav .pill-links {
  display: flex;
  gap: var(--cauldron-space-3);
  color: var(--cauldron-c-muted);
}
.cauldron-sticky-pill-nav .brand-mark {
  font-weight: 700;
}
.cauldron-sticky-pill-nav .cta {
  background: var(--cauldron-c-primary);
  color: var(--cauldron-c-surface);
  padding: 4px 12px;
  border-radius: var(--cauldron-radius-4);
  font-weight: 600;
}`,
  ),

  // 2. High-Impact Heroes
  cataloguePiece(
    'split-editorial-hero',
    'Split Editorial Hero',
    'Heroes',
    'Oversized serif headline and kicker on left, visual photography showcase on right.',
    `<div class="split-hero">
  <div class="hero-content">
    <span class="kicker">AUTHENTIC CRAFTSMANSHIP</span>
    <h1>Built with permanent integrity.</h1>
    <p class="lede">Structures, interiors, and furniture designed to mature with dignity over generations rather than decaying over decades.</p>
    <div class="hero-actions">
      <a href="/work" class="btn primary">View Recent Projects</a>
      <a href="/services" class="btn secondary">Our Practice</a>
    </div>
  </div>
  <div class="hero-stage">
    <div class="image-frame">
      <span class="frame-label">[ Photography: Stone & Wood Pavilion ]</span>
    </div>
  </div>
</div>`,
    `.cauldron-split-editorial-hero {
  background: var(--cauldron-c-bg);
  padding: var(--cauldron-space-8) var(--cauldron-space-6);
}
.cauldron-split-editorial-hero .split-hero {
  max-width: 1200px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: 1.2fr 1fr;
  gap: var(--cauldron-space-7);
  align-items: center;
}
.cauldron-split-editorial-hero .kicker {
  font-size: var(--cauldron-size-1);
  letter-spacing: 0.12em;
  font-weight: 700;
  color: var(--cauldron-c-primary);
  display: block;
  margin-bottom: var(--cauldron-space-3);
}
.cauldron-split-editorial-hero h1 {
  font-family: var(--cauldron-font-display);
  font-size: clamp(var(--cauldron-size-7), 5vw, var(--cauldron-size-9));
  line-height: 1.08;
  color: var(--cauldron-c-ink);
  margin: 0 0 var(--cauldron-space-4);
}
.cauldron-split-editorial-hero .lede {
  font-size: var(--cauldron-size-4);
  color: var(--cauldron-c-muted);
  line-height: 1.55;
  margin: 0 0 var(--cauldron-space-6);
}
.cauldron-split-editorial-hero .hero-actions {
  display: flex;
  gap: var(--cauldron-space-3);
  flex-wrap: wrap;
}
.cauldron-split-editorial-hero .btn {
  display: inline-flex;
  padding: var(--cauldron-space-3) var(--cauldron-space-5);
  border-radius: var(--cauldron-radius-1);
  text-decoration: none;
  font-weight: 600;
  font-size: var(--cauldron-size-2);
}
.cauldron-split-editorial-hero .btn.primary {
  background: var(--cauldron-c-primary);
  color: var(--cauldron-c-surface);
}
.cauldron-split-editorial-hero .btn.secondary {
  border: 1px solid var(--cauldron-c-line);
  color: var(--cauldron-c-ink);
}
.cauldron-split-editorial-hero .image-frame {
  height: 380px;
  background: var(--cauldron-c-surface);
  border: 1px solid var(--cauldron-c-line);
  border-radius: var(--cauldron-radius-2);
  display: grid;
  place-items: center;
  color: var(--cauldron-c-muted);
  font-size: var(--cauldron-size-2);
}
@media (max-width: 768px) {
  .cauldron-split-editorial-hero .split-hero {
    grid-template-columns: 1fr;
  }
}`,
  ),

  cataloguePiece(
    'typographic-statement-hero',
    'Typographic Statement Hero',
    'Heroes',
    'Screen-filling display typography with subtitle and dual action pills.',
    `<div class="statement-hero">
  <span class="badge">EST. 2026</span>
  <h1 class="statement-title">WE DESIGN SPACES FOR QUIET LIVING.</h1>
  <p class="statement-sub">Residential extensions, joinery, and architectural restoration across Victoria.</p>
  <div class="actions">
    <a href="/quote" class="pill-btn solid">Request Project Consultation</a>
    <a href="/work" class="pill-btn outline">Explore Completed Works →</a>
  </div>
</div>`,
    `.cauldron-typographic-statement-hero {
  background: var(--cauldron-c-bg);
  padding: var(--cauldron-space-8) var(--cauldron-space-5);
  text-align: center;
}
.cauldron-typographic-statement-hero .statement-hero {
  max-width: 960px;
  margin: 0 auto;
}
.cauldron-typographic-statement-hero .badge {
  display: inline-block;
  font-size: var(--cauldron-size-1);
  letter-spacing: 0.15em;
  font-weight: 700;
  color: var(--cauldron-c-muted);
  margin-bottom: var(--cauldron-space-4);
}
.cauldron-typographic-statement-hero .statement-title {
  font-family: var(--cauldron-font-display);
  font-size: clamp(var(--cauldron-size-6), 6vw, var(--cauldron-size-9));
  font-weight: 800;
  line-height: 1.04;
  letter-spacing: -0.02em;
  color: var(--cauldron-c-ink);
  margin: 0 0 var(--cauldron-space-5);
}
.cauldron-typographic-statement-hero .statement-sub {
  font-size: var(--cauldron-size-4);
  color: var(--cauldron-c-muted);
  max-width: 640px;
  margin: 0 auto var(--cauldron-space-6);
  line-height: 1.5;
}
.cauldron-typographic-statement-hero .actions {
  display: flex;
  justify-content: center;
  gap: var(--cauldron-space-3);
  flex-wrap: wrap;
}
.cauldron-typographic-statement-hero .pill-btn {
  display: inline-flex;
  padding: var(--cauldron-space-3) var(--cauldron-space-6);
  border-radius: var(--cauldron-radius-4);
  text-decoration: none;
  font-weight: 600;
}
.cauldron-typographic-statement-hero .pill-btn.solid {
  background: var(--cauldron-c-ink);
  color: var(--cauldron-c-surface);
}
.cauldron-typographic-statement-hero .pill-btn.outline {
  border: 1px solid var(--cauldron-c-line);
  color: var(--cauldron-c-ink);
}`,
  ),

  cataloguePiece(
    'threeui-shader-hero',
    'ThreeUI Shader Hero',
    'Heroes',
    'Subtle ambient canvas mesh gradient wave hero with bold title.',
    `<div class="shader-stage">
  <div class="shader-mesh"></div>
  <div class="shader-content">
    <span class="tag">CREATIVE TECHNOLOGY</span>
    <h1>Interactive Systems Shaped with Taste.</h1>
    <p>Bridging generative software and tactile human aesthetics.</p>
    <a href="/work" class="shader-btn">Explore Experiments</a>
  </div>
</div>`,
    `.cauldron-threeui-shader-hero {
  position: relative;
  overflow: hidden;
  background: var(--cauldron-c-ink);
  color: var(--cauldron-c-surface);
  padding: var(--cauldron-space-8) var(--cauldron-space-5);
}
.cauldron-threeui-shader-hero .shader-stage {
  max-width: 1000px;
  margin: 0 auto;
  position: relative;
  z-index: 1;
}
.cauldron-threeui-shader-hero .shader-mesh {
  position: absolute;
  inset: -50%;
  background: radial-gradient(circle at 30% 40%, color-mix(in srgb, var(--cauldron-c-primary) 40%, transparent) 0%, transparent 60%),
              radial-gradient(circle at 70% 60%, color-mix(in srgb, var(--cauldron-c-surface) 20%, transparent) 0%, transparent 50%);
  filter: blur(40px);
  opacity: 0.7;
  pointer-events: none;
}
.cauldron-threeui-shader-hero .shader-content {
  position: relative;
  max-width: 680px;
}
.cauldron-threeui-shader-hero .tag {
  font-size: var(--cauldron-size-1);
  letter-spacing: 0.1em;
  font-weight: 700;
  color: var(--cauldron-c-primary);
  display: block;
  margin-bottom: var(--cauldron-space-3);
}
.cauldron-threeui-shader-hero h1 {
  font-family: var(--cauldron-font-display);
  font-size: var(--cauldron-size-8);
  line-height: 1.1;
  margin: 0 0 var(--cauldron-space-4);
  color: #ffffff;
}
.cauldron-threeui-shader-hero p {
  font-size: var(--cauldron-size-4);
  color: #cccccc;
  margin-bottom: var(--cauldron-space-5);
}
.cauldron-threeui-shader-hero .shader-btn {
  display: inline-block;
  background: #ffffff;
  color: #111111;
  padding: var(--cauldron-space-3) var(--cauldron-space-5);
  border-radius: var(--cauldron-radius-1);
  font-weight: 600;
  text-decoration: none;
}`,
  ),

  // 3. Services, Menus & Bento Grids
  cataloguePiece(
    'tabbed-menu',
    'Tabbed Menu',
    'Services',
    'Tabbed seasonal menu with dish name, price, dietary tags, and description.',
    `<div class="menu-wrap">
  <div class="menu-header">
    <h2>Daily Seasonal Service</h2>
    <div class="tab-list">
      <span class="tab active">Morning Hearth</span>
      <span class="tab">Long Lunch</span>
      <span class="tab">Natural Wines</span>
    </div>
  </div>
  <div class="menu-items">
    <div class="menu-item">
      <div class="item-head">
        <span class="item-name">Country Sourdough Toast & Cultured Butter</span>
        <span class="item-price">$9.50</span>
      </div>
      <p class="item-desc">Served with seasonal stone-fruit jam or rooftop honeycomb. <span class="diet-tag">V</span></p>
    </div>
    <div class="menu-item">
      <div class="item-head">
        <span class="item-name">Soft Herb & Farm Egg Omelette</span>
        <span class="item-price">$24.00</span>
      </div>
      <p class="item-desc">Locally smoked mountain trout, fresh tarragon, crème fraîche, fennel. <span class="diet-tag">GF</span></p>
    </div>
    <div class="menu-item">
      <div class="item-head">
        <span class="item-name">Wood-Fired Porchetta & Salsa Verde</span>
        <span class="item-price">$36.00</span>
      </div>
      <p class="item-desc">Crisp crackling, pickled mustard seeds, charred bitter leaves.</p>
    </div>
  </div>
</div>`,
    `.cauldron-tabbed-menu {
  background: var(--cauldron-c-bg);
  padding: var(--cauldron-space-8) var(--cauldron-space-5);
}
.cauldron-tabbed-menu .menu-wrap {
  max-width: 860px;
  margin: 0 auto;
}
.cauldron-tabbed-menu .menu-header {
  text-align: center;
  margin-bottom: var(--cauldron-space-6);
}
.cauldron-tabbed-menu h2 {
  font-family: var(--cauldron-font-display);
  font-size: var(--cauldron-size-7);
  color: var(--cauldron-c-ink);
  margin-bottom: var(--cauldron-space-4);
}
.cauldron-tabbed-menu .tab-list {
  display: inline-flex;
  gap: var(--cauldron-space-2);
  border: 1px solid var(--cauldron-c-line);
  padding: 4px;
  border-radius: var(--cauldron-radius-4);
  background: var(--cauldron-c-surface);
}
.cauldron-tabbed-menu .tab {
  padding: var(--cauldron-space-2) var(--cauldron-space-4);
  font-size: var(--cauldron-size-2);
  font-weight: 600;
  border-radius: var(--cauldron-radius-4);
  cursor: pointer;
  color: var(--cauldron-c-muted);
}
.cauldron-tabbed-menu .tab.active {
  background: var(--cauldron-c-primary);
  color: var(--cauldron-c-surface);
}
.cauldron-tabbed-menu .menu-items {
  display: flex;
  flex-direction: column;
  gap: var(--cauldron-space-4);
}
.cauldron-tabbed-menu .menu-item {
  background: var(--cauldron-c-surface);
  border: 1px solid var(--cauldron-c-line);
  padding: var(--cauldron-space-4);
  border-radius: var(--cauldron-radius-2);
}
.cauldron-tabbed-menu .item-head {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin-bottom: 4px;
}
.cauldron-tabbed-menu .item-name {
  font-weight: 700;
  font-size: var(--cauldron-size-3);
  color: var(--cauldron-c-ink);
}
.cauldron-tabbed-menu .item-price {
  font-weight: 700;
  color: var(--cauldron-c-primary);
}
.cauldron-tabbed-menu .item-desc {
  color: var(--cauldron-c-muted);
  font-size: var(--cauldron-size-2);
  margin: 0;
}
.cauldron-tabbed-menu .diet-tag {
  display: inline-block;
  font-size: 10px;
  font-weight: 700;
  padding: 1px 5px;
  border: 1px solid var(--cauldron-c-line);
  border-radius: 3px;
  margin-left: 4px;
}`,
  ),

  cataloguePiece(
    'trade-bento-grid',
    'Trade Bento Grid',
    'Services',
    'Multi-cell bento container highlighting capabilities, emergency callout, and service area.',
    `<div class="bento-container">
  <div class="bento-cell main-cell">
    <span class="cell-kicker">CORE CAPABILITY</span>
    <h3>Architectural Framing & Extensions</h3>
    <p>Complete project supervision from council approvals through lockup and handover. 20-year structural warranty on all timber works.</p>
  </div>
  <div class="bento-cell emergency-cell">
    <span class="cell-kicker">ON-CALL SERVICE</span>
    <h3>Structural Rectification</h3>
    <p>Same-day site assessment for sub-floor damage and storm repair.</p>
  </div>
  <div class="bento-cell badge-cell">
    <span class="cell-kicker">ACCREDITATION</span>
    <h3>Licensed Builder #381920C</h3>
    <p>MBA Member · $20M Public Liability</p>
  </div>
</div>`,
    `.cauldron-trade-bento-grid {
  background: var(--cauldron-c-bg);
  padding: var(--cauldron-space-8) var(--cauldron-space-5);
}
.cauldron-trade-bento-grid .bento-container {
  max-width: 1100px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: 1.5fr 1fr;
  grid-template-rows: auto auto;
  gap: var(--cauldron-space-4);
}
.cauldron-trade-bento-grid .bento-cell {
  background: var(--cauldron-c-surface);
  border: 1px solid var(--cauldron-c-line);
  padding: var(--cauldron-space-6);
  border-radius: var(--cauldron-radius-2);
}
.cauldron-trade-bento-grid .main-cell {
  grid-row: span 2;
}
.cauldron-trade-bento-grid .cell-kicker {
  font-size: var(--cauldron-size-1);
  letter-spacing: 0.08em;
  font-weight: 700;
  color: var(--cauldron-c-primary);
  display: block;
  margin-bottom: var(--cauldron-space-2);
}
.cauldron-trade-bento-grid h3 {
  font-family: var(--cauldron-font-display);
  font-size: var(--cauldron-size-5);
  color: var(--cauldron-c-ink);
  margin: 0 0 var(--cauldron-space-3);
}
.cauldron-trade-bento-grid p {
  color: var(--cauldron-c-muted);
  line-height: 1.55;
  margin: 0;
}
@media (max-width: 768px) {
  .cauldron-trade-bento-grid .bento-container {
    grid-template-columns: 1fr;
  }
}`,
  ),

  cataloguePiece(
    'capability-cards',
    '3-Column Capability Cards',
    'Services',
    'Structured feature boxes with numbered headers, descriptive copy, and quiet button.',
    `<div class="cap-container">
  <div class="cap-card">
    <span class="num">01 /</span>
    <h3>Timber & Joinery</h3>
    <p>Custom blackbutt and spotted gum cabinetry, custom tables, and integrated architectural furniture.</p>
  </div>
  <div class="cap-card">
    <span class="num">02 /</span>
    <h3>Rear Extensions</h3>
    <p>Expanding family homes with high ceiling heights, polished concrete grounds, and insulated glass frames.</p>
  </div>
  <div class="cap-card">
    <span class="num">03 /</span>
    <h3>Heritage Works</h3>
    <p>Victorian weatherboard restoration, sash repairs, and structural chimney removal with engineer certification.</p>
  </div>
</div>`,
    `.cauldron-capability-cards {
  background: var(--cauldron-c-bg);
  padding: var(--cauldron-space-8) var(--cauldron-space-5);
}
.cauldron-capability-cards .cap-container {
  max-width: 1100px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: var(--cauldron-space-5);
}
.cauldron-capability-cards .cap-card {
  background: var(--cauldron-c-surface);
  border: 1px solid var(--cauldron-c-line);
  padding: var(--cauldron-space-6);
  border-radius: var(--cauldron-radius-2);
}
.cauldron-capability-cards .num {
  font-family: var(--cauldron-font-display);
  font-size: var(--cauldron-size-4);
  font-weight: 700;
  color: var(--cauldron-c-primary);
  display: block;
  margin-bottom: var(--cauldron-space-2);
}
.cauldron-capability-cards h3 {
  font-size: var(--cauldron-size-4);
  color: var(--cauldron-c-ink);
  margin: 0 0 var(--cauldron-space-3);
}
.cauldron-capability-cards p {
  color: var(--cauldron-c-muted);
  line-height: 1.55;
  margin: 0;
}`,
  ),

  // 4. Social Proof & Testimonials
  cataloguePiece(
    'editorial-pullquote',
    'Editorial Pullquote',
    'Proof & Testimonials',
    'Centered oversized pull quote with client attribution and border accent.',
    `<div class="quote-wrap">
  <blockquote>
    “They gave our Victorian home room to breathe without erasing an ounce of its historical character.”
  </blockquote>
  <div class="attribution">
    <strong>Eleanor & Marcus Vance</strong>
    <span>Carlton North Residence · 2025</span>
  </div>
</div>`,
    `.cauldron-editorial-pullquote {
  background: var(--cauldron-c-surface);
  border-top: 1px solid var(--cauldron-c-line);
  border-bottom: 1px solid var(--cauldron-c-line);
  padding: var(--cauldron-space-8) var(--cauldron-space-5);
  text-align: center;
}
.cauldron-editorial-pullquote .quote-wrap {
  max-width: 760px;
  margin: 0 auto;
}
.cauldron-editorial-pullquote blockquote {
  font-family: var(--cauldron-font-display);
  font-size: clamp(var(--cauldron-size-5), 4vw, var(--cauldron-size-7));
  line-height: 1.35;
  font-style: italic;
  color: var(--cauldron-c-ink);
  margin: 0 0 var(--cauldron-space-4);
}
.cauldron-editorial-pullquote .attribution strong {
  display: block;
  color: var(--cauldron-c-ink);
  font-size: var(--cauldron-size-3);
}
.cauldron-editorial-pullquote .attribution span {
  color: var(--cauldron-c-muted);
  font-size: var(--cauldron-size-2);
}`,
  ),

  cataloguePiece(
    'masonry-reviews',
    'Masonry Review Cards',
    'Proof & Testimonials',
    'Verified customer review cards with star ratings and job descriptions.',
    `<div class="reviews-wrap">
  <div class="review-card">
    <div class="stars">★★★★★</div>
    <p>“Uncompromising attention to detail. Every mitre joint on our Blackbutt deck was executed to furniture-grade perfection.”</p>
    <span class="reviewer">David K. — Northcote</span>
  </div>
  <div class="review-card">
    <div class="stars">★★★★★</div>
    <p>“Delivered on schedule and on budget. Daily photo updates on site progress made the entire renovation stress-free.”</p>
    <span class="reviewer">Sarah L. — Fitzroy</span>
  </div>
  <div class="review-card">
    <div class="stars">★★★★★</div>
    <p>“A team of real craftspeople who genuinely take pride in their work. We couldn't be happier with our new studio.”</p>
    <span class="reviewer">Julian B. — Brunswick</span>
  </div>
</div>`,
    `.cauldron-masonry-reviews {
  background: var(--cauldron-c-bg);
  padding: var(--cauldron-space-8) var(--cauldron-space-5);
}
.cauldron-masonry-reviews .reviews-wrap {
  max-width: 1100px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: var(--cauldron-space-4);
}
.cauldron-masonry-reviews .review-card {
  background: var(--cauldron-c-surface);
  border: 1px solid var(--cauldron-c-line);
  padding: var(--cauldron-space-5);
  border-radius: var(--cauldron-radius-2);
}
.cauldron-masonry-reviews .stars {
  color: var(--cauldron-c-primary);
  font-size: var(--cauldron-size-3);
  margin-bottom: var(--cauldron-space-2);
}
.cauldron-masonry-reviews p {
  color: var(--cauldron-c-ink);
  line-height: 1.5;
  margin: 0 0 var(--cauldron-space-4);
}
.cauldron-masonry-reviews .reviewer {
  font-size: var(--cauldron-size-2);
  color: var(--cauldron-c-muted);
  font-weight: 600;
}`,
  ),

  cataloguePiece(
    'trade-accreditations',
    'Trade Accreditation & Partner Badges',
    'Proof & Testimonials',
    'Clean monochrome badge strip for trade licenses, master associations, and warranties.',
    `<div class="badge-strip-container">
  <p class="strip-label">Certified Licences & Trust Guarantees</p>
  <div class="badges-row">
    <div class="badge-item">
      <span class="badge-icon">✓</span>
      <span class="badge-text">Licensed Builder #49201</span>
    </div>
    <div class="badge-item">
      <span class="badge-icon">✓</span>
      <span class="badge-text">Master Trades Association</span>
    </div>
    <div class="badge-item">
      <span class="badge-icon">✓</span>
      <span class="badge-text">Fully Insured & Bonded</span>
    </div>
    <div class="badge-item">
      <span class="badge-icon">✓</span>
      <span class="badge-text">10-Year Craft Guarantee</span>
    </div>
  </div>
</div>`,
    `.cauldron-trade-accreditations {
  background: var(--cauldron-c-surface);
  border-top: 1px solid var(--cauldron-c-line);
  border-bottom: 1px solid var(--cauldron-c-line);
  padding: var(--cauldron-space-5) var(--cauldron-space-4);
}
.cauldron-trade-accreditations .badge-strip-container {
  max-width: 1080px;
  margin: 0 auto;
  text-align: center;
}
.cauldron-trade-accreditations .strip-label {
  font-size: var(--cauldron-size-1);
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--cauldron-c-muted);
  margin-bottom: var(--cauldron-space-3);
  font-weight: 600;
}
.cauldron-trade-accreditations .badges-row {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  align-items: center;
  gap: var(--cauldron-space-6);
}
.cauldron-trade-accreditations .badge-item {
  display: flex;
  align-items: center;
  gap: 8px;
}
.cauldron-trade-accreditations .badge-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: var(--cauldron-c-primary);
  color: #fff;
  font-size: 11px;
  font-weight: 700;
}
.cauldron-trade-accreditations .badge-text {
  font-size: var(--cauldron-size-2);
  font-weight: 500;
  color: var(--cauldron-c-ink);
}
@media (max-width: 640px) {
  .cauldron-trade-accreditations .badges-row {
    flex-direction: column;
    gap: var(--cauldron-space-3);
  }
}`,
  ),

  // 5. Contact, Visit & FAQ
  cataloguePiece(
    'studio-contact-hours',
    'Studio Contact & Hours',
    'Contact & FAQ',
    '2-column layout: phone, email, opening hours on left; contact form on right.',
    `<div class="contact-grid">
  <div class="info-col">
    <h2>Start a Conversation</h2>
    <p class="intro">We take on a limited number of commissions each year to ensure personal supervision.</p>
    <div class="meta-block">
      <h4>Studio</h4>
      <p>42 Victoria Lane, Melbourne VIC</p>
      <p>hello@example.com</p>
      <p>+61 3 9419 0000</p>
    </div>
    <div class="meta-block">
      <h4>Consultation Hours</h4>
      <p>Monday – Friday: 8:00 am – 5:00 pm</p>
      <p>Saturday: By appointment</p>
    </div>
  </div>
  <div class="form-col">
    <form class="contact-form" action="/" method="post">
      <label>Your Name <input type="text" placeholder="e.g. Fiona Campbell" /></label>
      <label>Email Address <input type="email" placeholder="you@domain.com" /></label>
      <label>Project Scope <textarea rows="4" placeholder="Tell us about your project..."></textarea></label>
      <button type="button" class="submit-btn">Send Message</button>
    </form>
  </div>
</div>`,
    `.cauldron-studio-contact-hours {
  background: var(--cauldron-c-bg);
  padding: var(--cauldron-space-8) var(--cauldron-space-6);
}
.cauldron-studio-contact-hours .contact-grid {
  max-width: 1000px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--cauldron-space-7);
}
.cauldron-studio-contact-hours h2 {
  font-family: var(--cauldron-font-display);
  font-size: var(--cauldron-size-7);
  color: var(--cauldron-c-ink);
  margin-bottom: var(--cauldron-space-3);
}
.cauldron-studio-contact-hours .intro {
  color: var(--cauldron-c-muted);
  font-size: var(--cauldron-size-3);
  margin-bottom: var(--cauldron-space-5);
}
.cauldron-studio-contact-hours .meta-block {
  margin-bottom: var(--cauldron-space-4);
}
.cauldron-studio-contact-hours .meta-block h4 {
  font-size: var(--cauldron-size-2);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--cauldron-c-primary);
  margin-bottom: 4px;
}
.cauldron-studio-contact-hours .meta-block p {
  color: var(--cauldron-c-muted);
  margin: 2px 0;
}
.cauldron-studio-contact-hours .contact-form {
  background: var(--cauldron-c-surface);
  border: 1px solid var(--cauldron-c-line);
  padding: var(--cauldron-space-6);
  border-radius: var(--cauldron-radius-2);
  display: flex;
  flex-direction: column;
  gap: var(--cauldron-space-4);
}
.cauldron-studio-contact-hours label {
  font-size: var(--cauldron-size-2);
  font-weight: 600;
  color: var(--cauldron-c-ink);
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.cauldron-studio-contact-hours input, .cauldron-studio-contact-hours textarea {
  border: 1px solid var(--cauldron-c-line);
  padding: var(--cauldron-space-3);
  border-radius: var(--cauldron-radius-1);
  background: var(--cauldron-c-bg);
  color: var(--cauldron-c-ink);
  font-size: var(--cauldron-size-3);
}
.cauldron-studio-contact-hours .submit-btn {
  background: var(--cauldron-c-primary);
  color: var(--cauldron-c-surface);
  padding: var(--cauldron-space-3);
  border-radius: var(--cauldron-radius-1);
  border: none;
  font-weight: 600;
  cursor: pointer;
}
@media (max-width: 768px) {
  .cauldron-studio-contact-hours .contact-grid {
    grid-template-columns: 1fr;
  }
}`,
  ),

  cataloguePiece(
    'accordion-faq',
    'Accordion FAQ',
    'Contact & FAQ',
    'Accessible native accordion questions with chevrons and smooth disclosure.',
    `<div class="faq-wrap">
  <div class="faq-header">
    <h2>Common Inquiries</h2>
    <p>Straightforward answers regarding our commission and construction process.</p>
  </div>
  <div class="faq-items">
    <details class="faq-item">
      <summary>What is your typical project timeline?</summary>
      <div class="answer"><p>Initial architectural scoping takes 2–4 weeks. Construction runs anywhere from 8 weeks for interior joinery to 6 months for major residential alterations.</p></div>
    </details>
    <details class="faq-item">
      <summary>How do you handle budget and scope changes?</summary>
      <div class="answer"><p>We work exclusively on upfront itemised fixed quotes. Any client-requested alteration is quoted in writing before work proceeds.</p></div>
    </details>
    <details class="faq-item">
      <summary>Are your timber sources certified?</summary>
      <div class="answer"><p>Yes, all hardwood is sourced from certified sustainable Victorian plantations with complete chain-of-custody documentation.</p></div>
    </details>
  </div>
</div>`,
    `.cauldron-accordion-faq {
  background: var(--cauldron-c-bg);
  padding: var(--cauldron-space-8) var(--cauldron-space-5);
}
.cauldron-accordion-faq .faq-wrap {
  max-width: 780px;
  margin: 0 auto;
}
.cauldron-accordion-faq .faq-header {
  text-align: center;
  margin-bottom: var(--cauldron-space-6);
}
.cauldron-accordion-faq h2 {
  font-family: var(--cauldron-font-display);
  font-size: var(--cauldron-size-7);
  color: var(--cauldron-c-ink);
  margin-bottom: var(--cauldron-space-2);
}
.cauldron-accordion-faq .faq-header p {
  color: var(--cauldron-c-muted);
}
.cauldron-accordion-faq .faq-items {
  display: flex;
  flex-direction: column;
  gap: var(--cauldron-space-3);
}
.cauldron-accordion-faq .faq-item {
  background: var(--cauldron-c-surface);
  border: 1px solid var(--cauldron-c-line);
  border-radius: var(--cauldron-radius-2);
  padding: var(--cauldron-space-4);
}
.cauldron-accordion-faq summary {
  font-weight: 700;
  font-size: var(--cauldron-size-3);
  color: var(--cauldron-c-ink);
  cursor: pointer;
}
.cauldron-accordion-faq .answer {
  padding-top: var(--cauldron-space-3);
  color: var(--cauldron-c-muted);
  line-height: 1.55;
}`,
  ),

  // 6. Footers
  cataloguePiece(
    'studio-directory',
    'Studio Directory Footer',
    'Footers',
    'Multi-column site directory: brand statement, site index, social links, and copyright.',
    `<footer class="directory-footer">
  <div class="footer-grid">
    <div class="col brand-col">
      <h3>STUDIO PRACTICE</h3>
      <p>Permanent residential architecture, timber framing, and heritage joinery.</p>
    </div>
    <div class="col">
      <h4>Navigation</h4>
      <a href="/work">Selected Projects</a>
      <a href="/services">Trade Scope</a>
      <a href="/about">Practice</a>
    </div>
    <div class="col">
      <h4>Direct Contact</h4>
      <p>Melbourne, Victoria</p>
      <p>hello@example.com</p>
      <p>1300 000 888</p>
    </div>
  </div>
  <div class="footer-bottom">
    <p>© 2026 Studio Practice. Built with Cauldron & Astro.</p>
  </div>
</footer>`,
    `.cauldron-studio-directory {
  background: var(--cauldron-c-ink);
  color: var(--cauldron-c-surface);
  padding: var(--cauldron-space-8) var(--cauldron-space-6) var(--cauldron-space-5);
}
.cauldron-studio-directory .footer-grid {
  max-width: 1100px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: 2fr 1fr 1fr;
  gap: var(--cauldron-space-6);
  margin-bottom: var(--cauldron-space-7);
}
.cauldron-studio-directory h3 {
  font-family: var(--cauldron-font-display);
  font-size: var(--cauldron-size-4);
  color: #fff;
  margin-bottom: var(--cauldron-space-2);
}
.cauldron-studio-directory h4 {
  font-size: var(--cauldron-size-2);
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--cauldron-c-primary);
  margin-bottom: var(--cauldron-space-3);
}
.cauldron-studio-directory p {
  color: #aaa;
  font-size: var(--cauldron-size-2);
  line-height: 1.55;
  margin: 4px 0;
}
.cauldron-studio-directory a {
  display: block;
  color: #ccc;
  text-decoration: none;
  font-size: var(--cauldron-size-2);
  margin-bottom: 6px;
}
.cauldron-studio-directory a:hover {
  color: #fff;
}
.cauldron-studio-directory .footer-bottom {
  max-width: 1100px;
  margin: 0 auto;
  border-top: 1px solid #333;
  padding-top: var(--cauldron-space-4);
  font-size: var(--cauldron-size-1);
  color: #777;
}
@media (max-width: 768px) {
  .cauldron-studio-directory .footer-grid {
    grid-template-columns: 1fr;
  }
}`,
  ),
];
