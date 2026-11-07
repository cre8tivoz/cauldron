import { useCallback, useEffect, useRef, useState } from 'react';

type Props = {
  site: CauldronSite | null;
  direction: CauldronDirectionSummary | null;
  onOpenDesign: () => void;
};

type Line = { kind: 'agent' | 'tool' | 'status' | 'error'; text: string };

/**
 * The agent column: run the tool you already have, with the selected element as
 * context. Every job becomes a run that can be reviewed and undone (plan 2.2, 3.2).
 */
export function AgentPanel({ site, direction, onOpenDesign }: Props) {
  const [runs, setRuns] = useState<CauldronRun[]>([]);
  const [lines, setLines] = useState<Line[]>([]);
  const [request, setRequest] = useState('');
  const [tool, setTool] = useState<'claude' | 'codex' | 'hermes'>('claude');
  const [running, setRunning] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [showing, setShowing] = useState<string | null>(null);
  const transcript = useRef<HTMLDivElement | null>(null);
  const [connection, setConnection] = useState<{
    url: string;
    code: string;
  } | null>(null);
  useEffect(() => {
    void window.cauldron.mcpInfo().then(setConnection);
  }, [site?.root]);

  const refresh = useCallback(async () => {
    setRuns(await window.cauldron.runs());
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
  }, [lines]);

  const send = async () => {
    if (!site || request.trim() === '') return;
    setMessage(null);
    setLines([]);
    setRunning(true);
    const result = await window.cauldron.agentSend({
      tool,
      request: request.trim(),
    });
    if (!result.ok) {
      setRunning(false);
      setMessage(result.problem ?? 'The agent could not start.');
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

  return (
    <>
      <div className="pane-header">
        Agent
        <select
          aria-label="Agent tool"
          value={tool}
          onChange={(event) => setTool(event.target.value as typeof tool)}
          style={{ marginLeft: 'auto', height: 22, fontSize: 12 }}
          disabled={running}
        >
          <option value="claude">Claude Code</option>
          <option value="codex">Codex</option>
          <option value="hermes">Hermes</option>
        </select>
      </div>

      <div
        className="pane-body"
        style={{ display: 'flex', flexDirection: 'column', gap: 10 }}
      >
        {!site ? <p className="hint">Open a site to work on it.</p> : null}
        {site ? (
          <details
            className="hint"
            onToggle={() => {
              void window.cauldron.mcpInfo().then(setConnection);
            }}
          >
            <summary>Connect an outside agent</summary>
            {connection ? (
              <>
                <p>
                  Local MCP HTTP connection. Only works while this site is open.
                </p>
                <label>
                  URL
                  <input
                    readOnly
                    value={connection.url}
                    style={{ width: '100%' }}
                  />
                </label>
                <label>
                  Access code (x-cauldron-code header)
                  <input
                    readOnly
                    value={connection.code}
                    style={{ width: '100%' }}
                  />
                </label>
              </>
            ) : (
              <p>Start the site preview to enable the connection.</p>
            )}
          </details>
        ) : null}

        {site && !direction ? (
          <div className="notice">
            <strong>Pick a design direction first.</strong> Every agent job
            carries the taste rules and the site's look, so there has to be a
            look.
            <div className="notice-actions">
              <button
                className="button primary"
                type="button"
                onClick={onOpenDesign}
              >
                Choose a direction
              </button>
            </div>
          </div>
        ) : null}

        {direction ? (
          <p className="hint">
            Building to <strong>{direction.name}</strong> —{' '}
            {direction.fonts.display} and {direction.fonts.body}.
          </p>
        ) : null}

        {message ? <div className="notice">{message}</div> : null}

        <div
          ref={transcript}
          style={{
            flex: 1,
            minHeight: 120,
            overflowY: 'auto',
            border: '1px solid var(--hairline)',
            borderRadius: 8,
            padding: 8,
            fontSize: 12.5,
            lineHeight: 1.5,
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
          }}
          aria-live="polite"
        >
          {lines.length === 0 ? (
            <span className="hint">Nothing yet.</span>
          ) : null}
          {lines.map((line, index) => (
            <div
              key={`${index}-${line.kind}`}
              style={{
                color:
                  line.kind === 'error'
                    ? 'var(--danger)'
                    : line.kind === 'status' || line.kind === 'tool'
                      ? 'var(--muted)'
                      : 'var(--text)',
                whiteSpace: 'pre-wrap',
              }}
            >
              {line.text}
            </div>
          ))}
        </div>

        <div className="field">
          <label htmlFor="agent-request">Ask for something</label>
          <textarea
            id="agent-request"
            rows={3}
            value={request}
            onChange={(event) => setRequest(event.target.value)}
            placeholder="Make the header bolder and tighten the spacing"
            disabled={!direction || running}
          />
        </div>

        <div className="notice-actions">
          <button
            className="button primary"
            type="button"
            onClick={() => void send()}
            disabled={!direction || running || request.trim() === ''}
          >
            {running ? 'Working…' : 'Send to agent'}
          </button>
          {running ? (
            <button
              className="button"
              type="button"
              onClick={() => void window.cauldron.agentCancel()}
            >
              Cancel
            </button>
          ) : null}
        </div>

        <div className="section">
          <h3>Runs</h3>
          {runs.length === 0 ? (
            <p className="hint">No agent runs yet.</p>
          ) : null}
          {runs.map((run) => (
            <div key={run.id} style={{ marginBottom: 12 }}>
              <div className="hint">
                <strong>{run.tool}</strong> · {run.status} · {run.note}
              </div>
              {run.files.length > 0 ? (
                <ul
                  className="hint"
                  style={{ margin: '4px 0', paddingLeft: 18 }}
                >
                  {run.files.map((file) => (
                    <li key={file} className="mono">
                      {file}
                    </li>
                  ))}
                </ul>
              ) : null}
              <div className="notice-actions">
                <button
                  className="button"
                  type="button"
                  onClick={() => void toggle(run)}
                  aria-pressed={showing === run.id}
                  disabled={run.highlighted.length === 0}
                >
                  {showing === run.id ? 'Hide changes' : 'Show changes'}
                </button>
                <button
                  className="button"
                  type="button"
                  onClick={() => void undoRun(run)}
                  disabled={run.status !== 'finished' || run.files.length === 0}
                >
                  Undo this run
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
