import { useEffect, useState } from 'react';

type Props = {
  site: CauldronSite | null;
  current: CauldronDirectionSummary | null;
  onChosen: (direction: CauldronDirectionSummary) => void;
  onBack: () => void;
};

/** The starter set: seven looks learned from real sites (plan 4.2). */
export function DesignPanel({ site, current, onChosen, onBack }: Props) {
  const [directions, setDirections] = useState<CauldronDirectionSummary[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [url, setUrl] = useState('');
  const [measuring, setMeasuring] = useState(false);

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
    <div className="pane-body" style={{ overflowY: 'auto', padding: 20 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
        <h2 style={{ margin: 0, fontSize: 20 }}>Design directions</h2>
        <span className="hint">
          Seven looks, learned from real sites. Pick one for this site.
        </span>
        <span className="spacer" />
        <button className="button" type="button" onClick={onBack}>
          Back to the site
        </button>
      </div>

      {!site ? <p className="hint">Open a site first.</p> : null}
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
        style={{ display: 'flex', gap: 8, marginTop: 16 }}
      >
        <input
          aria-label="Reference URL"
          type="url"
          value={url}
          required
          onChange={(event) => setUrl(event.target.value)}
          placeholder="https://reference.example"
          style={{ flex: 1 }}
        />
        <button className="button" disabled={!site || measuring}>
          {measuring ? 'Measuring…' : 'Use a reference URL'}
        </button>
      </form>
      {message ? (
        <div className="notice good" style={{ marginTop: 12 }}>
          {message}
        </div>
      ) : null}

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
          gap: 14,
          marginTop: 16,
        }}
      >
        {directions.map((direction) => {
          const active = current?.id === direction.id;
          return (
            <div
              key={direction.id}
              style={{
                border: `1px solid ${active ? 'var(--accent)' : 'var(--hairline)'}`,
                borderRadius: 12,
                padding: 14,
                background: 'var(--panel-sunken)',
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <strong style={{ fontSize: 15 }}>{direction.name}</strong>
                <span className="hint">{direction.forWhom}</span>
                {active ? <span className="site-meta">current</span> : null}
              </div>

              <div style={{ display: 'flex', gap: 4 }}>
                {Object.entries(direction.colours).map(([name, value]) => (
                  <span
                    key={name}
                    title={`${name} ${value}`}
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: 5,
                      background: value,
                      border: '1px solid var(--hairline)',
                    }}
                  />
                ))}
              </div>

              <div className="hint">
                {direction.fonts.display} · {direction.fonts.body}
              </div>
              <p className="hint" style={{ margin: 0 }}>
                {direction.character}
              </p>
              <p className="hint" style={{ margin: 0, color: 'var(--faint)' }}>
                Learned from {direction.learnedFrom}
              </p>
              <button
                className={active ? 'button' : 'button primary'}
                type="button"
                onClick={() => void choose(direction)}
                disabled={!site || active}
              >
                {active ? 'In use' : 'Use this direction'}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
