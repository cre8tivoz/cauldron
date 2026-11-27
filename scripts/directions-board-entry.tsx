/**
 * Renders the design-directions board: the app's own card markup and stylesheet
 * with the real direction data, as one static page. Used to look at the cards
 * and to capture them for `docs/reference/directions-audit/`.
 */
import fs from 'node:fs';
import path from 'node:path';
import { renderToStaticMarkup } from 'react-dom/server';
import { DIRECTIONS } from '../src/main/directions';
import { directionFontsHref } from '../src/main/fonts';
import { DirectionMiniSite } from '../src/components/DirectionMiniSite';

// Set by scripts/directions-board.mjs: the bundle runs from node_modules/.cache,
// so the repo root cannot be inferred from this file's own location.
const repo =
  process.env.CAULDRON_REPO ??
  path.resolve(new URL('..', import.meta.url).pathname);

const directions = DIRECTIONS.map((direction) => ({
  ...direction,
  fonts: {
    display: direction.fonts.display.family,
    body: direction.fonts.body.family,
  },
}));

const Card = ({
  direction,
  active,
}: {
  direction: (typeof directions)[number];
  active: boolean;
}) => (
  <div
    className={`direction-hero-card ${active ? 'active-direction-card' : ''}`}
  >
    <DirectionMiniSite direction={direction} />
    <div className="direction-card-body">
      <div className="direction-title-row">
        <strong className="direction-name">{direction.name}</strong>
        {active ? (
          <span className="current-direction-badge">Current</span>
        ) : null}
      </div>
      <div className="direction-audience">{direction.forWhom}</div>
      <div className="direction-token-strip">
        {['bg', 'surface', 'ink', 'muted', 'primary', 'accent'].map((role) => (
          <span
            key={role}
            title={`${role}: ${direction.colours[role]}`}
            style={{ background: direction.colours[role] }}
          />
        ))}
        <span className="direction-token-strip-fonts">
          {direction.fonts.display} / {direction.fonts.body}
        </span>
      </div>
      <p className="direction-character-note">{direction.character}</p>
      <div className="direction-card-footer">
        <button
          className={`direction-action-btn ${active ? 'in-use-btn' : 'use-btn'}`}
          type="button"
          disabled={active}
        >
          {active ? 'In use' : 'Use this direction'}
        </button>
      </div>
    </div>
  </div>
);

const Board = () => (
  <div style={{ padding: 24, background: 'var(--bg)', color: 'var(--text)' }}>
    <div className="design-header-bar">
      <div className="design-title-group">
        <h2 className="design-heading">Design directions</h2>
        <span className="design-subtitle">
          Ten looks, learned from real sites. Pick one for this site.
        </span>
      </div>
      <button className="button back-to-site-btn" type="button">
        ← Back to the site
      </button>
    </div>
    <div className="directions-hero-grid">
      {directions.map((direction, index) => (
        <Card key={direction.id} direction={direction} active={index === 0} />
      ))}
    </div>
  </div>
);

const css = fs.readFileSync(path.join(repo, 'src/index.css'), 'utf8');
const html = `<!doctype html>
<html lang="en-AU"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Cauldron — design directions board</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="${directionFontsHref('https://fonts.googleapis.com/css2?family=Archivo:wght@400;500;600;700&family=Archivo+Black&display=swap')}" rel="stylesheet">
<style>${css}</style>
</head><body class="app">${renderToStaticMarkup(<Board />)}</body></html>`;

const out =
  process.argv[2] ??
  path.join(repo, 'docs/reference/directions-audit/board.html');
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, html);
console.log(
  `${directions.length} directions → ${out} (${(html.length / 1024).toFixed(0)}KB)`,
);
