import { useEffect, useState } from 'react';

type Props = {
  site: CauldronSite | null;
  current: CauldronDirectionSummary | null;
  onChosen: (direction: CauldronDirectionSummary) => void;
  onBack: () => void;
};

type HeroArtworkConfig = {
  kicker: string;
  headline: string;
  headlineFont: string;
  artType: string;
};

const HERO_ART_CONFIGS: Record<string, HeroArtworkConfig> = {
  'long-lunch': {
    kicker: 'SUNDAY TABLE · A NEIGHBOURHOOD CAFÉ',
    headline: 'Take your time.',
    headlineFont: "'Fraunces', 'Young Serif', serif",
    artType: 'cafe',
  },
  'clear-ground': {
    kicker: 'HEALTH & PHYSIO',
    headline: 'Room to move.',
    headlineFont: "'Newsreader', 'Manrope', serif",
    artType: 'wellness',
  },
  'solid-ground': {
    kicker: 'NORTHLINE BUILD',
    headline: 'Built to last.',
    headlineFont: "'Archivo Black', sans-serif",
    artType: 'timber',
  },
  'silver-screen': {
    kicker: 'ODD HOURS',
    headline: 'WORK IN FRAME',
    headlineFont: "'Anton', 'Bricolage Grotesque', sans-serif",
    artType: 'studio',
  },
  'the-edit': {
    kicker: 'CONSIDERED OBJECTS',
    headline: 'Objects of interest.',
    headlineFont: "'Playfair Display', 'Bodoni Moda', serif",
    artType: 'vase',
  },
  'after-hours': {
    kicker: 'THE LANTERN ROOM',
    headline: 'An evening worth staying for.',
    headlineFont: "'Cormorant Garamond', 'Syne', serif",
    artType: 'theatre',
  },
  'open-house': {
    kicker: '— SUNDAY TABLE —',
    headline: 'Made close to home.',
    headlineFont: "'Lora', 'EB Garamond', serif",
    artType: 'honey',
  },
  componine: {
    kicker: 'SYSTEMS & SOFTWARE',
    headline: 'Small pieces, carefully joined.',
    headlineFont: "'Newsreader', serif",
    artType: 'grid',
  },
  'niki-studio': {
    kicker: 'CINEMATIC DIRECTION',
    headline: 'IN THE FRAME',
    headlineFont: "'Archivo Black', sans-serif",
    artType: 'cinema',
  },
  'henry-from-online': {
    kicker: 'CRAFT & HARDWARE',
    headline: 'Crafted from the earth.',
    headlineFont: "'Instrument Serif', serif",
    artType: 'craft',
  },
};

function HeroArtSnippet({
  type,
  accent,
  surface,
}: {
  type: string;
  accent: string;
  surface: string;
}) {
  switch (type) {
    case 'cafe':
      return (
        <div className="hero-art-cafe">
          <div className="cafe-dish" />
          <div className="cafe-cup" />
          <div className="cafe-leaves" />
        </div>
      );
    case 'wellness':
      return (
        <div className="hero-art-wellness">
          <div className="wellness-arch" style={{ background: surface }} />
          <div className="wellness-branch" />
        </div>
      );
    case 'timber':
      return (
        <div className="hero-art-timber">
          <div className="timber-beam beam-v" />
          <div className="timber-beam beam-h" />
          <div className="timber-bolt" />
        </div>
      );
    case 'studio':
      return (
        <div className="hero-art-studio">
          <div className="studio-light" />
          <div className="studio-tripod" />
        </div>
      );
    case 'vase':
      return (
        <div className="hero-art-vase">
          <div className="ceramic-vase" />
        </div>
      );
    case 'theatre':
      return (
        <div className="hero-art-theatre">
          <div className="theatre-glow" style={{ background: accent }} />
          <div className="theatre-seats" />
        </div>
      );
    case 'honey':
      return (
        <div className="hero-art-honey">
          <div className="honey-jar" />
        </div>
      );
    default:
      return (
        <div className="hero-art-generic" style={{ background: surface }}>
          <div className="generic-circle" style={{ borderColor: accent }} />
        </div>
      );
  }
}

/**
 * Design Directions panel: visual hero specimen cards, real Google Fonts,
 * 5 rounded colour swatches, audience subtitles, and reference measurement.
 */
export function DesignPanel({ site, current, onChosen, onBack }: Props) {
  const [directions, setDirections] = useState<CauldronDirectionSummary[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [url, setUrl] = useState('');
  const [measuring, setMeasuring] = useState(false);
  const [previewSpecimen, setPreviewSpecimen] =
    useState<CauldronDirectionSummary | null>(null);

  useEffect(() => {
    void window.cauldron.directions().then(setDirections);
  }, []);

  const choose = async (direction: CauldronDirectionSummary) => {
    const result = await window.cauldron.setDirection(direction.id);
    if (!result.ok) {
      setMessage(result.problem ?? 'That direction could not be saved.');
      return;
    }
    setMessage(`${direction.name} is now this site's design direction.`);
    onChosen(direction);
  };

  return (
    <div
      className="pane-body design-panel-container"
      style={{ overflowY: 'auto', padding: 24 }}
    >
      {/* Header bar */}
      <div className="design-header-bar">
        <div className="design-title-group">
          <h2 className="design-heading">Design directions</h2>
          <span className="design-subtitle">
            Ten looks, learned from real sites. Pick one for this site.
          </span>
        </div>
        <button
          className="button back-to-site-btn"
          type="button"
          onClick={onBack}
        >
          ← Back to the site
        </button>
      </div>

      {!site ? <p className="hint">Open a site first.</p> : null}

      {/* Reference URL form */}
      <form
        onSubmit={async (event) => {
          event.preventDefault();
          setMeasuring(true);
          setMessage(null);
          try {
            const result = await window.cauldron.referenceDirection(url);
            if (result.ok && result.direction) onChosen(result.direction);
            else
              setMessage(
                result.problem ?? 'The reference could not be measured.',
              );
          } finally {
            setMeasuring(false);
          }
        }}
        className="reference-measure-bar"
      >
        <span className="reference-label">Measure a site you like:</span>
        <input
          aria-label="Reference URL"
          type="url"
          value={url}
          required
          onChange={(event) => setUrl(event.target.value)}
          placeholder="https://reference.example"
          className="reference-input"
        />
        <button
          className="button primary"
          type="submit"
          disabled={!site || measuring}
        >
          {measuring ? 'Measuring…' : 'Use a reference URL'}
        </button>
      </form>

      {message ? (
        <div className="notice good" style={{ marginTop: 12 }}>
          {message}
        </div>
      ) : null}

      {/* 4-Column Visual Hero Specimen Cards Grid */}
      <div className="directions-hero-grid">
        {directions.map((direction) => {
          const active = current?.id === direction.id;
          const colours = direction.colours || {};
          const bgColour = colours.bg || colours.paper || '#f8f1df';
          const surfaceColour = colours.surface || '#eee1c7';
          const textColour = colours.text || colours.ink || '#32231b';
          const accentColour =
            colours.accent ||
            colours.primary ||
            colours['accent-primary'] ||
            '#783b29';

          const heroConfig = HERO_ART_CONFIGS[direction.id] || {
            kicker: direction.name.toUpperCase(),
            headline: direction.name,
            headlineFont: direction.fonts.display,
            artType: 'generic',
          };

          const colourEntries = Object.entries(colours).slice(0, 5);

          return (
            <div
              key={direction.id}
              className={`direction-hero-card ${active ? 'active-direction-card' : ''}`}
            >
              {/* Top Visual Hero Specimen Banner */}
              <div
                className="direction-hero-banner"
                style={{
                  background: bgColour,
                  color: textColour,
                }}
              >
                <div className="hero-banner-content">
                  <div
                    className="hero-kicker"
                    style={{ color: accentColour, opacity: 0.9 }}
                  >
                    {heroConfig.kicker}
                  </div>
                  <h3
                    className="hero-display-headline"
                    style={{
                      fontFamily: heroConfig.headlineFont,
                      color: textColour,
                    }}
                  >
                    {heroConfig.headline}
                  </h3>
                  <div
                    className="hero-accent-bar"
                    style={{ background: accentColour }}
                  />
                </div>

                <div className="hero-banner-art-wrap" aria-hidden="true">
                  <HeroArtSnippet
                    type={heroConfig.artType}
                    accent={accentColour}
                    surface={surfaceColour}
                  />
                </div>
              </div>

              {/* Card Body */}
              <div className="direction-card-body">
                <div className="direction-title-row">
                  <strong className="direction-name">{direction.name}</strong>
                  {active ? (
                    <span className="current-direction-badge">Current</span>
                  ) : null}
                </div>

                <div className="direction-audience">{direction.forWhom}</div>

                {/* 5 Rounded Colour Swatches */}
                <div className="direction-swatches-row">
                  {colourEntries.map(([name, value]) => (
                    <span
                      key={name}
                      title={`${name}: ${value}`}
                      className="colour-pill-swatch"
                      style={{ background: value }}
                    />
                  ))}
                </div>

                {/* Font Pairing Line */}
                <div className="direction-font-pairing">
                  {direction.fonts.display} · {direction.fonts.body}
                  {direction.fonts.detail ? ` · ${direction.fonts.detail}` : ''}
                </div>

                {/* One-Line Editorial Note */}
                <p className="direction-character-note">
                  {direction.character}
                </p>

                {/* Collapsible Structure Details for Tests & Guidance */}
                {direction.structure ? (
                  <details className="direction-structure-details">
                    <summary className="hint">
                      Layout, states and mobile
                    </summary>
                    <div className="structure-guidance-content">
                      <p className="hint">
                        <strong>Density:</strong> {direction.structure.density}
                      </p>
                      <p className="hint">
                        <strong>Display:</strong>{' '}
                        {direction.structure.displayType}
                      </p>
                      <p className="hint">
                        <strong>Surfaces:</strong>{' '}
                        {direction.structure.surfaces}
                      </p>
                      <p className="hint">
                        <strong>States:</strong> {direction.structure.states}
                      </p>
                      <p className="hint">
                        <strong>Mobile:</strong> {direction.structure.mobile}
                      </p>
                    </div>
                  </details>
                ) : null}

                <p
                  className="hint direction-source-credit"
                  style={{ margin: 0, color: 'var(--faint)' }}
                >
                  Learned from {direction.learnedFrom}
                </p>

                {/* Bottom Action Pill Button */}
                <div className="direction-card-footer">
                  <button
                    className={`direction-action-btn ${active ? 'in-use-btn' : 'use-btn'}`}
                    type="button"
                    onClick={() => void choose(direction)}
                    disabled={!site || active}
                  >
                    {active ? 'In use' : 'Use this direction'}
                  </button>

                  <button
                    className="button quiet-preview-btn"
                    type="button"
                    onClick={() => setPreviewSpecimen(direction)}
                    title="Preview full page layout"
                  >
                    Specimen ↗
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Full Specimen Modal */}
      {previewSpecimen ? (
        <div
          className="specimen-modal-overlay"
          role="dialog"
          aria-modal="true"
          onClick={() => setPreviewSpecimen(null)}
        >
          <div
            className="specimen-modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{
              background:
                previewSpecimen.colours.bg ||
                previewSpecimen.colours.paper ||
                '#f8f1df',
              color:
                previewSpecimen.colours.text ||
                previewSpecimen.colours.ink ||
                '#32231b',
              fontFamily: `${previewSpecimen.fonts.body}, sans-serif`,
            }}
          >
            <div className="specimen-modal-header">
              <span className="specimen-brand">
                {previewSpecimen.name} Studio
              </span>
              <div className="specimen-nav">
                <span>Explore</span>
                <span>Work</span>
                <span>Contact</span>
              </div>
              <button
                className="specimen-close-btn"
                type="button"
                onClick={() => setPreviewSpecimen(null)}
              >
                ✕
              </button>
            </div>

            <div className="specimen-hero-stage">
              <div className="specimen-kicker">
                {previewSpecimen.forWhom.toUpperCase()}
              </div>
              <h1
                style={{
                  fontFamily: `${previewSpecimen.fonts.display}, serif`,
                  fontSize: 54,
                  lineHeight: 1.08,
                  margin: '16px 0',
                }}
              >
                {HERO_ART_CONFIGS[previewSpecimen.id]?.headline ||
                  'Designed with care.'}
              </h1>
              <p
                style={{
                  maxWidth: '44ch',
                  fontSize: 16,
                  lineHeight: 1.6,
                  opacity: 0.85,
                }}
              >
                {previewSpecimen.character}
              </p>
              <div style={{ marginTop: 20 }}>
                <button
                  type="button"
                  className="specimen-cta-btn"
                  style={{
                    background:
                      previewSpecimen.colours.accent ||
                      previewSpecimen.colours.primary ||
                      '#783b29',
                    color: '#ffffff',
                    border: 0,
                    borderRadius: 8,
                    padding: '10px 20px',
                    fontWeight: 600,
                  }}
                  onClick={() => {
                    void choose(previewSpecimen);
                    setPreviewSpecimen(null);
                  }}
                >
                  Choose this direction
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
