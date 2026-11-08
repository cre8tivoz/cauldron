import { useEffect, useState } from 'react';

type Props = {
  site: CauldronSite | null;
  onBack: () => void;
};

/**
 * The starter component library (plan 4.3): five pieces with previews, added or
 * replaced on a chosen page. Everything else is a link, because its licence does
 * not allow copying.
 */
export function LibraryPanel({ site, onBack }: Props) {
  const [pieces, setPieces] = useState<CauldronPiece[]>([]);
  const [links, setLinks] = useState<
    Array<{ name: string; url: string; why: string }>
  >([]);
  const [pages, setPages] = useState<Array<{ page: string; file: string }>>([]);
  const [page, setPage] = useState('/');
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [replaceTag, setReplaceTag] = useState('');
  const [lastRun, setLastRun] = useState<string | null>(null);

  useEffect(() => {
    window.cauldron
      .library()
      .then((result) => {
        setPieces(result.pieces);
        setLinks(result.links);
      })
      .catch((error: unknown) => {
        // A failed load must say why, not quietly show an empty shelf.
        setMessage(
          `The component library could not be read: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      });
    window.cauldron
      .runAction({ action: 'listPages' })
      .then((result) => {
        const listed = result as {
          pages?: Array<{ page: string; file: string }>;
        };
        setPages(listed.pages ?? []);
        if (listed.pages && listed.pages.length > 0)
          setPage(listed.pages[0].page);
      })
      .catch((error: unknown) => {
        setMessage(
          `The site's pages could not be listed: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      });
  }, [site?.root]);

  const add = async (piece: CauldronPiece, mode: 'add' | 'replace' = 'add') => {
    setBusy(piece.id);
    setMessage(null);
    const result = await window.cauldron.addPiece({
      pieceId: piece.id,
      page,
      mode,
      replaceSelector: mode === 'replace' ? replaceTag.trim() : undefined,
    });
    setBusy(null);
    if (!result.ok) {
      setMessage(result.problem ?? 'That piece could not be added.');
      return;
    }
    setLastRun(result.runId ?? null);
    setMessage(
      `${piece.name} was copied into the site and placed on ${result.page}.`,
    );
  };

  return (
    <div className="pane-body" style={{ overflowY: 'auto', padding: 20 }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          gap: 12,
          flexWrap: 'wrap',
        }}
      >
        <h2 style={{ margin: 0, fontSize: 20 }}>Components</h2>
        <span className="hint">
          Five pieces, plain Astro, built on the site's design direction.
        </span>
        <span className="spacer" />
        <label className="hint" htmlFor="library-page">
          Page
        </label>
        <select
          id="library-page"
          value={page}
          onChange={(event) => setPage(event.target.value)}
          style={{ height: 26 }}
        >
          {pages.map((item) => (
            <option key={item.file} value={item.page}>
              {item.page}
            </option>
          ))}
        </select>
        <button className="button" type="button" onClick={onBack}>
          Back to the site
        </button>
      </div>

      {!site ? <p className="hint">Open a site first.</p> : null}
      <label className="field" style={{ marginTop: 12 }}>
        Replace component tag (for example Editorialintro)
        <input
          value={replaceTag}
          onChange={(event) => setReplaceTag(event.target.value)}
        />
      </label>
      {lastRun ? (
        <button
          className="button"
          type="button"
          onClick={async () => {
            const result = await window.cauldron.undoRun(lastRun);
            setMessage(
              result.ok
                ? 'Library change undone.'
                : (result.problem ?? 'Undo refused.'),
            );
            if (result.ok) setLastRun(null);
          }}
        >
          Undo library change
        </button>
      ) : null}
      {message ? (
        <div className="notice" style={{ marginTop: 12 }}>
          {message}
        </div>
      ) : null}

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: 14,
          marginTop: 16,
        }}
      >
        {pieces.map((piece) => (
          <div
            key={piece.id}
            style={{
              border: '1px solid var(--hairline)',
              borderRadius: 12,
              overflow: 'hidden',
              background: 'var(--panel-sunken)',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <iframe
              title={`${piece.name} preview`}
              srcDoc={piece.previewHtml}
              sandbox=""
              style={{
                width: '100%',
                height: 170,
                border: 0,
                background: '#fff',
              }}
            />
            <div
              style={{
                padding: 12,
                display: 'flex',
                flexDirection: 'column',
                gap: 6,
              }}
            >
              <strong style={{ fontSize: 14 }}>{piece.name}</strong>
              <span className="hint">{piece.description}</span>
              <span className="hint" style={{ color: 'var(--faint)' }}>
                {piece.licence}
              </span>
              <button
                className="button primary"
                type="button"
                onClick={() => void add(piece)}
                disabled={!site || busy === piece.id}
              >
                {busy === piece.id ? 'Adding…' : `Add to ${page}`}
              </button>
              <button
                className="button"
                type="button"
                onClick={() => void add(piece, 'replace')}
                disabled={!site || busy !== null || !replaceTag.trim()}
              >
                Replace {replaceTag.trim() || 'a component'}
              </button>
            </div>
          </div>
        ))}
      </div>

      <h3 style={{ fontSize: 13, marginTop: 24 }}>
        Links shelf — ideas, not code
      </h3>
      <p className="hint">
        These are worth looking at, but their licences do not allow Cauldron to
        copy them into a site.
      </p>
      <ul className="hint" style={{ paddingLeft: 18 }}>
        {links.map((link) => (
          <li key={link.name} style={{ marginBottom: 4 }}>
            <strong>{link.name}</strong> — {link.why}{' '}
            <a href={link.url} target="_blank" rel="noreferrer">
              {link.url}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
