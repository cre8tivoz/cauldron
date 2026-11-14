import { useEffect, useState } from 'react';
import { ChevronDownIcon } from './Icons';

type Props = {
  site: CauldronSite | null;
  onBack: () => void;
};

const CATEGORIES = [
  'Featured 5',
  'Navigation',
  'Heroes',
  'Services',
  'Proof & Testimonials',
  'Contact & FAQ',
  'Footers',
];

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
  const [category, setCategory] = useState('Featured 5');

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
    const result = await window.cauldron.addPiece({
      pieceId,
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
    const fileNote = result.componentFile ? ` (${result.componentFile})` : '';
    setMessage(
      result.reusedExisting
        ? `${pieceName} already existed in the site${fileNote}, so the existing file was kept and placed on ${result.page}.`
        : `${pieceName} was copied into the site${fileNote} and placed on ${result.page}.`,
      true,
    );
  };

  const pieceList = pieces ?? [];
  const filteredPieces =
    category === 'Featured 5'
      ? pieceList.slice(0, 5)
      : pieceList.filter((p) => {
          const cat = (p.category || '').toLowerCase();
          const target = category.toLowerCase();
          if (cat === target || cat.includes(target)) return true;
          if (
            target === 'proof & testimonials' &&
            (cat.includes('proof') || cat.includes('testimonial'))
          )
            return true;
          if (
            target === 'contact & faq' &&
            (cat.includes('contact') || cat.includes('faq'))
          )
            return true;
          if (
            target === 'footers' &&
            (cat.includes('footer') || cat === 'footer')
          )
            return true;
          if (target === 'navigation' && cat.includes('nav')) return true;
          if (target === 'heroes' && cat.includes('hero')) return true;
          if (
            target === 'services' &&
            (cat.includes('service') || cat.includes('menu'))
          )
            return true;
          return false;
        });

  const displayPieces = filteredPieces;

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
            {pieceList.length} piece{pieceList.length === 1 ? '' : 's'}, plain
            Astro, built on the site's design direction.
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
        {CATEGORIES.map((cat) => (
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

      {/* Component Replacement and Undo Bar */}
      <div className="library-controls-bar">
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

      {/* 3-Column Visual Component Cards Grid */}
      <div className="library-component-grid">
        {displayPieces.map((piece) => {
          const isBusy = busy === piece.id;

          return (
            <div key={piece.id} className="component-visual-card">
              {/* Top Zone — Live Direction-Styled Preview Stage */}
              <div className="component-preview-stage">
                <iframe
                  className="component-preview-frame"
                  title={`${piece.name} preview`}
                  srcDoc={piece.previewHtml}
                  sandbox=""
                  tabIndex={-1}
                />
              </div>

              {/* Bottom Zone — Dark/Contrasting Card Footer */}
              <div className="component-card-footer">
                <strong className="component-name">{piece.name}</strong>
                <p className="component-description">{piece.description}</p>

                <div className="component-actions-bar">
                  <span className="component-licence-badge">
                    {piece.licence}
                  </span>
                  <div className="component-btn-group">
                    {replaceTag.trim() ? (
                      <button
                        className="button replace-comp-btn"
                        type="button"
                        onClick={() =>
                          void add(piece.id, piece.name, 'replace')
                        }
                        disabled={!site || busy !== null}
                      >
                        Replace {replaceTag.trim()}
                      </button>
                    ) : null}
                    <button
                      className="button primary add-to-page-btn"
                      type="button"
                      onClick={() => void add(piece.id, piece.name, 'add')}
                      disabled={!site || isBusy}
                    >
                      {isBusy ? 'Adding…' : `Add to ${page}`}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Polished Horizontal Links Shelf Footer matching mockup */}
      <div className="links-shelf-section">
        <div className="links-shelf-header">
          <h3 className="links-shelf-title">Links shelf — ideas, not code</h3>
          <p className="links-shelf-subtitle">
            References only; these are not copied into your site.
          </p>
        </div>

        <div className="links-shelf-row">
          {links.map((link, index, arr) => (
            <span key={link.name} className="link-shelf-item">
              <a
                href={link.url}
                target="_blank"
                rel="noreferrer"
                className="link-shelf-anchor"
              >
                {link.name}
              </a>
              {index < arr.length - 1 ? (
                <span className="link-divider" aria-hidden="true">
                  |
                </span>
              ) : null}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
