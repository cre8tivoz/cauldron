import { useEffect, useState } from 'react';

type Props = {
  site: CauldronSite | null;
  currentPage?: string;
  onNavigateToLibrary?: (targetPage: string) => void;
};

export function PageOutline({
  site,
  currentPage = '/',
  onNavigateToLibrary,
}: Props) {
  const [page, setPage] = useState(currentPage);
  const [pages, setPages] = useState<Array<{ page: string; file: string }>>([]);
  const [sections, setSections] = useState<CauldronPageSection[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingAnchorIndex, setEditingAnchorIndex] = useState<number | null>(
    null,
  );
  const [anchorValue, setAnchorValue] = useState('');
  const [message, setMessage] = useState<string | null>(null);

  const loadSections = async (targetPage: string) => {
    setLoading(true);
    setMessage(null);
    try {
      const res = await window.cauldron.pageSections(targetPage);
      if (res.ok && res.sections) {
        setSections(res.sections);
      } else {
        setMessage(res.problem ?? 'Could not read page sections.');
      }
    } catch (e) {
      setMessage(String(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    window.cauldron
      .runAction({ action: 'listPages' })
      .then((res) => {
        const listed = res as {
          pages?: Array<{ page: string; file: string }>;
        };
        if (listed.pages) {
          setPages(listed.pages);
        }
      })
      .catch(() => {});
  }, [site?.root]);

  useEffect(() => {
    if (page) {
      void loadSections(page);
    }
  }, [page, site?.root]);

  const move = async (fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= sections.length) return;
    setLoading(true);
    try {
      const res = await window.cauldron.reorderPageSections({
        page,
        fromIndex,
        toIndex,
      });
      if (res.ok && res.sections) {
        setSections(res.sections);
      } else {
        setMessage(res.problem ?? 'Reorder failed.');
      }
    } catch (e) {
      setMessage(String(e));
    } finally {
      setLoading(false);
    }
  };

  const remove = async (sectionIndex: number) => {
    if (
      !confirm(
        `Remove "${sections[sectionIndex]?.name}" from this page? You can undo with ⌘Z.`,
      )
    )
      return;
    setLoading(true);
    try {
      const res = await window.cauldron.deletePageSection({
        page,
        sectionIndex,
      });
      if (res.ok && res.sections) {
        setSections(res.sections);
      } else {
        setMessage(res.problem ?? 'Delete failed.');
      }
    } catch (e) {
      setMessage(String(e));
    } finally {
      setLoading(false);
    }
  };

  const saveAnchor = async (sectionIndex: number) => {
    setLoading(true);
    try {
      const res = await window.cauldron.setPageSectionAnchor({
        page,
        sectionIndex,
        anchorId: anchorValue.trim(),
      });
      if (res.ok && res.sections) {
        setSections(res.sections);
        setEditingAnchorIndex(null);
      } else {
        setMessage(res.problem ?? 'Setting anchor failed.');
      }
    } catch (e) {
      setMessage(String(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="page-outline-drawer"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        padding: '12px 14px',
        borderBottom: '1px solid var(--hairline)',
        background: 'var(--surface, #1e1e1e)',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: -0.01 }}>
            Page Structure
          </span>
          <span
            style={{
              fontSize: 10,
              padding: '1px 6px',
              borderRadius: 4,
              background: 'rgba(255,255,255,0.08)',
              color: 'var(--muted)',
            }}
          >
            {sections.length} blocks
          </span>
        </div>
        {pages.length > 1 && (
          <select
            value={page}
            onChange={(e) => setPage(e.target.value)}
            style={{
              fontSize: 11,
              padding: '2px 6px',
              borderRadius: 4,
              background: 'var(--bg, #141414)',
              color: 'inherit',
              border: '1px solid var(--hairline)',
            }}
          >
            {pages.map((p) => (
              <option key={p.page} value={p.page}>
                {p.page}
              </option>
            ))}
          </select>
        )}
      </div>

      {message && (
        <div
          className="notice"
          style={{ fontSize: 11, padding: 6, margin: 0 }}
          role="alert"
        >
          {message}
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {sections.length === 0 ? (
          <p
            className="hint"
            style={{ fontSize: 11, margin: 0, fontStyle: 'italic' }}
          >
            {loading ? 'Reading structure…' : 'No sections detected.'}
          </p>
        ) : (
          sections.map((sec, idx) => {
            const isEditingAnchor = editingAnchorIndex === idx;
            return (
              <div
                key={sec.index}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '6px 8px',
                  borderRadius: 4,
                  background: 'var(--bg, #141414)',
                  border: '1px solid var(--hairline)',
                  fontSize: 12,
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    minWidth: 0,
                    flex: 1,
                  }}
                >
                  <span
                    style={{
                      color: 'var(--muted)',
                      fontSize: 10,
                      cursor: 'grab',
                    }}
                  >
                    ☰
                  </span>
                  <div style={{ minWidth: 0 }}>
                    <div
                      style={{
                        fontWeight: 600,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                      }}
                    >
                      <span>{sec.name}</span>
                      {sec.anchorId && (
                        <span
                          style={{
                            fontSize: 10,
                            color: 'var(--accent)',
                            fontFamily: 'monospace',
                          }}
                        >
                          #{sec.anchorId}
                        </span>
                      )}
                    </div>
                    {sec.preview && (
                      <span
                        style={{
                          fontSize: 10,
                          color: 'var(--muted)',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          display: 'block',
                        }}
                      >
                        {sec.preview}
                      </span>
                    )}
                  </div>
                </div>

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 3,
                    marginLeft: 8,
                  }}
                >
                  <button
                    type="button"
                    title="Move up"
                    disabled={idx === 0 || loading}
                    onClick={() => void move(idx, idx - 1)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: idx === 0 ? 'var(--muted)' : 'inherit',
                      cursor: idx === 0 ? 'default' : 'pointer',
                      padding: '2px 4px',
                      fontSize: 10,
                    }}
                  >
                    ▲
                  </button>
                  <button
                    type="button"
                    title="Move down"
                    disabled={idx === sections.length - 1 || loading}
                    onClick={() => void move(idx, idx + 1)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color:
                        idx === sections.length - 1
                          ? 'var(--muted)'
                          : 'inherit',
                      cursor:
                        idx === sections.length - 1 ? 'default' : 'pointer',
                      padding: '2px 4px',
                      fontSize: 10,
                    }}
                  >
                    ▼
                  </button>
                  <button
                    type="button"
                    title="Set anchor tag"
                    onClick={() => {
                      setEditingAnchorIndex(isEditingAnchor ? null : idx);
                      setAnchorValue(sec.anchorId ?? '');
                    }}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--muted)',
                      cursor: 'pointer',
                      padding: '2px 4px',
                      fontSize: 10,
                    }}
                  >
                    #
                  </button>
                  <button
                    type="button"
                    title="Delete section"
                    disabled={loading}
                    onClick={() => void remove(idx)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--muted)',
                      cursor: 'pointer',
                      padding: '2px 4px',
                      fontSize: 10,
                    }}
                  >
                    ✕
                  </button>
                </div>

                {isEditingAnchor && (
                  <div
                    style={{
                      display: 'flex',
                      gap: 4,
                      marginTop: 4,
                      width: '100%',
                    }}
                  >
                    <input
                      type="text"
                      placeholder="anchor-id (e.g. services)"
                      value={anchorValue}
                      onChange={(e) => setAnchorValue(e.target.value)}
                      style={{
                        flex: 1,
                        fontSize: 11,
                        padding: '2px 6px',
                        borderRadius: 3,
                        border: '1px solid var(--hairline)',
                        background: 'var(--surface)',
                        color: 'inherit',
                      }}
                    />
                    <button
                      type="button"
                      className="button"
                      style={{ fontSize: 10, padding: '2px 6px' }}
                      onClick={() => void saveAnchor(idx)}
                    >
                      Save #
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {onNavigateToLibrary && (
        <button
          type="button"
          onClick={() => onNavigateToLibrary(page)}
          className="button"
          style={{
            fontSize: 11,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            width: '100%',
            marginTop: 4,
          }}
        >
          <span>+ Add component from library</span>
        </button>
      )}
    </div>
  );
}
