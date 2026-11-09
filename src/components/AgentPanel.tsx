import { useCallback, useEffect, useRef, useState } from 'react';
import {
  CheckCircleIcon,
  ChevronDownIcon,
  FileIcon,
  SparkleIcon,
  WarningTriangleIcon,
} from './Icons';

type Props = {
  site: CauldronSite | null;
  direction: CauldronDirectionSummary | null;
  onOpenDesign: () => void;
  selection?: CauldronSelection | null;
};

type Line = { kind: 'agent' | 'tool' | 'status' | 'error'; text: string };

/**
 * The conversational agent column: run Claude Code, Codex, or Hermes with the
 * selected element as context. Every job is rendered as a clean conversation
 * card with prompt bubbles, live progress, changed file pills, and run summary cards.
 */
export function AgentPanel({
  site,
  direction,
  onOpenDesign,
  selection,
}: Props) {
  const [runs, setRuns] = useState<CauldronRun[]>([]);
  const [lines, setLines] = useState<Line[]>([]);
  const [request, setRequest] = useState('');
  const [tool, setTool] = useState<'claude' | 'codex' | 'hermes'>('claude');
  const [running, setRunning] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [showing, setShowing] = useState<string | null>(null);
  const [activePrompt, setActivePrompt] = useState<string | null>(null);
  const transcript = useRef<HTMLDivElement | null>(null);
  const [connection, setConnection] = useState<{
    url: string;
    code: string;
  } | null>(null);
  const [installingMissing, setInstallingMissing] = useState(false);

  useEffect(() => {
    void window.cauldron.mcpInfo().then(setConnection);
  }, [site?.root, site]);

  const refresh = useCallback(async () => {
    const fetchedRuns = await window.cauldron.runs();
    setRuns(fetchedRuns);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh, site?.root]);

  useEffect(() => {
    const offEvent = window.cauldron.on(
      'cauldron:agent-event',
      (payload: never) => {
        const event = payload as CauldronAgentEvent;
        if (event.type === 'session') return;
        if (event.type === 'error') {
          setLines((current) => [
            ...current,
            { kind: 'error', text: event.text },
          ]);
          setRunning(false);
          return;
        }
        if (event.type === 'tool') {
          setLines((current) => [
            ...current,
            { kind: 'tool', text: `Using ${event.name}` },
          ]);
          return;
        }
        if (event.type === 'status') {
          setLines((current) => [
            ...current,
            { kind: 'status', text: event.text },
          ]);
          return;
        }
        if (event.type === 'done') return;
        setLines((current) => {
          const last = current.at(-1);
          if (event.delta && last?.kind === 'agent')
            return [
              ...current.slice(0, -1),
              { kind: 'agent', text: last.text + event.text },
            ];
          return [...current, { kind: 'agent', text: event.text }];
        });
      },
    );

    const offDone = window.cauldron.on(
      'cauldron:agent-done',
      (payload: never) => {
        const result = payload as { note: string };
        setRunning(false);
        setMessage(result.note);
        void refresh();
      },
    );

    return () => {
      offEvent();
      offDone();
    };
  }, [refresh]);

  useEffect(() => {
    transcript.current?.scrollTo({ top: transcript.current.scrollHeight });
  }, [lines, running]);

  const send = async () => {
    if (!site || request.trim() === '') return;
    const promptText = request.trim();
    setActivePrompt(promptText);
    setMessage(null);
    setLines([]);
    setRunning(true);
    setRequest('');

    try {
      const result = await window.cauldron.agentSend({
        tool,
        request: promptText,
      });
      if (!result.ok) {
        setRunning(false);
        setMessage(result.problem ?? 'The agent could not start.');
      }
    } catch (error) {
      setRunning(false);
      setMessage(
        `The agent could not start: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  };

  const toggle = async (run: CauldronRun) => {
    const next = showing === run.id ? null : run.id;
    await window.cauldron.highlight(run.id, next !== null);
    setShowing(next);
  };

  const undoRun = async (run: CauldronRun) => {
    const result = await window.cauldron.undoRun(run.id);
    if (result.ok) {
      setMessage('Run undone.');
      await refresh();
      return;
    }
    setMessage(
      result.clashes && result.clashes.length > 0
        ? `${result.problem} ${result.clashes.join(', ')}`
        : (result.problem ?? 'That run could not be undone.'),
    );
  };

  const toolLabels: Record<string, string> = {
    claude: 'Claude Code',
    codex: 'Codex',
    hermes: 'Hermes',
  };

  return (
    <div className="agent-column-container">
      {/* 1. Header & Active Direction Subheader */}
      <div className="agent-header-block">
        <div className="agent-header-row">
          <span className="agent-eyebrow">AGENT</span>
          <div className="agent-select-wrap">
            <select
              aria-label="Agent tool"
              value={tool}
              onChange={(event) => setTool(event.target.value as typeof tool)}
              className="agent-tool-select"
              disabled={running}
            >
              <option value="claude">Claude Code</option>
              <option value="codex">Codex</option>
              <option value="hermes">Hermes</option>
            </select>
            <ChevronDownIcon size={12} />
          </div>
        </div>

        {direction ? (
          <div className="agent-direction-subhead">
            <button
              type="button"
              className="agent-direction-link"
              onClick={onOpenDesign}
              title="Change design direction"
            >
              Building to <strong>{direction.name}</strong>
            </button>
            <span className="agent-direction-fonts">
              {direction.fonts.display} · {direction.fonts.body}
            </span>
          </div>
        ) : (
          <div className="agent-direction-subhead">
            <button
              type="button"
              className="agent-direction-link"
              onClick={onOpenDesign}
            >
              Choose a design direction
            </button>
          </div>
        )}
      </div>

      {/* 2. Unified Conversation & Run Stream */}
      <div
        className="agent-stream-pane pane-body"
        ref={transcript}
        aria-live="polite"
      >
        {!site ? <p className="hint">Open a site to work on it.</p> : null}

        {site ? (
          <details
            className="mcp-outside-connect hint"
            onToggle={() => {
              void window.cauldron.mcpInfo().then(setConnection);
            }}
          >
            <summary>Connect an outside agent</summary>
            {connection ? (
              <div className="mcp-details-body">
                <p>
                  Local MCP HTTP connection. Only works while this site is open.
                </p>
                <label className="field-compact">
                  <span>URL</span>
                  <input readOnly value={connection.url} />
                </label>
                <label className="field-compact">
                  <span>Access code (x-cauldron-code header)</span>
                  <input readOnly value={connection.code} />
                </label>
              </div>
            ) : (
              <p>Start the site preview to enable the connection.</p>
            )}
          </details>
        ) : null}

        {message ? (
          <div className="notice" role="status">
            {message}
          </div>
        ) : null}

        {/* Live / Active run output */}
        {activePrompt ? (
          <div className="chat-bubble-user">
            <span className="bubble-avatar" aria-hidden="true">
              👤
            </span>
            <div className="bubble-content">
              <p>{activePrompt}</p>
            </div>
          </div>
        ) : null}

        {running || lines.length > 0 ? (
          <div className="chat-bubble-agent">
            <div className="agent-bubble-header">
              <span className="agent-avatar" aria-hidden="true">
                <SparkleIcon size={14} />
              </span>
              <strong>{toolLabels[tool] || 'Agent'}</strong>
              <span className="agent-state-pill">
                {running ? 'Thinking…' : 'Finished'}
              </span>
            </div>

            <div className="agent-transcript-lines">
              {lines.map((line, index) => (
                <div
                  key={`${index}-${line.kind}`}
                  className={`agent-line line-${line.kind}`}
                >
                  {line.kind === 'tool' ? '✓ ' : ''}
                  {line.text}
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {/* Existing Runs list rendered as conversational cards */}
        <div className="runs-section">
          {runs.length === 0 && !running && !activePrompt ? (
            <div className="agent-welcome-card">
              <span className="welcome-sparkle">✳</span>
              <h4>Ask Cauldron’s Agent</h4>
              <p>
                Describe what to refine, adjust typography or add new sections.
                Every run is verified and can be undone cleanly.
              </p>
            </div>
          ) : null}

          {runs.map((run) => {
            const hasClashes = run.problems && run.problems.length > 0;
            const isFailed = run.status === 'failed' || hasClashes;

            return (
              <div
                key={run.id}
                className={`run-card ${isFailed ? 'run-card-error' : ''}`}
              >
                {/* Run summary badge */}
                <div className="run-card-header">
                  <span className="run-status-icon">
                    {isFailed ? (
                      <WarningTriangleIcon size={16} />
                    ) : (
                      <CheckCircleIcon size={16} />
                    )}
                  </span>
                  <div className="run-title-group">
                    <strong>
                      {run.note || `${toolLabels[run.tool] || run.tool} run`}
                    </strong>
                    <span className="run-meta-text">
                      {run.status} · {run.files.length} file
                      {run.files.length === 1 ? '' : 's'}
                    </span>
                  </div>
                </div>

                {hasClashes ? (
                  <div className="notice bad" role="alert">
                    <strong>Problems encountered:</strong>
                    <ul>
                      {run.problems?.map((p, i) => (
                        <li key={i}>{p}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                {/* Changed file pills */}
                {run.files.length > 0 ? (
                  <div className="run-file-pills">
                    {run.files.map((file) => (
                      <span key={file} className="file-pill">
                        <FileIcon size={13} />
                        <span className="mono">{file}</span>
                      </span>
                    ))}
                  </div>
                ) : null}

                {/* Highlighted removed elements */}
                {run.highlighted.some((item) => item.removed) ? (
                  <ul className="hint removed-elements-list">
                    {run.highlighted
                      .filter((item) => item.removed)
                      .map((item, index) => (
                        <li key={`${item.file}:${item.loc}:${index}`}>
                          {item.label}
                        </li>
                      ))}
                  </ul>
                ) : null}

                {/* Missing packages action */}
                {site?.missingPackages && site.missingPackages.length > 0 ? (
                  <div className="notice-actions" style={{ marginBottom: 6 }}>
                    <button
                      className="button primary"
                      type="button"
                      disabled={installingMissing}
                      onClick={async () => {
                        setInstallingMissing(true);
                        try {
                          await window.cauldron.installMissingPackages(
                            site.missingPackages,
                          );
                        } finally {
                          setInstallingMissing(false);
                        }
                      }}
                    >
                      {installingMissing
                        ? 'Installing…'
                        : `Install missing packages (${site.missingPackages.join(', ')})`}
                    </button>
                  </div>
                ) : null}

                {/* Action buttons */}
                <div className="run-actions-row">
                  <button
                    className="button quiet-pill-btn"
                    type="button"
                    onClick={() => void toggle(run)}
                    aria-pressed={showing === run.id}
                    disabled={run.highlighted.length === 0}
                  >
                    {showing === run.id ? 'Hide changes' : 'Show changes'}
                  </button>
                  <button
                    className="button quiet-pill-btn"
                    type="button"
                    onClick={() => void undoRun(run)}
                    disabled={
                      (run.status !== 'finished' && run.status !== 'failed') ||
                      run.files.length === 0 ||
                      run.note.includes('Undone.')
                    }
                  >
                    Undo this run
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. Docked Bottom Composer */}
      <div className="agent-docked-composer">
        {selection ? (
          <div className="composer-context-chip">
            <span className="mono">
              &lt;{selection.name}&gt; · {selection.file.split('/').pop()}
            </span>
          </div>
        ) : null}

        <label htmlFor="agent-request" className="composer-label">
          Ask for something
        </label>
        <textarea
          id="agent-request"
          rows={3}
          value={request}
          onChange={(event) => setRequest(event.target.value)}
          placeholder="Ask for something"
          disabled={!direction || running}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
              event.preventDefault();
              void send();
            }
          }}
        />

        <div className="composer-actions-bar">
          {running ? (
            <button
              className="button cancel-btn"
              type="button"
              onClick={() => void window.cauldron.agentCancel()}
            >
              Cancel
            </button>
          ) : null}
          <span className="spacer" />
          <button
            className="button primary agent-send-btn"
            type="button"
            onClick={() => void send()}
            disabled={!direction || running || request.trim() === ''}
          >
            <span>➤</span>
            <span>{running ? 'Working…' : 'Send to agent'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
