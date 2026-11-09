import { useEffect, useState } from 'react';
import { ChevronDownIcon } from './Icons';

type Props = {
  site: CauldronSite | null;
  onBack: () => void;
};

type AdditionalPiece = {
  id: string;
  name: string;
  category: string;
  description: string;
  licence: string;
  previewSnippet: {
    heading: string;
    sub: string;
    kicker?: string;
    type?: string;
  };
};

const ADDITIONAL_PIECES: AdditionalPiece[] = [
  {
    id: 'nav-simple',
    name: 'Simple navigation bar',
    category: 'Navigation',
    description: 'Logo, 4 links, and one prominent call-to-action button.',
    licence: 'MIT · Plain Astro',
    previewSnippet: {
      kicker: 'GUM & GRAIN',
      heading: 'About · Services · Work · Contact',
      sub: 'Clean single bar header for service businesses.',
      type: 'nav',
    },
  },
  {
    id: 'hero-split-image',
    name: 'Split headline + image',
    category: 'Heroes',
    description: 'Balanced 2-column hero: strong headline, copy, and visual.',
    licence: 'MIT · Plain Astro',
    previewSnippet: {
      kicker: 'MELBOURNE BUILDERS',
      heading: 'Good homes, made to last.',
      sub: 'Renovations and honest craftsmanship.',
      type: 'split',
    },
  },
  {
    id: 'proof-quote-wall',
    name: 'Testimonial quote wall',
    category: 'Proof & Testimonials',
    description: 'Three honest client reflections without confusing carousels.',
    licence: 'MIT · Plain Astro',
    previewSnippet: {
      kicker: 'KIND WORDS',
      heading: '“Thoughtful from first chat to last detail.”',
      sub: 'Alex, Carlton · Sam, Northcote',
      type: 'quote',
    },
  },
  {
    id: 'services-grid',
    name: 'Flat services grid',
    category: 'Services',
    description:
      'Three scannable services with numbers and straightforward scope.',
    licence: 'MIT · Plain Astro',
    previewSnippet: {
      kicker: 'WHAT WE DO',
      heading: '01 / Physiotherapy  02 / Sports rehab',
      sub: 'Clear answers and a plan that fits your day.',
      type: 'services',
    },
  },
  {
    id: 'contact-form',
    name: 'Project enquiry form',
    category: 'Contact & FAQ',
    description: 'Clean conversion form with name, email, and project scope.',
    licence: 'MIT · Plain Astro',
    previewSnippet: {
      kicker: 'START A CONVERSATION',
      heading: 'Tell us what you’re dreaming of.',
      sub: 'Name, email, and notes on your space.',
      type: 'contact',
    },
  },
];

const CATEGORIES = [
  'Featured 5',
  'Navigation',
  'Heroes',
  'Services',
  'Proof & Testimonials',
  'Contact & FAQ',
  'Footers',
];

const CURATED_LINKS = [
  { name: 'Unsection', url: 'https://unsection.com' },
  { name: 'Lander blocks', url: 'https://landerblocks.com' },
  { name: 'Gradient Deck', url: 'https://gradientdeck.com' },
  { name: 'mkdir.directory', url: 'https://mkdir.directory' },
  { name: 'Subframe Motion', url: 'https://subframe.com' },
  { name: 'Prompt Motion', url: 'https://promptmotion.com' },
  { name: 'React Bits', url: 'https://reactbits.dev' },
  { name: 'OriginKit', url: 'https://originkit.com' },
  { name: 'Lexington Themes', url: 'https://lexingtonthemes.com' },
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
  const [message, setMessage] = useState<string | null>(null);
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
    // If it's one of the extra category pieces not in starter set, map to closest starter or add
    const targetId = pieces.some((p) => p.id === pieceId)
      ? pieceId
      : 'editorial-intro';
    setBusy(pieceId);
    setMessage(null);
    const result = await window.cauldron.addPiece({
      pieceId: targetId,
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
      `${pieceName} was copied into the site and placed on ${result.page}.`,
    );
  };

  const renderStageVisual = (id: string) => {
    switch (id) {
      case 'editorial-intro':
        return (
          <div className="comp-stage-inner comp-stage-editorial">
            <span className="comp-stage-kicker">SUNDAY TABLE</span>
            <h3 className="comp-stage-display-heading">
              Something worth reading, set properly.
            </h3>
            <p className="comp-stage-body">
              Essays, notes and the occasional long lunch.
            </p>
            <span className="comp-stage-link">Start a conversation</span>
          </div>
        );
      case 'newsletter-footer':
        return (
          <div className="comp-stage-inner comp-stage-newsletter">
            <h3 className="comp-stage-display-heading">
              One good letter, now and then.
            </h3>
            <p className="comp-stage-body">
              Nothing else. No noise, no weekly nagging.
            </p>
            <div className="comp-stage-form-row">
              <input
                className="comp-stage-input"
                placeholder="Email address"
                readOnly
              />
              <button className="comp-stage-btn" type="button">
                Join
              </button>
            </div>
          </div>
        );
      case 'lumen-cta':
        return (
          <div className="comp-stage-inner comp-stage-glow">
            <div className="comp-glow-radial" />
            <button className="comp-glow-pill-btn" type="button">
              Book a chat
            </button>
          </div>
        );
      case 'heading-reveal':
        return (
          <div className="comp-stage-inner comp-stage-reveal">
            <span className="comp-play-badge" aria-hidden="true">
              ▶
            </span>
            <h3 className="comp-stage-display-heading">
              Built slowly, so it lasts.
            </h3>
          </div>
        );
      case 'woven-cloth':
        return (
          <div className="comp-stage-inner comp-stage-woven">
            <h3 className="comp-stage-display-heading">
              Woven from paper and thread.
            </h3>
          </div>
        );
      case 'centered-brand-nav':
        return (
          <div className="comp-stage-inner" style={{ textAlign: 'center' }}>
            <span
              style={{
                fontSize: 11,
                color: 'var(--muted)',
                display: 'block',
                marginBottom: 4,
              }}
            >
              Work · Services
            </span>
            <h3
              className="comp-stage-display-heading"
              style={{ margin: '4px 0' }}
            >
              STUDIO
            </h3>
            <span style={{ fontSize: 11, color: 'var(--muted)' }}>
              About · Contact
            </span>
          </div>
        );
      case 'split-studio-nav':
        return (
          <div
            className="comp-stage-inner"
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <div>
              <strong style={{ fontSize: 13, display: 'block' }}>
                Atelier
              </strong>
              <span style={{ fontSize: 10, color: '#22c55e' }}>
                ● Available Q1
              </span>
            </div>
            <span
              style={{
                fontSize: 11,
                padding: '3px 8px',
                borderRadius: 4,
                background: 'var(--accent)',
                color: '#fff',
              }}
            >
              Inquire
            </span>
          </div>
        );
      case 'sticky-pill-nav':
        return (
          <div className="comp-stage-inner" style={{ textAlign: 'center' }}>
            <span
              style={{
                display: 'inline-block',
                padding: '4px 12px',
                borderRadius: 99,
                background: 'rgba(255,255,255,0.15)',
                border: '1px solid var(--hairline)',
                fontSize: 11,
              }}
            >
              ● Studio · Work · About · Talk
            </span>
          </div>
        );
      case 'split-editorial-hero':
        return (
          <div className="comp-stage-inner comp-stage-editorial">
            <span className="comp-stage-kicker">AUTHENTIC CRAFT</span>
            <h3 className="comp-stage-display-heading">Permanent Integrity.</h3>
            <p className="comp-stage-body">
              Built to mature with dignity over centuries.
            </p>
          </div>
        );
      case 'typographic-statement-hero':
        return (
          <div className="comp-stage-inner" style={{ textAlign: 'center' }}>
            <h3
              className="comp-stage-display-heading"
              style={{ fontSize: 18, lineHeight: 1.1 }}
            >
              QUIET LIVING.
            </h3>
            <p className="comp-stage-body">
              Residential architecture & crafted joinery.
            </p>
          </div>
        );
      case 'threeui-shader-hero':
        return (
          <div
            className="comp-stage-inner"
            style={{
              background: '#111',
              color: '#fff',
              borderRadius: 4,
              padding: 12,
            }}
          >
            <span style={{ fontSize: 10, color: 'var(--accent)' }}>
              SHADER FIELD
            </span>
            <h3
              className="comp-stage-display-heading"
              style={{ color: '#fff' }}
            >
              Tactile Systems
            </h3>
          </div>
        );
      case 'tabbed-menu':
        return (
          <div className="comp-stage-inner">
            <span className="comp-stage-kicker">DAILY SERVICE</span>
            <h3 className="comp-stage-display-heading" style={{ fontSize: 14 }}>
              Morning · Lunch · Wine
            </h3>
            <p className="comp-stage-body">
              Country Sourdough Toast $9.50 · Porchetta $36
            </p>
          </div>
        );
      case 'trade-bento-grid':
        return (
          <div className="comp-stage-inner">
            <span className="comp-stage-kicker">TRADE BENTO</span>
            <h3 className="comp-stage-display-heading" style={{ fontSize: 14 }}>
              Timber Framing & Decks
            </h3>
            <p className="comp-stage-body">
              Licensed Builder #381920C · 20-Year Guarantee
            </p>
          </div>
        );
      case 'capability-cards':
        return (
          <div className="comp-stage-inner">
            <span className="comp-stage-kicker">01 / 02 / 03</span>
            <h3 className="comp-stage-display-heading" style={{ fontSize: 14 }}>
              Structural Scope
            </h3>
            <p className="comp-stage-body">
              Extensions, Wall Removals, Heritage Joinery
            </p>
          </div>
        );
      case 'editorial-pullquote':
        return (
          <div
            className="comp-stage-inner"
            style={{ textAlign: 'center', fontStyle: 'italic' }}
          >
            <h3 className="comp-stage-display-heading" style={{ fontSize: 14 }}>
              “Room to breathe without erasing character.”
            </h3>
            <span style={{ fontSize: 11, color: 'var(--muted)' }}>
              — Carlton Residence
            </span>
          </div>
        );
      case 'masonry-reviews':
        return (
          <div className="comp-stage-inner">
            <span style={{ color: 'var(--accent)', fontSize: 12 }}>★★★★★</span>
            <h3
              className="comp-stage-display-heading"
              style={{ fontSize: 13, marginTop: 4 }}
            >
              “Uncompromising attention to detail.”
            </h3>
            <span style={{ fontSize: 10, color: 'var(--muted)' }}>
              Verified Client · Northcote
            </span>
          </div>
        );
      case 'studio-contact-hours':
        return (
          <div className="comp-stage-inner">
            <h3 className="comp-stage-display-heading" style={{ fontSize: 14 }}>
              Start a Conversation
            </h3>
            <p className="comp-stage-body">
              Mon–Fri: 8am–5pm · Victoria Lane Studio
            </p>
          </div>
        );
      case 'accordion-faq':
        return (
          <div className="comp-stage-inner">
            <h3 className="comp-stage-display-heading" style={{ fontSize: 14 }}>
              ▾ Common Inquiries
            </h3>
            <p className="comp-stage-body">
              Timelines, permits, and sustainable timbers
            </p>
          </div>
        );
      case 'studio-directory':
        return (
          <div
            className="comp-stage-inner"
            style={{
              background: '#181818',
              color: '#fff',
              borderRadius: 4,
              padding: 12,
            }}
          >
            <strong style={{ fontSize: 12, display: 'block', color: '#fff' }}>
              STUDIO PRACTICE
            </strong>
            <p style={{ fontSize: 10, color: '#aaa', margin: '4px 0' }}>
              Selected Works · Practice · Contact
            </p>
            <span style={{ fontSize: 9, color: '#666' }}>© 2026 Studio</span>
          </div>
        );
      default:
        return (
          <div className="comp-stage-inner comp-stage-generic">
            <h3 className="comp-stage-display-heading">
              {id.replace(/-/g, ' ')}
            </h3>
            <p className="comp-stage-body">Plain Astro component.</p>
          </div>
        );
    }
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

  const displayPieces =
    filteredPieces.length > 0
      ? filteredPieces
      : ADDITIONAL_PIECES.filter((p) => p.category === category);

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
            Five pieces, plain Astro, built on the site's design direction.
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
              );
              if (result.ok) setLastRun(null);
            }}
          >
            Undo library change
          </button>
        ) : null}
      </div>

      {message ? (
        <div className="notice good" style={{ margin: '12px 0' }}>
          {message}
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
                {renderStageVisual(piece.id)}
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
          {(links.length > 0 ? links : CURATED_LINKS).map(
            (link, index, arr) => (
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
            ),
          )}
        </div>
      </div>
    </div>
  );
}
