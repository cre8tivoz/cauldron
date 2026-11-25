import {
  ChevronDownIcon,
  OpenSiteIcon,
  PanelLeftIcon,
  PanelRightIcon,
  PublishingIcon,
  RedoIcon,
  SelectIcon,
  UndoIcon,
} from './Icons';

export type WorkspaceView =
  | 'projects'
  | 'build'
  | 'design'
  | 'content'
  | 'seo'
  | 'library'
  | 'quality'
  | 'publish';

type Props = {
  site: CauldronSite | null;
  view: WorkspaceView;
  picking: boolean;
  busy: boolean;
  canUndo: boolean;
  canRedo: boolean;
  agentCollapsed: boolean;
  inspectorCollapsed: boolean;
  onOpen: () => void;
  onProjects: () => void;
  onPublish: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onTogglePick: () => void;
  onToggleAgent: () => void;
  onToggleInspector: () => void;
};

export function TopBar({
  site,
  view,
  picking,
  busy,
  canUndo,
  canRedo,
  agentCollapsed,
  inspectorCollapsed,
  onOpen,
  onProjects,
  onPublish,
  onUndo,
  onRedo,
  onTogglePick,
  onToggleAgent,
  onToggleInspector,
}: Props) {
  const showAgentToggle = view === 'build' || view === 'quality';
  const showInspectorToggle = view === 'build';

  return (
    <header className="topbar" aria-label="Application toolbar">
      <div className="topbar-left">
        <button
          className="topbar-project-btn"
          type="button"
          onClick={onProjects}
          title="Switch project"
        >
          <span className="site-name">{site ? site.name : 'No site open'}</span>
          <ChevronDownIcon size={12} />
        </button>

        {site ? (
          <span className="site-meta-badge">
            Astro {site.astroVersion} · {site.packageManager}
          </span>
        ) : null}
      </div>

      <span className="spacer" />

      <div className="topbar-right">
        {showAgentToggle || showInspectorToggle ? (
          <div
            className="button-group"
            role="group"
            aria-label="Workspace panels"
          >
            {showAgentToggle ? (
              <button
                className="button quiet panel-toggle-btn"
                type="button"
                onClick={onToggleAgent}
                aria-pressed={!agentCollapsed}
                title={agentCollapsed ? 'Show Agent panel' : 'Hide Agent panel'}
              >
                <PanelLeftIcon size={14} />
                <span>Agent</span>
              </button>
            ) : null}
            {showInspectorToggle ? (
              <button
                className="button quiet panel-toggle-btn"
                type="button"
                onClick={onToggleInspector}
                aria-pressed={!inspectorCollapsed}
                title={
                  inspectorCollapsed
                    ? 'Show Element panel'
                    : 'Hide Element panel'
                }
              >
                <PanelRightIcon size={14} />
                <span>Element</span>
              </button>
            ) : null}
          </div>
        ) : null}

        {site ? (
          <div className="button-group" role="group" aria-label="History">
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
        ) : null}

        {site && view === 'build' ? (
          <button
            className={`button ${picking ? 'active-tool' : ''}`}
            type="button"
            onClick={onTogglePick}
            aria-pressed={picking}
            title="Click an element in the preview to edit it"
          >
            <SelectIcon size={13} />
            <span>Select</span>
          </button>
        ) : null}

        {site ? (
          <button
            className="button primary publish-cta-btn"
            type="button"
            onClick={onPublish}
            aria-current={view === 'publish' ? 'page' : undefined}
          >
            <PublishingIcon size={14} />
            <span>Publish</span>
          </button>
        ) : (
          <button
            className="button primary open-site-btn"
            type="button"
            onClick={onOpen}
            disabled={busy}
          >
            <OpenSiteIcon size={13} />
            <span>Open site</span>
          </button>
        )}
      </div>
    </header>
  );
}
