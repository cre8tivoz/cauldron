import { useEffect, useState } from 'react';
import { LIBRARY_CATEGORIES, filterLibraryPieces } from '../library-filter';
import { ChevronDownIcon } from './Icons';
import { LibrarySpecimen } from './LibrarySpecimen';

type Props = {
  site: CauldronSite | null;
  onBack: () => void;
};

/**
 * Visual Component Library matching Cauldron’s Sunday Table components mockup:
 * 3-column visual cards, live preview stage on top, dark footer bar with MIT Plain Astro,
 * right-aligned page dropdown, replace component picker, and horizontal links shelf.
 */
export function LibraryPanel({ site, onBack }: Props) {
  const [pieces, setPieces] = useState<CauldronPiece[]>([]);
  const [links, setLinks] = useState<
    Array<{ name: string; url: string; why: string }>
  >([]);
  const [pages, setPages] = useState<Array<{ page: string; file: string }>>([]);
  const [page, setPage] = useState('/');
  // A failure must never look like a success (fablefixes 82).
  const [message, setNotice] = useState<{ ok: boolean; text: string } | null>(
    null,
  );
  const setMessage = (text: string | null, ok = false) => {
    if (text === null) return setNotice(null);
    if (!ok) console.error(text);
    setNotice({ ok, text });
  };
  const [busy, setBusy] = useState<string | null>(null);
  const [replaceTag, setReplaceTag] = useState('');
  const [lastRun, setLastRun] = useState<string | null>(null);
  const [category, setCategory] = useState('Featured');
  const [searchQuery, setSearchQuery] = useState('');
  const [selected, setSelected] = useState('');
  const [mobile, setMobile] = useState(false);
  const [replay, setReplay] = useState(0);

  useEffect(() => {
    window.cauldron
      .library()
      .then((result) => {
        setPieces(result?.pieces ?? []);
        setLinks(result?.links ?? []);
      })
      .catch((error: unknown) => {
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

  const add = async (
    pieceId: string,
    pieceName: string,
    mode: 'add' | 'replace' = 'add',
  ) => {
    // Only a piece the catalogue really has can be added. Anything else is
    // refused out loud; it is never swapped for a different piece.
    if (!pieces.some((p) => p.id === pieceId)) {
      setMessage(`${pieceName} is not in the component library.`);
      return;
    }
    setBusy(pieceId);
    setMessage(null);
    try {
      const result = await window.cauldron.addPiece({
        pieceId,
        page,
        mode,
        replaceSelector: mode === 'replace' ? replaceTag.trim() : undefined,
      });
      if (!result.ok) {
        setMessage(result.problem ?? 'That piece could not be added.');
        return;
      }
      setLastRun(result.runId ?? null);
      const fileNote = result.componentFile ? ` (${result.componentFile})` : '';
      setMessage(
        result.reusedExisting
          ? `${pieceName} already existed in the site${fileNote}, so the existing file was kept and placed on ${result.page}.`
          : `${pieceName} was copied into the site${fileNote} and placed on ${result.page}.`,
        true,
      );
    } catch (error) {
      setMessage(`The component could not be placed: ${error}`);
    } finally {
      setBusy(null);
    }
  };

  const pieceList = pieces ?? [];
  const displayPieces = filterLibraryPieces(pieceList, category, searchQuery);
  const piece =
    displayPieces.find((item) => item.id === selected) ?? displayPieces[0];

  return (
    <div
      className="pane-body library-panel-container"
      style={{ overflowY: 'auto', padding: 24 }}
    >
      {/* Header bar matching mockup */}
      <div className="library-header-bar">
        <div className="library-title-group">
          <h2 className="library-heading">Components</h2>
          <span className="library-subtitle">
            {pieceList.length} editable Astro components. Inspect the actual
            section before adding it.
          </span>
        </div>

        <div className="library-header-right">
          <div className="library-page-picker">
            <label htmlFor="library-page" className="library-page-label">
              Page:
            </label>
            <div className="library-select-wrapper">
              <select
                id="library-page"
                value={page}
                onChange={(event) => setPage(event.target.value)}
                className="library-page-select"
              >
                {pages.map((item) => (
                  <option key={item.file} value={item.page}>
                    {item.page}
                  </option>
                ))}
              </select>
              <ChevronDownIcon size={12} />
            </div>
          </div>

          <button
            className="button back-to-site-btn"
            type="button"
            onClick={onBack}
          >
            ← Back to the site
          </button>
        </div>
      </div>

      {!site ? <p className="hint">Open a site first.</p> : null}

      {/* Category Pills Bar */}
      <div className="library-category-bar">
        {LIBRARY_CATEGORIES.map((cat) => (
          <button
            key={cat}
            type="button"
            className={`category-pill ${category === cat ? 'active-pill' : ''}`}
            onClick={() => setCategory(cat)}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Search, Component Replacement, and Undo Bar */}
      <div className="library-controls-bar">
        <input
          type="search"
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          placeholder="Search sections..."
          aria-label="Search sections"
          className="library-search-input"
        />
        <label className="replace-tag-label">
          <span>Replace component tag (for example Editorialintro):</span>
          <input
            value={replaceTag}
            onChange={(event) => setReplaceTag(event.target.value)}
            placeholder="Editorialintro"
            className="replace-tag-input"
          />
        </label>

        {lastRun ? (
          <button
            className="button quiet-pill-btn"
            type="button"
            onClick={async () => {
              const result = await window.cauldron.undoRun(lastRun);
              setMessage(
                result.ok
                  ? 'Library change undone.'
                  : (result.problem ?? 'Undo refused.'),
                result.ok,
              );
              if (result.ok) setLastRun(null);
            }}
          >
            Undo library change
          </button>
        ) : null}
      </div>

      {message ? (
        <div
          className={`notice ${message.ok ? 'good' : 'bad'}`}
          role={message.ok ? 'status' : 'alert'}
          style={{ margin: '12px 0' }}
        >
          {message.text}
        </div>
      ) : null}

      <div className="library-browser">
        <nav className="library-index" aria-label="Components">
          <p className="library-count" role="status">
            {displayPieces.length}{' '}
            {displayPieces.length === 1 ? 'component' : 'components'}
          </p>
          <ul className="library-piece-list">
            {displayPieces.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  aria-pressed={item.id === piece?.id}
                  onClick={() => setSelected(item.id)}
                >
                  {item.name}
                </button>
              </li>
            ))}
          </ul>
        </nav>
        {piece ? (
          <section className="library-detail" aria-label={piece.name}>
            <header className="library-detail-head">
              <div>
                <h3>{piece.name}</h3>
                <p>{piece.description}</p>
              </div>
              <div className="component-btn-group">
                {replaceTag.trim() && (
                  <button
                    className="button replace-comp-btn"
                    type="button"
                    onClick={() => void add(piece.id, piece.name, 'replace')}
                    disabled={!site || !pages.length || busy !== null}
                  >
                    Replace on page
                  </button>
                )}
                <button
                  className="button primary add-to-page-btn"
                  type="button"
                  onClick={() => void add(piece.id, piece.name)}
                  disabled={!site || !pages.length || busy !== null}
                >
                  {busy === piece.id ? 'Adding…' : 'Add to page'}
                </button>
              </div>
            </header>
            <div className="library-specimen-toolbar">
              <span>Shown in {piece.directionName}</span>
              <div
                className="library-viewport"
                role="group"
                aria-label="Preview width"
              >
                <button
                  type="button"
                  aria-pressed={!mobile}
                  onClick={() => setMobile(false)}
                >
                  Desktop
                </button>
                <button
                  type="button"
                  aria-pressed={mobile}
                  onClick={() => setMobile(true)}
                >
                  Phone
                </button>
                {piece.id === 'heading-reveal' && (
                  <button
                    type="button"
                    onClick={() => setReplay((value) => value + 1)}
                  >
                    Replay reveal
                  </button>
                )}
              </div>
            </div>
            <div
              className={`library-canvas${mobile ? ' library-canvas-phone' : ''}`}
            >
              <LibrarySpecimen
                key={`${piece.id}-${replay}`}
                html={piece.previewHtml}
                title={`${piece.name} preview`}
                width={mobile ? 375 : 960}
                height={mobile ? 570 : 520}
              />
            </div>
            <details className="library-source">
              <summary>Source and licence</summary>
              <p>
                {piece.source}. {piece.licence}
              </p>
            </details>
          </section>
        ) : (
          <p className="library-empty">
            {!pieces.length && !message
              ? 'Loading the library…'
              : 'No components match this search.'}
          </p>
        )}
      </div>

      <details className="links-shelf-section">
        <summary>Design references · {links.length} sources</summary>
        <p>
          Browse the originals. These are reference links and aren’t copied into
          your site.
        </p>
        <ul className="library-reference-list">
          {links.map((link) => (
            <li key={link.url}>
              <a href={link.url} target="_blank" rel="noreferrer">
                {link.name} <span aria-hidden="true">↗</span>
              </a>
              <span>{link.why}</span>
            </li>
          ))}
        </ul>
      </details>
    </div>
  );
}
