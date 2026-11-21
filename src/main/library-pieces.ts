import type { LibraryPiece } from './library';
import { lookbookImages } from './library-lookbook-images';

function cataloguePiece(
  id: string,
  name: string,
  category: string,
  description: string,
  markup: string,
  styles: string,
  // Only for pieces whose promise is interaction (ADR 0008: script only where a
  // component genuinely needs it). Plain DOM code, no imports; the markup must
  // still work without it, so anything that needs the script starts hidden.
  script?: string,
): LibraryPiece {
  const doubled = `.cauldron-${id}.cauldron-${id}`;
  const common = `
.cauldron-${id} { font-family: var(--cauldron-font-body); font-size: var(--cauldron-size-3);
  /* Text that reads on the site's own primary: black on a light primary, white on a dark one. */
  /* Exact from the direction's own contrast maths; the formula is only a fallback
     for a site whose tokens predate --cauldron-c-on-primary. */
  --on-primary: var(--cauldron-c-on-primary, oklch(from var(--cauldron-c-primary) clamp(0, (0.56 - l) * 1000, 1) 0 0));
  --off-primary: oklch(from var(--cauldron-c-primary) clamp(0, (l - 0.58) * 1000, 1) 0 0); }
.cauldron-${id}, .cauldron-${id} * { box-sizing: border-box; }
.cauldron-${id} p, .cauldron-${id} label, .cauldron-${id} input, .cauldron-${id} button, .cauldron-${id} a { font-family: var(--cauldron-font-body); }
.cauldron-${id} a:focus-visible, .cauldron-${id} button:focus-visible, .cauldron-${id} input:focus-visible { outline: 2px solid var(--cauldron-c-primary); outline-offset: 2px; }
`;
  const strongStyles = (common + styles).split(`.cauldron-${id}`).join(doubled);

  const astro = `---
// ${name} — Cauldron catalogue piece.
// ${script ? 'Plain Astro with a small script for its interaction; it still works without JavaScript.' : 'Plain Astro, pure HTML/CSS.'} Edit freely in your site.
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
${script ? `\n<script>\n${script.trim()}\n</script>\n` : ''}`;

  return {
    id,
    name,
    category,
    description,
    licence:
      id === 'masonry-gallery' || id === 'editorial-hero'
        ? 'Astro code MIT; imagery CC0, Cleveland Museum of Art Open Access.'
        : 'MIT (Plain Astro). Cauldron starter set, MIT.',
    source: 'Cauldron Section Catalogue',
    needsScript: Boolean(script),
    codeAllowed: true,
    astro,
    code: astro,
    plainAstro: true,
    styles: common + styles,
    markup,
  };
}

/**
 * A catalogue of genuinely distinct components, inspired by the structure of
 * the researched libraries (react-bits' categories, originkit's component
 * index, design-bites' real-site design worlds). Each piece is its own visual
 * idea — a text effect, a background, a card, a gallery, a navigation, a button
 * — not a recoloured clone of one template. All are original plain HTML/CSS
 * written for Cauldron (ADR 0001/0002: read for understanding, write our own
 * code). Token fallbacks keep every piece readable in any design direction.
 */
export const EXTENDED_LIBRARY: LibraryPiece[] = [
  // ── Text effects ──────────────────────────────────────────────────────────
  cataloguePiece(
    'gradient-headline',
    'Gradient Headline',
    'Text effects',
    'A display headline filled with a slowly drifting multi-colour gradient and a soft glow.',
    `<div class="gh-wrap">
  <span class="gh-kicker">Introducing</span>
  <h1 class="gh-title">Colour that moves<br />with the light.</h1>
  <p class="gh-sub">A living gradient fill, clipped to the letterforms.</p>
</div>`,
    `.cauldron-gradient-headline { background: var(--cauldron-c-bg); padding: var(--cauldron-space-9) var(--cauldron-space-6); text-align: center; }
.cauldron-gradient-headline .gh-wrap { max-width: 820px; margin: 0 auto; }
.cauldron-gradient-headline .gh-kicker { display: inline-block; font-size: var(--cauldron-size-1); letter-spacing: 0.22em; text-transform: uppercase; color: var(--cauldron-c-muted); margin-bottom: var(--cauldron-space-4); }
.cauldron-gradient-headline .gh-title { font-family: var(--cauldron-font-display); font-size: clamp(2.4rem, 6vw, var(--cauldron-size-9)); line-height: 1.04; margin: 0 0 calc(var(--cauldron-space-4) - 0.18em); padding-bottom: 0.18em; /* descenders sit inside the clipped paint box */ font-weight: 700; /* Every stop clears 3:1 for large text on the field: the accent is pulled towards ink, and primary-text is used where a direction has one. */ background-image: linear-gradient(110deg, var(--cauldron-c-primary-text, var(--cauldron-c-primary)), color-mix(in srgb, var(--cauldron-c-accent, var(--cauldron-c-primary)) 40%, var(--cauldron-c-ink)), var(--cauldron-c-primary-deep, var(--cauldron-c-primary-text, var(--cauldron-c-primary))), var(--cauldron-c-primary-text, var(--cauldron-c-primary))); background-size: 280% 100%; -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; color: transparent; animation: gh-drift 9s ease-in-out infinite; filter: drop-shadow(0 0 22px color-mix(in srgb, var(--cauldron-c-primary) 30%, transparent)); }
.cauldron-gradient-headline .gh-sub { color: var(--cauldron-c-muted); font-size: var(--cauldron-size-3); margin: 0; }
@keyframes gh-drift { 0%, 100% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } }
@media (prefers-reduced-motion: reduce) { .cauldron-gradient-headline .gh-title { animation: none; } }`,
  ),

  cataloguePiece(
    'shiny-sweep',
    'Shiny Sweep',
    'Text effects',
    'A bright sheen sweeps across a headline on an endless loop.',
    `<div class="ss-wrap">
  <h1 class="ss-title">Made to catch the eye.</h1>
  <p class="ss-sub">A moving highlight, clipped to the text.</p>
</div>`,
    `.cauldron-shiny-sweep { background: var(--cauldron-c-ink); padding: var(--cauldron-space-9) var(--cauldron-space-6); text-align: center; }
.cauldron-shiny-sweep .ss-wrap { max-width: 780px; margin: 0 auto; }
.cauldron-shiny-sweep .ss-title { font-family: var(--cauldron-font-display); font-size: clamp(2.2rem, 5.5vw, var(--cauldron-size-8)); line-height: 1.06; margin: 0 0 calc(var(--cauldron-space-4) - 0.18em); padding-bottom: 0.18em; /* descenders sit inside the clipped paint box */ font-weight: 700; color: transparent; -webkit-text-fill-color: transparent; background-image: linear-gradient(100deg, transparent 38%, color-mix(in srgb, var(--cauldron-c-surface) 75%, var(--cauldron-c-ink)) 46%, color-mix(in srgb, var(--cauldron-c-surface) 55%, var(--cauldron-c-ink)) 50%, color-mix(in srgb, var(--cauldron-c-surface) 75%, var(--cauldron-c-ink)) 54%, transparent 62%), linear-gradient(var(--cauldron-c-surface), var(--cauldron-c-surface)); background-size: 240% 100%, 100% 100%; background-repeat: no-repeat; background-position: 120% 0, 0 0; -webkit-background-clip: text; background-clip: text; animation: ss-sweep 3.6s linear infinite; }
.cauldron-shiny-sweep .ss-sub { color: color-mix(in srgb, var(--cauldron-c-surface) 70%, var(--cauldron-c-ink)); font-size: var(--cauldron-size-3); margin: 0; }
@keyframes ss-sweep { 0% { background-position: 120% 0, 0 0; } 100% { background-position: -20% 0, 0 0; } }
@media (prefers-reduced-motion: reduce) { .cauldron-shiny-sweep .ss-title { animation: none; background-position: 120% 0, 0 0; } }`,
  ),

  cataloguePiece(
    'command-palette',
    'Command Palette',
    'Navigation',
    'A keyboard command menu: type to filter, arrow keys to move, Enter to go, "/" to open it from anywhere.',
    `<div class="cp-panel" data-cp>
  <div class="cp-search">
    <span class="cp-glass" aria-hidden="true">⌕</span>
    <input type="search" placeholder="Search pages and actions" aria-label="Search pages and actions" autocomplete="off" spellcheck="false" />
    <kbd class="cp-hint" hidden>/</kbd>
  </div>
  <div class="cp-list" role="listbox" aria-label="Pages and actions">
    <p class="cp-group" role="presentation">Go to</p>
    <a class="cp-item cp-active" role="option" aria-selected="true" href="/" data-keywords="home start front"><span class="cp-ico" aria-hidden="true">⌂</span>Home</a>
    <a class="cp-item" role="option" aria-selected="false" href="/work" data-keywords="portfolio projects case studies"><span class="cp-ico" aria-hidden="true">▦</span>Our work</a>
    <a class="cp-item" role="option" aria-selected="false" href="/services" data-keywords="what we do offer"><span class="cp-ico" aria-hidden="true">✦</span>Services</a>
    <a class="cp-item" role="option" aria-selected="false" href="/pricing" data-keywords="cost price quote rates"><span class="cp-ico" aria-hidden="true">$</span>Pricing</a>
    <p class="cp-group" role="presentation">Get in touch</p>
    <a class="cp-item" role="option" aria-selected="false" href="/contact" data-keywords="email phone message enquiry"><span class="cp-ico" aria-hidden="true">✉</span>Contact us</a>
    <a class="cp-item" role="option" aria-selected="false" href="/contact#book" data-keywords="booking appointment call consult"><span class="cp-ico" aria-hidden="true">◷</span>Book a call</a>
    <p class="cp-empty" hidden>No matches. Try “pricing” or “contact”.</p>
  </div>
  <p class="cp-keys" hidden aria-hidden="true"><kbd>↑</kbd><kbd>↓</kbd> move <kbd>↵</kbd> open <kbd>esc</kbd> clear</p>
</div>`,
    `.cauldron-command-palette { background: linear-gradient(160deg, var(--cauldron-c-bg), color-mix(in srgb, var(--cauldron-c-bg) 70%, var(--cauldron-c-primary))); padding: var(--cauldron-space-6) var(--cauldron-space-6); display: grid; place-items: center; }
.cauldron-command-palette .cp-panel { width: min(520px, 100%); border-radius: 16px; background: var(--cauldron-c-surface); border: 1px solid var(--cauldron-c-line); box-shadow: 0 30px 80px color-mix(in srgb, var(--cauldron-c-ink) 28%, transparent); padding: 8px; }
.cauldron-command-palette .cp-search { display: flex; align-items: center; gap: 10px; padding: 12px 14px; border-bottom: 1px solid var(--cauldron-c-line); margin-bottom: 6px; color: var(--cauldron-c-muted); }
.cauldron-command-palette .cp-search input { flex: 1; min-width: 0; border: 0; background: transparent; font: inherit; font-size: var(--cauldron-size-4); color: var(--cauldron-c-ink); }
.cauldron-command-palette .cp-search input::placeholder { color: var(--cauldron-c-muted); opacity: 1; }
.cauldron-command-palette .cp-search input:focus-visible { outline: none; }
.cauldron-command-palette .cp-search:focus-within { box-shadow: inset 0 -2px 0 var(--cauldron-c-primary); }
.cauldron-command-palette kbd { font-family: var(--cauldron-font-body); font-size: var(--cauldron-size-1); color: var(--cauldron-c-muted); border: 1px solid var(--cauldron-c-line); border-radius: 6px; padding: 2px 7px; }
.cauldron-command-palette .cp-group { font-size: var(--cauldron-size-1); letter-spacing: 0.12em; text-transform: uppercase; color: var(--cauldron-c-ink); margin: 10px 12px 4px; }
.cauldron-command-palette .cp-item { display: flex; align-items: center; gap: 12px; padding: 11px 12px; border-radius: 10px; color: var(--cauldron-c-ink); text-decoration: none; font-size: var(--cauldron-size-3); }
.cauldron-command-palette .cp-item:hover { background: color-mix(in srgb, var(--cauldron-c-primary) 10%, transparent); }
.cauldron-command-palette .cp-item.cp-active { background: var(--cauldron-c-primary); color: var(--on-primary); }
.cauldron-command-palette .cp-ico { width: 26px; height: 26px; border-radius: 7px; display: grid; place-items: center; flex: none; background: color-mix(in srgb, var(--cauldron-c-primary) 14%, transparent); }
/* A ring, not a tinted fill: tinting the icon square lifts the primary under a white
   glyph and drops it below 4.5:1. */
.cauldron-command-palette .cp-item.cp-active .cp-ico { background: transparent; box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--on-primary) 45%, transparent); }
.cauldron-command-palette .cp-empty { margin: 14px 12px; color: var(--cauldron-c-muted); font-size: var(--cauldron-size-2); }
.cauldron-command-palette .cp-keys { display: flex; gap: 6px; align-items: center; margin: 8px 12px 4px; font-size: var(--cauldron-size-1); color: var(--cauldron-c-muted); }
.cauldron-command-palette .cp-keys kbd { margin-left: 6px; }
.cauldron-command-palette .cp-keys kbd:first-child { margin-left: 0; }
.cauldron-command-palette [hidden] { display: none !important; }`,
    `
// Filters the list as you type, moves with the arrow keys, opens with Enter,
// clears with Escape, and "/" jumps to the search from anywhere on the page.
for (const panel of document.querySelectorAll('[data-cp]')) {
  const input = panel.querySelector('input');
  const list = panel.querySelector('[role="listbox"]');
  const items = [...panel.querySelectorAll('.cp-item')];
  const groups = [...panel.querySelectorAll('.cp-group')];
  const empty = panel.querySelector('.cp-empty');
  const uid = Math.random().toString(36).slice(2, 8);
  list.id = 'cp-list-' + uid;
  items.forEach((item, i) => (item.id = 'cp-' + uid + '-' + i));
  input.setAttribute('role', 'combobox');
  input.setAttribute('aria-controls', list.id);
  input.setAttribute('aria-autocomplete', 'list');
  input.setAttribute('aria-expanded', 'true');
  panel.querySelector('.cp-hint').hidden = false;
  panel.querySelector('.cp-keys').hidden = false;
  let active = 0;
  const visible = () => items.filter((item) => !item.hidden);
  // Scrolling the active item into view is a response to a person moving the
  // selection. Doing it during setup yanked the page down to a palette inserted
  // below the fold, before anyone had touched it.
  const mark = (followActive = false) => {
    const shown = visible();
    active = Math.max(0, Math.min(active, shown.length - 1));
    items.forEach((item) => {
      const on = item === shown[active];
      item.classList.toggle('cp-active', on);
      item.setAttribute('aria-selected', String(on));
    });
    if (shown[active]) {
      input.setAttribute('aria-activedescendant', shown[active].id);
      if (followActive) shown[active].scrollIntoView({ block: 'nearest' });
    } else input.removeAttribute('aria-activedescendant');
  };
  const filter = () => {
    const words = input.value.toLowerCase().trim().split(/\\s+/).filter(Boolean);
    for (const item of items) {
      const text = (item.textContent + ' ' + (item.dataset.keywords || '')).toLowerCase();
      item.hidden = !words.every((word) => text.includes(word));
    }
    for (const group of groups) {
      let next = group.nextElementSibling;
      let any = false;
      while (next && !next.classList.contains('cp-group')) {
        if (next.classList.contains('cp-item') && !next.hidden) any = true;
        next = next.nextElementSibling;
      }
      group.hidden = !any;
    }
    empty.hidden = visible().length > 0;
    active = 0;
    mark(true);
  };
  input.addEventListener('input', filter);
  input.addEventListener('keydown', (event) => {
    const shown = visible();
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      if (!shown.length) return;
      active = (active + (event.key === 'ArrowDown' ? 1 : -1) + shown.length) % shown.length;
      mark(true);
    } else if (event.key === 'Enter') {
      if (shown[active]) {
        event.preventDefault();
        shown[active].click();
      }
    } else if (event.key === 'Escape') {
      input.value = '';
      filter();
    }
  });
  items.forEach((item) =>
    item.addEventListener('mousemove', () => {
      const index = visible().indexOf(item);
      if (index !== active) {
        active = index;
        mark();
      }
    }),
  );
  document.addEventListener('keydown', (event) => {
    const typing = event.target.closest?.('input, textarea, select, [contenteditable="true"]');
    if (event.key === '/' && !typing && !event.metaKey && !event.ctrlKey && !event.altKey) {
      event.preventDefault();
      input.focus();
    }
  });
  mark(); // selection and ARIA only: a palette inserted below the fold must not
  // scroll the page before anyone has used it.
}
`,
  ),

  cataloguePiece(
    'stepper',
    'Process Stepper',
    'Sections',
    'A numbered process with a live progress track and a highlighted current step.',
    `<div class="sp-wrap">
  <h2 class="sp-head">How a project runs</h2>
  <ol class="sp-track">
    <li class="sp-step sp-done"><span class="sp-dot">✓</span><b>Discovery</b><small>Goals, audience, scope</small></li>
    <li class="sp-step sp-done"><span class="sp-dot">✓</span><b>Direction</b><small>Type, colour, layout</small></li>
    <li class="sp-step sp-now"><span class="sp-dot">3</span><b>Build</b><small>Real pages in Astro</small></li>
    <li class="sp-step"><span class="sp-dot">4</span><b>Launch</b><small>Checks, then live</small></li>
  </ol>
</div>`,
    `.cauldron-stepper { background: var(--cauldron-c-bg); padding: var(--cauldron-space-8) var(--cauldron-space-6); }
.cauldron-stepper .sp-wrap { max-width: 920px; margin: 0 auto; }
.cauldron-stepper .sp-head { font-family: var(--cauldron-font-display); font-size: clamp(1.8rem, 4vw, var(--cauldron-size-7)); color: var(--cauldron-c-ink); margin: 0 0 var(--cauldron-space-7); font-weight: 700; text-align: center; }
.cauldron-stepper .sp-track { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: repeat(4, 1fr); gap: var(--cauldron-space-4); position: relative; }
.cauldron-stepper .sp-track::before { content: ''; position: absolute; top: 22px; left: 12%; right: 12%; height: 3px; background: linear-gradient(90deg, var(--cauldron-c-primary) 0 58%, var(--cauldron-c-line) 58% 100%); border-radius: 3px; }
.cauldron-stepper .sp-step { position: relative; display: flex; flex-direction: column; align-items: center; text-align: center; gap: 6px; }
.cauldron-stepper .sp-dot { width: 46px; height: 46px; border-radius: 50%; display: grid; place-items: center; background: var(--cauldron-c-surface); border: 3px solid var(--cauldron-c-line); color: var(--cauldron-c-muted); font-weight: 700; z-index: 1; }
.cauldron-stepper .sp-done .sp-dot { background: var(--cauldron-c-primary); border-color: var(--cauldron-c-primary); color: var(--on-primary); }
.cauldron-stepper .sp-now .sp-dot { background: var(--cauldron-c-surface); border-color: var(--cauldron-c-primary); color: var(--cauldron-c-primary-deep, var(--cauldron-c-ink)); box-shadow: 0 0 0 6px color-mix(in srgb, var(--cauldron-c-primary) 18%, transparent); }
.cauldron-stepper .sp-step b { font-family: var(--cauldron-font-display); color: var(--cauldron-c-ink); font-size: var(--cauldron-size-4); margin-top: var(--cauldron-space-2); }
.cauldron-stepper .sp-step small { color: var(--cauldron-c-muted); font-size: var(--cauldron-size-2); }
@media (max-width: 768px) { .cauldron-stepper .sp-track { grid-template-columns: 1fr 1fr; row-gap: var(--cauldron-space-6); } .cauldron-stepper .sp-track::before { display: none; } }`,
  ),

  cataloguePiece(
    'marquee-strip',
    'Marquee Strip',
    'Text effects',
    'Two counter-scrolling rows — client wordmarks and discipline pills.',
    `<div class="mq-wrap" aria-label="Clients and disciplines">
  <div class="mq-row"><div class="mq-track mq-left">
    <span class="mq-mark">Harbour&amp;Co</span><span class="mq-mark mq-serif">Solstice</span><span class="mq-mark">NORTHPIER</span><span class="mq-mark mq-serif">Kestrel</span><span class="mq-mark">Loom/Kiln</span><span class="mq-mark mq-serif">Meridian</span>
    <span class="mq-mark">Harbour&amp;Co</span><span class="mq-mark mq-serif">Solstice</span><span class="mq-mark">NORTHPIER</span><span class="mq-mark mq-serif">Kestrel</span><span class="mq-mark">Loom/Kiln</span><span class="mq-mark mq-serif">Meridian</span>
  </div></div>
  <div class="mq-row"><div class="mq-track mq-right">
    <span class="mq-pill">✦ Identity</span><span class="mq-pill">Web</span><span class="mq-pill">✦ Editorial</span><span class="mq-pill">Motion</span><span class="mq-pill">✦ Packaging</span><span class="mq-pill">Type</span>
    <span class="mq-pill">✦ Identity</span><span class="mq-pill">Web</span><span class="mq-pill">✦ Editorial</span><span class="mq-pill">Motion</span><span class="mq-pill">✦ Packaging</span><span class="mq-pill">Type</span>
  </div></div>
</div>`,
    `.cauldron-marquee-strip { background: var(--cauldron-c-primary); padding: var(--cauldron-space-8) 0; overflow: hidden; }
.cauldron-marquee-strip .mq-wrap { display: flex; flex-direction: column; gap: var(--cauldron-space-5); }
.cauldron-marquee-strip .mq-row { overflow: hidden; /* Hard-clipped, not faded: a vignette washes out both a word and a pill's own
     background as they leave, which drops the pair to 4:1 at the edges. */ }
.cauldron-marquee-strip .mq-track { display: inline-flex; align-items: center; gap: var(--cauldron-space-6); white-space: nowrap; will-change: transform; }
.cauldron-marquee-strip .mq-left { animation: mq-left 26s linear infinite; }
.cauldron-marquee-strip .mq-right { animation: mq-right 30s linear infinite; }
.cauldron-marquee-strip .mq-mark { font-family: var(--cauldron-font-body); font-size: var(--cauldron-size-6); font-weight: 800; letter-spacing: -0.02em; color: var(--cauldron-c-surface); }
.cauldron-marquee-strip .mq-mark.mq-serif { font-family: var(--cauldron-font-display); font-style: italic; font-weight: 600; }
.cauldron-marquee-strip .mq-pill { font-size: var(--cauldron-size-3); font-weight: 700; color: var(--cauldron-c-ink); background: var(--cauldron-c-surface); padding: 10px 20px; border-radius: 999px; }
@keyframes mq-left { from { transform: translateX(0); } to { transform: translateX(-50%); } }
@keyframes mq-right { from { transform: translateX(-50%); } to { transform: translateX(0); } }
@media (prefers-reduced-motion: reduce) { .cauldron-marquee-strip .mq-left, .cauldron-marquee-strip .mq-right { animation: none; } }`,
  ),

  cataloguePiece(
    'aurora-field',
    'Aurora Field',
    'Backgrounds',
    'A dark field with drifting aurora light and a headline over it.',
    `<div class="af-stage">
  <div class="af-aurora" aria-hidden="true"></div>
  <div class="af-content">
    <h1>Light, moving softly.</h1>
    <p>Layered gradients drift behind the type.</p>
  </div>
</div>`,
    `.cauldron-aurora-field { background: #07080c; padding: 0; }
.cauldron-aurora-field .af-stage { position: relative; overflow: hidden; padding: var(--cauldron-space-10) var(--cauldron-space-6); min-height: 340px; display: grid; place-items: center; }
.cauldron-aurora-field .af-aurora { position: absolute; inset: -40%; background: radial-gradient(40% 55% at 30% 35%, color-mix(in srgb, var(--cauldron-c-primary) 55%, transparent) 0%, transparent 70%), radial-gradient(45% 60% at 72% 60%, color-mix(in srgb, var(--cauldron-c-accent, var(--cauldron-c-primary)) 42%, transparent) 0%, transparent 72%), radial-gradient(35% 45% at 55% 25%, color-mix(in srgb, var(--cauldron-c-primary-deep, var(--cauldron-c-primary)) 45%, transparent) 0%, transparent 70%); filter: blur(46px); animation: af-drift 16s ease-in-out infinite alternate; }
/* Scrim: the aurora drifts bright behind the type, so the copy sits on its own
   dark wash rather than on whatever phase the light happens to be in. */
.cauldron-aurora-field .af-content { position: relative; text-align: center; max-width: 700px; padding: var(--cauldron-space-7) var(--cauldron-space-6); border-radius: 50% / 40%; /* Soft, multi-stop scrim: a single hard stop reads as a grey box over the light. */ background: radial-gradient(58% 58% at 50% 50%, rgba(7, 8, 12, 0.82) 0%, rgba(7, 8, 12, 0.66) 38%, rgba(7, 8, 12, 0.32) 66%, rgba(7, 8, 12, 0) 88%); }
.cauldron-aurora-field .af-content h1 { font-family: var(--cauldron-font-display); font-size: clamp(2.2rem, 5.5vw, var(--cauldron-size-8)); color: #f4f5f8; margin: 0 0 var(--cauldron-space-3); font-weight: 700; }
.cauldron-aurora-field .af-content p { color: #b9bdc9; font-size: var(--cauldron-size-3); margin: 0; }
@keyframes af-drift { from { transform: translate3d(-4%, -2%, 0) rotate(-3deg); } to { transform: translate3d(4%, 3%, 0) rotate(3deg); } }
@media (prefers-reduced-motion: reduce) { .cauldron-aurora-field .af-aurora { animation: none; } }`,
  ),

  cataloguePiece(
    'dot-matrix',
    'Dot Matrix',
    'Backgrounds',
    'A fading dot grid with a warm glow and a centred statement.',
    `<div class="dm-stage">
  <div class="dm-dots" aria-hidden="true"></div>
  <div class="dm-glow" aria-hidden="true"></div>
  <div class="dm-content">
    <h1>Precision, dot by dot.</h1>
    <p>A radial dot field that fades to the edges.</p>
  </div>
</div>`,
    `.cauldron-dot-matrix { background: var(--cauldron-c-bg); padding: 0; }
.cauldron-dot-matrix .dm-stage { position: relative; overflow: hidden; padding: var(--cauldron-space-10) var(--cauldron-space-6); min-height: 320px; display: grid; place-items: center; }
.cauldron-dot-matrix .dm-dots { position: absolute; inset: 0; background-image: radial-gradient(color-mix(in srgb, var(--cauldron-c-ink) 34%, transparent) 1.4px, transparent 1.5px); background-size: 22px 22px; -webkit-mask-image: radial-gradient(70% 70% at 50% 45%, #000 30%, transparent 78%); mask-image: radial-gradient(70% 70% at 50% 45%, #000 30%, transparent 78%); }
.cauldron-dot-matrix .dm-glow { position: absolute; left: 50%; top: 42%; width: 420px; height: 280px; transform: translate(-50%, -50%); background: radial-gradient(closest-side, color-mix(in srgb, var(--cauldron-c-primary) 26%, transparent), transparent); filter: blur(10px); }
.cauldron-dot-matrix .dm-content { position: relative; text-align: center; max-width: 640px; }
.cauldron-dot-matrix .dm-content h1 { font-family: var(--cauldron-font-display); font-size: clamp(2rem, 5vw, var(--cauldron-size-7)); color: var(--cauldron-c-ink); margin: 0 0 var(--cauldron-space-3); font-weight: 700; }
.cauldron-dot-matrix .dm-content p { color: var(--cauldron-c-ink); font-size: var(--cauldron-size-3); margin: 0; }`,
  ),

  cataloguePiece(
    'grain-gradient',
    'Grain Gradient',
    'Backgrounds',
    'A rich gradient wash with a fine film-grain texture.',
    `<div class="gg-stage">
  <div class="gg-grain" aria-hidden="true"></div>
  <div class="gg-content">
    <span class="gg-tag">New collection</span>
    <h1>Warmth you can feel.</h1>
    <p>A gradient wash with a tactile grain.</p>
  </div>
</div>`,
    `.cauldron-grain-gradient { padding: 0; background: var(--cauldron-c-bg); }
.cauldron-grain-gradient .gg-stage { position: relative; overflow: hidden; padding: var(--cauldron-space-10) var(--cauldron-space-6); min-height: 320px; display: grid; place-items: center; background: linear-gradient(160deg, var(--cauldron-c-primary), color-mix(in srgb, var(--cauldron-c-primary) 80%, var(--cauldron-c-primary-deep, var(--cauldron-c-primary)))); }
.cauldron-grain-gradient .gg-grain { position: absolute; inset: 0; opacity: 0.16; mix-blend-mode: overlay; background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E"); }
.cauldron-grain-gradient .gg-content { position: relative; text-align: center; max-width: 640px; }
.cauldron-grain-gradient .gg-tag { display: inline-block; font-size: var(--cauldron-size-1); letter-spacing: 0.2em; text-transform: uppercase; color: var(--on-primary); margin-bottom: var(--cauldron-space-3); font-weight: 700; }
.cauldron-grain-gradient .gg-content h1 { font-family: var(--cauldron-font-display); font-size: clamp(2rem, 5vw, var(--cauldron-size-8)); color: var(--on-primary); margin: 0 0 var(--cauldron-space-3); font-weight: 700; }
.cauldron-grain-gradient .gg-content p { color: var(--on-primary); font-size: var(--cauldron-size-3); margin: 0; }`,
  ),

  // ── Cards ─────────────────────────────────────────────────────────────────
  cataloguePiece(
    'spotlight-card',
    'Spotlight Card',
    'Cards',
    'A card lit by a soft spotlight, with grain and a gradient border.',
    `<div class="sc-card">
  <div class="sc-light" aria-hidden="true"></div>
  <div class="sc-border" aria-hidden="true"></div>
  <span class="sc-tag">Featured</span>
  <h3>Everything in its place.</h3>
  <p>A radial highlight, a fine grain, and a hairline gradient edge.</p>
  <a class="sc-link" href="#">Learn more →</a>
</div>`,
    `.cauldron-spotlight-card { background: var(--cauldron-c-ink); padding: var(--cauldron-space-8) var(--cauldron-space-6); display: grid; place-items: center; }
.cauldron-spotlight-card .sc-card { position: relative; isolation: isolate; overflow: hidden; width: min(420px, 100%); padding: var(--cauldron-space-7); border-radius: 20px; background: var(--cauldron-c-surface); box-shadow: 0 18px 50px color-mix(in srgb, var(--cauldron-c-ink) 16%, transparent); }
.cauldron-spotlight-card .sc-light { position: absolute; inset: 0; z-index: -1; background: radial-gradient(380px 260px at 22% 0%, color-mix(in srgb, var(--cauldron-c-primary) 22%, transparent), transparent 62%); }
.cauldron-spotlight-card .sc-border { position: absolute; inset: 0; border-radius: inherit; padding: 1.5px; background: linear-gradient(140deg, color-mix(in srgb, var(--cauldron-c-primary) 65%, transparent), transparent 45%, color-mix(in srgb, var(--cauldron-c-accent, var(--cauldron-c-primary)) 55%, transparent)); -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0); -webkit-mask-composite: xor; mask: linear-gradient(#000 0 0) content-box exclude, linear-gradient(#000 0 0); pointer-events: none; }
.cauldron-spotlight-card .sc-tag { display: inline-block; font-size: var(--cauldron-size-1); letter-spacing: 0.16em; text-transform: uppercase; font-weight: 700; color: var(--cauldron-c-primary-deep, var(--cauldron-c-ink)); margin-bottom: var(--cauldron-space-3); }
.cauldron-spotlight-card .sc-card h3 { font-family: var(--cauldron-font-display); font-size: var(--cauldron-size-6); color: var(--cauldron-c-ink); margin: 0 0 var(--cauldron-space-3); font-weight: 700; }
.cauldron-spotlight-card .sc-card p { color: var(--cauldron-c-muted); font-size: var(--cauldron-size-3); line-height: 1.55; margin: 0 0 var(--cauldron-space-5); }
.cauldron-spotlight-card .sc-link { color: var(--cauldron-c-primary-text, var(--cauldron-c-primary)); font-weight: 600; text-decoration: none; font-size: var(--cauldron-size-2); }`,
  ),

  cataloguePiece(
    'bento-grid',
    'Bento Grid',
    'Cards',
    'A bento of mixed-size cells — a stat, a quote, a glow, a list.',
    `<div class="bg-grid">
  <div class="bg-cell bg-stat"><span class="bg-num">98%</span><span class="bg-lab">On-time delivery</span></div>
  <div class="bg-cell bg-quote"><p>“The calmest launch we've ever had.”</p><span>— Ada, Northcote</span></div>
  <div class="bg-cell bg-glow"><div class="bg-bars" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></div><span class="bg-up">▲ 3× faster pages</span><h3>One system, every screen.</h3></div>
  <div class="bg-cell bg-list"><span class="bg-lab">Included</span><ul><li>Design tokens</li><li>Responsive layout</li><li>Accessible by default</li></ul></div>
</div>`,
    `.cauldron-bento-grid { background: var(--cauldron-c-bg); padding: var(--cauldron-space-6) var(--cauldron-space-6); }
.cauldron-bento-grid .bg-grid { max-width: 900px; margin: 0 auto; display: grid; grid-template-columns: repeat(3, 1fr); grid-auto-rows: 150px; gap: var(--cauldron-space-4); }
.cauldron-bento-grid .bg-cell { border-radius: 18px; padding: var(--cauldron-space-5); border: 1px solid var(--cauldron-c-line); background: var(--cauldron-c-surface); overflow: hidden; }
.cauldron-bento-grid .bg-stat { display: flex; flex-direction: column; justify-content: center; }
.cauldron-bento-grid .bg-num { font-family: var(--cauldron-font-display); font-size: var(--cauldron-size-8); font-weight: 700; color: var(--cauldron-c-primary-text, var(--cauldron-c-primary)); line-height: 1; }
.cauldron-bento-grid .bg-lab { font-size: var(--cauldron-size-1); letter-spacing: 0.12em; text-transform: uppercase; color: var(--cauldron-c-muted); margin-top: var(--cauldron-space-2); }
.cauldron-bento-grid .bg-quote { grid-column: span 2; display: flex; flex-direction: column; justify-content: center; }
.cauldron-bento-grid .bg-quote p { font-family: var(--cauldron-font-display); font-size: var(--cauldron-size-5); color: var(--cauldron-c-ink); margin: 0 0 var(--cauldron-space-2); font-style: italic; }
.cauldron-bento-grid .bg-quote span { color: var(--cauldron-c-muted); font-size: var(--cauldron-size-2); }
.cauldron-bento-grid .bg-bars { display: flex; align-items: flex-end; gap: 6px; height: 64px; margin-bottom: auto; }
.cauldron-bento-grid .bg-bars i { flex: 1; border-radius: 4px 4px 0 0; background: color-mix(in srgb, var(--on-primary) 32%, transparent); }
.cauldron-bento-grid .bg-bars i:nth-child(1) { height: 30%; } .cauldron-bento-grid .bg-bars i:nth-child(2) { height: 48%; } .cauldron-bento-grid .bg-bars i:nth-child(3) { height: 40%; } .cauldron-bento-grid .bg-bars i:nth-child(4) { height: 70%; } .cauldron-bento-grid .bg-bars i:nth-child(5) { height: 100%; background: var(--on-primary); }
.cauldron-bento-grid .bg-up { display: inline-block; font-size: var(--cauldron-size-1); font-weight: 700; color: var(--on-primary); background: color-mix(in srgb, var(--off-primary) 22%, transparent); padding: 4px 10px; border-radius: 999px; margin: var(--cauldron-space-3) 0 var(--cauldron-space-2); align-self: flex-start; }
.cauldron-bento-grid .bg-glow { grid-row: span 2; display: flex; flex-direction: column; align-items: stretch; background: linear-gradient(160deg, var(--cauldron-c-primary), color-mix(in srgb, var(--cauldron-c-primary) 80%, var(--cauldron-c-primary-deep, var(--cauldron-c-primary)))); border: none; }
.cauldron-bento-grid .bg-glow h3 { font-family: var(--cauldron-font-display); font-size: var(--cauldron-size-6); color: var(--on-primary); margin: 0; font-weight: 700; }
.cauldron-bento-grid .bg-list ul { margin: var(--cauldron-space-2) 0 0; padding-left: 1.1em; color: var(--cauldron-c-ink); font-size: var(--cauldron-size-2); line-height: 1.7; }
@media (max-width: 768px) { .cauldron-bento-grid .bg-grid { grid-template-columns: 1fr; grid-auto-rows: auto; } .cauldron-bento-grid .bg-quote, .cauldron-bento-grid .bg-glow { grid-column: auto; grid-row: auto; } }`,
  ),

  cataloguePiece(
    'holo-card',
    'Holo Card',
    'Cards',
    'An iridescent holographic card with a moving sheen.',
    `<div class="hc-wrap">
  <div class="hc-card">
    <div class="hc-shine" aria-hidden="true"></div>
    <span class="hc-chip">MEMBER</span>
    <h3>The Studio Pass</h3>
    <p>Early access, source files, and the monthly critique.</p>
  </div>
</div>`,
    `.cauldron-holo-card { background: var(--cauldron-c-ink); padding: var(--cauldron-space-8) var(--cauldron-space-6); display: grid; place-items: center; }
.cauldron-holo-card .hc-card { position: relative; overflow: hidden; width: min(420px, 100%); padding: var(--cauldron-space-7); border-radius: 22px; color: #fff; background: conic-gradient(from 210deg at 30% 30%, #ff6ad5, #c774e8, #ad8cff, #8795e8, #94d0ff, #8af5c8, #ffe58a, #ff9a8a, #ff6ad5); box-shadow: 0 0 0 1.5px rgba(255,255,255,0.55) inset, 0 26px 70px rgba(120, 80, 255, 0.45); }
.cauldron-holo-card .hc-card::before { content: ''; position: absolute; inset: 0; background: linear-gradient(180deg, rgba(20,16,40,0.64) 0%, rgba(20,16,40,0.68) 45%, rgba(20,16,40,0.82) 100%); }
.cauldron-holo-card .hc-shine { position: absolute; inset: 0; background: linear-gradient(115deg, transparent 32%, rgba(255,255,255,0.24) 46%, rgba(255,255,255,0.06) 54%, transparent 68%); background-size: 260% 100%; mix-blend-mode: overlay; animation: hc-sheen 5s ease-in-out infinite; }
.cauldron-holo-card .hc-chip { position: relative; display: inline-block; font-size: var(--cauldron-size-1); letter-spacing: 0.24em; padding: 4px 10px; border-radius: 999px; border: 1px solid rgba(255, 255, 255, 0.4); margin-bottom: var(--cauldron-space-5); }
.cauldron-holo-card .hc-card h3 { position: relative; font-family: var(--cauldron-font-display); font-size: var(--cauldron-size-6); margin: 0 0 var(--cauldron-space-3); font-weight: 700; }
.cauldron-holo-card .hc-card p { position: relative; color: #ffffff; font-size: var(--cauldron-size-3); line-height: 1.5; margin: 0; }
@keyframes hc-sheen { 0%, 100% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } }
@media (prefers-reduced-motion: reduce) { .cauldron-holo-card .hc-shine { animation: none; } }`,
  ),

  // ── Galleries ─────────────────────────────────────────────────────────────
  cataloguePiece(
    'masonry-gallery',
    'Masonry Gallery',
    'Galleries',
    'Staggered columns of real prints with captions.',
    `<div class="mg-grid">
  <figure class="mg-item"><img src="${lookbookImages.clear}" alt="A snow-streaked red Mount Fuji beneath a blue sky of banded white clouds" /><figcaption>South Wind, Clear Sky</figcaption></figure>
  <figure class="mg-item"><img src="${lookbookImages.rain}" alt="Mount Fuji rising above dark storm clouds and a jagged streak of lightning" /><figcaption>Rain Below the Mountain</figcaption></figure>
  <figure class="mg-item"><img src="${lookbookImages.sanjo}" alt="Robed courtiers gathered on an open palace veranda at night beneath a full moon" /><figcaption>Poem by Emperor Sanjo</figcaption></figure>
  <figure class="mg-item"><img src="${lookbookImages.muneyuki}" alt="Travellers warming themselves around a smoky fire outside a shelter in the snow" /><figcaption>Poem by Minamoto no Muneyuki</figcaption></figure>
</div>`,
    `.cauldron-masonry-gallery { background: var(--cauldron-c-bg); padding: var(--cauldron-space-6) var(--cauldron-space-6); }
.cauldron-masonry-gallery .mg-grid { max-width: 900px; margin: 0 auto; columns: 3; column-gap: var(--cauldron-space-4); }
.cauldron-masonry-gallery .mg-item { break-inside: avoid; margin: 0 0 var(--cauldron-space-4); border-radius: 14px; overflow: hidden; background: var(--cauldron-c-surface); border: 1px solid var(--cauldron-c-line); }
.cauldron-masonry-gallery .mg-item img { display: block; width: 100%; height: auto; }
.cauldron-masonry-gallery .mg-item figcaption { padding: var(--cauldron-space-2) var(--cauldron-space-3); font-size: var(--cauldron-size-1); color: var(--cauldron-c-muted); }
@media (max-width: 768px) { .cauldron-masonry-gallery .mg-grid { columns: 1; } }`,
  ),

  cataloguePiece(
    'coverflow',
    'Coverflow',
    'Galleries',
    'A 3D carousel with perspective tilt and a floor reflection: arrows, swipe or click a side card to bring it forward.',
    `<div class="cf-wrap" data-cf role="region" aria-roledescription="carousel" aria-label="Featured projects">
  <div class="cf-stage">
    <a class="cf-card" draggable="false" data-pos="-2" href="/work/identity"><span>01</span><h4>Identity</h4><p>Brand system</p></a>
    <a class="cf-card" draggable="false" data-pos="-1" href="/work/packaging"><span>02</span><h4>Packaging</h4><p>Retail range</p></a>
    <a class="cf-card" draggable="false" data-pos="0" href="/work/editorial" aria-current="true"><span>03</span><h4>Editorial</h4><p>Featured project</p></a>
    <a class="cf-card" draggable="false" data-pos="1" href="/work/motion"><span>04</span><h4>Motion</h4><p>Launch film</p></a>
    <a class="cf-card" draggable="false" data-pos="2" href="/work/web"><span>05</span><h4>Web</h4><p>Studio site</p></a>
  </div>
  <div class="cf-controls" hidden>
    <button type="button" class="cf-prev" aria-label="Previous project">←</button>
    <p class="cf-status" aria-live="polite">3 of 5: Editorial</p>
    <button type="button" class="cf-next" aria-label="Next project">→</button>
  </div>
</div>`,
    `.cauldron-coverflow { background: radial-gradient(90% 70% at 50% 30%, color-mix(in srgb, var(--cauldron-c-primary) 26%, var(--cauldron-c-ink)) 0%, var(--cauldron-c-ink) 72%); padding: var(--cauldron-space-8) var(--cauldron-space-4); overflow: hidden; }
.cauldron-coverflow .cf-stage { position: relative; height: 340px; perspective: 1000px; transform-style: preserve-3d; display: flex; align-items: center; justify-content: center; touch-action: pan-y; user-select: none; -webkit-user-select: none; }
.cauldron-coverflow .cf-card { position: absolute; width: 200px; height: 260px; border-radius: 16px; padding: var(--cauldron-space-5); display: flex; flex-direction: column; justify-content: flex-end; text-decoration: none; -webkit-user-drag: none; color: var(--cauldron-c-surface); background: linear-gradient(155deg, color-mix(in srgb, var(--cauldron-c-surface) 6%, var(--cauldron-c-ink)), color-mix(in srgb, var(--cauldron-c-primary) 12%, var(--cauldron-c-ink))); border: 1px solid color-mix(in srgb, var(--cauldron-c-surface) 22%, transparent); box-shadow: 0 30px 60px rgba(0, 0, 0, 0.5); -webkit-box-reflect: below 10px linear-gradient(transparent 60%, rgba(255, 255, 255, 0.22)); transition: transform 0.55s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.4s ease, width 0.55s, height 0.55s; }
.cauldron-coverflow .cf-card::before { content: ''; position: absolute; inset: 0; border-radius: inherit; background: linear-gradient(120deg, rgba(255, 255, 255, 0.28), transparent 42%); pointer-events: none; }
.cauldron-coverflow .cf-card span { position: relative; font-size: var(--cauldron-size-1); letter-spacing: 0.2em; font-weight: 700; color: var(--cauldron-c-surface); }
.cauldron-coverflow .cf-card h4 { position: relative; font-family: var(--cauldron-font-display); font-size: var(--cauldron-size-5); margin: var(--cauldron-space-2) 0 0; font-weight: 700; color: var(--cauldron-c-surface); }
.cauldron-coverflow .cf-card p { position: relative; margin: 6px 0 0; font-size: var(--cauldron-size-2); font-weight: 600; color: color-mix(in srgb, var(--cauldron-c-surface) 86%, var(--cauldron-c-ink)); }
.cauldron-coverflow .cf-card[data-pos="0"] { z-index: 5; transform: translateZ(60px); width: 230px; height: 290px; /* A fill small text can pass on, not the raw primary. */ background: var(--cauldron-c-primary-solid, var(--cauldron-c-primary)); border-color: transparent; box-shadow: 0 40px 90px color-mix(in srgb, var(--cauldron-c-primary) 45%, transparent), 0 30px 60px rgba(0, 0, 0, 0.5); }
/* No opacity dimming on the back cards: it painted their text at 3.7-4.4:1. The
   transform already reads as depth. */
.cauldron-coverflow .cf-card[data-pos="0"] span, .cauldron-coverflow .cf-card[data-pos="0"] h4, .cauldron-coverflow .cf-card[data-pos="0"] p { color: var(--on-primary); }
.cauldron-coverflow .cf-card[data-pos="-1"] { z-index: 4; transform: translateX(-214px) translateZ(-40px) rotateY(48deg); }
.cauldron-coverflow .cf-card[data-pos="1"] { z-index: 4; transform: translateX(214px) translateZ(-40px) rotateY(-48deg); }
.cauldron-coverflow .cf-card[data-pos="-2"] { z-index: 3; transform: translateX(-350px) translateZ(-140px) rotateY(58deg); }
.cauldron-coverflow .cf-card[data-pos="2"] { z-index: 3; transform: translateX(350px) translateZ(-140px) rotateY(-58deg); }
.cauldron-coverflow .cf-card.cf-wrapping { transition: none; opacity: 0; }
.cauldron-coverflow .cf-controls { display: flex; align-items: center; justify-content: center; gap: var(--cauldron-space-4); margin-top: var(--cauldron-space-6); }
.cauldron-coverflow .cf-controls[hidden] { display: none; }
.cauldron-coverflow .cf-controls button { width: 44px; height: 44px; border-radius: 999px; border: 1px solid color-mix(in srgb, var(--cauldron-c-surface) 40%, transparent); background: color-mix(in srgb, var(--cauldron-c-surface) 10%, transparent); color: var(--cauldron-c-surface); font-size: var(--cauldron-size-4); cursor: pointer; }
.cauldron-coverflow .cf-controls button:hover { background: color-mix(in srgb, var(--cauldron-c-surface) 20%, transparent); }
.cauldron-coverflow .cf-status { margin: 0; min-width: 11ch; text-align: center; font-size: var(--cauldron-size-2); color: color-mix(in srgb, var(--cauldron-c-surface) 86%, var(--cauldron-c-ink)); }
.cauldron-coverflow a.cf-card:focus-visible, .cauldron-coverflow .cf-controls button:focus-visible { outline: 2px solid var(--cauldron-c-surface); outline-offset: 3px; }
@media (max-width: 768px) { .cauldron-coverflow .cf-card[data-pos="-2"], .cauldron-coverflow .cf-card[data-pos="2"] { opacity: 0; pointer-events: none; } .cauldron-coverflow .cf-card[data-pos="-1"] { transform: translateX(-110px) translateZ(-40px) rotateY(48deg) scale(0.85); } .cauldron-coverflow .cf-card[data-pos="1"] { transform: translateX(110px) translateZ(-40px) rotateY(-48deg) scale(0.85); } }
@media (prefers-reduced-motion: reduce) { .cauldron-coverflow .cf-card { transition: none; } }`,
    `
// Turns the static stage into a carousel: the arrow buttons, the keyboard
// arrows, a swipe, or a click on a side card brings that project forward.
for (const root of document.querySelectorAll('[data-cf]')) {
  const cards = [...root.querySelectorAll('.cf-card')];
  const status = root.querySelector('.cf-status');
  const controls = root.querySelector('.cf-controls');
  const count = cards.length;
  let current = cards.findIndex((card) => card.dataset.pos === '0');
  if (current < 0) current = 0;
  const half = Math.floor(count / 2);
  const offset = (i) => ((((i - current) % count) + count + half) % count) - half;
  const show = (next) => {
    const before = cards.map((_, i) => offset(i));
    current = (next + count) % count;
    cards.forEach((card, i) => {
      const pos = offset(i);
      // A card that wraps from one end to the other fades instead of flying across.
      card.classList.toggle('cf-wrapping', Math.abs(pos - before[i]) > 1);
      card.dataset.pos = String(pos);
      if (pos === 0) card.setAttribute('aria-current', 'true');
      else card.removeAttribute('aria-current');
      card.tabIndex = pos === 0 ? 0 : -1;
    });
    requestAnimationFrame(() => cards.forEach((card) => card.classList.remove('cf-wrapping')));
    const title = cards[current].querySelector('h4')?.textContent ?? '';
    status.textContent = current + 1 + ' of ' + count + ': ' + title;
  };
  controls.hidden = false;
  root.tabIndex = 0;
  root.querySelector('.cf-prev').addEventListener('click', () => show(current - 1));
  root.querySelector('.cf-next').addEventListener('click', () => show(current + 1));
  root.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowLeft') { event.preventDefault(); show(current - 1); }
    if (event.key === 'ArrowRight') { event.preventDefault(); show(current + 1); }
  });
  cards.forEach((card, i) =>
    card.addEventListener('click', (event) => {
      if (swiped) { event.preventDefault(); swiped = false; return; }
      if (i !== current) { event.preventDefault(); show(i); }
    }),
  );
  let startX = null;
  let swiped = false;
  const stage = root.querySelector('.cf-stage');
  stage.addEventListener('pointerdown', (event) => (startX = event.clientX));
  stage.addEventListener('pointercancel', () => (startX = null));
  stage.addEventListener('pointerup', (event) => {
    if (startX === null) return;
    const dx = event.clientX - startX;
    startX = null;
    if (Math.abs(dx) > 40) {
      swiped = true;
      setTimeout(() => (swiped = false), 0);
      show(current + (dx < 0 ? 1 : -1));
    }
  });
  show(current);
}
`,
  ),

  // ── Navigation ────────────────────────────────────────────────────────────
  cataloguePiece(
    'dock-nav',
    'Dock Navigation',
    'Navigation',
    'A macOS-style dock of icon tiles on a glass shelf.',
    `<div class="dk-desk">
  <div class="dk-window" aria-hidden="true"><span></span><span></span><span></span><div class="dk-win-body"><b>Studio</b><i></i><i></i><i></i></div></div>
<nav class="dk-shelf" aria-label="Primary">
  <a class="dk-item" href="#" aria-label="Home"><span>⌂</span></a>
  <a class="dk-item dk-big" href="#" aria-label="Work"><span>◐</span></a>
  <a class="dk-item" href="#" aria-label="Studio"><span>✦</span></a>
  <a class="dk-item" href="#" aria-label="Journal"><span>✎</span></a>
  <a class="dk-item" href="#" aria-label="Contact"><span>✉</span></a>
</nav>
</div>`,
    `.cauldron-dock-nav { background: linear-gradient(160deg, var(--cauldron-c-primary), color-mix(in srgb, var(--cauldron-c-primary) 80%, var(--cauldron-c-primary-deep, var(--cauldron-c-primary)))); padding: var(--cauldron-space-9) var(--cauldron-space-6); display: grid; place-items: center; }
.cauldron-dock-nav .dk-desk { display: flex; flex-direction: column; align-items: center; gap: var(--cauldron-space-6); width: 100%; }
.cauldron-dock-nav .dk-window { width: min(520px, 100%); height: 200px; border-radius: 14px; background: color-mix(in srgb, var(--off-primary) 30%, transparent); border: 1px solid color-mix(in srgb, var(--on-primary) 30%, transparent); backdrop-filter: blur(10px); box-shadow: 0 30px 70px rgba(0,0,0,0.42); padding: 12px; position: relative; }
.cauldron-dock-nav .dk-window > span { display: inline-block; width: 11px; height: 11px; border-radius: 50%; background: color-mix(in srgb, var(--on-primary) 70%, transparent); margin-right: 6px; }
.cauldron-dock-nav .dk-win-body { margin-top: 18px; display: flex; flex-direction: column; gap: 10px; }
.cauldron-dock-nav .dk-win-body b { color: var(--on-primary); font-family: var(--cauldron-font-display); font-size: var(--cauldron-size-5); }
.cauldron-dock-nav .dk-win-body i { display: block; height: 10px; border-radius: 6px; background: color-mix(in srgb, var(--on-primary) 35%, transparent); }
.cauldron-dock-nav .dk-win-body i:nth-child(3) { width: 78%; } .cauldron-dock-nav .dk-win-body i:nth-child(4) { width: 56%; }
.cauldron-dock-nav .dk-shelf { display: inline-flex; align-items: flex-end; gap: var(--cauldron-space-3); padding: var(--cauldron-space-3) var(--cauldron-space-4); border-radius: 24px; background: color-mix(in srgb, var(--on-primary) 18%, transparent); border: 1px solid color-mix(in srgb, var(--on-primary) 45%, transparent); backdrop-filter: blur(14px); box-shadow: 0 26px 60px rgba(0, 0, 0, 0.42), inset 0 1px 0 rgba(255,255,255,0.5); }
.cauldron-dock-nav .dk-item { width: 52px; height: 52px; border-radius: 14px; display: grid; place-items: center; background: color-mix(in srgb, var(--off-primary) 38%, transparent); color: var(--on-primary); text-decoration: none; font-size: 22px; transition: transform 0.18s ease; }
.cauldron-dock-nav .dk-item.dk-big { width: 66px; height: 66px; font-size: 28px; background: color-mix(in srgb, var(--off-primary) 48%, transparent); }
.cauldron-dock-nav .dk-item:hover { transform: translateY(-6px) scale(1.08); }`,
  ),

  cataloguePiece(
    'pill-nav',
    'Pill Navigation',
    'Navigation',
    'A floating glass pill with an active indicator.',
    `<div class="pn-wrap">
  <nav class="pn-pill" aria-label="Primary">
    <a class="pn-brand" href="#">● Atelier</a>
    <a class="pn-active" href="#">Work</a>
    <a href="#">Studio</a>
    <a href="#">Journal</a>
    <a class="pn-cta" href="#">Contact</a>
  </nav>
  <h1 class="pn-head">Quiet work, made with care.</h1>
</div>`,
    `.cauldron-pill-nav { background: var(--cauldron-c-bg); padding: var(--cauldron-space-7) var(--cauldron-space-6); }
.cauldron-pill-nav .pn-wrap { max-width: 900px; margin: 0 auto; display: flex; flex-direction: column; align-items: center; gap: var(--cauldron-space-9); }
.cauldron-pill-nav .pn-head { font-family: var(--cauldron-font-display); font-size: clamp(2.2rem, 6vw, var(--cauldron-size-9)); color: var(--cauldron-c-ink); margin: 0; font-weight: 700; line-height: 1.04; text-align: center; }
.cauldron-pill-nav .pn-pill { display: inline-flex; gap: 4px; padding: 6px; border-radius: 999px; background: var(--cauldron-c-surface); border: 1px solid var(--cauldron-c-line); box-shadow: 0 14px 40px color-mix(in srgb, var(--cauldron-c-ink) 14%, transparent); }
.cauldron-pill-nav .pn-pill a { padding: 9px 18px; border-radius: 999px; color: var(--cauldron-c-muted); text-decoration: none; font-size: var(--cauldron-size-2); font-weight: 600; }
.cauldron-pill-nav .pn-pill a.pn-active { background: var(--cauldron-c-primary); color: var(--on-primary); }
.cauldron-pill-nav .pn-pill a.pn-brand { color: var(--cauldron-c-ink); font-weight: 700; }
.cauldron-pill-nav .pn-pill a.pn-cta { background: var(--cauldron-c-ink); color: var(--cauldron-c-surface); }
@media (max-width: 640px) { .cauldron-pill-nav .pn-wrap { gap: var(--cauldron-space-7); } .cauldron-pill-nav .pn-pill { max-width: 100%; } .cauldron-pill-nav .pn-pill a { padding: 9px 14px; } .cauldron-pill-nav .pn-pill a:not(.pn-brand):not(.pn-active):not(.pn-cta) { display: none; } }`,
  ),

  // ── Buttons ───────────────────────────────────────────────────────────────
  cataloguePiece(
    'specular-button',
    'Specular Button',
    'Buttons',
    'A button with a gradient edge and a specular shine sweep.',
    `<div class="sb-wrap">
  <h2 class="sb-head">Ready when you are.</h2>
  <p class="sb-lede">Two actions, one with a moving specular sheen.</p>
  <div class="sb-row">
    <a class="sb-btn" href="#"><span>Start a project</span></a>
    <a class="sb-ghost" href="#">See the work →</a>
  </div>
</div>`,
    `.cauldron-specular-button { background: radial-gradient(90% 90% at 50% 20%, color-mix(in srgb, var(--cauldron-c-primary) 30%, var(--cauldron-c-ink)) 0%, var(--cauldron-c-ink) 75%); padding: var(--cauldron-space-9) var(--cauldron-space-6); text-align: center; }
.cauldron-specular-button .sb-wrap { max-width: 680px; margin: 0 auto; }
.cauldron-specular-button .sb-head { font-family: var(--cauldron-font-display); font-size: clamp(2rem, 5vw, var(--cauldron-size-8)); color: var(--cauldron-c-surface); margin: 0 0 var(--cauldron-space-3); font-weight: 700; line-height: 1.05; }
.cauldron-specular-button .sb-lede { color: color-mix(in srgb, var(--cauldron-c-surface) 74%, var(--cauldron-c-ink)); font-size: var(--cauldron-size-4); margin: 0 0 var(--cauldron-space-6); }
.cauldron-specular-button .sb-row { display: flex; gap: var(--cauldron-space-4); justify-content: center; align-items: center; flex-wrap: wrap; }
.cauldron-specular-button .sb-ghost { color: var(--cauldron-c-surface); text-decoration: none; font-weight: 600; font-size: var(--cauldron-size-3); }
.cauldron-specular-button .sb-btn { position: relative; overflow: hidden; display: inline-flex; padding: 16px 36px; border-radius: 999px; background: var(--cauldron-c-primary); color: var(--on-primary); text-decoration: none; font-weight: 700; font-size: var(--cauldron-size-3); border: 1px solid color-mix(in srgb, var(--on-primary) 35%, transparent); box-shadow: 0 0 0 4px color-mix(in srgb, var(--cauldron-c-primary) 30%, transparent), 0 14px 40px color-mix(in srgb, var(--cauldron-c-primary) 45%, transparent); }
.cauldron-specular-button .sb-btn span { position: relative; }
/* The sweep stays off the label: a white soft-light sheen under the text lifts the
   fill until white-on-primary drops to 2.8:1, so the shine rides the rim instead. */
.cauldron-specular-button .sb-btn::after { content: ''; position: absolute; inset: 0; background: linear-gradient(110deg, transparent 35%, rgba(255,255,255,0.95) 50%, transparent 65%); mix-blend-mode: soft-light; background-size: 240% 100%; animation: sb-sweep 3.2s linear infinite; -webkit-mask-image: radial-gradient(130% 130% at 50% 50%, transparent 46%, #000 66%); mask-image: radial-gradient(130% 130% at 50% 50%, transparent 46%, #000 66%); }
@keyframes sb-sweep { 0% { background-position: 130% 0; } 100% { background-position: -130% 0; } }
@media (prefers-reduced-motion: reduce) { .cauldron-specular-button .sb-btn::after { animation: none; } }`,
  ),

  cataloguePiece(
    'glow-cta',
    'Glow Call to Action',
    'Buttons',
    'A pulsing glow around a single decisive button.',
    `<div class="gc-wrap">
  <span class="gc-kicker">Limited spots this season</span>
  <h2 class="gc-head">Let's make something good.</h2>
  <a class="gc-btn" href="#">Book a chat</a>
  <p class="gc-note">Free 20-minute call. No obligation.</p>
</div>`,
    `.cauldron-glow-cta { background: var(--cauldron-c-ink); padding: var(--cauldron-space-10) var(--cauldron-space-6); display: grid; place-items: center; text-align: center; }
.cauldron-glow-cta .gc-wrap { display: flex; flex-direction: column; align-items: center; gap: var(--cauldron-space-4); }
.cauldron-glow-cta .gc-kicker { font-size: var(--cauldron-size-1); letter-spacing: 0.22em; text-transform: uppercase; color: color-mix(in srgb, var(--cauldron-c-surface) 82%, var(--cauldron-c-accent, var(--cauldron-c-primary))); }
.cauldron-glow-cta .gc-head { font-family: var(--cauldron-font-display); font-size: clamp(2rem, 5vw, var(--cauldron-size-8)); color: var(--cauldron-c-surface); margin: 0 0 var(--cauldron-space-3); font-weight: 700; line-height: 1.05; }
.cauldron-glow-cta .gc-note { color: color-mix(in srgb, var(--cauldron-c-surface) 70%, var(--cauldron-c-ink)); font-size: var(--cauldron-size-2); margin: var(--cauldron-space-2) 0 0; }
.cauldron-glow-cta .gc-btn { position: relative; display: inline-flex; padding: 18px 44px; border-radius: 999px; background: var(--cauldron-c-primary); color: var(--on-primary); text-decoration: none; font-weight: 700; font-size: var(--cauldron-size-4); outline: 1px solid color-mix(in srgb, var(--on-primary) 30%, transparent); box-shadow: 0 0 0 0 color-mix(in srgb, var(--cauldron-c-primary) 55%, transparent); animation: gc-pulse 2.6s ease-out infinite; }
@keyframes gc-pulse { 0% { box-shadow: 0 0 0 0 color-mix(in srgb, var(--cauldron-c-primary) 55%, transparent); } 70% { box-shadow: 0 0 0 26px transparent; } 100% { box-shadow: 0 0 0 0 transparent; } }
@media (prefers-reduced-motion: reduce) { .cauldron-glow-cta .gc-btn { animation: none; } }`,
  ),

  // ── Sections ──────────────────────────────────────────────────────────────
  cataloguePiece(
    'stat-band',
    'Stat Band',
    'Sections',
    'Oversized figures in a glowing band with hairline dividers and trend chips.',
    `<div class="st-band">
  <div class="st-item"><span class="st-chip">▲ 2 this year</span><span class="st-num">12</span><span class="st-lab">Years practising</span></div>
  <div class="st-item"><span class="st-chip">▲ 18%</span><span class="st-num">140<em>+</em></span><span class="st-lab">Sites shipped</span></div>
  <div class="st-item"><span class="st-chip">★ Awwwards</span><span class="st-num">9</span><span class="st-lab">Design awards</span></div>
</div>`,
    `.cauldron-stat-band { background: radial-gradient(120% 140% at 50% 0%, color-mix(in srgb, var(--cauldron-c-primary) 30%, var(--cauldron-c-ink)) 0%, var(--cauldron-c-ink) 70%); padding: var(--cauldron-space-9) var(--cauldron-space-6); }
.cauldron-stat-band .st-band { max-width: 960px; margin: 0 auto; display: grid; grid-template-columns: repeat(3, 1fr); text-align: center; border-radius: 22px; border: 1px solid color-mix(in srgb, var(--cauldron-c-surface) 18%, transparent); background: color-mix(in srgb, var(--cauldron-c-surface) 6%, transparent); overflow: hidden; }
.cauldron-stat-band .st-item { padding: var(--cauldron-space-7) var(--cauldron-space-5); display: flex; flex-direction: column; align-items: center; gap: var(--cauldron-space-2); }
.cauldron-stat-band .st-item + .st-item { border-left: 1px solid color-mix(in srgb, var(--cauldron-c-surface) 16%, transparent); }
.cauldron-stat-band .st-chip { font-size: var(--cauldron-size-1); font-weight: 700; color: var(--cauldron-c-ink); background: var(--cauldron-c-surface); padding: 4px 10px; border-radius: 999px; }
.cauldron-stat-band .st-num { font-family: var(--cauldron-font-display); font-size: clamp(3rem, 7vw, 5rem); font-weight: 700; line-height: 1; color: var(--cauldron-c-surface); }
.cauldron-stat-band .st-num em { font-style: normal; color: color-mix(in srgb, var(--cauldron-c-surface) 72%, var(--cauldron-c-primary)); }
.cauldron-stat-band .st-lab { font-size: var(--cauldron-size-1); letter-spacing: 0.16em; text-transform: uppercase; color: color-mix(in srgb, var(--cauldron-c-surface) 76%, var(--cauldron-c-ink)); }
@media (max-width: 768px) { .cauldron-stat-band .st-band { grid-template-columns: 1fr; } .cauldron-stat-band .st-item + .st-item { border-left: none; border-top: 1px solid color-mix(in srgb, var(--cauldron-c-surface) 16%, transparent); } }`,
  ),

  cataloguePiece(
    'editorial-hero',
    'Editorial Hero',
    'Sections',
    'A split hero — kicker, serif headline and actions beside a real photograph.',
    `<div class="eh-split">
  <div class="eh-copy">
    <span class="eh-kicker">Authentic craftsmanship</span>
    <h1>Built with permanent integrity.</h1>
    <p>Structures and interiors designed to mature with dignity over generations.</p>
    <div class="eh-actions"><a class="eh-primary" href="#">View projects</a><a class="eh-secondary" href="#">Our practice</a></div>
  </div>
  <figure class="eh-figure"><img src="${lookbookImages.pavilion}" alt="Stone vimana tower and pillared cloister of the Perumal temple, Madurai" /><figcaption>Perumal Temple, Madurai · Cleveland Museum of Art (CC0)</figcaption></figure>
</div>`,
    `.cauldron-editorial-hero { background: var(--cauldron-c-bg); padding: var(--cauldron-space-6) var(--cauldron-space-6); }
.cauldron-editorial-hero .eh-split { max-width: 1080px; margin: 0 auto; display: grid; grid-template-columns: 1.15fr 1fr; gap: var(--cauldron-space-7); align-items: center; }
.cauldron-editorial-hero .eh-kicker { display: block; font-size: var(--cauldron-size-1); letter-spacing: 0.18em; text-transform: uppercase; color: var(--cauldron-c-primary-text, var(--cauldron-c-primary)); margin-bottom: var(--cauldron-space-3); }
.cauldron-editorial-hero .eh-copy h1 { font-family: var(--cauldron-font-display); font-size: clamp(2.2rem, 5vw, var(--cauldron-size-8)); line-height: 1.05; color: var(--cauldron-c-ink); margin: 0 0 var(--cauldron-space-4); font-weight: 700; }
.cauldron-editorial-hero .eh-copy p { color: var(--cauldron-c-muted); font-size: var(--cauldron-size-4); line-height: 1.55; margin: 0 0 var(--cauldron-space-6); }
.cauldron-editorial-hero .eh-actions { display: flex; gap: var(--cauldron-space-3); flex-wrap: wrap; }
.cauldron-editorial-hero .eh-primary { padding: 13px 26px; border-radius: 10px; background: var(--cauldron-c-primary); color: var(--on-primary); text-decoration: none; font-weight: 600; font-size: var(--cauldron-size-2); }
.cauldron-editorial-hero .eh-secondary { padding: 13px 26px; border-radius: 10px; border: 1px solid var(--cauldron-c-line); color: var(--cauldron-c-ink); text-decoration: none; font-weight: 600; font-size: var(--cauldron-size-2); }
.cauldron-editorial-hero .eh-figure { margin: 0; border-radius: 18px; overflow: hidden; border: 1px solid var(--cauldron-c-line); background: var(--cauldron-c-surface); }
/* Capped so the whole hero fits the specimen frame at 960x520. */
.cauldron-editorial-hero .eh-figure img { display: block; width: 100%; max-height: 300px; object-fit: cover; }
.cauldron-editorial-hero .eh-figure figcaption { padding: var(--cauldron-space-2) var(--cauldron-space-3); font-size: var(--cauldron-size-1); color: var(--cauldron-c-muted); }
@media (max-width: 768px) { .cauldron-editorial-hero .eh-split { grid-template-columns: 1fr; } }`,
  ),

  cataloguePiece(
    'pricing-ticket',
    'Pricing Ticket',
    'Sections',
    'A perforated ticket-stub price card, not a generic box.',
    `<div class="pt-wrap">
  <div class="pt-ticket">
    <div class="pt-main">
      <span class="pt-tier">Studio</span>
      <span class="pt-price">$3,400</span>
      <span class="pt-per">per project</span>
    </div>
    <div class="pt-stub">
      <ul><li>Full design system</li><li>Up to 8 pages</li><li>Handover &amp; support</li></ul>
      <a class="pt-cta" href="#">Choose Studio</a>
    </div>
  </div>
</div>`,
    `.cauldron-pricing-ticket { background: var(--cauldron-c-bg); padding: var(--cauldron-space-8) var(--cauldron-space-6); display: grid; place-items: center; }
.cauldron-pricing-ticket .pt-ticket { position: relative; display: grid; grid-template-columns: 200px 1fr; width: min(560px, 100%); border-radius: 18px; overflow: hidden; background: var(--cauldron-c-surface); border: 1px solid var(--cauldron-c-line); box-shadow: 0 18px 50px color-mix(in srgb, var(--cauldron-c-ink) 14%, transparent); }
.cauldron-pricing-ticket .pt-main { background: var(--cauldron-c-primary-solid, var(--cauldron-c-primary)); color: var(--on-primary); padding: var(--cauldron-space-6); display: flex; flex-direction: column; justify-content: center; gap: 4px; }
.cauldron-pricing-ticket .pt-tier { font-size: var(--cauldron-size-1); letter-spacing: 0.2em; text-transform: uppercase; font-weight: 700; color: var(--on-primary); }
.cauldron-pricing-ticket .pt-price { font-family: var(--cauldron-font-display); font-size: var(--cauldron-size-8); font-weight: 700; line-height: 1; }
.cauldron-pricing-ticket .pt-per { font-size: var(--cauldron-size-1); color: var(--on-primary); }
.cauldron-pricing-ticket .pt-stub { padding: var(--cauldron-space-6); border-left: 2px dashed var(--cauldron-c-line); }
.cauldron-pricing-ticket .pt-stub ul { margin: 0 0 var(--cauldron-space-5); padding-left: 1.1em; color: var(--cauldron-c-ink); font-size: var(--cauldron-size-2); line-height: 1.8; }
.cauldron-pricing-ticket .pt-cta { display: inline-flex; padding: 11px 22px; border-radius: 999px; background: var(--cauldron-c-ink); color: var(--cauldron-c-surface); text-decoration: none; font-weight: 600; font-size: var(--cauldron-size-2); }
@media (max-width: 640px) { .cauldron-pricing-ticket .pt-ticket { grid-template-columns: 1fr; } .cauldron-pricing-ticket .pt-stub { border-left: none; border-top: 2px dashed var(--cauldron-c-line); } }`,
  ),
];
