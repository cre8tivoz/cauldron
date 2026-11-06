import fs from 'node:fs';
import path from 'node:path';
import { isInside } from './files';

/**
 * The starter component library (plan 4.3). Five pieces, built on the direction's
 * tokens, written as plain Astro so a site stays light. The look comes from ThreeUI
 * Community (MIT, Meng To); the code here is Cauldron's own plain-Astro version.
 * Everything else Billy uses is a link, because its licence does not allow copying.
 */

export type LibraryPiece = {
  id: string;
  name: string;
  category: 'intro' | 'footer' | 'button' | 'heading' | 'background';
  description: string;
  licence: string;
  source: string;
  needsScript: boolean;
  codeAllowed: boolean;
  astro: string;
  styles: string;
  markup: string;
};

function piece(
  id: string,
  name: string,
  category: LibraryPiece['category'],
  description: string,
  markup: string,
  styles: string,
): LibraryPiece {
  const astro = `---
// ${name} — Cauldron starter set.
// Look adapted from ThreeUI Community (MIT, Copyright (c) 2026 Meng To).
// Plain Astro, no client-side JavaScript. Edit freely: this file belongs to your site.
---

<section class="cauldron-${id}">
${markup
  .split('\n')
  .map((line) => (line.trim() === '' ? '' : `  ${line}`))
  .join('\n')}
</section>

<style>
${styles}
</style>
`;
  return {
    id,
    name,
    category,
    description,
    licence:
      "MIT (ThreeUI Community, Copyright (c) 2026 Meng To). Cauldron's plain-Astro version, MIT.",
    source: 'ThreeUI Community',
    needsScript: false,
    codeAllowed: true,
    astro,
    styles,
    markup,
  };
}

export const LIBRARY: LibraryPiece[] = [
  piece(
    'editorial-intro',
    'Editorial intro',
    'intro',
    'A calm opening: small label, large display heading, one short paragraph and a quiet action.',
    `<div class="wrap">
  <p class="label">Cauldron starter</p>
  <h2>Something worth reading, set properly.</h2>
  <p class="lede">A short paragraph that says what this place is and who it is for, in plain language.</p>
  <a class="action" href="/contact/">Start a conversation</a>
</div>`,
    `.cauldron-editorial-intro {
  background: var(--c-bg);
  color: var(--c-ink);
  padding: var(--space-8) var(--space-5);
}
.cauldron-editorial-intro .wrap {
  max-width: 62ch;
  margin-inline: auto;
}
.cauldron-editorial-intro .label {
  font-family: var(--font-body);
  font-size: var(--size-1);
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--c-muted);
  margin: 0 0 var(--space-3);
}
.cauldron-editorial-intro h2 {
  font-family: var(--font-display);
  font-size: var(--size-8);
  line-height: 1.05;
  letter-spacing: -0.02em;
  margin: 0 0 var(--space-4);
}
.cauldron-editorial-intro .lede {
  font-family: var(--font-body);
  font-size: var(--size-4);
  line-height: 1.6;
  color: var(--c-muted);
  margin: 0 0 var(--space-5);
}
.cauldron-editorial-intro .action {
  font-family: var(--font-body);
  font-size: var(--size-2);
  color: var(--c-primary);
  text-decoration: none;
  border-bottom: 1px solid currentColor;
  padding-bottom: 2px;
  transition: opacity var(--motion-quick) var(--motion-easing);
}
.cauldron-editorial-intro .action:hover {
  opacity: 0.7;
}
.cauldron-editorial-intro .action:focus-visible {
  outline: 2px solid var(--c-primary);
  outline-offset: 3px;
}
@media (max-width: 640px) {
  .cauldron-editorial-intro h2 {
    font-size: var(--size-6);
  }
}`,
  ),

  piece(
    'newsletter-footer',
    'Newsletter footer',
    'footer',
    'A quiet closing block with one field, one button and a line of reassurance.',
    `<div class="inner">
  <div>
    <h2>One good letter, now and then.</h2>
    <p>Nothing else. No noise, no weekly nagging.</p>
  </div>
  <form class="form" action="/" method="post">
    <label for="cauldron-news-email">Email address</label>
    <div class="row">
      <input id="cauldron-news-email" name="email" type="email" autocomplete="email" required />
      <button type="submit">Join</button>
    </div>
  </form>
</div>`,
    `.cauldron-newsletter-footer {
  background: var(--c-surface);
  color: var(--c-ink);
  border-top: 1px solid var(--c-line);
  padding: var(--space-7) var(--space-5);
}
.cauldron-newsletter-footer .inner {
  max-width: 72ch;
  margin-inline: auto;
  display: grid;
  gap: var(--space-4);
}
.cauldron-newsletter-footer h2 {
  font-family: var(--font-display);
  font-size: var(--size-5);
  margin: 0 0 var(--space-2);
}
.cauldron-newsletter-footer p {
  font-family: var(--font-body);
  color: var(--c-muted);
  margin: 0;
}
.cauldron-newsletter-footer label {
  display: block;
  font-size: var(--size-1);
  color: var(--c-muted);
  margin-bottom: var(--space-2);
}
.cauldron-newsletter-footer .row {
  display: flex;
  gap: var(--space-2);
  flex-wrap: wrap;
}
.cauldron-newsletter-footer input {
  flex: 1 1 16rem;
  min-width: 0;
  font: inherit;
  color: var(--c-ink);
  background: var(--c-bg);
  border: 1px solid var(--c-line);
  border-radius: var(--radius-1);
  padding: var(--space-2) var(--space-3);
}
.cauldron-newsletter-footer input:focus-visible {
  outline: 2px solid var(--c-primary);
  outline-offset: 1px;
}
.cauldron-newsletter-footer button {
  font: inherit;
  font-weight: 600;
  color: var(--c-bg);
  background: var(--c-primary);
  border: 1px solid var(--c-primary);
  border-radius: var(--radius-1);
  padding: var(--space-2) var(--space-4);
  cursor: pointer;
  transition: background var(--motion-quick) var(--motion-easing);
}
.cauldron-newsletter-footer button:hover {
  background: var(--c-primary-deep, var(--c-primary));
}
.cauldron-newsletter-footer button:focus-visible {
  outline: 2px solid var(--c-ink);
  outline-offset: 2px;
}
@media (min-width: 720px) {
  .cauldron-newsletter-footer .inner {
    grid-template-columns: 1fr auto;
    align-items: end;
  }
}`,
  ),

  piece(
    'glow-action',
    'Glowing call to action',
    'button',
    'One button with a soft light behind it, for the single most important action on a page.',
    `<div class="stage">
  <a class="glow" href="/contact/">Book a chat</a>
</div>`,
    `.cauldron-glow-action {
  background: var(--c-bg);
  padding: var(--space-6) var(--space-5);
  display: grid;
  place-items: center;
}
.cauldron-glow-action .stage {
  position: relative;
  display: inline-block;
}
.cauldron-glow-action .stage::before {
  content: '';
  position: absolute;
  inset: -14% -8%;
  background: var(--c-primary);
  filter: blur(28px);
  opacity: 0.35;
  border-radius: 999px;
  z-index: 0;
}
.cauldron-glow-action .glow {
  position: relative;
  z-index: 1;
  display: inline-block;
  font-family: var(--font-body);
  font-size: var(--size-3);
  font-weight: 600;
  color: var(--c-bg);
  background: var(--c-primary);
  border: 1px solid var(--c-primary);
  border-radius: 999px;
  padding: var(--space-3) var(--space-5);
  text-decoration: none;
  transition:
    transform var(--motion-quick) var(--motion-easing),
    box-shadow var(--motion-quick) var(--motion-easing);
}
.cauldron-glow-action .glow:hover {
  transform: translateY(-1px);
  box-shadow: 0 6px 20px rgb(0 0 0 / 12%);
}
.cauldron-glow-action .glow:focus-visible {
  outline: 2px solid var(--c-ink);
  outline-offset: 3px;
}
@media (prefers-reduced-motion: reduce) {
  .cauldron-glow-action .glow {
    transition: none;
  }
}`,
  ),

  piece(
    'heading-reveal',
    'Heading reveal',
    'heading',
    'A large heading whose lines settle into place as the page arrives. Stops entirely for reduced motion.',
    `<h2 class="reveal">
  <span style="--i: 0">Built slowly,</span>
  <span style="--i: 1">so it lasts.</span>
</h2>`,
    `.cauldron-heading-reveal {
  background: var(--c-bg);
  color: var(--c-ink);
  padding: var(--space-7) var(--space-5);
}
.cauldron-heading-reveal .reveal {
  font-family: var(--font-display);
  font-size: clamp(var(--size-6), 7vw, var(--size-9));
  line-height: 1.02;
  letter-spacing: -0.03em;
  margin: 0;
  display: grid;
  gap: 0.1em;
}
.cauldron-heading-reveal .reveal span {
  display: block;
  animation: cauldron-rise 700ms var(--motion-easing) both;
  animation-delay: calc(var(--i) * 90ms);
}
@keyframes cauldron-rise {
  from {
    opacity: 0;
    transform: translateY(0.5em);
  }
  to {
    opacity: 1;
    transform: none;
  }
}
@media (prefers-reduced-motion: reduce) {
  .cauldron-heading-reveal .reveal span {
    animation: none;
    opacity: 1;
    transform: none;
  }
}`,
  ),

  piece(
    'woven-cloth',
    'Woven cloth background',
    'background',
    'A woven texture behind a quiet message, drawn with gradients instead of images or shaders.',
    `<div class="cloth">
  <p>Woven from paper and thread.</p>
</div>`,
    `.cauldron-woven-cloth {
  padding: var(--space-8) var(--space-5);
  background: var(--c-bg);
}
.cauldron-woven-cloth .cloth {
  min-height: 320px;
  display: grid;
  place-items: center;
  color: var(--c-ink);
  border: 1px solid var(--c-line);
  border-radius: var(--radius-2);
  background-image:
    repeating-linear-gradient(
      45deg,
      color-mix(in srgb, var(--c-ink) 6%, transparent) 0 1px,
      transparent 1px 7px
    ),
    repeating-linear-gradient(
      -45deg,
      color-mix(in srgb, var(--c-ink) 4%, transparent) 0 1px,
      transparent 1px 7px
    ),
    radial-gradient(
      120% 90% at 20% 0%,
      color-mix(in srgb, var(--c-surface) 70%, transparent),
      transparent 60%
    );
}
.cauldron-woven-cloth p {
  font-family: var(--font-display);
  font-size: var(--size-4);
  letter-spacing: 0.02em;
  margin: 0;
  opacity: 0.9;
}`,
  ),
];

/** Pieces whose licence allows bundling the code. Everything else is a link only. */
export const LINKS_SHELF = [
  {
    name: 'Unsection',
    url: 'https://www.unsection.com',
    why: 'Section ideas. No reuse licence.',
  },
  {
    name: 'Lander blocks',
    url: 'https://blocks.lander.studio',
    why: 'Figma blocks. No reuse licence.',
  },
  {
    name: 'Gradient Deck',
    url: 'https://ui.gradientdeck.com',
    why: 'Design notes. No licence found.',
  },
  {
    name: 'mkdir.directory',
    url: 'https://mkdir.directory',
    why: 'Reference shelf.',
  },
  {
    name: 'Subframe Motion',
    url: 'https://www.subframe.com',
    why: 'Motion reference.',
  },
  {
    name: 'Prompt Motion',
    url: 'https://promptmotion.com',
    why: 'Motion reference.',
  },
  {
    name: 'React Bits',
    url: 'https://reactbits.dev',
    why: 'Licence forbids redistribution; link only.',
  },
  { name: 'OriginKit', url: 'https://originkit.dev', why: 'Discovery only.' },
  {
    name: 'Lexington Themes',
    url: 'https://lexingtonthemes.com',
    why: 'Paid. Reference only.',
  },
];

export function piecePreview(piece_: LibraryPiece): string {
  return `<!doctype html>
<html lang="en-AU"><head><meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<style>
  :root {
    --c-bg: #f8f4e9; --c-surface: #fffdf7; --c-ink: #2a1712; --c-muted: #6b5a52;
    --c-primary: #b84b30; --c-primary-deep: #5f1d1a; --c-line: #e3d9c8;
    --font-display: Georgia, serif; --font-body: -apple-system, BlinkMacSystemFont, sans-serif;
    --size-1: 0.8125rem; --size-2: 0.9375rem; --size-3: 1.0625rem; --size-4: 1.25rem;
    --size-5: 1.5625rem; --size-6: 1.9375rem; --size-7: 2.4375rem; --size-8: 3.0625rem;
    --size-9: 3.8125rem;
    --space-1: 0.25rem; --space-2: 0.5rem; --space-3: 0.75rem; --space-4: 1rem;
    --space-5: 1.5rem; --space-6: 2rem; --space-7: 3rem; --space-8: 4rem;
    --radius-0: 0px; --radius-1: 4px; --radius-2: 10px;
    --motion-quick: 140ms; --motion-settle: 240ms; --motion-easing: cubic-bezier(0.2,0.7,0.3,1);
  }
  body { margin: 0; background: #fff; }
  section { max-width: 100%; }
</style>
<style>${piece_.styles}</style>
</head>
<body><section class="cauldron-${piece_.id}">${piece_.markup}</section></body></html>`;
}

export type AddResult =
  | { ok: true; componentFile: string; page: string; replaced?: string }
  | { ok: false; problem: string };

/**
 * Copies the piece into the site as the site's own file, and places it on one page.
 * Touches only those two files (plan 4.3, check 1).
 */
export function addPiece(
  root: string,
  options: {
    pieceId: string;
    page: string;
    mode: 'add' | 'replace';
    replaceSelector?: string;
  },
): AddResult {
  const piece_ = LIBRARY.find((item) => item.id === options.pieceId);
  if (!piece_)
    return { ok: false, problem: 'That piece is not in the starter set.' };
  if (!piece_.codeAllowed)
    return { ok: false, problem: 'That piece is a link only, not code.' };

  const pageFile = resolvePage(root, options.page);
  if (!pageFile)
    return { ok: false, problem: `No page file for ${options.page}.` };

  const componentName = piece_.name.replace(/[^A-Za-z]/g, '');
  const componentFile = path.join(
    root,
    'src/components',
    `${componentName}.astro`,
  );
  if (!isInside(root, componentFile))
    return { ok: false, problem: 'That path is outside the site.' };

  fs.mkdirSync(path.dirname(componentFile), { recursive: true });
  fs.writeFileSync(componentFile, piece_.astro, 'utf8');

  const original = fs.readFileSync(pageFile, 'utf8');
  let next = original;
  const importLine = `import ${componentName} from '../components/${componentName}.astro';\n`;

  if (!new RegExp(`import\\s+${componentName}\\s+from`).test(next)) {
    if (next.startsWith('---\n'))
      next = next.replace(/^---\n/, `---\n${importLine}`);
    else next = `---\n${importLine}---\n${next}`;
  }

  if (options.mode === 'replace' && options.replaceSelector) {
    const selector = options.replaceSelector.replace(
      /[.*+?^${}()|[\]\\]/g,
      '\\$&',
    );
    const tagPattern = new RegExp(`<${selector}(\\s[^>]*)?/>`, '');
    if (!tagPattern.test(next)) {
      return {
        ok: false,
        problem: `I could not find <${options.replaceSelector} /> on that page to replace.`,
      };
    }
    next = next.replace(tagPattern, `<${componentName} />`);
  } else if (next.includes('</main>')) {
    next = next.replace('</main>', `  <${componentName} />\n    </main>`);
  } else if (next.includes('</body>')) {
    next = next.replace('</body>', `  <${componentName} />\n  </body>`);
  } else {
    next = `${next}\n<${componentName} />\n`;
  }

  fs.writeFileSync(pageFile, next, 'utf8');
  return {
    ok: true,
    componentFile: path.relative(root, componentFile),
    page: path.relative(root, pageFile),
    replaced: options.replaceSelector,
  };
}

function resolvePage(root: string, page: string): string | null {
  const clean = page.replace(/^\/+|\/+$/g, '');
  const candidates = [
    path.join(root, 'src/pages', `${clean}.astro`),
    path.join(root, 'src/pages', clean, 'index.astro'),
    path.join(root, 'src/pages/index.astro'),
  ];
  return candidates.find((candidate) => fs.existsSync(candidate)) ?? null;
}
