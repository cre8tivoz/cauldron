import { useCallback, useEffect, useRef, useState } from 'react';

type Props = {
  busy: boolean;
  /** Native folder picker for opening an existing project. */
  onOpenExisting: () => void;
  /** Open a project by folder path (recents, path field, install-and-open). */
  onOpenPath: (root: string) => Promise<unknown>;
  /** An existing project that needs its dependencies installed first. */
  pendingExisting: {
    root: string;
    setup: CauldronDependencySetup;
    problem: string;
  } | null;
  onDismissExisting: () => void;
  /** Bumped by the New Project menu item; focuses the new-project form. */
  focusNewForm: number;
};

type Recent = CauldronRecent;
type PrepareState = {
  root: string;
  lines: string[];
  done: boolean;
  ok: boolean;
  problem: string | null;
  /** Open the project as soon as the install finishes. */
  thenOpen: boolean;
};

/**
 * The project home (issue 32): new Astro project, open existing project, and
 * the persisted library of recent projects. Every async action reports its
 * failure here and restores its controls; a failed install leaves the project
 * in the library, recoverable with "Install dependencies" — never a dead end.
 */
export function ProjectHome({
  busy,
  onOpenExisting,
  onOpenPath,
  pendingExisting,
  onDismissExisting,
  focusNewForm,
}: Props) {
  const [recents, setRecents] = useState<Recent[]>([]);
  const [libraryProblem, setLibraryProblem] = useState<string | null>(null);
  const [loadFailed, setLoadFailed] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [parent, setParent] = useState('');
  const [existingPath, setExistingPath] = useState('');
  const [creating, setCreating] = useState(false);
  const [formProblem, setFormProblem] = useState<string | null>(null);
  const [prepare, setPrepare] = useState<PrepareState | null>(null);
  const [busyRoot, setBusyRoot] = useState<string | null>(null);
  const [selectedTemplate, setSelectedTemplate] =
    useState<string>('sunday-table');
  const [templates, setTemplates] = useState<CauldronStarterTemplate[]>([]);
  const [templatesProblem, setTemplatesProblem] = useState<string | null>(null);
  const nameInput = useRef<HTMLInputElement | null>(null);
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  // The File > New Project item (⌘N) lands here with the form already on
  // screen: focus it instead of leaving the keyboard aimless.
  useEffect(() => {
    if (focusNewForm > 0) nameInput.current?.focus();
  }, [focusNewForm]);

  const refresh = useCallback(() => {
    window.cauldron
      .projectsHome()
      .then((result) => {
        if (!alive.current) return;
        setRecents(result.projects);
        setLibraryProblem(result.problem);
      })
      .catch((error: unknown) => {
        if (!alive.current) return;
        setLoadFailed(
          `The project library could not be read: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      });
  }, []);
  useEffect(refresh, [refresh]);

  // The starter list comes only from the main process, so the cards always
  // match what can really be created. If it cannot be read, say so.
  useEffect(() => {
    const failed = (reason: string) => {
      if (!alive.current) return;
      const text = `The starter templates could not be loaded: ${reason}`;
      console.error(`[projects] ${text}`);
      setTemplatesProblem(text);
    };
    window.cauldron
      .starterTemplates()
      .then((items) => {
        if (!alive.current) return;
        if (Array.isArray(items) && items.length > 0) setTemplates(items);
        else failed('the list came back empty.');
      })
      .catch((error: unknown) =>
        failed(error instanceof Error ? error.message : String(error)),
      );
  }, []);

  // Follow install progress. The event names the project it belongs to, so a
  // stale listener never writes another project's progress into this view.
  useEffect(() => {
    const off = window.cauldron.on('cauldron:prepare-progress', (payload) => {
      const event = payload as unknown as CauldronPrepareEvent;
      if (!alive.current) return;
      setPrepare((current) => {
        if (!current) return null;
        const isMatch =
          current.root === event.root ||
          current.root.replace(/^\/private/, '') ===
            event.root.replace(/^\/private/, '');
        if (!isMatch) return current;
        if (event.type === 'progress')
          return {
            ...current,
            lines: [...current.lines.slice(-80), event.text],
          };
        return {
          ...current,
          done: true,
          ok: event.ok,
          problem: event.problem,
        };
      });
    });
    return off;
  }, []);

  const browseParent = async () => {
    setFormProblem(null);
    try {
      const result = await window.cauldron.chooseProjectParent();
      if (!result.cancelled && result.path) setParent(result.path);
    } catch (error) {
      setFormProblem(
        `The folder chooser failed: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  };

  const create = async () => {
    setFormProblem(null);
    setCreating(true);
    try {
      const result = await window.cauldron.createProject({
        name: name.trim(),
        parent: parent.trim(),
        template: selectedTemplate,
      });
      if ('ok' in result) {
        refresh();
        // Consent was given by pressing "Create and prepare": packages are
        // downloaded and shared through Cauldron's own store. The pending
        // state is set BEFORE the call so a synchronous failure (its done
        // event can arrive before this function resumes) is never lost.
        setPrepare({
          root: result.project.root,
          lines: [],
          done: false,
          ok: false,
          problem: null,
          thenOpen: false,
        });
        const started = await window.cauldron.prepareDependencies(
          result.project.root,
        );
        if (!started.ok)
          markPrepareFailed(result.project.root, started.problem);
      } else {
        setFormProblem(result.problem);
      }
    } catch (error) {
      setFormProblem(
        `Creating the project failed: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    } finally {
      setCreating(false);
    }
  };

  const cancelPrepare = async () => {
    try {
      await window.cauldron.cancelPrepare();
    } catch (error) {
      setFormProblem(
        `The install could not be cancelled: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  };

  /**
   * Marks a still-pending prepare as failed when the start call itself
   * reported failure (a synchronous failure races the done event: the event
   * wins if it already arrived, this only fills the gap).
   */
  const markPrepareFailed = (root: string, problem?: string) => {
    setPrepare((current) =>
      current && current.root === root && !current.done
        ? {
            ...current,
            done: true,
            ok: false,
            problem: problem ?? 'The install could not be started.',
          }
        : current,
    );
  };

  /** Install dependencies for a library entry that does not have them yet. */
  const installFor = async (root: string, thenOpen = false) => {
    setFormProblem(null);
    setBusyRoot(root);
    try {
      // Pending state first, for the same synchronous-failure race as create.
      setPrepare({
        root,
        lines: [],
        done: false,
        ok: false,
        problem: null,
        thenOpen,
      });
      const started = await window.cauldron.prepareDependencies(root);
      if (!started.ok) markPrepareFailed(root, started.problem);
    } catch (error) {
      markPrepareFailed(
        root,
        `Preparing dependencies failed: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    } finally {
      setBusyRoot(null);
    }
  };

  const open = async (root: string) => {
    setFormProblem(null);
    setBusyRoot(root);
    try {
      await onOpenPath(root);
    } finally {
      setBusyRoot(null);
    }
  };

  // The library's install state changes when an install finishes; refresh so
  // each row's "Install dependencies" offer matches reality.
  useEffect(() => {
    if (prepare?.done) refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prepare?.done]);
  // An install that was started with "install and open" consent continues on
  // its own once it succeeds: the person asked for the project, not for a
  // second button.
  useEffect(() => {
    if (prepare && prepare.done && prepare.ok && prepare.thenOpen) {
      const root = prepare.root;
      setPrepare(null);
      void open(root);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prepare?.done, prepare?.ok, prepare?.thenOpen]);

  const remove = async (root: string) => {
    setFormProblem(null);
    try {
      const result = await window.cauldron.removeRecent(root);
      if (!result.ok)
        setFormProblem(result.problem ?? 'The entry could not be removed.');
      refresh();
    } catch (error) {
      setFormProblem(
        `Removing the entry failed: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  };

  const canCreate =
    name.trim() !== '' &&
    parent.trim() !== '' &&
    !creating &&
    !busy &&
    !prepare;
  const canFormEdit = !creating && !busy && !prepare;

  return (
    <div className="pane-body home" style={{ padding: 24, overflowY: 'auto' }}>
      <h1 style={{ fontSize: 18, margin: '0 0 4px' }}>Projects</h1>
      <p className="hint" style={{ marginTop: 0 }}>
        Start a new Astro project, open one you already have, or return to
        something from your library.
      </p>

      {loadFailed || libraryProblem ? (
        <div className="notice" role="alert" style={{ marginBottom: 12 }}>
          {loadFailed ?? libraryProblem}
        </div>
      ) : null}
      {formProblem ? (
        <div className="notice" role="alert" style={{ marginBottom: 12 }}>
          {formProblem}
        </div>
      ) : null}

      <section
        className="home-card"
        style={{
          border: '1px solid var(--hairline)',
          borderRadius: 6,
          padding: 16,
          marginBottom: 16,
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
        }}
      >
        <h2 style={{ fontSize: 14, margin: 0 }}>New Astro project</h2>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <input
            className="field"
            ref={nameInput}
            style={{ height: 28, width: 220 }}
            placeholder="Project name, e.g. Sunrise Bakery"
            value={name}
            disabled={!canFormEdit}
            aria-label="Project name"
            onChange={(event) => setName(event.target.value)}
          />
          <input
            className="field"
            style={{ height: 28, width: 320 }}
            placeholder="Folder to create it in, e.g. /Users/you/Documents"
            value={parent}
            disabled={!canFormEdit}
            aria-label="Location for the new project folder"
            onChange={(event) => setParent(event.target.value)}
          />
          <button
            className="button"
            type="button"
            disabled={!canFormEdit}
            onClick={() => void browseParent()}
          >
            Browse…
          </button>
        </div>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
            marginTop: 4,
          }}
        >
          <span
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: 'var(--text)',
            }}
          >
            Starter Template
          </span>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
              gap: 8,
            }}
          >
            {templatesProblem ? (
              <div className="notice" role="alert">
                {templatesProblem}
              </div>
            ) : null}
            {templates.map((tpl) => {
              const active = selectedTemplate === tpl.id;
              return (
                <button
                  key={tpl.id}
                  type="button"
                  onClick={() => setSelectedTemplate(tpl.id)}
                  disabled={!canFormEdit}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-start',
                    gap: 4,
                    padding: '8px 10px',
                    borderRadius: 6,
                    border: active
                      ? '1.5px solid var(--accent, #b84b30)'
                      : '1px solid var(--hairline)',
                    background: active
                      ? 'rgba(184, 75, 48, 0.08)'
                      : 'var(--panel)',
                    cursor: canFormEdit ? 'pointer' : 'default',
                    textAlign: 'left',
                    color: 'inherit',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      width: '100%',
                    }}
                  >
                    <span
                      style={{
                        fontSize: 9,
                        textTransform: 'uppercase',
                        letterSpacing: '0.06em',
                        padding: '1px 5px',
                        borderRadius: 3,
                        background: active
                          ? 'var(--accent)'
                          : 'var(--panel-sunken)',
                        color: active ? 'var(--accent-text)' : 'var(--muted)',
                        fontWeight: 600,
                      }}
                    >
                      {tpl.badge}
                    </span>
                    {active ? (
                      <span
                        style={{
                          fontSize: 10,
                          color: 'var(--accent, #b84b30)',
                          fontWeight: 700,
                        }}
                      >
                        ✓
                      </span>
                    ) : null}
                  </div>
                  <div
                    style={{
                      fontWeight: 600,
                      fontSize: 12,
                      color: 'var(--text)',
                    }}
                  >
                    {tpl.name}
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      color: 'var(--muted)',
                      lineHeight: 1.25,
                    }}
                  >
                    {tpl.category}
                  </div>
                  <div style={{ display: 'flex', gap: 3, marginTop: 2 }}>
                    {tpl.swatches.map((color, idx) => (
                      <span
                        key={idx}
                        style={{
                          width: 10,
                          height: 10,
                          borderRadius: 2,
                          background: color,
                          border: '1px solid rgba(0,0,0,0.2)',
                          display: 'inline-block',
                        }}
                      />
                    ))}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
        <p className="hint" style={{ margin: 0 }}>
          The folder is created fresh at the chosen location — an existing
          folder or file there is never overwritten. “Create and prepare”
          downloads the project's packages through Cauldron's shared store
          (packages already downloaded by earlier projects are reused, nothing
          is installed globally).
        </p>
        <div>
          <button
            className="button primary"
            type="button"
            disabled={!canCreate}
            onClick={() => void create()}
          >
            {creating ? 'Creating…' : 'Create and prepare'}
          </button>
        </div>
      </section>

      {pendingExisting ? (
        <section
          className="home-card"
          role="alertdialog"
          aria-label="Install dependencies before opening"
          style={{
            border: '1px solid var(--hairline)',
            borderRadius: 6,
            padding: 16,
            marginBottom: 16,
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
          }}
        >
          <h2 style={{ fontSize: 14, margin: 0 }}>
            “{pendingExisting.root.split('/').pop()}” needs its dependencies
            installed
          </h2>
          <p className="hint" style={{ margin: 0 }}>
            {pendingExisting.problem}
          </p>
          <p className="hint" style={{ margin: 0 }}>
            Detected setup: package manager{' '}
            <strong>{pendingExisting.setup.manager}</strong>
            {pendingExisting.setup.lockfile
              ? `, lockfile ${pendingExisting.setup.lockfile}`
              : ', no lockfile yet'}
            . The install uses this project's own manager — nothing is converted
            or changed globally; packages download through Cauldron's shared
            store.
          </p>
          {pendingExisting.setup.conflict ? (
            <div className="notice" role="alert" style={{ margin: 0 }}>
              <strong>Lockfile mismatch.</strong>{' '}
              {pendingExisting.setup.conflict}
            </div>
          ) : null}
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              className="button primary"
              type="button"
              disabled={busy || busyRoot === pendingExisting.root || !!prepare}
              onClick={() => {
                const root = pendingExisting.root;
                onDismissExisting();
                void installFor(root, true);
              }}
            >
              {busyRoot === pendingExisting.root
                ? 'Starting…'
                : 'Install dependencies and open'}
            </button>
            <button
              className="button"
              type="button"
              onClick={onDismissExisting}
            >
              Cancel
            </button>
          </div>
        </section>
      ) : null}

      <section
        className="home-card"
        style={{
          border: '1px solid var(--hairline)',
          borderRadius: 6,
          padding: 16,
          marginBottom: 16,
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
        }}
      >
        <h2 style={{ fontSize: 14, margin: 0 }}>Open existing project</h2>
        <p className="hint" style={{ margin: 0 }}>
          Choose a folder with the picker, or paste its path here. If the
          project's dependencies are not installed yet, you are asked before
          anything is downloaded.
        </p>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <input
            className="field"
            style={{ height: 28, width: 320 }}
            placeholder="Path to the project folder, e.g. /Users/you/Documents/my-site"
            value={existingPath}
            disabled={!canFormEdit}
            aria-label="Path of the existing project folder"
            onChange={(event) => setExistingPath(event.target.value)}
          />
          <button
            className="button"
            type="button"
            disabled={!canFormEdit || existingPath.trim() === ''}
            onClick={() => void open(existingPath.trim())}
          >
            Open by path
          </button>
        </div>
      </section>

      {prepare ? (
        <section
          className="home-card"
          style={{
            border: '1px solid var(--hairline)',
            borderRadius: 6,
            padding: 16,
            marginBottom: 16,
          }}
        >
          <h2 style={{ fontSize: 14, margin: '0 0 6px' }}>
            {prepare.done
              ? prepare.ok
                ? 'Dependencies ready.'
                : 'The install failed.'
              : 'Installing dependencies…'}
          </h2>
          <pre
            className="prep-log"
            style={{
              maxHeight: 140,
              overflowY: 'auto',
              fontSize: 11,
              margin: '0 0 10px',
              whiteSpace: 'pre-wrap',
            }}
          >
            {prepare.lines.slice(-12).join('\n') || 'Starting…'}
          </pre>
          {!prepare.done ? (
            <button
              className="button"
              type="button"
              onClick={() => void cancelPrepare()}
            >
              Cancel install
            </button>
          ) : prepare.ok ? (
            <button
              className="button primary"
              type="button"
              onClick={() => {
                const root = prepare.root;
                setPrepare(null);
                void open(root);
              }}
            >
              Open project
            </button>
          ) : (
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                className="button"
                type="button"
                onClick={() => {
                  const problem = prepare.problem;
                  setPrepare(null);
                  if (problem) setFormProblem(problem);
                  // The library entry is still there and still unprepared:
                  // refresh so its "Install dependencies" offer is visible.
                  refresh();
                }}
              >
                Dismiss
              </button>
              <button
                className="button primary"
                type="button"
                onClick={() => {
                  const root = prepare.root;
                  const thenOpen = prepare.thenOpen;
                  setPrepare(null);
                  void installFor(root, thenOpen);
                }}
              >
                Try again
              </button>
            </div>
          )}
        </section>
      ) : null}

      <section>
        <h2 style={{ fontSize: 14, margin: '0 0 8px' }}>
          Your projects
          <button
            className="button"
            type="button"
            style={{ marginLeft: 12 }}
            onClick={onOpenExisting}
            disabled={busy}
          >
            Open existing project…
          </button>
        </h2>
        {recents.length === 0 ? (
          <p className="hint">
            Nothing here yet. Projects you create or open are kept in this list,
            and it survives restarting Cauldron.
          </p>
        ) : (
          <ul
            className="recent-list"
            style={{
              listStyle: 'none',
              margin: 0,
              padding: 0,
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
            }}
          >
            {recents.map((recent) => (
              <li
                key={recent.path}
                className="recent-row"
                style={{
                  border: '1px solid var(--hairline)',
                  borderRadius: 6,
                  padding: '10px 12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  flexWrap: 'wrap',
                }}
              >
                <div style={{ flex: 1, minWidth: 200 }}>
                  <strong>{recent.name}</strong>
                  {recent.missing ? (
                    <span
                      className="badge-missing"
                      style={{ marginLeft: 8, color: 'var(--danger)' }}
                    >
                      Folder moved or missing
                    </span>
                  ) : null}
                  <div
                    className="hint"
                    style={{ fontSize: 11, wordBreak: 'break-all' }}
                  >
                    {recent.path}
                  </div>
                  <div className="hint" style={{ fontSize: 11 }}>
                    {recent.lastOpenedAt
                      ? `Last opened ${new Date(recent.lastOpenedAt).toLocaleString()}`
                      : 'Never opened'}
                  </div>
                </div>
                {recent.missing ? (
                  <span className="hint" style={{ maxWidth: 260 }}>
                    Nothing can be opened from here until the folder is back.
                    Removing the entry leaves the project on disk untouched.
                  </span>
                ) : null}
                <div style={{ display: 'flex', gap: 8 }}>
                  {!recent.missing ? (
                    <>
                      <button
                        className="button primary"
                        type="button"
                        disabled={busy || busyRoot === recent.path}
                        onClick={() => void open(recent.path)}
                      >
                        {busyRoot === recent.path ? 'Opening…' : 'Open'}
                      </button>
                      {!recent.prepared ? (
                        <button
                          className="button"
                          type="button"
                          disabled={
                            busy || busyRoot === recent.path || !!prepare
                          }
                          onClick={() => void installFor(recent.path, true)}
                        >
                          Install dependencies
                        </button>
                      ) : null}
                    </>
                  ) : null}
                  <button
                    className="button quiet"
                    type="button"
                    onClick={() => void remove(recent.path)}
                  >
                    Remove from list
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
