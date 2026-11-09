import { useState } from 'react';
import {
  ChevronDownIcon,
  NewPageIcon,
  OpenSiteIcon,
  PlayIcon,
  RedoIcon,
  ReloadIcon,
  SelectIcon,
  StopIcon,
  UndoIcon,
} from './Icons';

type Props = {
  site: CauldronSite | null;
  running: boolean;
  picking: boolean;
  busy: boolean;
  canUndo: boolean;
  canRedo: boolean;
  onOpen: () => void;
  onProjects: () => void;
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
  onProjects,
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
    <header className="topbar" aria-label="Application toolbar">
      <div className="topbar-left">
        <button
          className="topbar-project-btn"
          type="button"
          onClick={onProjects}
          title="Project home"
        >
          <span className="site-name">{site ? site.name : 'Sunday Table'}</span>
          <ChevronDownIcon size={12} />
        </button>

        {site ? (
          <span className="site-meta-badge">
            Astro {site.astroVersion} · {site.packageManager}
          </span>
        ) : (
          <span className="site-meta-badge">No site open</span>
        )}

        <button
          className="button quiet topbar-projects-link"
          type="button"
          onClick={onProjects}
          title="Project home"
        >
          Projects
        </button>
      </div>

      <span className="spacer" />

      <div className="topbar-right">
        {makingPage ? (
          <div className="topbar-page-form">
            <input
              className="field"
              style={{ height: 28, width: 140, margin: 0 }}
              placeholder="about"
              value={pagePath}
              onChange={(event) => setPagePath(event.target.value)}
              aria-label="Page address"
            />
            <input
              className="field"
              style={{ height: 28, width: 160, margin: 0 }}
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
          </div>
        ) : (
          <button
            className="button"
            type="button"
            onClick={() => setMakingPage(true)}
            disabled={!site}
          >
            <NewPageIcon size={14} />
            <span>New page</span>
          </button>
        )}

        <div className="button-group">
          <button
            className="button icon-btn"
            type="button"
            onClick={onUndo}
            disabled={!canUndo}
            title="Undo (⌘Z)"
            aria-label="Undo"
          >
            <UndoIcon size={14} />
          </button>
          <button
            className="button icon-btn"
            type="button"
            onClick={onRedo}
            disabled={!canRedo}
            title="Redo (⇧⌘Z)"
            aria-label="Redo"
          >
            <RedoIcon size={14} />
          </button>
        </div>

        <button
          className={`button ${picking ? 'active-tool' : ''}`}
          type="button"
          onClick={onTogglePick}
          aria-pressed={picking}
          title="Click an element in the preview to edit it"
        >
          <SelectIcon size={13} />
          <span>{picking ? 'Selecting' : 'Select'}</span>
        </button>

        <button
          className="button"
          type="button"
          onClick={onReload}
          disabled={!running}
        >
          <ReloadIcon size={14} />
          <span>Reload</span>
        </button>

        <button
          className="button"
          type="button"
          onClick={onTogglePreview}
          disabled={!site || busy}
        >
          {running ? <StopIcon size={12} /> : <PlayIcon size={12} />}
          <span>{running ? 'Stop preview' : 'Start preview'}</span>
        </button>

        <button
          className="button primary open-site-btn"
          type="button"
          onClick={onOpen}
          disabled={busy}
        >
          <OpenSiteIcon size={13} />
          <span>Open site</span>
        </button>
      </div>
    </header>
  );
}
