import { useCallback, useEffect, useRef, useState } from 'react';
import { TopBar } from './components/TopBar';
import { AgentPanel } from './components/AgentPanel';
import { Inspector } from './components/Inspector';
import { PreviewStage } from './components/PreviewStage';
import { Splitter } from './components/Splitter';
import { StatusBar } from './components/StatusBar';
import { DesignPanel } from './components/DesignPanel';
import { ContentPanel } from './components/ContentPanel';
import { LibraryPanel } from './components/LibraryPanel';
import { QualityPanel } from './components/QualityPanel';
import { PublishPanel } from './components/PublishPanel';

type PreviewState = { running: boolean; url: string | null };

const AGENT_MIN = 320;
const AGENT_MAX = 620;
const INSPECTOR_MIN = 260;
const INSPECTOR_MAX = 460;

export function App() {
  const [site, setSite] = useState<CauldronSite | null>(null);
  const [preview, setPreview] = useState<PreviewState>({
    running: false,
    url: null,
  });
  const [selection, setSelection] = useState<CauldronSelection | null>(null);
  const [drafts, setDrafts] = useState<CauldronDraft[]>([]);
  const [status, setStatus] = useState('Ready');
  const [problem, setProblem] = useState<string | null>(null);
  const [conflict, setConflict] = useState<{
    file: string;
    reason: string;
    operation: unknown;
  } | null>(null);
  const [picking, setPicking] = useState(true);
  const [view, setView] = useState<
    'build' | 'design' | 'content' | 'library' | 'quality' | 'publish'
  >('build');
  const [direction, setDirection] = useState<CauldronDirectionSummary | null>(
    null,
  );
  const [busy, setBusy] = useState(false);
  const [agentWidth, setAgentWidth] = useState(400);
  const [inspectorWidth, setInspectorWidth] = useState(300);
  const [agentCollapsed, setAgentCollapsed] = useState(false);
  const [inspectorCollapsed, setInspectorCollapsed] = useState(false);

  const stageRef = useRef<HTMLDivElement | null>(null);
  const draftTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const draftValues = useRef<Map<string, CauldronDraft>>(new Map());

  // Load whatever the app already knows, then follow it.
  useEffect(() => {
    void window.cauldron.direction().then(setDirection);

    void window.cauldron.state().then((state) => {
      setSite(state.site);
      setPreview({ running: state.running, url: state.url });
      setSelection(state.selection);
      setDrafts(state.drafts);
      if (state.status.length > 0)
        setStatus(state.status[state.status.length - 1]);
    });

    const offSite = window.cauldron.on('cauldron:site', (payload: never) => {
      const next = payload as {
        site: CauldronSite | null;
        drafts: CauldronDraft[];
      };
      setSite(next.site);
      setDrafts(next.drafts ?? []);
      void window.cauldron.direction().then(setDirection);
      setSelection(null);
      setProblem(null);
      setConflict(null);
    });
    const offPreview = window.cauldron.on(
      'cauldron:preview',
      (payload: never) => {
        const next = payload as PreviewState;
        setPreview(next);
      },
    );
    const offStatus = window.cauldron.on(
      'cauldron:status',
      (payload: never) => {
        setStatus(payload as unknown as string);
      },
    );
    const offSelection = window.cauldron.on(
      'cauldron:selection',
      (payload: never) => {
        setSelection(payload as unknown as CauldronSelection | null);
      },
    );
    const offDrafts = window.cauldron.on(
      'cauldron:drafts',
      (payload: never) => {
        const next = payload as { drafts: CauldronDraft[] };
        setDrafts(next.drafts ?? []);
      },
    );

    return () => {
      offSite();
      offPreview();
      offStatus();
      offSelection();
      offDrafts();
    };
  }, []);

  // The preview is a separate view laid over the middle column, so it needs the exact rectangle.
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;

    const measure = () => {
      const rect = stage.getBoundingClientRect();
      void window.cauldron.setPreviewBounds({
        x: Math.round(rect.left),
        y: Math.round(rect.top),
        width: Math.round(rect.width),
        height: Math.round(rect.height),
      });
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(stage);
    window.addEventListener('resize', measure);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [agentWidth, inspectorWidth, agentCollapsed, inspectorCollapsed]);

  useEffect(() => {
    void window.cauldron.pickMode(picking);
  }, [picking]);

  // Typed-but-not-saved text is kept outside the site every few seconds (plan item 1.6).
  const queueDraft = useCallback(
    (field: string, value: string) => {
      if (!selection) return;
      const key = `${selection.file}:${selection.line}:${selection.column}:${field}`;
      draftValues.current.set(key, {
        key,
        file: selection.file,
        line: selection.line,
        column: selection.column,
        name: selection.name,
        field,
        value,
        savedAt: Date.now(),
      });
      if (draftTimer.current) clearTimeout(draftTimer.current);
      draftTimer.current = setTimeout(() => {
        void window.cauldron.saveDrafts([...draftValues.current.values()]);
      }, 3000);
    },
    [selection],
  );

  const openSite = useCallback(async () => {
    setBusy(true);
    setProblem(null);
    const result = await window.cauldron.openSiteDialog();
    setBusy(false);
    if ('problem' in result) setProblem(result.problem);
  }, []);

  const togglePreview = useCallback(async () => {
    setBusy(true);
    setProblem(null);
    const result = preview.running
      ? await window.cauldron.stopPreview()
      : await window.cauldron.startPreview();
    setBusy(false);
    if (result && typeof result === 'object' && 'problem' in result) {
      setProblem((result as { problem: string }).problem);
    }
  }, [preview.running]);

  const apply = useCallback(
    async (operation: unknown, run: () => Promise<WriteOutcome>) => {
      setProblem(null);
      const result = await run();
      if (result.ok) {
        setConflict(null);
        if (result.selection) setSelection(result.selection);
        draftValues.current.clear();
        return;
      }
      if (result.conflict) {
        setConflict({ ...result.conflict, operation });
        return;
      }
      setProblem(result.problem ?? 'That change could not be saved.');
    },
    [],
  );

  const applyText = useCallback(
    (value: string) =>
      apply({ kind: 'text', value }, () => window.cauldron.applyText(value)),
    [apply],
  );

  const applyAttribute = useCallback(
    (name: string, value: string | null) =>
      apply({ kind: 'attribute', name, value }, () =>
        window.cauldron.applyAttribute(name, value),
      ),
    [apply],
  );

  const applyStyle = useCallback(
    (properties: Record<string, string>) =>
      apply({ kind: 'style', properties }, () =>
        window.cauldron.applyStyle(properties),
      ),
    [apply],
  );

  const keepMine = useCallback(async () => {
    if (!conflict) return;
    setProblem(null);
    const result = await window.cauldron.forceWrite(conflict.operation);
    if (result.ok) {
      setConflict(null);
      if (result.selection) setSelection(result.selection);
    } else {
      setProblem(result.problem ?? 'That change could not be saved.');
    }
  }, [conflict]);

  const useDisk = useCallback(async () => {
    setConflict(null);
    const next = await window.cauldron.refreshSelection();
    setSelection(next);
  }, []);

  const undo = useCallback(async () => {
    const result = await window.cauldron.undo();
    if (!result.ok) setProblem(result.problem ?? 'Nothing could be undone.');
    setConflict(null);
  }, []);

  const redo = useCallback(async () => {
    const result = await window.cauldron.redo();
    if (!result.ok) setProblem(result.problem ?? 'Nothing could be redone.');
    setConflict(null);
  }, []);

  const newPage = useCallback(async (page: { path: string; title: string }) => {
    const result = await window.cauldron.newPage(page);
    if ('problem' in result) setProblem(result.problem);
  }, []);

  const canUndo = selection?.history.canUndo ?? false;
  const canRedo = selection?.history.canRedo ?? false;

  return (
    <div className="app">
      <nav className="rail" aria-label="Main tools">
        <div className="rail-mark" aria-hidden="true">
          C
        </div>
        <button
          className="rail-button"
          type="button"
          aria-current={view === 'build' ? 'page' : undefined}
          title="Sites"
          onClick={() => setView('build')}
        >
          S
        </button>
        <button
          className="rail-button"
          type="button"
          aria-current={view === 'content' ? 'page' : undefined}
          title="Content"
          onClick={() => setView('content')}
        >
          C
        </button>
        <button
          className="rail-button"
          type="button"
          aria-current={view === 'library' ? 'page' : undefined}
          title="Components"
          onClick={() => setView('library')}
        >
          L
        </button>
        <button
          className="rail-button"
          type="button"
          aria-current={view === 'design' ? 'page' : undefined}
          title="Design directions"
          onClick={() => setView('design')}
        >
          D
        </button>
        <button
          className="rail-button"
          type="button"
          aria-current={view === 'quality' ? 'page' : undefined}
          title="Quality checks"
          onClick={() => setView('quality')}
        >
          Q
        </button>
        <button
          className="rail-button"
          type="button"
          aria-current={view === 'publish' ? 'page' : undefined}
          title="Publishing"
          onClick={() => setView('publish')}
        >
          P
        </button>
      </nav>

      <div className="workspace">
        <TopBar
          site={site}
          running={preview.running}
          picking={picking}
          busy={busy}
          canUndo={canUndo}
          canRedo={canRedo}
          onOpen={openSite}
          onTogglePreview={togglePreview}
          onReload={() => void window.cauldron.reloadPreview()}
          onUndo={undo}
          onRedo={redo}
          onTogglePick={() => setPicking((current) => !current)}
          onNewPage={newPage}
        />

        {drafts.length > 0 ? (
          <div
            className="notice"
            role="status"
            style={{ margin: '8px 12px 0' }}
          >
            <strong>Unsaved edits from last time.</strong> {drafts.length}{' '}
            change
            {drafts.length === 1 ? '' : 's'} were being typed when Cauldron last
            stopped.
            <div className="notice-actions">
              <button
                className="button primary"
                type="button"
                onClick={async () => {
                  const [first] = drafts;
                  const result = await window.cauldron.restoreDraft(first);
                  if (!result.ok)
                    setProblem(
                      result.problem ?? 'That draft could not be restored.',
                    );
                  const next = await window.cauldron.refreshSelection();
                  setSelection(next);
                }}
              >
                Restore the first one
              </button>
              <button
                className="button"
                type="button"
                onClick={() => {
                  void window.cauldron.discardDrafts();
                  setDrafts([]);
                }}
              >
                Discard them
              </button>
            </div>
          </div>
        ) : null}

        {view === 'publish' ? (
          <div className="panes">
            <PublishPanel site={site} onBack={() => setView('build')} />
          </div>
        ) : view === 'quality' ? (
          <div className="panes">
            <QualityPanel
              site={site}
              direction={direction}
              onBack={() => setView('build')}
              onOpenDesign={() => setView('design')}
            />
          </div>
        ) : view === 'library' ? (
          <div className="panes">
            <LibraryPanel site={site} onBack={() => setView('build')} />
          </div>
        ) : view === 'content' ? (
          <div className="panes">
            <ContentPanel site={site} onBack={() => setView('build')} />
          </div>
        ) : view === 'design' ? (
          <div className="panes">
            <DesignPanel
              site={site}
              current={direction}
              onChosen={(chosen) => {
                setDirection(chosen);
                setView('build');
              }}
              onBack={() => setView('build')}
            />
          </div>
        ) : (
          <div className="panes">
            {agentCollapsed ? null : (
              <>
                <div
                  className="agent-pane"
                  style={{ width: agentWidth, flex: `0 0 ${agentWidth}px` }}
                >
                  <AgentPanel
                    site={site}
                    direction={direction}
                    onOpenDesign={() => setView('design')}
                  />
                </div>
                <Splitter
                  label="Resize agent column"
                  onResize={(delta) =>
                    setAgentWidth((width) =>
                      Math.min(AGENT_MAX, Math.max(AGENT_MIN, width + delta)),
                    )
                  }
                />
              </>
            )}

            <PreviewStage
              stageRef={stageRef}
              site={site}
              running={preview.running}
              onOpen={openSite}
            />

            {inspectorCollapsed ? null : (
              <>
                <Splitter
                  label="Resize element panel"
                  onResize={(delta) =>
                    setInspectorWidth((width) =>
                      Math.min(
                        INSPECTOR_MAX,
                        Math.max(INSPECTOR_MIN, width - delta),
                      ),
                    )
                  }
                />
                <div
                  className="inspector-pane"
                  style={{
                    width: inspectorWidth,
                    flex: `0 0 ${inspectorWidth}px`,
                  }}
                >
                  <Inspector
                    selection={selection}
                    problem={problem}
                    conflict={conflict}
                    onApplyText={applyText}
                    onApplyAttribute={applyAttribute}
                    onApplyStyle={applyStyle}
                    onKeepMine={keepMine}
                    onUseDisk={useDisk}
                    onDraft={queueDraft}
                  />
                </div>
              </>
            )}
          </div>
        )}

        <div
          className="topbar"
          style={{ height: 30, flex: '0 0 30px', gap: 6 }}
        >
          <button
            className="button quiet"
            type="button"
            onClick={() => setAgentCollapsed((value) => !value)}
            aria-pressed={!agentCollapsed}
          >
            Agent {agentCollapsed ? '▸' : '◂'}
          </button>
          <span className="spacer" />
          <button
            className="button quiet"
            type="button"
            onClick={() => setInspectorCollapsed((value) => !value)}
            aria-pressed={!inspectorCollapsed}
          >
            Element {inspectorCollapsed ? '◂' : '▸'}
          </button>
        </div>

        <StatusBar
          message={
            drafts.length > 0
              ? `${status} · ${drafts.length} unsaved draft(s)`
              : status
          }
          url={preview.url}
          running={preview.running}
        />
      </div>
    </div>
  );
}
