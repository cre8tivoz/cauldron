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
  cataloguePiece(
    'mobile-slide-menu',
    'Mobile Slide-Out Menu',
    'Navigation',
    'Responsive header with keyboard-accessible disclosure menu drawer on compact viewports.',
    `<nav class="nav-shell" aria-label="Primary">
  <a href="/" class="brand-mark">ATELIER</a>
  <div class="desktop-links">
    <a href="/work">Work</a>
    <a href="/services">Services</a>
    <a href="/pricing">Pricing</a>
    <a href="/contact" class="nav-cta">Start a project</a>
  </div>
  <details class="mobile-drawer">
    <summary class="drawer-toggle">Menu</summary>
    <div class="drawer-panel">
      <a href="/work">Work</a>
      <a href="/services">Services</a>
      <a href="/pricing">Pricing</a>
      <a href="/contact" class="nav-cta">Start a project</a>
    </div>
  </details>
</nav>`,
    `.cauldron-mobile-slide-menu {
  background: var(--cauldron-c-surface);
  border-bottom: 1px solid var(--cauldron-c-line);
  padding: var(--cauldron-space-3) var(--cauldron-space-5);
}
.cauldron-mobile-slide-menu .nav-shell {
  max-width: 1120px;
  margin: 0 auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--cauldron-space-4);
  position: relative;
}
.cauldron-mobile-slide-menu .brand-mark {
  font-family: var(--cauldron-font-display);
  font-size: var(--cauldron-size-4);
  font-weight: 700;
  color: var(--cauldron-c-ink);
  text-decoration: none;
  letter-spacing: 0.04em;
}
.cauldron-mobile-slide-menu .desktop-links {
  display: flex;
  align-items: center;
  gap: var(--cauldron-space-4);
}
.cauldron-mobile-slide-menu .desktop-links a,
.cauldron-mobile-slide-menu .drawer-panel a {
  text-decoration: none;
  color: var(--cauldron-c-ink);
  font-size: var(--cauldron-size-2);
}
.cauldron-mobile-slide-menu .nav-cta {
  padding: 8px 16px;
  border-radius: var(--cauldron-radius-pill);
  background: var(--cauldron-c-primary);
  color: var(--cauldron-c-surface);
  font-weight: 600;
}
.cauldron-mobile-slide-menu .mobile-drawer {
  display: none;
}
.cauldron-mobile-slide-menu .drawer-toggle {
  list-style: none;
  cursor: pointer;
  padding: 8px 14px;
  border: 1px solid var(--cauldron-c-line);
  border-radius: var(--cauldron-radius-1);
  color: var(--cauldron-c-ink);
  font-size: var(--cauldron-size-2);
  font-weight: 600;
}
.cauldron-mobile-slide-menu .drawer-toggle:focus-visible {
  outline: 2px solid var(--cauldron-c-primary);
  outline-offset: 2px;
}
.cauldron-mobile-slide-menu .drawer-panel {
  position: absolute;
  right: 0;
  top: calc(100% + 10px);
  min-width: 220px;
  background: var(--cauldron-c-surface);
  border: 1px solid var(--cauldron-c-line);
  border-radius: var(--cauldron-radius-2);
  padding: var(--cauldron-space-4);
  display: flex;
  flex-direction: column;
  gap: var(--cauldron-space-3);
  z-index: 20;
}
@media (max-width: 768px) {
  .cauldron-mobile-slide-menu .desktop-links {
    display: none;
  }
  .cauldron-mobile-slide-menu .mobile-drawer {
    display: block;
  }
}`,
  ),
  cataloguePiece(
    'card-carousel-hero',
    'Card Carousel Hero',
    'Heroes',
    'Editorial hero paired with a keyboard-scrollable horizontal showcase card strip.',
    `<div class="carousel-hero">
  <div class="hero-copy">
    <p class="hero-kicker">Featured Editions</p>
    <h1>Built for calm browsing on every screen</h1>
    <p class="hero-lead">A tactile showcase of recent releases, paced cleanly with snap-aligned cards.</p>
    <a href="/work" class="hero-cta">Explore archive</a>
  </div>
  <div class="card-track" tabindex="0" aria-label="Featured project cards">
    <article class="snap-card">
      <span class="card-tag">01 / Brand</span>
      <h2>Harbour Roasters</h2>
      <p>Packaging and direct-to-consumer storefront.</p>
    </article>
    <article class="snap-card">
      <span class="card-tag">02 / Architecture</span>
      <h2>Kestrel House</h2>
      <p>Monograph and daylight study archive.</p>
    </article>
    <article class="snap-card">
      <span class="card-tag">03 / Craft</span>
      <h2>Loom &amp; Kiln</h2>
      <p>Seasonal ceramics catalogue and studio notes.</p>
    </article>
  </div>
</div>`,
    `.cauldron-card-carousel-hero {
  background: var(--cauldron-c-surface);
  color: var(--cauldron-c-ink);
  padding: var(--cauldron-space-7) var(--cauldron-space-5);
}
.cauldron-card-carousel-hero .carousel-hero {
  max-width: 1120px;
  margin: 0 auto;
  display: grid;
  gap: var(--cauldron-space-5);
}
.cauldron-card-carousel-hero .hero-kicker {
  font-size: var(--cauldron-size-1);
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: var(--cauldron-c-primary);
  margin: 0 0 var(--cauldron-space-2);
  font-weight: 700;
}
.cauldron-card-carousel-hero h1 {
  font-family: var(--cauldron-font-display);
  font-size: var(--cauldron-size-7);
  line-height: 1.05;
  margin: 0 0 var(--cauldron-space-3);
  max-width: 18ch;
}
.cauldron-card-carousel-hero .hero-lead {
  color: var(--cauldron-c-muted);
  max-width: 52ch;
  margin: 0 0 var(--cauldron-space-4);
  line-height: 1.55;
}
.cauldron-card-carousel-hero .hero-cta {
  display: inline-block;
  padding: 12px 22px;
  border-radius: var(--cauldron-radius-pill);
  background: var(--cauldron-c-ink);
  color: var(--cauldron-c-surface);
  text-decoration: none;
  font-weight: 600;
  font-size: var(--cauldron-size-2);
}
.cauldron-card-carousel-hero .card-track {
  display: grid;
  grid-auto-flow: column;
  grid-auto-columns: minmax(260px, 1fr);
  gap: var(--cauldron-space-4);
  overflow-x: auto;
  scroll-snap-type: x mandatory;
  padding-bottom: var(--cauldron-space-2);
}
.cauldron-card-carousel-hero .card-track:focus-visible {
  outline: 2px solid var(--cauldron-c-primary);
  outline-offset: 4px;
}
.cauldron-card-carousel-hero .snap-card {
  scroll-snap-align: start;
  border: 1px solid var(--cauldron-c-line);
  border-radius: var(--cauldron-radius-2);
  padding: var(--cauldron-space-5);
  background: var(--cauldron-c-surface);
}
.cauldron-card-carousel-hero .card-tag {
  font-size: var(--cauldron-size-1);
  color: var(--cauldron-c-primary);
  font-weight: 700;
}
.cauldron-card-carousel-hero .snap-card h2 {
  font-family: var(--cauldron-font-display);
  font-size: var(--cauldron-size-4);
  margin: var(--cauldron-space-2) 0;
}
.cauldron-card-carousel-hero .snap-card p {
  margin: 0;
  color: var(--cauldron-c-muted);
  font-size: var(--cauldron-size-2);
  line-height: 1.5;
}
@media (max-width: 768px) {
  .cauldron-card-carousel-hero {
    padding: var(--cauldron-space-5) var(--cauldron-space-4);
  }
  .cauldron-card-carousel-hero h1 {
    font-size: var(--cauldron-size-5);
  }
}`,
  ),
  cataloguePiece(
    'hover-reveal-work',
    'Hover-Reveal Work List',
    'Galleries',
    'Editorial index of projects with subtle discipline and year reveal on hover or keyboard focus.',
    `<div class="work-index">
  <div class="index-head">
    <h2>Selected Work</h2>
    <p>Recent commissions across editorial, identity, and digital craft.</p>
  </div>
  <ul class="work-rows">
    <li>
      <a href="/work/solstice-press" class="work-row">
        <span class="work-title">Solstice Press</span>
        <span class="work-meta">Editorial System · 2026</span>
      </a>
    </li>
    <li>
      <a href="/work/north-pier" class="work-row">
        <span class="work-title">North Pier Bakery</span>
        <span class="work-meta">Identity &amp; Web · 2026</span>
      </a>
    </li>
    <li>
      <a href="/work/meridian-labs" class="work-row">
        <span class="work-title">Meridian Acoustic</span>
        <span class="work-meta">Product Catalogue · 2025</span>
      </a>
    </li>
  </ul>
</div>`,
    `.cauldron-hover-reveal-work {
  background: var(--cauldron-c-surface);
  color: var(--cauldron-c-ink);
  padding: var(--cauldron-space-7) var(--cauldron-space-5);
}
.cauldron-hover-reveal-work .work-index {
  max-width: 960px;
  margin: 0 auto;
}
.cauldron-hover-reveal-work .index-head h2 {
  font-family: var(--cauldron-font-display);
  font-size: var(--cauldron-size-5);
  margin: 0 0 var(--cauldron-space-2);
}
.cauldron-hover-reveal-work .index-head p {
  margin: 0 0 var(--cauldron-space-5);
  color: var(--cauldron-c-muted);
}
.cauldron-hover-reveal-work .work-rows {
  list-style: none;
  margin: 0;
  padding: 0;
  border-top: 1px solid var(--cauldron-c-line);
}
.cauldron-hover-reveal-work .work-row {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--cauldron-space-4);
  padding: var(--cauldron-space-4) var(--cauldron-space-2);
  border-bottom: 1px solid var(--cauldron-c-line);
  text-decoration: none;
  color: var(--cauldron-c-ink);
  transition: border-color 180ms ease, padding-inline-start 180ms ease;
}
.cauldron-hover-reveal-work .work-title {
  font-family: var(--cauldron-font-display);
  font-size: var(--cauldron-size-4);
  font-weight: 600;
}
.cauldron-hover-reveal-work .work-meta {
  font-size: var(--cauldron-size-2);
  color: var(--cauldron-c-muted);
}
.cauldron-hover-reveal-work .work-row:hover,
.cauldron-hover-reveal-work .work-row:focus-visible {
  border-bottom-color: var(--cauldron-c-primary);
  padding-inline-start: var(--cauldron-space-4);
}
.cauldron-hover-reveal-work .work-row:hover .work-meta,
.cauldron-hover-reveal-work .work-row:focus-visible .work-meta {
  color: var(--cauldron-c-primary);
}
@media (prefers-reduced-motion: reduce) {
  .cauldron-hover-reveal-work .work-row {
    transition: none;
  }
}
@media (max-width: 768px) {
  .cauldron-hover-reveal-work .work-row {
    flex-direction: column;
    gap: 4px;
  }
}`,
  ),
  cataloguePiece(
    'masonry-photo-lookbook',
    'Masonry Photo Lookbook',
    'Galleries',
    'Multi-column editorial lookbook frames using CSS columns for varied vertical rhythm.',
    `<div class="lookbook-wrap">
  <div class="lookbook-head">
    <h2>Studio Lookbook</h2>
    <p>Staggered frames sized naturally for photography, sketches, and print specimens.</p>
  </div>
  <div class="lookbook-columns">
    <figure class="lookbook-frame tall">
      <div class="frame-art" aria-hidden="true">01</div>
      <figcaption>Morning light on raw linen, Autumn edition.</figcaption>
    </figure>
    <figure class="lookbook-frame">
      <div class="frame-art" aria-hidden="true">02</div>
      <figcaption>Hand-glazed stoneware vessel study.</figcaption>
    </figure>
    <figure class="lookbook-frame">
      <div class="frame-art" aria-hidden="true">03</div>
      <figcaption>Letterpress cover proof on cotton stock.</figcaption>
    </figure>
    <figure class="lookbook-frame tall">
      <div class="frame-art" aria-hidden="true">04</div>
      <figcaption>Timber joinery detail from the workshop.</figcaption>
    </figure>
  </div>
</div>`,
    `.cauldron-masonry-photo-lookbook {
  background: var(--cauldron-c-surface);
  color: var(--cauldron-c-ink);
  padding: var(--cauldron-space-7) var(--cauldron-space-5);
}
.cauldron-masonry-photo-lookbook .lookbook-wrap {
  max-width: 1100px;
  margin: 0 auto;
}
.cauldron-masonry-photo-lookbook .lookbook-head h2 {
  font-family: var(--cauldron-font-display);
  font-size: var(--cauldron-size-5);
  margin: 0 0 var(--cauldron-space-2);
}
.cauldron-masonry-photo-lookbook .lookbook-head p {
  margin: 0 0 var(--cauldron-space-5);
  color: var(--cauldron-c-muted);
}
.cauldron-masonry-photo-lookbook .lookbook-columns {
  columns: 2;
  column-gap: var(--cauldron-space-4);
}
.cauldron-masonry-photo-lookbook .lookbook-frame {
  break-inside: avoid;
  margin: 0 0 var(--cauldron-space-4);
  border: 1px solid var(--cauldron-c-line);
  border-radius: var(--cauldron-radius-2);
  padding: var(--cauldron-space-3);
  background: var(--cauldron-c-surface);
}
.cauldron-masonry-photo-lookbook .frame-art {
  aspect-ratio: 4 / 3;
  display: grid;
  place-items: center;
  border-radius: var(--cauldron-radius-1);
  border: 1px dashed var(--cauldron-c-line);
  font-family: var(--cauldron-font-display);
  font-size: var(--cauldron-size-5);
  color: var(--cauldron-c-muted);
}
.cauldron-masonry-photo-lookbook .lookbook-frame.tall .frame-art {
  aspect-ratio: 3 / 4;
}
.cauldron-masonry-photo-lookbook figcaption {
  margin-top: var(--cauldron-space-2);
  font-size: var(--cauldron-size-2);
  color: var(--cauldron-c-muted);
}
@media (max-width: 768px) {
  .cauldron-masonry-photo-lookbook .lookbook-columns {
    columns: 1;
  }
}`,
  ),
  cataloguePiece(
    'before-after-compare',
    'Before & After Showcase',
    'Galleries',
    'Clear side-by-side Before and After comparison cards with measurable outcomes.',
    `<div class="compare-wrap">
  <div class="compare-head">
    <h2>Before &amp; After Transformation</h2>
    <p>Side-by-side clarity without hidden controls or mouse-only gestures.</p>
  </div>
  <div class="compare-grid">
    <article class="compare-card">
      <span class="state-badge">Before</span>
      <h3>Unstructured Legacy Front</h3>
      <p>Slow navigation, cramped mobile cards, and low-contrast action links.</p>
    </article>
    <article class="compare-card after">
      <span class="state-badge primary">After</span>
      <h3>Tokenised Editorial Rebuild</h3>
      <p>4.8s faster first paint, 4.5:1 verified contrast, and clean 375px stacking.</p>
    </article>
  </div>
</div>`,
    `.cauldron-before-after-compare {
  background: var(--cauldron-c-surface);
  color: var(--cauldron-c-ink);
  padding: var(--cauldron-space-7) var(--cauldron-space-5);
}
.cauldron-before-after-compare .compare-wrap {
  max-width: 1040px;
  margin: 0 auto;
}
.cauldron-before-after-compare .compare-head h2 {
  font-family: var(--cauldron-font-display);
  font-size: var(--cauldron-size-5);
  margin: 0 0 var(--cauldron-space-2);
}
.cauldron-before-after-compare .compare-head p {
  margin: 0 0 var(--cauldron-space-5);
  color: var(--cauldron-c-muted);
}
.cauldron-before-after-compare .compare-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--cauldron-space-4);
}
.cauldron-before-after-compare .compare-card {
  border: 1px solid var(--cauldron-c-line);
  border-radius: var(--cauldron-radius-2);
  padding: var(--cauldron-space-5);
  background: var(--cauldron-c-surface);
}
.cauldron-before-after-compare .compare-card.after {
  border-color: var(--cauldron-c-primary);
}
.cauldron-before-after-compare .state-badge {
  display: inline-block;
  font-size: var(--cauldron-size-1);
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  padding: 4px 10px;
  border-radius: var(--cauldron-radius-pill);
  border: 1px solid var(--cauldron-c-line);
  color: var(--cauldron-c-ink);
  margin-bottom: var(--cauldron-space-3);
}
.cauldron-before-after-compare .state-badge.primary {
  background: var(--cauldron-c-primary);
  border-color: var(--cauldron-c-primary);
  color: var(--cauldron-c-surface);
}
.cauldron-before-after-compare h3 {
  font-family: var(--cauldron-font-display);
  font-size: var(--cauldron-size-4);
  margin: 0 0 var(--cauldron-space-2);
}
.cauldron-before-after-compare p {
  margin: 0;
  color: var(--cauldron-c-muted);
  line-height: 1.55;
}
@media (max-width: 768px) {
  .cauldron-before-after-compare .compare-grid {
    grid-template-columns: 1fr;
  }
}`,
  ),
  cataloguePiece(
    'product-showcase-grid',
    'Product Showcase Grid',
    'Galleries',
    'Three-column product and edition grid with category tags, pricing, and clear links.',
    `<div class="showcase-wrap">
  <div class="showcase-head">
    <h2>Studio Editions</h2>
    <p>Small-batch objects and print monographs available directly.</p>
  </div>
  <div class="product-grid">
    <article class="product-card">
      <div class="product-thumb" aria-hidden="true">Edition 01</div>
      <div class="product-meta"><span>Print</span><strong>$48</strong></div>
      <h3>Field Notes Vol. IV</h3>
      <p>128-page thread-sewn monograph on natural light.</p>
      <a href="/shop/field-notes" class="product-link">View edition</a>
    </article>
    <article class="product-card">
      <div class="product-thumb" aria-hidden="true">Edition 02</div>
      <div class="product-meta"><span>Ceramic</span><strong>$95</strong></div>
      <h3>Ash Glaze Carafe</h3>
      <p>Wheel-thrown stoneware fired in small studio runs.</p>
      <a href="/shop/carafe" class="product-link">View edition</a>
    </article>
    <article class="product-card">
      <div class="product-thumb" aria-hidden="true">Edition 03</div>
      <div class="product-meta"><span>Textile</span><strong>$140</strong></div>
      <h3>Heavy Linen Apron</h3>
      <p>Washed Belgian flax with reinforced studio pockets.</p>
      <a href="/shop/apron" class="product-link">View edition</a>
    </article>
  </div>
</div>`,
    `.cauldron-product-showcase-grid {
  background: var(--cauldron-c-surface);
  color: var(--cauldron-c-ink);
  padding: var(--cauldron-space-7) var(--cauldron-space-5);
}
.cauldron-product-showcase-grid .showcase-wrap {
  max-width: 1120px;
  margin: 0 auto;
}
.cauldron-product-showcase-grid .showcase-head h2 {
  font-family: var(--cauldron-font-display);
  font-size: var(--cauldron-size-5);
  margin: 0 0 var(--cauldron-space-2);
}
.cauldron-product-showcase-grid .showcase-head p {
  margin: 0 0 var(--cauldron-space-5);
  color: var(--cauldron-c-muted);
}
.cauldron-product-showcase-grid .product-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: var(--cauldron-space-4);
}
.cauldron-product-showcase-grid .product-card {
  border: 1px solid var(--cauldron-c-line);
  border-radius: var(--cauldron-radius-2);
  padding: var(--cauldron-space-4);
  display: flex;
  flex-direction: column;
  gap: var(--cauldron-space-2);
}
.cauldron-product-showcase-grid .product-thumb {
  aspect-ratio: 4 / 3;
  display: grid;
  place-items: center;
  border-radius: var(--cauldron-radius-1);
  border: 1px dashed var(--cauldron-c-line);
  color: var(--cauldron-c-muted);
  font-size: var(--cauldron-size-2);
}
.cauldron-product-showcase-grid .product-meta {
  display: flex;
  justify-content: space-between;
  font-size: var(--cauldron-size-2);
  color: var(--cauldron-c-muted);
}
.cauldron-product-showcase-grid .product-meta strong {
  color: var(--cauldron-c-ink);
}
.cauldron-product-showcase-grid h3 {
  font-family: var(--cauldron-font-display);
  font-size: var(--cauldron-size-4);
  margin: 0;
}
.cauldron-product-showcase-grid .product-card p {
  margin: 0;
  color: var(--cauldron-c-muted);
  font-size: var(--cauldron-size-2);
  line-height: 1.5;
  flex: 1;
}
.cauldron-product-showcase-grid .product-link {
  margin-top: var(--cauldron-space-2);
  display: inline-block;
  font-weight: 600;
  color: var(--cauldron-c-primary);
  text-decoration: none;
  font-size: var(--cauldron-size-2);
}
@media (max-width: 768px) {
  .cauldron-product-showcase-grid .product-grid {
    grid-template-columns: 1fr;
  }
}`,
  ),
  cataloguePiece(
    'tiered-pricing-cards',
    '3-Tier Pricing Grid',
    'Pricing',
    'Three structured pricing tiers with a highlighted recommended option and clear CTAs.',
    `<div class="pricing-wrap">
  <div class="pricing-head">
    <h2>Transparent Packages</h2>
    <p>Fixed-scope engagements built in clean, maintainable Astro.</p>
  </div>
  <div class="tier-grid">
    <article class="tier-card">
      <h3>Starter Site</h3>
      <p class="tier-price">$1,800</p>
      <p class="tier-desc">Focused 3-page presence for a local studio or practice.</p>
      <ul>
        <li>Custom design tokens &amp; typography</li>
        <li>Mobile &amp; accessibility verification</li>
        <li>Static Cloudflare or Git deploy</li>
      </ul>
      <a href="/contact?plan=starter" class="tier-btn">Choose Starter</a>
    </article>
    <article class="tier-card featured">
      <span class="tier-badge">Most Popular</span>
      <h3>Editorial Studio</h3>
      <p class="tier-price">$3,400</p>
      <p class="tier-desc">Multi-page portfolio with lookbook galleries and FAQ.</p>
      <ul>
        <li>Up to 8 bespoke Astro pages</li>
        <li>Collection-driven content schemas</li>
        <li>Two post-launch refinement rounds</li>
      </ul>
      <a href="/contact?plan=studio" class="tier-btn primary">Choose Studio</a>
    </article>
    <article class="tier-card">
      <h3>Ongoing Partner</h3>
      <p class="tier-price">$950<span>/mo</span></p>
      <p class="tier-desc">Monthly new sections, campaigns, and performance audits.</p>
      <ul>
        <li>Quarterly design direction refresh</li>
        <li>Priority content &amp; release updates</li>
        <li>Direct repository ownership</li>
      </ul>
      <a href="/contact?plan=partner" class="tier-btn">Inquire</a>
    </article>
  </div>
</div>`,
    `.cauldron-tiered-pricing-cards {
  background: var(--cauldron-c-surface);
  color: var(--cauldron-c-ink);
  padding: var(--cauldron-space-7) var(--cauldron-space-5);
}
.cauldron-tiered-pricing-cards .pricing-wrap {
  max-width: 1120px;
  margin: 0 auto;
}
.cauldron-tiered-pricing-cards .pricing-head h2 {
  font-family: var(--cauldron-font-display);
  font-size: var(--cauldron-size-5);
  margin: 0 0 var(--cauldron-space-2);
}
.cauldron-tiered-pricing-cards .pricing-head p {
  margin: 0 0 var(--cauldron-space-5);
  color: var(--cauldron-c-muted);
}
.cauldron-tiered-pricing-cards .tier-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: var(--cauldron-space-4);
  align-items: stretch;
}
.cauldron-tiered-pricing-cards .tier-card {
  border: 1px solid var(--cauldron-c-line);
  border-radius: var(--cauldron-radius-2);
  padding: var(--cauldron-space-5);
  display: flex;
  flex-direction: column;
  gap: var(--cauldron-space-3);
}
.cauldron-tiered-pricing-cards .tier-card.featured {
  border-color: var(--cauldron-c-primary);
  box-shadow: 0 0 0 1px var(--cauldron-c-primary);
}
.cauldron-tiered-pricing-cards .tier-badge {
  align-self: flex-start;
  font-size: var(--cauldron-size-1);
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--cauldron-c-primary);
}
.cauldron-tiered-pricing-cards h3 {
  font-family: var(--cauldron-font-display);
  font-size: var(--cauldron-size-4);
  margin: 0;
}
.cauldron-tiered-pricing-cards .tier-price {
  font-family: var(--cauldron-font-display);
  font-size: var(--cauldron-size-6);
  font-weight: 700;
  margin: 0;
}
.cauldron-tiered-pricing-cards .tier-price span {
  font-size: var(--cauldron-size-2);
  color: var(--cauldron-c-muted);
  font-weight: 400;
}
.cauldron-tiered-pricing-cards .tier-desc {
  margin: 0;
  color: var(--cauldron-c-muted);
  font-size: var(--cauldron-size-2);
}
.cauldron-tiered-pricing-cards ul {
  margin: 0;
  padding-left: var(--cauldron-space-4);
  display: grid;
  gap: var(--cauldron-space-2);
  color: var(--cauldron-c-ink);
  font-size: var(--cauldron-size-2);
  flex: 1;
}
.cauldron-tiered-pricing-cards .tier-btn {
  display: inline-block;
  text-align: center;
  padding: 10px 18px;
  border-radius: var(--cauldron-radius-pill);
  border: 1px solid var(--cauldron-c-line);
  text-decoration: none;
  color: var(--cauldron-c-ink);
  font-weight: 600;
  font-size: var(--cauldron-size-2);
}
.cauldron-tiered-pricing-cards .tier-btn.primary {
  background: var(--cauldron-c-primary);
  border-color: var(--cauldron-c-primary);
  color: var(--cauldron-c-surface);
}
@media (max-width: 768px) {
  .cauldron-tiered-pricing-cards .tier-grid {
    grid-template-columns: 1fr;
  }
}`,
  ),
  cataloguePiece(
    'comparison-pricing-strip',
    'Simple Dual Plan Strip',
    'Pricing',
    'Two-column plan comparison for service businesses offering fixed vs bespoke work.',
    `<div class="dual-pricing">
  <article class="plan-box">
    <h3>Single-Day Audit</h3>
    <p class="plan-rate">$650 flat</p>
    <p>Full typography, contrast, and mobile layout tune-up delivered in 48 hours.</p>
    <a href="/contact?plan=audit">Book audit</a>
  </article>
  <article class="plan-box">
    <h3>Full Site Build</h3>
    <p class="plan-rate">From $2,800</p>
    <p>Complete design system, custom sections, and clean Astro codebase handoff.</p>
    <a href="/contact?plan=build">Request scope</a>
  </article>
</div>`,
    `.cauldron-comparison-pricing-strip {
  background: var(--cauldron-c-surface);
  color: var(--cauldron-c-ink);
  padding: var(--cauldron-space-6) var(--cauldron-space-5);
}
.cauldron-comparison-pricing-strip .dual-pricing {
  max-width: 980px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--cauldron-space-4);
}
.cauldron-comparison-pricing-strip .plan-box {
  border: 1px solid var(--cauldron-c-line);
  border-radius: var(--cauldron-radius-2);
  padding: var(--cauldron-space-5);
  display: flex;
  flex-direction: column;
  gap: var(--cauldron-space-2);
}
.cauldron-comparison-pricing-strip h3 {
  font-family: var(--cauldron-font-display);
  font-size: var(--cauldron-size-4);
  margin: 0;
}
.cauldron-comparison-pricing-strip .plan-rate {
  font-size: var(--cauldron-size-5);
  font-weight: 700;
  color: var(--cauldron-c-primary);
  margin: 0;
}
.cauldron-comparison-pricing-strip p {
  margin: 0;
  color: var(--cauldron-c-muted);
  line-height: 1.5;
  flex: 1;
}
.cauldron-comparison-pricing-strip a {
  align-self: flex-start;
  margin-top: var(--cauldron-space-2);
  font-weight: 600;
  color: var(--cauldron-c-ink);
  text-decoration: underline;
  text-underline-offset: 4px;
}
@media (max-width: 768px) {
  .cauldron-comparison-pricing-strip .dual-pricing {
    grid-template-columns: 1fr;
  }
}`,
  ),
  cataloguePiece(
    'map-directions-card',
    'Map & Directions Card',
    'Contact & FAQ',
    'Two-column studio address, transit notes, and visual directions card without third-party trackers.',
    `<div class="directions-grid">
  <div class="directions-info">
    <h2>Visit the Studio</h2>
    <p class="address">42 Johnston Street, Fitzroy VIC 3065</p>
    <p class="transit">Two blocks east of Nicholson St tram stop 14. Step-free ground floor entry.</p>
    <a href="https://maps.apple.com/?q=42+Johnston+Street+Fitzroy" class="directions-btn">Open in Maps</a>
  </div>
  <div class="map-card" role="img" aria-label="Studio neighbourhood map marker at 42 Johnston Street">
    <span class="map-pin">42 Johnston St</span>
    <span class="map-grid-note">Tue – Sat · 09:00 – 17:00</span>
  </div>
</div>`,
    `.cauldron-map-directions-card {
  background: var(--cauldron-c-surface);
  color: var(--cauldron-c-ink);
  padding: var(--cauldron-space-7) var(--cauldron-space-5);
}
.cauldron-map-directions-card .directions-grid {
  max-width: 1040px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--cauldron-space-5);
  align-items: center;
}
.cauldron-map-directions-card h2 {
  font-family: var(--cauldron-font-display);
  font-size: var(--cauldron-size-5);
  margin: 0 0 var(--cauldron-space-2);
}
.cauldron-map-directions-card .address {
  font-weight: 600;
  margin: 0 0 var(--cauldron-space-2);
}
.cauldron-map-directions-card .transit {
  color: var(--cauldron-c-muted);
  margin: 0 0 var(--cauldron-space-4);
  line-height: 1.55;
}
.cauldron-map-directions-card .directions-btn {
  display: inline-block;
  padding: 10px 18px;
  border-radius: var(--cauldron-radius-pill);
  border: 1px solid var(--cauldron-c-line);
  color: var(--cauldron-c-ink);
  text-decoration: none;
  font-weight: 600;
  font-size: var(--cauldron-size-2);
}
.cauldron-map-directions-card .map-card {
  min-height: 220px;
  border: 1px solid var(--cauldron-c-line);
  border-radius: var(--cauldron-radius-2);
  padding: var(--cauldron-space-5);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--cauldron-space-2);
  background: var(--cauldron-c-surface);
}
.cauldron-map-directions-card .map-pin {
  padding: 6px 14px;
  border-radius: var(--cauldron-radius-pill);
  background: var(--cauldron-c-primary);
  color: var(--cauldron-c-surface);
  font-weight: 700;
  font-size: var(--cauldron-size-2);
}
.cauldron-map-directions-card .map-grid-note {
  color: var(--cauldron-c-muted);
  font-size: var(--cauldron-size-2);
}
@media (max-width: 768px) {
  .cauldron-map-directions-card .directions-grid {
    grid-template-columns: 1fr;
  }
}`,
  ),
  cataloguePiece(
    'newsletter-footer',
    'Newsletter Signup Footer',
    'Footers',
    'Compact editorial footer pairing a labeled email signup form with site navigation links.',
    `<footer class="nl-footer">
  <div class="nl-grid">
    <div class="nl-copy">
      <h3>Seasonal Dispatch</h3>
      <p>Quarterly studio notes, new editions, and open workshop dates.</p>
      <form class="nl-form" action="/subscribe" method="post">
        <label for="nl-email" class="sr-only">Email address</label>
        <input id="nl-email" name="email" type="email" required placeholder="you@example.com" />
        <button type="submit">Subscribe</button>
      </form>
    </div>
    <nav class="nl-links" aria-label="Footer navigation">
      <a href="/work">Work</a>
      <a href="/services">Services</a>
      <a href="/pricing">Pricing</a>
      <a href="/contact">Contact</a>
    </nav>
  </div>
</footer>`,
    `.cauldron-newsletter-footer {
  background: var(--cauldron-c-ink);
  color: var(--cauldron-c-surface);
  padding: var(--cauldron-space-7) var(--cauldron-space-5);
}
.cauldron-newsletter-footer .nl-grid {
  max-width: 1100px;
  margin: 0 auto;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: var(--cauldron-space-6);
}
.cauldron-newsletter-footer h3 {
  font-family: var(--cauldron-font-display);
  font-size: var(--cauldron-size-4);
  margin: 0 0 var(--cauldron-space-2);
}
.cauldron-newsletter-footer p {
  margin: 0 0 var(--cauldron-space-4);
  color: var(--cauldron-c-line);
  font-size: var(--cauldron-size-2);
}
.cauldron-newsletter-footer .nl-form {
  display: flex;
  gap: var(--cauldron-space-2);
  flex-wrap: wrap;
}
.cauldron-newsletter-footer .sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
}
.cauldron-newsletter-footer input {
  padding: 10px 14px;
  border-radius: var(--cauldron-radius-pill);
  border: 1px solid var(--cauldron-c-line);
  background: var(--cauldron-c-surface);
  color: var(--cauldron-c-ink);
  min-width: 220px;
}
.cauldron-newsletter-footer button {
  padding: 10px 18px;
  border-radius: var(--cauldron-radius-pill);
  border: 0;
  background: var(--cauldron-c-primary);
  color: var(--cauldron-c-surface);
  font-weight: 600;
  cursor: pointer;
}
.cauldron-newsletter-footer .nl-links {
  display: flex;
  gap: var(--cauldron-space-4);
  flex-wrap: wrap;
}
.cauldron-newsletter-footer .nl-links a {
  color: var(--cauldron-c-surface);
  text-decoration: none;
  font-size: var(--cauldron-size-2);
}
@media (max-width: 768px) {
  .cauldron-newsletter-footer .nl-grid {
    flex-direction: column;
  }
}`,
  ),
];
