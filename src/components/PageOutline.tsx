import { useCallback, useEffect, useRef, useState } from 'react';

type Props = {
  site: CauldronSite | null;
  currentPage?: string;
  onNavigateToLibrary?: (targetPage: string) => void;
};

const QUICK_SECTION_PIECES: ReadonlyArray<{ id: string; label: string }> = [
  { id: 'editorial-intro', label: 'Editorial intro' },
  { id: 'split-editorial-hero', label: 'Split hero' },
  { id: 'trade-bento-grid', label: 'Bento grid' },
  { id: 'studio-contact-hours', label: 'Contact & hours' },
];

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
  const [canUndo, setCanUndo] = useState(false);
  const [currentHash, setCurrentHash] = useState<string | null>(null);
  const [insertingAtIndex, setInsertingAtIndex] = useState<number | null>(null);
  const [quickPieces, setQuickPieces] =
    useState<ReadonlyArray<{ id: string; label: string }>>(
      QUICK_SECTION_PIECES,
    );

  const pageRef = useRef<string>(page);
  pageRef.current = page;

  useEffect(() => {
    void window.cauldron
      .library()
      .then((res) => {
        const available = new Set(
          res.pieces.filter((p) => p.codeAllowed).map((p) => p.id),
        );
        const filtered = QUICK_SECTION_PIECES.filter((item) =>
          available.has(item.id),
        );
        if (filtered.length > 0) setQuickPieces(filtered);
      })
      .catch((error) => {
        console.error('Could not load library pieces for outline:', error);
        setMessage(
          `Could not load library pieces: ${error instanceof Error ? error.message : String(error)}`,
        );
      });
  }, []);

  const loadSections = useCallback(async (targetPage: string) => {
    setLoading(true);
    setMessage(null);
    try {
      const res = await window.cauldron.pageSections(targetPage);
      if (res.ok && res.sections) {
        setSections(res.sections);
        setCurrentHash(res.hash ?? null);
      } else {
        setMessage(res.problem ?? 'Could not read page sections.');
      }
    } catch (e) {
      setMessage(String(e));
    } finally {
      setLoading(false);
    }
  }, []);

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
      .catch((error) => {
        console.error('Could not list pages for outline:', error);
        setMessage(
          `Could not list pages: ${error instanceof Error ? error.message : String(error)}`,
        );
      });
  }, [site?.root]);

  useEffect(() => {
    void window.cauldron
      .state()
      .then((s) => setCanUndo(s.history?.canUndo ?? false));
    const offHistory = window.cauldron.on(
      'cauldron:history',
      (payload: never) => {
        const next = payload as { canUndo: boolean; canRedo: boolean };
        setCanUndo(next.canUndo);
        if (pageRef.current) void loadSections(pageRef.current);
      },
    );
    return () => offHistory();
  }, [loadSections]);

  useEffect(() => {
    if (page) {
      void loadSections(page);
    }
  }, [loadSections, page, site?.root]);

  const updateAfterMutation = async (res: {
    ok: boolean;
    file?: string;
    hash?: string;
    sections?: CauldronPageSection[];
    problem?: string;
  }) => {
    if (res.ok && res.sections) {
      setSections(res.sections);
      if (res.hash) setCurrentHash(res.hash);
    } else {
      setMessage(res.problem ?? 'Action failed.');
    }
  };

  const runOutlineEdit = async (
    action: (baseHash: string) => Promise<{
      ok: boolean;
      file?: string;
      hash?: string;
      sections?: CauldronPageSection[];
      problem?: string;
    }>,
  ): Promise<boolean> => {
    if (!currentHash) {
      setMessage('Read the page before editing.');
      return false;
    }
    setLoading(true);
    setMessage(null);
    try {
      const res = await action(currentHash);
      await updateAfterMutation(res);
      return res.ok;
    } catch (e) {
      setMessage(String(e));
      return false;
    } finally {
      setLoading(false);
    }
  };

  const undo = async () => {
    if (!canUndo || loading) return;
    setLoading(true);
    setMessage(null);
    try {
      const res = await window.cauldron.undo();
      if (!res.ok) setMessage(res.problem ?? 'Nothing could be undone.');
    } catch (e) {
      setMessage(String(e));
    } finally {
      setLoading(false);
    }
  };

  const move = async (fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= sections.length) return;
    await runOutlineEdit((baseHash) =>
      window.cauldron.reorderPageSections({
        page,
        fromIndex,
        toIndex,
        baseHash,
      }),
    );
  };

  const remove = async (sectionIndex: number) => {
    if (
      !confirm(
        `Remove "${sections[sectionIndex]?.name}" from this page? You can undo with ⤺ Undo or ⌘Z.`,
      )
    )
      return;
    await runOutlineEdit((baseHash) =>
      window.cauldron.deletePageSection({
        page,
        sectionIndex,
        baseHash,
      }),
    );
  };

  const duplicate = async (sectionIndex: number) => {
    await runOutlineEdit((baseHash) =>
      window.cauldron.duplicatePageSection({
        page,
        sectionIndex,
        baseHash,
      }),
    );
  };

  const insert = async (afterIndex: number, pieceId: string) => {
    setInsertingAtIndex(null);
    await runOutlineEdit((baseHash) =>
      window.cauldron.insertPageSection({
        page,
        afterIndex,
        pieceId,
        baseHash,
      }),
    );
  };

  const saveAnchor = async (sectionIndex: number) => {
    const ok = await runOutlineEdit((baseHash) =>
      window.cauldron.setPageSectionAnchor({
        page,
        sectionIndex,
        anchorId: anchorValue.trim(),
        baseHash,
      }),
    );
    if (ok) setEditingAnchorIndex(null);
  };

  const renderInsertDivider = (slotIndex: number) => {
    const isInserting = insertingAtIndex === slotIndex;

    if (isInserting) {
      return (
        <div
          key={`insert-box-${slotIndex}`}
          style={{
            padding: '8px 10px',
            borderRadius: 4,
            background: 'rgba(255,255,255,0.04)',
            border: '1px dashed var(--accent, #3182ce)',
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
            margin: '4px 0',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <span style={{ fontSize: 11, fontWeight: 600 }}>
              Insert section{' '}
              {slotIndex === -1
                ? 'at top'
                : `after ${sections[slotIndex]?.name || 'section'}`}
            </span>
            <button
              type="button"
              onClick={() => setInsertingAtIndex(null)}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--muted)',
                cursor: 'pointer',
                fontSize: 11,
                padding: 2,
              }}
            >
              ✕
            </button>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {quickPieces.map((piece) => (
              <button
                key={piece.id}
                type="button"
                className="button"
                style={{ fontSize: 10, padding: '3px 8px' }}
                onClick={() => void insert(slotIndex, piece.id)}
              >
                {piece.label}
              </button>
            ))}
            {onNavigateToLibrary && (
              <button
                type="button"
                className="button"
                style={{ fontSize: 10, padding: '3px 8px' }}
                onClick={() => {
                  setInsertingAtIndex(null);
                  onNavigateToLibrary(page);
                }}
              >
                From library…
              </button>
            )}
          </div>
        </div>
      );
    }

    return (
      <div
        key={`insert-chip-${slotIndex}`}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '2px 0',
        }}
      >
        <button
          type="button"
          onClick={() => setInsertingAtIndex(slotIndex)}
          style={{
            background: 'transparent',
            border: '1px dashed var(--hairline)',
            borderRadius: 12,
            padding: '2px 10px',
            fontSize: 10,
            color: 'var(--muted)',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            transition: 'all 0.15s ease',
          }}
          title="Add section here"
        >
          <span>＋</span>
          <span>Add section here</span>
        </button>
      </div>
    );
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
          <button
            type="button"
            title="Undo last change (⌘Z)"
            disabled={!canUndo || loading}
            onClick={() => void undo()}
            style={{
              background: 'transparent',
              border: '1px solid var(--hairline)',
              borderRadius: 4,
              color: !canUndo ? 'var(--muted)' : 'inherit',
              cursor: !canUndo ? 'default' : 'pointer',
              padding: '2px 6px',
              fontSize: 11,
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              opacity: !canUndo ? 0.4 : 1,
              marginLeft: 4,
            }}
          >
            <span>⤺</span>
            <span>Undo</span>
          </button>
        </div>
        {pages.length > 1 && (
          <select
            value={page}
            onChange={(e) => {
              setPage(e.target.value);
            }}
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

      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {renderInsertDivider(-1)}

        {sections.length === 0 ? (
          <p
            className="hint"
            style={{ fontSize: 11, margin: 0, fontStyle: 'italic', padding: 8 }}
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
                  flexDirection: 'column',
                  gap: 4,
                }}
              >
                <div
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
                      title="Duplicate section"
                      aria-label="Duplicate section"
                      disabled={loading}
                      onClick={() => void duplicate(idx)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--muted)',
                        cursor: 'pointer',
                        padding: '2px 4px',
                        fontSize: 11,
                      }}
                    >
                      ⧉
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
                </div>

                {isEditingAnchor && (
                  <div
                    style={{
                      display: 'flex',
                      gap: 4,
                      marginTop: 2,
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

                {renderInsertDivider(idx)}
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
