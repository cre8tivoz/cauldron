import { useEffect, useState } from 'react';
import { DirectionMiniSite } from './DirectionMiniSite';

export const SPECIMEN_GOOGLE_FONTS_URL =
  'https://fonts.googleapis.com/css2?family=Anton&family=Archivo:wght@400;500;600;700&family=Archivo+Black&family=Bitter:wght@400;600&family=Bodoni+Moda:ital,opsz,wght@0,6..96,400..700;1,6..96,400..700&family=Bricolage+Grotesque:opsz,wght@12..96,400..700&family=Cormorant+Garamond:wght@400;600;700&family=EB+Garamond:wght@400;600;700&family=Figtree:wght@400;600&family=Fraunces:opsz,wght@9..144,400..700&family=Geist:wght@400;600;700&family=Instrument+Serif:ital@0;1&family=Jost:wght@400;500;600&family=Karla:wght@400;500;600&family=Libre+Franklin:wght@400;600&family=Lora:ital,wght@0,400..700;1,400..700&family=Manrope:wght@400;600;700&family=Newsreader:opsz,wght@6..72,400..700&family=Nunito:wght@400;600;700&family=Playfair+Display:ital,wght@0,400..700;1,400..700&family=Public+Sans:wght@400;500;600&family=Space+Grotesk:wght@400;600;700&family=Syne:wght@400;700;800&family=Work+Sans:wght@400;500;600&family=Young+Serif&display=swap';

type Props = {
  site: CauldronSite | null;
  current: CauldronDirectionSummary | null;
  onChosen: (direction: CauldronDirectionSummary) => void;
  onBack: () => void;
};

export function DesignPanel({ site, current, onChosen, onBack }: Props) {
  const [directions, setDirections] = useState<CauldronDirectionSummary[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [url, setUrl] = useState('');
  const [measuring, setMeasuring] = useState(false);

  useEffect(() => {
    void window.cauldron.directions().then(setDirections);
  }, []);

  useEffect(() => {
    if (document.getElementById('cauldron-specimen-fonts')) return;
    const link = document.createElement('link');
    link.id = 'cauldron-specimen-fonts';
    link.rel = 'stylesheet';
    link.href = SPECIMEN_GOOGLE_FONTS_URL;
    link.onerror = () => {
      console.warn(
        'Specimen preview fonts could not be loaded; falling back to system fonts.',
      );
    };
    document.head.appendChild(link);
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
          return (
            <div
              key={direction.id}
              className={`direction-hero-card ${active ? 'active-direction-card' : ''}`}
            >
              <DirectionMiniSite direction={direction} />

              {/* Card Body */}
              <div className="direction-card-body">
                <div className="direction-title-row">
                  <strong className="direction-name">{direction.name}</strong>
                  {active ? (
                    <span className="current-direction-badge">Current</span>
                  ) : null}
                </div>

                <div className="direction-audience">{direction.forWhom}</div>

                <div
                  className="direction-token-strip"
                  aria-label="Direction palette"
                >
                  {['bg', 'surface', 'ink', 'muted', 'primary', 'accent'].map(
                    (role) =>
                      direction.colours[role] && (
                        <span
                          key={role}
                          title={`${role}: ${direction.colours[role]}`}
                          style={{ background: direction.colours[role] }}
                        />
                      ),
                  )}
                  <span className="direction-token-strip-fonts">
                    {direction.fonts.display} / {direction.fonts.body}
                  </span>
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
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
