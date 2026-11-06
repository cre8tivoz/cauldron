import { useState } from 'react';

type Props = {
  site: CauldronSite | null;
  running: boolean;
  picking: boolean;
  busy: boolean;
  canUndo: boolean;
  canRedo: boolean;
  onOpen: () => void;
  onTogglePreview: () => void;
  onReload: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onTogglePick: () => void;
  onNewPage: (page: { path: string; title: string }) => void;
};

export function TopBar({
  site,
  running,
  picking,
  busy,
  canUndo,
  canRedo,
  onOpen,
  onTogglePreview,
  onReload,
  onUndo,
  onRedo,
  onTogglePick,
  onNewPage,
}: Props) {
  const [makingPage, setMakingPage] = useState(false);
  const [pagePath, setPagePath] = useState('');
  const [pageTitle, setPageTitle] = useState('');

  const addPage = () => {
    if (pagePath.trim() === '') return;
    onNewPage({ path: pagePath.trim(), title: pageTitle.trim() });
    setMakingPage(false);
    setPagePath('');
    setPageTitle('');
  };

  return (
    <div className="topbar">
      {site ? (
        <>
          <span className="site-name">{site.name}</span>
          <span className="site-meta">
            Astro {site.astroVersion} · {site.packageManager}
          </span>
        </>
      ) : (
        <span className="site-meta">No site open</span>
      )}

      <span className="spacer" />

      {makingPage ? (
        <>
          <input
            className="field"
            style={{ height: 26, width: 140 }}
            placeholder="about"
            value={pagePath}
            onChange={(event) => setPagePath(event.target.value)}
            aria-label="Page address"
          />
          <input
            className="field"
            style={{ height: 26, width: 160 }}
            placeholder="Page title"
            value={pageTitle}
            onChange={(event) => setPageTitle(event.target.value)}
            aria-label="Page title"
          />
          <button className="button primary" type="button" onClick={addPage}>
            Add page
          </button>
          <button
            className="button quiet"
            type="button"
            onClick={() => setMakingPage(false)}
          >
            Cancel
          </button>
        </>
      ) : (
        <button
          className="button quiet"
          type="button"
          onClick={() => setMakingPage(true)}
          disabled={!site}
        >
          New page
        </button>
      )}

      <button
        className="button"
        type="button"
        onClick={onUndo}
        disabled={!canUndo}
        title="Undo (⌘Z)"
      >
        Undo
      </button>
      <button
        className="button"
        type="button"
        onClick={onRedo}
        disabled={!canRedo}
        title="Redo (⇧⌘Z)"
      >
        Redo
      </button>

      <button
        className="button"
        type="button"
        onClick={onTogglePick}
        aria-pressed={picking}
        title="Click an element in the preview to edit it"
      >
        {picking ? 'Selecting' : 'Select'}
      </button>

      <button
        className="button"
        type="button"
        onClick={onReload}
        disabled={!running}
      >
        Reload
      </button>
      <button
        className="button"
        type="button"
        onClick={onTogglePreview}
        disabled={!site || busy}
      >
        {running ? 'Stop preview' : 'Start preview'}
      </button>
      <button
        className="button primary"
        type="button"
        onClick={onOpen}
        disabled={busy}
      >
        Open site
      </button>
    </div>
  );
}
