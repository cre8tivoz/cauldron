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
import { ProjectHome } from './components/ProjectHome';
import {
  CauldronMark,
  ComponentsIcon,
  ContentIcon,
  DesignIcon,
  PublishingIcon,
  QualityIcon,
  SitesIcon,
} from './components/Icons';
import {
  DRAFT_SAVE_DELAY_MS,
  clearDraftSchedule,
  noteDraftChange,
  type DraftSchedule,
} from './draft-schedule';

type PreviewState = { running: boolean; url: string | null };

const AGENT_MIN = 320;
const AGENT_MAX = 620;
const INSPECTOR_MIN = 260;
const INSPECTOR_MAX = 460;

export function App() {
  const [site, setSite] = useState<CauldronSite | null>(null);
  const currentSiteRootRef = useRef<string | null>(null);
  const [preview, setPreview] = useState<PreviewState>({
    running: false,
    url: null,
  });
  const [selection, setSelection] = useState<CauldronSelection | null>(null);
  const [drafts, setDrafts] = useState<CauldronDraft[]>([]);
  const [status, setStatus] = useState('Ready');
  const [problem, setProblem] = useState<string | null>(null);
  // Every failure also goes to the console (rule 4).
  useEffect(() => {
    if (problem) console.error(problem);
  }, [problem]);
  const [conflict, setConflict] = useState<{
    file: string;
    reason: string;
    operation: unknown;
  } | null>(null);
  const [picking, setPicking] = useState(true);
  const [view, setView] = useState<
    | 'projects'
    | 'build'
    | 'design'
    | 'content'
    | 'library'
    | 'quality'
    | 'publish'
  >('projects');
  const [direction, setDirection] = useState<CauldronDirectionSummary | null>(
    null,
  );
  const [installingPackages, setInstallingPackages] = useState(false);
  const [installError, setInstallError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [agentWidth, setAgentWidth] = useState(400);
  const [inspectorWidth, setInspectorWidth] = useState(310);
  const [agentCollapsed, setAgentCollapsed] = useState(false);
  const [inspectorCollapsed, setInspectorCollapsed] = useState(false);

  const stageRef = useRef<HTMLDivElement | null>(null);
  const draftTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const draftSchedule = useRef<DraftSchedule>(clearDraftSchedule());
  const draftValues = useRef<Map<string, CauldronDraft>>(new Map());
  // Edits typed in the window that have not reached recovery storage yet, so
  // publishing can refuse them (plan 5.1).
  const [unsavedEdits, setUnsavedEdits] = useState(0);
  const [contentUnsaved, setContentUnsaved] = useState(false);

  // Load whatever the app already knows, then follow it.
  useEffect(() => {
    void window.cauldron.direction().then(setDirection);

    void window.cauldron.state().then((state) => {
      setSite(state.site);
      if (state.site) {
        currentSiteRootRef.current = state.site.root;
      }
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
      const isNewSite =
        Boolean(next.site) && next.site?.root !== currentSiteRootRef.current;
      currentSiteRootRef.current = next.site?.root ?? null;
      if (draftTimer.current) clearTimeout(draftTimer.current);
      draftValues.current.clear();
      setUnsavedEdits(0);
      setContentUnsaved(false);
      setSite(next.site);
      setDrafts(next.drafts ?? []);
      void window.cauldron.direction().then(setDirection);
      setSelection(null);
      setProblem(null);
      setConflict(null);
      if (isNewSite) {
        setView('build');
      }
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

    const offMenu = window.cauldron.on('cauldron:menu', (payload: never) => {
      const action = payload as unknown as {
        action: 'new-project' | 'open-project' | 'project-home';
      };
      if (action.action === 'project-home') setView('projects');
      if (action.action === 'new-project') {
        setView('projects');
        setNewFormSignal((signal) => signal + 1);
      }
      if (action.action === 'open-project') openSiteRef.current();
    });

    return () => {
      offSite();
      offPreview();
      offStatus();
      offSelection();
      offDrafts();
      offMenu();
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
  }, [agentWidth, inspectorWidth, agentCollapsed, inspectorCollapsed, view]);

  useEffect(() => {
    if (view !== 'build')
      void window.cauldron.setPreviewBounds({
        x: 0,
        y: 0,
        width: 0,
        height: 0,
      });
  }, [view]);

  useEffect(() => {
    void window.cauldron.pickMode(picking);
  }, [picking]);

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
        baseHash: selection.baseHash,
        savedAt: Date.now(),
      });
      setUnsavedEdits(draftValues.current.size);
      const next = noteDraftChange(draftSchedule.current, Date.now());
      if (next.dueAt === draftSchedule.current.dueAt) return;
      draftSchedule.current = next;
      draftTimer.current = setTimeout(() => {
        draftTimer.current = null;
        draftSchedule.current = clearDraftSchedule();
        void window.cauldron.saveDrafts([...draftValues.current.values()]);
      }, DRAFT_SAVE_DELAY_MS);
    },
    [selection],
  );

  const openSiteRef = useRef<() => void>(() => {});

  const [pendingExisting, setPendingExisting] = useState<{
    root: string;
    setup: CauldronDependencySetup;
    problem: string;
  } | null>(null);
  const [confirmOpen, setConfirmOpen] = useState<{ root: string } | null>(null);
  const [newFormSignal, setNewFormSignal] = useState(0);

  const beginOpen = useCallback(
    async (root: string, discardConfirmed = false) => {
      if (busy) return;
      if (!discardConfirmed && (unsavedEdits > 0 || contentUnsaved)) {
        setConfirmOpen({ root });
        return;
      }
      setBusy(true);
      setProblem(null);
      try {
        const result = await window.cauldron.openSite(root);
        if ('needsConfirm' in result) {
          setConfirmOpen({ root: result.root });
          setProblem(result.problem);
          return;
        }
        if ('needsPreparation' in result) {
          setPendingExisting({
            root,
            setup: result.setup,
            problem: result.problem,
          });
          setView('projects');
          return;
        }
        if ('problem' in result) setProblem(result.problem);
      } catch (error) {
        setProblem(
          `Opening the project failed: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      } finally {
        setBusy(false);
      }
    },
    [busy, unsavedEdits, contentUnsaved],
  );
  const beginOpenRef = useRef(beginOpen);
  beginOpenRef.current = beginOpen;

  const discardAndOpen = useCallback(async () => {
    const target = confirmOpen?.root;
    setConfirmOpen(null);
    if (draftTimer.current) clearTimeout(draftTimer.current);
    draftTimer.current = null;
    draftSchedule.current = clearDraftSchedule();
    draftValues.current.clear();
    setUnsavedEdits(0);
    setContentUnsaved(false);
    await window.cauldron.discardDrafts();
    setDrafts([]);
    if (target) void beginOpenRef.current(target, true);
  }, [confirmOpen]);

  const choosingFolder = useRef(false);
  const openSite = useCallback(async () => {
    if (busy || choosingFolder.current) return;
    choosingFolder.current = true;
    setProblem(null);
    try {
      const result = await window.cauldron.openSiteDialog();
      if ('picked' in result) {
        await beginOpenRef.current(result.picked);
        return;
      }
      if ('problem' in result) setProblem(result.problem);
    } catch (error) {
      setProblem(
        `Opening the site failed: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    } finally {
      choosingFolder.current = false;
    }
  }, [busy]);
  openSiteRef.current = openSite;

  const openPath = beginOpen;

  const togglePreview = useCallback(async () => {
    setBusy(true);
    setProblem(null);
    try {
      const result = preview.running
        ? await window.cauldron.stopPreview()
        : await window.cauldron.startPreview();
      if (result && typeof result === 'object' && 'problem' in result) {
        setProblem((result as { problem: string }).problem);
      }
    } catch (error) {
      setProblem(
        `The preview could not be ${preview.running ? 'stopped' : 'started'}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    } finally {
      // Always released, or one failed call would lock the toolbar for good.
      setBusy(false);
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
        setUnsavedEdits(0);
        if (draftTimer.current) clearTimeout(draftTimer.current);
        draftTimer.current = null;
        draftSchedule.current = clearDraftSchedule();
        await window.cauldron.saveDrafts([]);
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

  // Only what the app actually reported; never placeholder wording.
  const contextualStatus =
    drafts.length > 0
      ? `${status} · ${drafts.length} unsaved draft${drafts.length === 1 ? '' : 's'}`
      : status;

  return (
    <div className="app">
      {/* 1. Left Icon Navigation Rail (68px wide) */}
      <nav className="rail" aria-label="Main tools">
        <button
          className="rail-mark-btn"
          type="button"
          title="Project home"
          onClick={() => setView('projects')}
          aria-label="Project home"
        >
          <CauldronMark size={32} />
        </button>

        <button
          className="rail-button"
          type="button"
          aria-current={view === 'build' ? 'page' : undefined}
          title="Sites"
          onClick={() => setView('build')}
        >
          <SitesIcon size={20} />
          <span className="rail-label">Sites</span>
        </button>

        <button
          className="rail-button"
          type="button"
          aria-current={view === 'content' ? 'page' : undefined}
          title="Content"
          onClick={() => setView('content')}
        >
          <ContentIcon size={20} />
          <span className="rail-label">Content</span>
        </button>

        <button
          className="rail-button"
          type="button"
          aria-current={view === 'library' ? 'page' : undefined}
          title="Components"
          onClick={() => setView('library')}
        >
          <ComponentsIcon size={20} />
          <span className="rail-label">Components</span>
        </button>

        <button
          className="rail-button"
          type="button"
          aria-current={view === 'design' ? 'page' : undefined}
          title="Design directions"
          onClick={() => setView('design')}
        >
          <DesignIcon size={20} />
          <span className="rail-label">
            Design
            <br />
            directions
          </span>
        </button>

        <button
          className="rail-button"
          type="button"
          aria-current={view === 'quality' ? 'page' : undefined}
          title="Quality checks"
          onClick={() => setView('quality')}
        >
          <QualityIcon size={20} />
          <span className="rail-label">Quality</span>
        </button>

        <button
          className="rail-button"
          type="button"
          aria-current={view === 'publish' ? 'page' : undefined}
          title="Publishing"
          onClick={() => setView('publish')}
        >
          <PublishingIcon size={20} />
          <span className="rail-label">Publishing</span>
        </button>
      </nav>

      {/* Main Workspace Area */}
      <div className="workspace">
        <TopBar
          site={site}
          running={preview.running}
          picking={picking}
          busy={busy}
          canUndo={canUndo}
          canRedo={canRedo}
          onOpen={openSite}
          onProjects={() => setView('projects')}
          onTogglePreview={togglePreview}
          onReload={() => void window.cauldron.reloadPreview()}
          onUndo={undo}
          onRedo={redo}
          onTogglePick={() => setPicking((current) => !current)}
          onNewPage={newPage}
        />

        {/* Shown in every view, not only the Element panel (fablefixes 21). */}
        {problem ? (
          <div
            className="notice bad"
            role="alert"
            style={{ margin: '8px 12px 0' }}
          >
            {problem}
            <div className="notice-actions">
              <button
                className="button"
                type="button"
                onClick={() => setProblem(null)}
              >
                Dismiss
              </button>
            </div>
          </div>
        ) : null}

        {site &&
        ((site.missingPackages && site.missingPackages.length > 0) ||
          site.buildError) ? (
          <div
            className="notice bad"
            role="alert"
            style={{ margin: '8px 12px 0' }}
          >
            <strong>
              {site.missingPackages && site.missingPackages.length > 0
                ? 'Missing packages'
                : 'Preview error'}
            </strong>{' '}
            {site.missingPackages && site.missingPackages.length > 0
              ? `Missing packages imported by this site: ${site.missingPackages.join(', ')}.`
              : site.buildError}
            {installError ? (
              <div style={{ marginTop: 4, color: 'var(--danger)' }}>
                {installError}
              </div>
            ) : null}
            <div className="notice-actions">
              {site.missingPackages && site.missingPackages.length > 0 ? (
                <button
                  className="button primary"
                  type="button"
                  disabled={installingPackages}
                  onClick={async () => {
                    setInstallingPackages(true);
                    setInstallError(null);
                    try {
                      const res = await window.cauldron.installMissingPackages(
                        site.missingPackages,
                      );
                      if (!res.ok) {
                        setInstallError(
                          res.problem || res.log || 'Installation failed.',
                        );
                      } else if (res.site) {
                        setSite(res.site);
                      }
                    } catch (e) {
                      setInstallError((e as Error).message);
                    } finally {
                      setInstallingPackages(false);
                    }
                  }}
                >
                  {installingPackages
                    ? 'Installing packages…'
                    : 'Install missing packages'}
                </button>
              ) : null}
              <button
                className="button"
                type="button"
                onClick={() => void window.cauldron.reloadPreview()}
              >
                Reload preview
              </button>
            </div>
          </div>
        ) : null}

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

        {view === 'projects' ? (
          <div className="panes">
            <ProjectHome
              busy={busy}
              onOpenExisting={openSite}
              onOpenPath={openPath}
              pendingExisting={pendingExisting}
              onDismissExisting={() => setPendingExisting(null)}
              focusNewForm={newFormSignal}
            />
          </div>
        ) : view === 'publish' ? (
          <div className="panes">
            <PublishPanel
              site={site}
              unsavedBuffers={unsavedEdits + (contentUnsaved ? 1 : 0)}
              onBack={() => setView('build')}
            />
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
            <ContentPanel
              site={site}
              onUnsavedChange={setContentUnsaved}
              onBack={() => setView('build')}
            />
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
                    selection={selection}
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
                    site={site}
                    direction={direction}
                    selection={selection}
                    conflict={conflict}
                    onApplyText={applyText}
                    onApplyAttribute={applyAttribute}
                    onApplyStyle={applyStyle}
                    onKeepMine={keepMine}
                    onUseDisk={useDisk}
                    onDraft={queueDraft}
                    onNavigateToLibrary={() => setView('library')}
                  />
                </div>
              </>
            )}
          </div>
        )}

        <div
          className="topbar"
          style={{ height: 28, flex: '0 0 28px', gap: 6, padding: '0 12px' }}
        >
          <button
            className="button quiet"
            type="button"
            onClick={() => setAgentCollapsed((value) => !value)}
            aria-pressed={!agentCollapsed}
            style={{ fontSize: 11, height: 22 }}
          >
            Agent {agentCollapsed ? '▸' : '◂'}
          </button>
          <span className="spacer" />
          <button
            className="button quiet"
            type="button"
            onClick={() => setInspectorCollapsed((value) => !value)}
            aria-pressed={!inspectorCollapsed}
            style={{ fontSize: 11, height: 22 }}
          >
            Element {inspectorCollapsed ? '◂' : '▸'}
          </button>
        </div>

        {confirmOpen ? (
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Unsaved edits"
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 40,
            }}
          >
            <div
              style={{
                background: 'var(--panel, #121316)',
                border: '1px solid var(--hairline)',
                borderRadius: 8,
                padding: 18,
                maxWidth: 460,
                boxShadow: '0 8px 30px rgba(0,0,0,0.5)',
              }}
            >
              <h2 style={{ fontSize: 14, margin: '0 0 6px' }}>
                Unsaved edits in this project
              </h2>
              <p className="hint" style={{ marginTop: 0 }}>
                Opening another project now would replace what is on screen.
                Keep editing to stay here, or discard the unsaved changes and
                open the other project. Nothing is discarded automatically.
              </p>
              <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                <button
                  className="button primary"
                  type="button"
                  onClick={() => setConfirmOpen(null)}
                >
                  Keep editing
                </button>
                <button
                  className="button"
                  type="button"
                  onClick={() => void discardAndOpen()}
                >
                  Discard changes and open
                </button>
              </div>
            </div>
          </div>
        ) : null}

        <StatusBar
          message={contextualStatus}
          url={preview.url}
          running={preview.running}
          siteName={site?.name}
        />
      </div>
    </div>
  );
}
